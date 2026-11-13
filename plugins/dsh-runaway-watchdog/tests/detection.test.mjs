import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  canonicalize, signature, parseArgs, preview, matchTool, tracked, tokensOf,
  initialState, applyEvent, evaluate, wouldBlock, windowTokens, isSpawnTool,
  PENDING_CAP,
} from '../lib/detection.js'
import { normalizeConfig } from '../lib/config.js'

const cfg = normalizeConfig({})
const call = (i, name, args) => ({ type: 'tool/call', time: i, data: { callId: `c${i}`, name, arguments: typeof args === 'string' ? args : JSON.stringify(args) } })
const result = (i, isError) => ({ type: 'tool/result', time: i, data: { message: { toolCallId: `c${i}`, isError } } })

describe('canonicalize / signature', () => {
  test('key order does not affect identity', () => {
    assert.equal(signature('t', { a: 1, b: 2 }), signature('t', { b: 2, a: 1 }))
  })
  test('undefined normalizes to null', () => {
    assert.equal(signature('t', { a: 1 }), signature('t', { a: 1, b: undefined }))
  })
  test('different arguments differ', () => {
    assert.notEqual(signature('t', { a: 1 }), signature('t', { a: 2 }))
  })
  test('different tool names differ', () => {
    assert.notEqual(signature('t', { a: 1 }), signature('u', { a: 1 }))
  })
  test('nested objects and arrays canonicalize deeply', () => {
    assert.equal(signature('t', { x: { b: 1, a: [1, { d: 2, c: 3 }] } }), signature('t', { x: { a: [1, { c: 3, d: 2 }], b: 1 } }))
  })
  test('parseArgs: valid JSON, invalid JSON, object passthrough', () => {
    assert.deepEqual(parseArgs('{"a":1}'), { a: 1 })
    assert.equal(parseArgs('{bad json'), '{bad json')
    assert.deepEqual(parseArgs({ a: 1 }), { a: 1 })
  })
  test('identical malformed payloads still compare equal', () => {
    assert.equal(signature('t', '{bad'), signature('t', '{bad'))
  })
  test('preview truncates with ellipsis and bounds length', () => {
    const long = { data: 'x'.repeat(500) }
    const p = preview(long, 50)
    assert.ok(p.length <= 51)
    assert.ok(p.endsWith('…'))
  })
})

describe('matchTool / tracked', () => {
  test('exact and wildcard matching', () => {
    assert.ok(matchTool('bash', ['bash']))
    assert.ok(matchTool('subagent_fork', ['subagent_*']))
    assert.ok(!matchTool('bash', ['subagent_*']))
    assert.ok(!matchTool('bash', []))
  })
  test('exclude wins over include; empty include tracks all', () => {
    const c = normalizeConfig({ include: ['bash', 'read'], exclude: ['bash'] })
    assert.ok(!tracked('bash', c))
    assert.ok(tracked('read', c))
    assert.ok(!tracked('write', c))
    assert.ok(tracked('anything', normalizeConfig({})))
  })
})

describe('tokensOf', () => {
  const cases = [
    [{ totalTokens: 100, inputTokens: 10, outputTokens: 10 }, 100],
    [{ inputTokens: 10, outputTokens: 20 }, 30],
    [{ inputTokens: 10, outputTokens: 20, cacheReadTokens: 5, cacheWriteTokens: 5 }, 40],
    [undefined, 0],
    [{}, 0],
    [{ inputTokens: -5, outputTokens: 0 }, 0],
  ]
  for (const [usage, expected] of cases) {
    test(`tokensOf(${JSON.stringify(usage)}) = ${expected}`, () => assert.equal(tokensOf(usage), expected))
  }
})

