/**
 * Retention policy → cleanup candidates (pure functions, no fs access).
 *
 * Safety model (design.md §3, hard-coded, not configurable off):
 *   - BLACKLIST: credentials, bundled runtimes, node_modules, profile manifests,
 *     the plugin manager's own directory, storages/workspace.json, and the
 *     plugin's own trash can NEVER become candidates — the trash layer
 *     re-checks this list before every move (defence in depth).
 *   - DYNAMIC PROTECTION: live sessions, sessions touched within 24h, and
 *     session directories unknown to the session corpus (orphans) are excluded
 *     from candidates and reported with a reason.
 *   - Other plugins' data (profiles/<p>/<dir>) is structurally never a
 *     candidate: only sessions / logs / tmp kinds and the opt-in ASR model
 *     area (speech-to-text/sensevoice/models, M4) exist here.
 */

/** Sessions touched more recently than this are always protected. */
export const PROTECTION_WINDOW_MS = 24 * 60 * 60 * 1000

const DAY_MS = 86_400_000
const HOUR_MS = 3_600_000

const DEFAULT_POLICY = { sessionsDays: 90, logsDays: 30, tmpHours: 24 }
const MAX_DAYS = 3650
const MAX_HOURS = 87_600

/** Profile-root manifest files that must never move (design.md §3). */
const PROFILE_MANIFEST_FILES = new Set([
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'cordis.yml',
  'cordis.patch.yml',
  'compatibility.json',
])

const BLACKLIST_TOP_FILES = new Set(['.credentials.yaml', '.anonymous-user-id'])
const BLACKLIST_TOP_DIRS = new Set(['llm-deepseek', 'dsh-runtimes', '.storage-doctor'])

/**
 * Hard-coded blacklist check on a home-relative slash path.
 * @param {string} relPath
 * @returns {boolean}
 */
export function isBlacklisted(relPath) {
  if (typeof relPath !== 'string' || relPath === '') return true
  const segments = relPath.split('/')
  if (segments.some(segment => segment === '' || segment === '.' || segment === '..')) return true
  const [first, second, third] = segments
  if (segments.length === 1) return BLACKLIST_TOP_FILES.has(first)
  if (BLACKLIST_TOP_DIRS.has(first)) return true
  if (first === 'storages') return second === 'workspace.json'
  if (first === 'profiles' && segments.length >= 3) {
    if (third === 'node_modules' || third === '.plugin-manager') return true
    if (segments.length === 3 && PROFILE_MANIFEST_FILES.has(third)) return true
  }
  return false
}

function positiveNumber(value, field, max) {
  const number = Number(value)
  if (typeof value === 'boolean' || !Number.isFinite(number) || number <= 0) {
    throw new TypeError(`storage-doctor: ${field} must be a positive finite number (0 and negatives are not valid retention policies)`)
  }
  if (number > max) {
    throw new TypeError(`storage-doctor: ${field} must not exceed ${max}`)
  }
  return number
}

/**
 * Normalize preview/clean policy parameters.
 * Defaults follow design.md §5.2: sessionsDays=90, logsDays=30, tmpHours=24.
 * `models` (M4 ASR model cleanup) is a strict opt-in flag: 0 (default, off)
 * or 1; every other value is rejected rather than coerced.
 * @param {object} [input]
 * @returns {{ sessionsDays: number, logsDays: number, tmpHours: number, models: 0 | 1 }}
 */
