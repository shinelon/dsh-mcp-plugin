# AGENTS.md — dsh-mcp-plugin

> 本文件面向在本仓库工作的 AI Agent 与开发者，描述项目定位、结构、机制与开发/验证约定。

## 项目概述

- **插件名**：`@local/mcp-manager`（v1.0.0，private，ESM，双面插件）
- **目录名**：`dsh-mcp-plugin`（与包名不同属有意为之，勿混用）
- **定位**：DeepSeek Harness（DSH）Web 端设置面板插件，管理当前 profile 的全部 MCP 服务器
- **核心能力**：
  - 设置面板新增「MCP 服务」页（`settings.section` 插槽，id `mcp-servers`）
  - 列表：serverName / 传输类型 / 目标 / 启用状态 / 运行状态（active/loading/pending/failed/disabled，来自 loader fiber）
  - 新增、编辑（整配置替换）、删除（bundle 行降级为禁用覆盖行）、启用/禁用
  - 改动写入 `~/.dsh/profiles/web/cordis.patch.yml`，靠 HMR 即时热重载，无需重启 DSH
- **形态**：host 半边（纯 JS，免构建）+ 浏览器半边（TSX，esbuild 打包）

## 仓库结构

| 文件 | 性质 | 说明 |
| --- | --- | --- |
| `package.json` | 手写 | 双面清单：exports `"."`/`"./client"`、`dsh.bundle.patch`、`dsh.client` |
| `cordis.patch.yml` | 手写 | bundle 补丁：插入 `id: mcp-manager` 行 |
| `src/host/*.js` | 手写 | 宿主半边：路由 / 补丁编辑 / 校验 / 回环栅栏 |
| `src/client/*` | 手写 | 浏览器半边 TSX：设置页 / 表单 / 词典 / API |
| `build.mjs` | 手写 | esbuild 打包 client，banner/footer 生成 `__ModuleLoader__` 工厂包裹 |
| `lib/client.js` | **构建产物** | 由 build.mjs 生成，勿手改 |
| `test/fixture.patch.yml` | 手写 | 脱敏的仿真实补丁 fixture（含注释、`!!js`、注释行） |
| `test/*.test.mjs` | 手写 | node:test 单测 + 路由集成测试 |

## 机制速查（修改前必读）

- **MCP 服务器 = 补丁行**：`name: '@deepseek-ai/dsh-mcp-client'` 的行（`id: mcp-<serverName>`）。列表数据源 = 补丁文档原始视图 ⋈ `ctx.loader.entries()` 的 fiber 状态。
- **补丁编辑铁律**：`yaml` 包 `parseDocument` + CST 手术式改节点（未触及行注释/格式逐字保留）；`!!js` 标签经 `customTags` 解析、`{__js}` 标记透传重建；写前 `serializeVerified` 重解析校验；写时 temp+rename 原子替换；进程内首次写前留 `.bak-mcpmgr` 备份。
- **`!!js` 值是禁区也是遗产**：解析后的标量仍是 `Scalar` 节点（`pair.key` 也是），取值必须解包（见 `toView`）；env/headers 的 `!!js` 值必须原样透传，绝不能把 env 解析结果写回文件（泄密+固化）。
- **写入串行化**：所有写操作过 `ctx.get('hmr')?.runExclusive(fn)`（与官方 ConfigEditor 同款），无 hmr 则直接执行。
- **客户端注册链**（对齐官方 settings-models）：`ctx.locale.register(NS, {zh, en})` → `const t = ctx.locale.bind(NS)` → `ctx.slots.inject("settings.section", () => ctx.slots.register({name, id, order: 60, locale: NS, label: () => t("nav"), inject}, McpSection))`。
- **client bundle**：`window.__ModuleLoader__.load({id: "<包名>", factory: (require) => {...return module.exports}})`；react / react-dom / react/jsx-runtime 必须 external（factory 的 `require` 供宿主副本，打包第二份 React 会坏 hooks）；UI 表单不使用 modal portal，采用列表/表单原位切换，规避设置面板 z-index 问题。
- **HTTP 面**：`/mcp-manager` 前缀路由，回环栅栏（socket + Host + sec-fetch-site/Origin）先行，JSON envelope `{ok,value}|{ok:false,error:{code,message}}`；客户端 fetch 用**文档相对路径**（无前导斜杠）。
- **serverName 不可变**：update 拒绝改 serverName（决定 `mcp__<serverName>__*` 工具前缀）；改名 = 删除后新增。

## 开发循环

```bash
pnpm install        # esbuild 已加入 allowBuilds（pnpm-workspace.yaml）
pnpm run build      # 产出 lib/client.js（host 半边免构建）
pnpm test           # node --test：15 个用例（补丁编辑往返 + 路由集成）
pnpm run typecheck  # tsc --noEmit（client TSX，strict）
```

- 插件以 `link:` 方式装在 web profile（`dsh plugin --profile web add link:D:/dsh_space/dsh_plugins/dsh-mcp-plugin`），重建后刷新页面即生效；bundle 列表变更才需要重启 DSH。
- host 半边是纯 JS：改完 `node --check` + `pnpm test` 即可，浏览器半边需重新 build + 刷新页面。

## 验证（完成前必做）

1. `pnpm run typecheck && pnpm test && pnpm run build` 全部实际执行并确认输出；
2. 改动补丁编辑逻辑时，`test/patch-editor.test.mjs` 的「未触及行逐字保留」断言必须仍然全绿（防注释/`!!js` 丢失回归）;
3. GUI 手动验收：设置 → MCP 服务页可见；列表与 `~/.dsh/profiles/web/cordis.patch.yml` 一致；新增一台指向不存在命令的 stdio 服务器 → 状态转 failed → 删除；对 github 行禁用/启用后恢复原状；
4. 补丁文件人工 diff：操作前后未触及区域逐字一致（自动化已覆盖，人工抽查兜底）。

## 已知边界

- 补丁文件被其他进程/手工并发编辑时依赖 HMR 串行化 + 重解析校验兜底，不做文件锁（官方 ConfigEditor 同水平）。
- `!!js` 字段在 UI 中编辑即变字面量（有徽章提示）；这是设计决定而非缺陷。
- 不支持编辑 bundle 层来源的 MCP 行（只读 + 禁用覆盖）；不支持 serverName 改名（删除重建）。