describe('applyEvent: repeat chain', () => {
  test('identical failing calls build the chain', () => {
    let s = initialState()
    for (let i = 1; i <= 4; i += 1) { s = applyEvent(s, call(i, 'demo', { x: 1 }), cfg); s = applyEvent(s, result(i, true), cfg) }
    assert.equal(s.repeat, 4)
    assert.equal(s.calls, 4)
    assert.equal(s.errors, 4)
    assert.equal(s.lastError, true)
    assert.equal(s.lastName, 'demo')
  })
  test('a different signature resets the chain to 1', () => {
    let s = initialState()
    s = applyEvent(s, call(1, 'demo', { x: 1 }), cfg); s = applyEvent(s, result(1, true), cfg)
    s = applyEvent(s, call(2, 'demo', { x: 1 }), cfg); s = applyEvent(s, result(2, true), cfg)
    s = applyEvent(s, call(3, 'demo', { x: 2 }), cfg); s = applyEvent(s, result(3, true), cfg)
    assert.equal(s.repeat, 1)
  })
  test('key order does not break the chain', () => {
    let s = initialState()
    s = applyEvent(s, call(1, 'demo', { a: 1, b: 2 }), cfg); s = applyEvent(s, result(1, false), cfg)
    s = applyEvent(s, call(2, 'demo', { b: 2, a: 1 }), cfg); s = applyEvent(s, result(2, false), cfg)
    assert.equal(s.repeat, 2)
  })
  test('result without a pending call is ignored (same reference)', () => {
    const s = initialState()
    assert.equal(applyEvent(s, result(99, true), cfg), s)
  })
  test('non-tracked tool call is ignored (same reference)', () => {
    const c = normalizeConfig({ exclude: ['demo'] })
    const s = initialState()
    assert.equal(applyEvent(s, call(1, 'demo', {}), c), s)
  })
  test('unrelated event returns the same reference', () => {
    const s = initialState()
    assert.equal(applyEvent(s, { type: 'turn/start', time: 1, data: {} }, cfg), s)
  })
  test('human interjection resets the chain but keeps counters', () => {
    let s = initialState()
    s = applyEvent(s, call(1, 'demo', {}), cfg); s = applyEvent(s, result(1, true), cfg)
    s = applyEvent(s, call(2, 'demo', {}), cfg); s = applyEvent(s, result(2, true), cfg)
    const before = s.calls
    s = applyEvent(s, { type: 'user/message', time: 3, data: { source: { kind: 'user' } } }, cfg)
    assert.equal(s.repeat, 0)
    assert.equal(s.lastSig, null)
    assert.equal(s.calls, before)
  })
  test('synthetic (non-user) message does not reset the chain', () => {
    let s = initialState()
    s = applyEvent(s, call(1, 'demo', {}), cfg); s = applyEvent(s, result(1, true), cfg)
    const next = applyEvent(s, { type: 'user/message', time: 2, data: { source: { kind: 'plugin' } } }, cfg)
    assert.equal(next, s)
  })
  test('pending map is bounded', () => {
    let s = initialState()
    for (let i = 0; i < PENDING_CAP + 20; i += 1) s = applyEvent(s, call(i, 'demo', { i }), cfg)
    assert.ok(Object.keys(s.pending).length <= PENDING_CAP)
  })
})

describe('applyEvent: velocity samples', () => {
  test('assistant usage accumulates tokens and samples', () => {
    let s = initialState()
    s = applyEvent(s, { type: 'assistant/message', time: 1000, data: { usage: { inputTokens: 100, outputTokens: 50 } } }, cfg)
    s = applyEvent(s, { type: 'assistant/message', time: 2000, data: { usage: { totalTokens: 200 } } }, cfg)
    assert.equal(s.totalTokens, 350)
    assert.equal(s.usage.length, 2)
  })
  test('zero usage returns same reference', () => {
    const s = initialState()
    assert.equal(applyEvent(s, { type: 'assistant/message', time: 1, data: {} }, cfg), s)
  })
  test('windowTokens only counts samples inside (now-window, now]', () => {
    let s = initialState()
    s = applyEvent(s, { type: 'assistant/message', time: 0, data: { usage: { outputTokens: 100 } } }, cfg)
    s = applyEvent(s, { type: 'assistant/message', time: 50000, data: { usage: { outputTokens: 200 } } }, cfg)
    s = applyEvent(s, { type: 'assistant/message', time: 60000, data: { usage: { outputTokens: 400 } } }, cfg)
    const { tokens, samples } = windowTokens(s, 60000, 60000)
    assert.equal(tokens, 600)
    assert.equal(samples, 2)
  })
})

