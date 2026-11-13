/** DeepSeek Harness Usage Center host plugin. */

import { createHash, randomUUID } from 'node:crypto'
import { isAbsolute, join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { isAgentLoopRequest, isTokenDelta } from '@deepseek-ai/dsh-llm'
import { BackfillTracker } from './lib/backfill.js'
import { auxiliaryCaptureRow, scanSessionSnapshot } from './lib/events.js'
import { UsageLedger, normalizeFilters } from './lib/ledger.js'
import { CURRENCY, normalizePricing } from './lib/pricing.js'

export const name = 'usage-center'
export const inject = ['llm', 'sessionQuery', 'connection', 'profileContext', 'workspaceRegistry']

function databasePath(ctx, config) {
  if (config?.databasePath !== undefined) {
    if (typeof config.databasePath !== 'string' || !isAbsolute(config.databasePath)) {
      throw new TypeError('usage-center: databasePath must be an absolute path')
    }
    return config.databasePath
  }
  return join(ctx.profileContext.dir, 'usage-center', 'usage-center.sqlite')
}

function finishStatusChunk(chunk) {
  return chunk?.type === 'finish' ? chunk.reason : undefined
}

function captureStream(options, next, settle) {
  const downstream = next()
  return (async function* usageCenterCapture() {
    const startedAt = Date.now()
    const startedMono = performance.now()
    let firstTokenMono
    let lastUsage
    let finishReason
    let threw = false
    try {
      for await (const chunk of downstream) {
        const observedMono = performance.now()
        if (firstTokenMono === undefined && isTokenDelta(chunk)) firstTokenMono = observedMono
        if (chunk?.type === 'usage') lastUsage = chunk.usage
        finishReason = finishStatusChunk(chunk) ?? finishReason
        yield chunk
      }
    } catch (error) {
      threw = true
      throw error
    } finally {
      const endedMono = performance.now()
      const endedAt = Date.now()
      settle({
        callKey: `stream:${randomUUID()}`,
        provider: options.provider,
        model: options.model,
        sessionId: options.sessionId,
        purpose: options.purpose,
        startedAt,
        endedAt,
        llmMs: Math.max(0, endedMono - startedMono),
        ttftMs: firstTokenMono === undefined ? null : Math.max(0, firstTokenMono - startedMono),
        decodeMs: firstTokenMono === undefined ? null : Math.max(0, endedMono - firstTokenMono),
        usage: lastUsage,
        finishReason,
        threw,
      })
    }
  })()
}

function requestFilters(request) {
  const parameters = new URL(request.url).searchParams
  return normalizeFilters({
    from: parameters.get('from') ?? undefined,
    to: parameters.get('to') ?? undefined,
    workspace: parameters.get('workspace') ?? undefined,
    session: parameters.get('session') ?? undefined,
    provider: parameters.get('provider') ?? undefined,
    model: parameters.get('model') ?? undefined,
    group: parameters.get('group') ?? undefined,
    sessionState: parameters.get('sessionState') ?? undefined,
    timeZone: parameters.get('timeZone') ?? undefined,
  })
}

/** Detail-table window and search term from the same query string as the filters. */
function requestDetail(request) {
  const parameters = new URL(request.url).searchParams
  return {
    offset: parameters.get('offset') ?? undefined,
    limit: parameters.get('limit') ?? undefined,
    sort: parameters.get('sort') ?? undefined,
    dir: parameters.get('dir') ?? undefined,
    search: parameters.get('search') ?? undefined,
  }
}

function optionalPositive(value, field) {
  if (value === undefined || value === null) return undefined
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0) throw new TypeError(`budget.${field} must be a non-negative finite number`)
  return number
}

/** Validate the operator budget block; absent means "do not show a budget card". */
function normalizeBudget(value) {
  if (value === undefined || value === null) return null
  if (typeof value !== 'object' || Array.isArray(value)) throw new TypeError('budget must be an object')
  const daily = optionalPositive(value.daily, 'daily')
  const monthly = optionalPositive(value.monthly, 'monthly')
  if ((daily === undefined || daily === 0) && (monthly === undefined || monthly === 0)) return null
  return {
    currency: CURRENCY,
    ...(daily === undefined || daily === 0 ? {} : { daily }),
    ...(monthly === undefined || monthly === 0 ? {} : { monthly }),
  }
}

