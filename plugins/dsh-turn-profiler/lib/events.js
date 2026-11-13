/**
 * Pure event folding for the turn profiler: a complete logical session
 * snapshot folds into turn/step/tool-call rows. No host dependencies; every
 * helper is fail-closed — malformed input yields `null`/skips, never guesses.
 *
 * Timing here is RECONSTRUCTED from durable logs (stream time0 + cumulative
 * dt); exact live timing joins in a later milestone and is kept separate via
 * the timing_source column.
 */

const TOKEN_KEYS = Object.freeze([
  'input_tokens',
  'output_tokens',
  'cache_read_tokens',
  'cache_write_tokens',
  'reasoning_tokens',
])

function isSafeInt(value) {
  return Number.isSafeInteger(value)
}

function safeCount(value) {
  return Number.isSafeInteger(value) && value >= 0
}

/** Sum two unknown-preserving token counts: null means "never reported". */
function sumKnown(current, addition) {
  if (addition === null || addition === undefined) return current
  if (current === null || current === undefined) return addition
  return current + addition
}

/**
 * Validate one provider TokenUsage sample without manufacturing absent
 * fields. A contradictory sample is rejected as a whole (fail-closed, same
 * philosophy as usage-center): optional fields stay `null`, never zero.
 */
export function normalizeUsage(value) {
  const empty = {
    input_tokens: null,
    output_tokens: null,
    cache_read_tokens: null,
    cache_write_tokens: null,
    reasoning_tokens: null,
  }
  if (value === undefined || value === null) return empty
  if (typeof value !== 'object' || Array.isArray(value)) return empty

  const input = value.inputTokens
  const output = value.outputTokens
  const cacheRead = value.cacheReadTokens
  const cacheWrite = value.cacheWriteTokens
  const reasoning = value.reasoningTokens
  if (!safeCount(input) || !safeCount(output)) return empty
  if (cacheRead !== undefined && !safeCount(cacheRead)) return empty
  if (cacheWrite !== undefined && !safeCount(cacheWrite)) return empty
  if (reasoning !== undefined && (!safeCount(reasoning) || reasoning > output)) return empty

  return {
    input_tokens: input,
    output_tokens: output,
    cache_read_tokens: cacheRead === undefined ? null : cacheRead,
    cache_write_tokens: cacheWrite === undefined ? null : cacheWrite,
    reasoning_tokens: reasoning === undefined ? null : reasoning,
  }
}

/** Truncate raw tool-call arguments into a short single-line summary. */
export function summarizeArguments(raw, limit = 120) {
  if (typeof raw !== 'string') return null
  const flat = raw.replace(/\s+/gu, ' ').trim()
  if (flat === '') return null
  return flat.length > limit ? `${flat.slice(0, limit)}…` : flat
}

function chunkIsToken(chunk) {
  if (chunk?.type === 'text-delta' || chunk?.type === 'reasoning-delta') return chunk.text !== ''
  if (chunk?.type === 'tool-call-delta') return chunk.argumentsDelta !== '' || chunk.name !== undefined
  return false
}

/**
 * Rebuild timing facts from a compact durable AssistantStreamRecord list.
 * Member time = time0 + cumulative dt (see assistant-stream.ts). Malformed
 * records are ignored individually; nothing throws.
 * @returns {{firstTokenAt: number|undefined, lastTokenAt: number|undefined,
 *   lastChunkAt: number|undefined, usage: unknown, finishReason: unknown}}
 */
