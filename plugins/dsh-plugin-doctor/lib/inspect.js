/**
 * dsh-plugin-doctor — host-side health inspection (M1).
 *
 * Pure logic: no ctx, no fs. Inputs are collected by index.js from the
 * verified read-only data sources and passed in as plain data:
 *   - ctx.registry.forEach  → collectRuntimes()
 *   - ctx.loader.entries()  → collectEntries()   (supplemental, approved)
 *   - profile package.json  → classify({ manifest })
 *   - profileContext.startedBundles              (supplemental, approved)
 *
 * FiberState is a `const enum` in cordis (vendor/cordis/src/fiber.ts), so the
 * runtime values are mapped here by number and covered by tests.
 */

/** cordis FiberState runtime values (vendor/cordis/src/fiber.ts). */
export const FIBER_STATES = Object.freeze({
  0: 'PENDING',
  1: 'LOADING',
  2: 'ACTIVE',
  3: 'FAILED',
  4: 'DISPOSED',
  5: 'UNLOADING',
})

/** Human-readable fiber state; unknown values are reported honestly. */
export function stateName(value) {
  return FIBER_STATES[value] ?? `UNKNOWN(${value})`
}

/** Diagnostic statuses (design.md §3; conflict/compat join in M2/M3). */
export const STATUS = Object.freeze({
  HEALTHY: 'healthy',
  PENDING: 'pending',
  FAILED: 'failed',
  DORMANT: 'dormant',
  BROKEN: 'broken',
  DISABLED: 'disabled',
  UNLOADING: 'unloading',
  UNKNOWN: 'unknown',
})

const STATUS_KEYS = Object.values(STATUS)

function usableName(value) {
  return typeof value === 'string' && value !== '' && value !== 'apply' ? value : null
}

function injectNames(fiber) {
  const inject = fiber?.inject
  if (!inject || typeof inject !== 'object') return []
  try { return Object.keys(inject) } catch { return [] }
}

/**
 * Enumerate plugin runtimes from ctx.registry.
 * name falls back to callback.name, then to an unnamed marker (design risk §7.2).
 * @param {object|null} registry — anything exposing forEach((runtime, callback))
 * @returns {Array<object>} runtime rows with per-fiber state and entry attribution
 */
export function collectRuntimes(registry) {
  if (!registry || typeof registry.forEach !== 'function') return []
  const rows = []
  registry.forEach((runtime, callback) => {
    const row = {
      name: usableName(runtime?.name) ?? usableName(callback?.name) ?? '',
      unnamed: !(usableName(runtime?.name) ?? usableName(callback?.name)),
      fibers: [],
    }
    try {
      for (const fiber of runtime.fibers ?? []) {
        const entry = fiber?.entry ?? null
        row.fibers.push({
          uid: fiber?.uid ?? null,
          state: fiber?.state,
          stateName: stateName(fiber?.state),
          requiredServices: injectNames(fiber),
          entryId: entry?.options?.id ?? null,
          packageName: entry?.options?.name ?? null,
          entryDisabled: entry ? Boolean(entry.disabled) : null,
        })
      }
    } catch (error) {
      row.error = error instanceof Error ? error.message : String(error)
    }
    rows.push(row)
  })
  return rows
}

/**
 * Enumerate loader entries (supplemental approved source). Each entry's
 * options.name is the exact package name used in dsh.profile.bundles.
 * @param {object|null} loader — anything exposing entries() iterable
 * @returns {Array<object>} entry rows; groups are kept but flagged
 */
export function collectEntries(loader) {
  if (!loader || typeof loader.entries !== 'function') return []
  const rows = []
  let iterator
  try { iterator = loader.entries() } catch { return [] }
  try {
    for (const entry of iterator) {
      let id
      try { id = entry.id } catch { id = entry?.options?.id }
      const fiber = entry?.fiber ?? null
      const state = typeof fiber?.state === 'number' ? fiber.state : null
      rows.push({
        id: id ?? entry?.options?.id ?? null,
        name: entry?.options?.name ?? null,
        disabled: Boolean(entry?.disabled),
        group: Boolean(entry?.options?.group),
        state,
        stateName: state === null ? null : stateName(state),
        fiberUid: fiber?.uid ?? null,
        requiredServices: injectNames(fiber),
      })
    }
  } catch {
    // Partial enumeration is still useful; return what was collected.
  }
  return rows
}

