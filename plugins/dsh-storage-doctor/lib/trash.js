/**
 * Trash manager: cleanup is ALWAYS a move into
 * `<home>/.storage-doctor/trash/<batch-id>/` with a batch manifest — never a
 * direct delete. Restore moves items back without overwriting; purge (the one
 * destructive action) requires an explicit `confirm: 'PURGE'`.
 *
 * Move strategy (design.md §3): same-volume `rename` (atomic, instant);
 * cross-volume (EXDEV) falls back to copy → sha256 verify → delete source.
 * Busy/permission-locked files (EBUSY/EPERM, typical for sqlite WALs on
 * Windows) are skipped and recorded — never retried, never force-deleted.
 */

import { createHash, randomBytes } from 'node:crypto'
import { readdirSync, readFileSync, rmSync } from 'node:fs'
import {
  copyFile as nodeCopyFile,
  cp as nodeCp,
  mkdir as nodeMkdir,
  readdir as nodeReaddir,
  readFile as nodeReadFile,
  rename as nodeRename,
  rm as nodeRm,
  stat as nodeStat,
  writeFile as nodeWriteFile,
} from 'node:fs/promises'
import { dirname, isAbsolute, join } from 'node:path'
import { isBlacklisted } from './policy.js'

const MANIFEST_NAME = 'manifest.json'
const MANIFEST_TMP_NAME = 'manifest.json.tmp'

function batchId(now) {
  const stamp = new Date(now).toISOString().replace(/[-:T]/g, '').slice(0, 14)
  return `${stamp.slice(0, 8)}-${stamp.slice(8)}-${randomBytes(3).toString('hex')}`
}

function assertRelative(relPath) {
  if (typeof relPath !== 'string' || relPath === '' || isAbsolute(relPath) || relPath.includes('..') || relPath.includes('\\')) {
    throw new TypeError(`storage-doctor: unsafe relative path refused: ${String(relPath)}`)
  }
}

