/**
 * Runaway Watchdog / Spend Circuit Breaker — Host plugin.
 *
 * Detects runaway agent behavior (identical-call loops, error storms, token /
 * spend velocity, subagent recursion / fan-out) from committed session events,
 * and enforces a deterministic harness-level circuit breaker through the
 * synchronous tool guard. Every intervention is durably audited.
 *
 * Dependency footprint: Node builtins + the plugin's own pure lib modules only
 * (zero external package imports). A profile-local plain-JS bundle cannot
 * reliably resolve bare `zod` / `schemastery` / `dsh-tools`, so tools are
 * registered through a minimal in-repo JSON-Schema compiler, detection is an
 * incremental in-memory fold of the pure core (driven by the global
 * `session/event` feed), and the audit ledger is a durable JSON document under
 * the plugin's profile directory. No new session event type is ever appended,
 * and no deprecated synchronous session-log reader is used.
 *
 * @module @local/dsh-runaway-watchdog
 */

import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { makeTool } from './lib/tool-schema.js'
import {
  initialState, applyEvent, evaluate, wouldBlock, signature,
  tracked, windowTokens, windowCost, totalCost, WATCHDOG_TOOLS, isSpawnTool,
} from './lib/detection.js'
import { DEFAULTS, normalizeConfig } from './lib/config.js'
import { createLedger } from './lib/ledger.js'
import { openFileDomain } from './lib/file-domain.js'
import { depthOf, liveFanout, spawnDecision } from './lib/tree.js'
import {
  BUILTIN_PRICES, CURRENCY_SYMBOL, PRICE_FIELDS, normalizePricing, mergePricing, resolvePrice, messageCost,
} from './lib/pricing.js'

export const name = 'runaway-watchdog'
export const inject = ['tools', 'connection', 'profileContext']

/** Stable dedup key for a breach (so one episode audits once per severity). */
function breachKey(breach) {
  const d = breach.detail ?? {}
  switch (breach.rule) {
    case 'repeat': return `repeat:${d.tool}:${breach.severity}:episode`
    default: return `${breach.rule}:${breach.severity}`
  }
}

/** Heuristic average tokens per model call from the usage ring. */
function avgTokensPerCall(state) {
  if (state.usage.length === 0) return 0
  const sum = state.usage.reduce((acc, s) => acc + s.k, 0)
  return sum / state.usage.length
}

/** Heuristic average categorized cost (CNY) per model call, at current prices. */
function avgCostPerCall(state, pricing) {
  if (state.usage.length === 0) return 0
  let sum = 0
  for (const s of state.usage) {
    const { price } = resolvePrice(s.p, s.m, pricing)
    sum += messageCost({ inputTokens: s.i, outputTokens: s.o, cacheReadTokens: s.cr, cacheWriteTokens: s.cw }, price)
  }
  return sum / state.usage.length
}

function jsonResponse(value, status = 200, head = false) {
  const body = JSON.stringify(value)
  return new Response(head ? null : body, {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-length': String(Buffer.byteLength(body)),
      'cache-control': 'no-store',
    },
  })
}

/**
 * Activate the watchdog.
 * @param {import('@deepseek-ai/cordis').Context} ctx - plugin context.
 * @param {object} config - row config (validated defensively by normalizeConfig).
 */
