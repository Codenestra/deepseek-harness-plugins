import { normalizeUsage, settlementStatus, streamFacts } from './usage.js'

function routeFromMessage(event, fallback) {
  const source = event?.data?.message?.source
  if (typeof source?.provider === 'string' && source.provider.length > 0
    && typeof source?.model === 'string' && source.model.length > 0) {
    return { provider: source.provider, model: source.model }
  }
  return fallback
}

function normalizedRoute(value) {
  if (typeof value?.provider !== 'string' || value.provider.length === 0) return undefined
  if (typeof value?.model !== 'string' || value.model.length === 0) return undefined
  return { provider: value.provider, model: value.model }
}

function stepKey(turn, step) {
  return `${turn}:${step}`
}

function timingColumns(timing, usage) {
  if (timing === undefined) {
    return {
      timing_exact: 0,
      started_at: null,
      llm_ms: null,
      ttft_ms: null,
      decode_ms: null,
      decode_tokens_per_second: null,
    }
  }
  const decodeSpeed = typeof usage.output_tokens === 'number'
    && usage.output_tokens > 0
    && typeof timing.decodeMs === 'number'
    && timing.decodeMs > 0
    ? usage.output_tokens / (timing.decodeMs / 1000)
    : null
  return {
    timing_exact: 1,
    started_at: timing.startedAt,
    llm_ms: timing.llmMs,
    ttft_ms: timing.ttftMs,
    decode_ms: timing.decodeMs,
    decode_tokens_per_second: decodeSpeed,
  }
}

/**
 * Fold a complete logical session snapshot into one immutable row per actual
 * durable Assistant settlement. The inherited fork prefix is never scanned.
 */
export function scanSessionSnapshot(snapshot, timingBySeq = new Map()) {
  const header = snapshot?.session ?? snapshot?.header
  const events = Array.isArray(snapshot?.events) ? snapshot.events : []
  if (typeof header?.id !== 'string') throw new TypeError('session snapshot is missing its id')
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

  let route
  const attempts = new Map()
  const rows = []
  for (const event of events.slice(inheritedEventCount)) {
    if (event?.type === 'request/header') {
      route = normalizedRoute(event.data?.header?.config)
      continue
    }
    if (event?.type === 'request/context') {
      route = normalizedRoute(event.data) ?? route
      continue
    }
    if (event?.type === 'step/start') {
      attempts.set(stepKey(event.data?.turn, event.data?.step), 0)
      continue
    }
    if (event?.type === 'llm/retry-started') {
      const retry = event.data?.retry
      attempts.set(
        stepKey(event.data?.turn, event.data?.step),
        Number.isSafeInteger(retry) && retry >= 1 ? retry : null,
      )
      continue
    }
    if (event?.type !== 'assistant/message' && event?.type !== 'assistant/attempt') continue
    if (!Number.isSafeInteger(event.seq) || !Number.isSafeInteger(event.time)) continue

    const facts = streamFacts(event.data?.stream)
    const sample = event.type === 'assistant/message' && event.data?.usage !== undefined
      ? event.data.usage
      : facts.usage
    const usage = normalizeUsage(sample)
    const exactRoute = event.type === 'assistant/message' ? routeFromMessage(event, route) : route
    const attemptIndex = attempts.get(stepKey(event.data?.turn, event.data?.step))
    const timing = timingBySeq.get(event.seq)
    rows.push({
      call_key: `session:${header.id}:${event.seq}`,
      source_kind: 'session',
      captured_at: event.time,
      session_id: header.id,
      workspace: typeof header.cwd === 'string' ? header.cwd : null,
      provider: exactRoute?.provider ?? null,
      model: exactRoute?.model ?? null,
      purpose: 'agent',
      turn: Number.isSafeInteger(event.data?.turn) ? event.data.turn : null,
      step: Number.isSafeInteger(event.data?.step) ? event.data.step : null,
      attempt_index: Number.isSafeInteger(attemptIndex) ? attemptIndex : null,
      is_retry: Number.isSafeInteger(attemptIndex) ? Number(attemptIndex > 0) : null,
      event_seq: event.seq,
      event_type: event.type,
      status: settlementStatus(event, facts.finishReason),
      ...usage,
      ...timingColumns(timing, usage),
    })
  }
  return {
    session: {
      session_id: header.id,
      created_at: Number.isSafeInteger(header.createdAt) ? header.createdAt : 0,
      workspace: typeof header.cwd === 'string' ? header.cwd : null,
      parent_session: typeof header.parentSession === 'string' ? header.parentSession : null,
      is_seeded: header.isSeeded === true ? 1 : 0,
      inherited_event_count: inheritedEventCount,
    },
    inheritedSkipped: Math.min(events.length, inheritedEventCount),
    rows,
  }
}

function captureStatus(finishReason, threw) {
  if (threw) return 'failed'
  if (finishReason?.kind === 'error') return 'failed'
  if (finishReason?.kind === 'aborted') return 'cancelled'
  return finishReason === undefined ? 'unknown' : 'succeeded'
}

/** Build a row for an exact live non-Agent stream that has no durable settlement event. */
export function auxiliaryCaptureRow(capture) {
  const usage = normalizeUsage(capture.usage)
  return {
    call_key: capture.callKey,
    source_kind: 'live-stream',
    captured_at: capture.endedAt,
    session_id: capture.sessionId ?? null,
    workspace: null,
    provider: capture.provider ?? null,
    model: capture.model ?? null,
    purpose: capture.purpose ?? 'one-shot',
    turn: null,
    step: null,
    attempt_index: 0,
    is_retry: 0,
    event_seq: null,
    event_type: null,
    status: captureStatus(capture.finishReason, capture.threw === true),
    ...usage,
    ...timingColumns(capture, usage),
  }
}
