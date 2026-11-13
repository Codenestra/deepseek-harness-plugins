/** Pure, fail-closed usage and timing helpers. */

const TOKEN_FIELDS = Object.freeze([
  'input_tokens',
  'output_tokens',
  'cache_read_tokens',
  'cache_write_tokens',
  'total_tokens',
  'reasoning_tokens',
])

export function isSafeCount(value) {
  return Number.isSafeInteger(value) && value >= 0
}

function safeAdd(values) {
  let total = 0
  for (const value of values) {
    total += value
    if (!Number.isSafeInteger(total)) return undefined
  }
  return total
}

/**
 * Validate one provider TokenUsage sample without manufacturing absent fields.
 * A contradictory sample is rejected as a whole. A missing total remains
 * unknown unless both cache buckets make it exactly derivable.
 */
export function normalizeUsage(value) {
  const empty = {
    usage_state: 'missing',
    input_tokens: null,
    output_tokens: null,
    cache_read_tokens: null,
    cache_write_tokens: null,
    total_tokens: null,
    reasoning_tokens: null,
    total_source: null,
  }
  if (value === undefined || value === null) return empty
  if (typeof value !== 'object' || Array.isArray(value)) {
    return { ...empty, usage_state: 'invalid' }
  }

  const input = value.inputTokens
  const output = value.outputTokens
  const cacheRead = value.cacheReadTokens
  const cacheWrite = value.cacheWriteTokens
  const reasoning = value.reasoningTokens
  const reportedTotal = value.totalTokens
  if (!isSafeCount(input) || !isSafeCount(output)) return { ...empty, usage_state: 'invalid' }
  if (cacheRead !== undefined && !isSafeCount(cacheRead)) return { ...empty, usage_state: 'invalid' }
  if (cacheWrite !== undefined && !isSafeCount(cacheWrite)) return { ...empty, usage_state: 'invalid' }
  if (reasoning !== undefined && (!isSafeCount(reasoning) || reasoning > output)) {
    return { ...empty, usage_state: 'invalid' }
  }

  const knownPrompt = safeAdd([
    input,
    ...(cacheRead === undefined ? [] : [cacheRead]),
    ...(cacheWrite === undefined ? [] : [cacheWrite]),
  ])
  if (knownPrompt === undefined) return { ...empty, usage_state: 'invalid' }

  let total = null
  let totalSource = null
  if (reportedTotal !== undefined) {
    if (!isSafeCount(reportedTotal)) return { ...empty, usage_state: 'invalid' }
    const exactPrompt = reportedTotal - output
    if (!isSafeCount(exactPrompt) || exactPrompt < knownPrompt) {
      return { ...empty, usage_state: 'invalid' }
    }
    if (cacheRead !== undefined && cacheWrite !== undefined && exactPrompt !== knownPrompt) {
      return { ...empty, usage_state: 'invalid' }
    }
    total = reportedTotal
    totalSource = 'provider'
  } else if (cacheRead !== undefined && cacheWrite !== undefined) {
    const derived = safeAdd([knownPrompt, output])
    if (derived === undefined) return { ...empty, usage_state: 'invalid' }
    total = derived
    totalSource = 'derived'
  }

  const complete = cacheRead !== undefined && cacheWrite !== undefined && total !== null
  return {
    usage_state: complete ? 'complete' : 'partial',
    input_tokens: input,
    output_tokens: output,
    cache_read_tokens: cacheRead ?? null,
    cache_write_tokens: cacheWrite ?? null,
    total_tokens: total,
    reasoning_tokens: reasoning ?? null,
    total_source: totalSource,
  }
}

function recordMemberTime(record, values, predicate) {
  let time = record.time0
  if (!Number.isSafeInteger(time) || !Array.isArray(record.dt)) return undefined
  for (let index = 0; index < values.length; index += 1) {
    if (index > 0) {
      const delta = record.dt[index - 1]
      if (!Number.isSafeInteger(delta) || !Number.isSafeInteger(time + delta)) return undefined
      time += delta
    }
    if (predicate(values[index])) return time
  }
  return undefined
}

function rawChunkIsToken(chunk) {
  if (chunk?.type === 'text-delta' || chunk?.type === 'reasoning-delta') return chunk.text !== ''
  if (chunk?.type === 'tool-call-delta') return chunk.argumentsDelta !== '' || chunk.name !== undefined
  return false
}

/** Read last-wins usage, terminal reason and first-token timestamp from a compact durable stream. */
export function streamFacts(stream) {
  let usage
  let finishReason
  let firstTokenAt
  if (!Array.isArray(stream)) return { usage, finishReason, firstTokenAt }
  for (const record of stream) {
    if (record === null || typeof record !== 'object') continue
    if (firstTokenAt === undefined) {
      if (record.type === 'text-chunks' || record.type === 'reasoning-chunks') {
        if (Array.isArray(record.texts)) {
          firstTokenAt = recordMemberTime(record, record.texts, value => typeof value === 'string' && value !== '')
        }
      } else if (record.type === 'tool-call-chunks') {
        if (record.name !== undefined && Number.isSafeInteger(record.time0)) firstTokenAt = record.time0
        else if (Array.isArray(record.args)) {
          firstTokenAt = recordMemberTime(record, record.args, value => typeof value === 'string' && value !== '')
        }
      } else if (record.type === 'chunk' && rawChunkIsToken(record.chunk) && Number.isSafeInteger(record.time)) {
        firstTokenAt = record.time
      }
    }
    if (record.type !== 'chunk' || record.chunk === null || typeof record.chunk !== 'object') continue
    if (record.chunk.type === 'usage') usage = record.chunk.usage
    if (record.chunk.type === 'finish') finishReason = record.chunk.reason
  }
  return { usage, finishReason, firstTokenAt }
}

