/**
 * The "MCP 服务" settings section: server list with live status, enable/disable
 * toggles, remove with inline confirm, and an inline add/edit form view. All
 * facts arrive through the injected verbs (host /mcp-manager routes); the
 * component is pure props.
 * @module dsh-mcp-manager/client/section
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { McpServerView, McpError, McpServerConfig } from './api'
import { ServerDialog } from './server-dialog'
import type { McpManagerKey } from './locales'

type Translate = (key: McpManagerKey) => string
type ApiResultOf<T> = { ok: true; value: T } | { ok: false; error: McpError }

/** The injected business face (see index.tsx registration). */
export interface McpSectionFace {
  list(): Promise<ApiResultOf<{ servers: McpServerView[] }>>
  add(config: McpServerConfig): Promise<ApiResultOf<{ id: string }>>
  update(id: string, config: McpServerConfig): Promise<ApiResultOf<{ id: string }>>
  remove(id: string): Promise<ApiResultOf<{ removed: boolean; disabled?: boolean; note?: string }>>
  setEnabled(id: string, enabled: boolean): Promise<ApiResultOf<{ id: string; enabled: boolean }>>
}

export interface McpSectionProps extends McpSectionFace {
  /** Shell affordance (owner share) — unused here, declared for contract completeness. */
  close?(): void
  /** Framework-synthesized translate seat bound to the mcp-manager namespace. */
  t: Translate
}

interface ListState {
  loading: boolean
  error: string
  servers: McpServerView[]
}

