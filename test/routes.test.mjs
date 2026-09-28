/**
 * Route-layer integration tests: a mock cordis context captures the route
 * handler from webServer.register and exercises every operation end-to-end —
 * envelope shape, validation rejects, uniqueness conflicts, disable/enable,
 * bundle-row fallbacks, and HMR serialization. Run: node --test test/routes.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile, mkdtemp, rm, copyFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { registerMcpRoutes } from '../src/host/routes.js'

const FIXTURE = join(dirname(fileURLToPath(import.meta.url)), 'fixture.patch.yml')

/**
 * Minimal mock of the cordis context face the routes touch.
 * @returns {Promise<{ ctx: any, patchPath: string, calls: string[], request(route: string, body?: unknown): Promise<{ status: number, body: any }> }>}
 */
async function makeContext({ extraEntries = [] } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'mcpmgr-routes-'))
  const patchPath = join(dir, 'cordis.patch.yml')
  await copyFile(FIXTURE, patchPath)
  /** @type {any} */
  let registeredHandler
  const calls = []
  const entries = [
    { options: { id: 'mcp-web-search-prime', name: '@deepseek-ai/dsh-mcp-client', config: { serverName: 'web-search-prime', transport: 'streamable-http', url: 'https://x' } }, fiber: { state: 2 } },
    { options: { id: 'mcp-codegraph', name: '@deepseek-ai/dsh-mcp-client', config: { serverName: 'codegraph', transport: 'stdio', command: 'codegraph' } }, fiber: { state: 3, error: new Error('connect ECONNREFUSED') } },
    { options: { id: 'unrelated', name: '@deepseek-ai/dsh-other' }, fiber: { state: 2 } },
    ...extraEntries,
  ]
  const ctx = {
    profileContext: { patchPath },
    loader: { entries: () => entries },
    get(name) {
      if (name !== 'hmr') return undefined
      return {
        /** @param fn: () => Promise<T> */
        async runExclusive(fn) {
          calls.push('exclusive')
          return fn()
        },
      }
    },
    webServer: { register(route) { registeredHandler = route.handler; return () => {} } },
    effect(fn) { fn() },
  }
  registerMcpRoutes(ctx)
  const request = async (route, body = {}) => {
    let status = 0
    /** @type {any} */
    let payload
    const res = {
      writeHead(code, headers) { status = code },
      end(text) { payload = JSON.parse(text) },
    }
    const bodyBytes = Buffer.from(JSON.stringify(body))
    const req = {
      method: 'POST',
      url: `/mcp-manager/${route}`,
      socket: { remoteAddress: '127.0.0.1' },
      headers: { host: 'localhost:1234' },
      // The route reads the body with `for await` — supply one chunk.
      async *[Symbol.asyncIterator]() { yield bodyBytes },
    }
    await registeredHandler(req, res)
    return { status, body: payload }
  }
  return { ctx, patchPath, calls, request }
}

test('list joins document rows with fiber status and errors', async () => {
  const { request } = await makeContext()
  const { status, body } = await request('list')
  assert.equal(status, 200)
  assert.equal(body.ok, true)
  const servers = body.value.servers
  assert.equal(servers.length, 3)
  const search = servers.find(server => server.id === 'mcp-web-search-prime')
  assert.equal(search.status, 'active')
  assert.equal(search.source, 'profile')
  assert.equal(search.hasJsExpr, true)
  const codegraph = servers.find(server => server.id === 'mcp-codegraph')
  assert.equal(codegraph.status, 'failed')
  assert.ok(codegraph.errorText.includes('ECONNREFUSED'), 'fiber error surfaces')
  const reader = servers.find(server => server.id === 'mcp-web-reader')
  // The mock gives web-reader no loader entry: document truth only → pending.
  assert.equal(reader.status, 'pending')
})

