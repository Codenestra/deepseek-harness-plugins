import { scanSessionSnapshot } from './events.js'

export class BackfillTracker {
  constructor(installedAt) {
    this.installedAt = installedAt
    this.state = {
      phase: 'idle',
      startedAt: null,
      completedAt: null,
      totalSessions: 0,
      scannedSessions: 0,
      insertedCalls: 0,
      inheritedEventsSkipped: 0,
      errorCount: 0,
      recentErrors: [],
      exactTimingAvailableSince: installedAt,
    }
  }

  snapshot() {
    return structuredClone(this.state)
  }

  async run(sessionQuery, ledger, signal) {
    this.state = {
      ...this.state,
      phase: 'listing',
      startedAt: Date.now(),
      completedAt: null,
      totalSessions: 0,
      scannedSessions: 0,
      insertedCalls: 0,
      inheritedEventsSkipped: 0,
      errorCount: 0,
      recentErrors: [],
    }
    try {
      const records = await sessionQuery.listSessions(signal)
      this.state.phase = 'scanning'
      this.state.totalSessions = records.length
      for (const record of records) {
        if (signal.aborted) throw signal.reason ?? new Error('backfill aborted')
        try {
          const snapshot = await sessionQuery.readSession(record.header.id)
          const scan = scanSessionSnapshot(snapshot)
          this.state.insertedCalls += ledger.recordScan(scan)
          this.state.inheritedEventsSkipped += scan.inheritedSkipped
        } catch (error) {
          this.state.errorCount += 1
          this.state.recentErrors = [
            ...this.state.recentErrors.slice(-4),
            {
              sessionId: record?.header?.id ?? null,
              message: error instanceof Error ? error.message : String(error),
            },
          ]
        } finally {
          this.state.scannedSessions += 1
        }
      }
      this.state.phase = this.state.errorCount === 0 ? 'complete' : 'complete-with-errors'
      this.state.completedAt = Date.now()
    } catch (error) {
      if (signal.aborted) {
        this.state.phase = 'cancelled'
      } else {
        this.state.phase = 'failed'
        this.state.errorCount += 1
        this.state.recentErrors = [
          ...this.state.recentErrors.slice(-4),
          { sessionId: null, message: error instanceof Error ? error.message : String(error) },
        ]
      }
      this.state.completedAt = Date.now()
    }
  }
}
