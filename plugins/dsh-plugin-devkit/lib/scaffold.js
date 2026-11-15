/**
 * Scaffold engine: form validation, pure rendering, and directory generation.
 *
 * Hard safety rules (design §3.4):
 * - generation only writes into a user-selected directory that does not exist
 *   or is empty; an occupied target is refused and left untouched;
 * - every file is created with the exclusive 'wx' flag — never overwritten;
 * - a failed write rolls back only the files this call created;
 * - the confirmation token 'GENERATE' is mandatory.
 */
import { existsSync, mkdirSync, readdirSync, rmdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, resolve } from 'node:path'
import { CLIENT_INJECT_PRESETS, FEATURES, TEMPLATE_BASELINE, TEMPLATE_VERSION, templateFiles } from './templates/index.js'

/** Structured scaffold failure; `code` is surfaced to the HTTP layer. */
export class ScaffoldError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'ScaffoldError'
    this.code = code
  }
}

const PACKAGE_PATTERN = /^@local\/dsh-[a-z0-9]+(?:-[a-z0-9]+)*$/
const INJECT_ENTRY_PATTERN = /^(?:@[a-z0-9][a-z0-9-]*\/)?[a-z0-9][a-z0-9-]*$/
const TITLE_MAX = 60

function requiredTitle(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${field} must be a non-empty string`)
  }
  const trimmed = value.trim()
  if (trimmed.length > TITLE_MAX) throw new TypeError(`${field} must be at most ${TITLE_MAX} characters`)
  return trimmed
}

function camelOf(slug) {
  return slug.split('-').map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1))).join('')
}

/**
 * Validate and normalize the scaffold form. Pure; throws TypeError on bad input.
 * @param input - raw form: packageName, titleZh, titleEn, order, injectPreset,
 *   customInject (when preset is 'custom'), features { httpApi, sqlite, timer, settings }.
 * @returns the normalized form with derived slug/panelId/camel/apiBase/inject.
 */
export function normalizeForm(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('form must be an object')
  }
  const packageName = input.packageName
  if (typeof packageName !== 'string' || !PACKAGE_PATTERN.test(packageName)) {
    throw new TypeError('packageName must match @local/dsh-<kebab-case> (lowercase letters, digits, single hyphens)')
  }
  const titleZh = requiredTitle(input.titleZh, 'titleZh')
  const titleEn = requiredTitle(input.titleEn, 'titleEn')
  const order = input.order
  if (!Number.isSafeInteger(order) || order < 0) {
    throw new TypeError('order must be a non-negative safe integer')
  }
  const injectPreset = input.injectPreset ?? 'basic'
  if (!['basic', 'full', 'custom'].includes(injectPreset)) {
    throw new TypeError("injectPreset must be 'basic', 'full' or 'custom'")
  }
  let inject
  if (injectPreset === 'custom') {
    const custom = input.customInject
    if (!Array.isArray(custom) || custom.length === 0) {
      throw new TypeError('customInject must be a non-empty array of package names when injectPreset is custom')
    }
    const seen = new Set()
    inject = []
    for (const entry of custom) {
      if (typeof entry !== 'string' || !INJECT_ENTRY_PATTERN.test(entry)) {
        throw new TypeError(`customInject entry ${JSON.stringify(entry)} is not a valid package name`)
      }
      if (!seen.has(entry)) {
        seen.add(entry)
        inject.push(entry)
      }
    }
  } else {
    inject = [...CLIENT_INJECT_PRESETS[injectPreset]]
  }
  const rawFeatures = input.features ?? {}
  if (typeof rawFeatures !== 'object' || rawFeatures === null || Array.isArray(rawFeatures)) {
    throw new TypeError('features must be an object')
  }
  for (const key of Object.keys(rawFeatures)) {
    if (!FEATURES.includes(key)) throw new TypeError(`features.${key} is not a known feature`)
  }
  const features = {}
  for (const key of FEATURES) {
    const value = rawFeatures[key] ?? false
    if (typeof value !== 'boolean') throw new TypeError(`features.${key} must be a boolean`)
    features[key] = value
  }
  const slug = packageName.slice('@local/dsh-'.length)
  return {
    packageName,
    titleZh,
    titleEn,
    order,
    injectPreset,
    ...(injectPreset === 'custom' ? { customInject: inject } : {}),
    features,
    slug,
    panelId: slug,
    camel: camelOf(slug),
    apiBase: `/api/${slug}`,
    inject,
  }
}

/**
 * Render the project file tree without touching disk.
 * @param input - raw scaffold form.
 * @returns { templateVersion, baseline, form, files: [{ path, content }] }.
 */
export function renderProject(input) {
  const form = normalizeForm(input)
  return {
    templateVersion: TEMPLATE_VERSION,
    baseline: TEMPLATE_BASELINE,
    form,
    files: templateFiles(form),
  }
}

/**
 * Generate the project into the target directory.
 * @param options - { targetDir, confirm, form }.
 * @returns { targetDir, templateVersion, files } with files as relative paths.
 * @throws ScaffoldError CONFIRM_REQUIRED | TARGET_NOT_ABSOLUTE |
 *   TARGET_NOT_DIRECTORY | TARGET_NOT_EMPTY | WRITE_FAILED; TypeError on bad form.
 */
export function generateProject({ targetDir, confirm, form } = {}) {
  if (confirm !== 'GENERATE') {
    throw new ScaffoldError('CONFIRM_REQUIRED', "generate requires confirm: 'GENERATE'")
  }
  const normalized = normalizeForm(form)
  if (typeof targetDir !== 'string' || !isAbsolute(targetDir)) {
    throw new ScaffoldError('TARGET_NOT_ABSOLUTE', 'targetDir must be an absolute path')
  }
  const target = resolve(targetDir)
  if (existsSync(target)) {
    const stats = statSync(target)
    if (!stats.isDirectory()) {
      throw new ScaffoldError('TARGET_NOT_DIRECTORY', `targetDir is not a directory: ${target}`)
    }
    if (readdirSync(target).length > 0) {
      throw new ScaffoldError('TARGET_NOT_EMPTY', `targetDir is not empty, refusing to overwrite: ${target}`)
    }
  }
  const files = templateFiles(normalized)
  const createdFiles = []
  const createdDirs = []
  const ensureDir = (dir) => {
    if (existsSync(dir)) return
    // Record every missing level (deepest first) so rollback can remove them.
    let current = dir
    while (!existsSync(current)) {
      createdDirs.push(current)
      const parent = dirname(current)
      if (parent === current) break
      current = parent
    }
    mkdirSync(dir, { recursive: true })
  }
  try {
    ensureDir(target)
    for (const file of files) {
      const filePath = resolve(target, file.path)
      if (!filePath.startsWith(target + (process.platform === 'win32' ? '\\' : '/'))) {
        throw new ScaffoldError('WRITE_FAILED', `unsafe file path: ${file.path}`)
      }
      ensureDir(dirname(filePath))
      writeFileSync(filePath, file.content, { flag: 'wx' })
      createdFiles.push(filePath)
    }
  } catch (error) {
    // Roll back only what this call created; the target was verified empty,
    // so nothing pre-existing can be touched here.
    for (const filePath of createdFiles.reverse()) {
      try { unlinkSync(filePath) } catch { /* best effort */ }
    }
    const deepestFirst = [...createdDirs].sort((a, b) => b.length - a.length)
    for (const dir of deepestFirst) {
      try { rmdirSync(dir) } catch { /* non-empty or already gone */ }
    }
    if (error instanceof ScaffoldError || error instanceof TypeError) throw error
    throw new ScaffoldError('WRITE_FAILED', error instanceof Error ? error.message : String(error))
  }
  return {
    targetDir: target,
    templateVersion: TEMPLATE_VERSION,
    files: files.map(file => file.path),
  }
}