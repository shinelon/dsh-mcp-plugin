/**
 * /mcp-manager/* route layer for the host half: a JSON envelope
 * (`{ ok, value } | { ok, error }`) over the profile patch document joined
 * with live Loader status. Loopback-only (the trust fence runs before any
 * method or body handling). Writes serialize with the HMR service the same
 * way the Host's ConfigEditor does, so a reload never races a mutation.
 *
 * @module @local/mcp-manager/host/routes
 */

import { readPatchDocument, collectMcpRows, docHasRowId, configViewOf, appendServerRow, setRowConfig, setRowEnabled, deleteRow, upsertOverrideRow, serializeVerified, atomicWritePatch, MCP_PLUGIN_NAME } from './patch-editor.js'
import { validateMcpConfig, validateMcpConfigStructural, isJsExpr, SERVER_NAME_RE } from './mcp-config.js'
import { isLoopbackRequest } from './loopback.js'

/** @typedef {import('node:http').IncomingMessage} IncomingMessage */
/** @typedef {import('node:http').ServerResponse} ServerResponse */

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'referrer-policy': 'no-referrer' }
const BODY_MAX_BYTES = 64 * 1024

/**
 * @param {ServerResponse} res
 * @param {number} status
 * @param {unknown} body
 */
function writeJson(res, status, body) {
  res.writeHead(status, JSON_HEADERS)
  res.end(JSON.stringify(body))
}

/**
 * @param {string} code
 * @param {string} message
 * @returns {Error & { code: string }}
 */
function httpError(code, message) {
  return /** @type {Error & { code: string }} */ (Object.assign(new Error(message), { code }))
}

/**
 * Read one bounded JSON object body, or null on any malformation.
 * @param {IncomingMessage} req
 * @returns {Promise<Record<string, unknown> | null>}
 */
async function readJsonObjectBody(req) {
  /** @type {Buffer[]} */
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    const buffer = /** @type {Buffer} */ (chunk)
    size += buffer.length
    if (size > BODY_MAX_BYTES) {
      req.destroy()
      return null
    }
    chunks.push(buffer)
  }
  const text = Buffer.concat(chunks).toString('utf8')
  if (text === '') return null
  try {
    const parsed = JSON.parse(text)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
    return /** @type {Record<string, unknown>} */ (parsed)
  } catch {
    return null
  }
}

/**
 * Run one mutation under the HMR serialization umbrella (when the service is
 * mounted), so a config reload never interleaves with a patch write.
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @template T
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
async function exclusive(ctx, fn) {
  let hmr
  try {
    hmr = ctx.get('hmr')
  } catch {
    hmr = undefined
  }
  if (hmr !== undefined && hmr !== null && typeof hmr.runExclusive === 'function') {
    return hmr.runExclusive(fn)
  }
  return fn()
}

/** Fiber lifecycle states (cordis FiberState). */
const FIBER_STATE = { PENDING: 0, LOADING: 1, ACTIVE: 2, FAILED: 3, DISPOSED: 4, UNLOADING: 5 }

/**
 * Map a loader entry's fiber state to a list status.
 * @param {{ fiber?: { state?: number } } | undefined} entry
 * @returns {'active' | 'loading' | 'pending' | 'failed'}
 */
function fiberStatus(entry) {
  const state = entry?.fiber?.state
  if (state === undefined) return 'pending'
  if (state === FIBER_STATE.ACTIVE) return 'active'
  if (state === FIBER_STATE.FAILED) return 'failed'
  if (state === FIBER_STATE.LOADING || state === FIBER_STATE.UNLOADING) return 'loading'
  return 'pending'
}

/**
 * Best-effort failure detail from the fiber's runtime internals; '' when the
 * shape does not cooperate.
 * @param {{ fiber?: unknown } | undefined} entry
 * @returns {string}
 */
function bestEffortError(entry) {
  try {
    const fiber = /** @type {Record<string, unknown> | undefined} */ (entry?.fiber)
    const error = fiber?.error ?? fiber?._error
    if (error === undefined || error === null) return ''
    if (error instanceof Error) return error.message
    return String(error)
  } catch {
    return ''
  }
}

