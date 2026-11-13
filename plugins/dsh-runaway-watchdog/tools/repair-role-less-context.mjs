#!/usr/bin/env node
/**
 * Repair session logs whose injected context message is not a canonical
 * user-role message.
 *
 * A context message handed to the host as `additionalContexts` is appended
 * verbatim as a `user/message` event and later replayed straight into the
 * provider request. When its producer omits `role` (and `id`), `JSON.stringify`
 * drops the undefined key and the request body reaches the provider without a
 * `role` field at that index. The provider rejects the whole call:
 *
 *   Failed to deserialize the JSON body into the target type:
 *   messages[666]: missing field `role` ... (code INVALID_REQUEST)
 *
 * Patching the producer stops new damage; this tool rescues logs that already
 * contain such a record.
 *
 * Invariants this tool preserves, because the log reader enforces them:
 * - only the message payload (`event.data`) is edited; the event envelope
 *   (`type`, `seq`, `time`, `data`) is written back intact — dropping it turns
 *   the row into an "invalid committed event ... lacks required field type";
 * - the first frame stays exactly the header line, and only frames that carry
 *   an edited row are recompressed, so every other frame is byte-identical;
 * - a torn final frame is copied through untouched for the backend to recover;
 * - a timestamped backup is written before the replacement, and the rebuilt
 *   artifact is re-decoded and checked row by row before it is installed.
 *
 * Usage:
 *   node tools/repair-role-less-context.mjs                 # dry run, default root
 *   node tools/repair-role-less-context.mjs --apply         # rewrite with backups
 *   node tools/repair-role-less-context.mjs --root <dir>
 *   node tools/repair-role-less-context.mjs --apply <file-or-dir>...
 *
 * Options:
 *   --apply        write changes (default: report only)
 *   --root <dir>   sessions root (default: ~/.dsh/sessions)
 *   --force        also rewrite a file modified in the last two minutes
 *   --quiet        print only files that need or received a repair
 *
 * Exit code: 0 when no record needs repair (or every planned repair applied),
 * 1 when a dry run found work, 2 on an operational failure.
 *
 * Close the Harness before `--apply`: a live session will not observe a
 * rewritten log, and it must be restarted to load the repaired one.
 */

import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { constants, zstdCompressSync, zstdDecompressSync } from 'node:zlib'
import { join, resolve } from 'node:path'
import { homedir } from 'node:os'
import { pathToFileURL } from 'node:url'

const ZSTD_MAGIC = 0xFD2FB528
const CHECKSUM_OPTIONS = { params: { [constants.ZSTD_c_checksumFlag]: 1 } }
const RECENT_MS = 2 * 60 * 1000
const LOG_NAMES = ['session.v4.jsonl.zstd', 'session.v4.jsonl']

/**
 * Locate complete Zstandard frames without decompressing their blocks.
 * Mirrors the persistence backend's scanner: an invalid complete structure
 * rejects, while EOF inside the final frame reports where it starts.
 * @param {Buffer} buffer - current artifact bytes.
 * @returns {{ frames: { start: number, end: number }[], tornStart?: number }}
 */
