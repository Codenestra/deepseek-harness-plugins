/**
 * A tiny durable JSON-file domain adapter for the audit ledger.
 *
 * It implements the same surface the ledger consumes from a storage-domain
 * Domain ({table(name), close()}), backed by a single atomically-written JSON
 * document under the plugin's profile directory. This keeps the plugin free of
 * any bare `zod` / storage-domain import (which a profile-local plain-JS bundle
 * cannot reliably resolve), mirroring the dependency footprint of the proven
 * usage-center plugin (Node builtins + loader-provided dsh packages only).
 *
 * Writes are durable-first: a temp file is written and renamed over the target
 * so a crash never leaves a half-written ledger.
 *
 * @module @local/dsh-runaway-watchdog/lib/file-domain
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

/**
 * Open (or create) a file-backed domain holding one `entries` table.
 * @param {string} filePath - absolute path of the JSON document.
 * @returns {object} a domain-like object ({table, close}).
 */
export function openFileDomain(filePath) {
  let data = { entries: {} }
  try {
    if (existsSync(filePath)) {
      const parsed = JSON.parse(readFileSync(filePath, 'utf8'))
      if (parsed && typeof parsed === 'object' && parsed.entries && typeof parsed.entries === 'object') {
        data = parsed
      }
    }
  } catch {
    // A corrupt ledger is disposable derived data; start fresh rather than fail.
    data = { entries: {} }
  }
  const entries = data.entries

  function persist() {
    mkdirSync(dirname(filePath), { recursive: true })
    const tmp = `${filePath}.tmp`
    writeFileSync(tmp, JSON.stringify(data))
    renameSync(tmp, filePath)
  }

  const table = {
    get: key => entries[key],
    put: async (key, value) => { entries[key] = value; persist() },
    delete: async (key) => { delete entries[key]; persist() },
    entries: () => Object.entries(entries),
    keys: () => Object.keys(entries),
  }

  return {
    table: () => table,
    close: () => { /* nothing to release; writes are already durable */ },
  }
}