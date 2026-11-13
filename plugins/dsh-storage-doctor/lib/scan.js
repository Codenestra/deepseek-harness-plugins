/**
 * Storage Doctor scan engine (M1: read-only inspection).
 *
 * Walks a DSH home directory and aggregates storage usage per category,
 * per session workspace, per profile plugin directory, plus a top-files
 * ranking. This module NEVER writes, moves, or deletes anything: it only
 * calls readdir/stat. Symbolic links (including Windows junctions) are
 * skipped to prevent traversal loops.
 *
 * Category rules follow design.md §2 (measured layout of a real ~/.dsh):
 *   sessions/                        -> sessions      (per-workspace and per-session summaries)
 *   attachments/                     -> attachments
 *   profiles/<p>/node_modules/       -> profileDeps   (aggregate only, never itemized)
 *   profiles/<p>/.plugin-manager/    -> profileMeta   (aggregate only)
 *   profiles/<p>/*.{json,yaml,...}   -> profileMeta   (manifests)
 *   profiles/<p>/<plugin-dir>/       -> pluginData    (report only, per-plugin ranking)
 *   dsh-runtimes/                    -> runtimes      (aggregate only)
 *   speech-to-text/                  -> models
 *   logs/                            -> logs
 *   cache/                           -> cache
 *   storages/                        -> storages
 *   .storage-doctor/                 -> doctorOwn     (our own trash, aggregate only)
 *   everything else                  -> other
 */

import { readdir as nodeReaddir, stat as nodeStat } from 'node:fs/promises'
import { join } from 'node:path'

/** Category keys in stable report order. */
export const CATEGORY_NAMES = [
  'sessions',
  'attachments',
  'pluginData',
  'profileDeps',
  'profileMeta',
  'runtimes',
  'models',
  'logs',
  'cache',
  'storages',
  'doctorOwn',
  'other',
]

/** Single files at least this large enter the top-files ranking (design.md §4.2). */
export const DEFAULT_TOP_FILE_THRESHOLD = 50 * 1024 * 1024

const MAX_RECORDED_ERRORS = 100
const PROGRESS_INTERVAL_MS = 250
/**
 * Per-file entries collected for cleanup-previewable areas (design.md §5.2:
 * logs / attachments/v1/tmp / cache/attachments / speech-to-text ASR models).
 * Memory-only: never persisted to the ledger. Capped so a pathological
 * directory cannot blow up the scan.
 */
const MAX_CLEANABLE_FILES = 20_000

function newBucket() {
  return { bytes: 0, files: 0 }
}

/**
 * Which cleanup kind a directory's files belong to, by home-relative path.
 * @param {string} rel slash-separated directory path relative to the home
 * @returns {'log'|'tmp'|'model'|null}
 */
function cleanableKindFor(rel) {
  if (rel === 'logs' || rel.startsWith('logs/')) return 'log'
  if (rel === 'attachments/v1/tmp' || rel.startsWith('attachments/v1/tmp/')) return 'tmp'
  if (rel === 'cache/attachments' || rel.startsWith('cache/attachments/')) return 'tmp'
  // M4: the downloaded ASR models directory only (opt-in via models=1 in the
  // policy layer; the rest of speech-to-text/ stays report-only).
  if (rel === 'speech-to-text/sensevoice/models' || rel.startsWith('speech-to-text/sensevoice/models/')) return 'model'
  return null
}

/**
 * Scan `root` (a DSH home directory) and resolve an aggregate report.
 *
 * @param {string} root absolute path of the DSH home to inspect (read-only)
 * @param {object} [options]
 * @param {{ readdir?: Function, stat?: Function }} [options.fs] injectable fs/promises subset (tests)
 * @param {AbortSignal} [options.signal] aborts the walk; the result is marked `aborted`
 * @param {number} [options.concurrency=8] max directories walked in parallel
 * @param {number} [options.topFileThreshold] bytes; files >= threshold enter the ranking
 * @param {number} [options.topFilesLimit=50] how many top files to keep
 * @param {(progress: { dirsWalked: number, filesCounted: number }) => void} [options.onProgress]
 * @returns {Promise<object>} aggregate report; never throws for per-file/per-dir IO errors
 */
