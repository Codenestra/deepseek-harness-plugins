/**
 * Durable per-project notes for the Project Hub.
 *
 * One JSON file under the profile directory, and four guarantees the panel
 * depends on:
 *
 *   1. **Atomic** — every save writes a sibling temp file and `rename`s it into
 *      place, so a crash mid-save leaves either the old bytes or the new ones,
 *      never a truncated file.
 *   2. **Serialized** — all reads and writes go through one queue, so two
 *      concurrent autosaves cannot interleave and lose one of them.
 *   3. **Bounded** — one project's note is capped, because this file is a
 *      scratchpad, not a document store.
 *   4. **Preserving** — a note whose workspace no longer exists is user data, so
 *      nothing here prunes it; a corrupt or newer-version file is moved aside
 *      under a timestamped name instead of being overwritten.
 *
 * Identity is the workspace id (a stable uuid), which is why renaming or moving a
 * workspace keeps its note.
 */

import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

/** File format this build writes and reads. */
export const NOTES_VERSION = 1
/** Per-project ceiling for one serialized note. */
export const NOTE_BYTES_LIMIT = 64 * 1024
/** Most tags kept on one note. */
export const TAG_LIMIT = 32
/** Longest accepted tag. */
export const TAG_CHARS_LIMIT = 64
/** Longest accepted workspace id. */
export const WORKSPACE_ID_LIMIT = 200

/** Bad caller input; the route answers 400. */
export class NotesInputError extends TypeError {}

/** The durable state refuses this write (a newer file format); the route answers 409. */
export class NotesConflictError extends Error {}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function normalizeId(workspaceId) {
  if (typeof workspaceId !== 'string' || workspaceId.trim() === '') {
    throw new NotesInputError('workspaceId is required')
  }
  const id = workspaceId.trim()
  if (id.length > WORKSPACE_ID_LIMIT) {
    throw new NotesInputError(`workspaceId exceeds ${WORKSPACE_ID_LIMIT} characters`)
  }
  return id
}

/** `undefined` means "keep what is stored"; `null` means "clear". */
function normalizeText(value, field) {
  if (value === undefined) return undefined
  if (value === null) return ''
  if (typeof value !== 'string') throw new NotesInputError(`${field} must be a string`)
  return value
}

function normalizeTags(value) {
  if (value === undefined) return undefined
  if (value === null) return []
  if (!Array.isArray(value)) throw new NotesInputError('tags must be an array of strings')
  const kept = new Set()
  for (const entry of value) {
    if (typeof entry !== 'string') throw new NotesInputError('tags must be an array of strings')
    const tag = entry.trim()
    if (tag === '') continue
    if (tag.length > TAG_CHARS_LIMIT) throw new NotesInputError(`a tag exceeds ${TAG_CHARS_LIMIT} characters`)
    kept.add(tag)
    if (kept.size >= TAG_LIMIT) break
  }
  return [...kept]
}

/** One note as stored; a shape this build cannot read is dropped, never guessed. */
function normalizeStoredNote(workspaceId, value) {
  if (!isPlainObject(value)) return null
  return {
    workspaceId,
    text: typeof value.text === 'string' ? value.text : '',
    instructions: typeof value.instructions === 'string' ? value.instructions : '',
    tags: Array.isArray(value.tags) ? value.tags.filter(tag => typeof tag === 'string') : [],
    updatedAt: Number.isFinite(value.updatedAt) ? value.updatedAt : 0,
  }
}

function copyOf(note) {
  return { ...note, tags: [...note.tags] }
}

/**
 * Create a notes store over one file.
 * @param options - `file` (absolute path), optional `now` clock and `limitBytes`.
 * @returns `snapshot()`, `upsert(input)` and `remove(workspaceId)`.
 */
