/**
 * Subagent recursion / fan-out enforcement (pure decision logic).
 *
 * Delegation depth is read from the durable `SessionHeader.delegationDepth`
 * (persisted by the core so a recursion budget survives restart and resume).
 * Live fan-out is counted from the live agent roster. The guard calls these
 * synchronous helpers; the unit suite drives them with plain data.
 *
 * @module @local/dsh-runaway-watchdog/lib/tree
 */

/**
 * Delegation depth of a session header (0 for a top-level session).
 * @param {object|undefined} header - SessionHeader-like.
 * @returns {number} non-negative depth.
 */
export function depthOf(header) {
  const depth = header?.delegationDepth
  return typeof depth === 'number' && Number.isFinite(depth) && depth > 0 ? Math.trunc(depth) : 0
}

/**
 * Count live agents whose parent session is `sessionId` (current fan-out).
 * @param {ReadonlyArray<object>} agents - live agent roster (each {session:{header:{parentSession}}}).
 * @param {string} sessionId - parent session id.
 * @returns {number} live child count.
 */
export function liveFanout(agents, sessionId) {
  let count = 0
  for (const agent of agents) {
    const parent = agent?.session?.header?.parentSession
    if (parent !== undefined && String(parent) === String(sessionId)) count += 1
  }
  return count
}

/**
 * Decide whether a spawn call must be blocked by the depth/fan-out budget.
 * @param {{depth: number, fanout: number, isSpawn: boolean}} input - current tree facts.
 * @param {object} cfg - normalized config (maxDepth, maxFanout).
 * @returns {object|null} a breach ({rule, severity:'block', detail}) or null.
 */
export function spawnDecision({ depth, fanout, isSpawn }, cfg) {
  if (!isSpawn) return null
  if (depth >= cfg.maxDepth) {
    return { rule: 'depth', severity: 'block', detail: { depth, maxDepth: cfg.maxDepth } }
  }
  if (fanout >= cfg.maxFanout) {
    return { rule: 'fanout', severity: 'block', detail: { fanout, maxFanout: cfg.maxFanout } }
  }
  return null
}