async function hashTree(root, fs) {
  const out = new Map()
  const hashOne = async (full, rel) => {
    const buffer = await fs.readFile(full)
    out.set(rel, { bytes: buffer.byteLength, sha256: createHash('sha256').update(buffer).digest('hex') })
  }
  const rootStats = await fs.stat(root)
  if (rootStats.isFile()) {
    await hashOne(root, '')
    return out
  }
  const walk = async (dir, prefix) => {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = join(dir, entry.name)
      const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`
      if (entry.isDirectory()) {
        await walk(full, rel)
        continue
      }
      if (!entry.isFile()) continue
      await hashOne(full, rel)
    }
  }
  await walk(root, '')
  return out
}

function sameTree(left, right) {
  if (left.size !== right.size) return false
  for (const [rel, value] of left) {
    const other = right.get(rel)
    if (other === undefined || other.bytes !== value.bytes || other.sha256 !== value.sha256) return false
  }
  return true
}

async function pruneEmptyDirs(dir, stopAt, fs) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    await pruneEmptyDirs(join(dir, entry.name), stopAt, fs)
  }
  if (dir === stopAt) return
  const remaining = await fs.readdir(dir).catch(() => ['?'])
  if (remaining.length === 0) await fs.rm(dir, { recursive: true, force: true }).catch(() => {})
}

export class TrashManager {
  /**
   * @param {object} options
   * @param {string} options.home DSH home root; the trash lives inside it
   * @param {object} [options.fs] injectable fs/promises subset (tests)
   */
  constructor({ home, fs } = {}) {
    if (typeof home !== 'string' || home === '') throw new TypeError('storage-doctor: trash needs a home path')
    this.home = home
    this.trashRoot = join(home, '.storage-doctor', 'trash')
    this.fs = {
      copyFile: fs?.copyFile ?? nodeCopyFile,
      cp: fs?.cp ?? nodeCp,
      mkdir: fs?.mkdir ?? nodeMkdir,
      readdir: fs?.readdir ?? nodeReaddir,
      readFile: fs?.readFile ?? nodeReadFile,
      rename: fs?.rename ?? nodeRename,
      rm: fs?.rm ?? nodeRm,
      stat: fs?.stat ?? nodeStat,
      writeFile: fs?.writeFile ?? nodeWriteFile,
    }
  }

  batchDir(id) {
    assertRelative(id)
    if (id.includes('/')) throw new TypeError('storage-doctor: invalid batch id')
    return join(this.trashRoot, id)
  }

  /**
   * Move items into a new trash batch. Validates every item BEFORE touching
   * the filesystem; blacklisted or unsafe paths refuse the whole batch.
   *
   * @param {Array<{ relPath: string, bytes: number, kind: string }>} items
   * @param {object} options `{ policy, now }`
   * @returns {Promise<{ id, dir, manifest, moved: number, skipped: Array<{ relPath, reason }> }>}
   */
  async clean(items, { policy = {}, now = Date.now() } = {}) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new TypeError('storage-doctor: clean needs a non-empty item list')
    }
    for (const item of items) {
      assertRelative(item.relPath)
      if (isBlacklisted(item.relPath)) {
        throw new Error(`storage-doctor: blacklisted path refused by trash: ${item.relPath}`)
      }
    }

    const id = batchId(now)
    const dir = this.batchDir(id)
    await this.fs.mkdir(dir, { recursive: true })

    const manifestItems = []
    const skipped = []
    let moved = 0

    for (const item of items) {
      const source = join(this.home, item.relPath)
      const destination = join(dir, item.relPath)
      const record = { relPath: item.relPath, bytes: item.bytes, kind: item.kind }
      try {
        await this.fs.mkdir(dirname(destination), { recursive: true })
        try {
          await this.fs.rename(source, destination)
          manifestItems.push({ ...record, status: 'trashed', via: 'rename' })
          moved += 1
          continue
        } catch (error) {
          if (error?.code !== 'EXDEV') throw error
        }
        // Cross-volume fallback: copy, verify by sha256, then delete source.
        let stats
        try {
          stats = await this.fs.stat(source)
        } catch (error) {
          manifestItems.push({ ...record, status: 'skipped', skipReason: error?.code ?? String(error) })
          skipped.push({ relPath: item.relPath, reason: error?.code ?? String(error) })
          continue
        }
        const before = await hashTree(source, this.fs)
        if (stats.isDirectory()) {
          await this.fs.cp(source, destination, { recursive: true })
        } else {
          await this.fs.copyFile(source, destination)
        }
        const after = await hashTree(destination, this.fs)
        if (!sameTree(before, after)) {
          await this.fs.rm(destination, { recursive: true, force: true })
          throw Object.assign(new Error('verification failed after cross-device copy'), { code: 'VERIFY_FAILED' })
        }
        try {
          await this.fs.rm(source, { recursive: true, force: true })
        } catch (error) {
          // Source still locked: undo the trash copy, keep the original.
          await this.fs.rm(destination, { recursive: true, force: true }).catch(() => {})
          throw error
        }
        manifestItems.push({ ...record, status: 'trashed', via: 'copy' })
        moved += 1
      } catch (error) {
        const reason = error?.code ?? (error instanceof Error ? error.message : String(error))
        manifestItems.push({ ...record, status: 'skipped', skipReason: reason })
        skipped.push({ relPath: item.relPath, reason })
      }
    }

    const manifest = { id, at: now, policy, home: this.home, status: 'trashed', items: manifestItems }
    await this.fs.writeFile(join(dir, MANIFEST_TMP_NAME), JSON.stringify(manifest, null, 2))
    await this.fs.rename(join(dir, MANIFEST_TMP_NAME), join(dir, MANIFEST_NAME))
    return { id, dir, manifest, moved, skipped }
  }

  /**
   * Move every trashed item of a batch back to its original path.
   * Refuses the WHOLE batch when any original path is occupied (never
   * overwrites user data); rolls back partial progress on mid-way failures.
   * @param {string} id batch id
   */
  async restore(id) {
    const dir = this.batchDir(id)
    const manifest = await this.readManifest(dir)
    if (manifest.status === 'restored') {
      throw new TypeError(`storage-doctor: batch ${id} is already restored`)
    }
    const trashed = manifest.items.filter(item => item.status === 'trashed')

    const conflicts = []
    for (const item of trashed) {
      const source = join(this.home, item.relPath)
      if (await this.fs.stat(source).then(() => true, () => false)) conflicts.push(item.relPath)
    }
    if (conflicts.length > 0) {
      throw Object.assign(
        new Error(`storage-doctor: restore would overwrite existing files: ${conflicts.join(', ')}`),
        { code: 'RESTORE_CONFLICT', conflicts },
      )
    }

    const done = []
    try {
      for (const item of trashed) {
        const source = join(this.home, item.relPath)
        const destination = join(dir, item.relPath)
        await this.fs.mkdir(dirname(source), { recursive: true })
        await this.fs.rename(destination, source)
        done.push(item.relPath)
      }
    } catch (error) {
      for (const relPath of done) {
        await this.fs.rename(join(this.home, relPath), join(dir, relPath)).catch(() => {})
      }
      throw Object.assign(
        error instanceof Error ? error : new Error(String(error)),
        { code: 'RESTORE_FAILED', restoredBeforeFailure: done },
      )
    }

    manifest.status = 'restored'
    manifest.restoredAt = Date.now()
    await this.fs.writeFile(join(dir, MANIFEST_TMP_NAME), JSON.stringify(manifest, null, 2))
    await this.fs.rename(join(dir, MANIFEST_TMP_NAME), join(dir, MANIFEST_NAME))
    await pruneEmptyDirs(dir, dir, this.fs)
    return { id, restored: done.length }
  }

  /**
   * The single destructive action: delete a whole batch from the trash.
   * Requires `{ confirm: 'PURGE' }`.
   */
  async purge(id, { confirm } = {}) {
    if (confirm !== 'PURGE') {
      throw new TypeError("storage-doctor: purge requires the exact confirmation string 'PURGE'")
    }
    const dir = this.batchDir(id)
    await this.fs.rm(dir, { recursive: true, force: true })
    return { id, purged: true }
  }

  /**
   * Trash expiry (design.md: the only automatic deletion, default 7 days).
   * Removes batches whose manifest is still `trashed` and older than `days`;
   * restored batches keep their manifest history and are never touched.
   * @param {{ days: number, now?: number }} options
   * @returns {{ purged: string[] }}
   */
  purgeExpired({ days, now = Date.now() } = {}) {
    const retention = Number(days)
    if (!Number.isFinite(retention) || retention <= 0) {
      throw new TypeError('storage-doctor: trash retention days must be a positive finite number')
    }
    const purged = []
    for (const batch of this.listBatches()) {
      if (batch.status !== 'trashed' || batch.at === null) continue
      if (now - batch.at <= retention * 86_400_000) continue
      try {
        rmSync(join(this.trashRoot, batch.id), { recursive: true, force: true })
        purged.push(batch.id)
      } catch {
        // Expiry is best-effort; a locked batch simply waits for the next tick.
      }
    }
    return { purged }
  }

  /** Trash batch list from disk (manifest-less directories report incomplete). */
  listBatches() {
    let entries = []
    try {
      entries = readdirSync(this.trashRoot, { withFileTypes: true })
    } catch {
      return []
    }
    const batches = []
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const dir = join(this.trashRoot, entry.name)
      try {
        const manifest = JSON.parse(readFileSync(join(dir, MANIFEST_NAME), 'utf8'))
        batches.push({
          id: manifest.id ?? entry.name,
          at: manifest.at ?? null,
          policy: manifest.policy ?? null,
          itemCount: manifest.items?.length ?? 0,
          bytes: (manifest.items ?? []).reduce((sum, item) => sum + (item.bytes || 0), 0),
          status: manifest.status ?? 'trashed',
        })
      } catch {
        batches.push({ id: entry.name, at: null, policy: null, itemCount: 0, bytes: 0, status: 'incomplete' })
      }
    }
    return batches.sort((left, right) => (right.at ?? 0) - (left.at ?? 0))
  }

  async readManifest(dir) {
    const raw = await this.fs.readFile(join(dir, MANIFEST_NAME)).catch(() => null)
    if (raw === null) throw new TypeError(`storage-doctor: unknown or incomplete trash batch: ${dir}`)
    const manifest = JSON.parse(String(raw))
    if (!Array.isArray(manifest.items)) throw new TypeError('storage-doctor: corrupt trash manifest')
    return manifest
  }
}
