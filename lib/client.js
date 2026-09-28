window.__ModuleLoader__.load({
	id: "@local/mcp-manager",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
"use strict";
var __mcp_manager_exports__ = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/client/index.tsx
  var index_exports = {};
  __export(index_exports, {
    NS: () => NS,
    apply: () => apply,
    inject: () => inject
  });

  // src/client/api.ts
  function isJsExpr(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value) && typeof value.__js === "string" && Object.keys(value).length === 1;
  }
  var TRANSPORT_ERROR = { code: "unavailable", message: "mcp-manager route unavailable" };
  async function post(path, payload) {
    let response;
    try {
      response = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch {
      return { ok: false, error: TRANSPORT_ERROR };
    }
    try {
      const envelope = await response.json();
      if (typeof envelope !== "object" || envelope === null) return { ok: false, error: TRANSPORT_ERROR };
      const record = envelope;
      if (record.ok === true) return { ok: true, value: record.value };
      const error = record.error;
      return { ok: false, error: error ?? TRANSPORT_ERROR };
    } catch {
      return { ok: false, error: TRANSPORT_ERROR };
    }
  }
  var mcpApi = {
    list() {
      return post("mcp-manager/list", {});
    },
    add(config) {
      return post("mcp-manager/add", { config });
    },
    update(id, config) {
      return post("mcp-manager/update", { id, config });
    },
    remove(id) {
      return post("mcp-manager/remove", { id });
    },
    setEnabled(id, enabled) {
      return post("mcp-manager/set-enabled", { id, enabled });
    }
  };

  // src/client/section.tsx
  var import_react2 = __require("react");

  // src/client/server-dialog.tsx
  var import_react = __require("react");
  var import_jsx_runtime = __require("react/jsx-runtime");
  var ARG_EXPR_PREFIX = "!!js: ";
  var SERVER_NAME_RE = /^[A-Za-z0-9_-]{1,32}$/;
  var S = {
    form: {
      marginTop: 10,
      padding: "12px 14px",
      borderRadius: 8,
      border: "1px solid rgba(128,128,128,0.3)",
      display: "grid",
      gridTemplateColumns: "150px minmax(0, 1fr)",
      gap: "10px 12px",
      alignItems: "start"
    },
    label: { fontSize: 12.5, fontWeight: 600, paddingTop: 6 },
    hint: { fontSize: 11.5, opacity: 0.6, marginTop: 3, lineHeight: 1.4 },
    input: {
      font: "inherit",
      fontSize: 12.5,
      width: "100%",
      boxSizing: "border-box",
      padding: "5px 8px",
      borderRadius: 6,
      border: "1px solid rgba(128,128,128,0.35)",
      background: "transparent",
      color: "inherit"
    },
    area: {
      font: "inherit",
      fontSize: 12.5,
      width: "100%",
      boxSizing: "border-box",
      padding: "5px 8px",
      borderRadius: 6,
      border: "1px solid rgba(128,128,128,0.35)",
      background: "transparent",
      color: "inherit",
      fontFamily: "var(--dsw-font-mono, ui-monospace, monospace)",
      resize: "vertical"
    },
    pairRow: { display: "flex", gap: 6, marginBottom: 6, alignItems: "center" },
    pairKey: { flex: "0 0 180px" },
    pairValue: { flex: 1 },
    exprBadge: {
      fontSize: 10.5,
      padding: "1px 6px",
      borderRadius: 4,
      whiteSpace: "nowrap",
      border: "1px solid #c98a1b",
      color: "#c98a1b",
      flexShrink: 0
    },
    btn: {
      font: "inherit",
      fontSize: 12.5,
      padding: "4px 10px",
      borderRadius: 6,
      cursor: "pointer",
      border: "1px solid rgba(128,128,128,0.35)",
      background: "transparent",
      color: "inherit"
    },
    btnPrimary: {
      font: "inherit",
      fontSize: 12.5,
      padding: "4px 14px",
      borderRadius: 6,
      cursor: "pointer",
      border: "1px solid transparent",
      background: "#3b6ef5",
      color: "#fff"
    },
    row: { display: "flex", gap: 8, alignItems: "center" },
    radioRow: { display: "flex", gap: 14, paddingTop: 6 },
    radio: { display: "flex", gap: 5, alignItems: "center", fontSize: 12.5 },
    actions: { display: "flex", gap: 8, justifyContent: "flex-end", gridColumn: "1 / -1", marginTop: 4 },
    title: { fontSize: 15, fontWeight: 600, margin: 0, gridColumn: "1 / -1" },
    check: { display: "flex", gap: 6, alignItems: "center", fontSize: 12.5, paddingTop: 6 }
  };
  function argsToText(value) {
    if (!Array.isArray(value)) return "";
    return value.map((item) => typeof item === "string" ? item : isJsExpr(item) ? ARG_EXPR_PREFIX + item.__js : "").join("\n");
  }
  function textToArgs(text) {
    return text.split("\n").map((line) => line.trimEnd()).filter((line) => line.trim() !== "").map((line) => line.startsWith(ARG_EXPR_PREFIX) ? { __js: line.slice(ARG_EXPR_PREFIX.length) } : line);
  }
  function pairsToRecord(pairs) {
    const meaningful = pairs.filter((pair) => pair.key.trim() !== "");
    if (meaningful.length === 0) return void 0;
    const record = {};
    for (const pair of meaningful) record[pair.key.trim()] = pair.value;
    return record;
  }
  function recordToPairs(value) {
    if (typeof value !== "object" || value === null) return [];
    return Object.entries(value).map(([key, item]) => ({
      key,
      value: isJsExpr(item) ? item.__js : String(item ?? ""),
      expr: isJsExpr(item)
    }));
  }
  function ServerDialog(props) {
    const { t, mode, server, busy, onSave, onCancel } = props;
    const config = server?.config;
    const [transport, setTransport] = (0, import_react.useState)(
      config?.transport === "streamable-http" ? "streamable-http" : "stdio"
    );
    const [serverName, setServerName] = (0, import_react.useState)(typeof config?.serverName === "string" ? config.serverName : "");
    const [command, setCommand] = (0, import_react.useState)(typeof config?.command === "string" ? config.command : "");
    const [argsText, setArgsText] = (0, import_react.useState)(argsToText(config?.args));
    const [cwd, setCwd] = (0, import_react.useState)(typeof config?.cwd === "string" ? config.cwd : "");
    const [envPairs, setEnvPairs] = (0, import_react.useState)(recordToPairs(config?.env));
    const [url, setUrl] = (0, import_react.useState)(typeof config?.url === "string" ? config.url : "");
    const [headerPairs, setHeaderPairs] = (0, import_react.useState)(recordToPairs(config?.headers));
    const [timeoutText, setTimeoutText] = (0, import_react.useState)(
      typeof config?.toolCallTimeoutMs === "number" ? String(config.toolCallTimeoutMs) : ""
    );
    const [failOnStartup, setFailOnStartup] = (0, import_react.useState)(config?.failOnStartupError === true);
    const [formError, setFormError] = (0, import_react.useState)("");
    const isEdit = mode === "edit";
    const title = isEdit ? t("formEditTitle") : t("formAddTitle");
    const canSave = (0, import_react.useMemo)(() => {
      if (busy) return false;
      if (!isEdit && !SERVER_NAME_RE.test(serverName)) return false;
      if (transport === "stdio") return command.trim() !== "";
      return url.trim() !== "";
    }, [busy, isEdit, serverName, transport, command, url]);
    const save = () => {
      setFormError("");
      if (!isEdit && !SERVER_NAME_RE.test(serverName)) {
        setFormError(t("formServerNameHint"));
        return;
      }
      if (transport === "stdio" && command.trim() === "") {
        setFormError(t("formCommand"));
        return;
      }
      if (transport === "streamable-http" && url.trim() === "") {
        setFormError(t("formUrl"));
        return;
      }
      const next = {
        transport,
        // serverName is immutable in edit mode; the original value is preserved.
        serverName: isEdit ? String(config?.serverName ?? "") : serverName
      };
      if (transport === "stdio") {
        next.command = command.trim();
        const args = textToArgs(argsText);
        if (args.length > 0) next.args = args;
        const env = pairsToRecord(envPairs);
        if (env !== void 0) next.env = env;
        if (cwd.trim() !== "") next.cwd = cwd.trim();
      } else {
        next.url = url.trim();
        const headers = pairsToRecord(headerPairs);
        if (headers !== void 0) next.headers = headers;
      }
      const timeout = Number(timeoutText);
      if (timeoutText.trim() !== "" && Number.isFinite(timeout) && timeout > 0) next.toolCallTimeoutMs = timeout;
      if (failOnStartup) next.failOnStartupError = true;
      onSave(next);
    };
    const pairEditor = (pairs, setPairs, valueLabel) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
      pairs.map((pair, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: S.pairRow, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            style: { ...S.input, ...S.pairKey },
            value: pair.key,
            placeholder: "KEY",
            onChange: (event) => {
              const next = pairs.slice();
              next[index] = { ...pair, key: event.target.value };
              setPairs(next);
            }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            style: { ...S.input, ...S.pairValue },
            value: pair.value,
            placeholder: valueLabel,
            title: pair.expr ? t("formExprHint") : void 0,
            onChange: (event) => {
              const next = pairs.slice();
              next[index] = { key: pair.key, value: event.target.value, expr: false };
              setPairs(next);
            }
          }
        ),
        pair.expr && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: S.exprBadge, children: t("formExprBadge") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            style: S.btn,
            onClick: () => setPairs(pairs.filter((_, i) => i !== index)),
            children: "\xD7"
          }
        )
      ] }, index)),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { type: "button", style: S.btn, onClick: () => setPairs([...pairs, { key: "", value: "", expr: false }]), children: [
        "+ ",
        t("formAddPair")
      ] })
    ] });
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: S.form, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { style: S.title, children: title }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: S.label, children: t("formTransport") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: S.radioRow, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: S.radio, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "input",
            {
              type: "radio",
              name: "mcpmgr-transport",
              checked: transport === "stdio",
              disabled: busy,
              onChange: () => setTransport("stdio")
            }
          ),
          t("transportStdio")
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: S.radio, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "input",
            {
              type: "radio",
              name: "mcpmgr-transport",
              checked: transport === "streamable-http",
              disabled: busy,
              onChange: () => setTransport("streamable-http")
            }
          ),
          t("transportHttp")
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: S.label, children: [
        t("formServerName"),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: S.hint, children: isEdit ? `mcp__${String(config?.serverName ?? "")}__*` : t("formServerNameHint") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "input",
        {
          style: S.input,
          value: serverName,
          disabled: isEdit || busy,
          spellCheck: false,
          placeholder: "web-search-prime",
          onChange: (event) => setServerName(event.target.value)
        }
      ),
      transport === "stdio" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: S.label, children: t("formCommand") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            style: S.input,
            value: command,
            disabled: busy,
            spellCheck: false,
            placeholder: "npx",
            onChange: (event) => setCommand(event.target.value)
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: S.label, children: [
          t("formArgs"),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: S.hint, children: t("formArgsHint") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "textarea",
          {
            style: { ...S.area, minHeight: 56 },
            value: argsText,
            disabled: busy,
            spellCheck: false,
            onChange: (event) => setArgsText(event.target.value)
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: S.label, children: [
          t("formEnv"),
          " ",
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: S.hint, children: [
            "(",
            t("optionalField"),
            ")"
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: pairEditor(envPairs, setEnvPairs, "VALUE") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: S.label, children: [
          t("formCwd"),
          " ",
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: S.hint, children: [
            "(",
            t("optionalField"),
            ")"
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            style: S.input,
            value: cwd,
            disabled: busy,
            spellCheck: false,
            onChange: (event) => setCwd(event.target.value)
          }
        )
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: S.label, children: t("formUrl") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            style: S.input,
            value: url,
            disabled: busy,
            spellCheck: false,
            placeholder: "https://example.com/mcp",
            onChange: (event) => setUrl(event.target.value)
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: S.label, children: [
          t("formHeaders"),
          " ",
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: S.hint, children: [
            "(",
            t("optionalField"),
            ")"
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: pairEditor(headerPairs, setHeaderPairs, "VALUE") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: S.label, children: [
        t("formTimeout"),
        " ",
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: S.hint, children: [
          "(",
          t("optionalField"),
          ")"
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "input",
        {
          style: S.input,
          value: timeoutText,
          disabled: busy,
          inputMode: "numeric",
          onChange: (event) => setTimeoutText(event.target.value.replace(/[^\d]/g, ""))
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: S.label, children: [
        t("formFailOnStartup"),
        " ",
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: S.hint, children: [
          "(",
          t("optionalField"),
          ")"
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { style: S.check, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "input",
        {
          type: "checkbox",
          checked: failOnStartup,
          disabled: busy,
          onChange: (event) => setFailOnStartup(event.target.checked)
        }
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: S.actions, children: [
        formError !== "" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: "#d64545", fontSize: 12.5, marginRight: "auto" }, children: formError }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: S.btn, disabled: busy, onClick: onCancel, children: t("cancel") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: S.btnPrimary, disabled: !canSave, onClick: save, children: busy ? t("saving") : t("save") })
      ] })
    ] });
  }

  // src/client/section.tsx
  var import_jsx_runtime2 = __require("react/jsx-runtime");
  var S2 = {
    root: { padding: "4px 2px", fontSize: 13, color: "inherit", minWidth: 0 },
    head: { display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" },
    title: { fontSize: 18, fontWeight: 600, margin: 0 },
    subtitle: { margin: "6px 0 14px", opacity: 0.7, lineHeight: 1.5 },
    grow: { flex: 1 },
    btn: {
      font: "inherit",
      fontSize: 12.5,
      padding: "4px 10px",
      borderRadius: 6,
      cursor: "pointer",
      border: "1px solid rgba(128,128,128,0.35)",
      background: "transparent",
      color: "inherit"
    },
    btnPrimary: {
      font: "inherit",
      fontSize: 12.5,
      padding: "4px 12px",
      borderRadius: 6,
      cursor: "pointer",
      border: "1px solid transparent",
      background: "#3b6ef5",
      color: "#fff"
    },
    btnDanger: {
      font: "inherit",
      fontSize: 12.5,
      padding: "4px 10px",
      borderRadius: 6,
      cursor: "pointer",
      border: "1px solid rgba(214,69,69,0.55)",
      background: "transparent",
      color: "#d64545"
    },
    btnRow: { display: "flex", gap: 6, justifyContent: "flex-end" },
    notice: {
      margin: "10px 0",
      padding: "6px 10px",
      borderRadius: 6,
      fontSize: 12.5,
      background: "rgba(59,110,245,0.12)",
      border: "1px solid rgba(59,110,245,0.35)"
    },
    error: {
      margin: "10px 0",
      padding: "6px 10px",
      borderRadius: 6,
      fontSize: 12.5,
      background: "rgba(214,69,69,0.10)",
      border: "1px solid rgba(214,69,69,0.4)",
      color: "#d64545"
    },
    table: { width: "100%", borderCollapse: "collapse", marginTop: 8 },
    th: {
      textAlign: "left",
      fontWeight: 600,
      fontSize: 12,
      opacity: 0.65,
      padding: "6px 8px",
      borderBottom: "1px solid rgba(128,128,128,0.25)",
      whiteSpace: "nowrap"
    },
    td: {
      padding: "8px",
      borderBottom: "1px solid rgba(128,128,128,0.15)",
      verticalAlign: "top"
    },
    target: { fontFamily: "var(--dsw-font-mono, ui-monospace, monospace)", fontSize: 12, wordBreak: "break-all" },
    badge: (color) => ({
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      whiteSpace: "nowrap",
      fontSize: 12,
      padding: "2px 8px",
      borderRadius: 999,
      border: `1px solid ${color}55`,
      background: `${color}18`
    }),
    dot: (color) => ({ width: 7, height: 7, borderRadius: 999, background: color, flexShrink: 0 }),
    bundleTag: {
      marginLeft: 6,
      fontSize: 10.5,
      padding: "1px 6px",
      borderRadius: 4,
      border: "1px solid rgba(128,128,128,0.4)",
      opacity: 0.75,
      whiteSpace: "nowrap"
    },
    empty: { padding: "28px 0", textAlign: "center", opacity: 0.6 }
  };
  function statusColor(status) {
    switch (status) {
      case "active":
        return "#2e9e5b";
      case "failed":
        return "#d64545";
      case "loading":
        return "#c98a1b";
      default:
        return "#8a8f98";
    }
  }
  var RELOAD_BACKOFF_MS = [1200, 3e3, 5500];
  function McpSection(props) {
    const { t, list, add, update, remove, setEnabled } = props;
    const [state, setState] = (0, import_react2.useState)({ loading: true, error: "", servers: [] });
    const [notice, setNotice] = (0, import_react2.useState)("");
    const [actionError, setActionError] = (0, import_react2.useState)("");
    const [dialog, setDialog] = (0, import_react2.useState)(null);
    const [confirmId, setConfirmId] = (0, import_react2.useState)("");
    const [busy, setBusy] = (0, import_react2.useState)(false);
    const timers = (0, import_react2.useRef)([]);
    const confirmTimer = (0, import_react2.useRef)(void 0);
    const load = (0, import_react2.useCallback)(async () => {
      const result = await list();
      if (result.ok) {
        setState({ loading: false, error: "", servers: result.value.servers });
      } else {
        setState({ loading: false, error: result.error.message, servers: [] });
      }
    }, [list]);
    const scheduleReloads = (0, import_react2.useCallback)(() => {
      for (const ms of RELOAD_BACKOFF_MS) {
        timers.current.push(setTimeout(() => {
          void load();
        }, ms));
      }
    }, [load]);
    (0, import_react2.useEffect)(() => {
      void load();
      const onFocus = () => {
        void load();
      };
      window.addEventListener("focus", onFocus);
      return () => {
        window.removeEventListener("focus", onFocus);
        for (const timer of timers.current) clearTimeout(timer);
        timers.current = [];
        if (confirmTimer.current !== void 0) clearTimeout(confirmTimer.current);
      };
    }, [load]);
    const run = (0, import_react2.useCallback)(async (work) => {
      setBusy(true);
      setActionError("");
      try {
        const result = await work();
        if (!result.ok) {
          setActionError(`${t("errTitle")}: ${result.error.message}`);
          return false;
        }
        setNotice(t("saved"));
        scheduleReloads();
        return true;
      } finally {
        setBusy(false);
      }
    }, [t, scheduleReloads]);
    const onRemove = (0, import_react2.useCallback)((server) => {
      if (confirmId !== server.id) {
        setConfirmId(server.id);
        if (confirmTimer.current !== void 0) clearTimeout(confirmTimer.current);
        confirmTimer.current = setTimeout(() => setConfirmId(""), 4e3);
        return;
      }
      setConfirmId("");
      setNotice("");
      void run(() => remove(server.id));
    }, [confirmId, remove, run]);
    const onToggle = (0, import_react2.useCallback)((server) => {
      setNotice("");
      void run(() => setEnabled(server.id, !server.enabled));
    }, [setEnabled, run]);
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: S2.root, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: S2.head, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { style: S2.title, children: t("title") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: S2.grow }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", style: S2.btn, onClick: () => {
          void load();
        }, children: t("refresh") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", style: S2.btnPrimary, onClick: () => setDialog({ mode: "add" }), children: t("add") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { style: S2.subtitle, children: t("subtitle") }),
      notice !== "" && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: S2.notice, children: notice }),
      actionError !== "" && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: S2.error, children: actionError }),
      state.error !== "" && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: S2.error, children: [
        t("loadFailed"),
        ": ",
        state.error,
        " ",
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", style: S2.btn, onClick: () => {
          void load();
        }, children: t("retry") })
      ] }),
      dialog !== null ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        ServerDialog,
        {
          t,
          mode: dialog.mode,
          server: dialog.mode === "edit" ? dialog.server : null,
          busy,
          onSave: (config) => {
            const work = dialog.mode === "edit" ? () => update(dialog.server.id, config) : () => add(config);
            void (async () => {
              const ok = await run(work);
              if (ok) setDialog(null);
            })();
          },
          onCancel: () => setDialog(null)
        }
      ) : state.loading ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: S2.empty, children: "\u2026" }) : state.servers.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: S2.empty, children: t("empty") }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("table", { style: S2.table, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { style: S2.th, children: t("colName") }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { style: S2.th, children: t("colTransport") }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { style: S2.th, children: t("colTarget") }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { style: S2.th, children: t("colStatus") }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { style: S2.th, children: t("colActions") })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("tbody", { children: state.servers.map((server) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("td", { style: { ...S2.td, whiteSpace: "nowrap" }, children: [
            server.serverName === "" ? server.id : server.serverName,
            server.source === "bundle" && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: S2.bundleTag, children: t("sourceBundle") })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { style: { ...S2.td, whiteSpace: "nowrap" }, children: server.transport === "stdio" ? t("transportStdio") : t("transportHttp") }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("td", { style: { ...S2.td }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: S2.target, children: server.target }),
            server.status === "failed" && server.errorText !== "" && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { ...S2.target, color: "#d64545", marginTop: 4 }, children: server.errorText })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { style: { ...S2.td, whiteSpace: "nowrap" }, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { style: S2.badge(statusColor(server.status)), children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: S2.dot(statusColor(server.status)) }),
            t(`status${server.status[0].toUpperCase()}${server.status.slice(1)}`)
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { style: { ...S2.td }, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: S2.btnRow, children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "button",
              {
                type: "button",
                style: S2.btn,
                disabled: busy,
                onClick: () => {
                  setNotice("");
                  setDialog({ mode: "edit", server });
                },
                children: t("edit")
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", style: S2.btn, disabled: busy, onClick: () => onToggle(server), children: server.enabled ? t("disable") : t("enable") }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "button",
              {
                type: "button",
                style: confirmId === server.id ? S2.btnDanger : S2.btn,
                disabled: busy,
                title: (server.source === "bundle" ? t("removeBundleNote") : t("confirmRemove")).replace("{name}", server.serverName || server.id),
                onClick: () => onRemove(server),
                children: confirmId === server.id ? `${t("remove")}?` : t("remove")
              }
            )
          ] }) })
        ] }, server.id)) })
      ] })
    ] });
  }

  // src/client/locales.ts
  var zh = {
    nav: "MCP \u670D\u52A1",
    title: "MCP \u670D\u52A1\u5668",
    subtitle: "\u7BA1\u7406\u672C profile \u7684 MCP \u670D\u52A1\u5668\u3002\u6539\u52A8\u5199\u5165 cordis.patch.yml \u5E76\u5373\u65F6\u70ED\u91CD\u8F7D\uFF0C\u65E0\u9700\u91CD\u542F\u3002",
    refresh: "\u5237\u65B0",
    add: "\u65B0\u589E\u670D\u52A1\u5668",
    empty: "\u5C1A\u672A\u914D\u7F6E\u4EFB\u4F55 MCP \u670D\u52A1\u5668\u3002",
    loadFailed: "\u52A0\u8F7D\u5931\u8D25",
    retry: "\u91CD\u8BD5",
    colName: "\u540D\u79F0",
    colTransport: "\u4F20\u8F93",
    colTarget: "\u76EE\u6807",
    colStatus: "\u72B6\u6001",
    colActions: "\u64CD\u4F5C",
    transportStdio: "\u672C\u5730\u8FDB\u7A0B",
    transportHttp: "HTTP",
    statusActive: "\u8FD0\u884C\u4E2D",
    statusLoading: "\u52A0\u8F7D\u4E2D",
    statusPending: "\u7B49\u5F85",
    statusFailed: "\u5931\u8D25",
    statusDisabled: "\u5DF2\u7981\u7528",
    sourceBundle: "bundle \u5C42",
    edit: "\u7F16\u8F91",
    remove: "\u5220\u9664",
    enable: "\u542F\u7528",
    disable: "\u7981\u7528",
    confirmRemove: '\u786E\u8BA4\u5220\u9664\u670D\u52A1\u5668 "{name}"\uFF1F\u6539\u52A8\u4F1A\u5199\u5165\u8865\u4E01\u6587\u4EF6\u5E76\u7ACB\u5373\u91CD\u8F7D\u3002',
    removeBundleNote: "\u8BE5\u884C\u6765\u81EA bundle \u5C42\uFF0C\u65E0\u6CD5\u79FB\u9664\uFF1B\u786E\u8BA4\u540E\u5C06\u6539\u4E3A\u5199\u5165\u7981\u7528\u8986\u76D6\u884C\u3002",
    saved: "\u5DF2\u5199\u5165\u8865\u4E01\u6587\u4EF6\uFF0C\u6B63\u5728\u7B49\u5F85\u70ED\u91CD\u8F7D\u2026",
    errTitle: "\u64CD\u4F5C\u5931\u8D25",
    formAddTitle: "\u65B0\u589E MCP \u670D\u52A1\u5668",
    formEditTitle: "\u7F16\u8F91 MCP \u670D\u52A1\u5668",
    formTransport: "\u4F20\u8F93\u7C7B\u578B",
    formServerName: "serverName",
    formServerNameHint: "1-32 \u4F4D\u5B57\u6BCD/\u6570\u5B57/\u4E0B\u5212\u7EBF/\u8FDE\u5B57\u7B26\uFF1B\u51B3\u5B9A\u5DE5\u5177\u540D\u524D\u7F00 mcp__<serverName>__*",
    formCommand: "\u542F\u52A8\u547D\u4EE4",
    formArgs: "\u542F\u52A8\u53C2\u6570",
    formArgsHint: "\u6BCF\u884C\u4E00\u4E2A\u53C2\u6570",
    formCwd: "\u5DE5\u4F5C\u76EE\u5F55",
    formEnv: "\u73AF\u5883\u53D8\u91CF",
    formUrl: "MCP \u7AEF\u70B9 URL",
    formHeaders: "\u8BF7\u6C42\u5934",
    formTimeout: "\u5DE5\u5177\u8C03\u7528\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09",
    formFailOnStartup: "\u542F\u52A8\u5931\u8D25\u65F6\u6302\u8F7D\u5931\u8D25",
    formAddPair: "\u6DFB\u52A0\u4E00\u9879",
    formExprBadge: "\u8868\u8FBE\u5F0F",
    formExprHint: "\u8BE5\u503C\u6765\u81EA !!js \u8868\u8FBE\u5F0F\uFF1B\u4FDD\u6301\u4E0D\u53D8\u5219\u539F\u6837\u4FDD\u7559\uFF0C\u4FEE\u6539\u540E\u5C06\u53D8\u4E3A\u5B57\u9762\u91CF\u3002",
    save: "\u4FDD\u5B58",
    cancel: "\u53D6\u6D88",
    saving: "\u4FDD\u5B58\u4E2D\u2026",
    optionalField: "\u53EF\u9009"
  };
  var en = {
    nav: "MCP Servers",
    title: "MCP Servers",
    subtitle: "Manage this profile's MCP servers. Changes are written to cordis.patch.yml and hot-reload live; no restart needed.",
    refresh: "Refresh",
    add: "Add server",
    empty: "No MCP servers configured.",
    loadFailed: "Load failed",
    retry: "Retry",
    colName: "Name",
    colTransport: "Transport",
    colTarget: "Target",
    colStatus: "Status",
    colActions: "Actions",
    transportStdio: "stdio",
    transportHttp: "HTTP",
    statusActive: "Active",
    statusLoading: "Loading",
    statusPending: "Pending",
    statusFailed: "Failed",
    statusDisabled: "Disabled",
    sourceBundle: "bundle layer",
    edit: "Edit",
    remove: "Remove",
    enable: "Enable",
    disable: "Disable",
    confirmRemove: 'Remove server "{name}"? The change is written to the patch file and hot-reloads immediately.',
    removeBundleNote: "This row comes from a bundle layer and cannot be removed; confirming writes a disabling override row instead.",
    saved: "Written to the patch file; waiting for hot reload\u2026",
    errTitle: "Operation failed",
    formAddTitle: "Add MCP server",
    formEditTitle: "Edit MCP server",
    formTransport: "Transport",
    formServerName: "serverName",
    formServerNameHint: "1-32 chars [A-Za-z0-9_-]; prefixes tool names as mcp__<serverName>__*",
    formCommand: "Command",
    formArgs: "Arguments",
    formArgsHint: "One argument per line",
    formCwd: "Working directory",
    formEnv: "Environment",
    formUrl: "MCP endpoint URL",
    formHeaders: "Headers",
    formTimeout: "Tool call timeout (ms)",
    formFailOnStartup: "Fail mount on startup error",
    formAddPair: "Add entry",
    formExprBadge: "expression",
    formExprHint: "This value comes from a !!js expression; leaving it untouched preserves it, editing turns it into a literal.",
    save: "Save",
    cancel: "Cancel",
    saving: "Saving\u2026",
    optionalField: "optional"
  };

  // src/client/index.tsx
  var NS = "mcp-manager";
  var inject = ["slots", "locale"];
  function apply(ctx) {
    ctx.effect(() => {
      try {
        return ctx.locale.register(NS, { zh, en });
      } catch {
        return () => {
        };
      }
    }, "mcp-manager: dictionaries");
    const t = ctx.locale.bind(NS);
    ctx.inject(["slots"], (scope) => {
      const slots = scope.slots;
      slots.inject("settings.section", () => slots.register(
        {
          name: "settings.section",
          id: "mcp-servers",
          order: 60,
          locale: NS,
          label: () => t("nav"),
          inject: () => ({
            list: mcpApi.list,
            add: mcpApi.add,
            update: mcpApi.update,
            remove: mcpApi.remove,
            setEnabled: mcpApi.setEnabled
          })
        },
        McpSection
      ));
    });
  }
  return __toCommonJS(index_exports);
})();
		module.exports.apply = __mcp_manager_exports__.apply;
		module.exports.inject = __mcp_manager_exports__.inject;
		return module.exports;
	}
});
//# sourceMappingURL=client.js.map
