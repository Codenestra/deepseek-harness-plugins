/** DeepSeek Harness Turn Profiler host plugin (M3: live exact capture join). */

import { createHash } from 'node:crypto'
import { isAbsolute, join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { isAgentLoopRequest, isTokenDelta } from '@deepseek-ai/dsh-llm'
import { BackfillTracker } from './lib/backfill.js'
import { ProfilerLedger, normalizeFilters, normalizePage } from './lib/ledger.js'

export const name = 'turn-profiler'
export const inject = ['llm', 'sessionQuery', 'connection', 'profileContext', 'workspaceRegistry']

function databasePath(ctx, config) {
  if (config?.databasePath !== undefined) {
    if (typeof config.databasePath !== 'string' || !isAbsolute(config.databasePath)) {
      throw new TypeError('turn-profiler: databasePath must be an absolute path')
    }
    return config.databasePath
  }
  return join(ctx.profileContext.dir, 'turn-profiler', 'turn-profiler.sqlite')
}

function jsonResponse(value, status = 200, head = false, etag) {
  const body = JSON.stringify(value)
  return new Response(head ? null : body, {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-length': String(Buffer.byteLength(body)),
      'cache-control': 'no-store',
      ...(etag === undefined ? {} : { etag }),
    },
  })
}

/** Weak validator over the payload's data identity; unchanged data answers 304. */
function etagOf(token) {
  return `W/"${createHash('sha1').update(String(token)).digest('hex')}"`
}

/**
 * Wrap one LLM stream with monotonic-clock boundaries (same pattern as
 * usage-center): start, first token delta, and end are observed around the
 * downstream generator without buffering or altering any chunk.
 */
function captureStream(options, next, settle) {
  const downstream = next()
  return (async function* turnProfilerCapture() {
    const startedAt = Date.now()
    const startedMono = performance.now()
    let firstTokenMono
    let threw = false
    try {
      for await (const chunk of downstream) {
        const observedMono = performance.now()
        if (firstTokenMono === undefined && isTokenDelta(chunk)) firstTokenMono = observedMono
        yield chunk
      }
    } catch (error) {
      threw = true
      throw error
    } finally {
      const endedMono = performance.now()
      settle({
        sessionId: options.sessionId,
        startedAt,
        endedAt: Date.now(),
        llmMs: Math.max(0, endedMono - startedMono),
        ttftMs: firstTokenMono === undefined ? null : Math.max(0, firstTokenMono - startedMono),
        decodeMs: firstTokenMono === undefined ? null : Math.max(0, endedMono - firstTokenMono),
        threw,
      })
    }
  })()
}

/** JSON file download (export.json). */
function downloadResponse(value, filename, head = false) {
  const body = JSON.stringify(value, null, 2)
  return new Response(head ? null : body, {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-length': String(Buffer.byteLength(body)),
      'cache-control': 'no-store',
      'content-disposition': `attachment; filename="${filename}"`,
    },
  })
}

function errorResponse(error, head = false) {
  return jsonResponse({
    error: {
      code: error instanceof TypeError ? 'INVALID_FILTER' : 'PROFILER_ERROR',
      message: error instanceof Error ? error.message : String(error),
    },
  }, error instanceof TypeError ? 400 : 500, head)
}

function notModified(etag) {
  return new Response(null, { status: 304, headers: { etag, 'cache-control': 'no-store' } })
}

/** GET/HEAD + conditional-request plumbing shared by every route. */
function route(fetchPayload) {
  return async (request) => {
    const head = request.method === 'HEAD'
    try {
      const payload = await fetchPayload(request)
      const etag = etagOf(payload.etag ?? '')
      if (request.headers?.get?.('if-none-match') === etag) return notModified(etag)
      return jsonResponse(payload, 200, head, etag)
    } catch (error) {
      return errorResponse(error, head)
    }
  }
}

function params(request) {
  return new URL(request.url).searchParams
}