/** A status is disclosed only when a durable marker proves it. */
export function settlementStatus(event, finishReason) {
  if (event?.type === 'assistant/message' && event.data?.interrupted === true) return 'cancelled'
  const kind = finishReason?.kind
  if (kind === 'error') return 'failed'
  if (kind === 'aborted') return 'cancelled'
  if (event?.type === 'assistant/message') return 'succeeded'
  return 'unknown'
}

export function percentile(values, probability) {
  if (!Array.isArray(values) || values.length === 0) return null
  const sorted = values.filter(Number.isFinite).toSorted((a, b) => a - b)
  if (sorted.length === 0) return null
  if (sorted.length === 1) return sorted[0]
  const rank = Math.min(1, Math.max(0, probability)) * (sorted.length - 1)
  const lower = Math.floor(rank)
  const upper = Math.ceil(rank)
  if (lower === upper) return sorted[lower]
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (rank - lower)
}

function knownField(rows, field) {
  const values = rows.map(row => row[field]).filter(value => typeof value === 'number' && Number.isFinite(value))
  const sum = safeAdd(values)
  return {
    knownCalls: values.length,
    unknownCalls: rows.length - values.length,
    coverage: rows.length === 0 ? null : values.length / rows.length,
    knownSum: sum ?? null,
    exactSum: rows.length > 0 && values.length === rows.length ? sum ?? null : null,
  }
}

function durationSummary(rows, field, denominator = rows.length) {
  const values = rows.map(row => row[field]).filter(value => typeof value === 'number' && Number.isFinite(value) && value >= 0)
  const complete = denominator > 0 && values.length === denominator
  const sum = values.reduce((total, value) => total + value, 0)
  return {
    knownCalls: values.length,
    unknownCalls: Math.max(0, denominator - values.length),
    coverage: denominator === 0 ? null : values.length / denominator,
    total: complete ? sum : null,
    average: complete ? sum / values.length : null,
    p50: complete ? percentile(values, 0.5) : null,
    p95: complete ? percentile(values, 0.95) : null,
  }
}

/** Aggregate call rows while keeping every unknown explicit. */
export function aggregateRows(rows) {
  const calls = rows.length
  const fields = Object.fromEntries(TOKEN_FIELDS.map(field => [field, knownField(rows, field)]))
  const retryCalls = rows.filter(row => row.is_retry === 1 || row.is_retry === true).length
  const statuses = { succeeded: 0, failed: 0, cancelled: 0, unknown: 0 }
  for (const row of rows) {
    const status = Object.hasOwn(statuses, row.status) ? row.status : 'unknown'
    statuses[status] += 1
  }

  const cacheEligible = rows.filter(row =>
    typeof row.input_tokens === 'number'
    && typeof row.cache_read_tokens === 'number'
    && typeof row.cache_write_tokens === 'number')
  const cacheDenominator = cacheEligible.reduce(
    (sum, row) => sum + row.input_tokens + row.cache_read_tokens + row.cache_write_tokens,
    0,
  )
  const cacheRead = cacheEligible.reduce((sum, row) => sum + row.cache_read_tokens, 0)
  const cacheComplete = calls > 0 && cacheEligible.length === calls
  const readKnown = rows.filter(row => typeof row.cache_read_tokens === 'number')
  const requestHitComplete = calls > 0 && readKnown.length === calls

  const speedEligible = rows.filter(row => typeof row.output_tokens === 'number' && row.output_tokens > 0)
  return {
    calls,
    retryCalls,
    statuses,
    tokens: fields,
    cache: {
      formula: 'cacheRead / (uncachedInput + cacheRead + cacheWrite)',
      tokenHitRate: cacheComplete && cacheDenominator > 0 ? cacheRead / cacheDenominator : null,
      requestHitRate: requestHitComplete
        ? readKnown.filter(row => row.cache_read_tokens > 0).length / calls
        : null,
      knownCalls: cacheEligible.length,
      unknownCalls: calls - cacheEligible.length,
      requestHitKnownCalls: readKnown.length,
      requestHitUnknownCalls: calls - readKnown.length,
    },
    timing: {
      llmMs: durationSummary(rows, 'llm_ms'),
      ttftMs: durationSummary(rows, 'ttft_ms'),
      decodeTokensPerSecond: durationSummary(speedEligible, 'decode_tokens_per_second', speedEligible.length),
    },
    invalidUsageCalls: rows.filter(row => row.usage_state === 'invalid').length,
    missingUsageCalls: rows.filter(row => row.usage_state === 'missing').length,
  }
}

export function jsonSafeRow(row) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value === undefined ? null : value]))
}
