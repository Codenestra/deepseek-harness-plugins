/**
 * DeepSeek Harness Project Hub host plugin.
 *
 * Deliberately thin. The page already reaches Workspace CRUD, session search
 * and every navigation action through the official Client faces
 * (`ctx.workspaces`, `ctx.sessions`, `ctx.uiWorkspace`), so re-implementing any
 * of it here would only duplicate a supported path. The host keeps the two
 * things a browser cannot do for itself:
 *
 *   1. one aggregated project overview — a single round trip instead of one per
 *      project, plus the live directory probe behind the `missing-dir` badge;
 *   2. from M3, the durable per-project notes file under the profile directory.
 *
 * Every read is guarded: a workspace row, a corpus read or a registry setter
 * that throws degrades the payload and says so in `degraded`, instead of
 * turning one unreadable project into a dead panel.
 */

import { createHash } from 'node:crypto'
import { join } from 'node:path'

import { createNotesStore, NOTES_VERSION, NotesConflictError } from './lib/notes.js'
import { buildOverview } from './lib/overview.js'

export const name = 'project-hub'
// `profileContext` is the M3 notes directory anchor; the overview itself reads
// the registry and the corpus only.
export const inject = ['workspaceRegistry', 'sessionQuery', 'connection', 'profileContext']

/** Human-readable form of anything thrown at a route boundary. */
function messageOf(error) {
  return error instanceof Error ? error.message : String(error)
}

function jsonResponse(value, status = 200, head = false, etag) {
  const body = JSON.stringify(value)
  return new Response(head ? null : body, {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-length': String(Buffer.byteLength(body)),
      'cache-control': 'no-store',
      ...(etag === undefined ? {} : { etag }),
    },
  })
}

/** Weak validator over the payload's data identity; unchanged data answers 304. */
function etagOf(payload) {
  return `W/"${createHash('sha1').update(String(payload.etag)).digest('hex')}"`
}

function errorResponse(error, head = false) {
  const invalid = error instanceof TypeError
  return jsonResponse({
    error: {
      code: invalid ? 'INVALID_REQUEST' : 'PROJECT_HUB_ERROR',
      message: messageOf(error),
    },
  }, invalid ? 400 : 500, head)
}

/** Registry id lists are string arrays; anything else reads as empty. */
function idList(value) {
  if (!Array.isArray(value)) return []
  return value.filter(entry => typeof entry === 'string' && entry !== '')
}

/** Notes have no home when the host exposes no profile directory. */
const NOTES_UNAVAILABLE = 'notes are unavailable: this host exposes no profile directory'

/**
 * Absolute path of the durable notes file.
 *
 * Profile-scoped on purpose: the profile directory is the launcher-owned home for
 * per-profile plugin state, so notes follow the profile the user launched and
 * never a guessed location.
 * @param ctx - host plugin context.
 * @returns the path, or null when this host has no profile directory.
 */
function notesFileOf(ctx) {
  const dir = ctx?.profileContext?.dir
  return typeof dir === 'string' && dir !== '' ? join(dir, 'project-hub', 'notes.json') : null
}

/** Parse one JSON request body; a malformed body is the caller's error (400). */
async function readJson(request) {
  const text = await request.text()
  if (text.trim() === '') throw new TypeError('a JSON body is required')
  try {
    return JSON.parse(text)
  } catch {
    throw new TypeError('the request body is not valid JSON')
  }
}

/** 503 rather than 500: the capability is absent, nothing broke. */
function notesUnavailableResponse() {
  return jsonResponse({ error: { code: 'NOTES_UNAVAILABLE', message: NOTES_UNAVAILABLE } }, 503)
}

/** Write-side failures: a durable state that refuses answers 409, else the usual mapping. */
function writeErrorResponse(error) {
  if (error instanceof NotesConflictError) {
    return jsonResponse({ error: { code: 'NOTES_CONFLICT', message: messageOf(error) } }, 409)
  }
  return errorResponse(error)
}

/** Read one durable registry set, treating an unloaded state as empty. */
function safeIds(read) {
  try {
    return idList(read())
  } catch {
    return []
  }
}

/**
 * Probe one workspace directory.
 * @param workspace - registry workspace entity.
 * @returns `'ok'`, `'missing-dir'`, or `'unknown'` when the probe itself failed.
 */
async function probeStatus(workspace) {
  try {
    return (await workspace.status()) === 'missing-dir' ? 'missing-dir' : 'ok'
  } catch {
    return 'unknown'
  }
}

/**
 * Project one registry workspace into aggregator input.
 * @param workspace - registry workspace entity.
 * @returns the plain row, or null when the entity cannot be read at all.
 */
async function projectSource(workspace) {
  try {
    return {
      id: String(workspace.id),
      path: workspace.path,
      title: workspace.title,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
      sessionIds: idList(workspace.sessionIds),
      status: await probeStatus(workspace),
    }
  } catch {
    return null
  }
}

