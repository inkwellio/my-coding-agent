# Pi desktop shell

Electron workspace for the Pi coding agent. The shell includes the main workspace, diff review, settings, onboarding, model-credential states, and the branch switcher. Copy and layout follow the Stitch screens. Conversation sessions and credentials use Pi's local storage; some git and review screens still use placeholders.

The target architecture below is locked. This slice wires the per-window RPC loop and a real credentials page over Pi AuthStorage. The sandbox is still not enabled.

## Architecture

### Agent engine

Each Electron window talks to **pi-coding-agent** in RPC mode. The main process `spawn`s `pi --mode rpc` and uses the official **RpcClient** over stdin/stdout JSONL. v1 stays on that path. Experimental pi-server and Chord are out of v1.

Closing a window kills that RPC child; the conversation remains in Pi's session store. Engine status is scoped per window (`webContentsId`).

### Sandbox

Command isolation uses Anthropic’s sandbox, `@anthropic-ai/sandbox-runtime` (ASRT). That package is the cross-platform path for v1. Windows support is alpha. The UAC install is optional and cancelable. The sandbox is not built into Pi by default.

UI chrome never shows the package names ASRT, srt, or Gondolin. Product copy says 「沙盒」.

Scope for now is `bash` / command isolation. The workspace stays writable. The sandbox blocks writes outside the workspace and casual egress.

Capability is `unsupported`, `available`, or `enabled`. Windows is not hardcoded as `unsupported`.

### Credentials

The main process is a thin wrap over Pi **AuthStorage** (`~/.pi/agent/auth.json`). `ModelRuntime.login` / `logout` / `checkAuth` persist through that store. Keys stay out of the renderer and out of `settings.json`. IPC returns a mask, a source, and a status only.

### Packaging

The app bundles a standalone `pi`, built with build-binaries, into `extraResources`. There is no forced WSL or Docker dependency.

### Phasing

1. UI shell first. Done.
2. Credentials IPC. `#/credentials` lists every built-in provider and can save, clear, detect env keys, and start OAuth. The screen is no longer a static mock.
3. Real RpcClient spawn. The minimal per-window loop (spawn, `get_state`, `prompt`, stream, stop) is in.
4. Optional ASRT enable flow. Not in this slice.

## Requirements

- Node.js 22.19+
- npm 10+

## Install

```bash
cd my-coding-agent
npm install
```

## Run

Development (Vite renderer + Electron window):

```bash
npm run dev
```

Renderer only, in a browser at `http://127.0.0.1:5173`:

```bash
npm run dev:web
```

Production build, then Electron:

```bash
npm start
```

`npm start` compiles the renderer into `dist/` and opens it in a frameless window. The traffic lights close, minimize, and maximize that window.

On Linux containers where Chromium’s sandbox cannot start, launch with:

```bash
ELECTRON_NO_SANDBOX=1 npm run dev
```

That flag also turns off the renderer sandbox so the preload bridge can load. A normal desktop launch keeps the renderer sandboxed.

## RPC engine

### MCP services

Open **Settings → Extensions & MCP** in the desktop window to add a local stdio command or a Streamable HTTP endpoint. A stdio server takes an executable, one argument per line, and optional `KEY=VALUE` environment variables. An HTTP server takes a URL and optional request headers. Choose a tool exposure mode; `codemode` is the default. **Test connection** runs Pi's `mcp list --json` command.

The UI edits Pi's user-level `~/.pi/agent/mcp.json` (or `$PI_CODING_AGENT_DIR/mcp.json`). Existing Electron `mcp-servers.json` entries are migrated on first use and the old file is renamed `.migrated`. Pi handles MCP connections, codemode tool exposure, OAuth, and reconnection. Configuration changes restart idle RPC sessions; if a chat is running, reload tools after the response finishes. `npm run test:mcp` checks configuration and migration.