describe('evaluate: breach rules', () => {
  test('empty state has no breaches', () => {
    assert.deepEqual(evaluate(initialState(), cfg, 1000), [])
  })
  test('repeat warn at warn threshold, block at block threshold (errors)', () => {
    const c = normalizeConfig({ repeatWarnThreshold: 3, repeatBlockThreshold: 5 })
    let s = initialState()
    for (let i = 1; i <= 3; i += 1) { s = applyEvent(s, call(i, 'd', {}), c); s = applyEvent(s, result(i, true), c) }
    let b = evaluate(s, c, 10)
    assert.ok(b.some(x => x.rule === 'repeat' && x.severity === 'warn'))
    for (let i = 4; i <= 5; i += 1) { s = applyEvent(s, call(i, 'd', {}), c); s = applyEvent(s, result(i, true), c) }
    b = evaluate(s, c, 10)
    assert.ok(b.some(x => x.rule === 'repeat' && x.severity === 'block'))
  })
  test('success repeats warn but do not block unless flag set', () => {
    const c = normalizeConfig({ repeatWarnThreshold: 2, repeatBlockThreshold: 3, blockSuccessRepeats: false })
    let s = initialState()
    for (let i = 1; i <= 3; i += 1) { s = applyEvent(s, call(i, 'd', {}), c); s = applyEvent(s, result(i, false), c) }
    const b = evaluate(s, c, 10)
    assert.ok(b.some(x => x.rule === 'repeat' && x.severity === 'warn'))
    assert.ok(!b.some(x => x.rule === 'repeat' && x.severity === 'block'))
    const c2 = normalizeConfig({ repeatWarnThreshold: 2, repeatBlockThreshold: 3, blockSuccessRepeats: true })
    assert.ok(evaluate(s, c2, 10).some(x => x.rule === 'repeat' && x.severity === 'block'))
  })
  test('error-rate circuit fires at threshold with enough samples', () => {
    const c = normalizeConfig({ errorWindow: 5, errorMinSamples: 5, errorRateThreshold: 0.8 })
    let s = initialState()
    for (let i = 1; i <= 5; i += 1) { s = applyEvent(s, call(i, 't', { i }), c); s = applyEvent(s, result(i, true), c) }
    assert.ok(evaluate(s, c, 10).some(x => x.rule === 'error-rate' && x.severity === 'circuit'))
  })
  test('error-rate does not fire below min samples', () => {
    const c = normalizeConfig({ errorWindow: 10, errorMinSamples: 6, errorRateThreshold: 0.8 })
    let s = initialState()
    for (let i = 1; i <= 4; i += 1) { s = applyEvent(s, call(i, 't', { i }), c); s = applyEvent(s, result(i, true), c) }
    assert.ok(!evaluate(s, c, 10).some(x => x.rule === 'error-rate'))
  })
  test('error-rate below threshold does not fire', () => {
    const c = normalizeConfig({ errorWindow: 10, errorMinSamples: 5, errorRateThreshold: 0.8 })
    let s = initialState()
    for (let i = 1; i <= 10; i += 1) { s = applyEvent(s, call(i, 't', { i }), c); s = applyEvent(s, result(i, i <= 5), c) }
    assert.ok(!evaluate(s, c, 20).some(x => x.rule === 'error-rate'))
  })
  test('token velocity fires at/above limit within window', () => {
    const c = normalizeConfig({ velocityWindowMs: 60000, tokenVelocityLimit: 1000, spendVelocityLimit: 0 })
    let s = applyEvent(initialState(), { type: 'assistant/message', time: 1000, data: { usage: { outputTokens: 1200 } } }, c)
    assert.ok(evaluate(s, c, 2000).some(x => x.rule === 'token-velocity'))
    s = applyEvent(initialState(), { type: 'assistant/message', time: 1000, data: { usage: { outputTokens: 999 } } }, c)
    assert.ok(!evaluate(s, c, 2000).some(x => x.rule === 'token-velocity'))
  })
  test('input/cache tokens do NOT inflate velocity (long-conversation false positive)', () => {
    const c = normalizeConfig({ velocityWindowMs: 60000, tokenVelocityLimit: 1000, spendVelocityLimit: 0 })
    // A huge context re-send (input + cache read) with tiny output must not trip.
    const s = applyEvent(initialState(), { type: 'assistant/message', time: 1000, data: { usage: { inputTokens: 500000, cacheReadTokens: 400000, outputTokens: 50 } } }, c)
    assert.ok(!evaluate(s, c, 2000).some(x => x.rule === 'token-velocity'))
    assert.equal(s.totalTokens, 900050)
  })
  test('spend velocity fires from token rate × price', () => {
    const c = normalizeConfig({ velocityWindowMs: 60000, tokenVelocityLimit: 0, spendVelocityLimit: 3, pricePerMillionTokens: 3 })
    // 2,000,000 output tokens/min × $3/M = $6/min >= $3
    const s = applyEvent(initialState(), { type: 'assistant/message', time: 1000, data: { usage: { outputTokens: 2000000 } } }, c)
    assert.ok(evaluate(s, c, 2000).some(x => x.rule === 'spend-velocity'))
  })
})