/**
 * The raw config view for one id: document truth first (preserving `!!js`
 * markers), resolved entry config as the bundle-layer fallback.
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {ReturnType<typeof collectMcpRows>} docRows
 * @param {Map<string, { options?: Record<string, unknown> }>} entryById
 * @param {string} id
 */
function configForId(docRows, entryById, id) {
  const docRow = docRows.find(row => row.id === id)
  if (docRow !== undefined) return { config: configViewOf(docRow.row), source: 'profile' }
  const entry = entryById.get(id)
  if (entry !== undefined) {
    let config = entry.options?.config
    if (config === undefined || typeof config !== 'object' || config === null) config = {}
    return { config: structuredClone(config), source: 'bundle' }
  }
  return { config: {}, source: 'profile' }
}

/**
 * Build the list view: every id across the patch document and the live loader
 * entries, document-truth config joined with fiber status.
 * @param {import('@deepseek-ai/cordis').Context} ctx
 */
async function listServers(ctx) {
  const patchPath = ctx.profileContext.patchPath
  const doc = await readPatchDocument(patchPath)
  const docRows = collectMcpRows(doc)

  /** @type {Map<string, { options?: Record<string, unknown>, fiber?: { state?: number } }>} */
  const entryById = new Map()
  for (const entry of ctx.loader.entries()) {
    const options = /** @type {Record<string, unknown> | undefined} */ (entry.options)
    if (options?.name === MCP_PLUGIN_NAME && typeof options.id === 'string') {
      entryById.set(options.id, /** @type {any} */ (entry))
    }
  }

  const ids = new Set([...docRows.map(row => row.id).filter(id => id !== undefined), ...entryById.keys()])
  /** @type {unknown[]} */
  const servers = []
  for (const id of ids) {
    const docRow = docRows.find(row => row.id === id)
    const entry = entryById.get(id)
    const { config, source } = configForId(docRows, entryById, id)
    const record = /** @type {Record<string, unknown>} */ (config)
    const serverName = typeof record.serverName === 'string' && !isJsExpr(record.serverName)
      ? record.serverName
      : ''
    const disabledFlag = docRow !== undefined
      ? docRow.row.get('disabled') === true
      : entry?.options?.disabled === true
    const status = disabledFlag ? 'disabled' : fiberStatus(entry)
    servers.push({
      id,
      serverName,
      transport: record.transport === 'streamable-http' ? 'streamable-http' : 'stdio',
      target: typeof record.url === 'string' && !isJsExpr(record.url)
        ? record.url
        : typeof record.command === 'string' && !isJsExpr(record.command) ? record.command : '',
      enabled: !disabledFlag,
      status,
      errorText: status === 'failed' ? bestEffortError(entry) : '',
      source,
      hasJsExpr: JSON.stringify(config).includes('"__js"'),
      config,
    })
  }
  servers.sort((a, b) => String(/** @type {any} */ (a).serverName).localeCompare(String(/** @type {any} */ (b).serverName)))
  return { servers }
}

/**
 * All occupied serverNames across the document and live entries (`null` marks
 * an expression-defined name that cannot be checked textually).
 * @param {ReturnType<typeof collectMcpRows>} docRows
 * @param {Map<string, { options?: Record<string, unknown> }>} entryById
 * @returns {Set<string | null>}
 */
function occupiedServerNames(docRows, entryById) {
  const names = new Set()
  for (const row of docRows) {
    const config = configViewOf(row.row)
    names.add(isJsExpr(config.serverName) ? null : String(config.serverName))
  }
  for (const entry of entryById.values()) {
    const config = /** @type {Record<string, unknown> | undefined} */ (entry.options?.config)
    if (config !== undefined && !isJsExpr(config.serverName)) names.add(String(config.serverName))
  }
  return names
}

/**
 * Loader entries by id, fresh at call time.
 * @param {import('@deepseek-ai/cordis').Context} ctx
 */
function loaderEntriesById(ctx) {
  /** @type {Map<string, { options?: Record<string, unknown> }>} */
  const map = new Map()
  for (const entry of ctx.loader.entries()) {
    const options = /** @type {Record<string, unknown> | undefined} */ (entry.options)
    if (options?.name === MCP_PLUGIN_NAME && typeof options.id === 'string') map.set(options.id, entry)
  }
  return map
}

