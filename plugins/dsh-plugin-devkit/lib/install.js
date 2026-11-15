/**
 * M3 one-click local install / uninstall orchestration.
 *
 * Design refinement (verified against DSH source): rather than hand-writing the
 * profile manifest, devkit delegates to the app's official `ctx.pluginManager`
 * service. `installBundle('link:<absDir>')` runs the same pnpm path as `dsh
 * plugin` — it materializes the link dependency (node_modules junction +
 * lockfile), writes the dependency, validates the bundle patch and cordis peer
 * compatibility, adds the `dsh.profile.bundles` entry, and rolls package.json /
 * pnpm-lock.yaml back on failure (all under a file lock). `removeBundle(name)`
 * removes only that dependency + junction and NEVER deletes the linked project
 * files. This satisfies the M1 finding that link deps must be materialized,
 * while keeping devkit itself free of shell/network and reusing the app's
 * protected manifest path. devkit owns the confirm gate, project validation,
 * ChangeResult summarization, and registered-vs-loaded status mapping.
 */
import { readFile } from 'node:fs/promises'
import { join, isAbsolute, resolve } from 'node:path'

/** A devkit install/validation failure with a stable machine code. */
export class InstallError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'InstallError'
    this.code = code
  }
}

const LOCAL_NAME = /^@local\/dsh-[a-z0-9-]+$/

function requireManager(manager) {
  if (!manager || typeof manager.installBundle !== 'function'
    || typeof manager.removeBundle !== 'function' || typeof manager.listBundles !== 'function') {
    throw new InstallError('MANAGER_UNAVAILABLE', '当前部署未提供 pluginManager 服务，无法一键安装/卸载。')
  }
}

/** Read-only validation of a scaffolded project before it is installed. */
export async function validateInstallProject(projectDir) {
  if (typeof projectDir !== 'string' || projectDir.trim() === '') {
    throw new InstallError('INVALID_DIR', '工程目录必须是非空绝对路径。')
  }
  const trimmed = projectDir.trim()
  if (!isAbsolute(trimmed)) {
    throw new InstallError('INVALID_DIR', '工程目录必须是绝对路径。')
  }
  const dir = resolve(trimmed)
  let manifest
  try {
    manifest = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'))
  } catch {
    throw new InstallError('NO_PACKAGE_JSON', '工程目录缺少可读取的 package.json。')
  }
  if (manifest === null || typeof manifest !== 'object' || typeof manifest.name !== 'string' || !LOCAL_NAME.test(manifest.name)) {
    throw new InstallError('BAD_NAME', '包名必须符合 @local/dsh-<kebab-case> 约定。')
  }
  if (manifest.dsh?.bundle === undefined) {
    throw new InstallError('NOT_BUNDLE', 'package.json 缺少 dsh.bundle 声明，不是一个 DSH bundle。')
  }
  return { dir, name: manifest.name, manifest }
}

/** Reduce the app's ChangeResult to the primitives the client renders (no leakage). */
export function summarizeChange(result) {
  if (!result || typeof result !== 'object') {
    return { changed: false, application: 'failed', stage: null, bundle: null, enabled: null, warnings: [], error: null, restartRequired: false }
  }
  const application = typeof result.application === 'string' ? result.application : 'failed'
  const error = result.error && typeof result.error === 'object'
    ? { code: result.error.code ?? 'operation-error', message: result.error.diagnostic ?? result.error.message ?? '' }
    : null
  return {
    changed: Boolean(result.changed),
    application,
    stage: result.stage ?? null,
    bundle: result.bundle ?? result.target ?? null,
    enabled: typeof result.enabled === 'boolean' ? result.enabled : null,
    warnings: Array.isArray(result.warnings) ? result.warnings.filter(w => typeof w === 'string') : [],
    error,
    restartRequired: application === 'restart-required',
  }
}

/** Install a local project through the official pluginManager (confirm-gated). */
export async function installProject(manager, projectDir, confirm) {
  if (confirm !== 'INSTALL') {
    throw new InstallError('CONFIRM_REQUIRED', '安装需要 confirm:"INSTALL" 确认参数。')
  }
  requireManager(manager)
  const { dir, name } = await validateInstallProject(projectDir)
  const spec = 'link:' + dir
  const result = await manager.installBundle(spec)
  return { name, spec, result: summarizeChange(result) }
}

/** Uninstall a local bundle through the official pluginManager (confirm-gated). Project files are preserved. */
export async function uninstallProject(manager, packageName, confirm) {
  if (confirm !== 'UNINSTALL') {
    throw new InstallError('CONFIRM_REQUIRED', '卸载需要 confirm:"UNINSTALL" 确认参数。')
  }
  requireManager(manager)
  if (typeof packageName !== 'string' || !LOCAL_NAME.test(packageName)) {
    throw new InstallError('BAD_NAME', '只能卸载 @local/dsh-* 本地包。')
  }
  const result = await manager.removeBundle(packageName)
  return { name: packageName, result: summarizeChange(result) }
}

/**
 * Candidate runtime names a bundle row may map to. A row's moduleName is the
 * package specifier ('@local/dsh-plugin-devkit') while the registry runtime name
 * is the plugin's exported name ('plugin-devkit', usually equal to the patch
 * rowId or the package's unscoped suffix). Bridge all three so loaded is correct.
 */
function runtimeCandidates(row) {
  const names = []
  if (typeof row.rowId === 'string' && row.rowId !== '') names.push(row.rowId)
  if (typeof row.moduleName === 'string' && row.moduleName !== '') {
    names.push(row.moduleName)
    const slash = row.moduleName.lastIndexOf('/')
    if (slash >= 0 && slash < row.moduleName.length - 1) names.push(row.moduleName.slice(slash + 1))
  }
  return names
}

/**
 * Status of installed local bundles: registered (profile dependency) / enabled
 * (selected in bundles) / loaded (an ACTIVE host runtime matching a bundle row).
 * `runtimes` is the exploreHost registry list; loaded is a best-effort cross-ref.
 */
export async function localPluginStatus(manager, runtimes) {
  if (!manager || typeof manager.listBundles !== 'function') {
    return { available: false, plugins: [] }
  }
  const bundles = await manager.listBundles()
  const activeNames = new Set(
    (Array.isArray(runtimes) ? runtimes : [])
      .filter(runtime => (runtime.fibers ?? []).some(fiber => fiber.stateName === 'ACTIVE'))
      .map(runtime => runtime.name),
  )
  const plugins = (Array.isArray(bundles) ? bundles : [])
    .filter(bundle => bundle && bundle.installed === true && typeof bundle.name === 'string' && bundle.name.startsWith('@local/dsh-'))
    .map(bundle => ({
      name: bundle.name,
      version: bundle.version ?? null,
      enabled: Boolean(bundle.enabled),
      installed: true,
      removable: Boolean(bundle.removable),
      loaded: (bundle.rows ?? []).some(row => runtimeCandidates(row).some(name => activeNames.has(name))),
      error: bundle.error?.code ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
  return { available: true, plugins }
}
