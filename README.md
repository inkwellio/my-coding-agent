[X：@hunter_jia228](https://x.com/hunter_jia228)

# Pi 桌面应用外壳

基于 Electron 的 Pi 编程代理工作区。应用包含主工作区、差异审查、提交历史、设置、首次使用引导、模型凭据和分支切换器。文案和布局遵循 Stitch 设计稿。对话会话和凭据使用 Pi 的本地存储。

以下目标架构已确定。当前阶段已接入每个窗口独立的 RPC 循环，以及基于 Pi AuthStorage 的真实凭据页面。现在可以在「设置 → 权限」中为每个窗口启用命令隔离。

## 架构

### 代理引擎

每个 Electron 窗口都通过 RPC 模式与 **pi-coding-agent** 通信。主进程通过 `spawn` 启动 `pi --mode rpc`，并使用官方 **RpcClient**，通过标准输入／标准输出传输 JSONL。v1 将继续采用此方案，不包含实验性的 pi-server 和 Chord。

关闭窗口会终止对应的 RPC 子进程；对话仍保存在 Pi 的会话存储中。引擎状态按窗口（`webContentsId`）独立管理。

### 沙盒

命令隔离使用 [`@anthropic-ai/sandbox-runtime`](https://github.com/anthropics/sandbox-runtime)，版本固定为 `0.0.78`。在桌面窗口中打开 **设置 → 权限 → 启用沙盒**。沙盒默认关闭；当前窗口会保留所选状态，直到窗口关闭。切换工作区时，已启用的策略会应用到新工作区，并创建新的运行时。

Pi 扩展会替换 `bash` 后端（Windows 上还包括 `powershell`），用户执行的 Bash 命令也包含在内。内置终端会启动独立的隔离 Shell。每个 Pi／终端进程分别管理自己的运行时和代理生命周期。命令通过 `wrapWithSandboxArgv()` 和 `shell: false` 启动，保留流式输出，并在中止或超时时终止。渲染进程通过 IPC 接收状态，不能提供沙盒策略或可执行文件路径。

工作区和专用临时目录允许写入；运行时还会放行其必需的设备路径和临时路径。外部写入受到限制。网络允许列表为空，因此 Shell 命令无法访问互联网。敏感凭据路径、项目 `.env` 文件、代理配置和本应用的执行代码均受到保护。Shell 子进程仅接收受限环境变量，不包含模型密钥或宿主环境的启动钩子。模型 API 请求由 Pi 宿主进程发起，不受命令隔离约束。

**适用范围：**仅限命令执行。Pi 原生文件编辑工具、Git 界面操作和 MCP 服务器不在此沙盒范围内。界面文案统一使用「沙盒」。此命令沙盒与 Electron 的 Chromium 渲染进程沙盒相互独立；`ELECTRON_NO_SANDBOX` 仅影响 Chromium。

macOS 使用系统沙盒。Linux 需要安装 Bubblewrap、socat 和 ripgrep，并确保用户命名空间可用；请使用系统包管理器安装这些依赖。Windows 支持处于 alpha 阶段，需要运行时提供的系统账户和网络过滤组件。**安装沙盒组件**会打开可取消的确认和 UAC 授权流程，不会自动安装任何组件。由于运行时共享一个沙盒账户，Windows 目前同一时间只允许一个工作区使用启用沙盒的窗口。沙盒初始化使用原生系统命令，不需要 Git Bash。执行 Bash 命令需要原生 Git Bash；PowerShell 工具和内置 cmd 终端无需 Git Bash 即可运行。不需要 WSL 或 Docker。

如果应用提示缺少沙盒包，请在桌面操作系统的项目目录中运行 `npm install`（Windows 应用应使用 Windows PowerShell），然后完全退出并重新启动 Electron。仅声明依赖或更新锁文件不会安装依赖。如果 npm 报告 `EAI_AGAIN` 或 `ENOTFOUND`，请解决软件源连接或 DNS 问题后重试。这一步 npm 依赖安装与 Windows 的 **安装沙盒组件** 系统配置是两个独立步骤。

启用或禁用沙盒会等待引擎空闲，然后在保留所选会话的情况下重启 RPC 进程，并重启已打开的终端。宿主进程要求扩展在实际成功执行一条隔离命令后，发送经过身份验证的就绪通知。初始化或命令包装失败会阻止命令执行，绝不会在已请求沙盒的情况下静默绕过沙盒执行。普通 RPC 启动的时限为 30 秒；沙盒激活的时限为 90 秒，验证命令的超时为 10 秒。失败信息会显示在工作区和设置中。启动失败后的清理不会触发自动重连；对于已建立的连接，如果短时间内反复退出，最多重试一次。激活期间按 Escape 可请求取消。仅浏览器预览保留示例状态；URL 查询参数无法在 Electron 中启用隔离。

```bash
npm run test:sandbox             # 使用注入的运行时进行策略和生命周期冒烟测试
npm run test:sandbox:integration # 验证真实操作系统限制；需要安装运行时和系统依赖
npm run test:rpc-reconnect       # 验证启动失败清理、时限、重试上限及 Windows 无 Git Bash 的情况
```

### 凭据

主进程对 Pi **AuthStorage**（`~/.pi/agent/auth.json`）进行轻量封装。`ModelRuntime.login` / `logout` / `checkAuth` 通过该存储持久化凭据。密钥不会进入渲染进程，也不会写入 `settings.json`。IPC 仅返回脱敏值、来源和状态。

### 打包

应用会将通过 build-binaries 构建的独立 `pi` 打包到 `extraResources` 中。不强制依赖 WSL 或 Docker。

### 实施阶段

1. 优先完成界面外壳。已完成。
2. 凭据 IPC。`#/credentials` 列出所有支持单个 API 密钥的内置提供商，并支持保存或清除密钥。
3. 启动真实 RpcClient。已实现每个窗口的最小交互循环（启动、`get_state`、`prompt`、流式输出、停止）。
4. 可选命令沙盒。可通过「设置 → 权限」启用，提供实时状态和 Windows 安装流程。

## 环境要求

- Node.js 22.19+
- npm 10+

## 安装

```bash
cd my-coding-agent
npm install
```

## 运行

开发模式（Vite 渲染界面 + Electron 窗口）：

```bash
npm run dev
```

仅启动渲染界面，在浏览器中访问 `http://127.0.0.1:5173`：

```bash
npm run dev:web
```

构建生产版本后启动 Electron：

```bash
npm start
```

`npm start` 会将渲染界面编译到 `dist/`，并在无边框窗口中打开。窗口上的交通灯式按钮用于关闭、最小化和最大化窗口。

在 Chromium 沙盒无法启动的 Linux 容器中，使用以下方式启动：

```bash
ELECTRON_NO_SANDBOX=1 npm run dev
```

该标志也会关闭渲染进程沙盒，以便加载预加载桥接。正常桌面启动时，渲染进程仍处于沙盒中。

## RPC 引擎

### MCP 服务

在桌面窗口中打开 **设置 → 扩展与 MCP**，添加本地 stdio 命令或 Streamable HTTP 端点。stdio 服务器需要指定可执行文件、每行一个的参数，以及可选的 `KEY=VALUE` 环境变量。HTTP 服务器需要指定 URL 和可选的请求头。选择工具暴露模式，默认使用 `codemode`。**测试连接**会运行 Pi 的 `mcp list --json` 命令。

界面编辑的是 Pi 用户级配置 `~/.pi/agent/mcp.json`（或 `$PI_CODING_AGENT_DIR/mcp.json`）。现有 Electron `mcp-servers.json` 中的条目会在首次使用时迁移，旧文件会重命名并添加 `.migrated` 后缀。Pi 负责处理 MCP 连接、codemode 工具暴露、OAuth 和重连。配置变更会重启空闲的 RPC 会话；如果对话正在进行，请在响应结束后重新加载工具。`npm run test:mcp` 用于检查配置和迁移。

主进程为每个窗口管理一个会话，以 `webContentsId` 为标识。打开窗口时会启动 pi，调用 `get_state`，并更新工作区状态栏的引擎状态标签（`空闲 · 已连接`、`对话中`、`重连中`、`已断开`）。从工作区输入框发送消息会调用 `prompt`，并将助手文本、工具事件和轮次边界流式写入会话。关闭窗口会结束该 RPC 会话并终止对应的子进程。

助手文本仅从 `assistantMessageEvent.type` 为 `text_delta` 的 `message_update` 事件中组装。文本片段按 `contentIndex` 存储，并按索引顺序拼接。新协议的 `message_update` 不包含累计的 `message` 快照，本应用也不会从 `message_start` 或 `message_end` 中读取此类快照。

收到 `agent_end` 后，状态标签仍保持 `对话中`，因为该事件之后可能发生重试或上下文压缩。只有在收到 `turn_end`（或 `agent_settled`），且随后确认 `get_state.isStreaming === false` 时，才恢复空闲状态；轮次尚未结束时，每秒轮询一次以重复检查。

在一个轮次尚未结束时再次发送消息，会调用带有 `streamingBehavior: "steer"` 的 `prompt`。steer 用于在轮次中途补充引导：pi 会在当前助手轮次的工具调用完成后、下一次模型请求之前传递该消息。只有当 `get_state` 表明会话未在流式输出时，才会使用普通 `prompt`（不带 `streamingBehavior`）；若缺少此字段，第二次 `prompt` 会失败。输入框在 `对话中` 仍保持可用，以便发送补充引导；仅在引擎重连时禁用。

客户端使用 `@earendil-works/pi-coding-agent` 提供的官方 `RpcClient`。它启动 `node <pi> --mode rpc`，并且仅按 `\n` 分割标准输出。这与包中 `pi` 命令使用的是同一入口。此代码不使用 Node `readline` 来划分 JSONL 消息。

pi 的查找顺序如下：

1. `PI_CLI`：指向 Node 入口文件的绝对路径或相对于当前工作目录的路径（可以是包的命令入口，也可以是本地测试桩）。
2. 依赖中附带的入口：`node_modules/@earendil-works/pi-coding-agent/dist/bundle/cli.js`。
3. `PATH` 中的 `pi`，其文件必须是 Node 脚本（通过 shebang 或 `.js` / `.mjs` / `.cjs` 扩展名识别）。

`RpcClient` 始终使用 `node` 启动该文件，因此独立的 bun 二进制文件不能作为此处有效的 `PI_CLI`。将 build-binaries 构建的 `pi` 打包到 `extraResources` 是后续步骤。

如果 `PI_PROJECT_CWD` 指向一个目录，则将其用作初始工作目录；否则使用进程当前工作目录（从 `my-coding-agent` 运行 `npm run dev` 时即使用该目录）。标题栏的文件夹按钮通过原生选择器添加目录；侧边栏列出已添加的工作区，并在这些工作区之间切换活动 RPC 会话。工作区路径和上次活动路径保存在 Electron 用户数据目录的 `workspaces.json` 中。每个 Pi 子进程都使用 `--continue` 启动，并使用用户 `~/.pi/agent/sessions/` 目录下按工作目录分组的 Pi 默认会话存储。会话文件不会写入项目目录。

### 凭据

身份验证逻辑保留在主进程中。宿主进程封装 Pi `AuthStorage`（`~/.pi/agent/auth.json`）。保存 API 密钥会调用 `AuthStorage.modify(providerId, fn)`，其中 `fn` 返回 `{ "type": "api_key", "key": "..." }`。文件以 pi-ai 提供商 ID 为键，因此 DeepSeek 对应 `auth.json` → `deepseek`。写入完成后会运行 `checkAuth`。清除操作调用 `logout`，删除已存储的凭据（Pi CLI 写入的 OAuth 凭据也以相同方式删除）。渲染进程永远不会收到密钥。

IPC：

| 方法 | 通道 | 返回值 |
| --- | --- | --- |
| `listProviders` | `credentials:listProviders` | ID、名称、身份验证标志和模型 ID，不含任何机密信息。 |
| `getStatus` | `credentials:getStatus` | 各提供商的脱敏值、来源和状态 |
| `saveApiKey` | `credentials:saveApiKey` | 保存后的脱敏值、来源和状态 |
| `clear` | `credentials:clear` | 同样的三个字段 |

没有 `retrySave` 方法。保存失败后，密钥会保留在密码输入框中；再次保存会调用 `saveApiKey`。

提供商 ID 和身份验证标志来自 pi-ai 的内置注册表（`ModelRuntime.getProviders()`，其数据由 `builtinProviders()` 提供）。模型 ID 来自同一运行时的 `ModelRegistry.getAll()`。此页面没有手动复制维护的厂商列表。每个提供商的 `auth.apiKey.login` / `auth.oauth.login` 决定其标志：单个密钥、OAuth、两者兼有，或 `authFlow: "multi-step"`。页面仅显示支持单个 API 密钥的提供商。仅支持 OAuth 的提供商（如 `openai-codex`），以及需要多步骤验证的提供商（如 Amazon Bedrock、Google Vertex 和 Cloudflare）不会列出；请通过 Pi CLI 登录这些提供商。所有列出的提供商均通过相同的 `AuthStorage.modify(providerId, …)` 调用保存凭据。

已存储的 API 密钥会显示为 `••••` 加最后四个字符（更短的值仅显示 `••••`）。OAuth 显示为 `oauth ••••`。环境变量中的密钥仅报告变量名，例如 `DEEPSEEK_API_KEY`。如果未配置任何凭据，输入框会提供指向 `#/credentials` 的链接，并且不会调用 `prompt`。保存成功后，主进程会推送 `credentials:status`，工作区随即解除凭据限制，无需重启窗口。

#### DeepSeek V4 Flash

DeepSeek 的提供商 ID 是 `deepseek`（不是 `deepseek-chat`）。显示名称为 **DeepSeek V4 Flash**。副标题显示从 `ModelRegistry` 解析出的提供商与模型组合：优先选择模型 ID `deepseek-flash`，否则选择名称中包含“Flash”的第一个模型。在已安装的 `@earendil-works/pi-ai@0.87.1` 模型目录中，解析结果为 **`deepseek/deepseek-flash`**。`deepseek-v4-flash` 是中转服务模型目录中的 ID（用于 OpenRouter 等服务），不会发送给提供商 `deepseek`。DeepSeek 卡片采用 Stitch 设计稿中的静态状态：未配置、已保存（已存储密钥）和校验失败（检查或保存出错）。处理中仍显示“验证与保存中”，环境变量密钥仍显示“来自环境变量”。

在桌面窗口中：

1. 打开 `#/credentials`。
2. 找到 **DeepSeek**（搜索“DeepSeek”）。
3. 粘贴 API 密钥并选择 **保存密钥**。卡片切换为“来自本地”，且仅显示脱敏值。密钥以 `{ "deepseek": { "type": "api_key", "key": "sk-..." } }` 的形式保存在 `~/.pi/agent/auth.json` 中，不会写入 `settings.json`，也不会出现在 IPC 返回结果中。
4. 保存操作还会使用解析出的提供商与模型组合调用 RPC `set_model`。在当前安装环境中，通过 `RpcClient.setModel` 发送的内容为 `{ type: "set_model", provider: "deepseek", modelId: "deepseek-flash" }`，并通过 Pi `SettingsManager` 写入 `defaultProvider` / `defaultModel`。工作区状态标签会随该选择更新，而不只是更新 React 状态。

`AuthStorage` 未从包的索引入口导出。本应用从 `dist/core/auth-storage.js` 导入 `AuthStorage`。`modify(provider, fn)` 与当前上游实现一致：`fn` 接收当前凭据并返回下一个凭据（返回 `undefined` 则保持文件不变）。磁盘上的对象结构为 `{ [providerId]: credential }`。

`RpcClient.setModel(provider, modelId)` 发送 `{ type: "set_model", provider, modelId }`。RPC 处理器使用 `modelRuntime.getAvailableSnapshot()` 查找模型，然后调用 `session.setModel(model)`。

`set_model` 通过 `modelRuntime.getAvailableSnapshot()` 在提供商 `deepseek` 下查找模型。本应用通过 `ModelRegistry.getAll()` 获取提供商 `deepseek` 的模型，优先选择 ID 为 `deepseek-flash` 的模型，否则选择名称中包含“Flash”的模型。

环境变量密钥仍然有效。提供商状态检查使用 `findEnvKeys`，且仅报告变量名。DeepSeek 使用的变量为 `DEEPSEEK_API_KEY`：

```bash
DEEPSEEK_API_KEY=sk-... npm run dev
```

同一流程可识别 `findEnvKeys` 支持的所有变量（`ANTHROPIC_API_KEY`、`OPENAI_API_KEY`、`GEMINI_API_KEY`、`OPENROUTER_API_KEY`，以及 pi-ai 映射中的其他变量）。子进程会继承环境变量。请勿将密钥放入 `settings.json` 或渲染进程中。

`node scripts/credentials-smoke.mjs` 用于检查注册表、DeepSeek 密钥保存后的脱敏结果，以及 `settings.json` 中是否未包含密钥。测试使用临时的 `PI_CODING_AGENT_DIR`。

`@earendil-works/pi-coding-agent` 要求 Node `>=22.19`。本应用仍使用 `PATH` 中的 Node 运行附带的 CLI（即 `RpcClient` 启动的同一个 `node`）。

### 无模型密钥的冒烟验证

`get_state` 无需密钥即可连接；状态标签会进入空闲状态，输入框会说明如何打开凭据页面。真实的模型流式响应需要配置提供商。

要在没有密钥的情况下验证流式界面，可将 `PI_CLI` 指向测试桩（它会发送少量 JSONL 事件，不会调用提供商）：

```bash
PI_CLI=scripts/pi-rpc-fixture.mjs ELECTRON_NO_SANDBOX=1 npm run dev
```

测试桩并非真实引擎。使用真实 `pi` 前，请先退出该会话。

## 页面

路由使用哈希形式，因此可同时在浏览器和 Electron 窗口中使用。

| 页面 | 地址 |
| --- | --- |
| 主工作区 | [http://127.0.0.1:5173/#/](http://127.0.0.1:5173/#/) |
| 差异审查 | [#/diff](http://127.0.0.1:5173/#/diff) |
| 设置 | [#/settings](http://127.0.0.1:5173/#/settings) |
| 首次使用引导 | [#/onboarding](http://127.0.0.1:5173/#/onboarding) |
| 模型凭据 | [#/credentials](http://127.0.0.1:5173/#/credentials) |
| 分支切换器 | [#/branch](http://127.0.0.1:5173/#/branch) |
| 提交历史 | [#/history](http://127.0.0.1:5173/#/history) |

窗口内的操作：

- **提交更改**打开当前工作区的 Git 审查页面。选择要暂存的文件，查看差异，输入提交信息，然后将暂存文件提交到本地。此操作不会推送到远程。
- **设置**打开偏好设置。**模型与计算**和主模型行会打开凭据页面。
- **打开文件夹**在 Electron 中打开原生目录选择器，在浏览器预览中则打开首次使用引导页面。
- 标题栏中的分支标识和状态栏中的 **Git: &lt;branch&gt;** 会在当前页面上方打开分支切换器。它列出工作区仓库的本地和远程分支。选择本地分支会切换到该分支；选择远程分支会将其检出为本地跟踪分支；输入新名称则可选择基于当前分支创建分支。如果存在未提交的更改，会先询问处理方式：携带更改切换（发生冲突时 Git 会拒绝），或先暂存到 stash 再切换。**拉取远程 (Fetch)** 执行 `git fetch --all --prune`。代理运行期间禁止切换分支。
- 标题栏中的 **历史**打开当前分支的提交历史，也可以通过选择器查看任意本地或远程分支的历史。选择提交后，会显示提交信息、文件统计和补丁。

## 状态栏

工作区、差异审查、历史和设置页面共用一个 24px 高的底栏，最多显示三个状态标签，每个标签仅在对应数据可用时显示：

| 状态标签 | 显示内容 |
| --- | --- |
| Git | 当前分支；工作区干净时显示 `✓`，存在未提交更改时显示 `*`。点击打开分支切换器。不在 Git 仓库内时隐藏。 |
| 引擎 · RPC | 实时会话状态：空闲 · 已连接 / 对话中 / 重连中 / 已断开。仅在 Electron 中显示。 |
| 沙盒 | **沙盒 · 未启用**、**沙盒 · 正在启用**或**沙盒 · 命令隔离**。点击打开「设置 → 权限」。仅在 Electron 中显示。 |

在 **正在启用** 期间按 Escape 可请求取消。凭据页面使用独立布局，不包含此底栏。
