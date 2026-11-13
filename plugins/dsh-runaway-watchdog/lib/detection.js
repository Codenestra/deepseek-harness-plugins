/**
 * Pure detection core for the Runaway Watchdog.
 *
 * Every function here is synchronous and side-effect free. The session
 * projection folds committed session events through {@link applyEvent}; the
 * synchronous tool guard reads the folded state through {@link wouldBlock};
 * the live enforcement listener ranks breaches through {@link evaluate}.
 * Because the core is pure, the exact same code path is exercised by the
 * node:test unit suite, the in-process live self-test, and production replay.
 *
 * @module @local/dsh-runaway-watchdog/lib/detection
 */

import { resolvePrice, messageCost } from './pricing.js'

/** Hard cap on the pending-call correlation map (parallel calls in flight). */
export const PENDING_CAP = 128
/** Hard cap on the retained tool-result ring. */
export const RESULT_CAP = 128
/** Hard cap on the retained token-usage sample ring. */
export const USAGE_CAP = 512

/**
 * Deep key-sorting canonicalization so argument key order never affects
 * identity. Undefined object keys are dropped and undefined array elements
 * become null, exactly as JSON.stringify does, so `{a:1}` and
 * `{a:1,b:undefined}` share one key (matching the official repeat-tool-reminder
 * chain key). Real tool arguments are JSON, so this only normalizes edge cases.
 * @param {unknown} value - lossless JSON argument value.
 * @returns {unknown} canonical form.
 */
export function canonicalize(value) {
  if (value === undefined) return null
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(canonicalize)
  const sorted = {}
  for (const key of Object.keys(value).sort()) {
    if (value[key] === undefined) continue
    sorted[key] = canonicalize(value[key])
  }
  return sorted
}

/**
 * Parse a raw tool/call argument string into a JSON value. A malformed string
 * (the model produced invalid JSON) is kept verbatim as a string so identical
 * malformed payloads still compare equal.
 * @param {unknown} raw - arguments value (string from the log, object from exec).
 * @returns {unknown} parsed value or the raw string.
 */