test('add → list → update → disable → enable → remove lifecycle', async () => {
  const { request, patchPath, calls } = await makeContext()

  const bad = await request('add', { config: { transport: 'stdio', serverName: 'bad name!', command: 'x' } })
  assert.equal(bad.body.ok, false)
  assert.equal(bad.body.error.code, 'invalid')

  const added = await request('add', {
    config: { transport: 'stdio', serverName: 'everything', command: 'npx', args: ['-y', '@modelcontextprotocol/server-everything'] },
  })
  assert.equal(added.body.ok, true, `add failed: ${JSON.stringify(added.body)}`)
  assert.equal(added.body.value.id, 'mcp-everything')
  assert.ok(calls.includes('exclusive'), 'writes serialize through hmr.runExclusive')

  const dup = await request('add', { config: { transport: 'stdio', serverName: 'everything', command: 'npx' } })
  assert.equal(dup.body.error.code, 'conflict')
  const dupName = await request('add', { config: { transport: 'stdio', serverName: 'codegraph', command: 'x' } })
  assert.equal(dupName.body.error.code, 'conflict', 'serverName uniqueness spans doc rows')

  const listed = await request('list')
  const addedRow = listed.body.value.servers.find(server => server.id === 'mcp-everything')
  assert.equal(addedRow.status, 'pending', 'not yet in loader entries → pending')
  assert.ok(addedRow.target.includes('npx'))

  const updated = await request('update', {
    id: 'mcp-everything',
    config: { transport: 'stdio', serverName: 'everything', command: 'node', args: ['server.js'] },
  })
  assert.equal(updated.body.ok, true, `update failed: ${JSON.stringify(updated.body)}`)
  const renamed = await request('update', {
    id: 'mcp-everything',
    config: { transport: 'stdio', serverName: 'other', command: 'node' },
  })
  assert.equal(renamed.body.error.code, 'invalid', 'serverName is immutable in update')

  const disabled = await request('set-enabled', { id: 'mcp-everything', enabled: false })
  assert.equal(disabled.body.ok, true)
  let text = await readFile(patchPath, 'utf8')
  assert.ok(/id: mcp-everything[\s\S]*?disabled: true/.test(text))
  const enabled = await request('set-enabled', { id: 'mcp-everything', enabled: true })
  assert.equal(enabled.body.ok, true)
  text = await readFile(patchPath, 'utf8')
  assert.ok(!text.includes('disabled: true'))

  const removed = await request('remove', { id: 'mcp-everything' })
  assert.equal(removed.body.value.removed, true)
  text = await readFile(patchPath, 'utf8')
  assert.ok(!text.includes('mcp-everything'))

  const missing = await request('remove', { id: 'mcp-everything' })
  assert.equal(missing.body.error.code, 'not-found')
})

test('expression-bearing update passes through and skips schema; bundle rows degrade', async () => {
  // mcp-ghost-bundle has a live loader entry but no document row: bundle-layer.
  const { request, patchPath } = await makeContext({
    extraEntries: [{ options: { id: 'mcp-ghost-bundle', name: '@deepseek-ai/dsh-mcp-client', config: {} }, fiber: { state: 2 } }],
  })
  const list = await request('list')
  const search = list.body.value.servers.find(server => server.id === 'mcp-web-search-prime')
  // Round-trip the raw view with one plain field changed.
  const next = { ...search.config, toolCallTimeoutMs: 45000 }
  const updated = await request('update', { id: 'mcp-web-search-prime', config: next })
  assert.equal(updated.body.ok, true, `update failed: ${JSON.stringify(updated.body)}`)
  const text = await readFile(patchPath, 'utf8')
  assert.ok(text.includes('toolCallTimeoutMs: 45000'))
  assert.ok(text.includes('`Bearer ${process.env.ZHIPU_API_KEY}`'), 'expression preserved')

  // A loader entry with no document row behaves as a bundle row.
  const bundleDisable = await request('set-enabled', { id: 'mcp-ghost-bundle', enabled: false })
  assert.equal(bundleDisable.body.ok, true)
  assert.equal(bundleDisable.body.value.overridden, true)
  const ghost = await request('list')
  // ghost has no entry either (mock has no such entry) — it was an override row for an entry id
  const ghostRow = ghost.body.value.servers.find(server => server.id === 'mcp-ghost-bundle')
  assert.ok(ghostRow, 'override row appears in the list')
  assert.equal(ghostRow.enabled, false)
  const after = await readFile(patchPath, 'utf8')
  assert.ok(after.includes('id: mcp-ghost-bundle'))
})

test('loopback fence rejects non-loopback requests before anything else', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mcpmgr-fence-'))
  const patchPath = join(dir, 'cordis.patch.yml')
  await copyFile(FIXTURE, patchPath)
  /** @type {(req: any, res: any) => Promise<void>} */
  let handler
  const ctx = {
    profileContext: { patchPath },
    loader: { entries: () => [] },
    get: () => undefined,
    webServer: { register(route) { handler = route.handler; return () => {} } },
    effect(fn) { fn() },
  }
  registerMcpRoutes(ctx)
  let status = 0
  /** @type {any} */
  let payload
  const res = {
    writeHead(code) { status = code },
    end(text) { payload = JSON.parse(text) },
  }
  await handler(
    {
      method: 'POST',
      url: '/mcp-manager/list',
      socket: { remoteAddress: '192.168.1.5' },
      headers: { host: 'localhost:1234' },
    },
    res)
  assert.equal(status, 403)
  assert.equal(payload.ok, false)
  assert.equal(payload.error.code, 'forbidden')
  await rm(patchPath, { force: true })
  await rm(dir, { recursive: true, force: true })
})
