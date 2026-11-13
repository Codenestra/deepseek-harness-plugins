import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { aggregateRows, jsonSafeRow } from './usage.js'
import { CURRENCY, costSummary, withCost } from './pricing.js'

const TOKEN_COLUMNS = [
  'input_tokens',
  'output_tokens',
  'cache_read_tokens',
  'cache_write_tokens',
  'total_tokens',
  'reasoning_tokens',
]

const CALL_COLUMNS = [
  'call_key', 'source_kind', 'captured_at', 'session_id', 'workspace', 'provider', 'model', 'purpose',
  'turn', 'step', 'attempt_index', 'is_retry', 'event_seq', 'event_type', 'status', 'usage_state',
  ...TOKEN_COLUMNS, 'total_source',
]

// Non-empty values are intentional: an empty query parameter continues to
// mean "all", while these two values identify real sidebar buckets.
export const UNGROUPED_GROUP = '__ungrouped__'
export const NO_SESSION_GROUP = '__no_session__'

const EFFECTIVE_WORKSPACE_SQL = "COALESCE(NULLIF(u.workspace, ''), s.workspace)"

function now() {
  return Date.now()
}

function safeJson(value) {
  return JSON.stringify(value, null, 2)
}

function normalizedString(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function normalizedMillis(value) {
  if (value === undefined || value === null || value === '') return undefined
  const number = Number(value)
  return Number.isSafeInteger(number) && number >= 0 ? number : undefined
}

function normalizedTimeZone(value) {
  const timeZone = normalizedString(value)
  if (timeZone === undefined) return undefined
  try {
    // Intl performs the runtime's IANA validation. Keep the caller's spelling
    // in the public filters so URLs and exported metadata remain stable.
    new Intl.DateTimeFormat('en-US', { timeZone }).format(0)
    return timeZone
  } catch {
    throw new TypeError('timeZone must be a valid IANA time zone')
  }
}

function normalizedSessionState(value) {
  const sessionState = normalizedString(value)
  if (sessionState === undefined) return undefined
  if (sessionState !== 'active' && sessionState !== 'archived') {
    throw new TypeError("sessionState must be 'active' or 'archived'")
  }
  return sessionState
}

export function normalizeFilters(value = {}) {
  const from = normalizedMillis(value.from)
  const to = normalizedMillis(value.to)
  const workspace = normalizedString(value.workspace)
  const session = normalizedString(value.session)
  const provider = normalizedString(value.provider)
  const model = normalizedString(value.model)
  const group = normalizedString(value.group)
  const sessionState = normalizedSessionState(value.sessionState)
  const timeZone = normalizedTimeZone(value.timeZone)
  if (from !== undefined && to !== undefined && from > to) throw new TypeError('from must not be after to')
  return {
    ...(from === undefined ? {} : { from }),
    ...(to === undefined ? {} : { to }),
    ...(workspace === undefined ? {} : { workspace }),
    ...(session === undefined ? {} : { session }),
    ...(provider === undefined ? {} : { provider }),
    ...(model === undefined ? {} : { model }),
    ...(group === undefined ? {} : { group }),
    ...(sessionState === undefined ? {} : { sessionState }),
    ...(timeZone === undefined ? {} : { timeZone }),
  }
}

function whereFor(filters) {
  // The public ledger exposes only calls backed by usable provider token data.
  // This also hides missing/invalid rows written by older plugin versions.
  const clauses = [
    "u.usage_state IN ('complete', 'partial')",
    `(${TOKEN_COLUMNS.map(column => `u.${column} IS NOT NULL`).join(' OR ')})`,
  ]
  const parameters = []
  if (filters.from !== undefined) { clauses.push('u.captured_at >= ?'); parameters.push(filters.from) }
  if (filters.to !== undefined) { clauses.push('u.captured_at <= ?'); parameters.push(filters.to) }
  if (filters.workspace !== undefined) { clauses.push(`${EFFECTIVE_WORKSPACE_SQL} = ?`); parameters.push(filters.workspace) }
  if (filters.session !== undefined) { clauses.push('u.session_id = ?'); parameters.push(filters.session) }
  if (filters.provider !== undefined) { clauses.push('u.provider = ?'); parameters.push(filters.provider) }
  if (filters.model !== undefined) { clauses.push('u.model = ?'); parameters.push(filters.model) }
  return {
    sql: `WHERE ${clauses.join(' AND ')}`,
    parameters,
  }
}

function isRecordableUsage(row) {
  if (row?.usage_state !== 'complete' && row?.usage_state !== 'partial') return false
  return TOKEN_COLUMNS.some(column => Number.isSafeInteger(row[column]) && row[column] >= 0)
}

function group(rows, keyOf) {
  const grouped = new Map()
  for (const row of rows) {
    const key = keyOf(row)
    const bucket = grouped.get(key)
    if (bucket === undefined) grouped.set(key, [row])
    else bucket.push(row)
  }
  return grouped
}

function compactAggregate(rows, pricing) {
  const aggregate = aggregateRows(rows)
  return {
    calls: aggregate.calls,
    retryCalls: aggregate.retryCalls,
    statuses: aggregate.statuses,
    tokens: Object.fromEntries(TOKEN_COLUMNS.map(field => [field, aggregate.tokens[field]])),
    cache: aggregate.cache,
    timing: aggregate.timing,
    cost: costSummary(rows, pricing),
    invalidUsageCalls: aggregate.invalidUsageCalls,
    missingUsageCalls: aggregate.missingUsageCalls,
  }
}

function dimensionSeries(rows, keyOf, pricing) {
  return [...group(rows, keyOf)].map(([key, members]) => ({ key, ...compactAggregate(members, pricing) }))
    .toSorted((a, b) => b.calls - a.calls || a.key.localeCompare(b.key))
}

function distinct(rows, field) {
  return [...new Set(rows.map(row => row[field]).filter(value => typeof value === 'string' && value.length > 0))]
    .toSorted((a, b) => a.localeCompare(b))
}

function normalizeGrouping(value = {}) {
  const seenWorkspaceIds = new Set()
  const workspaces = []
  for (const workspace of Array.isArray(value?.workspaces) ? value.workspaces : []) {
    const id = normalizedString(workspace?.id)
    if (id === undefined || seenWorkspaceIds.has(id)) continue
    seenWorkspaceIds.add(id)
    workspaces.push({
      id,
      title: typeof workspace.title === 'string' ? workspace.title : id,
      path: typeof workspace.path === 'string' ? workspace.path : null,
      sessionIds: [...new Set((Array.isArray(workspace.sessionIds) ? workspace.sessionIds : [])
        .map(normalizedString).filter(sessionId => sessionId !== undefined))],
    })
  }
  return {
    workspaces,
    archivedSessionIds: [...new Set((Array.isArray(value?.archivedSessionIds) ? value.archivedSessionIds : [])
      .map(normalizedString).filter(sessionId => sessionId !== undefined))],
  }
}

function groupingIndex(grouping) {
  const normalized = normalizeGrouping(grouping)
  const sessionWorkspaceIds = new Map()
  for (const workspace of normalized.workspaces) {
    for (const sessionId of workspace.sessionIds) {
      const owners = sessionWorkspaceIds.get(sessionId)
      if (owners === undefined) sessionWorkspaceIds.set(sessionId, new Set([workspace.id]))
      else owners.add(workspace.id)
    }
  }
  return {
    ...normalized,
    sessionWorkspaceIds,
    archivedSessionIdsSet: new Set(normalized.archivedSessionIds),
  }
}

function rowSessionId(row) {
  return normalizedString(row.session_id)
}

function matchesGrouping(row, filters, grouping) {
  const sessionId = rowSessionId(row)
  if (filters.group === NO_SESSION_GROUP) {
    if (sessionId !== undefined) return false
  } else if (filters.group === UNGROUPED_GROUP) {
    if (sessionId === undefined || grouping.sessionWorkspaceIds.has(sessionId)) return false
  } else if (filters.group !== undefined) {
    if (sessionId === undefined || !grouping.sessionWorkspaceIds.get(sessionId)?.has(filters.group)) return false
  }

  if (filters.sessionState === 'active') {
    return sessionId !== undefined && !grouping.archivedSessionIdsSet.has(sessionId)
  }
  if (filters.sessionState === 'archived') {
    return sessionId !== undefined && grouping.archivedSessionIdsSet.has(sessionId)
  }
  return true
}

function availableGroupOptions(rows, grouping) {
  const sessionIds = new Set(rows.map(rowSessionId).filter(sessionId => sessionId !== undefined))
  const options = grouping.workspaces
    .filter(workspace => workspace.sessionIds.some(sessionId => sessionIds.has(sessionId)))
    .map(workspace => ({ value: workspace.id, label: workspace.title, kind: 'workspace' }))
  if (rows.some((row) => {
    const sessionId = rowSessionId(row)
    return sessionId !== undefined && !grouping.sessionWorkspaceIds.has(sessionId)
  })) {
    options.push({ value: UNGROUPED_GROUP, label: 'Ungrouped', kind: 'ungrouped' })
  }
  if (rows.some(row => rowSessionId(row) === undefined)) {
    options.push({ value: NO_SESSION_GROUP, label: 'No session', kind: 'no-session' })
  }
  return options
}

function dateBucketer(timeZone) {
  if (timeZone === undefined) return capturedAt => new Date(capturedAt).toISOString().slice(0, 10)
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return (capturedAt) => {
    const parts = formatter.formatToParts(new Date(capturedAt))
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
    return `${values.year}-${values.month}-${values.day}`
  }
}

/** Weekday/hour bucket for the activity heat map, in the filter's time zone. */
function heatBucketter(timeZone) {
  if (timeZone === undefined) {
    return (capturedAt) => {
      const date = new Date(capturedAt)
      return { weekday: date.getUTCDay(), hour: date.getUTCHours() }
    }
  }
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    hour12: false,
  })
  const weekdays = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return (capturedAt) => {
    const parts = formatter.formatToParts(new Date(capturedAt))
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
    return { weekday: weekdays[values.weekday] ?? 0, hour: Number(values.hour) % 24 }
  }
}

