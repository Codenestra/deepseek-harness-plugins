/**
 * Storage Doctor attachment GC engine (M4, experimental, OFF by default).
 *
 * Approved safety boundaries (user review 2026-11-13):
 *  - FAIL CLOSED: any read/parse failure, undecodable zstd, oversized corpus
 *    file, or unknown objects-store structure marks the corpus incomplete and
 *    yields ZERO candidates. "Cannot parse" is never treated as "unreferenced".
 *  - This module NEVER writes, moves, or deletes: it only produces dry-run
 *    reports and candidate lists. Moves go through lib/trash.js (restorable).
 *  - The clean route must call gcReport() AGAIN at clean time and re-check
 *    every selected path against the fresh candidate set (preview→clean race).
 *
 * Reference corpus (original sources only; derived caches of these add no new
 * references, heavy plugin sqlite mirrors are deliberately out of scope and
 * disclosed in the report):
 *  1. sessions/**                      — every file; `.zstd` decoded via node:zlib zstd
 *  2. storages/session_projcache/**    — projection cache (over-protective)
 *  3. .storage-doctor/trash/**         — our own trash batches: restored sessions
 *     would re-reference their attachments, so trashed copies count as references.
 *     Excluded inside the trash: copies of `attachments/v1/objects/**` (GC'd object
 *     bytes are not references) — and the plugin's own ledger sqlite is excluded
 *     everywhere (it stores candidate relPaths containing sha256 names; scanning it
 *     would mark every previously trashed object as referenced forever).
 *
 * Object store layout (packages/attachment/attachment-local): content-addressed
 * `attachments/v1/objects/<sha[0:2]>/<sha64hex>`; references appear in session
 * logs as `sha256:<hex64>`. Extraction scans for bare 64-hex runs (latin1), an
 * over-approximation that can only protect more, never less.
 * `file-objects/` + `files/` (verbatim file attachments) are OUT of scope for v1.
 */
import { readdir as nodeReaddir, stat as nodeStat, readFile as nodeReadFile } from 'node:fs/promises'
import { join } from 'node:path'
import nodeZlib from 'node:zlib'
import { isBlacklisted } from './policy.js'

const DAY_MS = 86_400_000
const SHA_RUN_RE = /[a-f0-9]{64}/g
const OBJECT_NAME_RE = /^[a-f0-9]{64}$/
const PREFIX_NAME_RE = /^[a-f0-9]{2}$/
/**
 * SD-M4-GC-01: the real home contained `objects/72/<sha64>.png`. Platform
 * evidence (attachment-local/src/store.ts `normalizedImagePath`, unchanged
 * since the first writer cb4c11b869) is extensionless `<sha64>`; no platform
 * version ever appended an extension, and reference IDs are `sha256:<hex64>`
 * regardless of file names. Such a file is therefore a FOREIGN artifact of
 * valid shape: we recognize the narrow variant `<64hex>.<platform image ext>`
 * (the extension set exactly matches the llm/content.ts mediaType→ext
 * mapping), inventory and disclose it, and protect it via its sha like any
 * object — but it is NEVER a GC candidate (unattributable writer → never
 * moved). Any name outside the two defined shapes still fails the whole GC
 * closed (structure-anomaly, zero candidates).
 */
const OBJECT_VARIANT_RE = /^([a-f0-9]{64})\.(png|jpg|webp|gif)$/

/** Corpus files larger than this cannot be proven covered in memory → fail closed. */
export const MAX_CORPUS_FILE_BYTES = 512 * 1024 * 1024
/** Failures listed in a report (the full count is always reported). */
const MAX_REPORTED_FAILURES = 20

/** Whether the bundled Node exposes native zstd decoding (probed at load). */
export function zstdDecoderAvailable(zlib = nodeZlib) {
  return typeof zlib?.zstdDecompressSync === 'function'
}

/**
 * Normalize the GC age threshold in days.
 * @param {unknown} [input]
 * @returns {number} integer days, default 30
 */
export function normalizeGcDays(input) {
  if (input === undefined || input === null || input === '') return 30
  const number = Number(input)
  if (typeof input === 'boolean' || !Number.isInteger(number) || number < 1 || number > 3650) {
    throw new TypeError('storage-doctor: attachmentGcDays must be an integer between 1 and 3650')
  }
  return number
}

function isMissing(error) {
  return error?.code === 'ENOENT'
}

/**
 * Walk `rootRel` under the home and visit every regular file.
 * Yields { path, rel, name, dirent }; records failures instead of throwing.
 */