export function parseArgs(raw) {
  if (typeof raw !== 'string') return raw
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

/**
 * The stable identity of one tool call: name plus canonical arguments.
 * @param {string} name - tool name.
 * @param {unknown} args - argument value (already parsed or raw).
 * @returns {string} canonical signature.
 */
export function signature(name, args) {
  return JSON.stringify([name, canonicalize(parseArgs(args))])
}

/**
 * Truncated canonical argument preview for reminders and audit detail. The cap
 * bounds the preview, never the detection (the signature compares the FULL
 * canonical string).
 * @param {unknown} args - argument value.
 * @param {number} chars - maximum preview characters.
 * @returns {string} preview.
 */
export function preview(args, chars) {
  const text = JSON.stringify(canonicalize(parseArgs(args))) ?? 'null'
  return text.length > chars ? `${text.slice(0, chars)}…` : text
}

/**
 * Wildcard tool-name match. A pattern with no `*` is exact; otherwise `*`
 * matches any run of characters. An empty pattern list matches nothing.
 * @param {string} name - tool name.
 * @param {readonly string[]} patterns - wildcard patterns.
 * @returns {boolean} whether any pattern matches.
 */
export function matchTool(name, patterns) {
  for (const pattern of patterns) {
    if (!pattern.includes('*')) {
      if (pattern === name) return true
      continue
    }
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
    if (new RegExp(`^${escaped}$`).test(name)) return true
  }
  return false
}

/**
 * Whether a tool is transparent to detection (excluded wins over include).
 * @param {string} name - tool name.
 * @param {{include: readonly string[], exclude: readonly string[]}} cfg - normalized config.
 * @returns {boolean} true when the tool should be tracked.
 */
export function tracked(name, cfg) {
  if (matchTool(name, cfg.exclude)) return false
  return cfg.include.length === 0 || matchTool(name, cfg.include)
}

/**
 * Total tokens from one provider usage record. Counts are disjoint; the
 * authoritative total is preferred, otherwise the billed sum is derived.
 * @param {object|undefined} usage - TokenUsage record.
 * @returns {number} non-negative token count.
 */
export function tokensOf(usage) {
  if (!usage || typeof usage !== 'object') return 0
  if (typeof usage.totalTokens === 'number' && Number.isFinite(usage.totalTokens)) {
    return Math.max(0, usage.totalTokens)
  }
  const sum = (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0)
    + (usage.cacheReadTokens ?? 0) + (usage.cacheWriteTokens ?? 0)
  return Number.isFinite(sum) ? Math.max(0, sum) : 0
}

/**
 * Newly generated (output) tokens from one usage record — the token-velocity
 * metric. Input/cache-read tokens are context re-send and excluded so long
 * conversations do not false-positive.
 * @param {object|undefined} usage - TokenUsage record.
 * @returns {number} non-negative output token count.
 */
export function outputTokensOf(usage) {
  if (!usage || typeof usage !== 'object') return 0
  const out = usage.outputTokens
  return typeof out === 'number' && Number.isFinite(out) ? Math.max(0, out) : 0
}

/**
 * The empty detection state for a session with no folded events.
 * @returns {object} initial plain-JSON state.
 */
export function initialState() {
  return {
    v: 1,
    lastSig: null,
    repeat: 0,
    lastName: null,
    lastPreview: null,
    lastError: false,
    pending: {},
    results: [],
    usage: [],
    models: {},
    lastModel: null,
    totalTokens: 0,
    calls: 0,
    errors: 0,
  }
}

/** Append to a bounded ring, returning a new array (never mutates the input). */
function pushRing(ring, item, cap) {
  const next = ring.length >= cap ? ring.slice(ring.length - cap + 1) : ring.slice()
  next.push(item)
  return next
}

/**
 * Pure transition: previous state + one committed session event → next state.
 * Returns the SAME reference when the event is not this unit's, so unchanged
 * state costs zero downstream work (the projection contract).
 *
 * Folds only existing core events: `tool/call`, `tool/result`,
 * `assistant/message`, and `user/message`. No new event type is ever appended.
 *
 * A `tool/result` for a call the watchdog ITSELF denied contributes to the
 * repeat chain (the underlying call did fail, so the loop is still failing) but
 * never to the error-rate ring: a detector must not measure its own output, or
 * one identical-call loop would inflate the error rate into a full circuit.
 *
 * @param {object} state - previous detection state.
 * @param {object} event - committed session event ({type, data, time, seq}).
 * @param {object} cfg - normalized config.
 * @param {Set<string>} [deniedCallIds] - callIds this guard denied (self-blocked).
 * @returns {object} next state (same reference when unchanged).
 */
export function applyEvent(state, event, cfg, deniedCallIds) {
  const type = event.type
  const data = event.data ?? {}
  const time = typeof event.time === 'number' ? event.time : 0

  if (type === 'tool/call') {
    const name = data.name
    if (typeof name !== 'string' || !tracked(name, cfg)) return state
    const callId = String(data.callId ?? '')
    if (callId === '') return state
    const sig = signature(name, data.arguments)
    const entry = { sig, name, preview: preview(data.arguments, cfg.argumentsPreviewChars) }
    let pending = { ...state.pending, [callId]: entry }
    const keys = Object.keys(pending)
    if (keys.length > PENDING_CAP) {
      const drop = keys.slice(0, keys.length - PENDING_CAP)
      pending = { ...pending }
      for (const key of drop) delete pending[key]
    }
    return { ...state, pending }
  }

  if (type === 'tool/result') {
    const message = data.message ?? {}
    const callId = String(message.toolCallId ?? '')
    const entry = state.pending[callId]
    // Only tracked calls (recorded at tool/call) participate in the chain.
    if (entry === undefined) return state
    const failed = message.isError === true || data.error != null
    // A result the watchdog itself produced has NO observed tool outcome, so it
    // is excluded from the error ring entirely (counting it as an error would
    // let the loop inflate the rate; counting it as a success would dilute it).
    const selfDenied = deniedCallIds instanceof Set && deniedCallIds.has(callId)
    const countsAsError = failed && !selfDenied
    const repeat = entry.sig === state.lastSig ? state.repeat + 1 : 1
    const pending = { ...state.pending }
    delete pending[callId]
    return {
      ...state,
      lastSig: entry.sig,
      repeat,
      lastName: entry.name,
      lastPreview: entry.preview,
      lastError: failed,
      pending,
      results: selfDenied ? state.results : pushRing(state.results, { t: time, e: countsAsError }, RESULT_CAP),
      calls: state.calls + 1,
      errors: state.errors + (countsAsError ? 1 : 0),
    }
  }

  if (type === 'assistant/message') {
    const usage = data.usage
    const tokens = tokensOf(usage)
    if (tokens <= 0) return state
    // Token velocity counts NEWLY GENERATED (output) tokens only; input/cache
    // tokens are context re-send and would false-positive on long conversations.
    const out = outputTokensOf(usage)
    // Store the RAW disjoint usage buckets + the exact model that produced the
    // message. Cost is computed on demand against the CURRENT price table, so a
    // price edit takes effect immediately (no re-fold, no restart).
    const src = data.message?.source ?? {}
    const provider = typeof src.provider === 'string' ? src.provider : ''
    const model = typeof src.model === 'string' ? src.model : ''
    const modelKey = provider ? `${provider}/${model}` : (model || 'unknown')
    const n = (v) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0)
    const buckets = { i: n(usage.inputTokens), o: out, cr: n(usage.cacheReadTokens), cw: n(usage.cacheWriteTokens) }
    const sample = { t: time, k: out, ...buckets, p: provider, m: model }
    const prev = state.models[modelKey] ?? { provider, model, calls: 0, i: 0, o: 0, cr: 0, cw: 0 }
    const models = {
      ...state.models,
      [modelKey]: {
        provider, model, calls: prev.calls + 1,
        i: prev.i + buckets.i, o: prev.o + buckets.o, cr: prev.cr + buckets.cr, cw: prev.cw + buckets.cw,
      },
    }
    return {
      ...state,
      usage: pushRing(state.usage, sample, USAGE_CAP),
      models,
      lastModel: modelKey,
      totalTokens: state.totalTokens + tokens,
    }
  }

  if (type === 'user/message') {
    // A real human interjection changes the context; repetition across it is
    // not a loop. Reset only the repeat chain, keep counters and velocity.
    const source = data.source ?? {}
    if (source.kind !== 'user') return state
    if (state.lastSig === null && state.repeat === 0) return state
    return { ...state, lastSig: null, repeat: 0, lastName: null, lastPreview: null, lastError: false }
  }

  return state
}

