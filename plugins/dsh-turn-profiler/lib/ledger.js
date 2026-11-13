/**
 * SQLite persistence for the turn profiler (node:sqlite, zero dependencies).
 * Stores derived metrics only — never raw events or message text. Tool-call
 * arguments are kept as a truncated summary (args_summary) for waterfall
 * hover tooltips.
 *
 * Upserts are idempotent so backfill rescans never double-count, and rows
 * carrying exact live timing are never downgraded by a reconstructed rescan.
 */

import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const TURN_COLUMNS = [
  'session_id', 'turn', 'workspace', 'started_at', 'ended_at', 'wall_ms', 'reason',
  'provider', 'model', 'step_count', 'retry_count', 'llm_ms', 'tool_ms',
  'input_tokens', 'output_tokens', 'cache_read_tokens', 'cache_write_tokens',
  'reasoning_tokens', 'timing_source',
]

const STEP_COLUMNS = [
  'session_id', 'turn', 'step', 'started_at', 'ended_at', 'llm_ms', 'ttft_ms', 'decode_ms',
  'input_tokens', 'output_tokens', 'cache_read_tokens', 'cache_write_tokens',
  'reasoning_tokens', 'attempt_count', 'timing_source', 'header_reason',
]

const TOOL_COLUMNS = [
  'session_id', 'turn', 'step', 'call_id', 'name', 'started_at', 'ended_at', 'ms',
  'is_error', 'error_code', 'args_summary',
]

const ATTEMPT_COLUMNS = [
  'session_id', 'turn', 'step', 'attempt_index', 'kind', 'started_at', 'ended_at',
  'llm_ms', 'ttft_ms', 'decode_ms', 'timing_source',
]

/** Columns the turns list may sort by; anything else falls back to started_at. */
const SORTABLE_TURN_COLUMNS = new Set([
  'started_at', 'wall_ms', 'llm_ms', 'tool_ms', 'step_count', 'retry_count',
  'input_tokens', 'output_tokens',
])

const TIMING_SOURCES = new Set(['exact', 'reconstructed', 'mixed'])

function now() {
  return Date.now()
}

function normalizedString(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function normalizedMillis(value) {
  if (value === undefined || value === null || value === '') return undefined
  const number = Number(value)
  return Number.isSafeInteger(number) && number >= 0 ? number : undefined
}

function normalizedTimingSource(value) {
  if (value === null || value === undefined) return null
  return TIMING_SOURCES.has(value) ? value : null
}

/** Validate public query filters; malformed input throws TypeError → HTTP 400. */
export function normalizeFilters(value = {}) {
  const from = normalizedMillis(value.from)
  const to = normalizedMillis(value.to)
  const workspace = normalizedString(value.workspace)
  const session = normalizedString(value.session)
  const provider = normalizedString(value.provider)
  const model = normalizedString(value.model)
  if (from !== undefined && to !== undefined && from > to) throw new TypeError('from must not be after to')
  return {
    ...(from === undefined ? {} : { from }),
    ...(to === undefined ? {} : { to }),
    ...(workspace === undefined ? {} : { workspace }),
    ...(session === undefined ? {} : { session }),
    ...(provider === undefined ? {} : { provider }),
    ...(model === undefined ? {} : { model }),
  }
}

/** Validate the turns-page window; bounds stay limited so one query cannot stream the ledger. */
export function normalizePage(value = {}) {
  const offsetInput = Number(value.offset)
  const limitInput = Number(value.limit)
  const sort = typeof value.sort === 'string' && SORTABLE_TURN_COLUMNS.has(value.sort) ? value.sort : 'started_at'
  return {
    offset: Number.isSafeInteger(offsetInput) && offsetInput >= 0 ? offsetInput : 0,
    limit: Number.isSafeInteger(limitInput) && limitInput > 0 ? Math.min(limitInput, 200) : 50,
    sort,
    dir: value.dir === 'asc' ? 'asc' : 'desc',
  }
}

function whereFor(filters) {
  const clauses = []
  const parameters = []
  if (filters.session !== undefined) { clauses.push('session_id = ?'); parameters.push(filters.session) }
  if (filters.workspace !== undefined) { clauses.push('workspace = ?'); parameters.push(filters.workspace) }
  if (filters.from !== undefined) { clauses.push('started_at >= ?'); parameters.push(filters.from) }
  if (filters.to !== undefined) { clauses.push('started_at <= ?'); parameters.push(filters.to) }
  if (filters.provider !== undefined) { clauses.push('provider = ?'); parameters.push(filters.provider) }
  if (filters.model !== undefined) { clauses.push('model = ?'); parameters.push(filters.model) }
  return {
    sql: clauses.length === 0 ? '' : `WHERE ${clauses.join(' AND ')}`,
    parameters,
  }
}

/**
 * Scope child tables (steps/tool_calls) to the turns matching a filter set:
 * those tables carry no workspace/provider/model columns of their own.
 */
function turnScopeFor(where) {
  if (where.sql === '') return { sql: '', parameters: [] }
  return {
    sql: `WHERE (session_id, turn) IN (SELECT session_id, turn FROM turns ${where.sql})`,
    parameters: where.parameters,
  }
}

/** Nearest-rank percentile over an ascending-sorted numeric sample. */
function percentile(sortedAscending, pct) {
  const n = sortedAscending.length
  if (n === 0) return null
  const rank = Math.ceil((pct / 100) * n)
  const value = sortedAscending[Math.max(0, Math.min(n - 1, rank - 1))]
  return typeof value === 'number' ? value : null
}

function jsonSafeRow(row) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value === undefined ? null : value]))
}