export function streamTiming(stream) {
  const facts = {
    firstTokenAt: undefined,
    lastTokenAt: undefined,
    lastChunkAt: undefined,
    usage: undefined,
    finishReason: undefined,
  }
  if (!Array.isArray(stream)) return facts

  const observeToken = (time) => {
    if (!isSafeInt(time)) return
    if (facts.firstTokenAt === undefined || time < facts.firstTokenAt) facts.firstTokenAt = time
    if (facts.lastTokenAt === undefined || time > facts.lastTokenAt) facts.lastTokenAt = time
  }
  const observeTime = (time) => {
    if (isSafeInt(time) && (facts.lastChunkAt === undefined || time > facts.lastChunkAt)) {
      facts.lastChunkAt = time
    }
  }

  for (const record of stream) {
    if (record === null || typeof record !== 'object') continue
    if (record.type === 'chunk') {
      observeTime(record.time)
      const chunk = record.chunk
      if (chunk === null || typeof chunk !== 'object') continue
      if (chunkIsToken(chunk)) observeToken(record.time)
      if (chunk.type === 'usage') facts.usage = chunk.usage
      else if (chunk.type === 'finish') facts.finishReason = chunk.reason
      continue
    }
    if (record.type !== 'text-chunks'
      && record.type !== 'reasoning-chunks'
      && record.type !== 'tool-call-chunks') continue
    const members = record.type === 'tool-call-chunks' ? record.args : record.texts
    if (!isSafeInt(record.time0) || !Array.isArray(record.dt) || !Array.isArray(members)) continue
    if (members.length === 0 || record.dt.length !== members.length - 1) continue
    if (record.dt.some(delta => !isSafeInt(delta))) continue

    // A tool-call run carrying `name` marks every member as a token, matching
    // isTokenDelta(); other runs count non-empty fragments only.
    const namedToolRun = record.type === 'tool-call-chunks' && record.name !== undefined
    let time = record.time0
    let lastMemberTime = time
    for (let index = 0; index < members.length; index += 1) {
      if (index > 0) time += record.dt[index - 1]
      if (!isSafeInt(time)) break
      lastMemberTime = time
      const member = members[index]
      if (typeof member !== 'string') continue
      if (namedToolRun || member !== '') observeToken(time)
    }
    observeTime(lastMemberTime)
  }
  return facts
}

function normalizedRoute(value) {
  if (typeof value?.provider !== 'string' || value.provider === '') return undefined
  if (typeof value?.model !== 'string' || value.model === '') return undefined
  return { provider: value.provider, model: value.model }
}

function stepKey(turn, step) {
  return `${turn}:${step}`
}

function unionLength(intervals) {
  if (intervals.length === 0) return 0
  const sorted = [...intervals].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  let total = 0
  let [currentStart, currentEnd] = sorted[0]
  for (const [start, end] of sorted.slice(1)) {
    if (start > currentEnd) {
      total += currentEnd - currentStart
      currentStart = start
      currentEnd = end
    } else if (end > currentEnd) {
      currentEnd = end
    }
  }
  total += currentEnd - currentStart
  return total
}

function newTurnRow(sessionId, workspace, turn) {
  return {
    session_id: sessionId,
    turn,
    workspace,
    started_at: null,
    ended_at: null,
    wall_ms: null,
    reason: null,
    provider: null,
    model: null,
    step_count: 0,
    retry_count: 0,
    llm_ms: null,
    tool_ms: null,
    input_tokens: null,
    output_tokens: null,
    cache_read_tokens: null,
    cache_write_tokens: null,
    reasoning_tokens: null,
    timing_source: null,
  }
}

function newStepRow(sessionId, turn, step) {
  return {
    session_id: sessionId,
    turn,
    step,
    started_at: null,
    ended_at: null,
    llm_ms: null,
    ttft_ms: null,
    decode_ms: null,
    input_tokens: null,
    output_tokens: null,
    cache_read_tokens: null,
    cache_write_tokens: null,
    reasoning_tokens: null,
    attempt_count: 0,
    timing_source: null,
    header_reason: null,
  }
}

function newToolRow(sessionId, turn, step, callId) {
  return {
    session_id: sessionId,
    turn,
    step,
    call_id: callId,
    name: null,
    started_at: null,
    ended_at: null,
    ms: null,
    is_error: 0,
    error_code: null,
    args_summary: null,
  }
}

/**
 * Validate one live-stream capture into exact timing facts. Absent or
 * malformed captures fold as `undefined` so the reconstructed path applies.
 */
function exactTiming(capture) {
  if (capture === null || typeof capture !== 'object') return undefined
  // STRICT INTEGER columns: monotonic-clock values are fractional, round them.
  const finite = value => Number.isFinite(value) && value >= 0 ? Math.round(value) : null
  const startedAt = Number.isSafeInteger(capture.startedAt) ? capture.startedAt : null
  const llmMs = finite(capture.llmMs)
  const ttftMs = finite(capture.ttftMs)
  const decodeMs = finite(capture.decodeMs)
  if (startedAt === null && llmMs === null && ttftMs === null && decodeMs === null) return undefined
  return { startedAt, llmMs, ttftMs, decodeMs }
}

