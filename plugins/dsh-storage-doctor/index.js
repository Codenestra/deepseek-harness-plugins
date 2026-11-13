/**
 * DeepSeek Harness Storage Doctor host plugin.
 *
 * M1: strictly read-only inspection. M2 adds the safe cleanup chain:
 * preview (one-shot previewId) -> clean (move into the plugin trash) ->
 * restore / purge. Cleanup never deletes directly: every item is moved into
 * `<home>/.storage-doctor/trash/<batch>/` with a manifest, and the hard-coded
 * blacklist plus live/24h session protection are re-checked on every move.
 */

import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { isAbsolute, join } from 'node:path'
import { StorageDoctorLedger } from './lib/ledger.js'
import z from '@deepseek-ai/schemastery'
import { buildPreview, normalizePolicy } from './lib/policy.js'
import { gcReport, normalizeGcDays } from './lib/gc.js'
import { DEFAULT_TOP_FILE_THRESHOLD, scanHome } from './lib/scan.js'
import { TrashManager } from './lib/trash.js'

export const name = 'storage-doctor'
// 'timer' is required by cordis' context proxy: touching the mixed-in
// ctx.interval without declaring it throws "cannot get property without
// inject". The desktop base bundle always ships cordis:timer; the typeof
// guard below still keeps mock contexts (tests) and timer-less runtimes on
// the manual-scan path (design.md §4.3).
export const inject = ['sessionQuery', 'connection', 'profileContext', 'timer']

/**
 * Row-config schema (native schemastery): validated at activation, and the
 * fields marked `.volatile()` are projected by the host settings service into
 * the native configuration form (Plugins page → the row's 配置/Configure
 * control) — edits there take effect WITHOUT a restart, which is why apply()
 * re-reads them at every point of use. `home`, `databasePath` and
 * `autoScanIntervalHours` stay non-volatile: they are remount-class (identity
 * and timer registration) and remain editable only via cordis.patch.yml +
 * restart.
 */
export const Config = z.object({
  home: z.string().required(false)
    .description('Absolute DSH home to inspect. Default: $DSH_HOME or ~/.dsh. (YAML-only; restart required.)'),
  databasePath: z.string().required(false)
    .description('Absolute path of the sqlite ledger. Default: <profile dir>/storage-doctor/storage-doctor.sqlite. (YAML-only; restart required.)'),
  topFileThreshold: z.number().min(0).required(false).volatile()
    .description('Bytes; single files at or above this enter the large-file ranking (default 52428800 = 50 MB).'),
  autoScanIntervalHours: z.number().min(0).max(8760).default(24)
    .description('Periodic scan interval in hours; 0 disables periodic scans (manual only). (YAML-only; restart required.)'),
  trashRetentionDays: z.number().min(0).max(3650).default(7).volatile()
    .description('Days before trashed batches are auto-purged; 0 disables auto-purge. Only the plugin’s own trash is touched.'),
  attachmentGc: z.boolean().default(false).volatile()
    .description('EXPERIMENTAL attachment GC (attachments/v1/objects). Off by default; manual dry-run first; fail-closed on any corpus parse failure.'),
  attachmentGcDays: z.number().step(1).min(1).max(3650).default(30).volatile()
    .description('Age in days before an unreferenced attachment object becomes a GC candidate.'),
})

/** DSH home resolution: explicit plugin config (debug) > $DSH_HOME > ~/.dsh (design.md §2). */
function resolveHome(config) {
  if (config?.home !== undefined) {
    if (typeof config.home !== 'string' || !isAbsolute(config.home)) {
      throw new TypeError('storage-doctor: home must be an absolute path')
    }
    return config.home
  }
  return process.env.DSH_HOME || join(homedir(), '.dsh')
}

function databasePath(ctx, config) {
  if (config?.databasePath !== undefined) {
    if (typeof config.databasePath !== 'string' || !isAbsolute(config.databasePath)) {
      throw new TypeError('storage-doctor: databasePath must be an absolute path')
    }
    return config.databasePath
  }
  return join(ctx.profileContext.dir, 'storage-doctor', 'storage-doctor.sqlite')
}

