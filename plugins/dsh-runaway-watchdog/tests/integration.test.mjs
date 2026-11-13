/**
 * Integration test: drives the REAL host plugin apply() against a faithful mock
 * Cordis context. Proves tool registration, the synchronous enforcement guard,
 * the global event fold, circuit tripping, the durable audit ledger, the HTTP
 * routes, the host service, and the in-process self-test — without needing the
 * desktop host process. This is the scientific functional proof of the plugin.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply } from '../index.js'

function mockCtx(dir) {
  const tools = {
    registered: [], guards: [],
    register(def) { this.registered.push(def); return () => {} },
    guard(fn) { this.guards.push(fn); return () => {} },
  }
  const routes = []
  const routePaths = new Set()
  // Mirrors the REAL connection registry: exact routes are keyed by path and a
  // duplicate registration throws. A permissive stub once hid exactly that bug.
  const connection = {
    fetch: {
      register(r) {
        if (routePaths.has(r.path)) throw new Error(`connection: exact Fetch route ${JSON.stringify(r.path)} is already registered`)
        routePaths.add(r.path)
        routes.push(r)
        return () => { routePaths.delete(r.path) }
      },
    },
  }
  const listeners = {}
  const services = {}
  const effects = []
  const roster = []
  const ctx = {
    profileContext: { dir },
    tools,
    connection,
    on(event, fn) { (listeners[event] ??= []).push(fn); return () => {} },
    provide(name, api) { services[name] = api },
    effect(fn) { const dispose = fn(); effects.push(dispose); return dispose },
    get(name) { return name === 'agents' ? { list: () => roster } : services[name] },
  }
  ctx.root = ctx // root listener shares the same event bus in the mock
  return { ctx, tools, routes, listeners, services, effects, roster }
}

function mockSession(id = 's1') { return { id, header: { title: 'test' }, seq: 0 } }

async function setup(config = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'wd-it-'))
  const m = mockCtx(dir)
  await apply(m.ctx, { enableTestTools: true, ...config })
  return { ...m, dir }
}

function feed(listener, session, name, args, isError, i) {
  const t = Date.now()
  listener(session, { type: 'tool/call', seq: i * 2, time: t, data: { callId: `c${i}`, name, arguments: JSON.stringify(args) } })
  listener(session, { type: 'tool/result', seq: i * 2 + 1, time: t, data: { message: { toolCallId: `c${i}`, isError } } })
}

test('apply registers all five tools, one guard, six unique routes, and the watchdog service', async () => {
  const m = await setup()
  const names = m.tools.registered.map(t => t.name).sort()
  assert.deepEqual(names, ['watchdog_audit', 'watchdog_reset', 'watchdog_selftest', 'watchdog_status', 'watchdog_test_fail'])
  assert.equal(m.tools.guards.length, 1)
  assert.equal(m.routes.length, 6)
  const paths = m.routes.map(r => r.path)
  assert.equal(new Set(paths).size, paths.length, `every route path must be unique (the real registry throws on a duplicate): ${JSON.stringify(paths)}`)
  // The prices route must own every method it serves — one registration per path.
  const prices = m.routes.find(r => r.path === '/api/runaway-watchdog/prices')
  assert.deepEqual([...prices.methods].sort(), ['GET', 'HEAD', 'POST'])
  assert.ok(m.services.watchdog, 'watchdog service provided')
  assert.equal(typeof m.services.watchdog.status, 'function')
  rmSync(m.dir, { recursive: true, force: true })
})

test('price edit via the prices route re-prices a live session immediately (no restart)', async () => {
  const m = await setup()
  const session = mockSession()
  m.roster.push({ session })
  const listener = m.listeners['session/event'][0]
  const route = (method) => m.routes.find(r => r.path === '/api/runaway-watchdog/prices' && r.methods.includes(method))
  const statusRoute = m.routes.find(r => r.path === '/api/runaway-watchdog/status')
  const get = (r) => r.fetch({ method: 'GET', url: 'http://localhost/x' })
  // One assistant message: 1M input + 1M output + 1M cache-read on deepseek-chat.
  listener(session, { type: 'assistant/message', seq: 1, time: Date.now(), data: { message: { source: { kind: 'model', provider: 'deepseek', model: 'deepseek-chat' } }, usage: { inputTokens: 1000000, outputTokens: 1000000, cacheReadTokens: 1000000, cacheWriteTokens: 0 } } })
  const before = (await (await get(statusRoute)).json()).sessions.find(s => s.sessionId === 's1')
  assert.equal(before.lastModel, 'deepseek/deepseek-chat')
  assert.ok(Math.abs(before.totalCost - 10.5) < 1e-6, `builtin cost must be 10.5, got ${before.totalCost}`)
  assert.equal(before.models[0].priceSource, 'builtin')
  // Override the price through the POST route (the dashboard save path).
  const post = route('POST')
  const saveRes = await post.fetch({ method: 'POST', json: async () => ({ pricing: { 'deepseek-chat': { inputPerM: 4, outputPerM: 16, cacheReadPerM: 1, cacheWritePerM: 4 } } }) })
  assert.equal(saveRes.status, 200)
  assert.equal((await saveRes.json()).ok, true)
  // The SAME session, re-read, must now reflect the new price with no re-fold.
  const after = (await (await get(statusRoute)).json()).sessions.find(s => s.sessionId === 's1')
  assert.ok(Math.abs(after.totalCost - 21) < 1e-6, `edited price must re-price to 21 immediately, got ${after.totalCost}`)
  assert.equal(after.models[0].priceSource, 'user')
  // The override is durable.
  const pricesFile = join(m.dir, 'runaway-watchdog', 'prices.json')
  assert.ok(existsSync(pricesFile), 'prices.json must persist')
  assert.equal(JSON.parse(readFileSync(pricesFile, 'utf8'))['deepseek-chat'].outputPerM, 16)
  rmSync(m.dir, { recursive: true, force: true })
})

test('every registered tool has a valid object-rooted output schema and a render', async () => {
  const m = await setup()
  for (const t of m.tools.registered) {
    assert.equal(t.parameters.type, 'object')
    assert.equal(t.output.schema.type, 'object')
    assert.equal(typeof t.output.render, 'function')
    const rendered = t.output.render({}, {})
    assert.ok(Array.isArray(rendered) && rendered[0].type === 'text')
  }
  rmSync(m.dir, { recursive: true, force: true })
})

test('guard blocks the N+1th identical failing call and audits it', async () => {
  const m = await setup({ repeatWarnThreshold: 3, repeatBlockThreshold: 5 })
  const session = mockSession()
  const listener = m.listeners['session/event'][0]
  const guard = m.tools.guards[0]
  for (let i = 1; i <= 5; i += 1) feed(listener, session, 'demo', { x: 1 }, true, i)
  // 6th identical call must be blocked.
  const blocked = guard({ name: 'demo', arguments: { x: 1 }, agent: { session } })
  assert.ok(typeof blocked === 'string', 'identical failing call must be denied')
  assert.match(blocked, /Runaway Watchdog blocked repeated call/)
  // A different tool is not blocked.
  assert.equal(guard({ name: 'other', arguments: { x: 1 }, agent: { session } }), undefined)
  // Watchdog tools are never blocked.
  assert.equal(guard({ name: 'watchdog_reset', arguments: {}, agent: { session } }), undefined)
  // Give the async audit a tick, then verify a durable 'blocked' entry exists.
  await new Promise(r => setTimeout(r, 30))
  const auditFile = join(m.dir, 'runaway-watchdog', 'audit.json')
  assert.ok(existsSync(auditFile), 'audit ledger file must exist')
  const doc = JSON.parse(readFileSync(auditFile, 'utf8'))
  const entries = Object.values(doc.entries ?? doc)
  assert.ok(entries.some(e => e.rule === 'repeat' && e.action === 'blocked'), 'a repeat block must be audited')
  rmSync(m.dir, { recursive: true, force: true })
})

test('monitor mode never blocks (advisory only)', async () => {
  const m = await setup({ mode: 'monitor', repeatBlockThreshold: 3 })
  const session = mockSession()
  const listener = m.listeners['session/event'][0]
  const guard = m.tools.guards[0]
  for (let i = 1; i <= 6; i += 1) feed(listener, session, 'demo', { x: 1 }, true, i)
  assert.equal(guard({ name: 'demo', arguments: { x: 1 }, agent: { session } }), undefined)
  rmSync(m.dir, { recursive: true, force: true })
})

test('error-rate storm trips a circuit that blocks all tools until reset', async () => {
  const m = await setup({ errorWindow: 5, errorMinSamples: 5, errorRateThreshold: 0.8, circuitCooldownMs: 60000 })
  const session = mockSession()
  const listener = m.listeners['session/event'][0]
  const guard = m.tools.guards[0]
  // Five distinct failing calls -> error-rate circuit.
  for (let i = 1; i <= 5; i += 1) feed(listener, session, 't', { i }, true, i)
  const blocked = guard({ name: 'anything', arguments: {}, agent: { session } })
  assert.ok(typeof blocked === 'string', 'open circuit must block')
  assert.match(blocked, /circuit is OPEN/)
  // Reset closes the circuit.
  const resetTool = m.tools.registered.find(t => t.name === 'watchdog_reset')
  await resetTool.execute({}, { agent: { session } })
  assert.equal(guard({ name: 'anything', arguments: {}, agent: { session } }), undefined)
  rmSync(m.dir, { recursive: true, force: true })
})

test('human interjection clears an identical-call repeat block', async () => {
  const m = await setup({ repeatBlockThreshold: 3 })
  const session = mockSession()
  const listener = m.listeners['session/event'][0]
  const guard = m.tools.guards[0]
  for (let i = 1; i <= 3; i += 1) feed(listener, session, 'demo', { x: 1 }, true, i)
  assert.ok(typeof guard({ name: 'demo', arguments: { x: 1 }, agent: { session } }) === 'string')
  listener(session, { type: 'user/message', seq: 99, time: 99, data: { source: { kind: 'user' }, message: { role: 'user', content: [] } } })
  assert.equal(guard({ name: 'demo', arguments: { x: 1 }, agent: { session } }), undefined)
  rmSync(m.dir, { recursive: true, force: true })
})

test('in-process self-test reports zero failures against live mock services', async () => {
  const m = await setup()
  const selftest = m.tools.registered.find(t => t.name === 'watchdog_selftest')
  const report = await selftest.execute({}, { agent: { session: mockSession() } })
  assert.equal(report.failed, 0, `self-test failures: ${JSON.stringify(report.tests.filter(t => !t.ok))}`)
  assert.ok(report.total >= 9)
  assert.equal(report.passed, report.total)
  rmSync(m.dir, { recursive: true, force: true })
})

test('HTTP status route returns mode, sessions, and stats as JSON', async () => {
  const m = await setup()
  const statusRoute = m.routes.find(r => r.path.endsWith('/status'))
  const res = statusRoute.fetch({ method: 'GET', url: 'http://x/api/runaway-watchdog/status' })
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.mode, 'enforce')
  assert.ok(Array.isArray(body.sessions))
  assert.ok(body.stats && typeof body.stats.total === 'number')
  rmSync(m.dir, { recursive: true, force: true })
})

test('audit ledger persists across a simulated reopen (durability)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'wd-dur-'))
  const m1 = mockCtx(dir)
  await apply(m1.ctx, { enableTestTools: true, repeatBlockThreshold: 3 })
  const session = mockSession('persist')
  const listener = m1.listeners['session/event'][0]
  for (let i = 1; i <= 3; i += 1) feed(listener, session, 'demo', { x: 1 }, true, i)
  m1.tools.guards[0]({ name: 'demo', arguments: { x: 1 }, agent: { session } })
  await new Promise(r => setTimeout(r, 30))
  // Reopen: a fresh apply over the same directory must see the prior entries.
  const m2 = mockCtx(dir)
  await apply(m2.ctx, { enableTestTools: true })
  const stats = m2.services.watchdog.stats()
  assert.ok(stats.total >= 1, 'reopened ledger must retain prior entries')
  assert.ok(stats.blocks >= 1, 'reopened ledger must retain the block')
  rmSync(dir, { recursive: true, force: true })
})

// ---------------------------------------------------------------- regressions

test('monitor mode audits the detection it makes (never silently drops it)', async () => {
  const m = await setup({ mode: 'monitor', repeatWarnThreshold: 3, repeatBlockThreshold: 5 })
  const session = mockSession()
  const listener = m.listeners['session/event'][0]
  for (let i = 1; i <= 5; i += 1) feed(listener, session, 'demo', { x: 1 }, true, i)
  await new Promise(r => setTimeout(r, 30))
  const doc = JSON.parse(readFileSync(join(m.dir, 'runaway-watchdog', 'audit.json'), 'utf8'))
  const entries = Object.values(doc.entries ?? doc)
  assert.ok(
    entries.some(e => e.rule === 'repeat' && e.action === 'advised'),
    `monitor mode must audit the detected loop, got ${JSON.stringify(entries.map(e => [e.rule, e.action]))}`,
  )
  assert.ok(entries.some(e => e.rule === 'repeat' && e.severity === 'block'), 'the block-severity violation must be recorded')
  assert.equal(m.tools.guards[0]({ name: 'demo', arguments: { x: 1 }, agent: { session } }), undefined, 'monitor must still never block')
  rmSync(m.dir, { recursive: true, force: true })
})

test('monitor mode records would-trip and never arms a circuit it cannot enforce', async () => {
  const m = await setup({ mode: 'monitor', errorWindow: 5, errorMinSamples: 5, errorRateThreshold: 0.8 })
  const session = mockSession()
  m.roster.push({ session })
  const listener = m.listeners['session/event'][0]
  for (let i = 1; i <= 5; i += 1) feed(listener, session, 't', { i }, true, i)
  await new Promise(r => setTimeout(r, 30))
  const doc = JSON.parse(readFileSync(join(m.dir, 'runaway-watchdog', 'audit.json'), 'utf8'))
  const entries = Object.values(doc.entries ?? doc)
  assert.ok(entries.some(e => e.rule === 'error-rate' && e.action === 'would-trip'), 'the would-be trip must be recorded')
  assert.ok(!entries.some(e => e.action === 'circuit-opened'), 'monitor mode must not open a circuit')
  const statusRoute = m.routes.find(r => r.path.endsWith('/status'))
  const body = await (await statusRoute.fetch({ method: 'GET', url: 'http://x/api/runaway-watchdog/status' })).json()
  assert.equal(body.sessions.find(s => s.sessionId === 's1').circuit, null, 'the dashboard must not show a circuit that cannot break')
  assert.equal(m.services.watchdog.stats().interventions, 0, 'a would-trip must not count as an intervention')
  rmSync(m.dir, { recursive: true, force: true })
})

test('a denial the watchdog made itself never inflates the error rate', async () => {
  const m = await setup({ repeatBlockThreshold: 3, errorWindow: 12, errorMinSamples: 3, errorRateThreshold: 0.8 })
  const session = mockSession()
  m.roster.push({ session })
  const listener = m.listeners['session/event'][0]
  const guard = m.tools.guards[0]
  for (let i = 1; i <= 3; i += 1) feed(listener, session, 'demo', { x: 1 }, true, i)
  // The real loop commits the call event before the guard decides.
  listener(session, { type: 'tool/call', seq: 8, time: Date.now(), data: { callId: 'c4', name: 'demo', arguments: JSON.stringify({ x: 1 }) } })
  const denial = guard({ callId: 'c4', name: 'demo', arguments: { x: 1 }, agent: { session } })
  assert.ok(typeof denial === 'string', 'the 4th identical failing call must be denied')
  // The denied call still commits a failing tool/result (that is what the loop logs).
  listener(session, { type: 'tool/result', seq: 9, time: Date.now(), data: { message: { toolCallId: 'c4', isError: true } } })
  const statusRoute = m.routes.find(r => r.path.endsWith('/status'))
  const body = await (await statusRoute.fetch({ method: 'GET', url: 'http://x/api/runaway-watchdog/status' })).json()
  const status = body.sessions.find(s => s.sessionId === 's1')
  assert.equal(status.calls, 4, 'the denied call still counts as a completed call')
  assert.equal(status.errors, 3, `only the 3 real failures may count as errors, got ${status.errors}`)
  assert.equal(status.repeat, 4, 'the denied call keeps the repeat chain (the underlying call did fail)')
  assert.equal(status.errorRate, 1, 'the error rate stays over the real sample, not 4/4 self-made errors')
  rmSync(m.dir, { recursive: true, force: true })
})

test('a reloaded plugin rebuilds the repeat chain from the session log (no fresh budget)', async () => {
  // Measured live: a host restart mid-loop wiped the in-memory fold, so the 6th
  // identical failing call went through — the loop got a fresh budget. The fold
  // now seeds itself from the events the session already holds, so a restart (or
  // plugin reload) no longer hands a runaway loop another five attempts.
  const dir = mkdtempSync(join(tmpdir(), 'wd-seed-'))
  const m = mockCtx(dir)
  await apply(m.ctx, { repeatBlockThreshold: 5 })
  const history = []
  for (let i = 1; i <= 5; i += 1) {
    history.push({ type: 'tool/call', seq: i * 2 - 1, time: Date.now(), data: { callId: `h${i}`, name: 'demo', arguments: '{"x":1}' } })
    history.push({ type: 'tool/result', seq: i * 2, time: Date.now(), data: { message: { toolCallId: `h${i}`, isError: true } } })
  }
  const session = { id: 'seeded', header: { title: 't' }, seq: 10, snapshotEvents: () => history }
  // No live events are fed at all: only the pre-existing log is available.
  const blocked = m.tools.guards[0]({ callId: 'h6', name: 'demo', arguments: { x: 1 }, agent: { session } })
  assert.ok(typeof blocked === 'string' && /blocked repeated call/.test(blocked), `the restored chain must block the next identical call, got ${String(blocked)}`)
  rmSync(dir, { recursive: true, force: true })
})

test('a session that cannot replay history simply starts empty (no crash, no false block)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'wd-seed-'))
  const m = mockCtx(dir)
  await apply(m.ctx, { repeatBlockThreshold: 5 })
  const session = { id: 'no-replay', header: { title: 't' }, seq: 10 }
  const decision = m.tools.guards[0]({ callId: 'x1', name: 'demo', arguments: { x: 1 }, agent: { session } })
  assert.equal(decision, undefined, 'without a log the guard must not invent a violation')
  rmSync(dir, { recursive: true, force: true })
})

test('the shipped cordis patch keeps the diagnostic tool hidden', () => {
  const patch = readFileSync(new URL('../cordis.patch.yml', import.meta.url), 'utf8')
  assert.match(patch, /enableTestTools:\s*false/, 'the release patch must not ship enableTestTools: true')
})

test('per-session tracking stays bounded (idle sessions are evicted)', async () => {
  const m = await setup()
  const listener = m.listeners['session/event'][0]
  for (let i = 0; i < 300; i += 1) {
    const session = mockSession(`s${i}`)
    feed(listener, session, 'demo', { i }, true, 1)
  }
  const statusRoute = m.routes.find(r => r.path.endsWith('/status'))
  const body = await (await statusRoute.fetch({ method: 'GET', url: 'http://x/api/runaway-watchdog/status' })).json()
  assert.ok(body.tracked.sessions <= body.tracked.cap, `tracked sessions must stay <= ${body.tracked.cap}, got ${body.tracked.sessions}`)
  assert.ok(body.tracked.live <= body.tracked.cap, 'live enforcement entries must stay bounded too')
  rmSync(m.dir, { recursive: true, force: true })
})

test('POST /prices rejects a malformed body and keeps the saved table', async () => {
  const m = await setup()
  const post = m.routes.find(r => r.path === '/api/runaway-watchdog/prices' && r.methods.includes('POST'))
  const pricesFile = join(m.dir, 'runaway-watchdog', 'prices.json')
  const good = await post.fetch({ method: 'POST', json: async () => ({ pricing: { 'deepseek-chat': { inputPerM: 4, outputPerM: 16, cacheReadPerM: 1, cacheWritePerM: 4 } } }) })
  assert.equal(good.status, 200, 'a valid save must succeed')
  const before = readFileSync(pricesFile, 'utf8')
  for (const bad of [{ pricing: 'oops' }, { pricing: null }, {}, { pricing: [1, 2] }]) {
    const res = await post.fetch({ method: 'POST', json: async () => bad })
    assert.equal(res.status, 400, `a malformed body ${JSON.stringify(bad)} must be rejected`)
    assert.equal((await res.json()).ok, false, 'the rejection must be reported')
  }
  assert.equal(readFileSync(pricesFile, 'utf8'), before, 'the persisted table must be untouched by rejected requests')
  rmSync(m.dir, { recursive: true, force: true })
})

test('the repeat advisory is bounded to the threshold crossings', async () => {
  const m = await setup({ repeatWarnThreshold: 3, repeatBlockThreshold: 5 })
  const session = mockSession()
  const listener = m.listeners['session/event'][0]
  const post = m.listeners['tools/post-execute'][0]
  const exec = { name: 'demo', arguments: { x: 1 }, agent: { session } }
  const run = async () => post(exec, {}, async () => ({ kind: 'accept' }))

  for (let i = 1; i <= 2; i += 1) feed(listener, session, 'demo', { x: 1 }, true, i)
  assert.equal((await run()).additionalContexts, undefined, 'below the warn threshold no advisory is attached')

  feed(listener, session, 'demo', { x: 1 }, true, 3)
  const first = await run()
  assert.equal(first.additionalContexts.length, 1, 'the warn crossing advises once')
  assert.equal(first.additionalContexts[0].role, 'user', 'an advisory message must carry its role: the host forwards it verbatim into the provider request')
  assert.match(first.additionalContexts[0].id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, 'an advisory message must carry the identified message id a user/message event requires')
  assert.equal((await run()).additionalContexts, undefined, 'the same crossing must not advise again')

  feed(listener, session, 'demo', { x: 1 }, true, 4)
  assert.equal((await run()).additionalContexts, undefined, 'no advisory between thresholds')

  feed(listener, session, 'demo', { x: 1 }, true, 5)
  const second = await run()
  assert.equal(second.additionalContexts.length, 1, 'the block crossing advises once')
  assert.notEqual(second.additionalContexts[0].id, first.additionalContexts[0].id, 'each advisory message id must be unique')
  assert.equal((await run()).additionalContexts, undefined, 'and only once')

  feed(listener, session, 'demo', { x: 1 }, true, 6)
  assert.equal((await run()).additionalContexts, undefined, 'a continuing loop does not spam context')
  rmSync(m.dir, { recursive: true, force: true })
})