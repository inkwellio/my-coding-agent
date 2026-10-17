# my-coding-agent

作者 X 主页：[@hunter_jia228](https://x.com/hunter_jia228)

基于 [Pi](https://github.com/earendil-works/pi) 编程代理引擎的桌面 AI 编程工作台，使用 Electron + React + TypeScript 构建。

> **English summary:** An unofficial desktop AI coding agent built on the Pi coding-agent engine (Electron + Vite + React + Tailwind + TypeScript). It adds a desktop workspace UI with multi-workspace sessions, Git review/commit, branch switching, commit history, MCP server management, model credential management and optional command sandboxing. Download installers for Windows / macOS / Linux from [Releases](https://github.com/inkwellio/my-coding-agent/releases) (unsigned, Node.js not required), or run from source with Node.js ≥ 22.19: `npm ci && npm run dev`.

> [!NOTE]
> 本项目为**非官方**项目，与 Pi / [earendil-works](https://github.com/earendil-works) 无任何隶属或背书关系。界面中的 "Pi" 仅指所使用的引擎。

## 功能

- **多工作区对话**：每个窗口通过 RPC 模式驱动独立的 `pi` 进程，流式显示助手回复与工具调用；支持轮次中途补充引导（steer），会话保存在 Pi 的本地会话存储中，可查看和删除历史会话。
- **模型凭据管理**：在界面中为内置提供商（如 DeepSeek、Anthropic、OpenAI、Gemini、OpenRouter 等）保存或清除 API Key；密钥只保存在主进程的 Pi AuthStorage 中，渲染进程只能拿到脱敏信息。
- **Git 集成**：查看工作区改动与差异、选择文件暂存并提交到本地；分支切换器支持搜索、新建、检出远程分支、Fetch，以及带改动切换或先 stash 再切换；提交历史页面可按分支浏览提交详情。
- **MCP 服务管理**：在设置中添加本地 stdio 或 Streamable HTTP 的 MCP 服务器，并测试连接。
- **可选命令沙盒**：基于 [`@anthropic-ai/sandbox-runtime`](https://github.com/anthropics/sandbox-runtime) 隔离代理执行的 Shell 命令和内置终端，默认禁止外网访问，并保护凭据与项目 `.env` 文件。
- **内置终端、快捷键与深色主题界面**。

## 截图

| 模型配置 | API Key 管理 |
| --- | --- |
| ![模型配置](docs/images/models.png) | ![API Key 管理](docs/images/api-keys.png) |
| **MCP 服务** | **切换分支** |
| ![MCP 服务](docs/images/mcp.png) | ![切换分支](docs/images/branch-switcher.png) |
| **外观主题** | **快捷键** |
| ![外观主题](docs/images/appearance.png) | ![快捷键](docs/images/keybindings.png) |

## 下载安装

从 [Releases](https://github.com/inkwellio/my-coding-agent/releases/latest) 下载对应平台的安装包。安装包已内置 Pi 引擎和运行时，**无需安装 Node.js**。

| 平台 | 文件 |
| --- | --- |
| Windows x64 | `*-win-x64-setup.exe`（安装版）、`*-win-x64-portable.exe`（便携版）、`*-win-x64.zip` |
| macOS（Apple Silicon / Intel） | `*-mac-arm64.dmg` / `*-mac-x64.dmg`（另有 zip） |
| Linux x64 | `*-linux-x86_64.AppImage`、`*-linux-amd64.deb` |

> [!WARNING]
> 安装包**未签名**，首次打开会有系统提示：
> - **Windows**：SmartScreen 提示时点击「更多信息」→「仍要运行」。
> - **macOS**：在「应用程序」中右键点击 App →「打开」；若提示「已损坏」，执行 `xattr -dr com.apple.quarantine "/Applications/My Coding Agent.app"`。
> - **Linux**：AppImage 需先 `chmod +x`；deb 用 `sudo apt install ./my-coding-agent-*-linux-amd64.deb` 安装。

使用 Git 功能需要系统已安装 Git；Windows 上代理执行 Bash 命令需要 [Git for Windows](https://git-scm.com/download/win)。

## 从源码运行

### 环境要求

- Node.js **22.19 或更高版本**
- npm 10+
- Git（用于 Git 相关功能）
- 可选：启用命令沙盒时，Linux 需安装 Bubblewrap、socat 和 ripgrep；macOS 使用系统沙盒；Windows 支持仍处于 alpha 阶段。详见 [架构文档](./docs/ARCHITECTURE.md#沙盒)。

### 快速开始

```bash
git clone https://github.com/inkwellio/my-coding-agent.git
cd my-coding-agent
npm ci
npm run dev
```

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 同时启动 Vite 开发服务器和 Electron 窗口 |
| `npm run dev:web` | 仅启动渲染界面，在浏览器打开 `http://127.0.0.1:5173`（桌面集成功能需要 Electron） |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run build` | 类型检查并将渲染界面构建到 `dist/` |
| `npm start` | 构建后启动 Electron |
| `npm test` | 运行所有可离线执行的冒烟测试 |
| `npm run dist` | 使用 electron-builder 打包当前平台的安装包到 `release/` |
| `npm run dist:dir` | 仅生成未压缩的应用目录（调试打包用） |

在 Chromium 沙盒无法启动的 Linux 容器中，可用 `ELECTRON_NO_SANDBOX=1 npm run dev` 启动（会同时关闭 Electron 渲染进程沙盒，仅用于此类环境）。

## 配置模型 API Key

任选一种方式：

1. **在应用中配置（推荐）**：打开应用后进入「设置 → 模型与计算」或凭据页面（`#/credentials`），搜索提供商（如 DeepSeek），粘贴 API Key 并点击「保存密钥」。密钥保存在 `~/.pi/agent/auth.json`（Pi 的 AuthStorage），不会写入项目目录或 `settings.json`。
2. **使用环境变量**：启动前设置对应变量，例如：

   ```bash
   DEEPSEEK_API_KEY=sk-... npm run dev
   ```

   也支持 `ANTHROPIC_API_KEY`、`OPENAI_API_KEY`、`GEMINI_API_KEY`、`OPENROUTER_API_KEY` 等 Pi 能识别的变量。

仅支持 OAuth 或多步骤验证的提供商（如 `openai-codex`、Amazon Bedrock、Google Vertex）请先通过 Pi CLI 登录。没有 API Key 时，也可以用测试桩验证界面：`PI_CLI=scripts/pi-rpc-fixture.mjs npm run dev`。

## 文档

- [架构与实现说明](./docs/ARCHITECTURE.md)：RPC 引擎、凭据、沙盒、MCP、页面路由与状态栏等细节。
- [贡献与开发规范](./AGENTS.md)
- [更新日志](./CHANGELOG.md)
- [第三方许可声明](./THIRD_PARTY_NOTICES.md)

## 许可证

本项目以 [MIT License](./LICENSE) 发布。随仓库分发的字体及主要依赖的许可证见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。

## 作者

[inkwellio](https://github.com/inkwellio) · X：[@hunter_jia228](https://x.com/hunter_jia228)
