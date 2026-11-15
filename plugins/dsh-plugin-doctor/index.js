/**
 * DeepSeek Harness Plugin Doctor — host plugin.
 * M1: read-only health overview (registry + fiber states + manifest diff).
 *
 * Data sources (all read-only):
 *   - ctx.registry            plugin runtimes and fiber states (verified)
 *   - ctx.loader.entries()    exact package-name ↔ entry mapping (supplemental, approved)
 *   - ctx.profileContext      profile dir/name + startedBundles (shipped-bundle guard)
 *   - profile package.json / node_modules package metadata (fs read only)
 *
 * M1 performs NO writes anywhere. Disable/restore actions arrive in M4 with
 * tests-first quadruple protection (backup + atomic write + bundles-only + confirm).
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { collectRuntimes, collectEntries, classify } from './lib/inspect.js'
import { extractRowNames } from './lib/bundle-rows.js'
import { evaluatePeer } from './lib/compat.js'
import { buildTimeline, scanDataFootprint } from './lib/history.js'
import { applyBundleAction } from './lib/actions.js'
import { openLedger } from './lib/ledger.js'

export const name = 'plugin-doctor'
export const inject = ['connection', 'profileContext']

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

function errorResponse(error, head = false) {
  return jsonResponse({
    error: {
      code: 'PLUGIN_DOCTOR_ERROR',
      message: error instanceof Error ? error.message : String(error),
    },
  }, 500, head)
}

export function apply(ctx, config = {}) {
  const profileDir = ctx.profileContext.dir
  const liveState = { errors: 0, lastError: null, lastScanAt: null }

  const rememberError = (error) => {
    liveState.errors += 1
    liveState.lastError = error instanceof Error ? error.message : String(error)
  }

  const readManifest = () => JSON.parse(readFileSync(join(profileDir, 'package.json'), 'utf8'))

  /**
   * Resolve a package directory the way app-boot's resolveBundleDir does:
   * installation anchor first (shipped bundles), then the profile. Read-only;
   * mirrors packages/boot/app-boot/src/profile.ts (verified source).
   */
  const installAnchor = typeof ctx.profileContext.installAnchor === 'string' ? ctx.profileContext.installAnchor : null
  const anchors = [installAnchor, join(profileDir, 'package.json')].filter(Boolean)
  const requireByAnchor = new Map()
  const resolvePackageDir = (pkg) => {
    for (const anchor of anchors) {
      let req = requireByAnchor.get(anchor)
      if (!req) {
        try { req = createRequire(anchor) } catch { continue }
        requireByAnchor.set(anchor, req)
      }
      let searchPaths
      try { searchPaths = req.resolve.paths(pkg) } catch { continue }
      for (const searchPath of searchPaths ?? []) {
        const candidate = join(searchPath, pkg)
        try {
          if (existsSync(join(candidate, 'package.json'))) return candidate
        } catch { /* keep searching */ }
      }
    }
    return null
  }

  /** Package metadata; null when unresolvable. Shipped bundles resolve via the install anchor. */
  const readPackageMeta = (pkg) => {
    try {
      const dir = resolvePackageDir(pkg) ?? join(profileDir, 'node_modules', pkg)
      const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
      return {
        version: typeof manifest.version === 'string' ? manifest.version : null,
        hasBundle: Boolean(manifest?.dsh?.bundle),
      }
    } catch {
      return null
    }
  }

  /** Full parsed package.json of a package (via the install anchor); null when unresolvable. */
  const readFullManifest = (pkg) => {
    try {
      const dir = resolvePackageDir(pkg)
      if (!dir) return null
      return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
    } catch {
      return null
    }
  }

  /**
   * Contributed row names of one container bundle, from its dsh.bundle.patch
   * file(s). null when the bundle is unresolvable or declares no patch.
   */
  const readBundleRows = (pkg) => {
    try {
      const dir = resolvePackageDir(pkg)
      if (!dir) return null
      const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
      const patch = manifest?.dsh?.bundle?.patch
      const patchPaths = Array.isArray(patch) ? patch : typeof patch === 'string' ? [patch] : []
      const names = []
      for (const rel of patchPaths) {
        if (typeof rel !== 'string') continue
        const file = join(dir, rel)
        if (!existsSync(file)) continue
        names.push(...extractRowNames(readFileSync(file, 'utf8')))
      }
      return [...new Set(names)]
    } catch {
      return null
    }
  }

  /** Active-service probe for PENDING diagnostics (cordis ReflectService.get). */
  const hasService = (serviceName) => {
    try {
      return ctx.reflect.get(serviceName, true) !== undefined
    } catch {
      return false
    }
  }

  const overview = () => {
    const startedAt = Date.now()
    const manifest = readManifest()
    const runtimes = collectRuntimes(ctx.registry)
    const entries = collectEntries(ctx.loader)
    const startedBundles = Array.isArray(ctx.profileContext.startedBundles)
      ? [...ctx.profileContext.startedBundles]
      : []
    const bundleRows = {}
    const rawBundles = Array.isArray(manifest?.dsh?.profile?.bundles) ? manifest.dsh.profile.bundles : []
    for (const pkg of rawBundles) {
      if (typeof pkg !== 'string') continue
      const rows = readBundleRows(pkg)
      if (rows) bundleRows[pkg] = rows
    }
    const report = classify({ manifest, runtimes, entries, startedBundles, readPackageMeta, hasService, bundleRows })
    liveState.lastScanAt = Date.now()
    return {
      at: liveState.lastScanAt,
      durationMs: Date.now() - startedAt,
      profile: { name: ctx.profileContext.name, dir: profileDir },
      sources: {
        registry: true,
        loader: Boolean(ctx.loader),
        startedBundles: startedBundles.length,
        bundleRows: Object.keys(bundleRows).length,
      },
      manifest: {
        dependencyCount: Object.keys(manifest?.dependencies ?? {}).length,
        bundleCount: Array.isArray(manifest?.dsh?.profile?.bundles) ? manifest.dsh.profile.bundles.length : 0,
      },
      plugins: report.plugins,
      libraries: report.libraries,
      summary: report.summary,
      runtimes,
      liveErrorCount: liveState.errors,
      liveLastError: liveState.lastError,
    }
  }

  const status = () => ({
    plugin: 'plugin-doctor',
    profile: { name: ctx.profileContext.name, dir: profileDir },
    lastScanAt: liveState.lastScanAt,
    liveErrorCount: liveState.errors,
    liveLastError: liveState.lastError,
  })

  /** M3: peerDependencies of every plugin vs the actually-installed versions. */
  const compatibility = () => {
    const startedAt = Date.now()
    const manifest = readManifest()
    const deps = manifest?.dependencies ?? {}
    const bundles = Array.isArray(manifest?.dsh?.profile?.bundles) ? manifest.dsh.profile.bundles : []
    const universe = [...new Set([...Object.keys(deps), ...bundles.filter(pkg => typeof pkg === 'string')])]
    const versionCache = new Map()
    const installedVersion = (pkg) => {
      if (versionCache.has(pkg)) return versionCache.get(pkg)
      const meta = readFullManifest(pkg)
      const version = meta && typeof meta.version === 'string' ? meta.version : null
      versionCache.set(pkg, version)
      return version
    }
    const cordisVersion = installedVersion('@deepseek-ai/cordis')
    const summary = { plugins: 0, withPeers: 0, satisfied: 0, mismatch: 0, missing: 0, optionalMissing: 0, workspace: 0, unknown: 0 }
    const rows = []
    for (const pkg of universe) {
      const meta = readFullManifest(pkg)
      if (!meta) continue
      const peers = meta.peerDependencies ?? {}
      const peerMeta = meta.peerDependenciesMeta ?? {}
      const peerRows = Object.keys(peers).map(name => evaluatePeer({
        name,
        range: peers[name],
        installed: installedVersion(name),
        optional: Boolean(peerMeta[name]?.optional),
      }))
      const status = peerRows.some(p => p.status === 'mismatch') ? 'mismatch'
        : peerRows.some(p => p.status === 'missing') ? 'missing'
        : peerRows.some(p => p.status === 'unknown') ? 'unknown'
        : peerRows.some(p => p.status === 'satisfied') ? 'satisfied'
        : peerRows.some(p => p.status === 'workspace') ? 'workspace'
        : 'no-peers'
      rows.push({
        package: pkg,
        version: typeof meta.version === 'string' ? meta.version : null,
        peers: peerRows,
        status,
      })
      summary.plugins += 1
      if (peerRows.length > 0) summary.withPeers += 1
      for (const peer of peerRows) {
        if (peer.status === 'satisfied') summary.satisfied += 1
        else if (peer.status === 'mismatch') summary.mismatch += 1
        else if (peer.status === 'missing') summary.missing += 1
        else if (peer.status === 'optional-missing') summary.optionalMissing += 1
        else if (peer.status === 'workspace') summary.workspace += 1
        else summary.unknown += 1
      }
    }
    const rank = { mismatch: 0, missing: 1, unknown: 2, satisfied: 3, workspace: 4, 'optional-missing': 4, 'no-peers': 5 }
    rows.sort((a, b) => (rank[a.status] - rank[b.status]) || (a.package < b.package ? -1 : 1))
    return { at: Date.now(), durationMs: Date.now() - startedAt, cordisVersion, rows, summary }
  }

  /** M3: install-operation timeline (.plugin-manager logs) + data footprint (report-only). */
  const history = () => {
    const startedAt = Date.now()
    const logDir = join(profileDir, '.plugin-manager', 'logs')
    let names = []
    try { names = readdirSync(logDir) } catch { /* no logs yet */ }
    const operations = []
    for (const name of names) {
      if (!name.startsWith('operation-')) continue
      const dir = join(logDir, name)
      let mtime = null
      try { mtime = statSync(dir).mtimeMs } catch { /* ignore */ }
      let log = ''
      try { log = readFileSync(join(dir, 'pnpm.log'), 'utf8').slice(0, 65536) } catch { /* ignore */ }
      operations.push({ id: name, mtime, log })
    }
    const timeline = buildTimeline(operations)
    const footprint = scanDataFootprint(profileDir)
    return {
      at: Date.now(),
      durationMs: Date.now() - startedAt,
      logDir,
      totalOperations: timeline.length,
      timeline,
      footprint,
    }
  }

  // --- M4: audit ledger (lazy) + safe actions + export ----------------------

  let ledger = null
  const getLedger = () => {
    if (!ledger) ledger = openLedger(profileDir)
    return ledger
  }

  const CLIENT_ERROR_CODES = new Set([
    'CONFIRM_REQUIRED', 'INVALID_BUNDLE_ID', 'INVALID_ACTION', 'NOT_IN_BUNDLES',
    'ALREADY_IN_BUNDLES', 'NO_BUNDLES', 'INVALID_MANIFEST', 'NON_BUNDLES_CHANGE',
  ])
  const actionErrorResponse = (error) => {
    const code = error?.code ?? 'PLUGIN_DOCTOR_ERROR'
    const status = CLIENT_ERROR_CODES.has(code) ? 400 : 500
    return jsonResponse({ error: { code, message: error instanceof Error ? error.message : String(error) } }, status)
  }

  /** Shared disable/restore handler: quadruple-protected write + audit row. */
  const performAction = (action) => async (request) => {
    try {
      let body = {}
      try { body = await request.json() } catch { /* empty body → CONFIRM_REQUIRED */ }
      const bundleId = body?.bundleId
      const result = applyBundleAction(profileDir, bundleId, action, { confirm: body?.confirm })
      getLedger().recordAction({
        kind: action === 'remove' ? 'disable' : 'restore',
        target: bundleId,
        detail: { backupPath: result.backupPath },
      })
      return jsonResponse(result)
    } catch (error) {
      rememberError(error)
      return actionErrorResponse(error)
    }
  }

  const audit = () => ({
    at: Date.now(),
    actions: getLedger().listActions({ limit: 100 }),
    scans: getLedger().listScans({ limit: 20 }),
  })

  /** Full diagnostic export; also records a scan snapshot in the ledger. */
  const exportReport = () => {
    const ov = overview()
    const report = {
      generatedAt: Date.now(),
      plugin: 'plugin-doctor',
      profile: { name: ctx.profileContext.name, dir: profileDir },
      overview: ov,
      compatibility: compatibility(),
      history: history(),
      audit: { actions: getLedger().listActions({ limit: 200 }), scans: getLedger().listScans({ limit: 50 }) },
    }
    try { getLedger().recordScan({ summary: ov.summary }) } catch { /* ledger must not block export */ }
    return report
  }

  const routes = [
    ctx.connection.fetch.register({
      path: '/api/plugin-doctor/overview',
      methods: ['GET', 'HEAD'],
      requestBody: 'buffered',
      fetch: async (request) => {
        const head = request.method === 'HEAD'
        try {
          return jsonResponse(overview(), 200, head)
        } catch (error) {
          rememberError(error)
          return errorResponse(error, head)
        }
      },
    }),
    ctx.connection.fetch.register({
      path: '/api/plugin-doctor/status',
      methods: ['GET', 'HEAD'],
      requestBody: 'buffered',
      fetch: async (request) => {
        const head = request.method === 'HEAD'
        try {
          return jsonResponse(status(), 200, head)
        } catch (error) {
          rememberError(error)
          return errorResponse(error, head)
        }
      },
    }),
    ctx.connection.fetch.register({
      path: '/api/plugin-doctor/compatibility',
      methods: ['GET', 'HEAD'],
      requestBody: 'buffered',
      fetch: async (request) => {
        const head = request.method === 'HEAD'
        try {
          return jsonResponse(compatibility(), 200, head)
        } catch (error) {
          rememberError(error)
          return errorResponse(error, head)
        }
      },
    }),
    ctx.connection.fetch.register({
      path: '/api/plugin-doctor/history',
      methods: ['GET', 'HEAD'],
      requestBody: 'buffered',
      fetch: async (request) => {
        const head = request.method === 'HEAD'
        try {
          return jsonResponse(history(), 200, head)
        } catch (error) {
          rememberError(error)
          return errorResponse(error, head)
        }
      },
    }),
    ctx.connection.fetch.register({
      path: '/api/plugin-doctor/disable',
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: performAction('remove'),
    }),
    ctx.connection.fetch.register({
      path: '/api/plugin-doctor/restore',
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: performAction('add'),
    }),
    ctx.connection.fetch.register({
      path: '/api/plugin-doctor/audit',
      methods: ['GET', 'HEAD'],
      requestBody: 'buffered',
      fetch: async (request) => {
        const head = request.method === 'HEAD'
        try {
          return jsonResponse(audit(), 200, head)
        } catch (error) {
          rememberError(error)
          return errorResponse(error, head)
        }
      },
    }),
    ctx.connection.fetch.register({
      path: '/api/plugin-doctor/export.json',
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: async () => {
        try {
          const body = JSON.stringify(exportReport())
          return new Response(body, {
            status: 200,
            headers: {
              'content-type': 'application/json; charset=utf-8',
              'content-disposition': 'attachment; filename="plugin-doctor-export.json"',
              'cache-control': 'no-store',
            },
          })
        } catch (error) {
          rememberError(error)
          return errorResponse(error)
        }
      },
    }),
  ]

  try {
    ctx.logger('plugin-doctor').info(
      'ready: registry=%d runtimes, loader entries=%d, profile=%s',
      ctx.registry?.size ?? -1,
      collectEntries(ctx.loader).length,
      ctx.profileContext.name,
    )
  } catch {
    // Logging must never block plugin activation.
  }

  ctx.effect(() => () => {
    for (const dispose of routes) void dispose()
    if (ledger) { try { ledger.close() } catch { /* ignore */ } ledger = null }
  }, 'plugin-doctor: routes')
}