function bindParams(row, columns) {
  return columns.map(column => row[column] ?? null)
}

export class ProfilerLedger {
  constructor(filename) {
    mkdirSync(dirname(filename), { recursive: true })
    this.filename = filename
    this.db = new DatabaseSync(filename)
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;')
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS turns (
        session_id TEXT NOT NULL,
        turn INTEGER NOT NULL,
        workspace TEXT,
        started_at INTEGER,
        ended_at INTEGER,
        wall_ms INTEGER,
        reason TEXT,
        provider TEXT,
        model TEXT,
        step_count INTEGER NOT NULL,
        retry_count INTEGER NOT NULL,
        llm_ms INTEGER,
        tool_ms INTEGER,
        input_tokens INTEGER,
        output_tokens INTEGER,
        cache_read_tokens INTEGER,
        cache_write_tokens INTEGER,
        reasoning_tokens INTEGER,
        timing_source TEXT CHECK (timing_source IS NULL OR timing_source IN ('exact', 'reconstructed', 'mixed')),
        PRIMARY KEY (session_id, turn)
      ) STRICT;
      CREATE TABLE IF NOT EXISTS steps (
        session_id TEXT NOT NULL,
        turn INTEGER NOT NULL,
        step INTEGER NOT NULL,
        started_at INTEGER,
        ended_at INTEGER,
        llm_ms INTEGER,
        ttft_ms INTEGER,
        decode_ms INTEGER,
        input_tokens INTEGER,
        output_tokens INTEGER,
        cache_read_tokens INTEGER,
        cache_write_tokens INTEGER,
        reasoning_tokens INTEGER,
        attempt_count INTEGER NOT NULL,
        timing_source TEXT CHECK (timing_source IS NULL OR timing_source IN ('exact', 'reconstructed', 'mixed')),
        header_reason TEXT,
        PRIMARY KEY (session_id, turn, step)
      ) STRICT;
      CREATE TABLE IF NOT EXISTS tool_calls (
        session_id TEXT NOT NULL,
        turn INTEGER,
        step INTEGER,
        call_id TEXT NOT NULL,
        name TEXT,
        started_at INTEGER,
        ended_at INTEGER,
        ms INTEGER,
        is_error INTEGER NOT NULL CHECK (is_error IN (0, 1)),
        error_code TEXT,
        args_summary TEXT,
        PRIMARY KEY (session_id, call_id)
      ) STRICT;
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      ) STRICT;
      CREATE INDEX IF NOT EXISTS turns_started_idx ON turns(started_at);
      CREATE INDEX IF NOT EXISTS turns_workspace_idx ON turns(workspace, started_at);
      CREATE INDEX IF NOT EXISTS tool_calls_turn_idx ON tool_calls(session_id, turn, step);
      CREATE INDEX IF NOT EXISTS tool_calls_name_idx ON tool_calls(name);
      CREATE TABLE IF NOT EXISTS attempts (
        session_id TEXT NOT NULL,
        turn INTEGER NOT NULL,
        step INTEGER NOT NULL,
        attempt_index INTEGER NOT NULL,
        kind TEXT,
        started_at INTEGER,
        ended_at INTEGER,
        llm_ms INTEGER,
        ttft_ms INTEGER,
        decode_ms INTEGER,
        timing_source TEXT CHECK (timing_source IS NULL OR timing_source IN ('exact', 'reconstructed', 'mixed')),
        PRIMARY KEY (session_id, turn, step, attempt_index)
      ) STRICT;
      CREATE INDEX IF NOT EXISTS attempts_turn_idx ON attempts(session_id, turn, step);
    `)
    this.db.prepare('INSERT OR IGNORE INTO meta(key, value) VALUES (?, ?)').run('installed_at', String(now()))
    // Schema migrations: bumping SCHEMA_VERSION invalidates every backfill
    // cursor so the next sweep re-folds all sessions with the fixed logic.
    const SCHEMA_VERSION = '2'
    const storedVersion = this.db.prepare("SELECT value FROM meta WHERE key = 'schema_version'").get()?.value
    if (storedVersion !== SCHEMA_VERSION) {
      this.db.prepare("DELETE FROM meta WHERE key LIKE 'cursor:%'").run()
      this.db.prepare('INSERT OR REPLACE INTO meta(key, value) VALUES (?, ?)').run('schema_version', SCHEMA_VERSION)
    }
    this.installedAt = Number(this.db.prepare('SELECT value FROM meta WHERE key = ?').get('installed_at').value)

    // Reconstructed rescans must never downgrade rows that already carry
    // exact live timing (joined in a later milestone).
    const upsert = (table, columns, pkColumns) => {
      const setColumns = columns.filter(column => !pkColumns.includes(column))
      const guard = table === 'tool_calls'
        ? ''
        : `WHERE ${table}.timing_source IS NULL
          OR ${table}.timing_source <> 'exact'
          OR excluded.timing_source = 'exact'`
      return this.db.prepare(`
        INSERT INTO ${table} (${columns.join(', ')})
        VALUES (${columns.map(() => '?').join(', ')})
        ON CONFLICT(${pkColumns.join(', ')}) DO UPDATE SET
          ${setColumns.map(column => `${column} = excluded.${column}`).join(',\n          ')}
        ${guard}
      `)
    }
    this.upsertTurn = upsert('turns', TURN_COLUMNS, ['session_id', 'turn'])
    this.upsertStep = upsert('steps', STEP_COLUMNS, ['session_id', 'turn', 'step'])
    this.upsertTool = upsert('tool_calls', TOOL_COLUMNS, ['session_id', 'call_id'])
    this.upsertAttempt = upsert('attempts', ATTEMPT_COLUMNS, ['session_id', 'turn', 'step', 'attempt_index'])
  }

  close() {
    this.db.close()
  }

  // ---------- meta / backfill cursor ----------

  getMeta(key) {
    const row = this.db.prepare('SELECT value FROM meta WHERE key = ?').get(String(key))
    return row === undefined ? null : String(row.value)
  }

  setMeta(key, value) {
    this.db.prepare('INSERT OR REPLACE INTO meta(key, value) VALUES (?, ?)').run(String(key), String(value))
  }

  getCursor(sessionId) {
    const raw = this.getMeta(`cursor:${sessionId}`)
    if (raw === null) return null
    try {
      const value = JSON.parse(raw)
      return Number.isSafeInteger(value?.lastSeq) && Number.isSafeInteger(value?.count) ? value : null
    } catch {
      return null
    }
  }

  setCursor(sessionId, lastSeq, count) {
    this.setMeta(`cursor:${sessionId}`, JSON.stringify({ lastSeq, count, at: now() }))
  }

  // ---------- writes ----------

  /**
   * Persist one session fold. Idempotent: identical rescans write identical
   * rows; exact-timing rows survive reconstructed rescans.
   * @returns {{turns: number, steps: number, toolCalls: number, attempts: number}} upserted row counts.
   */
  recordFold(fold) {
    const counts = { turns: 0, steps: 0, toolCalls: 0, attempts: 0 }
    this.db.exec('BEGIN IMMEDIATE')
    try {
      for (const row of fold.turns ?? []) {
        const result = this.upsertTurn.run(...bindParams({
          ...row,
          timing_source: normalizedTimingSource(row.timing_source),
        }, TURN_COLUMNS))
        counts.turns += Number(result.changes)
      }
      for (const row of fold.steps ?? []) {
        const result = this.upsertStep.run(...bindParams({
          ...row,
          timing_source: normalizedTimingSource(row.timing_source),
        }, STEP_COLUMNS))
        counts.steps += Number(result.changes)
      }
      for (const row of fold.toolCalls ?? []) {
        const result = this.upsertTool.run(...bindParams({
          ...row,
          is_error: row.is_error === 1 || row.is_error === true ? 1 : 0,
        }, TOOL_COLUMNS))
        counts.toolCalls += Number(result.changes)
      }
      for (const row of fold.attempts ?? []) {
        const result = this.upsertAttempt.run(...bindParams({
          ...row,
          timing_source: normalizedTimingSource(row.timing_source),
        }, ATTEMPT_COLUMNS))
        counts.attempts += Number(result.changes)
      }
      this.db.exec('COMMIT')
      return counts
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
  }

  // ---------- reads ----------

  /** Sessions that have folded turns, newest activity first. */
  listSessions(filters = {}) {
    const normalized = normalizeFilters(filters)
    const where = whereFor(normalized)
    const rows = this.db.prepare(`
      SELECT session_id,
        MAX(workspace) AS workspace,
        COUNT(*) AS turn_count,
        SUM(step_count) AS step_count,
        SUM(retry_count) AS retry_count,
        SUM(CASE WHEN wall_ms IS NOT NULL THEN wall_ms END) AS total_wall_ms,
        MIN(started_at) AS first_active_at,
        MAX(COALESCE(ended_at, started_at)) AS last_active_at
      FROM turns
      ${where.sql}
      GROUP BY session_id
      ORDER BY last_active_at DESC
    `).all(...where.parameters).map(jsonSafeRow)
    return {
      sessions: rows,
      // Fingerprint every row (TP-R3-01): an in-place update of any session
      // (turn_count / last_active_at) must invalidate the conditional GET,
      // not only changes to the most recent session.
      etag: `${rows.length}:${rows.map(row => `${row.session_id}:${row.turn_count}:${row.last_active_at ?? 0}`).join(',')}`,
    }
  }

  /** One page of turns, unknown values sorted last in either direction. */
  turnsPage(filters = {}, page = {}) {
    const normalized = normalizeFilters(filters)
    const window = normalizePage(page)
    const where = whereFor(normalized)
    const total = Number(this.db.prepare(`
      SELECT COUNT(*) AS count FROM turns ${where.sql}
    `).get(...where.parameters).count)
    const rows = this.db.prepare(`
      SELECT ${TURN_COLUMNS.join(', ')} FROM turns
      ${where.sql}
      ORDER BY turns.${window.sort} IS NULL, turns.${window.sort} ${window.dir},
        turns.started_at DESC, turns.session_id DESC, turns.turn DESC
      LIMIT ? OFFSET ?
    `).all(...where.parameters, window.limit, window.offset).map(jsonSafeRow)
    return {
      turns: rows,
      total,
      ...window,
      // Fingerprint every visible row (TP-R3-01): progressive refolds update
      // rows in place (step_count, wall_ms, reason) without changing totals
      // or row identity, and the live poll must see that as a change.
      etag: `${total}:${window.sort}:${window.dir}:${window.offset}:${window.limit}:${rows.map(row => `${row.session_id}:${row.turn}:${row.ended_at ?? 'open'}:${row.step_count}:${row.wall_ms ?? 'open'}:${row.timing_source ?? ''}`).join(',')}`,
    }
  }

  /**
   * Dashboard aggregation (design.md §4.2 /summary): KPI percentiles via
   * nearest-rank over sorted samples, slowest tools/turns TopN, per-day
   * trend, and provider/model facets for the filter selects.
   */
  summary(filters = {}, options = {}) {
    const normalized = normalizeFilters(filters)
    const where = whereFor(normalized)
    const scope = turnScopeFor(where)
    const wanted = Number(options.topN)
    const topLimit = Number.isSafeInteger(wanted) && wanted > 0 ? Math.min(wanted, 50) : 10

    const turnRows = this.db.prepare(`
      SELECT wall_ms, llm_ms, tool_ms, retry_count,
        input_tokens, output_tokens, cache_read_tokens, cache_write_tokens
      FROM turns ${where.sql}
    `).all(...where.parameters)
    const sum = (pick) => turnRows.reduce((total, row) => {
      const value = pick(row)
      return total + (typeof value === 'number' ? value : 0)
    }, 0)
    const walls = turnRows.map(row => row.wall_ms)
      .filter(value => typeof value === 'number')
      .sort((a, b) => a - b)
    const totals = {
      turns: turnRows.length,
      settledTurns: walls.length,
      wallMs: sum(row => row.wall_ms),
      llmMs: sum(row => row.llm_ms),
      toolMs: sum(row => row.tool_ms),
      inputTokens: sum(row => row.input_tokens),
      outputTokens: sum(row => row.output_tokens),
      cacheReadTokens: sum(row => row.cache_read_tokens),
      cacheWriteTokens: sum(row => row.cache_write_tokens),
    }
    const denominator = totals.inputTokens + totals.cacheReadTokens + totals.cacheWriteTokens
    const retrying = turnRows.filter(row => Number(row.retry_count) > 0).length

    const ttftSql = scope.sql === ''
      ? 'WHERE ttft_ms IS NOT NULL'
      : `${scope.sql} AND ttft_ms IS NOT NULL`
    const ttfts = this.db.prepare(`SELECT ttft_ms FROM steps ${ttftSql}`)
      .all(...scope.parameters)
      .map(row => row.ttft_ms)
      .sort((a, b) => a - b)

    const kpi = {
      turnWallP50Ms: percentile(walls, 50),
      turnWallP95Ms: percentile(walls, 95),
      ttftP50Ms: percentile(ttfts, 50),
      ttftP95Ms: percentile(ttfts, 95),
      cacheHitRate: denominator > 0 ? totals.cacheReadTokens / denominator : null,
      retryRate: turnRows.length > 0 ? retrying / turnRows.length : null,
      toolShare: totals.wallMs > 0 ? totals.toolMs / totals.wallMs : null,
    }

    const topTools = this.db.prepare(`
      SELECT name, COUNT(*) AS calls, SUM(ms) AS total_ms, MAX(ms) AS max_ms, SUM(is_error) AS errors
      FROM tool_calls ${scope.sql}
      GROUP BY name
      ORDER BY total_ms IS NULL, total_ms DESC
      LIMIT ?
    `).all(...scope.parameters, topLimit).map(jsonSafeRow)

    const topTurnsSql = where.sql === ''
      ? 'WHERE wall_ms IS NOT NULL'
      : `${where.sql} AND wall_ms IS NOT NULL`
    const topTurns = this.db.prepare(`
      SELECT session_id, turn, started_at, wall_ms, llm_ms, tool_ms, provider, model, reason
      FROM turns ${topTurnsSql}
      ORDER BY wall_ms DESC
      LIMIT ?
    `).all(...where.parameters, topLimit).map(jsonSafeRow)

    const daily = this.db.prepare(`
      SELECT date(started_at / 1000, 'unixepoch', 'localtime') AS day,
        COUNT(*) AS turns,
        SUM(wall_ms) AS wall_ms, SUM(llm_ms) AS llm_ms, SUM(tool_ms) AS tool_ms,
        SUM(input_tokens) AS input_tokens, SUM(output_tokens) AS output_tokens,
        SUM(cache_read_tokens) AS cache_read_tokens
      FROM turns ${where.sql}
      GROUP BY day
      ORDER BY day
    `).all(...where.parameters).map(jsonSafeRow)

    const facetSql = (column) => (where.sql === ''
      ? `WHERE ${column} IS NOT NULL`
      : `${where.sql} AND ${column} IS NOT NULL`)
    const facets = {
      providers: this.db.prepare(`SELECT DISTINCT provider FROM turns ${facetSql('provider')} ORDER BY provider`)
        .all(...where.parameters).map(row => row.provider),
      models: this.db.prepare(`SELECT DISTINCT model FROM turns ${facetSql('model')} ORDER BY model`)
        .all(...where.parameters).map(row => row.model),
    }

    return {
      filters: normalized,
      kpi,
      totals,
      topTools,
      topTurns,
      daily,
      facets,
      etag: `${turnRows.length}:${totals.wallMs}:${totals.inputTokens}:${walls[walls.length - 1] ?? 0}:${ttfts.length}:${daily.length}:${topTools.length}:${topTurns.length}`,
    }
  }

  /** Everything the waterfall view needs for one turn. */
  waterfall(sessionId, turn) {
    const session = normalizedString(sessionId)
    if (session === undefined) throw new TypeError('session is required')
    const turnNumber = Number(turn)
    if (!Number.isSafeInteger(turnNumber) || turnNumber < 0) throw new TypeError('turn must be a non-negative integer')

    const turnRow = this.db.prepare(`
      SELECT ${TURN_COLUMNS.join(', ')} FROM turns WHERE session_id = ? AND turn = ?
    `).get(session, turnNumber)
    const steps = this.db.prepare(`
      SELECT ${STEP_COLUMNS.join(', ')} FROM steps
      WHERE session_id = ? AND turn = ?
      ORDER BY step
    `).all(session, turnNumber).map(jsonSafeRow)
    const toolCalls = this.db.prepare(`
      SELECT ${TOOL_COLUMNS.join(', ')} FROM tool_calls
      WHERE session_id = ? AND turn = ?
      ORDER BY started_at IS NULL, started_at, call_id
    `).all(session, turnNumber).map(jsonSafeRow)
    const attempts = this.db.prepare(`
      SELECT ${ATTEMPT_COLUMNS.join(', ')} FROM attempts
      WHERE session_id = ? AND turn = ?
      ORDER BY step, attempt_index
    `).all(session, turnNumber).map(jsonSafeRow)
    return {
      turn: turnRow === undefined ? null : jsonSafeRow(turnRow),
      steps,
      toolCalls,
      attempts,
      etag: `${turnRow?.ended_at ?? 'open'}:${turnRow?.reason ?? ''}:${steps.length}:${toolCalls.length}:${attempts.length}:${steps.map(step => `${step.llm_ms}/${step.ttft_ms}/${step.timing_source}`).join(',')}`,
    }
  }

  /** Ledger-wide counts for the status endpoint. */
  stats() {
    const turns = this.db.prepare('SELECT COUNT(*) AS n, COUNT(DISTINCT session_id) AS s, MIN(started_at) AS earliest, MAX(COALESCE(ended_at, started_at)) AS latest FROM turns').get()
    const steps = this.db.prepare('SELECT COUNT(*) AS n FROM steps').get()
    const toolCalls = this.db.prepare('SELECT COUNT(*) AS n FROM tool_calls').get()
    return {
      turns: Number(turns.n),
      sessions: Number(turns.s),
      steps: Number(steps.n),
      toolCalls: Number(toolCalls.n),
      earliestTurnAt: turns.earliest ?? null,
      latestTurnAt: turns.latest ?? null,
    }
  }
}
