/**
 * @local/mcp-manager — host half: registers the /mcp-manager/* HTTP routes
 * (list / add / update / remove / set-enabled over the active profile's patch
 * document) on the shared webserver. The browser half (exports "./client")
 * adds the "MCP 服务" settings section to the web GUI.
 *
 * Write safety comes from three layers: the loopback trust fence in front of
 * every request, HMR-serialized read-modify-write cycles, and a re-parse
 * verification before each atomic rename (see patch-editor.js).
 *
 * @module @local/mcp-manager
 */

import { registerMcpRoutes } from './routes.js'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'mcp-manager'

/** Services required by this plugin. */
export const inject = ['webServer', 'loader', 'profileContext']

/**
 * Mount the route family for this plugin instance's lifetime.
 * @param {import('@deepseek-ai/cordis').Context} ctx
 */
export function apply(ctx) {
  ctx.effect(() => registerMcpRoutes(ctx), 'mcp-manager: /mcp-manager routes')
}
