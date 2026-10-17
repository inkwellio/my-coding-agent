# 更新日志

本文件记录项目的重要变更，最新记录置于顶部。尚未发布的变更归入「未发布」；正式发布时补充版本号和发布日期。

## [未发布]

## [0.1.0] - 2026-10-17

首个桌面安装包版本（未签名），包含此前所有未发布的变更。

### 新增

- 使用 electron-builder 打包：Windows（NSIS 安装包、便携版、zip）、macOS（dmg、zip，arm64 与 x64）、Linux（AppImage、deb）。
- 安装包内置 Pi 引擎；在 Electron 中通过 `ELECTRON_RUN_AS_NODE` 以应用自带的 Node 运行时启动 Pi RPC 子进程（`electron/pi-bootstrap.mjs`），用户无需安装 Node.js。
- 打包后的应用以用户主目录作为默认工作区，并在 macOS/Linux 上继承登录 Shell 的 `PATH`。
- 新增 `npm run dist` / `npm run dist:dir`、打包冒烟测试 `scripts/packaged-smoke.mjs`，以及推送 `v*` 标签触发的三平台发布工作流 `.github/workflows/release.yml`。
- 开源准备：添加 MIT `LICENSE`、`THIRD_PARTY_NOTICES.md` 及字体许可证文本；添加 GitHub Actions CI（类型检查、构建、冒烟测试）和 `npm test` 脚本；补充 `package.json` 的 license、repository、engines 等字段。
- 重写 `README.md`（简介、功能、快速开始、API Key 配置、许可证），将架构细节移至 `docs/ARCHITECTURE.md`。
- 接入 `@anthropic-ai/sandbox-runtime`，支持在桌面设置中启用代理 Shell 命令与内置终端隔离；默认禁止外网访问，限制写入范围并保护凭据及宿主代码。
- 添加沙盒状态 IPC、Pi 扩展启动确认、可取消的 Windows 组件安装，以及沙盒冒烟测试和系统集成测试命令。
- 添加中文贡献指南 `AGENTS.md`，说明项目结构、开发命令、代码规范、测试要求及凭据安全约定。
- 添加 `.editorconfig`，将编辑器默认缩进设置为 4 个空格。
- 添加 `CHANGELOG.md`，集中维护项目更新记录。
- 分支切换器接入真实 Git 数据：列出本地与远程分支及领先/落后状态，支持搜索、新建分支、检出远程分支和抓取远程；工作区有改动时可选择带着改动切换或存入 stash 后切换，代理运行期间禁止切换。
- 添加提交历史页面 `#/history`，可按当前分支、本地或远程分支分页浏览提交，并查看单个提交的统计与差异。
- 添加 `git:branches`、`git:checkout`、`git:fetch`、`git:log`、`git:show` IPC，以及 `scripts/git-branch-smoke.mjs` 冒烟测试，`npm run test:git` 同时运行该测试。
- 标题栏显示真实分支名（分离 HEAD 时单独提示）并提供历史入口；侧边栏「设置」添加图标；API Key 配置页左上角添加返回按钮。
- 引导页「最近项目」改为读取真实的工作区记录，可直接切换到历史项目。

### 变更

- 删除根目录误提交的空文件 `.agents`、`.codex`、`.pi` 以及开发用截图目录 `prompts/`；完善 `.gitignore`。
- 底部状态栏只显示有数据的项目：Git 分支与改动状态、引擎连接、沙盒状态；无数据时不再显示示例内容。
- 凭据页框架的提交按钮和分支标签改用真实的 Git 状态。
- 模型选择器未选择模型时显示「未选择模型」，不再显示写死的模型名称。
- 差异页面在切换分支后自动刷新。

- 将桌面沙盒占位开关和权限设置替换为真实状态与操作；启用失败时阻止继续发送和启动终端。
- 将源码、脚本、样式及配置文件统一为 4 个空格缩进。
- 同步更新贡献指南中的缩进约定。

### 修复

- 修复启用沙盒失败后被进程清理事件覆盖为「正在重新连接」的问题；启动等待有超时，短时间连续退出只自动重试一次，并保留真实错误。
- Windows 在执行 Bash 命令时才检查 Git Bash；沙盒初始化使用系统命令验证，并限制验证命令的执行时间。
- 防止初始引擎状态查询覆盖较新的状态事件；工作区优先显示连接错误及沙盒初始化进度。
- 沙盒运行依赖缺失或安装不完整时，提示在项目目录执行 `npm install` 并重启应用，避免与 Windows 系统组件安装混淆。

### 移除

- 移除设置页中未实现的功能：沙盒负载卡片、页脚、配置哈希、「导出 JSON」及写死的工作区与推理网关信息。
- 移除输入框中无效的「添加文件」按钮，以及引导页中的示例内容。
- 移除示例页面和数据：`#/status`、`#/engine` 路由及对应页面、`BranchCanvas`、`MessageStream`、`ParserCode` 和 `src/data/workspace.ts`；旧路由会回到工作区。
- 移除未接入界面的 OAuth 登录、登出和环境变量检测 IPC 及实现；只支持 OAuth 的服务商需通过 Pi 命令行登录，环境变量中的 API Key 仍会被识别。
- 移除未使用的 `formatCombo` 快捷键格式化函数。

## 维护约定

- 按「新增」「变更」「修复」「移除」「安全」分类，仅保留有内容的分类。
- 简要说明变更及其影响；涉及不兼容变更时，补充迁移方式。
- 发布时将「未发布」条目移入对应版本，例如 `## [0.1.0] - YYYY-MM-DD`，并保留「未发布」章节供后续更新使用。