export function apply(ctx, config) {
  const cfg = normalizeConfig(config)
  const ledgerPath = join(ctx.profileContext.dir, 'runaway-watchdog', 'audit.json')
  const ledger = createLedger(openFileDomain(ledgerPath), cfg.auditRetention)

  // ---- Live model pricing (real-time editable; persisted to prices.json) ----
  const pricesPath = join(ctx.profileContext.dir, 'runaway-watchdog', 'prices.json')
  function loadPricesFile() {
    try {
      if (existsSync(pricesPath)) {
        const parsed = JSON.parse(readFileSync(pricesPath, 'utf8'))
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
      }
    } catch { /* a corrupt price file is disposable; fall back to config/builtin */ }
    return {}
  }
  function savePricesFile(table) {
    mkdirSync(dirname(pricesPath), { recursive: true })
    const tmp = `${pricesPath}.tmp`
    writeFileSync(tmp, JSON.stringify(table, null, 2))
    renameSync(tmp, pricesPath)
  }
  // Effective user table = cordis config overrides + UI-edited prices file; the
  // built-in reference table is the fallback inside resolvePrice. This binding is
  // mutable so a price save takes effect on the very next fold / status read.
  let userPricing = mergePricing(cfg.pricing, loadPricesFile())
  function setUserPricing(table) {
    userPricing = mergePricing(cfg.pricing, normalizePricing(table))
    savePricesFile(normalizePricing(table))
  }

  /** Per-session incremental detection state (pure fold of committed events). */
  const states = new Map()
  /** Per-session live enforcement state (circuit + dedup), not log-derived. */
  const live = new Map()
  /** Cap on retained per-session maps; idle sessions are evicted oldest-first. */
  const MAX_TRACKED_SESSIONS = 256
  /** Cap on remembered self-denied call ids per session (bounded correlation window). */
  const DENIED_CAP = 256
  /** Cap on session events replayed to rebuild a fold after a reload/restart. */
  const MAX_REPLAY_EVENTS = 4000

  function liveOf(sessionId) {
    let entry = live.get(sessionId)
    if (entry === undefined) {
      entry = { circuit: null, advisedKeys: new Set(), blockSig: null, advisoryKey: null, denied: new Set() }
      live.set(sessionId, entry)
    }
    return entry
  }

  /**
   * Rebuild one session's fold from the events that session already holds, so a
   * host restart / plugin reload does NOT hand an in-progress loop a fresh budget
   * (measured live: a restart mid-loop reset the repeat chain and the 6th
   * identical failing call went through). Bounded to the recent tail: the repeat
   * chain and the velocity window only need recent history, and replaying a huge
   * log on first touch would stall the request that triggered it.
   * @param {object} session - the live session (exposes snapshotEvents()).
   * @param {object} entry - the freshly created per-session state entry.
   */
  function seedFromLog(session, entry) {
    if (entry.seq !== -1) return
    let events
    try {
      events = typeof session.snapshotEvents === 'function' ? session.snapshotEvents() : []
    } catch {
      return // a session that cannot replay simply starts empty
    }
    if (!Array.isArray(events) || events.length === 0) return
    const tail = events.length > MAX_REPLAY_EVENTS ? events.slice(-MAX_REPLAY_EVENTS) : events
    let state = entry.state
    for (const event of tail) state = applyEvent(state, event, cfg)
    entry.state = state
    const last = tail[tail.length - 1]
    entry.seq = typeof last?.seq === 'number' ? last.seq : -1
  }

  function stateOf(session, currentEvent) {
    const id = String(session.id)
    let entry = states.get(id)
    if (entry === undefined) {
      entry = { state: initialState(), seq: -1 }
      states.set(id, entry)
      seedFromLog(session, entry)
    }
    if (currentEvent !== undefined) {
      const seq = typeof currentEvent.seq === 'number' ? currentEvent.seq : entry.seq + 1
      if (seq > entry.seq) {
        const sessionLive = liveOf(id)
        entry.state = applyEvent(entry.state, currentEvent, cfg, sessionLive.denied)
        entry.seq = seq
        if (currentEvent.type === 'tool/result') {
          const callId = String(currentEvent.data?.message?.toolCallId ?? '')
          if (callId !== '') sessionLive.denied.delete(callId)
        }
      }
    }
    return entry.state
  }

  function agentsList() {
    const agents = ctx.get('agents')
    try { return agents?.list() ?? [] } catch { return [] }
  }

  /**
   * Remember a call this guard denied, so the fold can keep it out of the
   * error-rate ring (the detector must not measure its own output).
   * @param {string} sessionId - owning session id ('' for a detached call).
   * @param {unknown} callId - the denied execution's call id.
   */
  function denyCall(sessionId, callId) {
    if (sessionId === '' || typeof callId !== 'string' || callId === '') return
    const entry = liveOf(sessionId)
    if (entry.denied.size >= DENIED_CAP) entry.denied.clear()
    entry.denied.add(callId)
  }

  /** Bound the per-session maps: evict idle sessions oldest-first, never a live one. */
  function pruneTracked() {
    if (states.size <= MAX_TRACKED_SESSIONS) return
    const active = new Set(agentsList().map(agent => String(agent?.session?.id)))
    for (const id of states.keys()) {
      if (states.size <= MAX_TRACKED_SESSIONS) break
      if (active.has(id)) continue
      states.delete(id)
      live.delete(id)
    }
  }

  // ---- Audit helper (deduped by the caller) ----
  async function audit(session, breach, action, estimatedTokensPrevented = 0, estimatedCostPrevented = 0) {
    const state = session ? stateOf(session) : initialState()
    try {
      await ledger.record({
        time: Date.now(),
        sessionId: session ? String(session.id) : '',
        rule: breach.rule,
        severity: breach.severity,
        action,
        detail: breach.detail ?? {},
        tokensAtBreach: state.totalTokens,
        estimatedTokensPrevented,
        estimatedCostPrevented,
      })
    } catch {
      // Auditing must never break enforcement.
    }
  }

  // ---- Deduped observation recording ----
  /**
   * Record one advisory observation per (rule, severity) episode. A single
   * shared dedupe slot would be overwritten whenever two rules co-fire
   * (repeat and error-rate alternate once per call), re-auditing every event;
   * keys therefore live in a bounded set.
   * @param {object} session - owning session (for the state snapshot).
   * @param {object} entry - live enforcement state of that session.
   * @param {object} breach - the breach to record.
   * @param {string} action - ledger action ('advised' | 'would-trip').
   * @param {number} est - estimated tokens prevented.
   * @param {number} estCost - estimated spend prevented (CNY).
   */
  function recordOnce(session, entry, breach, action, est, estCost) {
    const key = breachKey(breach)
    if (entry.advisedKeys.has(key)) return
    if (entry.advisedKeys.size >= 64) entry.advisedKeys.clear()
    entry.advisedKeys.add(key)
    void audit(session, breach, action, est, estCost)
  }

  // ---- Synchronous enforcement guard ----
  let guardRegistered = false
  const disposeGuard = ctx.effect(() => ctx.tools.guard((exec) => {
    const toolName = exec.name
    if (WATCHDOG_TOOLS.has(toolName)) return undefined
    const agent = exec.agent
    const session = agent?.session
    const sessionId = session ? String(session.id) : ''
    const enforce = cfg.mode === 'enforce'
    /**
     * Deny one execution. Recording its call id lets the event fold keep this
     * self-produced error out of the error-rate ring (see lib/detection.js).
     * @param {string} reason - model-facing denial text.
     * @returns {string} the same reason (guards deny by returning a string).
     */
    const deny = (reason) => {
      denyCall(sessionId, exec.callId)
      return reason
    }

    // Recursion / fan-out budget on spawn calls.
    if (isSpawnTool(toolName)) {
      const depth = session ? depthOf(session.header) : 0
      const fanout = session ? liveFanout(agentsList(), sessionId) : 0
      const breach = spawnDecision({ depth, fanout, isSpawn: true }, cfg)
      if (breach !== null && enforce) {
        const entry = liveOf(sessionId)
        const dedup = `${breach.rule}:${depth}:${fanout}`
        if (entry.blockSig !== dedup) {
          entry.blockSig = dedup
          void audit(session, breach, 'spawn-blocked', 0)
        }
        const limit = breach.rule === 'depth' ? `maxDepth=${cfg.maxDepth}` : `maxFanout=${cfg.maxFanout}`
        return deny(`Runaway Watchdog blocked this spawn: ${breach.rule} budget reached (${limit}). Reduce delegation depth or concurrent children, or call watchdog_reset after resolving.`)
      }
    }

    if (session === undefined) return undefined
    const entry = liveOf(sessionId)

    // Open spend/error circuit blocks every tool until it closes.
    if (enforce && entry.circuit !== null && entry.circuit.openUntil > Date.now()) {
      const until = new Date(entry.circuit.openUntil).toISOString()
      return deny(`Runaway Watchdog: ${entry.circuit.rule} circuit is OPEN until ${until}. Tool execution is paused to stop runaway spend. Call watchdog_reset to close it early, or wait for the cooldown.`)
    }

    // Identical-call repeat block.
    const state = stateOf(session)
    if (wouldBlock(state, toolName, exec.arguments, cfg)) {
      const sig = signature(toolName, exec.arguments)
      if (entry.blockSig !== sig) {
        entry.blockSig = sig
        const est = Math.round(avgTokensPerCall(state) * cfg.repeatBlockThreshold)
        const estCost = avgCostPerCall(state, userPricing) * cfg.repeatBlockThreshold
        void audit(session, { rule: 'repeat', severity: 'block', detail: { tool: toolName, count: state.repeat, preview: state.lastPreview, lastError: state.lastError } }, 'blocked', est, estCost)
      }
      return deny(`Runaway Watchdog blocked repeated call "${toolName}" (${state.repeat} identical completed calls${state.lastError ? ', all failing' : ''}). Do not repeat the same call: analyze the previous result, try a different approach or arguments, or call watchdog_reset if the loop is resolved.`)
    }

    return undefined
  }), 'runaway-watchdog: enforcement guard')
  guardRegistered = true

  // ---- Global fold + breach detection / circuit tripping / advisory audit ----
  // A SYNCHRONOUS apply keeps the plugin in the global scope; ctx.on with
  // { global: true } then hears every session's events (the proven pattern of
  // the usage-center and context-inspector bundles). An async apply isolates
  // the plugin into a child scope whose registrations never reach the loop.
  const offEvent = ctx.effect(() => ctx.on('session/event', (session, event) => {
    // Fold EVERY committed event (tool/call populates the pending correlation map).
    const state = stateOf(session, event)
    const type = event.type
    if (type !== 'tool/result' && type !== 'assistant/message' && type !== 'user/message') return
    const sessionId = String(session.id)
    const entry = liveOf(sessionId)
    const now = typeof event.time === 'number' ? event.time : Date.now()

    if (type === 'user/message' && event.data?.source?.kind === 'user') {
      entry.blockSig = null
      entry.advisedKeys.clear()
      entry.advisoryKey = null
    }
    if (type === 'tool/result') {
      const sig = state.lastSig
      if (entry.blockSig !== null && sig !== entry.blockSig) entry.blockSig = null
    }

    // Auto-close an expired circuit (audit once).
    if (entry.circuit !== null && entry.circuit.openUntil <= now) {
      const rule = entry.circuit.rule
      entry.circuit = null
      void audit(session, { rule, severity: 'circuit', detail: { cooldownMs: cfg.circuitCooldownMs } }, 'circuit-closed', 0)
    }

    const enforcing = cfg.mode === 'enforce'
    const breaches = evaluate(state, cfg, now, userPricing)
    for (const breach of breaches) {
      if (breach.severity === 'circuit') {
        const minutes = cfg.velocityWindowMs / 60000
        const { tokens } = windowTokens(state, now, cfg.velocityWindowMs)
        const vpm = minutes > 0 ? tokens / minutes : 0
        const spm = minutes > 0 ? windowCost(state, now, cfg.velocityWindowMs, userPricing) / minutes : 0
        const cooldownMin = cfg.circuitCooldownMs / 60000
        const est = breach.rule === 'error-rate'
          ? Math.round(avgTokensPerCall(state) * cfg.errorWindow)
          : Math.round(vpm * cooldownMin)
        const estCost = breach.rule === 'error-rate'
          ? avgCostPerCall(state, userPricing) * cfg.errorWindow
          : spm * cooldownMin

        // Monitor mode never enforces. Arming a circuit there would show a
        // breaker that cannot break, so record the would-be trip once instead.
        if (!enforcing) {
          recordOnce(session, entry, breach, 'would-trip', est, estCost)
          continue
        }
        if (entry.circuit === null || entry.circuit.openUntil <= now) {
          entry.circuit = { openUntil: now + cfg.circuitCooldownMs, rule: breach.rule }
          void audit(session, breach, 'circuit-opened', est, estCost)
        }
      } else if (breach.severity === 'warn' || (breach.severity === 'block' && !enforcing)) {
        // In enforce mode the guard owns the 'blocked' entry. In monitor mode no
        // guard runs, so the listener records the detection itself — otherwise
        // monitor mode would silently audit nothing at all.
        recordOnce(session, entry, breach, 'advised', 0, 0)
      }
    }
    pruneTracked()
  }, { global: true }), 'runaway-watchdog: session fold')

  // ---- Advisory context for repeats (gives monitor mode model-facing value) ----
  const offPost = ctx.effect(() => ctx.on('tools/post-execute', async (exec, _result, next) => {
    const downstream = await next()
    const session = exec.agent?.session
    if (session === undefined) return downstream
    if (!tracked(exec.name, cfg)) return downstream
    const state = stateOf(session)
    if (state.lastSig === null || state.repeat < cfg.repeatWarnThreshold) return downstream
    if (signature(exec.name, exec.arguments) !== state.lastSig) return downstream
    // Advise at the warn threshold and again when the block threshold is reached —
    // never on every call, which would append the same paragraph to each request
    // and inflate exactly the spend this plugin exists to protect.
    const atWarn = state.repeat === cfg.repeatWarnThreshold
    const atBlock = state.repeat === cfg.repeatBlockThreshold
    if (!atWarn && !atBlock) return downstream
    const liveEntry = liveOf(String(session.id))
    const advisoryKey = `${state.lastSig}:${state.repeat}`
    if (liveEntry.advisoryKey === advisoryKey) return downstream
    liveEntry.advisoryKey = advisoryKey
    const text = `Runaway Watchdog advisory: you have repeated "${exec.name}" ${state.repeat} times with identical arguments${state.lastError ? ' and it keeps failing' : ''}. `
      + 'Analyze the previous result and change your approach or arguments instead of repeating. '
      + (cfg.mode === 'enforce' ? `At ${cfg.repeatBlockThreshold} identical calls the watchdog will block this call.` : 'Monitor mode is advisory only.')
    // The context is a canonical user message, not loose `{source, content}`:
    // the host appends it verbatim as a `user/message` event and later feeds it
    // straight into the provider request. A missing `role` survives JSON
    // serialization as an absent key, so the request body fails schema
    // validation server-side ("messages[n]: missing field `role`", 400
    // INVALID_REQUEST). The official producers build these with
    // `createUserMessage()`; a plain-JS bundle reproduces its shape instead.
    const notice = {
      id: randomUUID(),
      role: 'user',
      source: { kind: 'runaway-watchdog', form: 'notice', summary: `Watchdog: ${state.repeat}× repeated ${exec.name}` },
      content: [{ type: 'text', text }],
    }
    const existing = downstream.additionalContexts ?? []
    return { ...downstream, additionalContexts: [notice, ...existing] }
  }, { global: true }), 'runaway-watchdog: repeat advisory')

  // ---- Live status snapshot (shared by tool + route) ----
  function sessionStatus(session) {
    const state = stateOf(session)
    const sessionId = String(session.id)
    const entry = live.get(sessionId)
    const now = Date.now()
    const minutes = cfg.velocityWindowMs / 60000
    const { tokens, samples } = windowTokens(state, now, cfg.velocityWindowMs)
    const vpm = minutes > 0 ? tokens / minutes : 0
    const spm = minutes > 0 ? windowCost(state, now, cfg.velocityWindowMs, userPricing) / minutes : 0
    const window = state.results.slice(-cfg.errorWindow)
    const errorRate = window.length > 0 ? window.filter(r => r.e).length / window.length : 0
    const models = Object.entries(state.models).map(([key, m]) => {
      const resolved = resolvePrice(m.provider, m.model, userPricing)
      const usage = { inputTokens: m.i, outputTokens: m.o, cacheReadTokens: m.cr, cacheWriteTokens: m.cw }
      return {
        key, provider: m.provider, model: m.model, calls: m.calls,
        inputTokens: m.i, outputTokens: m.o, cacheReadTokens: m.cr, cacheWriteTokens: m.cw,
        cost: Number(messageCost(usage, resolved.price).toFixed(6)),
        price: resolved.price, priceSource: resolved.source, priceMatch: resolved.match,
      }
    })
    return {
      sessionId,
      title: session.header?.title ?? null,
      depth: depthOf(session.header),
      fanout: liveFanout(agentsList(), sessionId),
      repeat: state.repeat,
      lastTool: state.lastName,
      lastModel: state.lastModel,
      lastError: state.lastError,
      calls: state.calls,
      errors: state.errors,
      errorRate: Number(errorRate.toFixed(3)),
      totalTokens: state.totalTokens,
      tokensPerMinute: Math.round(vpm),
      spendPerMinute: Number(spm.toFixed(4)),
      // How many usage samples fall inside the velocity window. Zero means "no
      // activity in the last window", which is NOT the same as a measured 0/min —
      // the dashboard renders those two columns as "—" instead of a misleading 0.
      velocitySamples: samples,
      velocityWindowMs: cfg.velocityWindowMs,
      totalCost: Number(totalCost(state, userPricing).toFixed(6)),
      currency: cfg.currency,
      models,
      circuit: entry?.circuit && entry.circuit.openUntil > now
        ? { rule: entry.circuit.rule, openUntil: entry.circuit.openUntil } : null,
    }
  }
  function statusSnapshot() {
    const roster = agentsList()
    const sessions = roster.map(agent => sessionStatus(agent.session))
    return {
      mode: cfg.mode, config: cfg, generatedAt: Date.now(), sessions, stats: ledger.stats(),
      tracked: { sessions: states.size, live: live.size, cap: MAX_TRACKED_SESSIONS },
      currency: cfg.currency, currencySymbol: CURRENCY_SYMBOL, usdToCny: cfg.usdToCny,
    }
  }

  // ---- In-process scientific self-test ----
  async function runSelfTest(session) {
    const tests = []
    const check = async (name, fn) => {
      try {
        const detail = await fn()
        tests.push({ name, ok: true, detail: detail ?? 'ok' })
      } catch (error) {
        tests.push({ name, ok: false, detail: error instanceof Error ? error.message : String(error) })
      }
    }
    const assert = (cond, msg) => { if (!cond) throw new Error(msg) }
    const tcfg = normalizeConfig({ mode: 'enforce', repeatWarnThreshold: 2, repeatBlockThreshold: 3 })

    await check('config: defaults + validation', () => {
      const c = normalizeConfig({})
      assert(c.mode === 'enforce', 'default mode')
      let threw = false
      try { normalizeConfig({ mode: 'bogus' }) } catch { threw = true }
      assert(threw, 'invalid mode must throw')
      return 'defaults ok, invalid rejected'
    })

    await check('detection: repeat chain builds and blocks', () => {
      let s = initialState()
      const call = (i) => ({ type: 'tool/call', time: i, seq: i * 2, data: { callId: `c${i}`, name: 'demo', arguments: '{"x":1}' } })
      const result = (i, e) => ({ type: 'tool/result', time: i, seq: i * 2 + 1, data: { message: { toolCallId: `c${i}`, isError: e } } })
      for (let i = 1; i <= 3; i += 1) { s = applyEvent(s, call(i), tcfg); s = applyEvent(s, result(i, true), tcfg) }
      assert(s.repeat === 3, `repeat should be 3, got ${s.repeat}`)
      assert(wouldBlock(s, 'demo', { x: 1 }, tcfg), 'third identical failing call must block')
      assert(!wouldBlock(s, 'other', { x: 1 }, tcfg), 'different tool must not block')
      return `repeat=${s.repeat}, block=yes`
    })

    await check('detection: different call resets chain', () => {
      let s = initialState()
      s = applyEvent(s, { type: 'tool/call', time: 1, data: { callId: 'a', name: 'demo', arguments: '{}' } }, tcfg)
      s = applyEvent(s, { type: 'tool/result', time: 1, data: { message: { toolCallId: 'a', isError: true } } }, tcfg)
      s = applyEvent(s, { type: 'tool/call', time: 2, data: { callId: 'b', name: 'demo', arguments: '{"y":2}' } }, tcfg)
      s = applyEvent(s, { type: 'tool/result', time: 2, data: { message: { toolCallId: 'b', isError: true } } }, tcfg)
      assert(s.repeat === 1, `chain must reset on new signature, got ${s.repeat}`)
      return 'reset ok'
    })

    await check('detection: error-rate circuit', () => {
      let s = initialState()
      const c = normalizeConfig({ errorWindow: 5, errorMinSamples: 5, errorRateThreshold: 0.8 })
      for (let i = 1; i <= 5; i += 1) {
        s = applyEvent(s, { type: 'tool/call', time: i, data: { callId: `e${i}`, name: 't', arguments: `{"i":${i}}` } }, c)
        s = applyEvent(s, { type: 'tool/result', time: i, data: { message: { toolCallId: `e${i}`, isError: true } } }, c)
      }
      assert(evaluate(s, c, 10).some(b => b.rule === 'error-rate' && b.severity === 'circuit'), 'error-rate circuit must fire')
      return 'error-rate circuit ok'
    })

    await check('detection: token velocity circuit', () => {
      const c = normalizeConfig({ velocityWindowMs: 60000, tokenVelocityLimit: 1000 })
      const s = applyEvent(initialState(), { type: 'assistant/message', time: 1000, data: { usage: { inputTokens: 5000, outputTokens: 1200 } } }, c)
      assert(evaluate(s, c, 2000).some(b => b.rule === 'token-velocity'), 'token velocity must fire (1200 output/min >= 1000; input excluded)')
      return 'velocity ok'
    })

    await check('pricing: model detection + categorized cost + live override', () => {
      const c = normalizeConfig({})
      const ev = { type: 'assistant/message', time: 1000, data: { message: { source: { kind: 'model', provider: 'deepseek', model: 'deepseek-chat' } }, usage: { inputTokens: 1000000, outputTokens: 1000000, cacheReadTokens: 1000000, cacheWriteTokens: 0 } } }
      const s = applyEvent(initialState(), ev, c)
      assert(s.lastModel === 'deepseek/deepseek-chat', `model must be detected from source, got ${s.lastModel}`)
      const base = totalCost(s, c.pricing)
      assert(Math.abs(base - 10.5) < 1e-6, `builtin categorized cost must be 10.5 (2+8+0.5), got ${base}`)
      const overridden = mergePricing({ 'deepseek-chat': { inputPerM: 4, outputPerM: 16, cacheReadPerM: 1, cacheWritePerM: 4 } })
      const after = totalCost(s, overridden)
      assert(Math.abs(after - 21) < 1e-6, `price override must re-price the SAME state to 21, got ${after}`)
      return `model=${s.lastModel}, base=¥${base}, override=¥${after} (real-time)`
    })

    await check('tree: depth + fanout decisions', () => {
      const c = normalizeConfig({ maxDepth: 3, maxFanout: 2 })
      assert(spawnDecision({ depth: 3, fanout: 0, isSpawn: true }, c)?.rule === 'depth', 'depth block')
      assert(spawnDecision({ depth: 0, fanout: 2, isSpawn: true }, c)?.rule === 'fanout', 'fanout block')
      assert(spawnDecision({ depth: 0, fanout: 0, isSpawn: true }, c) === null, 'within budget')
      assert(spawnDecision({ depth: 9, fanout: 9, isSpawn: false }, c) === null, 'non-spawn ignored')
      return 'tree decisions ok'
    })

    await check('detector: live state readable', () => {
      if (session === undefined) return 'skipped (no owning session)'
      const s = stateOf(session)
      assert(typeof s.repeat === 'number', 'state must expose repeat')
      assert(typeof s.calls === 'number', 'state must expose calls')
      return `live state repeat=${s.repeat}, calls=${s.calls}`
    })

    await check('guard: registered on tools service', () => {
      assert(typeof ctx.tools.guard === 'function', 'tools.guard must exist')
      assert(guardRegistered, 'watchdog guard must be registered')
      return 'guard registered'
    })

    await check('ledger: durable write/read round-trip', async () => {
      const entry = await ledger.record({ time: Date.now(), sessionId: 'selftest', rule: 'repeat', severity: 'warn', action: 'advised', detail: { selftest: true }, tokensAtBreach: 0, estimatedTokensPrevented: 0 })
      const found = ledger.query({ session: 'selftest', limit: 10 }).some(e => e.id === entry.id)
      assert(found, 'recorded entry must be queryable')
      return `round-trip ok (size=${ledger.size})`
    })

    await check('tree: live roster readable', () => {
      const roster = agentsList()
      assert(Array.isArray(roster), 'agents.list must return an array')
      return `live agents=${roster.length}`
    })

    const passed = tests.filter(t => t.ok).length
    return { passed, failed: tests.length - passed, total: tests.length, tests }
  }

  // ---- Model-facing tools (registered with zero external imports) ----
  const obj = (properties) => ({ type: 'object', properties, additionalProperties: false })

  const disposeTools = [
    ctx.effect(() => ctx.tools.register(makeTool({
      name: 'watchdog_status',
      description: 'Inspect the Runaway Watchdog: current mode, this session\'s live detection counters (repeat count, error rate, token/spend velocity, delegation depth/fanout), any open circuit, and aggregate intervention statistics. Call this to understand whether the watchdog is about to block or has tripped a circuit.',
      parameters: {},
      output: obj({ mode: { type: 'string' }, session: { type: 'json' }, stats: { type: 'json' } }),
      execute(args, exec) {
        const session = exec.agent?.session
        return { mode: cfg.mode, session: session ? sessionStatus(session) : null, stats: ledger.stats() }
      },
    })), 'watchdog: status tool'),
    ctx.effect(() => ctx.tools.register(makeTool({
      name: 'watchdog_audit',
      description: 'Read the Runaway Watchdog audit ledger: recent interventions (repeat blocks, circuit trips, spawn blocks, advisories) with rule, severity, action, and estimated tokens prevented. Optionally filter by session id or rule.',
      parameters: {
        session: { type: 'string', description: 'Filter to one session id (optional).' },
        rule: { type: 'string', description: 'Filter to one rule: repeat|error-rate|token-velocity|spend-velocity|depth|fanout (optional).' },
        limit: { type: 'integer', description: 'Maximum entries to return (default 50).' },
      },
      output: obj({ entries: { type: 'json' }, stats: { type: 'json' } }),
      execute(args) {
        return { entries: ledger.query({ session: args.session, rule: args.rule, limit: args.limit ?? 50 }), stats: ledger.stats() }
      },
    })), 'watchdog: audit tool'),
    ctx.effect(() => ctx.tools.register(makeTool({
      name: 'watchdog_reset',
      description: 'Close a tripped Runaway Watchdog spend/error circuit for the calling session and clear advisory dedup, so tool execution can resume. Note: an identical-call repeat block clears only when you make a DIFFERENT call or the user interjects — reset does not un-block an ongoing identical loop. Call this after you have resolved the underlying problem.',
      parameters: {},
      output: obj({ reset: { type: 'boolean' }, sessionId: { type: 'string' }, note: { type: 'string' } }),
      async execute(args, exec) {
        const session = exec.agent?.session
        const sessionId = session ? String(session.id) : ''
        const entry = liveOf(sessionId)
        const wasOpen = entry.circuit !== null
        entry.circuit = null
        entry.advisedKeys.clear()
        entry.blockSig = null
        entry.advisoryKey = null
        await audit(session, { rule: 'manual', severity: 'warn', detail: { wasOpen } }, 'reset', 0)
        return { reset: true, sessionId, note: wasOpen ? 'Circuit closed.' : 'No circuit was open; advisory dedup cleared.' }
      },
    })), 'watchdog: reset tool'),
    ctx.effect(() => ctx.tools.register(makeTool({
      name: 'watchdog_selftest',
      description: 'Run the Runaway Watchdog in-process scientific self-test: exercises the real detection core (repeat/error-rate/velocity/tree), the live detector, guard registration, and a durable audit write/read round-trip against the live services. Returns a structured pass/fail report. Use this to verify the plugin is functioning correctly.',
      parameters: {},
      output: obj({ passed: { type: 'integer' }, failed: { type: 'integer' }, total: { type: 'integer' }, tests: { type: 'json' } }),
      execute(args, exec) {
        return runSelfTest(exec.agent?.session)
      },
    })), 'watchdog: selftest tool'),
  ]

  if (cfg.enableTestTools) {
    disposeTools.push(ctx.effect(() => ctx.tools.register(makeTool({
      name: 'watchdog_test_fail',
      description: 'VERIFICATION AID (enableTestTools): a deterministic tool that always fails with the identical error, used to drive a real repeat loop and prove the watchdog blocks the N+1th identical call. Takes no meaningful arguments. Do not use for real work.',
      parameters: { tag: { type: 'string', description: 'Optional fixed tag; keep it constant to build an identical-call loop.' } },
      output: obj({ ok: { type: 'boolean' }, message: { type: 'string' } }),
      execute() {
        throw new Error('watchdog test failure (deterministic)')
      },
    })), 'watchdog: test-fail tool'))
  }

  // ---- Authenticated HTTP routes for the dashboard ----
  const api = '/api/runaway-watchdog'
  const disposeRoutes = [
    ctx.effect(() => ctx.connection.fetch.register({
      path: `${api}/status`, methods: ['GET', 'HEAD'], requestBody: 'buffered',
      fetch: (request) => jsonResponse(statusSnapshot(), 200, request.method === 'HEAD'),
    }), 'watchdog: status route'),
    ctx.effect(() => ctx.connection.fetch.register({
      path: `${api}/audit`, methods: ['GET', 'HEAD'], requestBody: 'buffered',
      fetch: (request) => {
        const params = new URL(request.url).searchParams
        const limit = Math.min(1000, Math.max(1, Number(params.get('limit') ?? 200) || 200))
        return jsonResponse({ entries: ledger.query({ session: params.get('session') ?? undefined, rule: params.get('rule') ?? undefined, limit }), stats: ledger.stats() }, 200, request.method === 'HEAD')
      },
    }), 'watchdog: audit route'),
    ctx.effect(() => ctx.connection.fetch.register({
      path: `${api}/config`, methods: ['GET', 'HEAD'], requestBody: 'buffered',
      fetch: (request) => jsonResponse({ config: cfg, defaults: DEFAULTS }, 200, request.method === 'HEAD'),
    }), 'watchdog: config route'),
    ctx.effect(() => ctx.connection.fetch.register({
      path: `${api}/selftest`, methods: ['GET', 'HEAD'], requestBody: 'buffered',
      fetch: async (request) => {
        if (request.method === 'HEAD') return jsonResponse({}, 200, true)
        return jsonResponse(await runSelfTest(undefined))
      },
    }), 'watchdog: selftest route'),
    ctx.effect(() => ctx.connection.fetch.register({
      path: `${api}/reset`, methods: ['POST'], requestBody: 'buffered',
      fetch: async (request) => {
        let body = {}
        try { body = await request.json() } catch { body = {} }
        const sessionId = typeof body.session === 'string' ? body.session : ''
        const entry = live.get(sessionId)
        const wasOpen = entry?.circuit !== null && entry?.circuit !== undefined
        if (entry !== undefined) {
          entry.circuit = null
          entry.advisedKeys.clear()
          entry.blockSig = null
          entry.advisoryKey = null
        }
        await audit(null, { rule: 'manual', severity: 'warn', detail: { sessionId, wasOpen } }, 'reset', 0)
        return jsonResponse({ reset: true, sessionId, wasOpen })
      },
    }), 'watchdog: reset route'),
    // One route per PATH: `connection` keys exact routes by path and throws on a
    // duplicate, so GET/HEAD/POST must be declared together and dispatched by
    // method. Two same-path routes abort plugin activation entirely (all routes,
    // tools and listeners roll back), which surfaces in the panel as HTTP 404.
    ctx.effect(() => ctx.connection.fetch.register({
      path: `${api}/prices`, methods: ['GET', 'HEAD', 'POST'], requestBody: 'buffered',
      fetch: async (request) => {
        if (request.method !== 'POST') {
          return jsonResponse({
            currency: cfg.currency, currencySymbol: CURRENCY_SYMBOL, usdToCny: cfg.usdToCny,
            fields: PRICE_FIELDS, builtin: BUILTIN_PRICES, user: userPricing,
          }, 200, request.method === 'HEAD')
        }
        let body
        try { body = await request.json() } catch { body = undefined }
        try {
          // A malformed body must never silently wipe the operator's price table.
          const pricing = body?.pricing
          if (pricing === null || typeof pricing !== 'object' || Array.isArray(pricing)) {
            throw new TypeError('pricing must be an object keyed by model')
          }
          setUserPricing(pricing)
          return jsonResponse({ ok: true, user: userPricing, currency: cfg.currency, currencySymbol: CURRENCY_SYMBOL })
        } catch (error) {
          return jsonResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }, 400)
        }
      },
    }), 'watchdog: prices route'),
  ]

  // ---- Host service for other plugins ----
  ctx.effect(() => ctx.provide('watchdog', {
    config: cfg,
    status: statusSnapshot,
    sessionStatus,
    audit: (opts) => ledger.query(opts),
    stats: () => ledger.stats(),
    pricing: () => ({ currency: cfg.currency, builtin: BUILTIN_PRICES, user: userPricing }),
    setPricing: (table) => setUserPricing(table),
    selftest: (session) => runSelfTest(session),
    reset: (sessionId) => {
      const entry = liveOf(String(sessionId))
      entry.circuit = null
      entry.advisedKeys.clear()
      entry.blockSig = null
      entry.advisoryKey = null
    },
  }), 'watchdog: host service')

  // Guard, listeners, tools, routes, and the service are each owned by their
  // own ctx.effect above (Cordis disposes them on unload). This effect only
  // releases the in-memory maps and the durable ledger handle.
  ctx.effect(() => () => {
    live.clear()
    states.clear()
    ledger.close()
  }, 'runaway-watchdog: ledger cleanup')
}