function groupingSnapshot(workspaceRegistry) {
  return {
    workspaces: workspaceRegistry.list().map(workspace => ({
      id: String(workspace.id),
      title: workspace.title,
      path: workspace.path,
      sessionIds: workspace.sessionIds.map(String),
    })),
    archivedSessionIds: workspaceRegistry.archivedSessionIds.map(String),
  }
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
function etagOf(payload) {
  return `W/"${createHash('sha1').update(String(payload.etag)).digest('hex')}"`
}

function errorResponse(error, head = false) {
  return jsonResponse({
    error: {
      code: error instanceof TypeError ? 'INVALID_FILTER' : 'USAGE_CENTER_ERROR',
      message: error instanceof Error ? error.message : String(error),
    },
  }, error instanceof TypeError ? 400 : 500, head)
}

function downloadResponse(body, contentType, filename, head) {
  return new Response(head ? null : body, {
    headers: {
      'content-type': contentType,
      'content-disposition': `attachment; filename="${filename}"`,
      'content-length': String(Buffer.byteLength(body)),
      'cache-control': 'no-store',
    },
  })
}

export function apply(ctx, config = {}) {
  const ledger = new UsageLedger(databasePath(ctx, config))
  const pricing = normalizePricing(config?.pricing)
  const budget = normalizeBudget(config?.budget)
  const backfill = new BackfillTracker(ledger.installedAt)
  const pending = new Map()
  const liveState = { errors: 0, lastError: null }

  const scanStatus = () => ({
    ...backfill.snapshot(),
    liveErrorCount: liveState.errors,
    liveLastError: liveState.lastError,
  })
  const rememberError = (error) => {
    liveState.errors += 1
    liveState.lastError = error instanceof Error ? error.message : String(error)
  }
  const enqueue = (sessionId, capture) => {
    const queue = pending.get(sessionId) ?? []
    queue.push(capture)
    if (queue.length > 32) queue.splice(0, queue.length - 32)
    pending.set(sessionId, queue)
  }
  const takePending = (sessionId) => {
    const queue = pending.get(sessionId)
    const capture = queue?.shift()
    if (queue?.length === 0) pending.delete(sessionId)
    return capture
  }

  ctx.on('llm/stream', (options, next) => captureStream(options, next, (capture) => {
    try {
      if (isAgentLoopRequest(options) && typeof options.sessionId === 'string') {
        enqueue(options.sessionId, capture)
      } else {
        ledger.recordCall(auxiliaryCaptureRow(capture))
      }
    } catch (error) {
      rememberError(error)
    }
  }), { global: true, prepend: true })

  // Durable settlement is the canonical identity. Exact live timing is an
  // optional second fact joined by that identity; backfill can never duplicate it.
  ctx.on('session/event', (session, event) => {
    if (event?.type !== 'assistant/message' && event?.type !== 'assistant/attempt') return
    try {
      const capture = takePending(session.id)
      const timings = capture === undefined ? new Map() : new Map([[event.seq, capture]])
      const snapshot = {
        session: session.header,
        inheritedEventCount: session.inheritedEventCount,
        // Public detached snapshot; inherited rows are removed by the scanner.
        events: session.snapshotEvents(),
      }
      ledger.recordScan(scanSessionSnapshot(snapshot, timings))
    } catch (error) {
      rememberError(error)
    }
  }, { global: true })

  const routes = [
    ctx.connection.fetch.register({
      path: '/api/usage-center/query',
      methods: ['GET', 'HEAD'],
      requestBody: 'buffered',
      fetch: async (request) => {
        const head = request.method === 'HEAD'
        try {
          const payload = ledger.dashboard(
            requestFilters(request),
            scanStatus(),
            groupingSnapshot(ctx.workspaceRegistry),
            { pricing, budget, detail: requestDetail(request) },
          )
          const etag = etagOf(payload)
          if (request.headers?.get?.('if-none-match') === etag) {
            return new Response(null, { status: 304, headers: { etag, 'cache-control': 'no-store' } })
          }
          return jsonResponse(payload, 200, head, etag)
        } catch (error) {
          return errorResponse(error, head)
        }
      },
    }),
    ctx.connection.fetch.register({
      path: '/api/usage-center/export.json',
      methods: ['GET', 'HEAD'],
      requestBody: 'buffered',
      fetch: async (request) => {
        const head = request.method === 'HEAD'
        try {
          return downloadResponse(
            ledger.exportJson(requestFilters(request), scanStatus(), groupingSnapshot(ctx.workspaceRegistry), pricing),
            'application/json; charset=utf-8',
            'usage-center.json',
            head,
          )
        } catch (error) {
          return errorResponse(error, head)
        }
      },
    }),
    ctx.connection.fetch.register({
      path: '/api/usage-center/export.csv',
      methods: ['GET', 'HEAD'],
      requestBody: 'buffered',
      fetch: async (request) => {
        const head = request.method === 'HEAD'
        try {
          return downloadResponse(
            ledger.exportCsv(requestFilters(request), groupingSnapshot(ctx.workspaceRegistry), pricing),
            'text/csv; charset=utf-8',
            'usage-center.csv',
            head,
          )
        } catch (error) {
          return errorResponse(error, head)
        }
      },
    }),
  ]

  const abort = new AbortController()
  void backfill.run(ctx.sessionQuery, ledger, abort.signal)
  ctx.effect(() => () => {
    abort.abort(new Error('usage-center disposed'))
    for (const dispose of routes) void dispose()
    ledger.close()
  }, 'usage-center: persistence and routes')
}