export function scanZstdFrames(buffer) {
  const frames = []
  let offset = 0
  while (offset < buffer.length) {
    const start = offset
    if (buffer.length - offset < 4) return { frames, tornStart: start }
    if (buffer.readUInt32LE(offset) !== ZSTD_MAGIC) throw new Error(`invalid frame magic at byte ${offset}`)
    offset += 4
    if (offset === buffer.length) return { frames, tornStart: start }
    const descriptor = buffer.readUInt8(offset)
    offset += 1
    if ((descriptor & 0x18) !== 0) throw new Error(`reserved frame-header bit at byte ${offset - 1}`)
    const contentSizeFlag = descriptor >>> 6
    const singleSegment = (descriptor & 0x20) !== 0
    const checksum = (descriptor & 0x04) !== 0
    const dictionaryFlag = descriptor & 0x03
    const dictionaryBytes = dictionaryFlag === 3 ? 4 : dictionaryFlag
    const contentSizeBytes = contentSizeFlag === 0 ? (singleSegment ? 1 : 0) : 1 << contentSizeFlag
    const remainingHeaderBytes = (singleSegment ? 0 : 1) + dictionaryBytes + contentSizeBytes
    if (buffer.length - offset < remainingHeaderBytes) return { frames, tornStart: start }
    offset += remainingHeaderBytes
    for (;;) {
      if (buffer.length - offset < 3) return { frames, tornStart: start }
      const blockHeader = buffer.readUIntLE(offset, 3)
      offset += 3
      const lastBlock = (blockHeader & 1) !== 0
      const blockType = (blockHeader >>> 1) & 0x03
      const blockSize = blockHeader >>> 3
      if (blockType === 0x03) throw new Error(`reserved block type at byte ${offset - 3}`)
      const payloadBytes = blockType === 0x01 ? 1 : blockSize
      if (buffer.length - offset < payloadBytes) return { frames, tornStart: start }
      offset += payloadBytes
      if (lastBlock) break
    }
    if (checksum) {
      if (buffer.length - offset < 4) return { frames, tornStart: start }
      offset += 4
    }
    frames.push({ start, end: offset })
  }
  return { frames }
}

