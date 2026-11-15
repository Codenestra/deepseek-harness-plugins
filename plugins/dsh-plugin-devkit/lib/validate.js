/**
 * M4 declaration validation (design §3.3). Strictly READ-ONLY: it reads project
 * files and runtime facts, never writes anything (no backups, no manifest edits).
 *
 * Six rules, each emitting pass / warning / error checks located to a file:
 *  1. structure — package.json type:module, exports ./client, dsh.bundle.patch
 *     points to an existing yml, dsh.client.platform=web.
 *  2. inject    — each dsh.client.inject package is resolvable (a loaded client
 *     module, or present in the profile node_modules); otherwise a warning.
 *  3. peerdep   — the @deepseek-ai/cordis peer range vs the actual installed
 *     version (minimal ~ / ^ / >= / exact semver, zero deps).
 *  4. patch     — cordis.patch.yml insert row id/name consistent with package.json.
 *  5. entry     — client.js calls __ModuleLoader__.load; index.js exports apply+name.
 *  6. report    — aggregate into a three-level (pass/warning/error) summary.
 *
 * Runtime facts (clientModules, cordisVersion, profileDir) are supplied by the
 * host route; when absent the affected rule degrades to an honest warning rather
 * than guessing.
 */
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, isAbsolute, resolve, basename } from 'node:path'

/** A devkit validation failure with a stable machine code (input-level only). */
export class ValidateError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'ValidateError'
    this.code = code
  }
}

/** Parse a leading major.minor.patch from a version string; null if not parseable. */
function parseVersion(value) {
  if (typeof value !== 'string') return null
  const match = value.trim().replace(/^v/, '').match(/^(\d+)\.(\d+)\.(\d+)/)
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null
}

function compareVersion(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1
  }
  return 0
}

/**
 * Minimal semver satisfaction for the ranges cordis plugins actually use
 * (~, ^, >=, <=, >, <, exact, *). Returns true/false, or null when unparseable.
 */
export function satisfies(version, range) {
  const v = parseVersion(version)
  if (!v || typeof range !== 'string' || range.trim() === '') return null
  const r = range.trim()
  if (r === '*' || r === 'latest') return true
  const match = r.match(/^(~|\^|>=|<=|>|<|=)?\s*(.+)$/)
  if (!match) return null
  const op = match[1] || '='
  const base = parseVersion(match[2])
  if (!base) return null
  const c = compareVersion(v, base)
  switch (op) {
    case '=': return c === 0
    case '>': return c > 0
    case '>=': return c >= 0
    case '<': return c < 0
    case '<=': return c <= 0
    case '~': return c >= 0 && v[0] === base[0] && v[1] === base[1]
    case '^': return c >= 0 && v[0] === base[0]
    default: return null
  }
}