const S = {
  root: { padding: '4px 2px', fontSize: 13, color: 'inherit', minWidth: 0 } as const,
  head: { display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' } as const,
  title: { fontSize: 18, fontWeight: 600, margin: 0 } as const,
  subtitle: { margin: '6px 0 14px', opacity: 0.7, lineHeight: 1.5 } as const,
  grow: { flex: 1 } as const,
  btn: {
    font: 'inherit', fontSize: 12.5, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
    border: '1px solid rgba(128,128,128,0.35)', background: 'transparent', color: 'inherit',
  } as const,
  btnPrimary: {
    font: 'inherit', fontSize: 12.5, padding: '4px 12px', borderRadius: 6, cursor: 'pointer',
    border: '1px solid transparent', background: '#3b6ef5', color: '#fff',
  } as const,
  btnDanger: {
    font: 'inherit', fontSize: 12.5, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
    border: '1px solid rgba(214,69,69,0.55)', background: 'transparent', color: '#d64545',
  } as const,
  btnRow: { display: 'flex', gap: 6, justifyContent: 'flex-end' } as const,
  notice: {
    margin: '10px 0', padding: '6px 10px', borderRadius: 6, fontSize: 12.5,
    background: 'rgba(59,110,245,0.12)', border: '1px solid rgba(59,110,245,0.35)',
  } as const,
  error: {
    margin: '10px 0', padding: '6px 10px', borderRadius: 6, fontSize: 12.5,
    background: 'rgba(214,69,69,0.10)', border: '1px solid rgba(214,69,69,0.4)', color: '#d64545',
  } as const,
  table: { width: '100%', borderCollapse: 'collapse', marginTop: 8 } as const,
  th: {
    textAlign: 'left', fontWeight: 600, fontSize: 12, opacity: 0.65,
    padding: '6px 8px', borderBottom: '1px solid rgba(128,128,128,0.25)', whiteSpace: 'nowrap',
  } as const,
  td: {
    padding: '8px', borderBottom: '1px solid rgba(128,128,128,0.15)', verticalAlign: 'top',
  } as const,
  target: { fontFamily: 'var(--dsw-font-mono, ui-monospace, monospace)', fontSize: 12, wordBreak: 'break-all' } as const,
  badge: (color: string) => ({
    display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
    fontSize: 12, padding: '2px 8px', borderRadius: 999,
    border: `1px solid ${color}55`, background: `${color}18`,
  }),
  dot: (color: string) => ({ width: 7, height: 7, borderRadius: 999, background: color, flexShrink: 0 }),
  bundleTag: {
    marginLeft: 6, fontSize: 10.5, padding: '1px 6px', borderRadius: 4,
    border: '1px solid rgba(128,128,128,0.4)', opacity: 0.75, whiteSpace: 'nowrap',
  } as const,
  empty: { padding: '28px 0', textAlign: 'center', opacity: 0.6 } as const,
}

/** Status → badge color. */
function statusColor(status: McpServerView['status']): string {
  switch (status) {
    case 'active': return '#2e9e5b'
    case 'failed': return '#d64545'
    case 'loading': return '#c98a1b'
    default: return '#8a8f98'
  }
}

/**
 * Backoff schedule for post-mutation reloads: HMR needs a moment to reconcile
 * the written patch, so the list refreshes at +1.2s / +3s / +5.5s.
 */
const RELOAD_BACKOFF_MS = [1200, 3000, 5500]

export function McpSection(props: McpSectionProps) {
  const { t, list, add, update, remove, setEnabled } = props
  const [state, setState] = useState<ListState>({ loading: true, error: '', servers: [] })
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const [dialog, setDialog] = useState<null | { mode: 'add' } | { mode: 'edit'; server: McpServerView }>(null)
  const [confirmId, setConfirmId] = useState('')
  const [busy, setBusy] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const load = useCallback(async () => {
    const result = await list()
    if (result.ok) {
      setState({ loading: false, error: '', servers: result.value.servers })
    } else {
      setState({ loading: false, error: result.error.message, servers: [] })
    }
  }, [list])

  const scheduleReloads = useCallback(() => {
    for (const ms of RELOAD_BACKOFF_MS) {
      timers.current.push(setTimeout(() => { void load() }, ms))
    }
  }, [load])

  useEffect(() => {
    void load()
    const onFocus = () => { void load() }
    window.addEventListener('focus', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
      for (const timer of timers.current) clearTimeout(timer)
      timers.current = []
      if (confirmTimer.current !== undefined) clearTimeout(confirmTimer.current)
    }
  }, [load])

  /** Wrap one mutation: busy flag, error surface, post-success reloads. */
  const run = useCallback(async (work: () => Promise<ApiResultOf<unknown>>): Promise<boolean> => {
    setBusy(true)
    setActionError('')
    try {
      const result = await work()
      if (!result.ok) {
        setActionError(`${t('errTitle')}: ${result.error.message}`)
        return false
      }
      setNotice(t('saved'))
      scheduleReloads()
      return true
    } finally {
      setBusy(false)
    }
  }, [t, scheduleReloads])

  const onRemove = useCallback((server: McpServerView) => {
    if (confirmId !== server.id) {
      setConfirmId(server.id)
      if (confirmTimer.current !== undefined) clearTimeout(confirmTimer.current)
      confirmTimer.current = setTimeout(() => setConfirmId(''), 4000)
      return
    }
    setConfirmId('')
    setNotice('')
    void run(() => remove(server.id))
  }, [confirmId, remove, run])

  const onToggle = useCallback((server: McpServerView) => {
    setNotice('')
    void run(() => setEnabled(server.id, !server.enabled))
  }, [setEnabled, run])

  return (
    <div style={S.root}>
      <div style={S.head}>
        <h2 style={S.title}>{t('title')}</h2>
        <div style={S.grow} />
        <button type="button" style={S.btn} onClick={() => { void load() }}>{t('refresh')}</button>
        <button type="button" style={S.btnPrimary} onClick={() => setDialog({ mode: 'add' })}>{t('add')}</button>
      </div>
      <p style={S.subtitle}>{t('subtitle')}</p>

      {notice !== '' && <div style={S.notice}>{notice}</div>}
      {actionError !== '' && <div style={S.error}>{actionError}</div>}
      {state.error !== '' && (
        <div style={S.error}>
          {t('loadFailed')}: {state.error}{' '}
          <button type="button" style={S.btn} onClick={() => { void load() }}>{t('retry')}</button>
        </div>
      )}

      {dialog !== null ? (
        <ServerDialog
          t={t}
          mode={dialog.mode}
          server={dialog.mode === 'edit' ? dialog.server : null}
          busy={busy}
          onSave={(config) => {
            const work = dialog.mode === 'edit'
              ? () => update(dialog.server.id, config)
              : () => add(config)
            void (async () => {
              const ok = await run(work)
              if (ok) setDialog(null)
            })()
          }}
          onCancel={() => setDialog(null)}
        />
      ) : state.loading ? (
        <div style={S.empty}>…</div>
      ) : state.servers.length === 0 ? (
        <div style={S.empty}>{t('empty')}</div>
      ) : (
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>{t('colName')}</th>
              <th style={S.th}>{t('colTransport')}</th>
              <th style={S.th}>{t('colTarget')}</th>
              <th style={S.th}>{t('colStatus')}</th>
              <th style={S.th}>{t('colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {state.servers.map(server => (
              <tr key={server.id}>
                <td style={{ ...S.td, whiteSpace: 'nowrap' }}>
                  {server.serverName === '' ? server.id : server.serverName}
                  {server.source === 'bundle' && <span style={S.bundleTag}>{t('sourceBundle')}</span>}
                </td>
                <td style={{ ...S.td, whiteSpace: 'nowrap' }}>
                  {server.transport === 'stdio' ? t('transportStdio') : t('transportHttp')}
                </td>
                <td style={{ ...S.td }}>
                  <span style={S.target}>{server.target}</span>
                  {server.status === 'failed' && server.errorText !== '' && (
                    <div style={{ ...S.target, color: '#d64545', marginTop: 4 }}>{server.errorText}</div>
                  )}
                </td>
                <td style={{ ...S.td, whiteSpace: 'nowrap' }}>
                  <span style={S.badge(statusColor(server.status))}>
                    <span style={S.dot(statusColor(server.status))} />
                    {t(`status${server.status[0].toUpperCase()}${server.status.slice(1)}` as McpManagerKey)}
                  </span>
                </td>
                <td style={{ ...S.td }}>
                  <div style={S.btnRow}>
                    <button
                      type="button" style={S.btn} disabled={busy}
                      onClick={() => { setNotice(''); setDialog({ mode: 'edit', server }) }}
                    >{t('edit')}</button>
                    <button type="button" style={S.btn} disabled={busy} onClick={() => onToggle(server)}>
                      {server.enabled ? t('disable') : t('enable')}
                    </button>
                    <button
                      type="button"
                      style={confirmId === server.id ? S.btnDanger : S.btn}
                      disabled={busy}
                      title={(server.source === 'bundle' ? t('removeBundleNote') : t('confirmRemove'))
                        .replace('{name}', server.serverName || server.id)}
                      onClick={() => onRemove(server)}
                    >{confirmId === server.id ? `${t('remove')}?` : t('remove')}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
