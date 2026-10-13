/**
 * Profile patch document editor for MCP server rows.
 *
 * The user's `cordis.patch.yml` is hand-written (comments, `!!js` expressions,
 * flow-style arg lists), so every mutation is a surgical CST edit through the
 * `yaml` package's Document API — untouched nodes keep their comments and
 * formatting — followed by a re-parse verification and an atomic
 * temp-file + rename write. The approach mirrors the Host's own ConfigEditor
 * service (including the `tag:yaml.org,2002:js` custom-tag handling).
 *
 * Row model: MCP servers are rows whose `name` is `@deepseek-ai/dsh-mcp-client`.
 * They may live inside a top-level `- insert:` list (profile-authored rows) or
 * come from a bundle layer (invisible here; such ids can only be overridden or
 * disabled through a top-level direct row).
 *
 * @module @local/mcp-manager/host/patch-editor
 */

import { readFile, writeFile, rename, copyFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { randomBytes } from 'node:crypto'
import { parseDocument, Scalar, isMap, isSeq, isScalar } from 'yaml'

/** The plugin identity every MCP server row carries. */
export const MCP_PLUGIN_NAME = '@deepseek-ai/dsh-mcp-client'

const JS_TAG = 'tag:yaml.org,2002:js'
const CUSTOM_TAGS = [{ tag: JS_TAG, resolve: value => value }]

/**
 * Read the patch file (missing file reads as an empty document, matching the
 * Host's ConfigEditor) and parse it into a yaml Document.
 * @param {string} patchPath
 * @returns {Promise<import('yaml').Document>}
 */
export async function readPatchDocument(patchPath) {
  let text
  try {
    text = await readFile(patchPath, 'utf8')
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') text = '[]\n'
    else throw error
  }
  return parsePatchText(text)
}

/**
 * Parse patch text into a yaml Document, throwing a readable error when the
 * document is not a usable patch sequence.
 * @param {string} text
 * @returns {import('yaml').Document}
 */
export function parsePatchText(text) {
  const doc = parseDocument(text, { customTags: CUSTOM_TAGS })
  if (doc.errors.length > 0) {
    throw new Error(`补丁 YAML 解析失败: ${String(doc.errors[0])}`)
  }
  if (!isSeq(doc.contents)) {
    throw new Error('补丁文件顶层必须是 YAML 序列（行列表）')
  }
  return doc
}

/**
 * One located MCP row.
 * @typedef {object} McpRowRef
 * @property {string | undefined} id
 * @property {import('yaml').YAMLMap} row The row node.
 * @property {number} topIndex Index of the top-level sequence item.
 * @property {number | undefined} insertIndex Row index inside the `insert` sequence (undefined for a direct top-level row).
 */

/**
 * Enumerate every MCP row in the document (both insert-listed and direct).
 * @param {import('yaml').Document} doc
 * @returns {McpRowRef[]}
 */
export function collectMcpRows(doc) {
  /** @type {McpRowRef[]} */
  const rows = []
  if (!isSeq(doc.contents)) return rows
  doc.contents.items.forEach((item, topIndex) => {
    if (!isMap(item)) return
    const insert = item.get('insert')
    if (insert !== undefined && isSeq(insert)) {
      insert.items.forEach((row, insertIndex) => {
        if (isMap(row) && row.get('name') === MCP_PLUGIN_NAME) {
          rows.push({ id: asString(row.get('id')), row, topIndex, insertIndex })
        }
      })
      return
    }
    if (item.get('name') === MCP_PLUGIN_NAME) {
      rows.push({ id: asString(item.get('id')), row: item, topIndex, insertIndex: undefined })
    }
  })
  return rows
}

/**
 * Any row (of any plugin) in the document with this id — the collision guard
 * for add and for the remove→disable fallback.
 * @param {import('yaml').Document} doc
 * @param {string} id
 * @returns {boolean}
 */
export function docHasRowId(doc, id) {
  if (!isSeq(doc.contents)) return false
  return doc.contents.items.some((item, topIndex) => {
    if (!isMap(item)) return false
    if (asString(item.get('id')) === id) return true
    const insert = item.get('insert')
    return insert !== undefined && isSeq(insert)
      && insert.items.some(row => isMap(row) && asString(row.get('id')) === id)
  })
}

/**
 * Convert a node value to a plain string when it is one.
 * @param {unknown} value
 * @returns {string | undefined}
 */
function asString(value) {
  return typeof value === 'string' ? value : undefined
}

/**
 * Project a row's `config` into a plain JSON view (see {@link toView}).
 * @param {import('yaml').YAMLMap} row
 * @returns {Record<string, unknown>}
 */
export function configViewOf(row) {
  const view = toView(row.get('config'))
  return isPlainObject(view) ? view : {}
}

/**
 * Project a node into a plain JSON view, preserving `!!js` expression scalars
 * as `{ __js: "<source>" }` markers. Parsed documents keep scalars as Scalar
 * node instances, so both scalars and pair keys are unwrapped here.
 * @param {unknown} node
 * @returns {unknown}
 */
function toView(node) {
  if (node === undefined || node === null) return undefined
  if (typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') return node
  if (isScalar(node)) {
    if (node.tag === JS_TAG) return { __js: String(node.value ?? '') }
    return node.value
  }
  if (isSeq(node)) return node.items.map(item => toView(item))
  if (isMap(node)) {
    /** @type {Record<string, unknown>} */
    const out = {}
    for (const pair of node.items) {
      const key = typeof pair.key === 'string' ? pair.key : isScalar(pair.key) ? asString(pair.key.value) : undefined
      if (key !== undefined) out[key] = toView(pair.value)
    }
    return out
  }
  return undefined
}

/**
 * Build a config node from a plain value, turning `{ __js }` markers back
 * into `!!js` expression scalars (the same reconstruction the Host's
 * ConfigEditor performs for round-tripped expressions).
 * @param {import('yaml').Document} doc
 * @param {unknown} value
 * @returns {unknown}
 */
function toNode(doc, value) {
  if (isPlainObject(value) && typeof value.__js === 'string' && Object.keys(value).length === 1) {
    const scalar = new Scalar(value.__js)
    scalar.tag = JS_TAG
    return scalar
  }
  if (Array.isArray(value)) {
    const seq = doc.createNode([])
    for (const item of value) seq.add(toNode(doc, item))
    return seq
  }
  if (isPlainObject(value)) {
    const map = doc.createNode({})
    for (const [key, item] of Object.entries(value)) map.set(key, toNode(doc, item))
    return map
  }
  return doc.createNode(value ?? null)
}

/**
 * Append one `{ id, name, config }` row. Target: the insert list that already
 * holds the first MCP row (keeps servers grouped where the user keeps them);
 * failing that, the last insert list; failing that, a fresh top-level
 * `- insert:` item.
 * @param {import('yaml').Document} doc
 * @param {{ id: string, config: unknown }} server
 */
export function appendServerRow(doc, server) {
  const rows = collectMcpRows(doc)
  /** @type {import('yaml').YAMLSeq | undefined} */
  let target
  if (rows.length > 0 && rows[0].insertIndex !== undefined && isSeq(doc.contents)) {
    const container = doc.contents.items[rows[0].topIndex]
    if (isMap(container)) {
      const insert = container.get('insert')
      if (isSeq(insert)) target = insert
    }
  }
  if (target === undefined && isSeq(doc.contents)) {
    for (let i = doc.contents.items.length - 1; i >= 0; i--) {
      const item = doc.contents.items[i]
      if (isMap(item) && isSeq(item.get('insert'))) {
        target = /** @type {import('yaml').YAMLSeq} */ (item.get('insert'))
        break
      }
    }
  }
  const row = doc.createNode({})
  row.set('id', server.id)
  row.set('name', MCP_PLUGIN_NAME)
  row.set('config', toNode(doc, server.config))
  if (target !== undefined) {
    target.add(row)
    return
  }
  const insertItem = doc.createNode({})
  insertItem.set('insert', doc.createNode([row]))
  if (!isSeq(doc.contents)) throw new Error('补丁文件顶层必须是 YAML 序列')
  doc.contents.add(insertItem)
}

/**
 * Replace an MCP row's whole `config` (id/name/disabled keys untouched).
 * @param {McpRowRef} ref
 * @param {unknown} config
 */
export function setRowConfig(doc, ref, config) {
  ref.row.set('config', toNode(doc, config))
}

/**
 * Toggle the row's `disabled` flag.
 * @param {McpRowRef} ref
 * @param {boolean} enabled
 */
export function setRowEnabled(ref, enabled) {
  if (enabled) ref.row.delete('disabled')
  else ref.row.set('disabled', true)
}

/**
 * Delete an MCP row from the document. An emptied `- insert:` list is removed
 * with its container so no `insert: []` stub remains.
 * @param {import('yaml').Document} doc
 * @param {McpRowRef} ref
 */
export function deleteRow(doc, ref) {
  if (!isSeq(doc.contents)) throw new Error('补丁文件顶层必须是 YAML 序列')
  if (ref.insertIndex !== undefined) {
    doc.deleteIn([ref.topIndex, 'insert', ref.insertIndex])
    const container = isSeq(doc.contents) ? doc.contents.items[ref.topIndex] : undefined
    if (isMap(container) && isSeq(container.get('insert')) && /** @type {import('yaml').YAMLSeq} */ (container.get('insert')).items.length === 0) {
      doc.deleteIn([ref.topIndex])
    }
    return
  }
  doc.deleteIn([ref.topIndex])
}

/**
 * Write a top-level direct row overriding a bundle-layer id (last write
 * wins per id). Existing direct rows with the id merge the patch keys.
 * @param {import('yaml').Document} doc
 * @param {{ id: string, name?: string, disabled?: boolean, config?: unknown }} patch
 */
export function upsertOverrideRow(doc, patch) {
  if (!isSeq(doc.contents)) throw new Error('补丁文件顶层必须是 YAML 序列')
  const existing = doc.contents.items.find(item => isMap(item) && asString(item.get('id')) === patch.id && item.get('insert') === undefined)
  if (isMap(existing)) {
    if (patch.disabled !== undefined) existing.set('disabled', patch.disabled)
    if (patch.config !== undefined) existing.set('config', toNode(doc, patch.config))
    return
  }
  const row = doc.createNode({})
  row.set('id', patch.id)
  if (patch.name !== undefined) row.set('name', patch.name)
  if (patch.disabled !== undefined) row.set('disabled', patch.disabled)
  if (patch.config !== undefined) row.set('config', toNode(doc, patch.config))
  doc.contents.add(row)
}

/**
 * Serialize, re-parse to verify, and return the patch text. The top-level
 * sequence is forced to block style so a fresh `[]` document grows readable
 * rows (the same normalization the Host's ConfigEditor applies).
 * @param {import('yaml').Document} doc
 * @returns {string}
 */
export function serializeVerified(doc) {
  if (isSeq(doc.contents)) doc.contents.flow = false
  // Unlimited line width: long `!!js` URLs must not fold mid-token, which
  // makes hand-editing the patch awkward.
  const text = doc.toString({ lineWidth: 0 })
  const check = parsePatchText(text)
  return check.toString({ lineWidth: 0 })
}

/** Paths already backed up in this process (one backup per process, not per write). */
const backedUp = new Set()

/**
 * Atomically write the patch text: one `.bak-mcpmgr` backup before the first
 * write per process, then temp file + rename in the same directory.
 * @param {string} patchPath
 * @param {string} text
 */
export async function atomicWritePatch(patchPath, text) {
  if (!backedUp.has(patchPath)) {
    try {
      await copyFile(patchPath, patchPath + '.bak-mcpmgr')
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error
    }
    backedUp.add(patchPath)
  }
  const tmp = `${patchPath}.tmp-${randomBytes(6).toString('hex')}`
  await mkdir(dirname(patchPath), { recursive: true })
  await writeFile(tmp, text, 'utf8')
  await rename(tmp, patchPath)
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
