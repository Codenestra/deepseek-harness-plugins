// Plugin Doctor — safe manifest actions (M4). Safety overrides everything.
//
// Quadruple protection (design.md §5.3), each covered by tests/actions.test.mjs
// against FAKE mkdtemp manifests (the real profile is never written in tests):
//   1. backup   — package.json.bak-<ts> holds the exact original before any write
//   2. atomic   — write package.json.tmp-<ts> then rename; a failure leaves the
//                 original intact and cleans the tmp file
//   3. bundles-only — a surgical text edit touches ONLY the dsh.profile.bundles
//                 array; dependencies and every other field stay byte-identical,
//                 and a deep-compare safety net rejects any non-bundles change
//   4. confirm  — disable requires confirm:'DISABLE', restore confirm:'RESTORE'
//
// Disable ≠ delete: the dependency and all files are preserved; restore re-adds
// the bundle entry. Never touches node_modules, credentials, or other plugins'
// data directories.

import { readFileSync, writeFileSync, renameSync, existsSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { deepStrictEqual } from 'node:assert/strict'

export const CONFIRM_DISABLE = 'DISABLE'
export const CONFIRM_RESTORE = 'RESTORE'

const realFs = { readFileSync, writeFileSync, renameSync, existsSync, unlinkSync }

function fail(code, detail) {
  const error = new Error(detail ? `${code}: ${detail}` : code)
  error.code = code
  throw error
}

/** Locate the dsh.profile.bundles array bounds in raw manifest text. */
function locateBundlesArray(rawText) {
  const keyIdx = rawText.indexOf('"bundles"')
  if (keyIdx === -1) fail('NO_BUNDLES', 'no "bundles" key')
  const start = rawText.indexOf('[', keyIdx)
  if (start === -1) fail('NO_BUNDLES', 'no array after "bundles"')
  let inString = false
  let escape = false
  for (let i = start + 1; i < rawText.length; i++) {
    const ch = rawText[i]
    if (escape) { escape = false; continue }
    if (inString && ch === '\\') { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (!inString && ch === ']') return { start, end: i }
  }
  fail('NO_BUNDLES', 'unterminated bundles array')
}

/**
 * Pure surgical edit of the bundles array. Returns new raw text that differs
 * from the input ONLY inside the bundles array brackets.
 * @param {string} rawText
 * @param {string} bundleId
 * @param {'remove'|'add'} action
 * @returns {{text: string, changed: true}}
 */
export function editBundlesText(rawText, bundleId, action) {
  if (typeof bundleId !== 'string' || bundleId.trim() === '') fail('INVALID_BUNDLE_ID')
  if (action !== 'remove' && action !== 'add') fail('INVALID_ACTION', String(action))
  let manifest
  try { manifest = JSON.parse(rawText) } catch { fail('INVALID_MANIFEST') }
  const bundles = manifest?.dsh?.profile?.bundles
  if (!Array.isArray(bundles)) fail('NO_BUNDLES', 'dsh.profile.bundles is not an array')

  const { start, end } = locateBundlesArray(rawText)
  const inner = rawText.slice(start + 1, end)
  const tokens = inner.match(/"(?:[^"\\]|\\.)*"/g) ?? []
  const target = JSON.stringify(bundleId)

  let next
  if (action === 'remove') {
    if (!tokens.includes(target)) fail('NOT_IN_BUNDLES', bundleId)
    next = tokens.filter(token => token !== target)
  } else {
    if (tokens.includes(target)) fail('ALREADY_IN_BUNDLES', bundleId)
    next = [...tokens, target]
  }
  const newInner = next.length > 0 ? ` ${next.join(', ')} ` : ''
  const text = rawText.slice(0, start + 1) + newInner + rawText.slice(end)
  return { text, changed: true }
}

/**
 * Safety net: prove the edit changed ONLY the bundles array (and changed it
 * exactly as intended). Throws NON_BUNDLES_CHANGE on any other difference.
 */
export function assertOnlyBundlesChanged(oldRaw, newRaw, bundleId, action) {
  const before = JSON.parse(oldRaw)
  const after = JSON.parse(newRaw)
  const oldBundles = before?.dsh?.profile?.bundles ?? []
  const newBundles = after?.dsh?.profile?.bundles ?? []
  const expected = action === 'remove'
    ? oldBundles.filter(id => id !== bundleId)
    : [...oldBundles, bundleId]
  try {
    deepStrictEqual(newBundles, expected)
  } catch {
    fail('NON_BUNDLES_CHANGE', 'bundles array not edited as expected')
  }
  const beforeRest = JSON.parse(oldRaw)
  const afterRest = JSON.parse(newRaw)
  delete beforeRest.dsh.profile.bundles
  delete afterRest.dsh.profile.bundles
  try {
    deepStrictEqual(afterRest, beforeRest)
  } catch {
    fail('NON_BUNDLES_CHANGE', 'a field other than bundles changed')
  }
}

/**
 * Apply a bundles-only manifest action with all four protections.
 * @param {string} profileDir
 * @param {string} bundleId
 * @param {'remove'|'add'} action — remove=disable, add=restore
 * @param {object} opts
 * @param {string} opts.confirm — must equal CONFIRM_DISABLE / CONFIRM_RESTORE
 * @param {number} [opts.now] — timestamp for backup/tmp suffixes (injectable)
 * @param {object} [opts.fs] — fs implementation (injectable for failure tests)
 * @returns {{ok: true, action, bundleId, backupPath, at}}
 */
export function applyBundleAction(profileDir, bundleId, action, opts = {}) {
  const fs = opts.fs ?? realFs
  const now = typeof opts.now === 'number' ? opts.now : Date.now()
  if (typeof bundleId !== 'string' || bundleId.trim() === '') fail('INVALID_BUNDLE_ID')
  if (action !== 'remove' && action !== 'add') fail('INVALID_ACTION', String(action))

  // Protection 4: explicit confirmation.
  const required = action === 'remove' ? CONFIRM_DISABLE : CONFIRM_RESTORE
  if (opts.confirm !== required) fail('CONFIRM_REQUIRED', `expected confirm:'${required}'`)

  const manifestPath = join(profileDir, 'package.json')
  const raw = fs.readFileSync(manifestPath, 'utf8')
  const { text: newRaw } = editBundlesText(raw, bundleId, action)
  // Protection 3: bundles-only, verified before anything is written.
  assertOnlyBundlesChanged(raw, newRaw, bundleId, action)

  // Protection 1: backup the exact original.
  const backupPath = `${manifestPath}.bak-${now}`
  fs.writeFileSync(backupPath, raw, 'utf8')

  // Protection 2: atomic tmp + rename.
  const tmpPath = `${manifestPath}.tmp-${now}`
  try {
    fs.writeFileSync(tmpPath, newRaw, 'utf8')
    fs.renameSync(tmpPath, manifestPath)
  } catch (error) {
    try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath) } catch { /* best effort */ }
    fail('WRITE_FAILED', error instanceof Error ? error.message : String(error))
  }
  return { ok: true, action, bundleId, backupPath, at: now }
}