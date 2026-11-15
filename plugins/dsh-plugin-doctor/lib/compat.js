// Plugin Doctor — zero-dependency semver 2.0.0 (M3).
//
// Implements the subset of node-semver the plugin ecosystem actually uses:
// exact, ~, ^, >=, >, <=, <, =, x-ranges (1.x / 1.2.x / *), hyphen ranges,
// space intersection, `||` union, and the §11 prerelease gate. Cross-validated
// against real node-semver in tests/compat.test.mjs (oracle corpus).
//
// Pure functions, no dependencies, no I/O. Used by the host to build the
// compatibility matrix (peerDependencies vs installed versions).

const FULL_VERSION = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/
const PARTIAL_VERSION = /^v?(\d+|[xX*])(?:\.(\d+|[xX*]))?(?:\.(\d+|[xX*]))?(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/
const NO_LEADING_ZERO = /^(0|[1-9]\d*)$/

function splitPrerelease(raw) {
  if (raw === undefined || raw === null || raw === '') return []
  return raw.split('.').map(part => (/^\d+$/.test(part) ? Number(part) : part))
}

/** Parse a full semver version; null when invalid (leading zeros rejected). */
export function parseVersion(input) {
  if (typeof input !== 'string') return null
  const match = FULL_VERSION.exec(input.trim())
  if (!match) return null
  const [, major, minor, patch, pre, build] = match
  if (![major, minor, patch].every(part => NO_LEADING_ZERO.test(part))) return null
  return {
    major: Number(major), minor: Number(minor), patch: Number(patch),
    prerelease: splitPrerelease(pre), build: build ?? null,
  }
}

/** Parse a possibly-partial range bound (1, 1.2, 1.2.x, 1.2.3-rc.1). */
function parsePartial(input) {
  if (typeof input !== 'string') return null
  const match = PARTIAL_VERSION.exec(input.trim())
  if (!match) return null
  const [, major, minor, patch, pre] = match
  const wild = part => part === undefined || part === 'x' || part === 'X' || part === '*'
  const num = part => (wild(part) ? null : Number(part))
  const majorWild = wild(major)
  return {
    major: majorWild ? null : Number(major),
    minor: majorWild || wild(minor) ? null : Number(minor),
    patch: majorWild || wild(minor) || wild(patch) ? null : Number(patch),
    prerelease: splitPrerelease(pre),
  }
}

function full(major, minor, patch, prerelease = []) {
  return { major, minor, patch, prerelease, build: null }
}

function comparePrerelease(a, b) {
  if (a.length === 0 && b.length === 0) return 0
  if (a.length === 0) return 1   // release > prerelease
  if (b.length === 0) return -1
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const ai = a[i]; const bi = b[i]
    if (ai === bi) continue
    const aNum = typeof ai === 'number'; const bNum = typeof bi === 'number'
    if (aNum && bNum) return ai < bi ? -1 : 1
    if (aNum) return -1          // numeric identifiers sort lower
    if (bNum) return 1
    return ai < bi ? -1 : 1
  }
  return a.length === b.length ? 0 : (a.length < b.length ? -1 : 1)
}

/** Semver precedence compare; build metadata ignored. Returns -1 | 0 | 1. */
export function compareVersions(a, b) {
  const va = typeof a === 'string' ? parseVersion(a) : a
  const vb = typeof b === 'string' ? parseVersion(b) : b
  if (!va || !vb) return 0
  for (const key of ['major', 'minor', 'patch']) {
    if (va[key] !== vb[key]) return va[key] < vb[key] ? -1 : 1
  }
  return comparePrerelease(va.prerelease, vb.prerelease)
}

// --- range compilation ------------------------------------------------------

function lowerBound(partial) {
  return full(partial.major ?? 0, partial.minor ?? 0, partial.patch ?? 0, partial.prerelease)
}

function tildeComparators(partial) {
  if (partial.major === null) return [{ op: '>=', ver: full(0, 0, 0) }]
  const lower = lowerBound(partial)
  if (partial.minor === null) return [{ op: '>=', ver: lower }, { op: '<', ver: full(partial.major + 1, 0, 0) }]
  return [{ op: '>=', ver: lower }, { op: '<', ver: full(partial.major, partial.minor + 1, 0) }]
}

function caretComparators(partial) {
  if (partial.major === null) return [{ op: '>=', ver: full(0, 0, 0) }]
  const lower = lowerBound(partial)
  let upper
  if (partial.major !== 0) upper = full(partial.major + 1, 0, 0)
  else if (partial.minor === null) upper = full(1, 0, 0)
  else if (partial.minor !== 0) upper = full(0, partial.minor + 1, 0)
  else if (partial.patch === null) upper = full(0, 1, 0)
  else upper = full(0, 0, partial.patch + 1)
  return [{ op: '>=', ver: lower }, { op: '<', ver: upper }]
}

function xRangeComparators(partial) {
  if (partial.major === null) return [{ op: '>=', ver: full(0, 0, 0) }]
  if (partial.minor === null) return [{ op: '>=', ver: full(partial.major, 0, 0) }, { op: '<', ver: full(partial.major + 1, 0, 0) }]
  if (partial.patch === null) return [{ op: '>=', ver: full(partial.major, partial.minor, 0) }, { op: '<', ver: full(partial.major, partial.minor + 1, 0) }]
  return [{ op: '=', ver: lowerBound(partial) }]
}