async function* walkFiles(home, rootRel, fs, failures) {
  const stack = [rootRel]
  while (stack.length > 0) {
    const rel = stack.pop()
    let entries
    try {
      entries = await fs.readdir(join(home, ...rel.split('/')), { withFileTypes: true })
    } catch (error) {
      if (!isMissing(error) || rel !== rootRel) {
        failures.push({ path: rel || '.', reason: `readdir: ${error?.message ?? error}` })
      }
      continue
    }
    for (const entry of entries) {
      const childRel = rel === '' ? entry.name : `${rel}/${entry.name}`
      if (entry.isSymbolicLink()) {
        // A link could hide referenced content anywhere: never provable → fail closed.
        failures.push({ path: childRel, reason: 'symbolic link in reference corpus' })
        continue
      }
      if (entry.isDirectory()) {
        stack.push(childRel)
        continue
      }
      if (!entry.isFile()) {
        failures.push({ path: childRel, reason: 'non-regular file in reference corpus' })
        continue
      }
      yield { path: join(home, ...childRel.split('/')), rel: childRel, name: entry.name }
    }
  }
}

function shouldSkipCorpusFile(rel) {
  if (rel === '.storage-doctor/storage-doctor.sqlite'
    || rel.startsWith('.storage-doctor/storage-doctor.sqlite-')) return true
  // GC'd object copies inside trash batches are payloads, not references.
  return rel.startsWith('.storage-doctor/trash/') && rel.includes('attachments/v1/objects/')
}

/**
 * Extract every referenced sha256 from the corpus sources.
 * @returns {Promise<{ hashes: Set<string>, files: number, failures: Array<{path:string,reason:string}> }>}
 */
export async function collectCorpus(home, options = {}) {
  const fs = {
    readdir: options.fs?.readdir ?? nodeReaddir,
    stat: options.fs?.stat ?? nodeStat,
    readFile: options.fs?.readFile ?? nodeReadFile,
  }
  const zlib = options.zlib ?? nodeZlib
  const decoderAvailable = options.decoderAvailable ?? zstdDecoderAvailable(zlib)
  const hashes = new Set()
  const failures = []
  let files = 0

  if (!decoderAvailable) {
    return { hashes, files, failures: [{ path: 'node:zlib', reason: 'native zstd decoder unavailable' }] }
  }

  const scanFile = async (path, rel) => {
    let stats
    try {
      stats = await fs.stat(path)
    } catch (error) {
      failures.push({ path: rel, reason: `stat: ${error?.message ?? error}` })
      return
    }
    if (stats.size > MAX_CORPUS_FILE_BYTES) {
      failures.push({ path: rel, reason: `corpus file exceeds ${MAX_CORPUS_FILE_BYTES} bytes; coverage unprovable` })
      return
    }
    let buffer
    try {
      buffer = await fs.readFile(path)
    } catch (error) {
      failures.push({ path: rel, reason: `read: ${error?.message ?? error}` })
      return
    }
    if (rel.endsWith('.zstd')) {
      try {
        buffer = zlib.zstdDecompressSync(buffer)
      } catch (error) {
        failures.push({ path: rel, reason: `zstd decode: ${error?.message ?? error}` })
        return
      }
    }
    files += 1
    const text = buffer.toString('latin1')
    for (const match of text.matchAll(SHA_RUN_RE)) hashes.add(match[0])
  }

  for (const source of ['sessions', 'storages/session_projcache', '.storage-doctor/trash']) {
    for await (const file of walkFiles(home, source, fs, failures)) {
      if (shouldSkipCorpusFile(file.rel)) continue
      await scanFile(file.path, file.rel)
    }
  }

  return { hashes, files, failures }
}

/**
 * Inventory the content-addressed image object store with structural checks.
 * @returns {Promise<{ objects: Array<{relPath:string,sha:string,bytes:number,mtimeMs:number}>, failures: Array<{path:string,reason:string}> }>}
 */