describe('wouldBlock: guard decision', () => {
  const c = normalizeConfig({ mode: 'enforce', repeatWarnThreshold: 2, repeatBlockThreshold: 3 })
  function built(n, isError) {
    let s = initialState()
    for (let i = 1; i <= n; i += 1) { s = applyEvent(s, call(i, 'demo', { x: 1 }), c); s = applyEvent(s, result(i, isError), c) }
    return s
  }
  test('blocks the N+1th identical failing call at threshold', () => {
    assert.ok(wouldBlock(built(3, true), 'demo', { x: 1 }, c))
  })
  test('does not block below threshold', () => {
    assert.ok(!wouldBlock(built(2, true), 'demo', { x: 1 }, c))
  })
  test('does not block a different signature', () => {
    assert.ok(!wouldBlock(built(3, true), 'demo', { x: 2 }, c))
    assert.ok(!wouldBlock(built(3, true), 'other', { x: 1 }, c))
  })
  test('monitor mode never blocks', () => {
    const m = normalizeConfig({ mode: 'monitor', repeatBlockThreshold: 3 })
    assert.ok(!wouldBlock(built(5, true), 'demo', { x: 1 }, m))
  })
  test('success repeats blocked only with flag', () => {
    assert.ok(!wouldBlock(built(3, false), 'demo', { x: 1 }, c))
    const c2 = normalizeConfig({ mode: 'enforce', repeatBlockThreshold: 3, blockSuccessRepeats: true })
    assert.ok(wouldBlock(built(3, false), 'demo', { x: 1 }, c2))
  })
  test('excluded tool never blocks', () => {
    const c2 = normalizeConfig({ mode: 'enforce', repeatBlockThreshold: 3, exclude: ['demo'] })
    assert.ok(!wouldBlock(built(3, true), 'demo', { x: 1 }, c2))
  })
})

describe('applyEvent: self-denied results', () => {
  test('a self-denied result stays out of the error ring but keeps the chain failing', () => {
    const c = normalizeConfig({ repeatWarnThreshold: 2, repeatBlockThreshold: 3 })
    let s = initialState()
    for (let i = 1; i <= 3; i += 1) { s = applyEvent(s, call(i, 'demo', { x: 1 }), c); s = applyEvent(s, result(i, true), c) }
    const errorsBefore = s.errors
    const samplesBefore = s.results.length
    s = applyEvent(s, call(4, 'demo', { x: 1 }), c)
    s = applyEvent(s, result(4, true), c, new Set(['c4']))
    assert.equal(s.errors, errorsBefore, 'the watchdog’s own denial must not count as a tool error')
    assert.equal(s.results.length, samplesBefore, 'no tool outcome was observed, so no sample is recorded')
    assert.equal(s.calls, 4, 'the call still counts as completed')
    assert.equal(s.repeat, 4, 'the repeat chain still advances')
    assert.equal(s.lastError, true, 'the underlying call failed, so the chain stays failing')
    assert.ok(wouldBlock(s, 'demo', { x: 1 }, c), 'the loop stays blocked')
  })
  test('a non-denied failure still counts (no behaviour change without the set)', () => {
    let s = initialState()
    s = applyEvent(s, call(1, 'demo', { x: 1 }), cfg)
    s = applyEvent(s, result(1, true), cfg)
    assert.equal(s.errors, 1)
    assert.equal(s.results[s.results.length - 1].e, true)
  })
  test('denying one call does not excuse later real failures', () => {
    const c = normalizeConfig({})
    let s = initialState()
    s = applyEvent(s, call(1, 'demo', { x: 1 }), c)
    s = applyEvent(s, result(1, true), c, new Set(['c1']))
    assert.equal(s.errors, 0)
    s = applyEvent(s, call(2, 'other', {}), c)
    s = applyEvent(s, result(2, true), c, new Set(['c1']))
    assert.equal(s.errors, 1, 'only the remembered call id is exempt')
  })
})

describe('isSpawnTool', () => {
  const cases = [['subagent', true], ['subagent_fork', true], ['subagent_acp', true], ['spawn_teammate', true], ['workflow', true], ['bash', false], ['read', false], ['watchdog_status', false]]
  for (const [name, expected] of cases) {
    test(`${name} -> ${expected}`, () => assert.equal(isSpawnTool(name), expected))
  }
})