/**
 * Storage Doctor ledger (node:sqlite).
 *
 * Deliberately small: summary rows only (one row per scan, one row per cleanup
 * batch) and a key/value meta table — never file-level detail. This plugin must
 * not repeat the "several-GB plugin database" mistake it exists to report on
 * (design.md §5.1).
 */

import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS scans (
  id INTEGER PRIMARY KEY,
  at INTEGER NOT NULL,
  total_bytes INTEGER NOT NULL,
  categories_json TEXT NOT NULL,
  top_files_json TEXT NOT NULL,
  duration_ms INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS batches (
  id TEXT PRIMARY KEY,
  at INTEGER NOT NULL,
  policy_json TEXT NOT NULL,
  item_count INTEGER NOT NULL,
  bytes INTEGER NOT NULL,
  status TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`

export class StorageDoctorLedger {
  /**
   * @param {string} filename absolute sqlite path, e.g.
   *   `<profileContext.dir>/storage-doctor/storage-doctor.sqlite`
   */
  constructor(filename) {
    mkdirSync(dirname(filename), { recursive: true })
    this.db = new DatabaseSync(filename)
    this.db.exec(SCHEMA)
    this.insertScan = this.db.prepare(
      'INSERT INTO scans (at, total_bytes, categories_json, top_files_json, duration_ms) VALUES (?, ?, ?, ?, ?)',
    )
    this.selectLatestScan = this.db.prepare(
      'SELECT id, at, total_bytes, categories_json, top_files_json, duration_ms FROM scans ORDER BY id DESC LIMIT 1',
    )
    this.selectHistory = this.db.prepare(
      'SELECT id, at, total_bytes, duration_ms FROM scans ORDER BY id DESC LIMIT ?',
    )
    this.selectMeta = this.db.prepare('SELECT value FROM meta WHERE key = ?')
    this.upsertMeta = this.db.prepare(
      'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    )
    this.insertBatch = this.db.prepare(
      'INSERT INTO batches (id, at, policy_json, item_count, bytes, status) VALUES (?, ?, ?, ?, ?, ?)',
    )
    this.updateBatchStatus = this.db.prepare('UPDATE batches SET status = ? WHERE id = ?')
    this.selectBatch = this.db.prepare('SELECT id, at, policy_json, item_count, bytes, status FROM batches WHERE id = ?')
    this.selectBatches = this.db.prepare('SELECT id, at, policy_json, item_count, bytes, status FROM batches ORDER BY at DESC LIMIT ?')
    this.selectTrend = this.db.prepare('SELECT at, total_bytes, categories_json FROM scans ORDER BY id ASC LIMIT ?')
  }

  /**
   * Persist one completed scan as a summary row.
   * @param {{ at: number, totalBytes: number, categories: object, topFiles: unknown[], durationMs: number }} result
   * @returns {number} the new scan id
   */
  recordScan(result) {
    const info = this.insertScan.run(
      result.at,
      result.totalBytes,
      JSON.stringify(result.categories ?? {}),
      JSON.stringify(result.topFiles ?? []),
      result.durationMs,
    )
    return Number(info.lastInsertRowid)
  }

  /**
   * Latest persisted scan snapshot, or null. Marked `partial` because the
   * ledger intentionally stores only totals, categories, and top files.
   */
  latestScan() {
    const row = this.selectLatestScan.get()
    if (row === undefined) return null
    return {
      id: Number(row.id),
      at: Number(row.at),
      totalBytes: Number(row.total_bytes),
      durationMs: Number(row.duration_ms),
      categories: JSON.parse(String(row.categories_json)),
      topFiles: JSON.parse(String(row.top_files_json)),
      partial: true,
    }
  }

  /** Newest-first scan history for the growth curve (M3). */
  history(limit = 200) {
    const bounded = Math.max(1, Math.min(2000, Math.trunc(limit)))
    const rows = this.selectHistory.all(bounded)
    return rows.map(row => ({
      id: Number(row.id),
      at: Number(row.at),
      totalBytes: Number(row.total_bytes),
      durationMs: Number(row.duration_ms),
    }))
  }

  /**
   * Record one cleanup batch (the trash move) as a summary row.
   * @param {{ id: string, at: number, policy: object, itemCount: number, bytes: number, status?: string }} batch
   */
  recordBatch(batch) {
    this.insertBatch.run(
      String(batch.id),
      batch.at,
      JSON.stringify(batch.policy ?? {}),
      batch.itemCount,
      batch.bytes,
      batch.status ?? 'trashed',
    )
  }

  /** @param {string} id @param {'trashed'|'restored'|'purged'} status */
  setBatchStatus(id, status) {
    this.updateBatchStatus.run(String(status), String(id))
  }

  batch(id) {
    const row = this.selectBatch.get(String(id))
    if (row === undefined) return null
    return {
      id: String(row.id),
      at: Number(row.at),
      policy: JSON.parse(String(row.policy_json)),
      itemCount: Number(row.item_count),
      bytes: Number(row.bytes),
      status: String(row.status),
    }
  }

  /** Newest-first batch history (the trash page merges this with disk state). */
  batches(limit = 100) {
    const bounded = Math.max(1, Math.min(2000, Math.trunc(limit)))
    return this.selectBatches.all(bounded).map(row => ({
      id: String(row.id),
      at: Number(row.at),
      policy: JSON.parse(String(row.policy_json)),
      itemCount: Number(row.item_count),
      bytes: Number(row.bytes),
      status: String(row.status),
    }))
  }

  /**
   * Oldest-first growth curve source: one point per scan with the category
   * breakdown (summaries only, design.md §5.1).
   */
  trend(limit = 400) {
    const bounded = Math.max(1, Math.min(2000, Math.trunc(limit)))
    return this.selectTrend.all(bounded).map(row => ({
      at: Number(row.at),
      totalBytes: Number(row.total_bytes),
      categories: JSON.parse(String(row.categories_json)),
    }))
  }

  metaGet(key) {
    const row = this.selectMeta.get(String(key))
    return row === undefined ? null : String(row.value)
  }

  metaSet(key, value) {
    this.upsertMeta.run(String(key), String(value))
  }

  close() {
    this.db.close()
  }
}