export function normalizePolicy(input = {}) {
  if (input === null || typeof input !== 'object') throw new TypeError('storage-doctor: policy must be an object')
  let models = 0
  if (input.models !== undefined && input.models !== null && input.models !== '') {
    const modelsNumber = Number(input.models)
    if (typeof input.models === 'boolean' || !Number.isInteger(modelsNumber) || (modelsNumber !== 0 && modelsNumber !== 1)) {
      throw new TypeError('storage-doctor: models must be 0 (default, off) or 1 (include ASR model files)')
    }
    models = /** @type {0 | 1} */ (modelsNumber)
  }
  return {
    sessionsDays: input.sessionsDays === undefined || input.sessionsDays === null || input.sessionsDays === ''
      ? DEFAULT_POLICY.sessionsDays
      : positiveNumber(input.sessionsDays, 'sessionsDays', MAX_DAYS),
    logsDays: input.logsDays === undefined || input.logsDays === null || input.logsDays === ''
      ? DEFAULT_POLICY.logsDays
      : positiveNumber(input.logsDays, 'logsDays', MAX_DAYS),
    tmpHours: input.tmpHours === undefined || input.tmpHours === null || input.tmpHours === ''
      ? DEFAULT_POLICY.tmpHours
      : positiveNumber(input.tmpHours, 'tmpHours', MAX_HOURS),
    models,
  }
}

/**
 * Build the cleanup preview.
 *
 * @param {object} scanResult result of lib/scan.js scanHome()
 * @param {object} sessionMeta `{ sessions: [{ id, live }], titles: { [id]: string } }`
 *   from ctx.sessionQuery (listSessions + readTitle)
 * @param {{ sessionsDays: number, logsDays: number, tmpHours: number, models: 0 | 1 }} policy
 * @param {number} [now] injectable clock (tests)
 * @returns {{ candidates: object[], protected: object[], policy: object, at: number }}
 *   candidates: `{ relPath, bytes, kind: 'session'|'log'|'tmp'|'model', title?, lastActive }`
 *   protected:  same shape plus `reason: 'live'|'recent'|'orphan'`
 */
export function buildPreview(scanResult, sessionMeta, policy, now = Date.now()) {
  const normalized = normalizePolicy(policy)
  const corpus = new Map()
  for (const session of sessionMeta?.sessions ?? []) {
    corpus.set(session.id, session)
  }
  const titles = sessionMeta?.titles ?? {}

  const candidates = []
  const protectedEntries = []

  for (const session of scanResult?.sessions ?? []) {
    const relPath = `sessions/${session.workspace}/${session.sessionId}`
    if (isBlacklisted(relPath)) continue
    const base = {
      relPath,
      bytes: session.bytes,
      kind: 'session',
      lastActive: session.mtimeMs,
      ...(titles[session.sessionId] === undefined ? {} : { title: titles[session.sessionId] }),
    }
    const record = corpus.get(session.sessionId)
    if (record === undefined) {
      protectedEntries.push({ ...base, reason: 'orphan' })
      continue
    }
    if (record.live === true) {
      protectedEntries.push({ ...base, reason: 'live' })
      continue
    }
    if (now - session.mtimeMs < PROTECTION_WINDOW_MS) {
      protectedEntries.push({ ...base, reason: 'recent' })
      continue
    }
    if (now - session.mtimeMs > normalized.sessionsDays * DAY_MS) {
      candidates.push(base)
    }
  }

  for (const file of scanResult?.cleanableFiles ?? []) {
    if (isBlacklisted(file.path)) continue
    if (file.path.startsWith('profiles/')) continue // plugin data: report-only, always
    const age = now - file.mtimeMs
    const aged = file.kind === 'log'
      ? age > normalized.logsDays * DAY_MS
      : file.kind === 'tmp'
        ? age > normalized.tmpHours * HOUR_MS
        : file.kind === 'model'
          // M4 opt-in ASR models: no age threshold — inclusion is the user's
          // explicit models=1 decision, and the file re-downloads on next use.
          ? normalized.models === 1
          : false
    if (!aged) continue
    candidates.push({ relPath: file.path, bytes: file.bytes, kind: file.kind, lastActive: file.mtimeMs })
  }

  candidates.sort((left, right) => right.bytes - left.bytes || left.relPath.localeCompare(right.relPath))
  protectedEntries.sort((left, right) => right.bytes - left.bytes || left.relPath.localeCompare(right.relPath))

  return { candidates, protected: protectedEntries, policy: normalized, at: now }
}