/**
 * Sum tokens sampled within the velocity window ending at `now`.
 * @param {object} state - detection state.
 * @param {number} now - window end (epoch ms).
 * @param {number} windowMs - window length.
 * @returns {{tokens: number, samples: number}} windowed token sum and sample count.
 */
export function windowTokens(state, now, windowMs) {
  const from = now - windowMs
  let tokens = 0
  let samples = 0
  for (const sample of state.usage) {
    if (sample.t > from && sample.t <= now) {
      tokens += sample.k
      samples += 1
    }
  }
  return { tokens, samples }
}

/**
 * Categorized spend (CNY) sampled within the velocity window, priced against the
 * CURRENT user price table. Because cost is derived from stored raw buckets ×
 * live prices, editing a price changes this immediately — no re-fold needed.
 * @param {object} state - detection state.
 * @param {number} now - window end (epoch ms).
 * @param {number} windowMs - window length.
 * @param {object} userPricing - live user price table (normalized).
 * @returns {number} windowed spend in CNY.
 */
export function windowCost(state, now, windowMs, userPricing) {
  const from = now - windowMs
  let cost = 0
  for (const sample of state.usage) {
    if (sample.t > from && sample.t <= now) {
      const { price } = resolvePrice(sample.p, sample.m, userPricing)
      cost += messageCost({ inputTokens: sample.i, outputTokens: sample.o, cacheReadTokens: sample.cr, cacheWriteTokens: sample.cw }, price)
    }
  }
  return cost
}

/**
 * Total categorized spend (CNY) for the whole session, priced against the CURRENT
 * user price table (per-model accumulated buckets × live rates).
 * @param {object} state - detection state.
 * @param {object} userPricing - live user price table (normalized).
 * @returns {number} total spend in CNY.
 */
