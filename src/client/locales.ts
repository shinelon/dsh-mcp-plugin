/**
 * UI copy for the MCP manager settings section, registered under the
 * `mcp-manager` locale namespace (zh preferred, en fallback).
 * @module dsh-mcp-manager/client/locales
 */

/** Dictionary key union for the namespace. */
export type McpManagerKey =
  | 'nav' | 'title' | 'subtitle' | 'refresh' | 'add' | 'empty' | 'loadFailed' | 'retry'
  | 'colName' | 'colTransport' | 'colTarget' | 'colStatus' | 'colActions'
  | 'transportStdio' | 'transportHttp'
  | 'statusActive' | 'statusLoading' | 'statusPending' | 'statusFailed' | 'statusDisabled'
  | 'sourceBundle' | 'edit' | 'remove' | 'enable' | 'disable'
  | 'confirmRemove' | 'removeBundleNote' | 'saved' | 'errTitle'
  | 'formAddTitle' | 'formEditTitle' | 'formTransport' | 'formServerName' | 'formServerNameHint'
  | 'formCommand' | 'formArgs' | 'formArgsHint' | 'formCwd' | 'formEnv' | 'formUrl'
  | 'formHeaders' | 'formTimeout' | 'formFailOnStartup'
  | 'formAddPair' | 'formExprBadge' | 'formExprHint' | 'save' | 'cancel' | 'saving'
  | 'optionalField'

export const zh: Record<McpManagerKey, string> = {
  nav: 'MCP 服务',
  title: 'MCP 服务器',
  subtitle: '管理本 profile 的 MCP 服务器。改动写入 cordis.patch.yml 并即时热重载，无需重启。',
  refresh: '刷新',
  add: '新增服务器',
  empty: '尚未配置任何 MCP 服务器。',
  loadFailed: '加载失败',
  retry: '重试',
  colName: '名称',
  colTransport: '传输',
  colTarget: '目标',
  colStatus: '状态',
  colActions: '操作',
  transportStdio: '本地进程',
  transportHttp: 'HTTP',
  statusActive: '运行中',
  statusLoading: '加载中',
  statusPending: '等待',
  statusFailed: '失败',
  statusDisabled: '已禁用',
  sourceBundle: 'bundle 层',
  edit: '编辑',
  remove: '删除',
  enable: '启用',
  disable: '禁用',
  confirmRemove: '确认删除服务器 "{name}"？改动会写入补丁文件并立即重载。',
  removeBundleNote: '该行来自 bundle 层，无法移除；确认后将改为写入禁用覆盖行。',
  saved: '已写入补丁文件，正在等待热重载…',
  errTitle: '操作失败',
  formAddTitle: '新增 MCP 服务器',
  formEditTitle: '编辑 MCP 服务器',
  formTransport: '传输类型',
  formServerName: 'serverName',
  formServerNameHint: '1-32 位字母/数字/下划线/连字符；决定工具名前缀 mcp__<serverName>__*',
  formCommand: '启动命令',
  formArgs: '启动参数',
  formArgsHint: '每行一个参数',
  formCwd: '工作目录',
  formEnv: '环境变量',
  formUrl: 'MCP 端点 URL',
  formHeaders: '请求头',
  formTimeout: '工具调用超时（毫秒）',
  formFailOnStartup: '启动失败时挂载失败',
  formAddPair: '添加一项',
  formExprBadge: '表达式',
  formExprHint: '该值来自 !!js 表达式；保持不变则原样保留，修改后将变为字面量。',
  save: '保存',
  cancel: '取消',
  saving: '保存中…',
  optionalField: '可选',
}

export const en: Record<McpManagerKey, string> = {
  nav: 'MCP Servers',
  title: 'MCP Servers',
  subtitle: 'Manage this profile\'s MCP servers. Changes are written to cordis.patch.yml and hot-reload live; no restart needed.',
  refresh: 'Refresh',
  add: 'Add server',
  empty: 'No MCP servers configured.',
  loadFailed: 'Load failed',
  retry: 'Retry',
  colName: 'Name',
  colTransport: 'Transport',
  colTarget: 'Target',
  colStatus: 'Status',
  colActions: 'Actions',
  transportStdio: 'stdio',
  transportHttp: 'HTTP',
  statusActive: 'Active',
  statusLoading: 'Loading',
  statusPending: 'Pending',
  statusFailed: 'Failed',
  statusDisabled: 'Disabled',
  sourceBundle: 'bundle layer',
  edit: 'Edit',
  remove: 'Remove',
  enable: 'Enable',
  disable: 'Disable',
  confirmRemove: 'Remove server "{name}"? The change is written to the patch file and hot-reloads immediately.',
  removeBundleNote: 'This row comes from a bundle layer and cannot be removed; confirming writes a disabling override row instead.',
  saved: 'Written to the patch file; waiting for hot reload…',
  errTitle: 'Operation failed',
  formAddTitle: 'Add MCP server',
  formEditTitle: 'Edit MCP server',
  formTransport: 'Transport',
  formServerName: 'serverName',
  formServerNameHint: '1-32 chars [A-Za-z0-9_-]; prefixes tool names as mcp__<serverName>__*',
  formCommand: 'Command',
  formArgs: 'Arguments',
  formArgsHint: 'One argument per line',
  formCwd: 'Working directory',
  formEnv: 'Environment',
  formUrl: 'MCP endpoint URL',
  formHeaders: 'Headers',
  formTimeout: 'Tool call timeout (ms)',
  formFailOnStartup: 'Fail mount on startup error',
  formAddPair: 'Add entry',
  formExprBadge: 'expression',
  formExprHint: 'This value comes from a !!js expression; leaving it untouched preserves it, editing turns it into a literal.',
  save: 'Save',
  cancel: 'Cancel',
  saving: 'Saving…',
  optionalField: 'optional',
}
