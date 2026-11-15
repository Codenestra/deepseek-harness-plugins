// Plugin Doctor — install history & data footprint (M3).
//
// parseOperationLog / buildTimeline / formatBytes are pure. scanDataFootprint
// is a bounded, read-only directory walk (skips node_modules and symlinks,
// caps the file count per directory). The host wires these to /history; the
// footprint is REPORT-ONLY — cleanup belongs to Storage Doctor, not here.

import { readdirSync, statSync, lstatSync } from 'node:fs'
import { join } from 'node:path'

const ADD_LINE = /^\s*\+\s+(\S+)\s*(.*)$/
const REMOVE_LINE = /^\s*-\s+(\S+)\s*(.*)$/
const DONE_LINE = /Done in ([\d.]+)\s*(ms|s|m)\s+using pnpm v(\S+)/
const DELTA_LINE = /Packages:\s*([+-]?\d+)/
const WARN_LINE = /\[WARN\]\s*(.*)/

/** Parse one pnpm operation log into structured facts. */
export function parseOperationLog(text) {
  const result = { packages: [], durationMs: null, pnpmVersion: null, packageDelta: null, warnings: [], done: false }
  if (typeof text !== 'string' || text === '') return result
  for (const line of text.split(/\r?\n/)) {
    const add = ADD_LINE.exec(line)
    if (add) {
      result.packages.push({ name: add[1], source: add[2].trim() || null, action: 'add' })
      continue
    }
    const remove = REMOVE_LINE.exec(line)
    if (remove) {
      result.packages.push({ name: remove[1], source: null, action: 'remove' })
      continue
    }
    const warn = WARN_LINE.exec(line)
    if (warn) result.warnings.push(warn[1].trim())
  }
  const done = DONE_LINE.exec(text)
  if (done) {
    const value = Number(done[1])
    const unit = done[2]
    result.durationMs = Math.round(value * (unit === 'ms' ? 1 : unit === 's' ? 1000 : 60000))
    result.pnpmVersion = done[3]
    result.done = true
  }
  const delta = DELTA_LINE.exec(text)
  if (delta) result.packageDelta = Number(delta[1])
  return result
}

/** Assemble a newest-first timeline from [{id, mtime, log}] records. */
export function buildTimeline(operations) {
  if (!Array.isArray(operations)) return []
  return operations
    .map(operation => ({
      id: operation.id,
      at: typeof operation.mtime === 'number' ? operation.mtime : null,
      ...parseOperationLog(operation.log),
    }))
    .sort((a, b) => {
      if (a.at === null && b.at === null) return 0
      if (a.at === null) return 1
      if (b.at === null) return -1
      return b.at - a.at
    })
}

/** Human-readable byte size (binary units). */
export function formatBytes(bytes) {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes)) return '—'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB', 'PB']
  let value = bytes
  let unit = -1
  do {
    value /= 1024
    unit += 1
  } while (value >= 1024 && unit < units.length - 1)
  return `${value.toFixed(1)} ${units[unit]}`
}

/** Bounded recursive size of one directory; skips symlinks, caps file count. */
function measureDir(dir, maxFiles) {
  let bytes = 0
  let files = 0
  let truncated = false
  const stack = [dir]
  while (stack.length > 0) {
    const current = stack.pop()
    let entries
    try {
      entries = readdirSync(current, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue
      const full = join(current, entry.name)
      if (entry.isDirectory()) {
        stack.push(full)
      } else if (entry.isFile()) {
        if (files >= maxFiles) { truncated = true; continue }
        try {
          bytes += statSync(full).size
          files += 1
        } catch { /* skip unreadable */ }
      }
    }
  }
  return { bytes, files, truncated }
}

const DATA_FILE = /\.(db|sqlite|sqlite3)$/i

/**
 * Read-only footprint of plugin data under a profile directory: every top-level
 * directory except node_modules, plus top-level database files. Report-only.
 * @param {string} profileDir
 * @param {{maxFiles?: number}} [opts]
 * @returns {Array<{name, bytes, files, truncated, kind: 'dir'|'file'}>} sorted by bytes desc
 */
export function scanDataFootprint(profileDir, opts = {}) {
  const maxFiles = typeof opts.maxFiles === 'number' ? opts.maxFiles : 20000
  let entries
  try {
    entries = readdirSync(profileDir, { withFileTypes: true })
  } catch {
    return []
  }
  const rows = []
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.isSymbolicLink()) continue
    const full = join(profileDir, entry.name)
    if (entry.isDirectory()) {
      const measured = measureDir(full, maxFiles)
      rows.push({ name: entry.name, kind: 'dir', ...measured })
    } else if (entry.isFile() && DATA_FILE.test(entry.name)) {
      let size = 0
      try { size = statSync(full).size } catch { /* ignore */ }
      rows.push({ name: entry.name, kind: 'file', bytes: size, files: 1, truncated: false })
    }
  }
  rows.sort((a, b) => b.bytes - a.bytes)
  return rows
}