/**
 * @param {unknown} value
 * @returns {Record<string, unknown> | null}
 */
function asObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? /** @type {Record<string, unknown>} */ (value)
    : null
}

/**
 * The add operation: validate, uniqueness-check, append the row, write.
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {Record<string, unknown> | null} body
 */
async function addServer(ctx, body) {
  const rawConfig = asObject(body?.config)
  if (rawConfig === null) throw httpError('invalid', '缺少 config 对象')
  if (isJsExpr(rawConfig.serverName) || isJsExpr(rawConfig.transport)) {
    throw httpError('invalid', '新增不支持 !!js 表达式值；表达式请手工加到补丁文件后用编辑维护其余字段')
  }
  const check = await validateMcpConfig(rawConfig)
  if (!check.ok) throw httpError('invalid', check.error)
  const serverName = String(rawConfig.serverName)
  if (!SERVER_NAME_RE.test(serverName)) throw httpError('invalid', 'serverName 必须匹配 [A-Za-z0-9_-]{1,32}')
  const id = `mcp-${serverName}`

  await exclusive(ctx, async () => {
    const doc = await readPatchDocument(ctx.profileContext.patchPath)
    const docRows = collectMcpRows(doc)
    const entryById = loaderEntriesById(ctx)
    if (docHasRowId(doc, id) || entryById.has(id)) {
      throw httpError('conflict', `id "${id}" 已存在`)
    }
    for (const name of occupiedServerNames(docRows, entryById)) {
      if (name === serverName) throw httpError('conflict', `serverName "${serverName}" 已被占用`)
    }
    appendServerRow(doc, { id, config: rawConfig })
    await atomicWritePatch(ctx.profileContext.patchPath, serializeVerified(doc))
  })
  return { id, applied: 'hot-reload' }
}

/**
 * The update operation: whole-config replacement of one profile row.
 * serverName is immutable here (its value prefixes every registered tool
 * name); changing it means remove + add.
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {Record<string, unknown> | null} body
 */
async function updateServer(ctx, body) {
  const id = typeof body?.id === 'string' ? body.id : ''
  if (id === '') throw httpError('invalid', '缺少 id')
  const rawConfig = asObject(body?.config)
  if (rawConfig === null) throw httpError('invalid', '缺少 config 对象')
  const structural = validateMcpConfigStructural(rawConfig)
  if (!structural.ok) throw httpError('invalid', structural.error)

  await exclusive(ctx, async () => {
    const doc = await readPatchDocument(ctx.profileContext.patchPath)
    const docRows = collectMcpRows(doc)
    const ref = docRows.find(row => row.id === id)
    if (ref === undefined) {
      if (loaderEntriesById(ctx).has(id)) {
        throw httpError('invalid', '该服务器来自 bundle 层，不能在此编辑')
      }
      throw httpError('not-found', `未找到 id "${id}"`)
    }
    const current = configViewOf(ref.row)
    const currentName = typeof current.serverName === 'string' && !isJsExpr(current.serverName) ? current.serverName : null
    if (currentName !== null && rawConfig.serverName !== currentName) {
      throw httpError('invalid', 'serverName 不可修改（决定工具名前缀 mcp__<serverName>__*）；如需改名请删除后新增')
    }
    // `!!js`-carrying configs skip the schemastery layer; the Loader remains
    // authoritative at reload.
    if (!JSON.stringify(rawConfig).includes('"__js"')) {
      const check = await validateMcpConfig(rawConfig)
      if (!check.ok) throw httpError('invalid', check.error)
    }
    setRowConfig(doc, ref, rawConfig)
    await atomicWritePatch(ctx.profileContext.patchPath, serializeVerified(doc))
  })
  return { id, applied: 'hot-reload' }
}

/**
 * The remove operation: delete the profile row; a bundle-layer id degrades to
 * a disabling override row (a patch layer cannot remove a bundle row).
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {Record<string, unknown> | null} body
 */
