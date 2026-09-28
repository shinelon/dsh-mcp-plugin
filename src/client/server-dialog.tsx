/**
 * Inline add/edit form for one MCP server (rendered in place of the list —
 * no modal overlay, so no z-index jousting with the settings shell).
 *
 * `!!js` expression values round-trip losslessly: untouched expression pairs
 * keep their marker and the host re-emits the original node; editing a value
 * turns it into a literal (the hint badge says so).
 * @module dsh-mcp-manager/client/server-dialog
 */

import { useMemo, useState } from 'react'
import { isJsExpr, type JsExpr, type McpServerConfig, type McpServerView } from './api'
import type { McpManagerKey } from './locales'

type Translate = (key: McpManagerKey) => string

export interface ServerDialogProps {
  t: Translate
  mode: 'add' | 'edit'
  server: McpServerView | null
  busy: boolean
  onSave(config: McpServerConfig): void
  onCancel(): void
}

/** One editable key/value row of env or headers. */
interface Pair {
  key: string
  value: string
  /** Untouched `!!js` value: re-emitted verbatim on save. */
  expr: boolean
}

const ARG_EXPR_PREFIX = '!!js: '
const SERVER_NAME_RE = /^[A-Za-z0-9_-]{1,32}$/

const S = {
  form: {
    marginTop: 10, padding: '12px 14px', borderRadius: 8,
    border: '1px solid rgba(128,128,128,0.3)', display: 'grid',
    gridTemplateColumns: '150px minmax(0, 1fr)', gap: '10px 12px', alignItems: 'start',
  } as const,
  label: { fontSize: 12.5, fontWeight: 600, paddingTop: 6 } as const,
  hint: { fontSize: 11.5, opacity: 0.6, marginTop: 3, lineHeight: 1.4 } as const,
  input: {
    font: 'inherit', fontSize: 12.5, width: '100%', boxSizing: 'border-box',
    padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(128,128,128,0.35)',
    background: 'transparent', color: 'inherit',
  } as const,
  area: {
    font: 'inherit', fontSize: 12.5, width: '100%', boxSizing: 'border-box',
    padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(128,128,128,0.35)',
    background: 'transparent', color: 'inherit', fontFamily: 'var(--dsw-font-mono, ui-monospace, monospace)',
    resize: 'vertical',
  } as const,
  pairRow: { display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' } as const,
  pairKey: { flex: '0 0 180px' } as const,
  pairValue: { flex: 1 } as const,
  exprBadge: {
    fontSize: 10.5, padding: '1px 6px', borderRadius: 4, whiteSpace: 'nowrap',
    border: '1px solid #c98a1b', color: '#c98a1b', flexShrink: 0,
  } as const,
  btn: {
    font: 'inherit', fontSize: 12.5, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
    border: '1px solid rgba(128,128,128,0.35)', background: 'transparent', color: 'inherit',
  } as const,
  btnPrimary: {
    font: 'inherit', fontSize: 12.5, padding: '4px 14px', borderRadius: 6, cursor: 'pointer',
    border: '1px solid transparent', background: '#3b6ef5', color: '#fff',
  } as const,
  row: { display: 'flex', gap: 8, alignItems: 'center' } as const,
  radioRow: { display: 'flex', gap: 14, paddingTop: 6 } as const,
  radio: { display: 'flex', gap: 5, alignItems: 'center', fontSize: 12.5 } as const,
  actions: { display: 'flex', gap: 8, justifyContent: 'flex-end', gridColumn: '1 / -1', marginTop: 4 } as const,
  title: { fontSize: 15, fontWeight: 600, margin: 0, gridColumn: '1 / -1' } as const,
  check: { display: 'flex', gap: 6, alignItems: 'center', fontSize: 12.5, paddingTop: 6 } as const,
}

/** @param value Unknown config value; expression markers become placeholder lines. */
function argsToText(value: unknown): string {
  if (!Array.isArray(value)) return ''
  return value
    .map(item => typeof item === 'string' ? item : isJsExpr(item) ? ARG_EXPR_PREFIX + item.__js : '')
    .join('\n')
}

function textToArgs(text: string): (string | JsExpr)[] {
  return text.split('\n')
    .map(line => line.trimEnd())
    .filter(line => line.trim() !== '')
    .map(line => line.startsWith(ARG_EXPR_PREFIX) ? { __js: line.slice(ARG_EXPR_PREFIX.length) } : line)
}

function pairsToRecord(pairs: Pair[]): Record<string, string | JsExpr> | undefined {
  const meaningful = pairs.filter(pair => pair.key.trim() !== '')
  if (meaningful.length === 0) return undefined
  const record: Record<string, string | JsExpr> = {}
  for (const pair of meaningful) record[pair.key.trim()] = pair.value
  return record
}

function recordToPairs(value: unknown): Pair[] {
  if (typeof value !== 'object' || value === null) return []
  return Object.entries(value as Record<string, unknown>).map(([key, item]) => ({
    key,
    value: isJsExpr(item) ? item.__js : String(item ?? ''),
    expr: isJsExpr(item),
  }))
}

export function ServerDialog(props: ServerDialogProps) {
  const { t, mode, server, busy, onSave, onCancel } = props
  const config = server?.config
  const [transport, setTransport] = useState<'stdio' | 'streamable-http'>(
    config?.transport === 'streamable-http' ? 'streamable-http' : 'stdio')
  const [serverName, setServerName] = useState(typeof config?.serverName === 'string' ? config.serverName : '')
  const [command, setCommand] = useState(typeof config?.command === 'string' ? config.command : '')
  const [argsText, setArgsText] = useState(argsToText(config?.args))
  const [cwd, setCwd] = useState(typeof config?.cwd === 'string' ? config.cwd : '')
  const [envPairs, setEnvPairs] = useState<Pair[]>(recordToPairs(config?.env))
  const [url, setUrl] = useState(typeof config?.url === 'string' ? config.url : '')
  const [headerPairs, setHeaderPairs] = useState<Pair[]>(recordToPairs(config?.headers))
  const [timeoutText, setTimeoutText] = useState(
    typeof config?.toolCallTimeoutMs === 'number' ? String(config.toolCallTimeoutMs) : '')
  const [failOnStartup, setFailOnStartup] = useState(config?.failOnStartupError === true)
  const [formError, setFormError] = useState('')

  const isEdit = mode === 'edit'
  const title = isEdit ? t('formEditTitle') : t('formAddTitle')

  const canSave = useMemo(() => {
    if (busy) return false
    if (!isEdit && !SERVER_NAME_RE.test(serverName)) return false
    if (transport === 'stdio') return command.trim() !== ''
    return url.trim() !== ''
  }, [busy, isEdit, serverName, transport, command, url])

  const save = () => {
    setFormError('')
    if (!isEdit && !SERVER_NAME_RE.test(serverName)) {
      setFormError(t('formServerNameHint'))
      return
    }
    if (transport === 'stdio' && command.trim() === '') {
      setFormError(t('formCommand'))
      return
    }
    if (transport === 'streamable-http' && url.trim() === '') {
      setFormError(t('formUrl'))
      return
    }
    /** @type {McpServerConfig} */
    const next: McpServerConfig = {
      transport,
      // serverName is immutable in edit mode; the original value is preserved.
      serverName: isEdit ? String(config?.serverName ?? '') : serverName,
    }
    if (transport === 'stdio') {
      next.command = command.trim()
      const args = textToArgs(argsText)
      if (args.length > 0) next.args = args
      const env = pairsToRecord(envPairs)
      if (env !== undefined) next.env = env
      if (cwd.trim() !== '') next.cwd = cwd.trim()
    } else {
      next.url = url.trim()
      const headers = pairsToRecord(headerPairs)
      if (headers !== undefined) next.headers = headers
    }
    const timeout = Number(timeoutText)
    if (timeoutText.trim() !== '' && Number.isFinite(timeout) && timeout > 0) next.toolCallTimeoutMs = timeout
    if (failOnStartup) next.failOnStartupError = true
    onSave(next)
  }

  /** One key/value editor: untouched expressions keep their badge and pass through verbatim. */
  const pairEditor = (pairs: Pair[], setPairs: (next: Pair[]) => void, valueLabel: string) => (
    <div>
      {pairs.map((pair, index) => (
        <div key={index} style={S.pairRow}>
          <input
            style={{ ...S.input, ...S.pairKey }} value={pair.key} placeholder="KEY"
            onChange={event => {
              const next = pairs.slice()
              next[index] = { ...pair, key: event.target.value }
              setPairs(next)
            }}
          />
          <input
            style={{ ...S.input, ...S.pairValue }} value={pair.value} placeholder={valueLabel}
            title={pair.expr ? t('formExprHint') : undefined}
            onChange={event => {
              const next = pairs.slice()
              next[index] = { key: pair.key, value: event.target.value, expr: false }
              setPairs(next)
            }}
          />
          {pair.expr && <span style={S.exprBadge}>{t('formExprBadge')}</span>}
          <button
            type="button" style={S.btn}
            onClick={() => setPairs(pairs.filter((_, i) => i !== index))}
          >×</button>
        </div>
      ))}
      <button type="button" style={S.btn} onClick={() => setPairs([...pairs, { key: '', value: '', expr: false }])}>
        + {t('formAddPair')}
      </button>
    </div>
  )

  return (
    <div style={S.form}>
      <h3 style={S.title}>{title}</h3>

      <div style={S.label}>{t('formTransport')}</div>
      <div style={S.radioRow}>
        <label style={S.radio}>
          <input type="radio" name="mcpmgr-transport" checked={transport === 'stdio'}
            disabled={busy}
            onChange={() => setTransport('stdio')} />
          {t('transportStdio')}
        </label>
        <label style={S.radio}>
          <input type="radio" name="mcpmgr-transport" checked={transport === 'streamable-http'}
            disabled={busy}
            onChange={() => setTransport('streamable-http')} />
          {t('transportHttp')}
        </label>
      </div>

      <div style={S.label}>
        {t('formServerName')}
        <div style={S.hint}>{isEdit ? `mcp__${String(config?.serverName ?? '')}__*` : t('formServerNameHint')}</div>
      </div>
      <input
        style={S.input} value={serverName} disabled={isEdit || busy} spellCheck={false}
        placeholder="web-search-prime"
        onChange={event => setServerName(event.target.value)}
      />

      {transport === 'stdio' ? (
        <>
          <div style={S.label}>{t('formCommand')}</div>
          <input
            style={S.input} value={command} disabled={busy} spellCheck={false}
            placeholder="npx" onChange={event => setCommand(event.target.value)}
          />
          <div style={S.label}>
            {t('formArgs')}
            <div style={S.hint}>{t('formArgsHint')}</div>
          </div>
          <textarea
            style={{ ...S.area, minHeight: 56 }} value={argsText} disabled={busy} spellCheck={false}
            onChange={event => setArgsText(event.target.value)}
          />
          <div style={S.label}>{t('formEnv')} <span style={S.hint}>({t('optionalField')})</span></div>
          <div>{pairEditor(envPairs, setEnvPairs, 'VALUE')}</div>
          <div style={S.label}>{t('formCwd')} <span style={S.hint}>({t('optionalField')})</span></div>
          <input
            style={S.input} value={cwd} disabled={busy} spellCheck={false}
            onChange={event => setCwd(event.target.value)}
          />
        </>
      ) : (
        <>
          <div style={S.label}>{t('formUrl')}</div>
          <input
            style={S.input} value={url} disabled={busy} spellCheck={false}
            placeholder="https://example.com/mcp" onChange={event => setUrl(event.target.value)}
          />
          <div style={S.label}>{t('formHeaders')} <span style={S.hint}>({t('optionalField')})</span></div>
          <div>{pairEditor(headerPairs, setHeaderPairs, 'VALUE')}</div>
        </>
      )}

      <div style={S.label}>{t('formTimeout')} <span style={S.hint}>({t('optionalField')})</span></div>
      <input
        style={S.input} value={timeoutText} disabled={busy} inputMode="numeric"
        onChange={event => setTimeoutText(event.target.value.replace(/[^\d]/g, ''))}
      />

      <div style={S.label}>{t('formFailOnStartup')} <span style={S.hint}>({t('optionalField')})</span></div>
      <label style={S.check}>
        <input type="checkbox" checked={failOnStartup} disabled={busy}
          onChange={event => setFailOnStartup(event.target.checked)} />
      </label>

      <div style={S.actions}>
        {formError !== '' && <span style={{ color: '#d64545', fontSize: 12.5, marginRight: 'auto' }}>{formError}</span>}
        <button type="button" style={S.btn} disabled={busy} onClick={onCancel}>{t('cancel')}</button>
        <button type="button" style={S.btnPrimary} disabled={!canSave} onClick={save}>
          {busy ? t('saving') : t('save')}
        </button>
      </div>
    </div>
  )
}