Each window’s main process owns one session, keyed by `webContentsId`. Opening the window spawns pi, calls `get_state`, and drives the workspace status-bar engine chip (`空闲 · 已连接`, `对话中`, `重连中`, `已断开`). Sending from the workspace composer calls `prompt` and streams assistant text, tool events, and turn boundaries into the session. Closing the window ends that RPC session and kills that child. The `#/engine` page stays a visual spec; its chips are not the live session.

Assistant text is assembled only from `message_update` events whose `assistantMessageEvent.type` is `text_delta`. Chunks are stored by `contentIndex` and joined in index order. The new protocol has no cumulative `message` snapshot on `message_update`, and this shell does not read one from `message_start` or `message_end` either.

The chip stays on `对话中` across `agent_end`. A retry or compaction can follow that event. It returns to idle when `turn_end` (or `agent_settled`) is followed by `get_state.isStreaming === false`, and a one-second poll repeats that check while a turn is open.

Sending again while a turn is in flight calls `prompt` with `streamingBehavior: "steer"`. Steer is the mid-turn nudge: pi delivers it after the current assistant turn’s tool calls and before the next model request. A plain `prompt` (no `streamingBehavior`) is only used when `get_state` says the session is not streaming; without the field, a second `prompt` fails. The composer stays enabled during `对话中` so that nudge can be sent. It is disabled only while the engine is reconnecting.

The client is the official `RpcClient` from `@earendil-works/pi-coding-agent`. It spawns `node <pi> --mode rpc` and splits stdout on `\n` only. That is the same entry as the package `pi` bin. This code does not use Node `readline` to frame JSONL.

pi resolution, in order:

1. `PI_CLI` — absolute or cwd-relative path to a Node entry (the package bin, or a local fixture).
2. The bundled bin from the dependency: `node_modules/@earendil-works/pi-coding-agent/dist/bundle/cli.js`.
3. A `pi` on `PATH` whose file is a Node script (shebang or `.js` / `.mjs` / `.cjs`).

`RpcClient` always launches that file with `node`, so a standalone bun binary is not a valid `PI_CLI` here. Packaging a build-binaries `pi` into `extraResources` is a later step.

The initial working directory is `PI_PROJECT_CWD` when that path is a folder, otherwise the process cwd (`npm run dev` from `my-coding-agent` uses that folder). The title bar's folder button adds a directory with the native picker; the sidebar lists added workspaces and switches the active RPC session between them. Workspace paths and the last active path are kept in Electron's user-data `workspaces.json`. Each Pi child starts with `--continue` and uses Pi's default session storage under the user's `~/.pi/agent/sessions/` directory, grouped by working directory. Session files are not written into the project.

### Credentials

Auth stays in the main process. The host wraps Pi `AuthStorage` (`~/.pi/agent/auth.json`). An API-key save calls `AuthStorage.modify(providerId, fn)`, and `fn` returns `{ "type": "api_key", "key": "..." }`. The file is keyed by the pi-ai provider id, so DeepSeek is `auth.json` → `deepseek`. `checkAuth` runs after that write. Clears and OAuth logout call `logout`, which deletes the stored credential. OAuth login still goes through `ModelRuntime.login`, which persists with the same `modify` path. The renderer never receives the key.

IPC:

| Method | Channel | Returns |
| --- | --- | --- |
| `listProviders` | `credentials:listProviders` | id, name, auth flags, model ids. No secrets. |
| `getStatus` | `credentials:getStatus` | mask, source, status per provider |
| `saveApiKey` | `credentials:saveApiKey` | mask, source, status after save |
| `clear` | `credentials:clear` | the same triple |
| `startOAuth` / `logoutOAuth` | `credentials:startOAuth`, `credentials:logoutOAuth` | the same triple, plus `credentials:oauth-event` (`opened` / `waiting` / `success` / `error`) |
| `detectEnv` | `credentials:detectEnv` | provider id and env var **names** from `findEnvKeys` |

There is no `retrySave`. A failed save leaves the key in the password field; saving again calls `saveApiKey`.

