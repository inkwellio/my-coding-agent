## My Coding Agent

基于 [Pi](https://github.com/earendil-works/pi) 编程代理引擎的桌面 AI 编程工作台（非官方项目，与 Pi / earendil-works 无隶属关系）。
An unofficial desktop AI coding agent built on the Pi coding-agent engine.

### 功能 / Features

- 多工作区对话：每个窗口驱动独立的 Pi RPC 进程，流式显示回复与工具调用，支持中途补充引导（steer），可查看和删除历史会话
- 模型凭据管理：在界面中为 DeepSeek、Anthropic、OpenAI、Gemini、OpenRouter 等提供商保存 API Key（仅保存在本机 `~/.pi/agent/auth.json`）
- Git 集成：查看差异、暂存并提交、分支切换（含 stash）、Fetch、提交历史
- MCP 服务管理（stdio / Streamable HTTP）
- 可选命令沙盒（基于 `@anthropic-ai/sandbox-runtime`）
- 内置终端、快捷键、深色主题
- 安装包已内置 Pi 引擎，并使用应用自带的 Node 运行时，**无需另外安装 Node.js**

### 下载 / Downloads

| 平台 | 文件 |
| --- | --- |
| Windows x64 | `*-win-x64-setup.exe`（安装版）、`*-win-x64-portable.exe`（便携版）、`*-win-x64.zip` |
| macOS Apple Silicon | `*-mac-arm64.dmg` / `*-mac-arm64.zip` |
| macOS Intel | `*-mac-x64.dmg` / `*-mac-x64.zip` |
| Linux x64 | `*-linux-x86_64.AppImage`、`*-linux-amd64.deb` |

### ⚠️ 安装包未签名 / Unsigned builds

本版本的安装包**没有代码签名**，首次打开时系统会提示风险：

- **Windows**：SmartScreen 提示「Windows 已保护你的电脑」时，点击「更多信息」→「仍要运行」。
- **macOS**：Gatekeeper 会阻止打开。在「应用程序」中**右键点击 App → 打开**，再在弹窗中点「打开」；或在「系统设置 → 隐私与安全性」中点「仍要打开」。如果提示「已损坏，无法打开」，在终端执行：
  ```bash
  xattr -dr com.apple.quarantine "/Applications/My Coding Agent.app"
  ```
- **Linux**：AppImage 需要先赋予执行权限：`chmod +x my-coding-agent-*.AppImage`；deb 包可用 `sudo apt install ./my-coding-agent-*-linux-amd64.deb` 安装。

### 使用前提 / Requirements

- 需要自备模型 API Key（打开应用后在「设置 → 模型与计算」中配置，或通过 `DEEPSEEK_API_KEY` 等环境变量提供）。
- Git 功能需要系统已安装 Git；Windows 上代理执行 Bash 命令需要 Git for Windows（Git Bash）。
- 命令沙盒在 Linux 上需要 Bubblewrap、socat、ripgrep；Windows 沙盒仍为 alpha。
