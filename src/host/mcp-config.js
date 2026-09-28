/**
 * Validation for one MCP server config row (the `@deepseek-ai/dsh-mcp-client`
 * Config shape) before it is written into the profile patch.
 *
 * Two layers:
 * 1. structural validation — always runs, knows nothing about DSH;
 * 2. schema validation through the real `@deepseek-ai/dsh-mcp-client` exported
 *    Config (schemastery) — best-effort: when the package cannot be imported
 *    from this plugin, the structural layer alone stands and the Loader's own
 *    validation at reload stays authoritative.
 *
 * `!!js` expression values arrive as `{ __js: "<source>" }` markers; a marked
 * field skips its type check (the expression is re-emitted verbatim and the
 * Loader re-evaluates it at reload).
 *
 * @module @local/mcp-manager/host/mcp-config
 */

/** serverName namespace rule from the mcp-client Config docs. */
export const SERVER_NAME_RE = /^[A-Za-z0-9_-]{1,32}$/

/** @param {unknown} value @returns {boolean} whether the value is a `!!js` marker. */
export function isJsExpr(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    && typeof value.__js === 'string' && Object.keys(value).length === 1
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isStringRecord(value) {
  return isPlainObject(value) && Object.values(value).every(v => typeof v === 'string' || isJsExpr(v))
}

/**
 * Validate one server config. Fields carrying `{ __js }` markers skip their
 * type check.
 * @param {unknown} raw Candidate config.
 * @returns {{ ok: true } | { ok: false, error: string }} error names the field.
 */
export function validateMcpConfigStructural(raw) {
  if (!isPlainObject(raw)) return { ok: false, error: 'config 必须是对象' }
  const config = /** @type {Record<string, unknown>} */ (raw)

  const KNOWN = new Set([
    'transport', 'serverName', 'command', 'args', 'env', 'cwd',
    'url', 'headers', 'toolCallTimeoutMs', 'failOnStartupError',
    'maxInstructionBytes', 'reconnect',
  ])
  for (const key of Object.keys(config)) {
    if (!KNOWN.has(key)) return { ok: false, error: `未知字段 "${key}"` }
  }

  if (!isJsExpr(config.transport) && config.transport !== 'stdio' && config.transport !== 'streamable-http') {
    return { ok: false, error: 'transport 必须是 "stdio" 或 "streamable-http"' }
  }
  if (!isJsExpr(config.serverName)) {
    if (typeof config.serverName !== 'string' || !SERVER_NAME_RE.test(config.serverName)) {
      return { ok: false, error: 'serverName 必须匹配 [A-Za-z0-9_-]{1,32}' }
    }
  }

  const transport = isJsExpr(config.transport) ? undefined : config.transport
  if (transport === 'stdio') {
    if (!isJsExpr(config.command) && (typeof config.command !== 'string' || config.command.trim() === '')) {
      return { ok: false, error: 'stdio 服务器必须提供非空 command' }
    }
    if (config.args !== undefined && !isJsExpr(config.args)
      && !(Array.isArray(config.args) && config.args.every(a => typeof a === 'string' || isJsExpr(a)))) {
      return { ok: false, error: 'args 必须是字符串数组' }
    }
    if (config.env !== undefined && !isJsExpr(config.env) && !isStringRecord(config.env)) {
      return { ok: false, error: 'env 必须是字符串键值对象' }
    }
    if (config.cwd !== undefined && !isJsExpr(config.cwd) && typeof config.cwd !== 'string') {
      return { ok: false, error: 'cwd 必须是字符串' }
    }
  }
  if (transport === 'streamable-http') {
    if (!isJsExpr(config.url) && (typeof config.url !== 'string' || !isValidHttpUrl(config.url))) {
      return { ok: false, error: 'streamable-http 服务器必须提供合法的 http(s) url' }
    }
    if (config.headers !== undefined && !isJsExpr(config.headers) && !isStringRecord(config.headers)) {
      return { ok: false, error: 'headers 必须是字符串键值对象' }
    }
  }
  if (transport === undefined && !isJsExpr(config.command) && !isJsExpr(config.url)) {
    return { ok: false, error: '无法判断传输类型：缺少 command（stdio）或 url（streamable-http）' }
  }

  if (config.toolCallTimeoutMs !== undefined && !isJsExpr(config.toolCallTimeoutMs)
    && !(typeof config.toolCallTimeoutMs === 'number' && Number.isFinite(config.toolCallTimeoutMs) && config.toolCallTimeoutMs > 0)) {
    return { ok: false, error: 'toolCallTimeoutMs 必须是正数' }
  }
  if (config.failOnStartupError !== undefined && !isJsExpr(config.failOnStartupError)
    && typeof config.failOnStartupError !== 'boolean') {
    return { ok: false, error: 'failOnStartupError 必须是布尔值' }
  }
  if (config.maxInstructionBytes !== undefined && !isJsExpr(config.maxInstructionBytes)
    && !(typeof config.maxInstructionBytes === 'number' && Number.isFinite(config.maxInstructionBytes) && config.maxInstructionBytes > 0)) {
    return { ok: false, error: 'maxInstructionBytes 必须是正数' }
  }
  if (config.reconnect !== undefined && !isJsExpr(config.reconnect)) {
    if (!isPlainObject(config.reconnect)) return { ok: false, error: 'reconnect 必须是对象' }
    const reconnect = /** @type {Record<string, unknown>} */ (config.reconnect)
    for (const key of Object.keys(reconnect)) {
      if (!['enabled', 'initialDelayMs', 'maxDelayMs', 'maxAttempts'].includes(key)) {
        return { ok: false, error: `reconnect 未知字段 "${key}"` }
      }
    }
    if (reconnect.enabled !== undefined && typeof reconnect.enabled !== 'boolean') {
      return { ok: false, error: 'reconnect.enabled 必须是布尔值' }
    }
    for (const key of ['initialDelayMs', 'maxDelayMs', 'maxAttempts']) {
      if (reconnect[key] !== undefined && !(typeof reconnect[key] === 'number' && Number.isFinite(reconnect[key]) && reconnect[key] > 0)) {
        return { ok: false, error: `reconnect.${key} 必须是正数` }
      }
    }
  }
  return { ok: true }
}

/**
 * @param {string} value
 * @returns {boolean}
 */
function isValidHttpUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/** Cached import verdict so repeated calls do not re-attempt a failing import. */
let mcpClientConfig
let mcpClientConfigTried = false

/**
 * Best-effort validation through the real mcp-client Config schema.
 * @param {unknown} raw
 * @returns {Promise<{ ok: true } | { ok: false, error: string }>}
 */
export async function validateMcpConfig(raw) {
  const structural = validateMcpConfigStructural(raw)
  if (!structural.ok) return structural

  // A raw view carrying any `!!js` marker cannot be schema-checked here (the
  // Loader evaluates expressions at reload) — skip to the authoritative layer.
  if (JSON.stringify(raw).includes('__js')) return { ok: true }

  if (!mcpClientConfigTried) {
    mcpClientConfigTried = true
    try {
      const mod = await import('@deepseek-ai/dsh-mcp-client')
      mcpClientConfig = mod.Config
    } catch {
      mcpClientConfig = undefined
    }
  }
  if (mcpClientConfig !== undefined) {
    try {
      mcpClientConfig(structuredClone(raw))
    } catch (error) {
      return { ok: false, error: String(/** @type {Error} */ (error).message ?? error) }
    }
  }
  return { ok: true }
}