Provider ids and auth flags come from pi-ai’s built-in registry (`ModelRuntime.getProviders()`, fed by `builtinProviders()`). Model ids come from `ModelRegistry.getAll()` over that same runtime. Nothing on this page is a hand-copied vendor list. Each provider’s `auth.apiKey.login` / `auth.oauth.login` decides the flags: single-secret API key, OAuth, both, or `authFlow: "multi-step"`. `openai-codex` is OAuth-only. Amazon Bedrock, Google Vertex, and the Cloudflare providers are multi-step and stay disabled on this page. OAuth is offered for every provider whose auth object has an OAuth login (Anthropic, OpenAI Codex, GitHub Copilot, OpenRouter, xAI, Kimi, Radius, Meta, and any later registry entry). Every single-secret provider is saved with the same `AuthStorage.modify(providerId, …)` call.

A stored API key is masked to `••••` plus the last four characters (shorter values stay `••••`). OAuth is `oauth ••••`. An environment key is reported by variable name only, for example `DEEPSEEK_API_KEY`. If nothing is configured, the composer links to `#/credentials` and does not call `prompt`. After a successful save the main process pushes `credentials:status`, and the workspace gate clears without restarting the window.

#### DeepSeek V4 Flash

DeepSeek is provider id `deepseek` (not `deepseek-chat`). The readable label is **DeepSeek V4 Flash**. The subtitle is the pair resolved from `ModelRegistry` for that provider: prefer model id `deepseek-flash`, otherwise the first model whose name contains “Flash”. On the installed `@earendil-works/pi-ai@0.87.1` catalog that resolves to **`deepseek/deepseek-flash`**. `deepseek-v4-flash` is a relay-catalog id (OpenRouter and similar) and is not sent to provider `deepseek`. The DeepSeek card uses the Stitch resting states: 未配置, 已保存 (stored key), and 校验失败 (check or save error). In-progress still uses 验证与保存中, and an env key still uses 来自环境变量.

In the desktop window:

1. Open `#/credentials`.
2. Find **DeepSeek** (search “DeepSeek”).
3. Paste the API key and choose **保存密钥**. The card switches to 来自本地 and shows only the mask. The key is in `~/.pi/agent/auth.json` as `{ "deepseek": { "type": "api_key", "key": "sk-..." } }`, not in `settings.json` and not in the IPC result.
4. That save also calls RPC `set_model` with the resolved pair. On this install that is `{ type: "set_model", provider: "deepseek", modelId: "deepseek-flash" }` via `RpcClient.setModel`, and writes `defaultProvider` / `defaultModel` through Pi `SettingsManager`. The workspace chip follows that selection. It does not stop at React state.

`AuthStorage` is not exported from the package index. This app imports `AuthStorage` from `dist/core/auth-storage.js`. `modify(provider, fn)` matches current upstream: `fn` receives the current credential and returns the next one (`undefined` leaves the file unchanged). The on-disk object is `{ [providerId]: credential }`.

`RpcClient.setModel(provider, modelId)` sends `{ type: "set_model", provider, modelId }`. The RPC handler looks the model up with `modelRuntime.getAvailableSnapshot()`, then calls `session.setModel(model)`.

`set_model` looks the model up on provider `deepseek` with `modelRuntime.getAvailableSnapshot()`. This app asks `ModelRegistry.getAll()` for provider `deepseek`, prefers id `deepseek-flash`, and otherwise takes a model whose name contains “Flash”.

Env keys still work. `重新检测 ENV` calls `detectEnv` → `findEnvKeys` and reports the variable name only. DeepSeek’s variable is `DEEPSEEK_API_KEY`:

```bash
DEEPSEEK_API_KEY=sk-... npm run dev
```

The same path recognizes every variable `findEnvKeys` knows (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, and the rest of the pi-ai map). The child inherits the environment. Do not put keys in `settings.json` or in the renderer.

`node scripts/credentials-smoke.mjs` checks the registry, a masked DeepSeek save, and that `settings.json` does not contain the key. It uses a temporary `PI_CODING_AGENT_DIR`.

`@earendil-works/pi-coding-agent` asks for Node `>=22.19`. This shell still runs the bundled CLI on the Node that is on `PATH` (the same `node` `RpcClient` spawns).

