/** DeepSeek Harness Plugin DevKit host plugin (M1 scaffold, M2 explorer, M3 install, M4 validate). */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { generateProject, renderProject, ScaffoldError } from './lib/scaffold.js'
import { exploreHost } from './lib/explore.js'
import { installProject, uninstallProject, localPluginStatus, InstallError } from './lib/install.js'
import { validateProject, ValidateError } from './lib/validate.js'

export const name = 'plugin-devkit'
export const inject = ['connection', 'profileContext']

function jsonResponse(value, status = 200) {
  const body = JSON.stringify(value)
  return new Response(body, {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-length': String(Buffer.byteLength(body)),
      'cache-control': 'no-store',
    },
  })
}

function errorResponse(error) {
  const code = error instanceof TypeError ? 'INVALID_FORM'
    : error instanceof SyntaxError ? 'INVALID_JSON'
      : error instanceof ScaffoldError ? error.code
        : error instanceof InstallError ? error.code
          : error instanceof ValidateError ? error.code
            : 'PLUGIN_DEVKIT_ERROR'
  const status = code === 'PLUGIN_DEVKIT_ERROR' ? 500 : 400
  return jsonResponse({
    error: { code, message: error instanceof Error ? error.message : String(error) },
  }, status)
}

async function readJson(request) {
  try {
    return await request.json()
  } catch {
    throw new SyntaxError('request body must be valid JSON')
  }
}

/** Loaded client module ids (loadCache is a Map of record.id); undefined if absent. */
function clientModuleNames(ctx) {
  const modules = ctx.get('modules', false)
  const cache = modules?.loadCache
  if (!cache || typeof cache.forEach !== 'function') return undefined
  const names = []
  cache.forEach((record, id) => {
    const name = record && typeof record.id === 'string' ? record.id : typeof id === 'string' ? id : null
    if (name) names.push(name)
  })
  return names
}

/** Best-effort actual cordis version; undefined when it cannot be resolved. */
async function readCordisVersion(profileDir) {
  try {
    const url = import.meta.resolve('@deepseek-ai/cordis/package.json')
    const pkg = JSON.parse(await readFile(fileURLToPath(url), 'utf8'))
    if (typeof pkg.version === 'string') return pkg.version
  } catch { /* fall through to profile lookup */ }
  if (typeof profileDir === 'string' && profileDir !== '') {
    try {
      const pkg = JSON.parse(await readFile(`${profileDir}/node_modules/@deepseek-ai/cordis/package.json`, 'utf8'))
      if (typeof pkg.version === 'string') return pkg.version
    } catch { /* not present */ }
  }
  return undefined
}

/** Gather the runtime facts the validator needs; each degrades independently. */
async function validateOptions(ctx) {
  const profileDir = ctx.get('profileContext', false)?.dir
  return {
    profileDir: typeof profileDir === 'string' ? profileDir : undefined,
    clientModules: clientModuleNames(ctx),
    cordisVersion: await readCordisVersion(typeof profileDir === 'string' ? profileDir : undefined),
  }
}

export function apply(ctx, config = {}) {
  const routes = [
    ctx.connection.fetch.register({
      path: '/api/plugin-devkit/scaffold/preview',
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          const form = await readJson(request)
          return jsonResponse(renderProject(form))
        } catch (error) {
          return errorResponse(error)
        }
      },
    }),
    ctx.connection.fetch.register({
      path: '/api/plugin-devkit/scaffold/generate',
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          const body = await readJson(request)
          if (body === null || typeof body !== 'object' || Array.isArray(body)) {
            throw new TypeError('form must be an object')
          }
          const { targetDir, confirm, ...form } = body
          return jsonResponse(generateProject({ targetDir, confirm, form }))
        } catch (error) {
          return errorResponse(error)
        }
      },
    }),
    ctx.connection.fetch.register({
      path: '/api/plugin-devkit/explore/host',
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: async () => {
        try {
          return jsonResponse(exploreHost(ctx))
        } catch (error) {
          return errorResponse(error)
        }
      },
    }),
    ctx.connection.fetch.register({
      path: '/api/plugin-devkit/install',
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          const body = await readJson(request)
          if (body === null || typeof body !== 'object' || Array.isArray(body)) {
            throw new TypeError('install body must be an object')
          }
          const manager = ctx.get('pluginManager', false)
          return jsonResponse(await installProject(manager, body.projectDir, body.confirm))
        } catch (error) {
          return errorResponse(error)
        }
      },
    }),
    ctx.connection.fetch.register({
      path: '/api/plugin-devkit/uninstall',
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          const body = await readJson(request)
          if (body === null || typeof body !== 'object' || Array.isArray(body)) {
            throw new TypeError('uninstall body must be an object')
          }
          const manager = ctx.get('pluginManager', false)
          return jsonResponse(await uninstallProject(manager, body.packageName, body.confirm))
        } catch (error) {
          return errorResponse(error)
        }
      },
    }),
    ctx.connection.fetch.register({
      path: '/api/plugin-devkit/status',
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: async () => {
        try {
          const manager = ctx.get('pluginManager', false)
          const runtimes = exploreHost(ctx).registry.runtimes
          return jsonResponse(await localPluginStatus(manager, runtimes))
        } catch (error) {
          return errorResponse(error)
        }
      },
    }),
    ctx.connection.fetch.register({
      path: '/api/plugin-devkit/validate',
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          const body = await readJson(request)
          if (body === null || typeof body !== 'object' || Array.isArray(body)) {
            throw new TypeError('validate body must be an object')
          }
          const options = await validateOptions(ctx)
          // The client module loader lives in the client runtime; when the client
          // supplies its loaded module ids, prefer them over the host derivation.
          if (Array.isArray(body.clientModules)) {
            const ids = body.clientModules.filter(item => typeof item === 'string')
            if (ids.length > 0) options.clientModules = ids
          }
          return jsonResponse(await validateProject(body.projectDir, options))
        } catch (error) {
          return errorResponse(error)
        }
      },
    }),
  ]
  ctx.effect(() => () => {
    for (const dispose of routes) void dispose()
  }, 'plugin-devkit: routes')
}