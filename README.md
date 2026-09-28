# dsh-mcp-plugin

[中文](#中文) | [English](#english)

---

<a id="中文"></a>

## 中文

**@local/mcp-manager** — DeepSeek Harness（DSH）Web 端双面插件：在设置面板中新增「MCP 服务」页，管理当前 profile 的全部 MCP 服务器。

### 功能

- **列表**：serverName、传输类型（本地进程 / HTTP）、目标、启用状态、运行状态（来自 loader fiber 的实时状态：运行中 / 加载中 / 等待 / 失败 / 已禁用），失败行展示错误摘要
- **新增**：向导式表单（stdio：command/args/env/cwd；streamable-http：url/headers），经 `@deepseek-ai/dsh-mcp-client` 的 Config schema 校验后写入
- **编辑**：整配置替换（serverName 不可变——它决定 `mcp__<serverName>__*` 工具名前缀）
- **删除**：profile 行直接删除；bundle 层来源的行自动降级为「写入禁用覆盖行」
- **启用/禁用**：切换行上的 `disabled` 标志
- **即时生效**：改动写入 `~/.dsh/profiles/web/cordis.patch.yml`，HMR 自动重载，无需重启 DSH

### 安全设计

- 所有写操作前对补丁文档做 CST 手术式编辑：**未触及行的注释与格式逐字保留**（自动化测试覆盖）
- `!!js` 表达式值原样透传，绝不把 env 解析结果写回文件（避免密钥固化落盘）
- HTTP 路由仅回环放行（socket + Host + same-origin 三重栅栏）
- 写入前重解析校验 + temp/rename 原子写 + 首次写前自动备份（`cordis.patch.yml.bak-mcpmgr`）

### 安装

```sh
dsh plugin --profile web add link:D:/dsh_space/dsh_plugins/dsh-mcp-plugin
```

然后重启一次 DSH（bundle 列表变更需要重启）；之后改代码只需 `pnpm run build` + 刷新页面。

### 卸载

```sh
dsh plugin --profile web remove @local/mcp-manager
```

### 构建 / 测试

```sh
pnpm install
pnpm run build      # esbuild 打包浏览器半边 → lib/client.js（host 半边免构建）
pnpm test           # node --test：补丁编辑往返 + 路由集成（15 用例）
pnpm run typecheck  # tsc --noEmit（strict）
```

### 架构

```
浏览器半边（React，/plugins/<id>/client.js）
  └─ settings.section 插槽 → 「MCP 服务」页
       └─ 文档相对路径 fetch（同源）
            ▼
宿主半边（cordis 插件，exports "."）
  ├─ /mcp-manager/list|add|update|remove|set-enabled（回环栅栏 + HMR 串行化）
  ├─ 补丁文档 CST 编辑（yaml parseDocument，保注释/保 !!js）
  └─ ctx.loader.entries() → fiber 实时状态
       ▼
~/.dsh/profiles/web/cordis.patch.yml（HMR 监听 → MCP 服务器热重载）
```

### 已知边界

- `!!js` 字段在 UI 中一经编辑即变为字面量（有「表达式」徽章提示）
- bundle 层来源的 MCP 行只读（可禁用，不可删除/编辑）
- 不支持 serverName 改名（删除后新增）

License: MIT

---

<a id="english"></a>

## English

**@local/mcp-manager** — a dual-face DeepSeek Harness (DSH) web plugin that adds an "MCP Servers" page to the settings panel for managing every MCP server of the current profile.

- **List** with live fiber status (active / loading / pending / failed / disabled) and error summaries
- **Add / edit / remove / enable / disable** servers; edits replace the whole row config
- Changes are written to `~/.dsh/profiles/web/cordis.patch.yml` and **hot-reload live** — no restart
- Surgical CST editing keeps untouched comments and `!!js` expressions byte-identical (test-enforced); expression values are passed through verbatim so resolved secrets never land on disk
- Routes are loopback-only; every write is re-parse verified and atomically renamed, with a one-time `.bak-mcpmgr` backup

Install: `dsh plugin --profile web add link:D:/dsh_space/dsh_plugins/dsh-mcp-plugin`, then restart DSH once. Build with `pnpm run build`; test with `pnpm test`.
