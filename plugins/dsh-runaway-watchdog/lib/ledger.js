/**
 * Durable audit ledger for the Runaway Watchdog.
 *
 * Backed by a storage-domain table (`entries`). The domain is the authoritative
 * durable store; this module keeps an ordered key index for fast newest-first
 * queries, retention eviction, and aggregate statistics. It depends only on the
 * domain interface ({table, close}), so the unit suite drives it with an
 * in-memory fake and the live self-test drives it with the real storageDomain.
 *
 * @module @local/dsh-runaway-watchdog/lib/ledger
 */

/**
 * @typedef {object} AuditEntry
 * @property {string} id - sortable unique id.
 * @property {number} time - epoch ms.
 * @property {string} sessionId - owning session ('' for host-global).
 * @property {string} rule - repeat | error-rate | token-velocity | spend-velocity | depth | fanout.
 * @property {string} severity - warn | block | circuit.
 * @property {string} action - advised | blocked | circuit-opened | circuit-closed | would-trip | spawn-blocked | reset.
 * @property {object} detail - rule-specific payload (tool, count, rate, vpm, ...).
 * @property {number} tokensAtBreach - session total tokens when detected.
 * @property {number} estimatedTokensPrevented - heuristic tokens saved by the action.
 * @property {number} estimatedCostPrevented - heuristic spend saved by the action (CNY).
 */

let counter = 0

/**
 * Build a sortable unique id (time-prefixed so lexicographic order is chronological).
 * @param {number} time - epoch ms.
 * @returns {string} id.
 */
export function makeId(time) {
  counter = (counter + 1) % 1000000
  const rand = Math.random().toString(36).slice(2, 8)
  return `${String(Math.trunc(time)).padStart(13, '0')}-${String(counter).padStart(6, '0')}-${rand}`
}

/**
 * Open the ledger over an already-opened domain.
 * @param {object} domain - storage-domain Domain (table('entries'), close()).
 * @param {number} retention - maximum retained entries.
 * @returns {object} ledger API.
 */
export function createLedger(domain, retention) {
  const table = domain.table('entries')
  // Rebuild the chronological index from durable records (survives restart).
  let keys = [...table.entries()]
    .sort((a, b) => (a[1].time - b[1].time) || (a[0] < b[0] ? -1 : 1))
    .map(([key]) => key)

  function evict() {
    while (keys.length > retention) {
      const oldest = keys.shift()
      void table.delete(oldest)
    }
  }

  /**
   * Record one audit entry durably.
   * @param {object} partial - entry fields without id (time defaults to now).
   * @returns {Promise<AuditEntry>} the stored entry.
   */
  async function record(partial) {
    const time = typeof partial.time === 'number' ? partial.time : Date.now()
    const entry = {
      id: makeId(time),
      time,
      sessionId: partial.sessionId ?? '',
      rule: partial.rule ?? 'unknown',
      severity: partial.severity ?? 'warn',
      action: partial.action ?? 'advised',
      detail: partial.detail ?? {},
      tokensAtBreach: partial.tokensAtBreach ?? 0,
      estimatedTokensPrevented: partial.estimatedTokensPrevented ?? 0,
      estimatedCostPrevented: partial.estimatedCostPrevented ?? 0,
    }
    await table.put(entry.id, entry)
    keys.push(entry.id)
    evict()
    return entry
  }

  /**
   * Newest-first query with optional session/rule filters.
   * @param {{session?: string, rule?: string, limit?: number}} [opts] - filters.
   * @returns {AuditEntry[]} matching entries (newest first).
   */
  function query(opts = {}) {
    const limit = opts.limit ?? 100
    const out = []
    for (let i = keys.length - 1; i >= 0 && out.length < limit; i -= 1) {
      const entry = table.get(keys[i])
      if (entry === undefined) continue
      if (opts.session !== undefined && entry.sessionId !== opts.session) continue
      if (opts.rule !== undefined && entry.rule !== opts.rule) continue
      out.push(entry)
    }
    return out
  }

  /**
   * Aggregate statistics over the whole retained ledger.
   * @returns {object} stats.
   */
  function stats() {
    const byRule = {}
    const bySeverity = {}
    const byAction = {}
    let interventions = 0
    let blocks = 0
    let circuits = 0
    let estimatedTokensPrevented = 0
    let estimatedCostPrevented = 0
    const sessions = new Set()
    for (const key of keys) {
      const entry = table.get(key)
      if (entry === undefined) continue
      byRule[entry.rule] = (byRule[entry.rule] ?? 0) + 1
      bySeverity[entry.severity] = (bySeverity[entry.severity] ?? 0) + 1
      byAction[entry.action] = (byAction[entry.action] ?? 0) + 1
      // An intervention is something the watchdog DID. `advised`/`would-trip` are
      // observations and `reset`/`circuit-closed` are bookkeeping — counting a
      // cooldown expiry as an intervention double-counts one circuit episode.
      if (entry.action !== 'advised' && entry.action !== 'reset' && entry.action !== 'would-trip'
        && entry.action !== 'circuit-closed') interventions += 1
      if (entry.action === 'blocked' || entry.action === 'spawn-blocked') blocks += 1
      if (entry.action === 'circuit-opened') circuits += 1
      estimatedTokensPrevented += entry.estimatedTokensPrevented ?? 0
      estimatedCostPrevented += entry.estimatedCostPrevented ?? 0
      // `selftest` is the synthetic owner of the ledger round-trip check, not a
      // real conversation: counting it would report one extra "session touched".
      if (entry.sessionId !== '' && entry.sessionId !== 'selftest') sessions.add(entry.sessionId)
    }
    return {
      total: keys.length,
      interventions,
      blocks,
      circuits,
      estimatedTokensPrevented,
      estimatedCostPrevented,
      distinctSessions: sessions.size,
      byRule,
      bySeverity,
      byAction,
    }
  }

  return {
    record,
    query,
    stats,
    get size() { return keys.length },
    close: () => domain.close(),
  }
}