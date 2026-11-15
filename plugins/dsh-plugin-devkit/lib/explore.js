/**
 * Host runtime-explorer reads (M2). Strictly read-only.
 *
 * Two verified cordis surfaces (see vendor/cordis/src):
 *  - RegistryService (registry.ts): ctx.registry.values() yields Plugin.Runtime
 *    { name?, fibers, callback }; each Fiber exposes uid / state / inject and a
 *    name getter. FiberState is a const enum (fiber.ts L147): PENDING=0,
 *    LOADING=1, ACTIVE=2, FAILED=3, DISPOSED=4, UNLOADING=5.
 *  - ReflectService (reflect.ts): ctx.reflect.props is the declared-property
 *    table (name → {type:'service'|'accessor'}); ctx.reflect.store is the
 *    implementation table keyed by isolation SYMBOL (Impl {name, fiber, value?}).
 *    The store must be enumerated with Reflect.ownKeys — Object.values only
 *    returns string-keyed properties and would silently yield nothing (cordis
 *    itself uses Reflect.ownKeys, reflect.ts L276). Both are public surfaces —
 *    this is the real reflection API, not the ctx-own-property fallback. When
 *    reflect is absent we degrade honestly.
 *
 * Only primitives are extracted: no service values, no fiber config, no
 * functions or symbols ever reach the JSON output.
 */

/** FiberState ordinals → names (vendor/cordis/src/fiber.ts L147). */
export const FIBER_STATES = ['PENDING', 'LOADING', 'ACTIVE', 'FAILED', 'DISPOSED', 'UNLOADING']

/** Map a numeric FiberState to its name; unknown ordinals degrade to UNKNOWN. */
export function fiberStateName(state) {
  return typeof state === 'number' && FIBER_STATES[state] !== undefined ? FIBER_STATES[state] : 'UNKNOWN'
}

function safeName(fiber) {
  try {
    const name = fiber?.name
    return typeof name === 'string' ? name : null
  } catch {
    return null
  }
}

function readRegistry(ctx) {
  const registry = ctx?.registry
  if (!registry || typeof registry.values !== 'function') {
    return { available: false, size: 0, runtimes: [] }
  }
  const runtimes = []
  for (const runtime of registry.values()) {
    const fibers = []
    for (const fiber of runtime.fibers ?? []) {
      fibers.push({
        uid: typeof fiber.uid === 'number' ? fiber.uid : null,
        name: safeName(fiber),
        state: typeof fiber.state === 'number' ? fiber.state : null,
        stateName: fiberStateName(fiber.state),
        inject: Object.keys(fiber.inject ?? {}),
      })
    }
    runtimes.push({
      name: typeof runtime.name === 'string' ? runtime.name : null,
      fiberCount: fibers.length,
      fibers,
    })
  }
  runtimes.sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? '')))
  const size = typeof registry.size === 'number' ? registry.size : runtimes.length
  return { available: true, size, runtimes }
}

function readServices(ctx) {
  const reflect = ctx?.reflect
  if (!reflect || !reflect.props || !reflect.store) {
    return { available: false, source: null, declared: [], provided: [] }
  }
  const declared = Object.keys(reflect.props)
    .map(name => ({ name, type: reflect.props[name]?.type ?? 'unknown' }))
    .sort((a, b) => a.name.localeCompare(b.name))
  const provided = []
  // The store is keyed by isolation symbols; Object.values would miss them all.
  for (const key of Reflect.ownKeys(reflect.store)) {
    const impl = reflect.store[key]
    if (!impl || typeof impl !== 'object' || typeof impl.name !== 'string') continue
    const fiber = impl.fiber
    provided.push({
      name: impl.name,
      stateName: fiber ? fiberStateName(fiber.state) : 'UNKNOWN',
      provider: fiber ? safeName(fiber) : null,
      hasValue: Object.hasOwn(impl, 'value'),
    })
  }
  provided.sort((a, b) => a.name.localeCompare(b.name) || String(a.provider ?? '').localeCompare(String(b.provider ?? '')))
  return { available: true, source: 'cordis-reflect', declared, provided }
}

/**
 * Snapshot the host runtime for the explorer. Pure read; never mutates ctx.
 * @param ctx - host cordis context (registry + reflect surfaces).
 * @returns JSON-safe { registry, services } with honest availability flags.
 */
export function exploreHost(ctx) {
  return {
    registry: readRegistry(ctx),
    services: readServices(ctx),
  }
}
