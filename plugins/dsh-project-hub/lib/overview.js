/**
 * Project Hub overview aggregation.
 *
 * One pure function over the two host reads a browser cannot make cheaply:
 * the Workspace registry (durable project accounts plus a live directory
 * probe) and the session corpus. Everything the grid renders is derived here
 * so the panel needs a single round trip instead of one per project.
 *
 * Membership rule: a session belongs to a project only when the registry
 * accounts it in `sessionIds`. The registry header-validates that account
 * against the session's canonical cwd, so guessing from `cwd` here would
 * second-guess a check that already ran. A session no project accounts is
 * ungrouped and stays visible as such.
 *
 * Delegation rule: the corpus holds top-level sessions and the subagents they
 * spawned. A record is delegated when its own header says so — a non-empty
 * `parentSession` or a `delegationDepth` above zero — never by inference.
 * Counts report top-level sessions, which is what the native sidebar lists and
 * what the registry accounts; delegated sessions get their own counters and are
 * attributed to a project by walking the parent chain up to an accounted
 * ancestor, so a depth-2 subagent lands on the same project as its root. A
 * delegated session no chain can place is counted as ungrouped rather than
 * silently dropped.
 *
 * Activity basis: the session header carries `createdAt` only — no mtime and
 * no updatedAt — so `lastActiveAt` here is the newest `createdAt` among the
 * sessions attributed to a bucket, delegated ones included, because a subagent
 * running is activity in that project too. The client refines it with the
 * Session Controller's live `updatedAt`, which folds the last prompt time in;
 * `activityBasis` names the host-side meaning so a reader never mistakes one
 * for the other.
 */

/** What `lastActiveAt` means in a host-built payload. */
export const ACTIVITY_BASIS = 'session.createdAt'

/** Directory probe outcomes; anything unprobed stays `unknown`, never `ok`. */
const STATUSES = new Set(['ok', 'missing-dir', 'unknown'])

/** Parent-chain walk budget: enough for real delegation, short enough to be cheap. */
const MAX_CHAIN_HOPS = 32

/** Newest of two nullable epoch-millisecond stamps. */
function newest(current, candidate) {
  if (candidate === null) return current
  return current === null ? candidate : Math.max(current, candidate)
}

