/**
 * Per-window pi RPC host.
 *
 * Uses the official RpcClient, which spawns `node <pi> --mode rpc` and splits
 * stdout on `\n` only (attachJsonlLineReader). Do not parse this stream with readline.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const emptyCredentials = {
  configured: false,
  source: null,
  mask: null,
  providerId: null,
};

function packageRoot() {
  const indexPath = fileURLToPath(import.meta.resolve("@earendil-works/pi-coding-agent"));
  return join(dirname(indexPath), "..");
}

function fileExists(filePath) {
  try {
    return existsSync(filePath) && statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function isDirectory(filePath) {
  try {
    return statSync(filePath).isDirectory();
  } catch {
    return false;
  }
}

function bundledCli() {
  const root = packageRoot();
  for (const rel of ["dist/bundle/cli.js", "dist/cli.js"]) {
    const full = join(root, rel);
    if (fileExists(full)) return full;
  }
  return null;
}

function isNodeScript(filePath) {
  if (/\.(mjs|cjs|js)$/i.test(filePath)) return true;
  try {
    const head = readFileSync(filePath).subarray(0, 160).toString("utf8");
    return head.startsWith("#!") && head.includes("node");
  } catch {
    return false;
  }
}

function findOnPath(name) {
  const entries = (process.env.PATH || "").split(delimiter).filter(Boolean);
  for (const dir of entries) {
    const candidate = join(dir, name);
    if (fileExists(candidate)) return candidate;
  }
  return null;
}

/** Bundled package bin first, then a Node `pi` on PATH. `PI_CLI` overrides both. */
export function resolvePiCli() {
  const override = process.env.PI_CLI;
  if (override && fileExists(override)) return override;
  const bundled = bundledCli();
  if (bundled) return bundled;
  const onPath = findOnPath(process.platform === "win32" ? "pi.cmd" : "pi");
  if (onPath && isNodeScript(onPath)) return onPath;
  return null;
}

export function resolveProjectCwd() {
  const requested = process.env.PI_PROJECT_CWD;
  if (!requested) return { cwd: process.cwd(), warning: null };
  if (isDirectory(requested)) return { cwd: requested, warning: null };
  return { cwd: process.cwd(), warning: "PI_PROJECT_CWD 不是文件夹，已改用当前工作目录" };
}