/** Weekday × hour activity buckets; only hours that carry calls are returned. */
function heatRows(rows, timeZone) {
  const bucketOf = heatBucketter(timeZone)
  const buckets = new Map()
  for (const row of rows) {
    const { weekday, hour } = bucketOf(row.captured_at)
    const key = `${weekday}:${hour}`
    const bucket = buckets.get(key)
    const tokens = row.total_tokens ?? 0
    if (bucket === undefined) buckets.set(key, { weekday, hour, calls: 1, tokens, cost: row.cost_rmb ?? 0 })
    else {
      bucket.calls += 1
      bucket.tokens += tokens
      bucket.cost += row.cost_rmb ?? 0
    }
  }
  return [...buckets.values()].toSorted((a, b) => a.weekday - b.weekday || a.hour - b.hour)
}

/** Columns the detail table may sort by; anything else falls back to captured_at. */
const SORTABLE_DETAIL_COLUMNS = new Set([
  'captured_at', 'total_tokens', 'input_tokens', 'output_tokens', 'cache_read_tokens', 'cache_write_tokens',
  'cost_rmb', 'llm_ms', 'ttft_ms', 'decode_tokens_per_second', 'model', 'provider', 'status', 'session_id',
])

/** Sort detail rows, pushing unknown values last in either direction. */
function sortRows(rows, sort, dir) {
  const sign = dir === 'asc' ? 1 : -1
  const numeric = sort !== 'model' && sort !== 'provider' && sort !== 'status' && sort !== 'session_id'
  return [...rows].toSorted((left, right) => {
    const a = left[sort]
    const b = right[sort]
    const aKnown = a !== null && a !== undefined
    const bKnown = b !== null && b !== undefined
    if (!aKnown && !bKnown) return (right.captured_at - left.captured_at) || 0
    if (!aKnown) return 1
    if (!bKnown) return -1
    if (numeric) return (a - b) * sign
    return String(a).localeCompare(String(b)) * sign
  })
}