/** Deterministic UUIDv4-shaped id so a repeated repair is byte-identical. */
export function stableUuid(seed) {
  const hex = createHash('sha256').update(seed).digest('hex')
  const variant = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

/** One-line account of a context source, for the repair report. */
function describeSource(data) {
  const kind = data.source?.kind ?? 'unknown'
  return data.source?.summary === undefined ? kind : `${kind} (${data.source.summary})`
}

/**
 * Return the repaired event text, or null when the line needs no change.
 * Only a `user/message` whose payload is a role-less injected context object is
 * touched: a payload with a different explicit role is reported, never guessed.
 * The event envelope is preserved; only `event.data` gains `id` and `role`.
 * @param {string} line - one JSONL record.
 * @param {string} seed - session identity for deterministic ids.
 * @returns {{ text: string, before: string, after: string } | { unsupported: string } | null}
 */
export function repairRecord(line, seed) {
  let event
  try {
    event = JSON.parse(line)
  } catch {
    return null
  }
  if (event === null || typeof event !== 'object' || event.type !== 'user/message') return null
  const data = event.data
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return null
  if (!Array.isArray(data.content)) return null
  if (data.role !== undefined && data.role !== 'user') {
    return { unsupported: `role ${JSON.stringify(data.role)}` }
  }
  const missingRole = data.role === undefined
  const missingId = typeof data.id !== 'string' || data.id === ''
  if (!missingRole && !missingId) return null
  // Envelope first, payload second: spread the message with its new identity
  // and write it back as the event's `data`, never in place of the event.
  const repaired = {
    id: missingId ? stableUuid(`${seed}:${String(event.seq)}:${data.source?.kind ?? 'context'}`) : data.id,
    role: 'user',
    ...data,
  }
  if (missingRole) repaired.role = 'user'
  return {
    text: JSON.stringify({ ...event, data: repaired }),
    before: describeSource(data),
    after: 'role:user' + (missingId ? ' +id' : ''),
  }
}

/** Patch one frame's plaintext and record what changed. */
function repairFrameText(text, seed, hits) {
  const lines = text.split('\n')
  let touched = false
  const repaired = lines.map((line) => {
    if (line.trim() === '') return line
    const result = repairRecord(line, seed)
    if (result === null) return line
    if (result.unsupported !== undefined) {
      hits.push({ kind: 'unsupported', detail: result.unsupported })
      return line
    }
    touched = true
    hits.push({ kind: 'repaired', detail: result })
    return result.text
  })
  return { text: touched ? repaired.join('\n') : null, touched }
}

/** Session identity from the header record, used to keep generated ids stable. */
function sessionSeed(text, path) {
  const first = text.split('\n').find((line) => line.trim() !== '') ?? ''
  try {
    const header = JSON.parse(first)
    if (typeof header.id === 'string' && header.id !== '') return header.id
  } catch {
    /* a header we cannot read still yields a usable path-derived seed */
  }
  return path
}

/** Decode a whole artifact into per-frame plaintext, or plain text when uncompressed. */
function decodeArtifact(buffer, compressed) {
  if (!compressed) return { texts: [buffer.toString('utf8')], frames: [], torn: undefined }
  const { frames, tornStart } = scanZstdFrames(buffer)
  if (frames.length === 0) throw new Error('empty or header-less Zstandard session log')
  const texts = frames.map(({ start, end }) => zstdDecompressSync(buffer.subarray(start, end)).toString('utf8'))
  return { texts, frames, torn: tornStart === undefined ? undefined : buffer.subarray(tornStart) }
}

/** Split decoded frames into non-empty record lines. */
function recordsOf(texts) {
  const records = []
  for (const text of texts) {
    for (const line of text.split('\n')) if (line.trim() !== '') records.push(line)
  }
  return records
}

/**
 * Re-decode the rebuilt artifact and prove the repair did exactly what it claims:
 * the record count is unchanged, every row still carries its envelope, every
 * edited row keeps its `type`, `seq`, and message `source`/`content`, and no
 * `user/message` is left without an identity and role.
 * @param {Buffer} buffer - rebuilt artifact bytes.
 * @param {boolean} compressed - whether the artifact is Zstandard-framed.
 * @param {string[]} before - record lines of the original artifact.
 * @throws when any invariant fails; the caller must not install the file.
 */
export function verifyRepaired(buffer, compressed, before) {
  const records = recordsOf(decodeArtifact(buffer, compressed).texts)
  if (records.length !== before.length) {
    throw new Error(`record count changed: ${before.length} -> ${records.length}`)
  }
  let edited = 0
  for (let index = 0; index < records.length; index += 1) {
    const event = JSON.parse(records[index])
    if (event === null || typeof event !== 'object' || typeof event.type !== 'string' || event.type === '') {
      throw new Error(`row ${index} lost its event type (envelope overwritten)`)
    }
    if (event.type !== 'session' && !Number.isSafeInteger(event.seq)) {
      throw new Error(`row ${index} (${event.type}) lost its seq`)
    }
    if (records[index] === before[index]) continue
    edited += 1
    const original = JSON.parse(before[index])
    if (original.type !== event.type || original.seq !== event.seq) {
      throw new Error(`row ${index} changed identity: ${original.type}/${original.seq} -> ${event.type}/${event.seq}`)
    }
    if (JSON.stringify(original.data?.source) !== JSON.stringify(event.data?.source)
      || JSON.stringify(original.data?.content) !== JSON.stringify(event.data?.content)) {
      throw new Error(`row ${index} changed message source or content`)
    }
  }
  if (edited === 0) throw new Error('rebuild produced no edited row')
  for (const line of records) {
    const event = JSON.parse(line)
    if (event.type !== 'user/message') continue
    if (event.data?.role !== 'user' || typeof event.data.id !== 'string' || event.data.id === '') {
      throw new Error(`row ${event.seq} is still a noncanonical user/message`)
    }
  }
  return { records: records.length, edited }
}

/**
 * Repair one session artifact.
 * @param {string} path - session log path.
 * @param {{ apply: boolean, force: boolean, quiet: boolean }} options
 * @returns {{ needsRepair: boolean, applied: boolean, hits: object[], verified?: object }}
 */
export function repairArtifact(path, options) {
  const compressed = path.endsWith('.zstd')
  const original = readFileSync(path)
  const { texts, frames, torn } = decodeArtifact(original, compressed)
  const before = recordsOf(texts)
  const seed = sessionSeed(texts[0] ?? '', path)
  const hits = []
  const rebuilt = []
  for (let index = 0; index < texts.length; index += 1) {
    const { text, touched } = repairFrameText(texts[index], seed, hits)
    if (!touched) {
      rebuilt.push(compressed
        ? original.subarray(frames[index].start, frames[index].end)
        : Buffer.from(texts[index], 'utf8'))
      continue
    }
    if (compressed && index === 0) throw new Error('refusing to rewrite the header frame')
    rebuilt.push(compressed
      ? zstdCompressSync(Buffer.from(text, 'utf8'), CHECKSUM_OPTIONS)
      : Buffer.from(text, 'utf8'))
  }
  if (torn !== undefined) rebuilt.push(torn)

  const repairedCount = hits.filter(hit => hit.kind === 'repaired').length
  const unsupported = hits.filter(hit => hit.kind === 'unsupported')
  if (!options.quiet || repairedCount > 0 || unsupported.length > 0) {
    console.log(`${path}`)
    for (const hit of hits) {
      if (hit.kind === 'repaired') console.log(`  repair  ${hit.detail.before} -> ${hit.detail.after}`)
      else console.log(`  skip    unexpected ${hit.detail} on a user/message: fix by hand`)
    }
    if (repairedCount === 0) console.log('  clean')
  }
  if (repairedCount === 0) return { needsRepair: false, applied: false, hits }

  const next = Buffer.concat(rebuilt)
  const verified = verifyRepaired(next, compressed, before)
  console.log(`  verify  ${verified.records} records, ${verified.edited} edited, envelopes intact`)
  if (!options.apply) return { needsRepair: true, applied: false, hits, verified }
  const age = Date.now() - statSync(path).mtimeMs
  if (age < RECENT_MS && !options.force) {
    console.log(`  skip    modified ${Math.round(age / 1000)}s ago: close the session and rerun with --force`)
    return { needsRepair: true, applied: false, hits, verified }
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backup = `${path}.bak-${stamp}`
  writeFileSync(backup, original)
  const staged = `${path}.tmp-${process.pid}`
  writeFileSync(staged, next)
  renameSync(staged, path)
  console.log(`  wrote   ${path} (backup ${backup})`)
  return { needsRepair: true, applied: true, hits, verified }
}

/** Collect candidate session logs from explicit paths or the sessions root. */
export function collectTargets(root, explicit) {
  const found = []
  const visit = (path) => {
    const stats = statSync(path)
    if (stats.isFile()) {
      found.push(resolve(path))
      return
    }
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const child = join(path, entry.name)
      if (entry.isDirectory()) visit(child)
      else if (LOG_NAMES.includes(entry.name)) found.push(resolve(child))
    }
  }
  for (const path of explicit) {
    if (!existsSync(path)) throw new Error(`no such path: ${path}`)
    visit(path)
  }
  if (explicit.length === 0) {
    const sessions = resolve(root)
    if (!existsSync(sessions)) throw new Error(`no sessions root: ${sessions}`)
    visit(sessions)
  }
  return found
}

/** Run the CLI. */
export function main(argv) {
  const options = { apply: false, force: false, quiet: false }
  const explicit = []
  let root = join(homedir(), '.dsh', 'sessions')
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--apply') options.apply = true
    else if (arg === '--force') options.force = true
    else if (arg === '--quiet') options.quiet = true
    else if (arg === '--root') {
      root = argv[index + 1] ?? root
      index += 1
    } else if (arg === '--help' || arg === '-h') {
      console.log('usage: repair-role-less-context.mjs [--apply] [--force] [--quiet] [--root <dir>] [file-or-dir...]')
      return 0
    } else if (arg.startsWith('-')) throw new Error(`unknown option: ${arg}`)
    else explicit.push(arg)
  }
  const targets = collectTargets(root, explicit)
  let needing = 0
  let applied = 0
  for (const target of targets) {
    const result = repairArtifact(target, options)
    if (result.needsRepair) needing += 1
    if (result.applied) applied += 1
  }
  console.log(`${targets.length} session log(s) scanned, ${needing} need repair, ${applied} rewritten`)
  if (needing === 0) return 0
  return options.apply ? 0 : 1
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = main(process.argv.slice(2))
  } catch (error) {
    console.error(`repair failed: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 2
  }
}
