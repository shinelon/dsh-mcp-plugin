/**
 * MCP manager surface plugin, browser half. Registers the "MCP 服务" settings
 * section (`settings.section` slot) once the settings shell declares it; all
 * management verbs call this package's host /mcp-manager routes. Registration
 * follows the shipped ui-settings-models shape exactly: dictionaries +
 * `locale.bind` + declaration-aware `slots.inject` + `slots.register`.
 * @module dsh-mcp-manager/client
 */

import { mcpApi } from './api'
import { McpSection } from './section'
import { zh, en } from './locales'

/** The locale namespace owned by this plugin. */
export const NS = 'mcp-manager'

/** Minimal structural type of the client context this plugin touches. */
interface ClientContext {
  effect(fn: () => (() => void) | void, label: string): void
  inject(services: readonly string[], fn: (scope: ClientContext) => void): void
  locale: {
    register(namespace: string, dictionaries: Record<string, Record<string, string>>): () => void
    bind(namespace: string): (key: string) => string
  }
}

/** Minimal structural type of the slots registry surface used here. */
interface SlotRegistry {
  /** Run `ready` once the named slot is declared; the return value disposes the wait. */
  inject(slot: string, ready: () => (() => void) | void): void
  register(options: Record<string, unknown>, component: unknown): () => void
}

/** Client services required before this module's apply runs. */
export const inject = ['slots', 'locale']

/**
 * Client plugin body: dictionaries, then the settings.section registration
 * with the injected management verbs.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => {
    try {
      return ctx.locale.register(NS, { zh, en })
    } catch {
      return () => {}
    }
  }, 'mcp-manager: dictionaries')

  const t = ctx.locale.bind(NS)

  ctx.inject(['slots'], (scope: ClientContext) => {
    const slots = (scope as unknown as { slots: SlotRegistry }).slots
    // Declaration-aware registration: the shell renders the nav entry the
    // moment its settings.section ledger row exists; the inject wait dies with
    // this fiber, so no stale seat survives an unload.
    slots.inject('settings.section', () => slots.register(
      {
        name: 'settings.section',
        id: 'mcp-servers',
        order: 60,
        locale: NS,
        label: () => t('nav'),
        inject: () => ({
          list: mcpApi.list,
          add: mcpApi.add,
          update: mcpApi.update,
          remove: mcpApi.remove,
          setEnabled: mcpApi.setEnabled,
        }),
      },
      McpSection,
    ))
  })
}