/** Case-insensitive substring match across the columns an operator searches. */
function searchRows(rows, term) {
  if (term === '') return rows
  const needle = term.toLowerCase()
  return rows.filter(row => [row.session_id, row.model, row.provider, row.workspace, row.purpose]
    .some(value => typeof value === 'string' && value.toLowerCase().includes(needle)))
}

/** Validate the detail-window request; limits stay bounded so one query cannot stream the whole ledger. */
function normalizeDetail(value = {}) {
  const offsetInput = Number(value.offset)
  const limitInput = Number(value.limit)
  const sort = typeof value.sort === 'string' && SORTABLE_DETAIL_COLUMNS.has(value.sort) ? value.sort : 'captured_at'
  return {
    offset: Number.isSafeInteger(offsetInput) && offsetInput >= 0 ? offsetInput : 0,
    limit: Number.isSafeInteger(limitInput) && limitInput > 0 ? Math.min(limitInput, 200) : 30,
    sort,
    dir: value.dir === 'asc' ? 'asc' : 'desc',
    search: typeof value.search === 'string' ? value.search.trim().slice(0, 120) : '',
  }
}

/** Stable token over the payload's data identity, used for conditional responses. */
function stateToken(rows, installedAt, detail) {
  const newest = rows.length === 0 ? 0 : rows[0].captured_at
  return `${rows.length}:${newest}:${installedAt}:${detail.sort}:${detail.dir}:${detail.search}`
}