export function totalCost(state, userPricing) {
  let cost = 0
  for (const m of Object.values(state.models)) {
    const { price } = resolvePrice(m.provider, m.model, userPricing)
    cost += messageCost({ inputTokens: m.i, outputTokens: m.o, cacheReadTokens: m.cr, cacheWriteTokens: m.cw }, price)
  }
  return cost
}

/**
 * Rank every active breach from the folded state. Pure: `now` is supplied by
 * the caller (event time in production, a fixed clock in tests).
 *
 * Severities: `warn` (advisory), `block` (the guard denies the repeating call),
 * `circuit` (open the spend/error circuit breaker for the cooldown).
 *
 * @param {object} state - detection state.
 * @param {object} cfg - normalized config.
 * @param {number} now - evaluation clock (epoch ms).
 * @returns {Array<object>} breaches ({rule, severity, detail}).
 */
export function evaluate(state, cfg, now, userPricing = cfg.pricing) {
  const breaches = []

  if (state.lastSig !== null && state.repeat >= cfg.repeatWarnThreshold) {
    const hard = state.repeat >= cfg.repeatBlockThreshold && (state.lastError || cfg.blockSuccessRepeats)
    breaches.push({
      rule: 'repeat',
      severity: hard ? 'block' : 'warn',
      detail: { tool: state.lastName, count: state.repeat, preview: state.lastPreview, lastError: state.lastError },
    })
  }

  const window = state.results.slice(-cfg.errorWindow)
  if (window.length >= cfg.errorMinSamples) {
    const errors = window.filter(r => r.e).length
    const rate = errors / window.length
    if (rate >= cfg.errorRateThreshold) {
      breaches.push({
        rule: 'error-rate',
        severity: 'circuit',
        detail: { rate, errors, window: window.length },
      })
    }
  }

  const { tokens } = windowTokens(state, now, cfg.velocityWindowMs)
  const minutes = cfg.velocityWindowMs / 60000
  const vpm = minutes > 0 ? tokens / minutes : 0
  if (cfg.tokenVelocityLimit > 0 && vpm >= cfg.tokenVelocityLimit) {
    breaches.push({ rule: 'token-velocity', severity: 'circuit', detail: { tokensPerMinute: Math.round(vpm), windowMs: cfg.velocityWindowMs } })
  }
  if (cfg.spendVelocityLimit > 0) {
    const cost = windowCost(state, now, cfg.velocityWindowMs, userPricing)
    const spm = minutes > 0 ? cost / minutes : 0
    if (spm >= cfg.spendVelocityLimit) {
      breaches.push({ rule: 'spend-velocity', severity: 'circuit', detail: { spendPerMinute: Number(spm.toFixed(4)), tokensPerMinute: Math.round(vpm), currency: cfg.currency } })
    }
  }

  return breaches
}

/**
 * Whether the synchronous guard must deny THIS incoming call as a runaway
 * repeat. Reads only completed-call state, so it is correct regardless of
 * whether the current call's tool/call event has committed yet.
 * @param {object} state - detection state.
 * @param {string} name - incoming tool name.
 * @param {unknown} args - incoming argument value.
 * @param {object} cfg - normalized config.
 * @returns {boolean} true when the call must be blocked.
 */
export function wouldBlock(state, name, args, cfg) {
  if (cfg.mode !== 'enforce') return false
  if (!tracked(name, cfg)) return false
  if (state.lastSig === null) return false
  if (state.repeat < cfg.repeatBlockThreshold) return false
  if (!state.lastError && !cfg.blockSuccessRepeats) return false
  return signature(name, args) === state.lastSig
}

/**
 * The watchdog's operator tool names, never blocked by the repeat/circuit guard
 * so the operator can always inspect status and reset a tripped circuit.
 * watchdog_test_fail is deliberately NOT exempt: it is a verification aid that
 * must be blockable so a real repeat loop can prove the N+1th call is denied.
 */
export const WATCHDOG_TOOLS = new Set([
  'watchdog_status', 'watchdog_audit', 'watchdog_reset', 'watchdog_selftest',
])

/**
 * Tool names that spawn a child agent (recursion / fan-out enforcement).
 * @param {string} name - tool name.
 * @returns {boolean} whether the call delegates to a new agent.
 */
export function isSpawnTool(name) {
  return name === 'subagent' || name.startsWith('subagent_')
    || name === 'spawn_teammate' || name === 'workflow'
}