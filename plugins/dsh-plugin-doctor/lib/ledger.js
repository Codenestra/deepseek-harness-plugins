// Plugin Doctor — audit ledger (M4). node:sqlite, deliberately restrained.
//
// Own storage at <profileDir>/plugin-doctor/plugin-doctor.sqlite (design.md
// §5.1). Two tables: scans (diagnostic snapshots) and actions (disable/restore
// audit trail). This is the plugin's OWN directory — it never reads or writes
// other plugins' data, node_modules, or credentials.

import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS scans (
  id INTEGER PRIMARY KEY,
  at INTEGER,
  summary_json TEXT
);
CREATE TABLE IF NOT EXISTS actions (
  id INTEGER PRIMARY KEY,
  at INTEGER,
  kind TEXT,
  target TEXT,
  detail_json TEXT
);
`

function safeParse(text) {
  if (typeof text !== 'string' || text === '') return null
  try { return JSON.parse(text) } catch { return null }
}

/**
 * Open (creating if needed) the plugin-doctor ledger for a profile.
 * @param {string} profileDir
 * @returns {{path, recordAction, recordScan, listActions, listScans, close}}
 */
export function openLedger(profileDir) {
  const dir = join(profileDir, 'plugin-doctor')
  mkdirSync(dir, { recursive: true })
  const path = join(dir, 'plugin-doctor.sqlite')
  const db = new DatabaseSync(path)
  db.exec(SCHEMA)

  const insertAction = db.prepare('INSERT INTO actions (at, kind, target, detail_json) VALUES (?, ?, ?, ?)')
  const insertScan = db.prepare('INSERT INTO scans (at, summary_json) VALUES (?, ?)')
  const selectActions = db.prepare('SELECT id, at, kind, target, detail_json FROM actions ORDER BY id DESC LIMIT ?')
  const selectScans = db.prepare('SELECT id, at, summary_json FROM scans ORDER BY id DESC LIMIT ?')

  return {
    path,
    recordAction({ kind, target, detail = null, at = Date.now() }) {
      const info = insertAction.run(at, kind, target, JSON.stringify(detail ?? null))
      return { id: Number(info.lastInsertRowid), at }
    },
    recordScan({ summary, at = Date.now() }) {
      const info = insertScan.run(at, JSON.stringify(summary ?? null))
      return { id: Number(info.lastInsertRowid), at }
    },
    listActions({ limit = 50 } = {}) {
      return selectActions.all(limit).map(row => ({
        id: row.id, at: row.at, kind: row.kind, target: row.target, detail: safeParse(row.detail_json),
      }))
    },
    listScans({ limit = 20 } = {}) {
      return selectScans.all(limit).map(row => ({
        id: row.id, at: row.at, summary: safeParse(row.summary_json),
      }))
    },
    close() { db.close() },
  }
}