/**
 * Read both host sources and aggregate one overview payload.
 * @param ctx - host plugin context carrying `workspaceRegistry` and `sessionQuery`.
 * @returns the overview payload, with `degraded` naming any partial read.
 */
async function readOverview(ctx) {
  const degraded = {}
  const registry = ctx.workspaceRegistry

  let workspaces = []
  try {
    const listed = typeof registry?.list === 'function' ? registry.list() : []
    workspaces = (await Promise.all(listed.map(projectSource))).filter(row => row !== null)
    const unreadable = listed.length - workspaces.length
    if (unreadable > 0) degraded.workspaces = `${unreadable} workspace row(s) could not be read`
  } catch (error) {
    degraded.workspaces = messageOf(error)
  }

  let sessions = []
  if (typeof ctx.sessionQuery?.listSessions !== 'function') {
    degraded.sessions = 'this deployment mounts no session query service'
  } else {
    try {
      for (const record of await ctx.sessionQuery.listSessions()) {
        const header = record?.header
        if (typeof header?.id !== 'string') continue
        sessions.push({
          id: header.id,
          cwd: header.cwd,
          createdAt: header.createdAt,
          // Delegation facts travel with the record so the aggregator can tell
          // a spawned subagent from a session the sidebar lists.
          parentSession: header.parentSession,
          delegationDepth: header.delegationDepth,
          live: record.live === true,
          persisted: record.persisted === true,
        })
      }
    } catch (error) {
      degraded.sessions = messageOf(error)
    }
  }

  return buildOverview({
    workspaces,
    sessions,
    pinnedSessionIds: safeIds(() => registry?.pinnedSessionIds),
    archivedSessionIds: safeIds(() => registry?.archivedSessionIds),
    generatedAt: Date.now(),
    ...(Object.keys(degraded).length === 0 ? {} : { degraded }),
  })
}

export function apply(ctx) {
  // Notes are the only durable state this plugin owns. One store per activation;
  // a host without a profile directory simply has no notes to serve.
  const notesFile = notesFileOf(ctx)
  const notes = notesFile === null ? null : createNotesStore({ file: notesFile })

  const routes = [
    ctx.connection.fetch.register({
      path: '/api/project-hub/overview',
      methods: ['GET', 'HEAD'],
      requestBody: 'buffered',
      fetch: async (request) => {
        const head = request.method === 'HEAD'
        try {
          const payload = await readOverview(ctx)
          const etag = etagOf(payload)
          if (request.headers?.get?.('if-none-match') === etag) {
            return new Response(null, { status: 304, headers: { etag, 'cache-control': 'no-store' } })
          }
          return jsonResponse(payload, 200, head, etag)
        } catch (error) {
          return errorResponse(error, head)
        }
      },
    }),

    // One registration serves the read and the write: same path, three methods,
    // so the route table keeps one row per resource.
    ctx.connection.fetch.register({
      path: '/api/project-hub/notes',
      methods: ['GET', 'HEAD', 'POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        if (request.method === 'POST') {
          try {
            if (notes === null) return notesUnavailableResponse()
            return jsonResponse({ note: await notes.upsert(await readJson(request)) }, 200)
          } catch (error) {
            return writeErrorResponse(error)
          }
        }
        const head = request.method === 'HEAD'
        try {
          if (notes === null) {
            return jsonResponse({
              version: NOTES_VERSION,
              notes: {},
              generatedAt: Date.now(),
              degraded: { notes: NOTES_UNAVAILABLE },
            }, 200, head, etagOf({ etag: 'notes-unavailable' }))
          }
          const snapshot = await notes.snapshot()
          const etag = etagOf({ etag: JSON.stringify(snapshot.notes) })
          if (request.headers?.get?.('if-none-match') === etag) {
            return new Response(null, { status: 304, headers: { etag, 'cache-control': 'no-store' } })
          }
          return jsonResponse({
            version: snapshot.version,
            notes: snapshot.notes,
            generatedAt: Date.now(),
            ...(snapshot.degraded === undefined ? {} : { degraded: { notes: snapshot.degraded } }),
          }, 200, head, etag)
        } catch (error) {
          return errorResponse(error, head)
        }
      },
    }),

    ctx.connection.fetch.register({
      path: '/api/project-hub/notes/delete',
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          if (notes === null) return notesUnavailableResponse()
          const body = await readJson(request)
          const workspaceId = body !== null && typeof body === 'object' && !Array.isArray(body)
            ? body.workspaceId
            : undefined
          return jsonResponse({ removed: await notes.remove(workspaceId) }, 200)
        } catch (error) {
          return writeErrorResponse(error)
        }
      },
    }),
  ]

  ctx.effect(() => () => {
    for (const dispose of routes) void dispose()
  }, 'project-hub: routes')
}