function hyphenExpand(lowerRaw, upperRaw) {
  const lower = parsePartial(lowerRaw)
  const upper = parsePartial(upperRaw)
  if (!lower || !upper) return null
  const parts = [`>=${lowerRaw}`]
  if (upper.patch === null) {
    if (upper.minor === null) parts.push(`<${upper.major + 1}.0.0`)
    else parts.push(`<${upper.major}.${upper.minor + 1}.0`)
  } else {
    parts.push(`<=${upperRaw}`)
  }
  return parts.join(' ')
}

function tokenComparators(token) {
  if (token === '' || token === '*' || token === 'x' || token === 'X') return [{ op: '>=', ver: full(0, 0, 0) }]
  if (token.startsWith('~')) {
    const partial = parsePartial(token.slice(1))
    return partial ? tildeComparators(partial) : null
  }
  if (token.startsWith('^')) {
    const partial = parsePartial(token.slice(1))
    return partial ? caretComparators(partial) : null
  }
  const opMatch = /^(>=|<=|>|<|=)?\s*(.+)$/.exec(token)
  if (!opMatch) return null
  const op = opMatch[1] || '='
  const partial = parsePartial(opMatch[2])
  if (!partial) return null
  if (op === '=' ) {
    // exact or x-range depending on wildcards
    if (partial.major === null || partial.minor === null || partial.patch === null) return xRangeComparators(partial)
    return [{ op: '=', ver: lowerBound(partial) }]
  }
  return [{ op, ver: lowerBound(partial) }]
}

function parseSet(setStr) {
  if (setStr === '') return [{ op: '>=', ver: full(0, 0, 0) }]
  // Expand hyphen ranges first: "A - B" → ">=A <=B" / ">=A <B".
  let expanded = ''
  let rest = setStr
  const hyphen = /(\S+)\s+-\s+(\S+)/
  let match
  while ((match = hyphen.exec(rest)) !== null) {
    const piece = hyphenExpand(match[1], match[2])
    if (piece === null) return null
    expanded += rest.slice(0, match.index) + piece
    rest = rest.slice(match.index + match[0].length)
  }
  expanded += rest
  const tokens = expanded.trim().split(/\s+/).filter(Boolean)
  const comparators = []
  for (const token of tokens) {
    const piece = tokenComparators(token)
    if (piece === null) return null
    comparators.push(...piece)
  }
  return comparators.length > 0 ? comparators : null
}

function parseRange(range) {
  if (typeof range !== 'string') return null
  const trimmed = range.trim()
  if (trimmed === '') return [[{ op: '>=', ver: full(0, 0, 0) }]]
  const sets = trimmed.split('||').map(part => parseSet(part.trim()))
  if (sets.some(set => set === null)) return null
  return sets
}

function testComparator(version, comparator) {
  const cmp = compareVersions(version, comparator.ver)
  switch (comparator.op) {
    case '=': return cmp === 0
    case '>': return cmp > 0
    case '>=': return cmp >= 0
    case '<': return cmp < 0
    case '<=': return cmp <= 0
    default: return false
  }
}

function testSet(version, set) {
  // semver §11: a prerelease version only satisfies a set that contains a
  // comparator with a prerelease on the SAME major.minor.patch tuple.
  if (version.prerelease.length > 0) {
    const allowed = set.some(c => c.ver.prerelease.length > 0
      && c.ver.major === version.major
      && c.ver.minor === version.minor
      && c.ver.patch === version.patch)
    if (!allowed) return false
  }
  return set.every(comparator => testComparator(version, comparator))
}

/** Does `version` satisfy `range`? Invalid input → false. */
export function satisfies(version, range) {
  const parsed = parseVersion(version)
  if (!parsed) return false
  const sets = parseRange(range)
  if (!sets) return false
  return sets.some(set => testSet(parsed, set))
}

function rangeHasPrerelease(sets) {
  return sets.some(set => set.some(c => c.ver.prerelease.length > 0))
}

/**
 * Evaluate one peer dependency against the installed version.
 * @param {object} peer
 * @param {string} peer.name
 * @param {string} peer.range — the declared semver range
 * @param {string|null} peer.installed — installed version, or null when unresolvable
 * @param {boolean} [peer.optional] — peerDependenciesMeta.optional
 * @returns {{name, range, installed, status: 'satisfied'|'mismatch'|'missing'|'optional-missing'|'unknown', note?: string}}
 */
export function evaluatePeer({ name, range, installed, optional = false }) {
  const base = { name, range, installed: installed ?? null }
  // pnpm workspace protocol (workspace:*, workspace:^) is not a semver range;
  // it links a sibling workspace package and is not a compatibility concern.
  if (typeof range === 'string' && range.startsWith('workspace:')) {
    return { ...base, status: 'workspace' }
  }
  if (installed === null || installed === undefined) {
    return { ...base, status: optional ? 'optional-missing' : 'missing' }
  }
  const parsed = parseVersion(installed)
  const sets = parseRange(range)
  if (!parsed || !sets) return { ...base, status: 'unknown' }
  if (sets.some(set => testSet(parsed, set))) return { ...base, status: 'satisfied' }
  const row = { ...base, status: 'mismatch' }
  if (parsed.prerelease.length > 0 && rangeHasPrerelease(sets)) {
    row.note = 'Installed is a prerelease; strict semver requires a range comparator on the same major.minor.patch tuple. Often benign for rc builds — verify the plugin actually loads.'
  }
  return row
}