### Smoke without a model key

`get_state` connects with no key; the chip goes idle and the composer explains how to open credentials. A real streamed model reply needs a configured provider.

To exercise the stream UI without a key, point `PI_CLI` at the fixture (it speaks a few JSONL events and does not call a provider):

```bash
PI_CLI=scripts/pi-rpc-fixture.mjs ELECTRON_NO_SANDBOX=1 npm run dev
```

The fixture is not the engine. Quit that session before using a real `pi`.

## Pages

Routes are hashes, so they work in the browser and in the Electron window.

| Page | Open |
| --- | --- |
| Main workspace | [http://127.0.0.1:5173/#/](http://127.0.0.1:5173/#/) |
| Diff review | [#/diff](http://127.0.0.1:5173/#/diff) |
| Settings | [#/settings](http://127.0.0.1:5173/#/settings) |
| Onboarding | [#/onboarding](http://127.0.0.1:5173/#/onboarding) |
| Model credentials | [#/credentials](http://127.0.0.1:5173/#/credentials) |
| Branch switcher, dirty worktree | [#/branch](http://127.0.0.1:5173/#/branch) |
| Branch switcher, clean | [#/branch?dirty=0](http://127.0.0.1:5173/#/branch?dirty=0) |
| Status bar spec | [#/status](http://127.0.0.1:5173/#/status) |
| Engine status | [#/engine](http://127.0.0.1:5173/#/engine) |

Inside the window:

- **提交更改** opens the current workspace's Git review. Select files to stage, inspect their diffs, enter a commit message, and commit the staged files locally. The action does not push.
- **设置** opens preferences. **模型与计算** and the primary model row open credentials.
- **打开文件夹** opens the project picker. A recent project returns to the workspace.
- The **main** badge in the title bar, and the branch chip on the status bar, open the branch switcher. It opens on the dirty worktree from the HTML export. `#/branch?dirty=0` hides that warning. A real search string still works (`?dirty=0#/branch`). **刷新** toggles the warning. The chip stays `main*`.
- **已消耗 4.2k tokens** on the workspace footer opens the status-bar spec. **延迟 24ms** opens the engine status screen. **Git: main** and the title-bar branch chip open the branch switcher.

## Status bar

Workspace, diff, and settings use the 24px footer from those screens: `Git: main ✓ | Pi Engine: v2.4 (Ready) | 权限: 自动执行 (安全模式)`. In the Electron window that middle chip follows the live RPC session instead. Credentials uses its own footer (`凭据存储: 本地 AuthStorage 就绪`). The branch screen uses `⎇ main`, and the same live chip when the shell is connected.

`#/engine` uses the taller status bar: four engine chips at once, plus a sandbox chip.

| Chip | States |
| --- | --- |
| 引擎 · RPC | 空闲 · 已连接 / 对话中 / 重连中 / 已断开. Each chip keeps the subtitle 每窗口独立进程. Click one to mark it active. |
| 沙盒 | Grey **沙盒 · 未启用**, in-progress **沙盒 · 正在启用**, or bright **沙盒 · 命令隔离**. |

Click the sandbox chip to cycle the stub. Press Escape during **正在启用** to return to grey **沙盒 · 未启用**. That cancel does not open a dialog. Hover the chip while it is on for the 沙盒隔离策略 note. `#/engine?policy=1` (or `?policy=1`) opens that note when the sandbox is on. The default is idle and sandbox off.

Query overrides live in the hash, and the same keys in `location.search` still apply. A hash key wins when both set it.

```text
#/engine?engine=chatting&sandbox=off
#/engine?engine=reconnecting&sandbox=enabling
#/engine?engine=disconnected
#/engine?sandbox=on&policy=1
```

`engine` is `idle`, `chatting`, `reconnecting`, or `disconnected`. `sandbox` is `off`, `enabling`, or `on`. Changing the hash re-reads `engine`, `sandbox`, `dirty`, and `policy` without a reload.