function normalizeTopFileThreshold(value) {
  if (value === undefined || value === null) return DEFAULT_TOP_FILE_THRESHOLD
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0) {
    throw new TypeError('storage-doctor: topFileThreshold must be a non-negative finite number')
  }
  return number
}

function normalizeHistoryLimit(value) {
  if (value === undefined || value === null || value === '') return 200
  const number = Number(value)
  if (!Number.isSafeInteger(number) || number < 1 || number > 2000) {
    throw new TypeError('storage-doctor: history limit must be an integer in [1, 2000]')
  }
  return number
}

/** Non-negative hours; 0 disables periodic scans. */
function normalizeIntervalHours(value) {
  if (value === undefined || value === null) return 24
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0 || number > 8760) {
    throw new TypeError('storage-doctor: autoScanIntervalHours must be a finite number in [0, 8760]')
  }
  return number
}

/** Non-negative days; 0 disables the automatic trash expiry purge. */
function normalizeRetentionDays(value) {
  if (value === undefined || value === null) return 7
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0 || number > 3650) {
    throw new TypeError('storage-doctor: trashRetentionDays must be a finite number in [0, 3650]')
  }
  return number
}

function jsonResponse(value, status = 200, head = false) {
  const body = JSON.stringify(value)
  return new Response(head ? null : body, {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-length': String(Buffer.byteLength(body)),
      'cache-control': 'no-store',
    },
  })
}

/** Typed state errors (mapped to their own client-readable error codes). */
function codedError(code, message, extra) {
  const error = new Error(message)
  error.code = code
  if (extra !== undefined) Object.assign(error, extra)
  return error
}

const CODED_ERROR_STATUSES = new Set(['RESTORE_CONFLICT', 'GC_DISABLED', 'GC_CORPUS_INCOMPLETE'])

function errorResponse(error, head = false) {
  const invalid = error instanceof TypeError
  const coded = typeof error?.code === 'string' && CODED_ERROR_STATUSES.has(error.code) ? error.code : null
  const code = invalid ? 'INVALID_REQUEST' : coded ?? 'DOCTOR_ERROR'
  return jsonResponse({
    error: {
      code,
      message: error instanceof Error ? error.message : String(error),
      ...(code === 'RESTORE_CONFLICT' && Array.isArray(error.conflicts) ? { conflicts: error.conflicts } : {}),
      ...(code === 'GC_CORPUS_INCOMPLETE' ? {
        incompleteReason: error.incompleteReason ?? null,
        failures: Array.isArray(error.failures) ? error.failures : [],
      } : {}),
    },
  }, code === 'DOCTOR_ERROR' ? 500 : 400, head)
}

/** Trim a completed scan to what the overview view shows (no per-session detail). */
function serializeOverview(result) {
  return {
    at: result.at,
    durationMs: result.durationMs,
    totalBytes: result.totalBytes,
    totalFiles: result.totalFiles,
    dirsWalked: result.dirsWalked,
    symlinksSkipped: result.symlinksSkipped,
    categories: result.categories,
    topFiles: result.topFiles.slice(0, 20),
    pluginData: result.pluginData.slice(0, 30),
    errorCount: result.errorCount,
    errors: result.errors.slice(0, 10),
    partial: false,
  }
}

/** Trim a policy preview to the cleanup view's payload. */
function serializePreview(preview, cleanableOverflow) {
  return {
    at: preview.at,
    policy: preview.policy,
    cleanableOverflow,
    candidateBytes: preview.candidates.reduce((sum, candidate) => sum + candidate.bytes, 0),
    candidates: preview.candidates.slice(0, 500),
    candidateCount: preview.candidates.length,
    protected: preview.protected.slice(0, 500),
    protectedCount: preview.protected.length,
  }
}

async function readJsonBody(request) {
  let body
  try {
    body = await request.json()
  } catch {
    throw new TypeError('storage-doctor: request body must be a JSON object')
  }
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new TypeError('storage-doctor: request body must be a JSON object')
  }
  return body
}