function scrubSecrets(text) {
  return String(text)
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, "sk-…")
    .replace(
      /\b([A-Z0-9_]*(?:API_KEY|AUTH_TOKEN|SECRET|ACCESS_KEY|BEARER_TOKEN)[A-Z0-9_]*)(\s*[=:]\s*)(["']?)[^\s"',]{6,}/g,
      "$1$2$3…",
    )
    .slice(0, 4000);
}

function clip(value, max = 4000) {
  if (typeof value !== "string" || value.length === 0) return "";
  const clean = scrubSecrets(value);
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

/** Status, source, and a mask from AuthStorage / findEnvKeys. Never the key. */
export async function readCredentialStatus() {
  try {
    const { summaryProbe } = await import("./credentials.mjs");
    return await summaryProbe();
  } catch {
    return { ...emptyCredentials };
  }
}

function textFromContent(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  const parts = [];
  for (const part of content) {
    if (!part || typeof part !== "object") continue;
    if (part.type === "text" && typeof part.text === "string") parts.push(part.text);
  }
  return parts.join("\n");
}

function previewJson(value) {
  try {
    return clip(JSON.stringify(value), 500);
  } catch {
    return "";
  }
}

function contentIndexOf(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

export function toWireEvent(event) {
  if (!event || typeof event !== "object" || typeof event.type !== "string") return null;
  const type = event.type;
  if (type === "message_start" || type === "message_end") {
    const message = event.message && typeof event.message === "object" ? event.message : {};
    // Message text is streamed by text_delta; only forward the final error here.
    return {
      type,
      role: typeof message.role === "string" ? message.role : null,
      ...(type === "message_end" && message.stopReason === "error" && typeof message.errorMessage === "string"
        ? { errorMessage: clip(message.errorMessage, 1000) }
        : {}),
    };
  }
  if (type === "message_update") {
    const inner = event.assistantMessageEvent && typeof event.assistantMessageEvent === "object"
      ? event.assistantMessageEvent
      : {};
    if (inner.type !== "text_delta") return null;
    return {
      type,
      deltaKind: "text_delta",
      contentIndex: contentIndexOf(inner.contentIndex),
      delta: clip(typeof inner.delta === "string" ? inner.delta : "", 2000),
    };
  }
  if (type === "tool_execution_start" || type === "tool_execution_update" || type === "tool_execution_end") {
    const result = event.result ?? event.partialResult;
    const output = result && typeof result === "object" ? textFromContent(result.content) : "";
    return {
      type,
      toolName: typeof event.toolName === "string" ? event.toolName : "tool",
      toolCallId: typeof event.toolCallId === "string" ? event.toolCallId : "",
      argsPreview: previewJson(event.args),
      outputPreview: clip(output),
      isError: Boolean(event.isError),
    };
  }
  if (type === "agent_end") {
    return { type, willRetry: Boolean(event.willRetry) };
  }
  if (
    type === "agent_start" ||
    type === "agent_settled" ||
    type === "turn_start" ||
    type === "turn_end" ||
    type === "auto_retry_start" ||
    type === "auto_retry_end" ||
    type === "compaction_start" ||
    type === "compaction_end"
  ) {
    return { type };
  }
  return null;
}

function modelLabelFrom(state) {
  const model = state?.model;
  if (!model || typeof model !== "object") return null;
  const provider = typeof model.provider === "string" ? model.provider : "";
  const id = typeof model.id === "string" ? model.id : "";
  if (!provider || !id || provider === "unknown" || id === "unknown") return null;
  return `${provider}/${id}`;
}

function looksLikeAuth(text) {
  return /api[_ -]?key|no credentials|not configured|unauthorized|authentication|auth\.json|missing api/i.test(text);
}

export function disconnectedSnapshot(webContentsId, cwd = process.cwd()) {
  return {
    webContentsId,
    engine: "disconnected",
    pid: null,
    cwd,
    modelLabel: null,
    detail: null,
    credentials: { ...emptyCredentials },
    credentialsHref: "#/credentials",
  };
}

const CHATTING_EVENTS = new Set([
  "agent_start",
  "turn_start",
  "auto_retry_start",
  "compaction_start",
]);

const IDLE_CHECK_EVENTS = new Set([
  "turn_end",
  "agent_settled",
  "auto_retry_end",
  "compaction_end",
]);

const STREAM_POLL_MS = 1000;

export function createWindowSession({ webContentsId, cwd, cwdWarning, send, RpcClientCtor }) {
  let client = null;
  let activeSessionFile = null;
  let changingSession = false;
  let generation = 0;
  let stopping = false;
  let ready = false;
  let restarts = 0;
  let restartTimer = null;
  let pollTimer = null;
  let stateCheck = null;
  let stateCheckQueued = false;
  let queuedAllowIdle = false;
  let startPromise = null;
  let promptBusy = false;
  let engine = "reconnecting";
  let pid = null;
  let modelLabel = null;
  let detail = cwdWarning;
  let credentials = { ...emptyCredentials };

  function belongsToWorkspace(entry) {
    if (!entry.cwd) return true; // Older Pi session headers did not record cwd.
    const source = resolve(entry.cwd);
    const target = resolve(cwd);
    return process.platform === "win32" ? source.toLowerCase() === target.toLowerCase() : source === target;
  }

  function snapshot() {
    return {
      webContentsId,
      engine,
      pid,
      cwd,
      modelLabel,
      detail,
      credentials: { ...credentials },
      credentialsHref: "#/credentials",
    };
  }

  function publish() {
    try {
      send("rpc:status", snapshot());
    } catch {
      // IPC can throw if the frame was disposed between the destroyed check and send.
    }
  }

  function stopPoll() {
    if (!pollTimer) return;
    clearInterval(pollTimer);
    pollTimer = null;
  }

  function ensurePoll() {
    if (pollTimer || stopping) return;
    pollTimer = setInterval(() => {
      void syncStreaming({ allowIdle: true });
    }, STREAM_POLL_MS);
    if (typeof pollTimer.unref === "function") pollTimer.unref();
  }

  function applyStreamingState(state, allowIdle) {
    const streaming = Boolean(state?.isStreaming);
    const label = modelLabelFrom(state);
    if (label) modelLabel = label;
    if (streaming) {
      if (engine !== "disconnected") engine = "chatting";
      ensurePoll();
      publish();
      return;
    }
    if (allowIdle && engine === "chatting") {
      engine = "idle";
      promptBusy = false;
      if (detail === "正在重试模型请求") detail = null;
      stopPoll();
      publish();
    }
  }

  /**
   * Idle comes from `get_state.isStreaming === false`, not from `agent_end`.
   * `allowIdle` is false immediately after a prompt ack: streaming may not have flipped yet.
   */
  function syncStreaming({ allowIdle = true } = {}) {
    if (stopping || !client || !ready) return Promise.resolve();
    if (stateCheck) {
      stateCheckQueued = true;
      queuedAllowIdle = queuedAllowIdle || allowIdle;
      return stateCheck;
    }
    const gen = generation;
    const current = client;
    const permitIdle = allowIdle;
    stateCheck = (async () => {
      try {
        const state = await current.getState();
        if (gen !== generation || stopping || client !== current) return;
        applyStreamingState(state, permitIdle);
      } catch {
        // The next poll or boundary retries the check.
      } finally {
        stateCheck = null;
        if (stateCheckQueued && !stopping) {
          const nextAllow = queuedAllowIdle;
          stateCheckQueued = false;
          queuedAllowIdle = false;
          void syncStreaming({ allowIdle: nextAllow });
        }
      }
    })();
    return stateCheck;
  }

  function markChatting(nextDetail) {
    engine = "chatting";
    if (nextDetail !== undefined) detail = nextDetail;
    ensurePoll();
    publish();
  }

  function handleEvent(event) {
    const type = event?.type;
    if (CHATTING_EVENTS.has(type)) {
      markChatting(type === "auto_retry_start" ? "正在重试模型请求" : type === "agent_start" ? null : undefined);
    } else if (IDLE_CHECK_EVENTS.has(type)) {
      void syncStreaming({ allowIdle: true });
    }
    const wire = toWireEvent(event);
    if (!wire) return;
    try {
      send("rpc:event", wire);
    } catch {
      // Same as publish: a disposed frame must not fail the RPC session.
    }
  }

  function scheduleRestart() {
    stopPoll();
    promptBusy = false;
    if (stopping) return;
    if (restarts >= 1) {
      engine = "disconnected";
      pid = null;
      detail = "RPC 进程已退出";
      publish();
      return;
    }
    restarts += 1;
    engine = "reconnecting";
    pid = null;
    detail = "正在重新连接";
    publish();
    restartTimer = setTimeout(() => {
      restartTimer = null;
      if (!stopping) void start();
    }, 400);
  }

  async function runStart() {
    const gen = ++generation;
    stopPoll();
    promptBusy = false;
    engine = "reconnecting";
    ready = false;
    pid = null;
    publish();

    let RpcClient = RpcClientCtor;
    let creds;
    try {
      [RpcClient, creds] = await Promise.all([
        RpcClient ? Promise.resolve(RpcClient) : import("@earendil-works/pi-coding-agent").then((module) => module.RpcClient),
        readCredentialStatus(),
      ]);
    } catch (error) {
      if (gen !== generation || stopping) return;
      engine = "disconnected";
      detail = scrubSecrets(error instanceof Error ? error.message : String(error)).slice(0, 240);
      publish();
      return;
    }
    credentials = creds;
    if (gen !== generation || stopping) return;

    const cliPath = resolvePiCli();
    if (!cliPath) {
      engine = "disconnected";
      detail = "找不到 pi。安装依赖，或把 Node 版 pi 放到 PATH / PI_CLI。";
      publish();
      return;
    }

    const rpc = new RpcClient({
      cliPath,
      cwd,
      // Pi keeps its default per-working-directory JSONL files in the user's home directory.
      args: [
        ...(activeSessionFile && fileExists(activeSessionFile) ? ["--session", activeSessionFile] : ["--continue"]),
      ],
      env: {
        ...process.env,
        PI_SKIP_VERSION_CHECK: process.env.PI_SKIP_VERSION_CHECK ?? "1",
        PI_TELEMETRY: process.env.PI_TELEMETRY ?? "0",
      },
    });
    rpc.onEvent((event) => {
      if (gen !== generation || stopping) return;
      try {
        handleEvent(event);
      } catch (error) {
        detail = scrubSecrets(error instanceof Error ? error.message : String(error)).slice(0, 240);
        publish();
      }
    });

    try {
      await rpc.start();
      if (gen !== generation || stopping) {
        await rpc.stop();
        return;
      }
      client = rpc;
      pid = rpc.process?.pid ?? null;
      const child = rpc.process;
      child?.once("exit", () => {
        if (gen !== generation || stopping) return;
        client = null;
        pid = null;
        ready = false;
        scheduleRestart();
      });
      const state = await rpc.getState();
      if (gen !== generation || stopping) return;
      activeSessionFile = typeof state?.sessionFile === "string" ? state.sessionFile : null;
      modelLabel = modelLabelFrom(state);
      ready = true;
      restarts = 0;
      engine = state?.isStreaming ? "chatting" : "idle";
      detail = credentials.configured ? cwdWarning : "已连接。模型凭据未配置，发送前请打开凭据页。";
      publish();
    } catch (error) {
      if (gen !== generation || stopping) return;
      client = null;
      pid = null;
      ready = false;
      engine = "disconnected";
      const stderr = typeof rpc.getStderr === "function" ? rpc.getStderr() : "";
      const message = error instanceof Error ? error.message : String(error);
      detail = scrubSecrets(stderr || message).slice(0, 240);
      publish();
      try {
        await rpc.stop();
      } catch {
        // The child is already gone.
      }
    }
  }

  function start() {
    if (stopping) return Promise.resolve();
    if (startPromise) return startPromise;
    startPromise = runStart().finally(() => {
      startPromise = null;
    });
    return startPromise;
  }

  async function stop() {
    stopping = true;
    generation += 1;
    stopPoll();
    promptBusy = false;
    stateCheckQueued = false;
    queuedAllowIdle = false;
    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }
    const current = client;
    client = null;
    pid = null;
    ready = false;
    engine = "disconnected";
    detail = null;
    publish();
    if (current) await current.stop();
  }

  async function reloadMcp() {
    if (startPromise) await startPromise;
    if (stopping || changingSession || promptBusy || engine === "chatting") {
      return { ok: false, message: "请等待当前回答结束后再重载 MCP 工具" };
    }
    const current = client;
    generation += 1;
    client = null;
    ready = false;
    pid = null;
    stopPoll();
    if (current) {
      try { await current.stop(); } catch { /* Restart even if the old process already exited. */ }
    }
    await start();
    return { ok: ready, message: ready ? undefined : detail || "MCP 工具重载失败" };
  }

  async function prompt(message) {
    if (typeof message !== "string" || message.trim() === "") {
      return { ok: false, code: "empty" };
    }
    if (changingSession) return { ok: false, code: "error", message: "正在切换会话" };
    // Set before any await so a second send during this call is a steer, not another plain prompt.
    const steer = engine === "chatting" || promptBusy;
    promptBusy = true;
    const gen = generation;
    try {
      credentials = await readCredentialStatus();
      publish();
      if (!credentials.configured) {
        return { ok: false, code: "credentials", href: "#/credentials" };
      }
      if (changingSession) return { ok: false, code: "error", message: "正在切换会话" };
      if (!client || !ready || gen !== generation || stopping) {
        return { ok: false, code: "disconnected", message: detail || "引擎未连接" };
      }
      const trimmed = message.trim();
      let streaming = steer;
      if (!steer) {
        try {
          const state = await client.getState();
          if (gen !== generation || stopping || !client) {
            return { ok: false, code: "disconnected", message: detail || "引擎未连接" };
          }
          streaming = Boolean(state?.isStreaming);
          const label = modelLabelFrom(state);
          if (label) modelLabel = label;
        } catch {
          streaming = engine === "chatting";
        }
      }
      if (!client || gen !== generation) {
        return { ok: false, code: "disconnected", message: detail || "引擎未连接" };
      }
      // Steer is the mid-turn nudge. A plain prompt is rejected while isStreaming.
      markChatting(streaming ? undefined : null);
      const command = streaming
        ? { type: "prompt", message: trimmed, streamingBehavior: "steer" }
        : { type: "prompt", message: trimmed };
      const response = await client.send(command);
      if (!response?.success) {
        throw new Error(typeof response?.error === "string" ? response.error : "prompt failed");
      }
      void syncStreaming({ allowIdle: false });
      return { ok: true };
    } catch (error) {
      const messageText = scrubSecrets(error instanceof Error ? error.message : String(error)).slice(0, 240);
      if (looksLikeAuth(messageText)) {
        return { ok: false, code: "credentials", href: "#/credentials", message: messageText };
      }
      if (client && gen === generation) {
        detail = messageText;
        publish();
        void syncStreaming({ allowIdle: true });
      }
      return { ok: false, code: client ? "error" : "disconnected", message: messageText };
    } finally {
      if (engine !== "chatting") promptBusy = false;
    }
  }

  function setCredentials(probe) {
    if (!probe || typeof probe !== "object") return snapshot();
    credentials = {
      configured: Boolean(probe.configured),
      source: probe.source === "environment" || probe.source === "stored" ? probe.source : null,
      mask: typeof probe.mask === "string" ? probe.mask : null,
      providerId: typeof probe.providerId === "string" ? probe.providerId : null,
    };
    if (credentials.configured && typeof detail === "string" && detail.includes("凭据未配置")) {
      detail = cwdWarning;
    }
    publish();
    return snapshot();
  }

  async function setModel(provider, modelId) {
    if (!stopping && (!client || !ready)) {
      if (restartTimer) {
        clearTimeout(restartTimer);
        restartTimer = null;
      }
      restarts = 0;
      const alreadyStarting = Boolean(startPromise);
      await start();
      if (alreadyStarting && !stopping && (!client || !ready)) await start();
    }
    if (!client || !ready || stopping) {
      return { ok: false, code: "disconnected", message: detail || "引擎未连接" };
    }
    const response = await client.setModel(provider, modelId);
    const label = modelLabelFrom({ model: response }) || `${provider}/${modelId}`;
    modelLabel = label;
    publish();
    return { ok: true, provider: response?.provider || provider, id: response?.id || modelId, label };
  }

  async function abort() {
    if (!client || !ready || stopping) return { ok: false, message: detail || "引擎未连接" };
    if (engine !== "chatting" && !promptBusy) return { ok: true, idle: true };
    try {
      await client.abort();
      void syncStreaming({ allowIdle: true });
      return { ok: true };
    } catch (error) {
      return { ok: false, message: scrubSecrets(error instanceof Error ? error.message : String(error)).slice(0, 240) };
    }
  }

  /** Live model and thinking level, or null when the engine is not ready. */
  async function getThinkingState() {
    if (!client || !ready || stopping) return null;
    const current = client;
    const [state, levels] = await Promise.all([current.getState(), current.getAvailableThinkingLevels()]);
    if (current !== client || stopping) return null;
    const model = state?.model;
    return {
      providerId: typeof model?.provider === "string" ? model.provider : null,
      modelId: typeof model?.id === "string" ? model.id : null,
      contextWindow: typeof model?.contextWindow === "number" ? model.contextWindow : null,
      maxTokens: typeof model?.maxTokens === "number" ? model.maxTokens : null,
      levels: Array.isArray(levels) && levels.length ? levels : ["off"],
      thinkingLevel: typeof state?.thinkingLevel === "string" ? state.thinkingLevel : "off",
      live: true,
    };
  }

  async function setThinkingLevel(level) {
    if (!client || !ready || stopping) return { ok: false, code: "disconnected", message: detail || "引擎未连接" };
    await client.setThinkingLevel(level);
    return { ok: true };
  }

  async function listSessions() {
    const { SessionManager } = await import("@earendil-works/pi-coding-agent");
    const entries = await SessionManager.list(cwd);
    return entries.filter((entry) => entry.messageCount > 0 && belongsToWorkspace(entry)).map((entry) => ({
      id: entry.id,
      title: (entry.name || entry.firstMessage?.trim().split("\n")[0] || "未命名会话").slice(0, 120),
      modified: entry.modified.toISOString(),
      messageCount: entry.messageCount,
    }));
  }

  function historyMessages(messages) {
    const result = [];
    for (const message of messages) {
      if (message?.role === "user") {
        const text = textFromContent(message.content);
        if (text) result.push({ role: "user", text });
      } else if (message?.role === "assistant" && Array.isArray(message.content)) {
        const content = [];
        for (const part of message.content) {
          if (part?.type === "text" && typeof part.text === "string") {
            content.push({ type: "text", text: part.text });
          } else if (part?.type === "toolCall") {
            content.push({
              type: "toolCall",
              id: typeof part.id === "string" ? part.id : "",
              name: typeof part.name === "string" ? part.name : "tool",
              args: previewJson(part.arguments),
            });
          }
        }
        if (content.length) result.push({ role: "assistant", content });
      } else if (message?.role === "toolResult") {
        result.push({
          role: "toolResult",
          toolCallId: typeof message.toolCallId === "string" ? message.toolCallId : "",
          text: clip(textFromContent(message.content)),
          isError: Boolean(message.isError),
        });
      }
    }
    return result;
  }

  async function getSessionView() {
    if (startPromise) await startPromise;
    if (!client || !ready || stopping) return { ok: false, message: detail || "引擎未连接" };
    const current = client;
    const [state, messages] = await Promise.all([current.getState(), current.getMessages()]);
    if (current !== client || stopping) return { ok: false, message: "会话已断开" };
    activeSessionFile = typeof state?.sessionFile === "string" ? state.sessionFile : null;
    const nextModelLabel = modelLabelFrom(state);
    if (nextModelLabel !== modelLabel) {
      modelLabel = nextModelLabel;
      publish();
    }
    return {
      ok: true,
      sessionId: typeof state?.sessionId === "string" ? state.sessionId : null,
      messages: historyMessages(messages),
    };
  }

  async function changeSession(sessionId) {
    if (changingSession || promptBusy || engine === "chatting") {
      return { ok: false, message: "请等待当前回答结束后再切换会话" };
    }
    if (!client || !ready || stopping) return { ok: false, message: detail || "引擎未连接" };
    changingSession = true;
    try {
      const state = await client.getState();
      if (state?.isStreaming) return { ok: false, message: "请等待当前回答结束后再切换会话" };
      if (sessionId !== null && sessionId === state?.sessionId) return getSessionView();
      let result;
      if (sessionId === null) {
        result = await client.newSession();
      } else {
        if (typeof sessionId !== "string") return { ok: false, message: "无效的会话" };
        const { SessionManager } = await import("@earendil-works/pi-coding-agent");
        const available = await SessionManager.list(cwd);
        const target = available.find((entry) => entry.id === sessionId && belongsToWorkspace(entry));
        if (!target) return { ok: false, message: "会话不存在或不属于当前工作区" };
        result = await client.switchSession(target.path);
      }
      if (result?.cancelled) return { ok: false, message: "会话切换已取消" };
      return getSessionView();
    } catch (error) {
      return { ok: false, message: scrubSecrets(error instanceof Error ? error.message : String(error)).slice(0, 240) };
    } finally {
      changingSession = false;
    }
  }

  return {
    start,
    stop,
    prompt,
    snapshot,
    setCredentials,
    setModel,
    abort,
    getThinkingState,
    setThinkingLevel,
    listSessions,
    getSessionView,
    changeSession,
    reloadMcp,
    isStopping: () => stopping,
  };
}