/**
 * Fold one complete logical session snapshot into profiler rows. The
 * fork-inherited prefix is never folded; it belongs to the ancestor session.
 * Malformed individual events are counted in `skippedEvents` and skipped —
 * one broken event must never discard an entire session history.
 *
 * @param snapshot - detached session snapshot (header + events).
 * @param timings - optional exact live-capture timings keyed by settlement
 *   event seq (assistant/message | assistant/attempt): { startedAt, llmMs,
 *   ttftMs, decodeMs }. Captured fields override reconstructed ones and mark
 *   the step `exact`; each captured settlement also emits an attempt row so
 *   retries can render as their own orange segments.
 */
export function foldSessionSnapshot(snapshot, timings = new Map()) {
  const header = snapshot?.session ?? snapshot?.header
  const events = Array.isArray(snapshot?.events) ? snapshot.events : []
  if (typeof header?.id !== 'string' || header.id === '') {
    throw new TypeError('session snapshot is missing its id')
  }
  const inheritedValue = snapshot?.inheritedEventCount
  let inheritedEventCount = 0
  if (inheritedValue !== undefined || header.isSeeded === true) {
    if (!Number.isSafeInteger(inheritedValue)
      || inheritedValue < 0
      || inheritedValue > events.length) {
      throw new TypeError('session snapshot has an invalid inheritedEventCount')
    }
    inheritedEventCount = inheritedValue
  }

  const sessionId = header.id
  const workspace = typeof header.cwd === 'string' ? header.cwd : null

  /** @type {Map<number, object>} */
  const turns = new Map()
  /** @type {Map<string, object>} */
  const steps = new Map()
  /** @type {Map<string, object>} */
  const tools = new Map()
  const attempts = []
  const settlementsByStep = new Map()
  const toolCountsByTurn = new Map()
  const intervalsByTurn = new Map()

  let route
  let pendingHeaderReason = null
  let skippedEvents = 0

  const ensureTurn = (turn) => {
    let row = turns.get(turn)
    if (row === undefined) {
      row = newTurnRow(sessionId, workspace, turn)
      turns.set(turn, row)
    }
    return row
  }
  const ensureStep = (turn, step) => {
    const key = stepKey(turn, step)
    let row = steps.get(key)
    if (row === undefined) {
      row = newStepRow(sessionId, turn, step)
      steps.set(key, row)
      ensureTurn(turn).step_count += 1
    }
    return row
  }

  for (const event of events.slice(inheritedEventCount)) {
    if (event === null || typeof event !== 'object') {
      skippedEvents += 1
      continue
    }
    const data = event.data
    const time = isSafeInt(event.time) ? event.time : null
    switch (event.type) {
      case 'turn/start': {
        if (!Number.isSafeInteger(data?.turn) || time === null) { skippedEvents += 1; break }
        const row = ensureTurn(data.turn)
        if (row.started_at === null) row.started_at = time
        break
      }
      case 'turn/end': {
        if (!Number.isSafeInteger(data?.turn) || time === null) { skippedEvents += 1; break }
        const row = ensureTurn(data.turn)
        if (row.ended_at === null) row.ended_at = time
        row.reason = typeof data.reason?.kind === 'string' ? data.reason.kind : 'unknown'
        if (row.started_at !== null && row.ended_at >= row.started_at) {
          row.wall_ms = row.ended_at - row.started_at
        }
        break
      }
      case 'step/start': {
        if (!Number.isSafeInteger(data?.turn) || !Number.isSafeInteger(data?.step) || time === null) {
          skippedEvents += 1
          break
        }
        const row = ensureStep(data.turn, data.step)
        if (row.started_at === null) row.started_at = time
        // NOTE: pendingHeaderReason is intentionally NOT reset here. Header
        // events are epoch-level (initial/change/series/resume), not per-step:
        // a step without its own header inherits the governing reason of the
        // latest header at or before it ("本步前最近的 request/header").
        break
      }
      case 'step/end': {
        if (!Number.isSafeInteger(data?.turn) || !Number.isSafeInteger(data?.step) || time === null) {
          skippedEvents += 1
          break
        }
        const row = ensureStep(data.turn, data.step)
        if (row.ended_at === null) row.ended_at = time
        break
      }
      case 'request/header': {
        if (data === null || typeof data !== 'object') { skippedEvents += 1; break }
        route = normalizedRoute(data.header?.config) ?? route
        pendingHeaderReason = typeof data.reason === 'string' ? data.reason : null
        break
      }
      case 'request/context': {
        if (data === null || typeof data !== 'object') { skippedEvents += 1; break }
        route = normalizedRoute(data) ?? route
        break
      }
      case 'assistant/message':
      case 'assistant/attempt': {
        if (!Number.isSafeInteger(data?.turn) || !Number.isSafeInteger(data?.step)) {
          skippedEvents += 1
          break
        }
        const step = ensureStep(data.turn, data.step)
        const turn = ensureTurn(data.turn)
        const facts = streamTiming(data.stream)
        if (event.type === 'assistant/attempt') {
          step.attempt_count += 1
          turn.retry_count += 1
        }
        // Usage conservation: attempts are real billed model calls too, so
        // their stream-reported usage folds into the step's totals. The
        // committed message's own usage field wins over its stream copy.
        const sample = event.type === 'assistant/message' && data.usage !== undefined
          ? data.usage
          : facts.usage
        const usage = normalizeUsage(sample)
        for (const key of TOKEN_KEYS) {
          step[key] = sumKnown(step[key], usage[key])
        }
        if (event.type === 'assistant/message') {
          const exact = normalizedRoute(data.message?.source)
          if (exact !== undefined) route = exact
        }
        if (route !== undefined) {
          turn.provider = route.provider
          turn.model = route.model
        }
        // Reconstructed timing: the latest settlement with data wins per
        // field, so a committed message overrides its preceding attempts.
        if (step.started_at !== null && facts.firstTokenAt !== undefined) {
          step.ttft_ms = Math.max(0, facts.firstTokenAt - step.started_at)
        }
        if (step.started_at !== null && facts.lastChunkAt !== undefined) {
          step.llm_ms = Math.max(0, facts.lastChunkAt - step.started_at)
        }
        if (facts.firstTokenAt !== undefined && facts.lastTokenAt !== undefined) {
          step.decode_ms = Math.max(0, facts.lastTokenAt - facts.firstTokenAt)
        }
        if (step.ttft_ms !== null || step.llm_ms !== null || step.decode_ms !== null) {
          step.timing_source = 'reconstructed'
        }
        // Exact live capture (M3): overrides reconstructed fields and emits
        // one attempt row per captured settlement so retries render orange.
        const capture = exactTiming(timings.get(event.seq))
        const stepKeyHere = stepKey(data.turn, data.step)
        const settleIndex = settlementsByStep.get(stepKeyHere) ?? 0
        settlementsByStep.set(stepKeyHere, settleIndex + 1)
        if (capture !== undefined) {
          if (capture.llmMs !== null) step.llm_ms = capture.llmMs
          if (capture.ttftMs !== null) step.ttft_ms = capture.ttftMs
          if (capture.decodeMs !== null) step.decode_ms = capture.decodeMs
          step.timing_source = 'exact'
          attempts.push({
            session_id: sessionId,
            turn: data.turn,
            step: data.step,
            attempt_index: settleIndex,
            kind: event.type === 'assistant/message' ? 'final' : 'attempt',
            started_at: capture.startedAt,
            ended_at: capture.startedAt !== null && capture.llmMs !== null
              ? capture.startedAt + capture.llmMs
              : time,
            llm_ms: capture.llmMs,
            ttft_ms: capture.ttftMs,
            decode_ms: capture.decodeMs,
            timing_source: 'exact',
          })
        }
        if (step.header_reason === null && pendingHeaderReason !== null) {
          step.header_reason = pendingHeaderReason
        }
        break
      }
      case 'tool/call': {
        if (!Number.isSafeInteger(data?.turn)
          || !Number.isSafeInteger(data?.step)
          || typeof data?.callId !== 'string'
          || data.callId === ''
          || time === null) {
          skippedEvents += 1
          break
        }
        ensureStep(data.turn, data.step)
        toolCountsByTurn.set(data.turn, (toolCountsByTurn.get(data.turn) ?? 0) + 1)
        if (tools.has(data.callId)) break // first call wins; duplicate ids never overwrite
        const row = newToolRow(sessionId, data.turn, data.step, data.callId)
        row.name = typeof data.name === 'string' && data.name !== '' ? data.name : null
        row.started_at = time
        row.args_summary = summarizeArguments(data.arguments)
        tools.set(data.callId, row)
        break
      }
      case 'tool/result': {
        const callId = data?.message?.toolCallId
        if (typeof callId !== 'string' || callId === '' || time === null) {
          skippedEvents += 1
          break
        }
        let row = tools.get(callId)
        if (row === undefined) {
          const turn = Number.isSafeInteger(data.turn) ? data.turn : null
          const step = Number.isSafeInteger(data.step) ? data.step : null
          row = newToolRow(sessionId, turn, step, callId)
          if (turn !== null) toolCountsByTurn.set(turn, (toolCountsByTurn.get(turn) ?? 0) + 1)
          tools.set(callId, row)
        }
        if (row.ended_at === null) row.ended_at = time
        if (row.started_at !== null && row.ended_at >= row.started_at) {
          row.ms = row.ended_at - row.started_at
        }
        row.is_error = data.message?.isError === true || data.error !== undefined ? 1 : 0
        row.error_code = typeof data.error?.code === 'string' ? data.error.code : null
        if (row.turn !== null && row.ms !== null) {
          const intervals = intervalsByTurn.get(row.turn)
          const interval = [row.started_at, row.ended_at]
          if (intervals === undefined) intervalsByTurn.set(row.turn, [interval])
          else intervals.push(interval)
        }
        break
      }
      default:
        // Every other event type (user/message, system/message, session/end-seed,
        // plugin extensions…) is irrelevant to M1 folding and simply ignored.
        break
    }
  }

  // Turn-level aggregation from the folded steps.
  const timingCountersByTurn = new Map()
  for (const step of steps.values()) {
    const turn = turns.get(step.turn)
    if (turn === undefined) continue
    turn.llm_ms = sumKnown(turn.llm_ms, step.llm_ms)
    for (const key of TOKEN_KEYS) turn[key] = sumKnown(turn[key], step[key])
    if (step.timing_source !== null) {
      const counter = timingCountersByTurn.get(step.turn) ?? { exact: 0, timed: 0 }
      counter.timed += 1
      if (step.timing_source === 'exact') counter.exact += 1
      timingCountersByTurn.set(step.turn, counter)
    }
  }
  for (const turn of turns.values()) {
    const counter = timingCountersByTurn.get(turn.turn)
    if (counter === undefined || counter.timed === 0) continue
    turn.timing_source = counter.exact === counter.timed
      ? 'exact'
      : counter.exact > 0 ? 'mixed' : 'reconstructed'
  }
  for (const turn of turns.values()) {
    const count = toolCountsByTurn.get(turn.turn) ?? 0
    const intervals = intervalsByTurn.get(turn.turn)
    if (count === 0) turn.tool_ms = 0
    else if (intervals === undefined) turn.tool_ms = null
    else turn.tool_ms = unionLength(intervals)
  }

  return {
    session: {
      session_id: sessionId,
      created_at: isSafeInt(header.createdAt) ? header.createdAt : null,
      workspace,
      parent_session: typeof header.parentSession === 'string' ? header.parentSession : null,
      is_seeded: header.isSeeded === true ? 1 : 0,
      inherited_event_count: inheritedEventCount,
    },
    inheritedSkipped: Math.min(events.length, inheritedEventCount),
    skippedEvents,
    turns: [...turns.values()].sort((a, b) => a.turn - b.turn),
    steps: [...steps.values()].sort((a, b) => a.turn - b.turn || a.step - b.step),
    toolCalls: [...tools.values()],
    attempts: attempts.sort((a, b) => a.turn - b.turn || a.step - b.step || a.attempt_index - b.attempt_index),
  }
}