export async function listObjects(home, options = {}) {
  const fs = {
    readdir: options.fs?.readdir ?? nodeReaddir,
    stat: options.fs?.stat ?? nodeStat,
  }
  const objects = []
  const failures = []
  const rootRel = 'attachments/v1/objects'

  let prefixes
  try {
    prefixes = await fs.readdir(join(home, 'attachments/v1/objects'), { withFileTypes: true })
  } catch (error) {
    if (!isMissing(error)) failures.push({ path: rootRel, reason: `readdir: ${error?.message ?? error}` })
    return { objects, failures }
  }

  for (const prefix of prefixes) {
    const prefixRel = `${rootRel}/${prefix.name}`
    if (prefix.isSymbolicLink()) {
      failures.push({ path: prefixRel, reason: 'symbolic link in object store' })
      continue
    }
    if (!prefix.isDirectory()) {
      failures.push({ path: prefixRel, reason: 'unknown non-directory entry in object store' })
      continue
    }
    if (!PREFIX_NAME_RE.test(prefix.name)) {
      failures.push({ path: prefixRel, reason: 'directory name is not a 2-hex prefix' })
      continue
    }
    let entries
    try {
      entries = await fs.readdir(join(home, ...prefixRel.split('/')), { withFileTypes: true })
    } catch (error) {
      failures.push({ path: prefixRel, reason: `readdir: ${error?.message ?? error}` })
      continue
    }
    for (const entry of entries) {
      const relPath = `${prefixRel}/${entry.name}`
      if (entry.isSymbolicLink() || !entry.isFile()) {
        failures.push({ path: relPath, reason: 'unknown non-regular entry in object store' })
        continue
      }
      const canonical = OBJECT_NAME_RE.test(entry.name)
      const variant = canonical ? null : OBJECT_VARIANT_RE.exec(entry.name)
      if ((!canonical && variant === null) || entry.name.slice(0, 2) !== prefix.name) {
        failures.push({ path: relPath, reason: 'object name does not match the content-addressed layout' })
        continue
      }
      let stats
      try {
        stats = await fs.stat(join(home, ...relPath.split('/')))
      } catch (error) {
        failures.push({ path: relPath, reason: `stat: ${error?.message ?? error}` })
        continue
      }
      objects.push({
        relPath,
        sha: canonical ? entry.name : variant[1],
        bytes: stats.size,
        mtimeMs: stats.mtimeMs,
        canonical,
      })
    }
  }

  return { objects, failures }
}

/**
 * Build the read-only GC dry-run report. NEVER mutates anything.
 *
 * @param {object} params
 * @param {string} params.home DSH home to inspect
 * @param {boolean} params.enabled config `attachmentGc` value
 * @param {number} [params.days=30] age threshold (normalizeGcDays output)
 * @param {number} [params.now] injectable clock
 * @param {object} [params.fs] injectable fs subset (readdir/stat/readFile)
 * @param {object} [params.zlib] injectable zlib (tests)
 * @returns {Promise<object>} report; `candidates` is [] whenever `complete` is false
 */
export async function gcReport(params) {
  const { home, enabled } = params
  const days = normalizeGcDays(params.days)
  const now = params.now ?? Date.now()
  const fs = params.fs
  const zlib = params.zlib
  const decoderAvailable = zstdDecoderAvailable(zlib)

  const [corpus, store] = await Promise.all([
    collectCorpus(home, { fs, zlib }),
    listObjects(home, { fs }),
  ])

  const corpusFailures = corpus.failures
  const structureFailures = store.failures
  const complete = decoderAvailable && corpusFailures.length === 0 && structureFailures.length === 0
  const incompleteReason = !complete
    ? (!decoderAvailable ? 'decoder-unavailable' : structureFailures.length > 0 ? 'structure-anomaly' : 'corpus-failure')
    : null

  const candidates = []
  if (complete) {
    for (const object of store.objects) {
      if (!object.canonical) continue // foreign-shape variants are never moved (SD-M4-GC-01)
      if (corpus.hashes.has(object.sha)) continue
      if (now - object.mtimeMs <= days * DAY_MS) continue
      if (isBlacklisted(object.relPath)) continue
      candidates.push({ relPath: object.relPath, sha: object.sha, bytes: object.bytes, mtimeMs: object.mtimeMs, kind: 'attachment-object' })
    }
    candidates.sort((left, right) => right.bytes - left.bytes || left.relPath.localeCompare(right.relPath))
  }

  const foreign = store.objects.filter(object => !object.canonical)
  const failures = [...corpusFailures, ...structureFailures]
  return {
    enabled: enabled === true,
    decoderAvailable,
    days,
    at: now,
    complete,
    incompleteReason,
    corpus: {
      filesScanned: corpus.files,
      hashes: corpus.hashes.size,
      failureCount: corpusFailures.length,
    },
    objects: {
      count: store.objects.length,
      bytes: store.objects.reduce((sum, object) => sum + object.bytes, 0),
      foreignCount: foreign.length,
      foreignFormats: foreign.slice(0, MAX_REPORTED_FAILURES).map(object => ({
        path: object.relPath,
        reason: 'recognized image-extension variant; inventoried and protected, never a GC candidate',
      })),
    },
    failures: failures.slice(0, MAX_REPORTED_FAILURES),
    candidates,
    candidateCount: candidates.length,
    candidateBytes: candidates.reduce((sum, candidate) => sum + candidate.bytes, 0),
    scopeNote: 'v1 covers attachments/v1/objects (normalized images, extensionless platform format) only; foreign-shape variants (<sha>.png/.jpg/.webp/.gif) are inventoried but never cleaned; file-objects/files and derived plugin caches (e.g. context-inspector mirrors) are out of scope and disclosed here.',
  }
}