export async function scanHome(root, options = {}) {
  if (typeof root !== 'string' || root === '') throw new TypeError('scanHome: root must be a non-empty path')
  const fsReaddir = options.fs?.readdir ?? nodeReaddir
  const fsStat = options.fs?.stat ?? nodeStat
  const concurrency = Math.max(1, Math.min(64, options.concurrency ?? 8))
  const threshold = Number.isFinite(options.topFileThreshold)
    ? Math.max(0, options.topFileThreshold)
    : DEFAULT_TOP_FILE_THRESHOLD
  const topLimit = Math.max(1, options.topFilesLimit ?? 50)
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null
  const signal = options.signal

  const startedAt = Date.now()
  const categories = new Map(CATEGORY_NAMES.map(name => [name, newBucket()]))
  const workspaces = new Map()
  const plugins = new Map()
  const sessions = new Map()
  const bigFiles = []
  const cleanableFiles = []
  let cleanableOverflow = false
  const errors = []
  let totalFiles = 0
  let dirsWalked = 0
  let symlinksSkipped = 0
  let aborted = signal?.aborted === true
  let lastProgressAt = 0

  const recordError = (rel, error) => {
    if (errors.length < MAX_RECORDED_ERRORS) {
      errors.push({ path: rel || '.', message: error instanceof Error ? error.message : String(error) })
    }
  }

  const reportProgress = (force = false) => {
    if (onProgress === null) return
    const now = Date.now()
    if (!force && now - lastProgressAt < PROGRESS_INTERVAL_MS) return
    lastProgressAt = now
    try {
      onProgress({ dirsWalked, filesCounted: totalFiles })
    } catch {
      // Progress reporting is best-effort; a bad callback must not kill the scan.
    }
  }

  /**
   * Directory walk context. `zone` drives child classification:
   * root -> sessionsRoot -> workspace -> session (deeper levels stay `session`)
   * root -> profilesRoot -> profile -> plugin (deeper levels stay `plugin`)
   * root -> tree (plain categorized subtree)
   */
  const rootTask = {
    path: root, rel: '', zone: 'root', category: 'other',
    aggregateOnly: false, profile: null, wsAcc: null, pluginAcc: null, sessionAcc: null,
  }

  function deriveChild(parent, name, childPath, childRel) {
    const task = {
      path: childPath,
      rel: childRel,
      zone: parent.zone,
      category: parent.category,
      aggregateOnly: parent.aggregateOnly,
      profile: parent.profile,
      wsAcc: parent.wsAcc,
      pluginAcc: parent.pluginAcc,
      sessionAcc: parent.sessionAcc,
    }
    switch (parent.zone) {
      case 'root': {
        task.wsAcc = null
        task.pluginAcc = null
        task.sessionAcc = null
        task.zone = 'tree'
        if (name === 'sessions') {
          task.zone = 'sessionsRoot'
          task.category = 'sessions'
        } else if (name === 'profiles') {
          task.zone = 'profilesRoot'
          task.category = 'profileMeta'
        } else if (name === 'attachments') {
          task.category = 'attachments'
        } else if (name === 'speech-to-text') {
          task.category = 'models'
        } else if (name === 'logs') {
          task.category = 'logs'
        } else if (name === 'cache') {
          task.category = 'cache'
        } else if (name === 'storages') {
          task.category = 'storages'
        } else if (name === 'dsh-runtimes') {
          task.category = 'runtimes'
          task.aggregateOnly = true
        } else if (name === '.storage-doctor') {
          task.category = 'doctorOwn'
          task.aggregateOnly = true
        } else {
          // llm-deepseek and anything unknown: report under "other".
          task.category = 'other'
        }
        return task
      }
      case 'sessionsRoot': {
        // Child = one encoded workspace directory. Names stay encoded (design.md §2).
        task.zone = 'workspace'
        task.category = 'sessions'
        let workspace = workspaces.get(name)
        if (workspace === undefined) {
          workspace = { name, bytes: 0, files: 0, sessionDirs: 0 }
          workspaces.set(name, workspace)
        }
        task.wsAcc = workspace
        return task
      }
      case 'workspace': {
        // Direct children of a workspace directory are session directories.
        task.zone = 'session'
        task.category = 'sessions'
        const key = `${task.wsAcc.name}/${name}`
        let session = sessions.get(key)
        if (session === undefined) {
          session = { workspace: task.wsAcc.name, sessionId: name, bytes: 0, files: 0, mtimeMs: 0 }
          sessions.set(key, session)
        }
        task.wsAcc.sessionDirs += 1
        task.sessionAcc = session
        return task
      }
      case 'profilesRoot': {
        // Child = one profile name; its direct files are manifests/config.
        task.zone = 'profile'
        task.profile = name
        task.category = 'profileMeta'
        return task
      }
      case 'profile': {
        if (name === 'node_modules') {
          task.zone = 'tree'
          task.category = 'profileDeps'
          task.aggregateOnly = true
          return task
        }
        if (name === '.plugin-manager') {
          task.zone = 'tree'
          task.category = 'profileMeta'
          task.aggregateOnly = true
          return task
        }
        // Any other directory under a profile is a plugin's own data directory.
        // Report only: it never becomes a cleanup candidate (design.md §3).
        task.zone = 'plugin'
        task.category = 'pluginData'
        const key = `${task.profile}/${name}`
        let plugin = plugins.get(key)
        if (plugin === undefined) {
          plugin = { profile: task.profile, plugin: name, bytes: 0, files: 0, largest: null }
          plugins.set(key, plugin)
        }
        task.pluginAcc = plugin
        return task
      }
      default:
        // 'session', 'plugin', 'tree': inherit the parent context unchanged.
        return task
    }
  }

  const countFile = (task, rel, size, mtimeMs) => {
    totalFiles += 1
    const bucket = categories.get(task.category)
    bucket.bytes += size
    bucket.files += 1
    if (task.wsAcc !== null) {
      task.wsAcc.bytes += size
      task.wsAcc.files += 1
    }
    if (task.pluginAcc !== null) {
      task.pluginAcc.bytes += size
      task.pluginAcc.files += 1
      if (task.pluginAcc.largest === null || size > task.pluginAcc.largest.bytes) {
        task.pluginAcc.largest = { path: rel, bytes: size }
      }
    }
    if (task.sessionAcc !== null) {
      task.sessionAcc.bytes += size
      task.sessionAcc.files += 1
      if (mtimeMs > task.sessionAcc.mtimeMs) task.sessionAcc.mtimeMs = mtimeMs
    }
    if (!task.aggregateOnly && size >= threshold) {
      bigFiles.push({ path: rel, bytes: size, mtimeMs, category: task.category })
    }
  }

  const queue = [rootTask]

  async function walk(task) {
    if (aborted) return
    dirsWalked += 1
    let entries
    try {
      entries = await fsReaddir(task.path, { withFileTypes: true })
    } catch (error) {
      recordError(task.rel, error)
      reportProgress()
      return
    }
    const childDirs = []
    for (const entry of entries) {
      if (aborted) break
      const childRel = task.rel === '' ? entry.name : `${task.rel}/${entry.name}`
      if (entry.isSymbolicLink()) {
        // Never follow links: they can point outside the home or form loops.
        symlinksSkipped += 1
        continue
      }
      if (entry.isDirectory()) {
        childDirs.push(deriveChild(task, entry.name, join(task.path, entry.name), childRel))
        continue
      }
      if (!entry.isFile()) continue
      let stats
      try {
        stats = await fsStat(join(task.path, entry.name))
      } catch (error) {
        // Vanished or locked mid-scan: record and keep going, never retry hard.
        recordError(childRel, error)
        continue
      }
      countFile(task, childRel, stats.size, stats.mtimeMs)
      const kind = cleanableKindFor(task.rel)
      if (kind !== null) {
        if (cleanableFiles.length < MAX_CLEANABLE_FILES) {
          cleanableFiles.push({ path: childRel, bytes: stats.size, mtimeMs: stats.mtimeMs, kind })
        } else {
          cleanableOverflow = true
        }
      }
    }
    if (aborted) {
      queue.length = 0
      return
    }
    for (const child of childDirs) queue.push(child)
    reportProgress()
  }

  if (signal !== undefined && signal !== null && !aborted) {
    signal.addEventListener('abort', () => {
      aborted = true
      queue.length = 0
    }, { once: true })
  }

  let finishDrained
  const drained = new Promise(resolve => { finishDrained = resolve })
  let active = 0
  const pump = () => {
    while (!aborted && active < concurrency && queue.length > 0) {
      const task = queue.shift()
      active += 1
      walk(task)
        .catch(error => recordError(task.rel, error))
        .then(() => {
          active -= 1
          pump()
        })
    }
    if (active === 0) finishDrained()
  }
  pump()
  await drained

  let totalBytes = 0
  const categoryReport = {}
  for (const name of CATEGORY_NAMES) {
    const bucket = categories.get(name)
    totalBytes += bucket.bytes
    categoryReport[name] = { bytes: bucket.bytes, files: bucket.files }
  }
  bigFiles.sort((left, right) => right.bytes - left.bytes || left.path.localeCompare(right.path))
  reportProgress(true)

  return {
    root,
    at: startedAt,
    durationMs: Date.now() - startedAt,
    aborted,
    totalBytes,
    totalFiles,
    dirsWalked,
    symlinksSkipped,
    categories: categoryReport,
    workspaces: [...workspaces.values()].sort((left, right) => right.bytes - left.bytes || left.name.localeCompare(right.name)),
    sessions: [...sessions.values()].sort((left, right) => right.bytes - left.bytes),
    pluginData: [...plugins.values()].sort((left, right) => right.bytes - left.bytes || left.plugin.localeCompare(right.plugin)),
    topFiles: bigFiles.slice(0, topLimit),
    cleanableFiles,
    cleanableOverflow,
    errors: errors.slice(0, MAX_RECORDED_ERRORS),
    errorCount: errors.length,
  }
}
