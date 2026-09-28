/**
 * Shared view types for the MCP manager (JSDoc typedefs used by both halves).
 *
 * The wire envelope mirrors the git-graph plugin family: every JSON response
 * is `{ ok: true, value } | { ok: false, error: McpError }`.
 *
 * @module @local/mcp-manager/core/types
 */

/**
 * Stable machine-readable error.
 * @typedef {object} McpError
 * @property {'internal' | 'invalid' | 'not-found' | 'conflict' | 'forbidden' | 'unavailable'} code
 * @property {string} message Human-readable message (already localized-neutral).
 */

/**
 * A YAML `!!js` expression value preserved verbatim from the patch document.
 * Editing it in the UI converts it to a literal; leaving it untouched passes
 * the original node through.
 * @typedef {object} JsExpr
 * @property {string} __js The raw expression source (the tag's scalar text).
 */

/**
 * Raw MCP server config as stored in the patch row (values may be JsExpr).
 * @typedef {object} McpServerConfig
 * @property {'stdio' | 'streamable-http'} transport
 * @property {string} serverName
 * @property {string} [command] stdio executable.
 * @property {string[]} [args] stdio arguments.
 * @property {Record<string, string>} [env] stdio extra env.
 * @property {string} [cwd] stdio working directory.
 * @property {string} [url] streamable-http endpoint.
 * @property {Record<string, string>} [headers] streamable-http headers.
 * @property {number} [toolCallTimeoutMs]
 * @property {boolean} [failOnStartupError]
 * @property {number} [maxInstructionBytes]
 * @property {{enabled?: boolean, initialDelayMs?: number, maxDelayMs?: number, maxAttempts?: number}} [reconnect]
 */

/**
 * One list row: the document-truth config joined with live loader status.
 * @typedef {object} McpServerView
 * @property {string} id Patch row id (e.g. `mcp-web-reader`).
 * @property {string} serverName Live namespace (`mcp__<serverName>__<tool>`).
 * @property {'stdio' | 'streamable-http'} transport
 * @property {string} target Display target (`command` or `url`).
 * @property {boolean} enabled Composed enabled state (row flag / override row).
 * @property {'active' | 'loading' | 'pending' | 'failed' | 'disabled'} status
 * @property {string} errorText Best-effort failure detail, '' when none.
 * @property {'profile' | 'bundle'} source Where the row comes from.
 * @property {boolean} hasJsExpr Whether any config value is a `!!js` expression.
 * @property {McpServerConfig} config Raw config (JsExpr values preserved).
 */

/**
 * @typedef {{ ok: true, value: unknown } | { ok: false, error: McpError }} ApiEnvelope
 */

export {};
