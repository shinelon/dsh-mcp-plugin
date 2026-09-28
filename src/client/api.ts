/**
 * Browser client for the host /mcp-manager/* routes: typed JSON envelope
 * calls over same-origin relative fetch (document-relative paths — the GUI
 * serves with `<base href="./">`, so a leading slash would escape the
 * deployment prefix).
 * @module dsh-mcp-manager/client/api
 */

/** Stable machine-readable error, mirroring the host envelope. */
export interface McpError {
  code: 'internal' | 'invalid' | 'not-found' | 'conflict' | 'forbidden' | 'unavailable'
  message: string
}

/** A `!!js` expression value preserved verbatim from the patch document. */
export interface JsExpr {
  __js: string
}

export function isJsExpr(value: unknown): value is JsExpr {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    && typeof (value as JsExpr).__js === 'string'
    && Object.keys(value as JsExpr).length === 1
}

/** Plain literal or a preserved `!!js` expression marker. */
export type StringOrExpr = string | JsExpr

/** Raw MCP server config as stored in the patch row (JsExpr values preserved). */
export interface McpServerConfig {
  transport: 'stdio' | 'streamable-http'
  serverName: string
  command?: string
  args?: StringOrExpr[]
  env?: Record<string, StringOrExpr>
  cwd?: string
  url?: string
  headers?: Record<string, StringOrExpr>
  toolCallTimeoutMs?: number
  failOnStartupError?: boolean
  maxInstructionBytes?: number
  reconnect?: { enabled?: boolean; initialDelayMs?: number; maxDelayMs?: number; maxAttempts?: number }
  [key: string]: unknown
}

/** One list row: document-truth config joined with live loader status. */
export interface McpServerView {
  id: string
  serverName: string
  transport: 'stdio' | 'streamable-http'
  target: string
  enabled: boolean
  status: 'active' | 'loading' | 'pending' | 'failed' | 'disabled'
  errorText: string
  source: 'profile' | 'bundle'
  hasJsExpr: boolean
  config: McpServerConfig
}

export interface ListResult {
  servers: McpServerView[]
}

/** One /mcp-manager envelope response. */
export type ApiResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: McpError }

const TRANSPORT_ERROR: McpError = { code: 'unavailable', message: 'mcp-manager route unavailable' }

/**
 * POST one JSON payload and decode the envelope; never throws.
 * @param path - DOCUMENT-RELATIVE (no leading slash).
 */
async function post<T>(path: string, payload: Record<string, unknown>): Promise<ApiResult<T>> {
  let response: Response
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    return { ok: false, error: TRANSPORT_ERROR }
  }
  try {
    const envelope = await response.json() as unknown
    if (typeof envelope !== 'object' || envelope === null) return { ok: false, error: TRANSPORT_ERROR }
    const record = envelope as Record<string, unknown>
    if (record.ok === true) return { ok: true, value: record.value as T }
    const error = record.error as McpError | undefined
    return { ok: false, error: error ?? TRANSPORT_ERROR }
  } catch {
    return { ok: false, error: TRANSPORT_ERROR }
  }
}

/** Typed MCP management operations over the wire. */
export const mcpApi = {
  list(): Promise<ApiResult<ListResult>> {
    return post<ListResult>('mcp-manager/list', {})
  },
  add(config: McpServerConfig): Promise<ApiResult<{ id: string }>> {
    return post('mcp-manager/add', { config })
  },
  update(id: string, config: McpServerConfig): Promise<ApiResult<{ id: string }>> {
    return post('mcp-manager/update', { id, config })
  },
  remove(id: string): Promise<ApiResult<{ removed: boolean; disabled?: boolean; note?: string }>> {
    return post('mcp-manager/remove', { id })
  },
  setEnabled(id: string, enabled: boolean): Promise<ApiResult<{ id: string; enabled: boolean; overridden?: boolean; note?: string }>> {
    return post('mcp-manager/set-enabled', { id, enabled })
  },
}