export function createNotesStore(options) {
  const { file, now = () => Date.now(), limitBytes = NOTE_BYTES_LIMIT } = options ?? {}
  if (typeof file !== 'string' || file === '') throw new TypeError('a notes file path is required')

  /** @type {{notes: Record<string, object>, degraded?: string, readOnly?: boolean} | null} */
  let state = null
  let queue = Promise.resolve()
  let tmpSeq = 0

  /** Move unreadable bytes aside instead of overwriting them. */
  async function preserveAside(kind) {
    const aside = `${file}.${kind}-${Date.now()}`
    try {
      await rename(file, aside)
      return aside
    } catch {
      return null
    }
  }

  async function loadFromDisk() {
    let raw
    try {
      raw = await readFile(file, 'utf8')
    } catch (error) {
      if (error?.code === 'ENOENT') return { notes: {} }
      const aside = await preserveAside('unreadable')
      return {
        notes: {},
        degraded: `the notes file could not be read (${error.message})`
          + (aside === null ? '' : `; the previous bytes were kept at ${aside}`),
      }
    }

    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      const aside = await preserveAside('corrupt')
      return {
        notes: {},
        degraded: 'the notes file was corrupt and has been kept aside'
          + (aside === null ? '' : ` at ${aside}`) + '; notes start empty',
      }
    }
    if (!isPlainObject(parsed)) {
      const aside = await preserveAside('corrupt')
      return {
        notes: {},
        degraded: 'the notes file did not contain an object and has been kept aside'
          + (aside === null ? '' : ` at ${aside}`) + '; notes start empty',
      }
    }

    const version = parsed.version ?? NOTES_VERSION
    if (typeof version !== 'number' || version > NOTES_VERSION) {
      return {
        notes: {},
        readOnly: true,
        degraded: `the notes file was written by a newer version (${String(version)}); it is left untouched and notes are read-only`,
      }
    }

    const notes = {}
    let dropped = 0
    const source = isPlainObject(parsed.notes) ? parsed.notes : {}
    for (const [workspaceId, value] of Object.entries(source)) {
      const note = normalizeStoredNote(workspaceId, value)
      if (note === null) {
        dropped += 1
        continue
      }
      // The key wins over any stored copy of the id: it is what the registry uses.
      notes[workspaceId] = note
    }
    return {
      notes,
      ...(dropped === 0 ? {} : { degraded: `${dropped} malformed note(s) were ignored` }),
    }
  }

  async function ensureLoaded() {
    if (state === null) state = await loadFromDisk()
    return state
  }

  /** One serialized lane: readers never interleave with a half-applied writer. */
  function enqueue(task) {
    const run = queue.then(task, task)
    queue = run.then(() => undefined, () => undefined)
    return run
  }

  async function persist(notes) {
    const dir = dirname(file)
    await mkdir(dir, { recursive: true })
    const tmp = join(dir, `.notes-${process.pid}-${++tmpSeq}.tmp`)
    const body = `${JSON.stringify({ version: NOTES_VERSION, notes }, null, 2)}\n`
    try {
      await writeFile(tmp, body, 'utf8')
      await rename(tmp, file)
    } catch (error) {
      await rm(tmp, { force: true }).catch(() => undefined)
      throw error
    }
  }

  function refuseIfReadOnly(loaded) {
    if (loaded.readOnly === true) {
      throw new NotesConflictError(loaded.degraded ?? 'the notes file is read-only')
    }
  }

  return {
    /** Absolute path of the durable file. */
    get file() { return file },

    /**
     * Read every note.
     * @returns `{version, notes, degraded?}`; `degraded` explains a recovery.
     */
    async snapshot() {
      return enqueue(async () => {
        const loaded = await ensureLoaded()
        const notes = {}
        for (const [workspaceId, note] of Object.entries(loaded.notes)) notes[workspaceId] = copyOf(note)
        return {
          version: NOTES_VERSION,
          notes,
          ...(loaded.degraded === undefined ? {} : { degraded: loaded.degraded }),
        }
      })
    },

    /**
     * Create or update one project note. Fields that are absent keep their
     * stored value, so a client editing only the note body cannot wipe the
     * pinned instructions.
     * @param input - `{workspaceId, text?, instructions?, tags?}`.
     * @returns the stored note.
     */
    async upsert(input) {
      if (!isPlainObject(input)) throw new NotesInputError('a note object is required')
      const workspaceId = normalizeId(input.workspaceId)
      const text = normalizeText(input.text, 'text')
      const instructions = normalizeText(input.instructions, 'instructions')
      const tags = normalizeTags(input.tags)
      return enqueue(async () => {
        const loaded = await ensureLoaded()
        refuseIfReadOnly(loaded)
        const previous = loaded.notes[workspaceId]
          ?? { workspaceId, text: '', instructions: '', tags: [], updatedAt: 0 }
        const note = {
          workspaceId,
          text: text ?? previous.text,
          instructions: instructions ?? previous.instructions,
          tags: tags ?? previous.tags,
          updatedAt: now(),
        }
        if (Buffer.byteLength(JSON.stringify(note), 'utf8') > limitBytes) {
          throw new NotesInputError(`the project note exceeds the ${Math.round(limitBytes / 1024)} KB limit`)
        }
        loaded.notes[workspaceId] = note
        await persist(loaded.notes)
        return copyOf(note)
      })
    },

    /**
     * Delete one project note.
     * @param workspaceId - note owner.
     * @returns true when a note was removed, false when there was none.
     */
    async remove(workspaceId) {
      const id = normalizeId(workspaceId)
      return enqueue(async () => {
        const loaded = await ensureLoaded()
        refuseIfReadOnly(loaded)
        if (!(id in loaded.notes)) return false
        delete loaded.notes[id]
        await persist(loaded.notes)
        return true
      })
    },
  }
}