function normalizeManifest(manifest) {
  const dependencies = manifest?.dependencies && typeof manifest.dependencies === 'object' && !Array.isArray(manifest.dependencies)
    ? manifest.dependencies
    : {}
  const rawBundles = manifest?.dsh?.profile?.bundles
  const bundles = Array.isArray(rawBundles) ? rawBundles.filter(item => typeof item === 'string') : []
  return { dependencies, bundles }
}

/** Severity order for aggregating several fibers of one package. */
function aggregateStatus(states) {
  if (states.includes(3)) return STATUS.FAILED
  if (states.includes(0)) return STATUS.PENDING
  if (states.includes(5)) return STATUS.UNLOADING
  if (states.includes(2) || states.includes(1)) return STATUS.HEALTHY
  return null
}

function emptySummary() {
  const summary = { total: 0, libraries: 0 }
  for (const key of STATUS_KEYS) summary[key] = 0
  return summary
}

/**
 * Classify the plugin stack. Manifest-driven universe (dependencies ∪ bundles),
 * joined with live runtime evidence.
 *
 * @param {object} input
 * @param {object|null} input.manifest — parsed profile package.json
 * @param {Array} input.runtimes — collectRuntimes() output
 * @param {Array} input.entries — collectEntries() output
 * @param {string[]} input.startedBundles — profileContext.startedBundles
 * @param {(pkg: string) => ({version?: string, hasBundle?: boolean}|null)} input.readPackageMeta
 * @param {((name: string) => boolean)|undefined} input.hasService — active-service probe
 * @param {Object<string, string[]>|undefined} input.bundleRows — container bundle → contributed row names (lib/bundle-rows.js)
 * @returns {{plugins: Array, libraries: Array, summary: object}}
 */