/** A finite epoch-millisecond stamp, or null. */
function stamp(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** Registry id lists arrive as string arrays; anything else reads as empty. */
function idList(value) {
  if (!Array.isArray(value)) return []
  const ids = []
  for (const entry of value) {
    if (typeof entry === 'string' && entry !== '') ids.push(entry)
  }
  return ids
}

/** A non-empty display string, or null so the client falls back to the path. */
function text(value) {
  return typeof value === 'string' && value !== '' ? value : null
}

/** A finite delegation depth, or null when the header does not state one. */
function depth(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/**
 * Normalize the corpus read into the identity and activity facts the grid needs.
 * @param sessions - `{id, cwd, createdAt, live, persisted, parentSession, delegationDepth}` rows; malformed rows drop.
 * @returns id-keyed records, first occurrence winning.
 */
function indexSessions(sessions) {
  const byId = new Map()
  if (!Array.isArray(sessions)) return byId
  for (const entry of sessions) {
    if (entry === null || typeof entry !== 'object') continue
    const id = typeof entry.id === 'string' ? entry.id : null
    if (id === null || id === '' || byId.has(id)) continue
    byId.set(id, {
      id,
      cwd: text(entry.cwd),
      createdAt: stamp(entry.createdAt),
      live: entry.live === true,
      persisted: entry.persisted === true,
      parentSession: text(entry.parentSession),
      delegationDepth: depth(entry.delegationDepth),
    })
  }
  return byId
}

/** True when the record's own header marks it as a spawned subagent. */
function isDelegated(record) {
  if (record.parentSession !== null) return true
  return record.delegationDepth !== null && record.delegationDepth > 0
}

/**
 * Resolve the project row that owns a session by walking its parent chain.
 * @param startId - first ancestor to test, usually the record's `parentSession`.
 * @param index - corpus records by id, supplying each hop's parent.
 * @param owner - accounted session id to row index.
 * @returns the owning row index, or null when no ancestor is accounted.
 */
function ownerRow(startId, index, owner) {
  const seen = new Set()
  let current = startId
  for (let hop = 0; hop < MAX_CHAIN_HOPS; hop += 1) {
    if (current === null) return null
    if (owner.has(current)) return owner.get(current)
    if (seen.has(current)) return null
    seen.add(current)
    current = index.get(current)?.parentSession ?? null
  }
  return null
}

/**
 * Build one project row from a registry workspace and the corpus index.
 * @param workspace - registry workspace with its resolved directory `status`.
 * @param index - corpus records by session id.
 * @param pinned - durable pinned session ids.
 * @param archived - durable archived session ids.
 * @param order - registry display position.
 * @param claimed - accumulator; every accounted id is marked as belonging to a project.
 * @returns the wire row, with `subagentCount` still to be filled by attribution.
 */
function projectRow(workspace, index, pinned, archived, order, claimed) {
  const sessionIds = idList(workspace?.sessionIds)
  let liveCount = 0
  const archivedIds = []
  const pinnedIds = []
  let lastActiveAt = null
  for (const sessionId of sessionIds) {
    claimed.add(sessionId)
    const record = index.get(sessionId)
    if (record?.live === true) liveCount += 1
    if (archived.has(sessionId)) archivedIds.push(sessionId)
    if (pinned.has(sessionId)) pinnedIds.push(sessionId)
    lastActiveAt = newest(lastActiveAt, record?.createdAt ?? null)
  }
  const status = STATUSES.has(workspace?.status) ? workspace.status : 'unknown'
  return {
    order,
    id: String(workspace?.id ?? ''),
    title: text(workspace?.title),
    path: text(workspace?.path) ?? '',
    status,
    createdAt: text(workspace?.createdAt),
    updatedAt: text(workspace?.updatedAt),
    sessionIds,
    sessionCount: sessionIds.length,
    subagentCount: 0,
    liveCount,
    archivedCount: archivedIds.length,
    pinnedCount: pinnedIds.length,
    // The M3 detail view needs membership, not just counts: which of this
    // project's sessions are pinned or archived, in registry order.
    pinnedSessionIds: pinnedIds,
    archivedSessionIds: archivedIds,
    lastActiveAt,
  }
}

/**
 * Aggregate the project grid payload.
 * @param input - `{workspaces, sessions, pinnedSessionIds, archivedSessionIds, generatedAt, degraded}`.
 * @returns the overview wire payload, including its cache identity in `etag`.
 */
export function buildOverview(input = {}) {
  const source = input === null || typeof input !== 'object' ? {} : input
  const generatedAt = stamp(source.generatedAt) ?? Date.now()
  const pinned = new Set(idList(source.pinnedSessionIds))
  const archived = new Set(idList(source.archivedSessionIds))
  const index = indexSessions(source.sessions)
  const degraded = source.degraded === undefined || source.degraded === null ? null : source.degraded

  const claimed = new Set()
  const rows = []
  if (Array.isArray(source.workspaces)) {
    for (const workspace of source.workspaces) {
      if (workspace === null || typeof workspace !== 'object') continue
      rows.push(projectRow(workspace, index, pinned, archived, rows.length, claimed))
    }
  }

  // Accounted id to row index, first workspace winning if two ever claim one id.
  const owner = new Map()
  rows.forEach((row, rowIndex) => {
    for (const sessionId of row.sessionIds) {
      if (!owner.has(sessionId)) owner.set(sessionId, rowIndex)
    }
  })

  let ungroupedSessions = 0
  let ungroupedSubagents = 0
  let ungroupedLastActiveAt = null
  let liveSessions = 0
  let liveSubagents = 0
  let subagentSessions = 0
  for (const record of index.values()) {
    if (isDelegated(record)) {
      subagentSessions += 1
      if (record.live) liveSubagents += 1
      const rowIndex = ownerRow(record.parentSession, index, owner)
      if (rowIndex === null) {
        ungroupedSubagents += 1
        ungroupedLastActiveAt = newest(ungroupedLastActiveAt, record.createdAt)
      } else {
        const row = rows[rowIndex]
        row.subagentCount += 1
        row.lastActiveAt = newest(row.lastActiveAt, record.createdAt)
      }
      continue
    }
    if (record.live) liveSessions += 1
    if (claimed.has(record.id)) continue
    ungroupedSessions += 1
    ungroupedLastActiveAt = newest(ungroupedLastActiveAt, record.createdAt)
  }

  let lastActiveAt = ungroupedLastActiveAt
  let missingDirs = 0
  for (const row of rows) {
    lastActiveAt = newest(lastActiveAt, row.lastActiveAt)
    if (row.status === 'missing-dir') missingDirs += 1
  }

  const summary = {
    workspaces: rows.length,
    sessions: index.size - subagentSessions,
    subagentSessions,
    liveSessions,
    liveSubagents,
    archivedSessions: archived.size,
    pinnedSessions: pinned.size,
    missingDirs,
    ungroupedSessions,
    lastActiveAt,
  }

  const payload = {
    generatedAt,
    activityBasis: ACTIVITY_BASIS,
    degraded,
    summary,
    workspaces: rows,
    ungrouped: {
      sessionCount: ungroupedSessions,
      subagentCount: ungroupedSubagents,
      lastActiveAt: ungroupedLastActiveAt,
    },
  }
  return { ...payload, etag: cacheIdentity(payload) }
}

/**
 * Cache identity over every displayed fact, `generatedAt` excluded so a
 * refetch of unchanged data can answer 304.
 * @param payload - overview payload without its `etag`.
 * @returns a deterministic seed string for hashing.
 */
function cacheIdentity(payload) {
  const { summary } = payload
  const head = [
    summary.workspaces, summary.sessions, summary.subagentSessions, summary.liveSessions,
    summary.liveSubagents, summary.archivedSessions, summary.pinnedSessions,
    summary.missingDirs, summary.ungroupedSessions, summary.lastActiveAt,
    payload.ungrouped.subagentCount, payload.ungrouped.lastActiveAt,
    payload.degraded === null ? '' : JSON.stringify(payload.degraded),
  ].join('|')
  const body = payload.workspaces.map(row => [
    row.order, row.id, row.title, row.path, row.status, row.createdAt, row.updatedAt,
    row.sessionCount, row.subagentCount, row.liveCount, row.archivedCount, row.pinnedCount,
    row.lastActiveAt, row.sessionIds.join(' '),
    row.pinnedSessionIds.join(' '), row.archivedSessionIds.join(' '),
  ].join(':')).join(',')
  return `${head}#${body}`
}