function csvCell(value) {
  if (value === null || value === undefined) return ''
  let text = String(value)
  if (/^[=+\-@]/u.test(text)) text = `'${text}`
  return /[",\r\n]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export class UsageLedger {
  constructor(filename) {
    mkdirSync(dirname(filename), { recursive: true })
    this.filename = filename
    this.db = new DatabaseSync(filename)
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;')
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      ) STRICT;
      CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL,
        workspace TEXT,
        parent_session TEXT,
        is_seeded INTEGER NOT NULL CHECK (is_seeded IN (0, 1)),
        inherited_event_count INTEGER NOT NULL CHECK (inherited_event_count >= 0),
        observed_at INTEGER NOT NULL
      ) STRICT;
      CREATE TABLE IF NOT EXISTS usage_calls (
        call_key TEXT PRIMARY KEY,
        source_kind TEXT NOT NULL,
        captured_at INTEGER NOT NULL,
        session_id TEXT,
        workspace TEXT,
        provider TEXT,
        model TEXT,
        purpose TEXT NOT NULL,
        turn INTEGER,
        step INTEGER,
        attempt_index INTEGER,
        is_retry INTEGER CHECK (is_retry IS NULL OR is_retry IN (0, 1)),
        event_seq INTEGER,
        event_type TEXT,
        status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'cancelled', 'unknown')),
        usage_state TEXT NOT NULL CHECK (usage_state IN ('complete', 'partial', 'missing', 'invalid')),
        input_tokens INTEGER,
        output_tokens INTEGER,
        cache_read_tokens INTEGER,
        cache_write_tokens INTEGER,
        total_tokens INTEGER,
        reasoning_tokens INTEGER,
        total_source TEXT CHECK (total_source IS NULL OR total_source IN ('provider', 'derived')),
        CHECK (input_tokens IS NULL OR input_tokens >= 0),
        CHECK (output_tokens IS NULL OR output_tokens >= 0),
        CHECK (cache_read_tokens IS NULL OR cache_read_tokens >= 0),
        CHECK (cache_write_tokens IS NULL OR cache_write_tokens >= 0),
        CHECK (total_tokens IS NULL OR total_tokens >= 0),
        CHECK (reasoning_tokens IS NULL OR reasoning_tokens >= 0)
      ) STRICT;
      CREATE TABLE IF NOT EXISTS usage_timings (
        call_key TEXT PRIMARY KEY REFERENCES usage_calls(call_key) ON DELETE CASCADE,
        started_at INTEGER NOT NULL,
        llm_ms REAL NOT NULL CHECK (llm_ms >= 0),
        ttft_ms REAL CHECK (ttft_ms IS NULL OR ttft_ms >= 0),
        decode_ms REAL CHECK (decode_ms IS NULL OR decode_ms >= 0),
        decode_tokens_per_second REAL CHECK (decode_tokens_per_second IS NULL OR decode_tokens_per_second >= 0)
      ) STRICT;
      CREATE INDEX IF NOT EXISTS usage_calls_captured_idx ON usage_calls(captured_at);
      CREATE INDEX IF NOT EXISTS usage_calls_session_idx ON usage_calls(session_id, captured_at);
      CREATE INDEX IF NOT EXISTS usage_calls_route_idx ON usage_calls(provider, model, captured_at);
      CREATE INDEX IF NOT EXISTS usage_calls_workspace_idx ON usage_calls(workspace, captured_at);
    `)
    const installedAt = String(now())
    this.db.prepare('INSERT OR IGNORE INTO meta(key, value) VALUES (?, ?)').run('installed_at', installedAt)
    this.db.prepare('INSERT OR REPLACE INTO meta(key, value) VALUES (?, ?)').run('schema_version', '1')
    this.installedAt = Number(this.db.prepare('SELECT value FROM meta WHERE key = ?').get('installed_at').value)
    this.insertCall = this.db.prepare(`
      INSERT INTO usage_calls (${CALL_COLUMNS.join(', ')})
      VALUES (${CALL_COLUMNS.map(() => '?').join(', ')})
      ON CONFLICT(call_key) DO UPDATE SET
        ${CALL_COLUMNS.filter(column => column !== 'call_key')
    .map(column => `${column} = excluded.${column}`).join(',\n        ')}
      WHERE usage_calls.usage_state IN ('missing', 'invalid')
        AND excluded.usage_state IN ('complete', 'partial')
    `)
    this.insertTiming = this.db.prepare(`
      INSERT OR IGNORE INTO usage_timings
        (call_key, started_at, llm_ms, ttft_ms, decode_ms, decode_tokens_per_second)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    this.upsertSession = this.db.prepare(`
      INSERT INTO sessions
        (session_id, created_at, workspace, parent_session, is_seeded, inherited_event_count, observed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET
        created_at = excluded.created_at,
        workspace = excluded.workspace,
        parent_session = excluded.parent_session,
        is_seeded = excluded.is_seeded,
        inherited_event_count = excluded.inherited_event_count,
        observed_at = excluded.observed_at
    `)
  }

  close() {
    this.db.close()
  }

  recordSession(session) {
    this.upsertSession.run(
      session.session_id,
      session.created_at,
      session.workspace,
      session.parent_session,
      session.is_seeded,
      session.inherited_event_count,
      now(),
    )
  }

  recordCall(row) {
    // Providers are allowed to omit usage. Those calls are deliberately not
    // persisted: no estimates, synthetic zeroes, or broken rows reach users.
    if (!isRecordableUsage(row)) return false
    this.db.exec('BEGIN IMMEDIATE')
    try {
      const result = this.insertCall.run(...CALL_COLUMNS.map(column => row[column] ?? null))
      if (row.timing_exact === 1) {
        this.insertTiming.run(
          row.call_key,
          row.started_at,
          row.llm_ms,
          row.ttft_ms,
          row.decode_ms,
          row.decode_tokens_per_second,
        )
      }
      this.db.exec('COMMIT')
      return Number(result.changes) > 0
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
  }

  recordScan(scan) {
    this.recordSession(scan.session)
    let inserted = 0
    for (const row of scan.rows) if (this.recordCall(row)) inserted += 1
    return inserted
  }

  rows(filters = {}, grouping = {}, pricing = {}) {
    const normalized = normalizeFilters(filters)
    return this.filteredRows(normalized, groupingIndex(grouping)).map(row => withCost(row, pricing))
  }

  filteredRows(normalized, grouping) {
    const where = whereFor(normalized)
    const selectedCalls = CALL_COLUMNS.map(column => column === 'workspace'
      ? `${EFFECTIVE_WORKSPACE_SQL} AS workspace`
      : `u.${column}`).join(',\n        ')
    const rows = this.db.prepare(`
      SELECT ${selectedCalls},
        CASE WHEN t.call_key IS NULL THEN 0 ELSE 1 END AS timing_exact,
        t.started_at, t.llm_ms, t.ttft_ms, t.decode_ms, t.decode_tokens_per_second
      FROM usage_calls u
      LEFT JOIN sessions s ON s.session_id = u.session_id
      LEFT JOIN usage_timings t ON t.call_key = u.call_key
      ${where.sql}
      ORDER BY u.captured_at DESC, u.call_key DESC
    `).all(...where.parameters).map(jsonSafeRow)
    return rows.filter(row => matchesGrouping(row, normalized, grouping))
  }

  /**
   * Build one dashboard response.
   * @param filters - validated query filters.
   * @param scan - backfill/live-capture status block.
   * @param grouping - sidebar workspace grouping snapshot.
   * @param view - `{ pricing, budget, detail }`: operator price overrides, budget thresholds, and the detail-table window.
   * @returns summary, daily, heat map, dimensions, one detail page, and a stable data token.
   */
  dashboard(filters = {}, scan = {}, grouping = {}, view = {}) {
    const normalized = normalizeFilters(filters)
    const index = groupingIndex(grouping)
    const pricing = view.pricing ?? {}
    const detail = normalizeDetail(view.detail)
    const rows = this.filteredRows(normalized, index).map(row => withCost(row, pricing))
    const allRows = this.filteredRows({}, index).map(row => withCost(row, pricing))
    const dateBucket = dateBucketer(normalized.timeZone)
    const daily = [...group(rows, row => dateBucket(row.captured_at))]
      .map(([date, members]) => ({ date, ...compactAggregate(members, pricing) }))
      .toSorted((a, b) => a.date.localeCompare(b.date))
    // The equal-length window immediately before this one, bucketed onto the
    // same dates by shifting each capture forward by the window span. That keeps
    // the comparison series indexable by date instead of by position.
    const span = normalized.from === undefined ? 0 : (normalized.to ?? now()) - normalized.from
    const previous = span <= 0 ? null : (() => {
      const previousRows = this.filteredRows(
        { ...normalized, from: normalized.from - span - 1, to: normalized.from - 1 },
        index,
      ).map(row => withCost(row, pricing))
      return {
        calls: previousRows.length,
        daily: [...group(previousRows, row => dateBucket(row.captured_at + span + 1))]
          .map(([date, members]) => ({ date, ...compactAggregate(members, pricing) }))
          .toSorted((a, b) => a.date.localeCompare(b.date)),
      }
    })()
    const matched = searchRows(rows, detail.search)
    const sorted = sortRows(matched, detail.sort, detail.dir)
    return {
      schemaVersion: 2,
      generatedAt: now(),
      installedAt: this.installedAt,
      filters: normalized,
      filterOptions: {
        workspaces: distinct(allRows, 'workspace'),
        groups: availableGroupOptions(allRows, index),
        sessions: distinct(allRows, 'session_id'),
        providers: distinct(allRows, 'provider'),
        models: distinct(allRows, 'model'),
      },
      scan,
      summary: compactAggregate(rows, pricing),
      daily,
      previous,
      heatmap: heatRows(rows, normalized.timeZone),
      byProvider: dimensionSeries(rows, row => row.provider ?? 'unknown', pricing),
      byModel: dimensionSeries(rows, row => `${row.provider ?? 'unknown'} / ${row.model ?? 'unknown'}`, pricing),
      details: sorted.slice(detail.offset, detail.offset + detail.limit),
      detail: { ...detail, total: sorted.length, filtered: rows.length },
      budget: view.budget ?? null,
      pricing: { currency: CURRENCY, overrides: Object.keys(pricing).length },
      etag: stateToken(rows, this.installedAt, detail),
    }
  }

  exportJson(filters = {}, scan = {}, grouping = {}, pricing = {}) {
    const normalized = normalizeFilters(filters)
    const rows = this.filteredRows(normalized, groupingIndex(grouping)).map(row => withCost(row, pricing))
    return safeJson({
      format: 'dsh-usage-center/v2',
      generatedAt: now(),
      installedAt: this.installedAt,
      filters: normalized,
      pricing: { currency: CURRENCY },
      scan,
      summary: compactAggregate(rows, pricing),
      calls: rows,
    })
  }

  exportCsv(filters = {}, grouping = {}, pricing = {}) {
    const normalized = normalizeFilters(filters)
    const rows = this.filteredRows(normalized, groupingIndex(grouping)).map(row => withCost(row, pricing))
    const columns = [
      'captured_at', 'session_id', 'workspace', 'provider', 'model', 'purpose', 'turn', 'step',
      'attempt_index', 'is_retry', 'status', 'usage_state', ...TOKEN_COLUMNS, 'total_source',
      'timing_exact', 'llm_ms', 'ttft_ms', 'decode_ms', 'decode_tokens_per_second',
      'cost_rmb', 'cost_complete', 'call_key',
    ]
    const lines = [columns.join(',')]
    for (const row of rows) lines.push(columns.map(column => csvCell(row[column])).join(','))
    return `\uFEFF${lines.join('\r\n')}\r\n`
  }
}
