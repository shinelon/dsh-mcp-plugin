/**
 * Round-trip tests for the patch editor against a sanitized fixture shaped
 * like a real hand-written profile patch (comments, `!!js` expressions, a
 * commented-out row, non-MCP rows after the MCP block).
 *
 * Every mutation is asserted on three axes: the intended change landed, the
 * untouched `!!js` expressions survived byte-for-byte, and the untouched
 * comments/rows survived. Run: node test/patch-editor.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  readPatchDocument, parsePatchText, collectMcpRows, docHasRowId, configViewOf,
  appendServerRow, setRowConfig, setRowEnabled, deleteRow, upsertOverrideRow,
  serializeVerified, atomicWritePatch, MCP_PLUGIN_NAME,
} from '../src/host/patch-editor.js'
import { validateMcpConfigStructural, SERVER_NAME_RE } from '../src/host/mcp-config.js'

const FIXTURE = new URL('./fixture.patch.yml', import.meta.url)
const AUTH_EXPR = '`Bearer ${process.env.ZHIPU_API_KEY}`'
const HEADER_LINE = `Authorization: !!js "${AUTH_EXPR}"`

/** @returns {Promise<{ dir: string, path: string, original: string }>} */
async function makeSandbox() {
  const dir = await mkdtemp(join(tmpdir(), 'mcpmgr-test-'))
  const { readFileSync, copyFileSync } = await import('node:fs')
  const path = join(dir, 'cordis.patch.yml')
  copyFileSync(FIXTURE, path)
  const original = readFileSync(FIXTURE, 'utf8')
  return { dir, path, original }
}

const preserved = (text) => {
  assert.ok(text.includes(HEADER_LINE), '!!js header expression must survive byte-for-byte')
  assert.ok(text.includes('# web-search-prime — remote, 智谱'), 'row comments must survive')
  assert.ok(text.includes('#   name: \'@deepseek-ai/dsh-mcp-client\''), 'the commented-out row must survive')
  assert.ok(text.includes('# ── MCP servers'), 'section banner comments must survive')
  assert.ok(text.includes('id: mcp-web-search-prime'), 'existing rows must survive')
  assert.ok(text.includes('id: ui-settings-general'), 'non-MCP rows must survive')
  assert.ok(text.includes('apiKeyEnv: ZAI_CODING_CN_API_KEY'), 'non-MCP config must survive')
}

test('collect finds exactly the three live MCP rows with their ids', async () => {
  const doc = parsePatchText(await readFile(FIXTURE, 'utf8'))
  const rows = collectMcpRows(doc)
  assert.deepEqual(rows.map(row => row.id), ['mcp-web-search-prime', 'mcp-web-reader', 'mcp-codegraph'])
  assert.ok(rows.every(row => row.insertIndex !== undefined), 'fixture rows are insert-listed')
})

test('configViewOf preserves plain values and marks !!js expressions', async () => {
  const doc = parsePatchText(await readFile(FIXTURE, 'utf8'))
  const [search, , codegraph] = collectMcpRows(doc)
  const searchView = configViewOf(search.row)
  assert.equal(searchView.serverName, 'web-search-prime')
  assert.equal(searchView.transport, 'streamable-http')
  const headers = /** @type {{ headers: { Authorization: unknown } }} */ (searchView).headers
  assert.deepEqual(headers.Authorization, { __js: AUTH_EXPR })

  const codeView = configViewOf(codegraph.row)
  assert.deepEqual(codeView.args, ['serve', '--mcp'])
  assert.equal(codeView.command, 'codegraph')
})