export function apply(ctx, config = {}) {
  const ledger = new ProfilerLedger(databasePath(ctx, config))
  const backfill = new BackfillTracker()
  const liveState = { errors: 0, lastError: null }
  const rememberError = (error) => {
    liveState.errors += 1
    liveState.lastError = error instanceof Error ? error.message : String(error)
  }

  // --- live skeleton: refold a session shortly after one of its turns ends ---
  // Exact llm/stream capture joins in M3; M1 keeps the durable log canonical
  // and simply refolds the changed session so an open panel stays current.
  const pendingRescans = new Map()
  const abort = new AbortController()
  const scheduleRescan = (sessionId, timings) => {
    if (typeof sessionId !== 'string' || sessionId === '') return
    const existing = pendingRescans.get(sessionId)
    if (existing !== undefined) clearTimeout(existing)
    const timer = setTimeout(() => {
      pendingRescans.delete(sessionId)
      try {
        void backfill.rescanSession(ctx.sessionQuery, ledger, sessionId, abort.signal, timings)
      } catch (error) {
        rememberError(error)
      }
    }, 2000)
    timer.unref?.()
    pendingRescans.set(sessionId, timer)
  }

  // --- live exact capture (M3): monotonic boundaries per agent-loop stream ---
  // Durable settlement stays canonical; captures are a second fact joined by
  // settlement seq, exactly like usage-center, so backfill can never duplicate.
  const pendingCaptures = new Map()
  const pendingTimings = new Map()
  ctx.on('llm/stream', (options, next) => captureStream(options, next, (capture) => {
    try {
      const sessionId = options.sessionId
      if (!isAgentLoopRequest(options) || typeof sessionId !== 'string' || sessionId === '') return
      const queue = pendingCaptures.get(sessionId)
      if (queue === undefined) pendingCaptures.set(sessionId, [capture])
      else queue.push(capture)
    } catch (error) {
      rememberError(error)
    }
  }), { global: true, prepend: true })

  ctx.on('session/event', (session, event) => {
    try {
      const sessionId = session?.id
      if (event?.type === 'assistant/message' || event?.type === 'assistant/attempt') {
        // FIFO join: settlements arrive in stream order per session.
        const queue = pendingCaptures.get(sessionId)
        const capture = queue?.shift()
        if (queue !== undefined && queue.length === 0) pendingCaptures.delete(sessionId)
        if (capture !== undefined && Number.isSafeInteger(event?.seq)) {
          const bySeq = pendingTimings.get(sessionId) ?? new Map()
          bySeq.set(event.seq, capture)
          pendingTimings.set(sessionId, bySeq)
        }
        // Progressive refold (TP-R2-01): settled steps appear while the turn
        // is still running, not only after turn/end.
        scheduleRescan(sessionId, pendingTimings.get(sessionId))
        return
      }
      if (event?.type === 'turn/start' || event?.type === 'step/end') {
        // turn/start makes the open turn row visible immediately; step/end
        // lands tool intervals before the next settlement.
        scheduleRescan(sessionId, pendingTimings.get(sessionId))
        return
      }
      if (event?.type !== 'turn/end') return
      const timings = pendingTimings.get(sessionId)
      pendingTimings.delete(sessionId)
      pendingCaptures.delete(sessionId)
      scheduleRescan(sessionId, timings)
    } catch (error) {
      rememberError(error)
    }
  }, { global: true })

  // --- session titles (batch, failure-isolated; titles are cosmetic) ---
  async function titlesFor(sessionIds) {
    const titles = new Map()
    if (sessionIds.length === 0) return titles
    try {
      if (typeof ctx.sessionQuery.readTitleSnapshots !== 'function') return titles
      const results = await ctx.sessionQuery.readTitleSnapshots(sessionIds, abort.signal)
      for (const result of results) {
        if (result?.status !== 'fulfilled') continue
        // Deployed builds return value.title as a SessionTitleSnapshot object
        // ({ title, messageSeqs, source, eventSeq, updatedAt }); older shapes
        // may carry the plain string. Accept both.
        const raw = result.value?.title
        const text = typeof raw === 'string' ? raw : raw && typeof raw.title === 'string' ? raw.title : null
        if (text !== null && text !== '') titles.set(String(result.sessionId), text)
      }
    } catch {
      // Titles never fail a data response.
    }
    return titles
  }

  function workspacesSnapshot() {
    try {
      return ctx.workspaceRegistry.list().map(workspace => ({
        id: String(workspace.id),
        title: workspace.title,
        path: workspace.path,
      }))
    } catch {
      return []
    }
  }

  const routes = [
    ctx.connection.fetch.register({
      path: '/api/turn-profiler/status',
      methods: ['GET', 'HEAD'],
      requestBody: 'buffered',
      fetch: route(() => {
        const scan = backfill.snapshot()
        const stats = ledger.stats()
        return {
          installedAt: ledger.installedAt,
          generatedAt: Date.now(),
          scan,
          liveErrorCount: liveState.errors,
          liveLastError: liveState.lastError,
          ledger: stats,
          etag: `${scan.phase}:${scan.scannedSessions}:${scan.skippedSessions}:${scan.errorCount}:${scan.rescans}:${liveState.errors}:${stats.turns}:${stats.steps}:${stats.toolCalls}`,
        }
      }),
    }),
    ctx.connection.fetch.register({
      path: '/api/turn-profiler/sessions',
      methods: ['GET', 'HEAD'],
      requestBody: 'buffered',
      fetch: route(async (request) => {
        const query = params(request)
        const filters = normalizeFilters({
          from: query.get('from') ?? undefined,
          to: query.get('to') ?? undefined,
          workspace: query.get('workspace') ?? undefined,
        })
        const { sessions, etag } = ledger.listSessions(filters)
        const titles = await titlesFor(sessions.map(row => row.session_id))
        const titled = sessions.map(row => ({ ...row, title: titles.get(row.session_id) ?? null }))
        return {
          sessions: titled,
          workspaces: workspacesSnapshot(),
          filters,
          etag: `${etag}:${titled.map(row => row.title ?? '').join('|')}`,
        }
      }),
    }),
    ctx.connection.fetch.register({
      path: '/api/turn-profiler/summary',
      methods: ['GET', 'HEAD'],
      requestBody: 'buffered',
      fetch: route((request) => {
        const query = params(request)
        return ledger.summary({
          from: query.get('from') ?? undefined,
          to: query.get('to') ?? undefined,
          workspace: query.get('workspace') ?? undefined,
          provider: query.get('provider') ?? undefined,
          model: query.get('model') ?? undefined,
        }, { topN: 10 })
      }),
    }),
    ctx.connection.fetch.register({
      path: '/api/turn-profiler/export.json',
      methods: ['GET', 'HEAD'],
      requestBody: 'buffered',
      fetch: async (request) => {
        const head = request.method === 'HEAD'
        try {
          const query = params(request)
          const filters = normalizeFilters({
            from: query.get('from') ?? undefined,
            to: query.get('to') ?? undefined,
            workspace: query.get('workspace') ?? undefined,
            provider: query.get('provider') ?? undefined,
            model: query.get('model') ?? undefined,
          })
          const summary = ledger.summary(filters, { topN: 50 })
          const { sessions } = ledger.listSessions(filters)
          const turns = []
          for (let offset = 0; offset < 2000; offset += 200) {
            const page = ledger.turnsPage(filters, { offset, limit: 200, sort: 'started_at', dir: 'desc' })
            turns.push(...page.turns)
            if (turns.length >= page.total) break
          }
          const { etag, ...summaryPayload } = summary
          return downloadResponse({
            plugin: 'dsh-turn-profiler',
            schema: 1,
            exportedAt: new Date().toISOString(),
            filters,
            summary: summaryPayload,
            sessions,
            turns,
          }, 'turn-profiler.json', head)
        } catch (error) {
          return errorResponse(error, head)
        }
      },
    }),
    ctx.connection.fetch.register({
      path: '/api/turn-profiler/turns',
      methods: ['GET', 'HEAD'],
      requestBody: 'buffered',
      fetch: route((request) => {
        const query = params(request)
        const filters = normalizeFilters({
          session: query.get('session') ?? undefined,
          from: query.get('from') ?? undefined,
          to: query.get('to') ?? undefined,
          workspace: query.get('workspace') ?? undefined,
        })
        const page = normalizePage({
          offset: query.get('offset') ?? undefined,
          limit: query.get('limit') ?? undefined,
          sort: query.get('sort') ?? undefined,
          dir: query.get('dir') ?? undefined,
        })
        return ledger.turnsPage(filters, page)
      }),
    }),
    ctx.connection.fetch.register({
      path: '/api/turn-profiler/waterfall',
      methods: ['GET', 'HEAD'],
      requestBody: 'buffered',
      fetch: route((request) => {
        const query = params(request)
        const session = query.get('session')
        const turn = query.get('turn')
        if (session === null || turn === null) throw new TypeError('session and turn are required')
        return ledger.waterfall(session, turn)
      }),
    }),
  ]

  void backfill.run(ctx.sessionQuery, ledger, abort.signal)

  ctx.effect(() => () => {
    abort.abort(new Error('turn-profiler disposed'))
    for (const timer of pendingRescans.values()) clearTimeout(timer)
    pendingRescans.clear()
    for (const dispose of routes) void dispose()
    ledger.close()
  }, 'turn-profiler: persistence and routes')
}