export function classify(input = {}) {
  const { dependencies, bundles } = normalizeManifest(input.manifest)
  const runtimes = Array.isArray(input.runtimes) ? input.runtimes : []
  const entries = (Array.isArray(input.entries) ? input.entries : []).filter(entry => !entry.group && typeof entry.name === 'string')
  const startedBundles = Array.isArray(input.startedBundles) ? input.startedBundles : []
  const readPackageMeta = typeof input.readPackageMeta === 'function' ? input.readPackageMeta : () => null
  const hasService = typeof input.hasService === 'function' ? input.hasService : null
  const bundleRows = input.bundleRows && typeof input.bundleRows === 'object' && !Array.isArray(input.bundleRows) ? input.bundleRows : {}

  const bundleSet = new Set(bundles)
  const dependencyNames = Object.keys(dependencies)
  const universe = [...new Set([...dependencyNames, ...bundles])]

  const entriesByPackage = new Map()
  for (const entry of entries) {
    const list = entriesByPackage.get(entry.name) ?? []
    list.push(entry)
    entriesByPackage.set(entry.name, list)
  }

  const runtimeFibersByPackage = new Map()
  for (const runtime of runtimes) {
    for (const fiber of runtime.fibers ?? []) {
      if (!fiber.packageName) continue
      const list = runtimeFibersByPackage.get(fiber.packageName) ?? []
      list.push(fiber)
      runtimeFibersByPackage.set(fiber.packageName, list)
    }
  }

  const plugins = []
  const libraries = []
  const summary = emptySummary()

  for (const pkg of universe) {
    const inDependencies = Object.hasOwn(dependencies, pkg)
    const inBundles = bundleSet.has(pkg)
    const shipped = !inDependencies && startedBundles.includes(pkg)
    const meta = readPackageMeta(pkg)
    const pkgEntries = entriesByPackage.get(pkg) ?? []
    const runtimeFibers = runtimeFibersByPackage.get(pkg) ?? []

    const source = inDependencies ? dependencies[pkg] : null
    const version = meta?.version ?? null
    let component = false

    // Dormant / library / component branch: declared dependency not registered.
    if (!inBundles) {
      if (!inDependencies) continue
      if (meta === null) {
        plugins.push(buildRow({
          pkg, status: STATUS.BROKEN, source, version, inDependencies, inBundles, shipped,
          pkgEntries, fibers: [], requiredServices: [], missingServices: null,
          notes: ['dependency declared but package files missing from node_modules'],
        }))
        summary.broken += 1
        continue
      }
      if (meta.hasBundle) {
        plugins.push(buildRow({
          pkg, status: STATUS.DORMANT, source, version, inDependencies, inBundles, shipped,
          pkgEntries, fibers: [], requiredServices: [], missingServices: null,
          notes: ['dependency present but not registered in dsh.profile.bundles'],
        }))
        summary.dormant += 1
        continue
      }
      // No dsh.bundle of its own: a library UNLESS live evidence shows it is a
      // bundle-carried component plugin (e.g. dsh-computer-use inside
      // computer-use-bundle). Components fall through to evidence aggregation.
      if (pkgEntries.length === 0 && runtimeFibers.length === 0) {
        libraries.push({ package: pkg, source, version })
        summary.libraries += 1
        continue
      }
      component = true
    }

    // Container bundles: rows inserted under other package names are attributed
    // back via the bundle's patch row names (bundleRows). Direct evidence and
    // contributed evidence merge; a row asserted by two bundles counts for both.
    const rowNames = inBundles && Array.isArray(bundleRows[pkg])
      ? bundleRows[pkg].filter(name => typeof name === 'string' && name !== pkg)
      : []
    const rowNameSet = new Set(rowNames)
    const contributedEntries = rowNameSet.size > 0 ? entries.filter(entry => rowNameSet.has(entry.name)) : []
    const contributedFibers = []
    if (rowNameSet.size > 0) {
      for (const [name, fibers] of runtimeFibersByPackage) {
        if (rowNameSet.has(name)) contributedFibers.push(...fibers)
      }
    }
    const allEntries = [...pkgEntries, ...contributedEntries]
    const allFibers = [...runtimeFibers, ...contributedFibers]

    // Registered/component branch: join live evidence (entries + runtime fibers).
    const fiberMap = new Map()
    for (const entry of allEntries) {
      if (entry.state === null) continue
      fiberMap.set(`${entry.fiberUid}:${entry.state}`, { uid: entry.fiberUid, state: entry.state, stateName: entry.stateName })
    }
    for (const fiber of allFibers) {
      fiberMap.set(`${fiber.uid}:${fiber.state}`, { uid: fiber.uid, state: fiber.state, stateName: fiber.stateName })
    }
    const fibers = [...fiberMap.values()]
    const states = fibers.map(fiber => fiber.state)

    // Required services come from PENDING fibers on both evidence paths.
    const requiredServices = []
    for (const entry of allEntries) {
      if (entry.state !== 0) continue
      for (const name of entry.requiredServices ?? []) {
        if (!requiredServices.includes(name)) requiredServices.push(name)
      }
    }
    for (const fiber of allFibers) {
      if (fiber.state !== 0) continue
      for (const name of fiber.requiredServices ?? []) {
        if (!requiredServices.includes(name)) requiredServices.push(name)
      }
    }
    const missingServices = hasService && requiredServices.length > 0
      ? requiredServices.filter(name => !hasService(name))
      : (requiredServices.length > 0 && !hasService ? null : [])

    let status = aggregateStatus(states)
    const notes = []
    if (component) notes.push('bundle-carried component plugin (no own dsh.bundle)')
    if (contributedEntries.length > 0) notes.push(`container bundle: aggregates ${contributedEntries.length} contributed rows`)
    if (status === null) {
      if (allEntries.length > 0 && allEntries.every(entry => entry.disabled)) {
        status = STATUS.DISABLED
        notes.push('all loader entries are disabled')
      } else if (allEntries.length === 0 && fibers.length === 0) {
        if (inDependencies || shipped || meta !== null) {
          status = STATUS.UNKNOWN
          notes.push('registered but no runtime records found')
        } else {
          status = STATUS.BROKEN
          notes.push('registered in bundles but dependency missing and package not resolvable')
        }
      } else {
        status = STATUS.UNKNOWN
        notes.push('entries exist but no live fiber is attached')
      }
    }
    if (status === STATUS.PENDING && missingServices === null) {
      notes.push('service availability probe unavailable; required services listed')
    }

    plugins.push(buildRow({
      pkg, status, source, version, inDependencies, inBundles, shipped,
      pkgEntries, fibers, requiredServices, missingServices, notes,
      component, contributedRows: contributedEntries.length,
    }))
    summary[status] += 1
  }

  summary.total = plugins.length
  return { plugins, libraries, summary }
}

function buildRow({ pkg, status, source, version, inDependencies, inBundles, shipped, pkgEntries, fibers, requiredServices, missingServices, notes, component = false, contributedRows = 0 }) {
  return {
    package: pkg,
    status,
    source,
    version,
    inDependencies,
    inBundles,
    shipped,
    component,
    contributedRows,
    entries: pkgEntries.map(entry => ({ id: entry.id, disabled: entry.disabled, state: entry.state, stateName: entry.stateName })),
    fibers,
    requiredServices,
    missingServices,
    notes,
  }
}