function stripQuote(value) {
  return value.replace(/^['"]|['"]$/g, '').trim()
}

/**
 * Extract insert-row id/name from the scaffold's cordis.patch.yml dialect without
 * a YAML dependency. Only the first insert row is needed for the consistency
 * check; unparseable content yields no rows (the caller warns).
 */
export function parsePatchRows(content) {
  const rows = []
  let current = null
  for (const line of String(content).split(/\r?\n/)) {
    const idMatch = line.match(/^\s*-\s*id:\s*(.+?)\s*$/)
    const nameMatch = line.match(/^\s*name:\s*(.+?)\s*$/)
    if (idMatch) {
      current = { id: stripQuote(idMatch[1]), name: null }
      rows.push(current)
    } else if (nameMatch && current) {
      current.name = stripQuote(nameMatch[1])
    }
  }
  return rows
}

/** Whether an ES module source exports a given identifier (declaration or named). */
function hasExport(content, ident) {
  const decl = new RegExp(`export\\s+(?:async\\s+)?(?:function|const|let|var|class)\\s+${ident}\\b`)
  const named = new RegExp(`export\\s*\\{[^}]*\\b${ident}\\b[^}]*\\}`)
  return decl.test(content) || named.test(content)
}

function finalize(dir, name, checks) {
  const summary = { pass: 0, warning: 0, error: 0 }
  for (const check of checks) summary[check.level]++
  const status = summary.error > 0 ? 'error' : summary.warning > 0 ? 'warning' : 'pass'
  return { dir, name, status, summary, checks }
}

/**
 * Validate a project directory against the six declaration rules. Read-only.
 * @param projectDir - absolute path to the project.
 * @param options - { profileDir?, clientModules?: string[], cordisVersion?: string }.
 * @returns { dir, name, status, summary:{pass,warning,error}, checks:[{rule,level,file,message}] }.
 * @throws ValidateError INVALID_DIR for empty/relative input.
 */
export async function validateProject(projectDir, options = {}) {
  if (typeof projectDir !== 'string' || projectDir.trim() === '') {
    throw new ValidateError('INVALID_DIR', '工程目录必须是非空绝对路径。')
  }
  if (!isAbsolute(projectDir.trim())) {
    throw new ValidateError('INVALID_DIR', '工程目录必须是绝对路径。')
  }
  const dir = resolve(projectDir.trim())
  const { profileDir, clientModules, cordisVersion } = options
  const checks = []
  const add = (rule, level, file, message) => checks.push({ rule, level, file, message })

  let manifest = null
  try {
    manifest = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'))
  } catch { /* handled below */ }
  if (manifest === null || typeof manifest !== 'object' || Array.isArray(manifest)) {
    add('structure', 'error', 'package.json', '缺少可读取的 package.json。')
    return finalize(dir, null, checks)
  }
  const name = typeof manifest.name === 'string' ? manifest.name : null

  // Rule 1 — package.json structure.
  if (manifest.type === 'module') add('structure', 'pass', 'package.json', 'type:module ✓')
  else add('structure', 'error', 'package.json', `type 应为 "module"，实际 ${JSON.stringify(manifest.type)}。`)

  const clientExport = manifest.exports?.['./client']
  if (typeof clientExport === 'string' && clientExport !== '') add('structure', 'pass', 'package.json', 'exports["./client"] 客户端入口 ✓')
  else add('structure', 'error', 'package.json', '缺少 exports["./client"] 客户端入口。')

  const patchRel = manifest.dsh?.bundle?.patch
  let patchAbs = null
  if (typeof patchRel === 'string' && patchRel !== '') {
    patchAbs = resolve(dir, patchRel)
    if (existsSync(patchAbs)) add('structure', 'pass', 'package.json', `dsh.bundle.patch 指向存在的 ${patchRel} ✓`)
    else add('structure', 'error', 'package.json', `dsh.bundle.patch 指向的 ${patchRel} 不存在。`)
  } else {
    add('structure', 'error', 'package.json', '缺少 dsh.bundle.patch 声明。')
  }

  const platform = manifest.dsh?.client?.platform
  if (platform === 'web') add('structure', 'pass', 'package.json', 'dsh.client.platform=web ✓')
  else add('structure', 'error', 'package.json', `dsh.client.platform 应为 "web"，实际 ${JSON.stringify(platform)}。`)

  // Rule 2 — inject resolvability.
  const inject = manifest.dsh?.client?.inject
  const known = Array.isArray(clientModules) ? new Set(clientModules) : null
  if (!Array.isArray(inject) || inject.length === 0) {
    add('inject', 'warning', 'package.json', '未声明 dsh.client.inject（客户端可能无法注入依赖）。')
  } else {
    for (const pkg of inject) {
      if (typeof pkg !== 'string') {
        add('inject', 'warning', 'package.json', `inject 含非字符串项 ${JSON.stringify(pkg)}。`)
        continue
      }
      if (known && known.has(pkg)) add('inject', 'pass', 'package.json', `inject ${pkg} 已在应用客户端模块中 ✓`)
      else if (profileDir && existsSync(join(profileDir, 'node_modules', pkg))) add('inject', 'pass', 'package.json', `inject ${pkg} 在 profile node_modules 可解析 ✓`)
      else if (!known && !profileDir) add('inject', 'warning', 'package.json', `无法校验 inject ${pkg} 可解析（缺少运行时模块/profile 信息）。`)
      else add('inject', 'warning', 'package.json', `inject ${pkg} 未在已加载客户端模块或 profile node_modules 中找到（请确认拼写）。`)
    }
  }

  // Rule 3 — cordis peer compatibility.
  const range = manifest.peerDependencies?.['@deepseek-ai/cordis']
  if (typeof range !== 'string' || range === '') {
    add('peerdep', 'warning', 'package.json', '未声明 @deepseek-ai/cordis peerDependency。')
  } else if (typeof cordisVersion !== 'string' || cordisVersion === '') {
    add('peerdep', 'warning', 'package.json', `无法校验 cordis 兼容（未提供实际版本）；声明范围 ${range}。`)
  } else {
    const ok = satisfies(cordisVersion, range)
    if (ok === true) add('peerdep', 'pass', 'package.json', `cordis 范围 ${range} 兼容实际版本 ${cordisVersion} ✓`)
    else if (ok === false) add('peerdep', 'error', 'package.json', `cordis 范围 ${range} 与实际版本 ${cordisVersion} 不兼容。`)
    else add('peerdep', 'warning', 'package.json', `无法解析 cordis 范围 ${range} 或版本 ${cordisVersion}。`)
  }

  // Rule 4 — patch consistency.
  if (patchAbs && existsSync(patchAbs)) {
    let content = ''
    try { content = await readFile(patchAbs, 'utf8') } catch { /* empty */ }
    const rows = parsePatchRows(content)
    const patchFile = basename(patchAbs)
    if (rows.length === 0) {
      add('patch', 'warning', patchFile, '未能从 patch 解析出 insert 行（请检查 YAML 格式）。')
    } else {
      const row = rows[0]
      if (row.name && name && row.name === name) add('patch', 'pass', patchFile, `patch name 与包名一致（${name}）✓`)
      else add('patch', 'error', patchFile, `patch name ${JSON.stringify(row.name)} 与包名 ${JSON.stringify(name)} 不一致。`)
      if (row.id) add('patch', 'pass', patchFile, `patch id ${row.id} ✓`)
      else add('patch', 'warning', patchFile, 'patch 行缺少 id。')
    }
  } else {
    add('patch', 'error', 'cordis.patch.yml', 'patch 文件不存在，无法校验一致性。')
  }

  // Rule 5 — entry files.
  const clientPath = join(dir, 'client.js')
  if (!existsSync(clientPath)) {
    add('entry', 'error', 'client.js', '缺少 client.js。')
  } else {
    const content = await readFile(clientPath, 'utf8').catch(() => '')
    if (content.includes('__ModuleLoader__.load')) add('entry', 'pass', 'client.js', 'client.js 调用 __ModuleLoader__.load ✓')
    else add('entry', 'error', 'client.js', 'client.js 未调用 __ModuleLoader__.load。')
  }
  const indexPath = join(dir, 'index.js')
  if (!existsSync(indexPath)) {
    add('entry', 'error', 'index.js', '缺少 index.js。')
  } else {
    const content = await readFile(indexPath, 'utf8').catch(() => '')
    const hasApply = hasExport(content, 'apply')
    const hasName = hasExport(content, 'name')
    if (hasApply && hasName) add('entry', 'pass', 'index.js', 'index.js 导出 apply 与 name ✓')
    else add('entry', 'error', 'index.js', `index.js 缺少导出：${[hasApply ? null : 'apply', hasName ? null : 'name'].filter(Boolean).join(', ')}。`)
  }

  return finalize(dir, name, checks)
}