/** Manifest item list of one trash batch, or null when absent/unreadable. */
function readBatchItems(home, id) {
  try {
    const manifest = JSON.parse(readFileSync(join(home, '.storage-doctor', 'trash', id, 'manifest.json'), 'utf8'))
    return Array.isArray(manifest.items) ? manifest.items : null
  } catch {
    return null
  }
}

/**
 * Unwrap one config value: volatile fields (`.volatile()` in Config) arrive as
 * live cells the settings form can update WITHOUT remounting this plugin, so
 * they must be re-read at every point of use. Plain values (tests, non-volatile
 * YAML config) pass through untouched.
 */
function cellValue(value) {
  return value !== null && typeof value === 'object' && typeof value.get === 'function' ? value.get() : value
}

export function apply(ctx, config = {}) {
  const home = resolveHome(config)
  const ledger = new StorageDoctorLedger(databasePath(ctx, config))
  const persistedSnapshot = ledger.latestScan()
  const trash = new TrashManager({ home })
  const autoScanIntervalHours = normalizeIntervalHours(config.autoScanIntervalHours)

  // Live readers for the four volatile fields (settings-form editable, effective
  // without restart). The normalize* call at activation stays the fail-fast check.
  const topFileThresholdNow = () => normalizeTopFileThreshold(cellValue(config.topFileThreshold))
  const retentionDaysNow = () => normalizeRetentionDays(cellValue(config.trashRetentionDays))
  const gcEnabledNow = () => {
    const value = cellValue(config.attachmentGc)
    if (value !== undefined && typeof value !== 'boolean') {
      throw new TypeError('storage-doctor: attachmentGc must be a boolean (default false)')
    }
    return value === true
  }
  const gcDaysNow = () => normalizeGcDays(cellValue(config.attachmentGcDays))
  topFileThresholdNow()
  retentionDaysNow()
  gcEnabledNow()
  gcDaysNow()

  /** Previews are one-shot and expire after ten minutes (design.md §5.2). */
  const PREVIEW_TTL_MS = 10 * 60 * 1000
  const previews = new Map()
  const sweepPreviews = () => {
    const now = Date.now()
    for (const [id, entry] of previews) {
      if (now - entry.at > PREVIEW_TTL_MS) previews.delete(id)
    }
  }
  /** GC dry-run previews: separate one-shot map, same TTL. */
  const gcPreviews = new Map()
  const sweepGcPreviews = () => {
    const now = Date.now()
    for (const [id, entry] of gcPreviews) {
      if (now - entry.at > PREVIEW_TTL_MS) gcPreviews.delete(id)
    }
  }

  const liveState = { errors: 0, lastError: null }
  const rememberError = (error) => {
    liveState.errors += 1
    liveState.lastError = error instanceof Error ? error.message : String(error)
  }

  /** Last completed in-memory scan; null until this process finishes one. */
  let lastResult = null
  let lastScanAt = persistedSnapshot?.at ?? null
  /** One scan at a time: { startedAt, controller, progress, promise } while running. */
  let running = null

  const scanStatus = () => ({
    home,
    running: running !== null,
    runningSince: running === null ? null : running.startedAt,
    progress: running === null ? null : { ...running.progress },
    lastScanAt,
    errorCount: liveState.errors,
    lastError: liveState.lastError,
    autoScan: {
      intervalHours: autoScanIntervalHours,
      scheduled: disposeInterval !== null,
      // Display the live volatile value without normalizing: /status must keep
      // reporting even while the raw config momentarily holds garbage.
      retentionDays: cellValue(config.trashRetentionDays) ?? 7,
      ...(intervalError === null ? {} : { error: intervalError }),
    },
  })

  const startScan = () => {
    if (running !== null) return false
    const controller = new AbortController()
    const current = { startedAt: Date.now(), controller, progress: { dirsWalked: 0, filesCounted: 0 } }
    current.promise = (async () => {
      try {
        const result = await scanHome(home, {
          signal: controller.signal,
          topFileThreshold: topFileThresholdNow(),
          onProgress: progress => Object.assign(current.progress, progress),
        })
        if (result.aborted) return null
        lastResult = result
        lastScanAt = result.at
        ledger.recordScan(result)
        return result
      } catch (error) {
        rememberError(error)
        return null
      } finally {
        if (running === current) running = null
      }
    })()
    running = current
    return true
  }

  /** Await a fresh completed scan (joins an in-flight one instead of starting a second). */
  const ensureScan = async () => {
    if (running !== null) return running.promise
    startScan()
    return running === null ? lastResult : running.promise
  }

  /** Session corpus + titles via the official query service (never raw log reads). */
  const collectSessionMeta = async (sessionIds = []) => {
    const records = await ctx.sessionQuery.listSessions()
    const sessions = records.map(record => ({ id: String(record.header.id), live: record.live === true }))
    const titles = {}
    const unique = [...new Set(sessionIds.filter(id => typeof id === 'string' && id !== ''))]
    if (unique.length > 0 && typeof ctx.sessionQuery.readTitleSnapshots === 'function') {
      const results = await ctx.sessionQuery.readTitleSnapshots(unique)
      for (const result of results) {
        if (result?.status === 'fulfilled' && result.value?.title?.text !== undefined) {
          titles[String(result.sessionId)] = String(result.value.title.text)
        }
      }
    }
    return { sessions, titles }
  }

  /** Trash expiry: the only automatic deletion, and it only touches our own trash. */
  const expireTrash = () => {
    const days = retentionDaysNow()
    if (days <= 0) return []
    const { purged } = trash.purgeExpired({ days })
    for (const id of purged) ledger.setBatchStatus(id, 'purged')
    return purged
  }

  const periodicTick = () => {
    try {
      expireTrash()
    } catch (error) {
      rememberError(error)
    }
    void ensureScan().catch(() => {})
  }

  // The cordis timer service mixes ctx.interval into the context when present;
  // without it — or if registering throws inside the host — the plugin degrades
  // to purely manual scans instead of failing the whole entry (design.md §4.3).
  let disposeInterval = null
  let intervalError = null
  if (autoScanIntervalHours > 0 && typeof ctx.interval === 'function') {
    try {
      disposeInterval = ctx.interval(periodicTick, autoScanIntervalHours * 3_600_000) ?? null
    } catch (error) {
      disposeInterval = null
      intervalError = error instanceof Error ? error.message : String(error)
    }
  }
  try {
    expireTrash()
  } catch (error) {
    rememberError(error)
  }

  const routes = [
    ctx.connection.fetch.register({
      path: '/api/storage-doctor/overview',
      methods: ['GET', 'HEAD'],
      requestBody: 'buffered',
      fetch: async (request) => {
        const head = request.method === 'HEAD'
        try {
          const overview = lastResult !== null ? serializeOverview(lastResult) : persistedSnapshot
          return jsonResponse({ home, scan: scanStatus(), overview }, 200, head)
        } catch (error) {
          return errorResponse(error, head)
        }
      },
    }),
    ctx.connection.fetch.register({
      path: '/api/storage-doctor/scan',
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async () => {
        try {
          const started = startScan()
          return jsonResponse({ started, scan: scanStatus() })
        } catch (error) {
          return errorResponse(error)
        }
      },
    }),
    ctx.connection.fetch.register({
      path: '/api/storage-doctor/status',
      methods: ['GET', 'HEAD'],
      requestBody: 'buffered',
      fetch: async (request) => {
        const head = request.method === 'HEAD'
        try {
          return jsonResponse({ scan: scanStatus() }, 200, head)
        } catch (error) {
          return errorResponse(error, head)
        }
      },
    }),
    ctx.connection.fetch.register({
      path: '/api/storage-doctor/history',
      methods: ['GET', 'HEAD'],
      requestBody: 'buffered',
      fetch: async (request) => {
        const head = request.method === 'HEAD'
        try {
          const limit = normalizeHistoryLimit(new URL(request.url).searchParams.get('limit') ?? undefined)
          return jsonResponse({ history: ledger.history(limit) }, 200, head)
        } catch (error) {
          return errorResponse(error, head)
        }
      },
    }),
    ctx.connection.fetch.register({
      path: '/api/storage-doctor/trend',
      methods: ['GET', 'HEAD'],
      requestBody: 'buffered',
      fetch: async (request) => {
        const head = request.method === 'HEAD'
        try {
          const limit = normalizeHistoryLimit(new URL(request.url).searchParams.get('limit') ?? undefined)
          return jsonResponse({ trend: ledger.trend(limit), autoScan: scanStatus().autoScan }, 200, head)
        } catch (error) {
          return errorResponse(error, head)
        }
      },
    }),
    ctx.connection.fetch.register({
      path: '/api/storage-doctor/preview',
      methods: ['GET', 'HEAD'],
      requestBody: 'buffered',
      fetch: async (request) => {
        const head = request.method === 'HEAD'
        try {
          const params = new URL(request.url).searchParams
          const policy = normalizePolicy({
            sessionsDays: params.get('sessionsDays') ?? undefined,
            logsDays: params.get('logsDays') ?? undefined,
            tmpHours: params.get('tmpHours') ?? undefined,
            models: params.get('models') ?? undefined,
          })
          const result = await ensureScan()
          if (result === null) throw new Error('storage-doctor: scan failed; see /status for details')
          const corpusMeta = await collectSessionMeta()
          const untitled = buildPreview(result, corpusMeta, policy)
          const sessionIds = [...untitled.candidates, ...untitled.protected]
            .filter(entry => entry.kind === 'session')
            .map(entry => entry.relPath.split('/').pop())
          const meta = sessionIds.length === 0 ? corpusMeta : await collectSessionMeta(sessionIds)
          const preview = buildPreview(result, meta, policy)
          sweepPreviews()
          const previewId = randomUUID()
          previews.set(previewId, { at: Date.now(), preview })
          return jsonResponse({
            previewId,
            expiresAt: previews.get(previewId).at + PREVIEW_TTL_MS,
            preview: serializePreview(preview, result.cleanableOverflow),
            scan: scanStatus(),
          }, 200, head)
        } catch (error) {
          return errorResponse(error, head)
        }
      },
    }),
    ctx.connection.fetch.register({
      path: '/api/storage-doctor/clean',
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          const body = await readJsonBody(request)
          const { previewId, selected } = body
          if (typeof previewId !== 'string' || previewId === '') {
            throw new TypeError('storage-doctor: clean requires the previewId of a confirmed preview')
          }
          const entry = previews.get(previewId)
          // One-shot: consumed even when the move later fails, so a preview can
          // never be replayed against a changed disk state.
          previews.delete(previewId)
          if (entry === undefined) throw new TypeError('storage-doctor: unknown or expired previewId')
          if (Date.now() - entry.at > PREVIEW_TTL_MS) throw new TypeError('storage-doctor: preview expired, build a new one')
          if (!Array.isArray(selected) || selected.length === 0) {
            throw new TypeError('storage-doctor: selected must be a non-empty array of preview paths')
          }
          const allowed = new Map(entry.preview.candidates.map(candidate => [candidate.relPath, candidate]))
          const items = []
          for (const relPath of selected) {
            const candidate = allowed.get(relPath)
            if (candidate === undefined) {
              throw new TypeError(`storage-doctor: path is not a selectable candidate of this preview: ${relPath}`)
            }
            items.push({ relPath: candidate.relPath, bytes: candidate.bytes, kind: candidate.kind })
          }
          const batch = await trash.clean(items, { policy: entry.preview.policy })
          const movedBytes = batch.manifest.items
            .filter(item => item.status === 'trashed')
            .reduce((sum, item) => sum + item.bytes, 0)
          ledger.recordBatch({
            id: batch.id,
            at: batch.manifest.at,
            policy: entry.preview.policy,
            itemCount: batch.manifest.items.length,
            bytes: movedBytes,
            status: 'trashed',
          })
          return jsonResponse({
            batchId: batch.id,
            moved: batch.moved,
            movedBytes,
            skipped: batch.skipped,
            scan: scanStatus(),
          })
        } catch (error) {
          return errorResponse(error)
        }
      },
    }),
    ctx.connection.fetch.register({
      path: '/api/storage-doctor/trash',
      methods: ['GET', 'HEAD'],
      requestBody: 'buffered',
      fetch: async (request) => {
        const head = request.method === 'HEAD'
        try {
          const disk = new Map(trash.listBatches().map(batch => [batch.id, batch]))
          const rows = ledger.batches(200)
          const batches = rows.map(row => ({
            ...row,
            onDisk: disk.get(row.id) ?? null,
            items: readBatchItems(home, row.id),
          }))
          for (const [id, batch] of disk) {
            if (!rows.some(row => row.id === id)) {
              batches.push({ ...batch, onDisk: batch, items: readBatchItems(home, id) })
            }
          }
          batches.sort((left, right) => (right.at ?? 0) - (left.at ?? 0))
          return jsonResponse({ batches }, 200, head)
        } catch (error) {
          return errorResponse(error, head)
        }
      },
    }),
    ctx.connection.fetch.register({
      path: '/api/storage-doctor/restore',
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          const body = await readJsonBody(request)
          if (typeof body.batchId !== 'string' || body.batchId === '') {
            throw new TypeError('storage-doctor: restore requires a batchId')
          }
          const restored = await trash.restore(body.batchId)
          ledger.setBatchStatus(body.batchId, 'restored')
          return jsonResponse({ batchId: body.batchId, status: 'restored', restored: restored.restored })
        } catch (error) {
          return errorResponse(error)
        }
      },
    }),
    ctx.connection.fetch.register({
      path: '/api/storage-doctor/purge',
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          const body = await readJsonBody(request)
          if (typeof body.batchId !== 'string' || body.batchId === '') {
            throw new TypeError('storage-doctor: purge requires a batchId')
          }
          await trash.purge(body.batchId, { confirm: body.confirm })
          ledger.setBatchStatus(body.batchId, 'purged')
          return jsonResponse({ batchId: body.batchId, status: 'purged' })
        } catch (error) {
          return errorResponse(error)
        }
      },
    }),
    // ---- M4 experimental attachment GC (off unless config.attachmentGc) ----
    ctx.connection.fetch.register({
      path: '/api/storage-doctor/gc',
      methods: ['GET', 'HEAD'],
      requestBody: 'buffered',
      fetch: async (request) => {
        const head = request.method === 'HEAD'
        try {
          // The dry-run report is read-only and always available; it states
          // honestly whether the plugin is allowed to act on it. The days
          // default comes from the (volatile) config, a query param overrides.
          const params = new URL(request.url).searchParams
          const days = params.get('days') === null ? gcDaysNow() : normalizeGcDays(params.get('days'))
          const report = await gcReport({ home, enabled: gcEnabledNow(), days })
          return jsonResponse({ gc: report }, 200, head)
        } catch (error) {
          return errorResponse(error, head)
        }
      },
    }),
    ctx.connection.fetch.register({
      path: '/api/storage-doctor/gc/preview',
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          const body = await readJsonBody(request)
          if (!gcEnabledNow()) {
            throw codedError('GC_DISABLED', 'storage-doctor: attachment GC is experimental and disabled (config attachmentGc=false)')
          }
          const days = body.days === undefined ? gcDaysNow() : normalizeGcDays(body.days)
          const report = await gcReport({ home, enabled: true, days })
          if (!report.complete) {
            throw codedError(
              'GC_CORPUS_INCOMPLETE',
              `storage-doctor: reference corpus incomplete (${report.incompleteReason}); refusing to select candidates`,
              { incompleteReason: report.incompleteReason, failures: report.failures },
            )
          }
          sweepGcPreviews()
          const gcPreviewId = randomUUID()
          gcPreviews.set(gcPreviewId, { at: Date.now(), report })
          return jsonResponse({
            gcPreviewId,
            expiresAt: gcPreviews.get(gcPreviewId).at + PREVIEW_TTL_MS,
            gc: { ...report, candidates: report.candidates.slice(0, 500) },
          })
        } catch (error) {
          return errorResponse(error)
        }
      },
    }),
    ctx.connection.fetch.register({
      path: '/api/storage-doctor/gc/clean',
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          const body = await readJsonBody(request)
          if (!gcEnabledNow()) {
            throw codedError('GC_DISABLED', 'storage-doctor: attachment GC is experimental and disabled (config attachmentGc=false)')
          }
          const { gcPreviewId, selected } = body
          if (typeof gcPreviewId !== 'string' || gcPreviewId === '') {
            throw new TypeError('storage-doctor: gc/clean requires the gcPreviewId of a confirmed dry-run preview')
          }
          const entry = gcPreviews.get(gcPreviewId)
          // One-shot, like every other preview: consumed even if the move fails.
          gcPreviews.delete(gcPreviewId)
          if (entry === undefined) throw new TypeError('storage-doctor: unknown or expired gcPreviewId')
          if (Date.now() - entry.at > PREVIEW_TTL_MS) throw new TypeError('storage-doctor: gc preview expired, run a new dry-run')
          if (!Array.isArray(selected) || selected.length === 0) {
            throw new TypeError('storage-doctor: selected must be a non-empty array of gc preview paths')
          }
          // Approved race protection: rebuild the corpus at clean time and move
          // ONLY objects that are still unreferenced, still aged, still present.
          const fresh = await gcReport({ home, enabled: true, days: entry.report.days })
          if (!fresh.complete) {
            throw codedError(
              'GC_CORPUS_INCOMPLETE',
              `storage-doctor: reference corpus incomplete at clean time (${fresh.incompleteReason}); nothing moved`,
              { incompleteReason: fresh.incompleteReason, failures: fresh.failures },
            )
          }
          const wasCandidate = new Map(entry.report.candidates.map(candidate => [candidate.relPath, candidate]))
          const stillCandidate = new Map(fresh.candidates.map(candidate => [candidate.relPath, candidate]))
          const items = []
          const skipped = []
          for (const relPath of selected) {
            if (typeof relPath !== 'string' || !wasCandidate.has(relPath)) {
              throw new TypeError(`storage-doctor: path is not a selectable candidate of this gc preview: ${relPath}`)
            }
            const candidate = stillCandidate.get(relPath)
            if (candidate === undefined) {
              skipped.push({ relPath, reason: 'reference-reappeared-or-state-changed' })
              continue
            }
            items.push({ relPath: candidate.relPath, bytes: candidate.bytes, kind: 'attachment-object' })
          }
          if (items.length === 0) {
            return jsonResponse({ batchId: null, moved: 0, movedBytes: 0, skipped, scan: scanStatus() })
          }
          const policy = { attachmentGc: true, attachmentGcDays: fresh.days }
          const batch = await trash.clean(items, { policy })
          const movedBytes = batch.manifest.items
            .filter(item => item.status === 'trashed')
            .reduce((sum, item) => sum + item.bytes, 0)
          ledger.recordBatch({
            id: batch.id,
            at: batch.manifest.at,
            policy,
            itemCount: batch.manifest.items.length,
            bytes: movedBytes,
            status: 'trashed',
          })
          return jsonResponse({
            batchId: batch.id,
            moved: batch.moved,
            movedBytes,
            skipped: [...skipped, ...(Array.isArray(batch.skipped) ? batch.skipped : [])],
            scan: scanStatus(),
          })
        } catch (error) {
          return errorResponse(error)
        }
      },
    }),
  ]

  ctx.effect(() => () => {
    // Disposal cancels an in-flight scan (it is read-only, so aborting is safe),
    // stops the periodic timer, unregisters routes, and closes the ledger.
    running?.controller.abort(new Error('storage-doctor disposed'))
    disposeInterval?.()
    for (const dispose of routes) void dispose()
    ledger.close()
  }, 'storage-doctor: persistence and routes')
}
