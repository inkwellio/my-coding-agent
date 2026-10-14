# Pi desktop shell

Electron workspace for the Pi coding agent. The shell includes the main workspace, diff review, commit history, settings, onboarding, model credentials, and the branch switcher. Copy and layout follow the Stitch screens. Conversation sessions and credentials use Pi's local storage.

The target architecture below is locked. This slice wires the per-window RPC loop and a real credentials page over Pi AuthStorage. Command isolation can now be enabled per window in Settings → Permissions.

## Architecture

### Agent engine

Each Electron window talks to **pi-coding-agent** in RPC mode. The main process `spawn`s `pi --mode rpc` and uses the official **RpcClient** over stdin/stdout JSONL. v1 stays on that path. Experimental pi-server and Chord are out of v1.

Closing a window kills that RPC child; the conversation remains in Pi's session store. Engine status is scoped per window (`webContentsId`).

### Sandbox

Command isolation uses [`@anthropic-ai/sandbox-runtime`](https://github.com/anthropics/sandbox-runtime), pinned to `0.0.78`. In the desktop window, open **Settings → Permissions → 启用沙盒**. It is off by default; the current window keeps its choice until it closes. Switching workspaces carries the enabled policy to the new workspace with a fresh runtime.

The Pi extension replaces the `bash` backend (and `powershell` on Windows), including user Bash commands. The built-in terminal starts a separate isolated shell. Each Pi/terminal process owns its runtime and proxy lifecycle. Commands are launched using `wrapWithSandboxArgv()` and `shell: false`, preserve streaming output, and terminate on abort or timeout. The renderer receives status through IPC and never supplies sandbox policy or executable paths.

The workspace and a dedicated temporary directory are writable; the runtime also grants its required device and temporary paths. External writes are restricted. The network allowlist is empty, so shell commands cannot access the internet. Sensitive credential paths, project `.env` files, agent configuration, and this app's execution code are protected. Shell children receive a limited environment without model keys or host startup hooks. Model API requests stay in the Pi host process, outside command isolation.

**Scope:** command execution only. Pi's native file-editing tools, Git UI operations, and MCP servers are outside this sandbox. UI copy says 「沙盒」. This command sandbox is separate from Electron's Chromium renderer sandbox; `ELECTRON_NO_SANDBOX` only affects Chromium.

macOS uses the system sandbox. Linux needs Bubblewrap, socat, and ripgrep, with working user namespaces; install them using your system package manager. Windows support is alpha and needs the runtime's system account and network filter components. **安装沙盒组件** opens a cancelable confirmation and UAC flow; nothing is installed automatically. Windows currently permits sandboxed windows for one workspace at a time because the runtime shares a sandbox account. Sandbox initialization uses native system commands and does not require Git Bash. Executing Bash commands requires native Git Bash; PowerShell tools and the built-in cmd terminal can run without it. WSL and Docker are not required.

If the app reports a missing sandbox package, run `npm install` in the project directory using your desktop operating system (Windows PowerShell for a Windows app), then fully quit and restart Electron. Declaring dependencies or updating only the lockfile does not install them. If npm reports `EAI_AGAIN` or `ENOTFOUND`, resolve the registry connection/DNS issue and retry. This npm dependency step is separate from the Windows **安装沙盒组件** system setup.

Enable/disable waits for an idle engine, restarts its RPC process while preserving the selected session, and restarts an open terminal. The host requires an authenticated readiness notification from the extension after an actual isolated command succeeds. Initialization or wrapping failure blocks commands; it never silently executes them outside the requested sandbox. Normal RPC startup has a 30-second deadline; sandbox activation has a 90-second deadline and its validation command has a 10-second timeout. Failure is shown in the workspace and settings. Cleanup after a failed startup never triggers an automatic reconnect; an established connection gets at most one retry for rapid repeated exits. Escape during activation requests cancellation. Browser-only previews retain sample states; URL query parameters cannot enable isolation in Electron.

```bash
npm run test:sandbox             # Policy and lifecycle smoke tests using an injected runtime
npm run test:sandbox:integration # Actual OS restrictions; requires installed runtime and system dependencies
npm run test:rpc-reconnect       # Failed startup cleanup, deadlines, retry limits, and Windows without Git Bash
```

### Credentials

The main process is a thin wrap over Pi **AuthStorage** (`~/.pi/agent/auth.json`). `ModelRuntime.login` / `logout` / `checkAuth` persist through that store. Keys stay out of the renderer and out of `settings.json`. IPC returns a mask, a source, and a status only.

### Packaging

The app bundles a standalone `pi`, built with build-binaries, into `extraResources`. There is no forced WSL or Docker dependency.

### Phasing

1. UI shell first. Done.
2. Credentials IPC. `#/credentials` lists every built-in provider that accepts a single API key, and can save or clear that key.
3. Real RpcClient spawn. The minimal per-window loop (spawn, `get_state`, `prompt`, stream, stop) is in.
4. Optional command sandbox. Available through Settings → Permissions, with live state and Windows installation flow.

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

Each window’s main process owns one session, keyed by `webContentsId`. Opening the window spawns pi, calls `get_state`, and drives the workspace status-bar engine chip (`空闲 · 已连接`, `对话中`, `重连中`, `已断开`). Sending from the workspace composer calls `prompt` and streams assistant text, tool events, and turn boundaries into the session. Closing the window ends that RPC session and kills that child.

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

Auth stays in the main process. The host wraps Pi `AuthStorage` (`~/.pi/agent/auth.json`). An API-key save calls `AuthStorage.modify(providerId, fn)`, and `fn` returns `{ "type": "api_key", "key": "..." }`. The file is keyed by the pi-ai provider id, so DeepSeek is `auth.json` → `deepseek`. `checkAuth` runs after that write. A clear calls `logout`, which deletes the stored credential (an OAuth credential written by the Pi CLI is removed the same way). The renderer never receives the key.

IPC:

| Method | Channel | Returns |
| --- | --- | --- |
| `listProviders` | `credentials:listProviders` | id, name, auth flags, model ids. No secrets. |
| `getStatus` | `credentials:getStatus` | mask, source, status per provider |
| `saveApiKey` | `credentials:saveApiKey` | mask, source, status after save |
| `clear` | `credentials:clear` | the same triple |
There is no `retrySave`. A failed save leaves the key in the password field; saving again calls `saveApiKey`.

Provider ids and auth flags come from pi-ai’s built-in registry (`ModelRuntime.getProviders()`, fed by `builtinProviders()`). Model ids come from `ModelRegistry.getAll()` over that same runtime. Nothing on this page is a hand-copied vendor list. Each provider’s `auth.apiKey.login` / `auth.oauth.login` decides the flags: single-secret API key, OAuth, both, or `authFlow: "multi-step"`. The page shows only providers with a single-secret API key. OAuth-only providers such as `openai-codex`, and multi-step providers such as Amazon Bedrock, Google Vertex, and Cloudflare, are not listed; sign in to those with the Pi CLI. Every listed provider is saved with the same `AuthStorage.modify(providerId, …)` call.

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

Env keys still work. Provider status checks `findEnvKeys` and reports the variable name only. DeepSeek’s variable is `DEEPSEEK_API_KEY`:

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
| Branch switcher | [#/branch](http://127.0.0.1:5173/#/branch) |
| Commit history | [#/history](http://127.0.0.1:5173/#/history) |

Inside the window:

- **提交更改** opens the current workspace's Git review. Select files to stage, inspect their diffs, enter a commit message, and commit the staged files locally. The action does not push.
- **设置** opens preferences. **模型与计算** and the primary model row open credentials.
- **打开文件夹** opens the native directory picker in Electron, or the onboarding page in a browser preview.
- The branch badge in the title bar, and **Git: &lt;branch&gt;** on the status bar, open the branch switcher over the current page. It lists local and remote branches from the workspace repository. Picking a local branch switches to it, picking a remote branch checks it out as a local tracking branch, and typing a new name offers to create it from the current branch. With uncommitted changes it asks first: switch carrying the changes (Git refuses on conflicts), or stash them and switch. **拉取远程 (Fetch)** runs `git fetch --all --prune`. Switching is refused while the agent is running.
- **历史** in the title bar opens the commit history of the current branch, or of any local or remote branch picked from the selector. Selecting a commit shows its message, file stats, and patch.
## Status bar

Workspace, diff, history, and settings share a 24px footer with up to three chips, each shown only when its data is available:

| Chip | Shows |
| --- | --- |
| Git | The current branch, `✓` when the worktree is clean or `*` with uncommitted changes. Opens the branch switcher. Hidden outside a Git repository. |
| 引擎 · RPC | The live session: 空闲 · 已连接 / 对话中 / 重连中 / 已断开. Electron only. |
| 沙盒 | **沙盒 · 未启用**, **沙盒 · 正在启用**, or **沙盒 · 命令隔离**. Opens Settings → Permissions. Electron only. |

Press Escape during **正在启用** to request cancellation. Credentials uses its own frame without this footer.