async function removeServer(ctx, body) {
  const id = typeof body?.id === 'string' ? body.id : ''
  if (id === '') throw httpError('invalid', '缺少 id')

  return exclusive(ctx, async () => {
    const doc = await readPatchDocument(ctx.profileContext.patchPath)
    const docRows = collectMcpRows(doc)
    const ref = docRows.find(row => row.id === id)
    if (ref !== undefined) {
      deleteRow(doc, ref)
      await atomicWritePatch(ctx.profileContext.patchPath, serializeVerified(doc))
      return { removed: true }
    }
    if (loaderEntriesById(ctx).has(id)) {
      upsertOverrideRow(doc, { id, name: MCP_PLUGIN_NAME, disabled: true })
      await atomicWritePatch(ctx.profileContext.patchPath, serializeVerified(doc))
      return { removed: false, disabled: true, note: '该行来自 bundle 层，无法移除；已写入禁用覆盖行' }
    }
    throw httpError('not-found', `未找到 id "${id}"`)
  })
}

/**
 * The enable/disable operation on one row's `disabled` flag; bundle-layer ids
 * go through an override row.
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {Record<string, unknown> | null} body
 */
async function setServerEnabled(ctx, body) {
  const id = typeof body?.id === 'string' ? body.id : ''
  if (id === '') throw httpError('invalid', '缺少 id')
  if (typeof body?.enabled !== 'boolean') throw httpError('invalid', 'enabled 必须是布尔值')
  const enabled = body.enabled

  return exclusive(ctx, async () => {
    const doc = await readPatchDocument(ctx.profileContext.patchPath)
    const docRows = collectMcpRows(doc)
    const ref = docRows.find(row => row.id === id)
    if (ref !== undefined) {
      setRowEnabled(ref, enabled)
      await atomicWritePatch(ctx.profileContext.patchPath, serializeVerified(doc))
      return { id, enabled }
    }
    if (loaderEntriesById(ctx).has(id)) {
      upsertOverrideRow(doc, { id, name: MCP_PLUGIN_NAME, disabled: !enabled })
      await atomicWritePatch(ctx.profileContext.patchPath, serializeVerified(doc))
      return { id, enabled, overridden: true, note: '该行来自 bundle 层；已写入覆盖行' }
    }
    throw httpError('not-found', `未找到 id "${id}"`)
  })
}

/**
 * Dispatch one route by its path suffix.
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {string} route
 * @param {Record<string, unknown> | null} body
 */
async function dispatch(ctx, route, body) {
  switch (route) {
    case 'list': return listServers(ctx)
    case 'add': return addServer(ctx, body)
    case 'update': return updateServer(ctx, body)
    case 'remove': return removeServer(ctx, body)
    case 'set-enabled': return setServerEnabled(ctx, body)
    default: throw httpError('not-found', `未知路由 "${route}"`)
  }
}

/**
 * Register the /mcp-manager routes on the shared webserver.
 * @param {import('@deepseek-ai/cordis').Context} ctx Context carrying webServer, loader, and profileContext.
 * @returns {() => void} Route disposer.
 */
export function registerMcpRoutes(ctx) {
  const handler = async (/** @type {IncomingMessage} */ req, /** @type {ServerResponse} */ res) => {
    if (!isLoopbackRequest(req)) {
      writeJson(res, 403, { ok: false, error: { code: 'forbidden', message: 'forbidden: loopback-only' } })
      return
    }
    let route = ''
    try {
      const url = new URL(req.url ?? '/', 'http://localhost')
      route = url.pathname.replace(/^\/mcp-manager\/?/, '').replace(/\/$/, '')
    } catch {
      route = ''
    }
    if (req.method !== 'POST') {
      writeJson(res, 405, { ok: false, error: { code: 'invalid', message: '仅支持 POST' } })
      return
    }
    const body = await readJsonObjectBody(req)
    try {
      const value = await dispatch(ctx, route, body)
      writeJson(res, 200, { ok: true, value })
    } catch (error) {
      const code = /** @type {string} */ (/** @type {any} */ (error)?.code ?? 'internal')
      const status = code === 'not-found' ? 404 : code === 'forbidden' ? 403 : 200
      writeJson(res, status, { ok: false, error: { code, message: String(/** @type {any} */ (error)?.message ?? error) } })
    }
  }
  return ctx.webServer.register({ kind: 'prefix', path: '/mcp-manager', handler })
}