test('add appends a row into the insert list without disturbing the rest', async () => {
  const { path, original } = await makeSandbox()
  const doc = await readPatchDocument(path)
  appendServerRow(doc, {
    id: 'mcp-everything',
    config: { serverName: 'everything', transport: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-everything'] },
  })
  const text = serializeVerified(doc)
  assert.ok(text.includes('id: mcp-everything'), 'the new row must be present')
  assert.ok(text.includes('server-everything'), 'the new config must be present')
  assert.equal(collectMcpRows(parsePatchText(text)).length, 4, 'four live rows after add')
  assert.ok(text.length > original.length, 'add only grows the document')
  // Untouched regions: everything the original had (modulo the appended lines)
  for (const line of original.split('\n')) {
    if (line.trim() === '') continue
    assert.ok(text.includes(line), `untouched line must survive verbatim: ${JSON.stringify(line)}`)
  }
  await rm(path, { force: true })
})

test('update replaces config wholesale and keeps !!js markers passed through', async () => {
  const { path } = await makeSandbox()
  const doc = await readPatchDocument(path)
  const [search] = collectMcpRows(doc)
  const view = configViewOf(search.row)
  // The UI sends the raw view back: the untouched expression keeps its marker.
  const next = { ...view, toolCallTimeoutMs: 30000 }
  setRowConfig(doc, search, next)
  const text = serializeVerified(doc)
  assert.ok(text.includes('toolCallTimeoutMs: 30000'), 'the updated field must land')
  assert.ok(text.includes(HEADER_LINE), 'the pass-through !!js header must be re-emitted')
  const after = collectMcpRows(parsePatchText(text))
  assert.equal(after.length, 3, 'row count unchanged')
  const reloaded = configViewOf(after[0].row)
  assert.deepEqual(reloaded.headers, { Authorization: { __js: AUTH_EXPR } })
  assert.equal(reloaded.toolCallTimeoutMs, 30000)
  await rm(path, { force: true })
})

test('disable / enable toggles the disabled flag on the row', async () => {
  const { path } = await makeSandbox()
  const doc = await readPatchDocument(path)
  const [, reader] = collectMcpRows(doc)
  setRowEnabled(reader, false)
  let text = serializeVerified(doc)
  assert.ok(/id: mcp-web-reader[\s\S]*?disabled: true/.test(text), 'disabled: true lands under the row')
  const disabledRows = collectMcpRows(parsePatchText(text))
  assert.equal(disabledRows[1].row.get('disabled'), true)

  setRowEnabled(collectMcpRows(doc)[1], true)
  text = serializeVerified(doc)
  assert.ok(!/disabled: true/.test(text), 'disabled flag removed on enable')
  preserved(text)
  await rm(path, { force: true })
})

test('remove deletes exactly one row; emptying the insert removes the container', async () => {
  const { path } = await makeSandbox()
  const doc = await readPatchDocument(path)
  const rows = collectMcpRows(doc)
  deleteRow(doc, rows[2]) // codegraph
  let text = serializeVerified(doc)
  assert.ok(!text.includes('id: mcp-codegraph'), 'removed row is gone')
  assert.ok(text.includes('id: mcp-web-reader'), 'sibling rows stay')
  preserved(text)

  const rest = collectMcpRows(parsePatchText(text))
  // Reverse order keeps earlier indices valid while the document shrinks.
  for (const row of [...rest].reverse()) deleteRow(doc, row)
  text = serializeVerified(doc)
  assert.ok(!text.includes('insert'), 'emptied insert container is removed')
  assert.ok(text.includes('id: ui-settings-general'), 'non-MCP top-level rows stay')
  await rm(path, { force: true })
})

test('fresh document without inserts gains one; override rows work for bundle ids', async () => {
  const doc = parsePatchText('[]\n')
  appendServerRow(doc, { id: 'mcp-solo', config: { serverName: 'solo', transport: 'stdio', command: 'demo' } })
  let text = serializeVerified(doc)
  assert.ok(text.includes('- insert:'), 'a fresh document gains an insert item')
  assert.ok(text.includes('id: mcp-solo'), 'the row lands')
  assert.ok(!docHasRowId(doc, 'mcp-other'), 'unknown ids are absent')
  assert.ok(docHasRowId(doc, 'mcp-solo'), 'known ids resolve')

  upsertOverrideRow(doc, { id: 'mcp-bundle-one', name: MCP_PLUGIN_NAME, disabled: true })
  text = serializeVerified(doc)
  assert.ok(/id: mcp-bundle-one[\s\S]*?disabled: true/.test(text), 'bundle override row written')
  upsertOverrideRow(doc, { id: 'mcp-bundle-one', name: MCP_PLUGIN_NAME, disabled: false })
  text = serializeVerified(doc)
  assert.ok(!/disabled: true/.test(text), 'override row updated in place, not duplicated')
  assert.equal(text.match(/id: mcp-bundle-one/g)?.length, 1, 'exactly one override row')
  await rm('does-not-exist', { force: true }).catch(() => {})
})

test('malformed patch text throws instead of writing', () => {
  assert.throws(() => parsePatchText('- insert: [unclosed\n\tbad: :::'), /解析失败/)
  assert.throws(() => parsePatchText('just: a: map'), /解析失败|序列/)
})

test('atomicWritePatch writes, backs up once, and round-trips', async () => {
  const { path } = await makeSandbox()
  const doc = await readPatchDocument(path)
  const text = serializeVerified(doc)
  await atomicWritePatch(path, text)
  await atomicWritePatch(path, text + '\n# touch\n')
  const written = await readFile(path, 'utf8')
  assert.ok(written.startsWith(text), 'content written')
  assert.ok(written.includes('# touch'), 'second write applied')
  const backup = await readFile(path + '.bak-mcpmgr', 'utf8')
  assert.equal(backup, await readFile(FIXTURE, 'utf8'), 'backup keeps the pristine original')
  await rm(path + '.bak-mcpmgr', { force: true })
  await rm(path, { force: true })
})

test('serialization is stable for untouched documents (no churn on no-op)', async () => {
  const original = await readFile(FIXTURE, 'utf8')
  const once = serializeVerified(parsePatchText(original))
  const twice = serializeVerified(parsePatchText(once))
  assert.equal(twice, once, 'a parsed-and-reserialized document is stable')
  // Formatting is allowed to normalize once, but comments must survive even then.
  preserved(once)
})

test('structural config validation', async () => {
  assert.equal(SERVER_NAME_RE.test('web-search-prime'), true)
  assert.equal(SERVER_NAME_RE.test('bad name!'), false)
  assert.equal(SERVER_NAME_RE.test('x'.repeat(33)), false)

  const ok = { transport: 'stdio', serverName: 'demo', command: 'demo' }
  assert.equal(validateMcpConfigStructural(ok).ok, true)

  assert.equal(validateMcpConfigStructural({ ...ok, serverName: 'bad name' }).ok, false)
  assert.equal(validateMcpConfigStructural({ ...ok, transport: 'carrier-pigeon' }).ok, false)
  assert.equal(validateMcpConfigStructural({ ...ok, unknownField: 1 }).ok, false)
  assert.equal(validateMcpConfigStructural({ transport: 'streamable-http', serverName: 'r', url: 'notaurl' }).ok, false)
  assert.equal(validateMcpConfigStructural({ transport: 'stdio', serverName: 'r', command: '', args: 'x' }).ok, false)
  assert.equal(validateMcpConfigStructural({ ...ok, reconnect: { maxAttempts: -1 } }).ok, false)

  // A `!!js` marker skips the type check of its field.
  const withExpr = { ...ok, env: { TOKEN: { __js: 'process.env.TOKEN' } } }
  assert.equal(validateMcpConfigStructural(withExpr).ok, true)

  const httpOk = { transport: 'streamable-http', serverName: 'r', url: 'https://example.com/mcp', headers: { Authorization: { __js: 'Bearer x' } } }
  assert.equal(validateMcpConfigStructural(httpOk).ok, true)
})
