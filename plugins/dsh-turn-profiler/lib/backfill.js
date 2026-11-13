/**
 * Incremental history backfill for the turn profiler.
 *
 * - Incremental: a per-session cursor (last raw seq + event count, persisted
 *   in the ledger's meta table) lets a rescan skip unchanged sessions after a
 *   cheap `listEvents` metadata read — only new/changed sessions pay for a
 *   full `readSession` + fold.
 * - Interruptible: the run honors an AbortSignal between sessions.
 * - Idempotent: folds upsert by primary key, so rescans never double-count.
 */

import { foldSessionSnapshot } from './events.js'

export class BackfillTracker {
  constructor() {
    this.state = {
      phase: 'idle',
      startedAt: null,
      completedAt: null,
      totalSessions: 0,
      scannedSessions: 0,
      skippedSessions: 0,
      upsertedTurns: 0,
      upsertedSteps: 0,
      upsertedToolCalls: 0,
      inheritedEventsSkipped: 0,
      malformedEventsSkipped: 0,
      rescans: 0,
      errorCount: 0,
      recentErrors: [],
    }
    this.activeRescans = new Set()
  }

  snapshot() {
    return structuredClone(this.state)
  }

  rememberError(sessionId, error) {
    this.state.errorCount += 1
    this.state.recentErrors = [
      ...this.state.recentErrors.slice(-4),
      {
        sessionId: sessionId ?? null,
        message: error instanceof Error ? error.message : String(error),
      },
    ]
  }

  /**
   * Fold and persist one session when its raw log changed since the cursor.
   * @returns {Promise<{skipped: boolean}>}
   */
  async scanOne(sessionQuery, ledger, sessionId, timings) {
    // Cheap metadata read drives the incremental cursor. readSession's
    // interrupted-turn balancing can synthesize closers, so the cursor is
    // always derived from the raw log listing, never from the fold input.
    const records = await sessionQuery.listEvents(sessionId)
    const count = Array.isArray(records) ? records.length : 0
    const lastSeq = count > 0 ? records[count - 1].seq : -1
    const cursor = ledger.getCursor(sessionId)
    if (cursor !== null && cursor.lastSeq === lastSeq && cursor.count === count) {
      return { skipped: true }
    }
    const snapshot = await sessionQuery.readSession(sessionId)
    const fold = foldSessionSnapshot(snapshot, timings)
    const counts = ledger.recordFold(fold)
    ledger.setCursor(sessionId, Number.isSafeInteger(lastSeq) ? lastSeq : -1, count)
    this.state.inheritedEventsSkipped += fold.inheritedSkipped
    this.state.malformedEventsSkipped += fold.skippedEvents
    this.state.upsertedTurns += counts.turns
    this.state.upsertedSteps += counts.steps
    this.state.upsertedToolCalls += counts.toolCalls
    return { skipped: false }
  }

  /** Full corpus sweep: list every session, fold the changed ones. */
  async run(sessionQuery, ledger, signal) {
    this.state = {
      ...this.state,
      phase: 'listing',
      startedAt: Date.now(),
      completedAt: null,
      totalSessions: 0,
      scannedSessions: 0,
      skippedSessions: 0,
      upsertedTurns: 0,
      upsertedSteps: 0,
      upsertedToolCalls: 0,
      inheritedEventsSkipped: 0,
      malformedEventsSkipped: 0,
      rescans: 0,
      errorCount: 0,
      recentErrors: [],
    }
    try {
      const records = await sessionQuery.listSessions(signal)
      this.state.phase = 'scanning'
      this.state.totalSessions = records.length
      for (const record of records) {
        if (signal?.aborted) throw signal.reason ?? new Error('backfill aborted')
        const sessionId = record?.header?.id
        if (typeof sessionId !== 'string' || sessionId === '') {
          this.rememberError(null, new TypeError('session record without an id'))
          continue
        }
        try {
          const result = await this.scanOne(sessionQuery, ledger, sessionId)
          if (result.skipped) this.state.skippedSessions += 1
          else this.state.scannedSessions += 1
        } catch (error) {
          if (signal?.aborted) throw error
          this.rememberError(sessionId, error)
        }
      }
      this.state.phase = this.state.errorCount === 0 ? 'complete' : 'complete-with-errors'
      this.state.completedAt = Date.now()
    } catch (error) {
      if (signal?.aborted) {
        this.state.phase = 'cancelled'
      } else {
        this.state.phase = 'failed'
        this.rememberError(null, error)
      }
      this.state.completedAt = Date.now()
    }
  }

  /**
   * Refold a single session (live path: a turn just ended). Concurrent calls
   * for the same session collapse into one; errors are counted, never thrown
   * into the host event pipeline. Overlap with the full sweep is safe: folds
   * upsert idempotently and either cursor write reflects a valid log state.
   */
  async rescanSession(sessionQuery, ledger, sessionId, signal, timings) {
    if (typeof sessionId !== 'string' || sessionId === '') return
    if (this.activeRescans.has(sessionId)) return
    this.activeRescans.add(sessionId)
    try {
      const result = await this.scanOne(sessionQuery, ledger, sessionId, timings)
      this.state.rescans += result.skipped ? 0 : 1
    } catch (error) {
      if (!signal?.aborted) this.rememberError(sessionId, error)
    } finally {
      this.activeRescans.delete(sessionId)
    }
  }
}
