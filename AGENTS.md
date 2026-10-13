# Repository Guidelines

## 项目结构与模块组织

本仓库使用 Electron、React、TypeScript 和 Vite 实现 Pi 桌面编程代理的应用界面。

- `src/components/`：共享 UI 组件；`src/pages/`：使用哈希路由的页面。
- `src/rpc/`、`src/credentials/`、`src/git/`、`src/mcp/`：渲染进程的类型定义与集成逻辑；`src/hooks/`：可复用的 Hook。
- `electron/`：主进程、预加载桥接，以及 RPC、凭据、Git、MCP、终端和工作区服务。
- `scripts/`：冒烟测试和 RPC 模拟程序；`public/`：静态资源；`dist/`：生成的构建产物。
- `src/index.css` 和 `tailwind.config.cjs`：样式与设计令牌。架构和路由说明见 `README.md`。

## 构建、测试与开发命令

使用 Node.js 22.19+ 和 npm 10+。

- `npm install`：安装依赖。
- `npm run dev`：同时启动 Vite 和 Electron。
- `npm run dev:web`：在 `http://127.0.0.1:5173` 预览渲染界面；桌面集成功能需要 Electron。
- `npm run typecheck`：检查 TypeScript 类型，不生成文件。
- `npm run build`：检查类型并将渲染界面构建到 `dist/`。
- `npm start`：构建并启动 Electron。
- `npm run test:git` / `npm run test:mcp`：运行 Git 和 MCP 冒烟测试。

## 代码风格与命名约定

统一使用 4 个空格缩进、双引号和分号；编辑器缩进配置见 `.editorconfig`。渲染进程使用严格模式的 TypeScript；组件文件名使用 PascalCase，函数使用 camelCase，Hook 名称以 `use` 开头。Electron 的 CommonJS 文件使用 `.cjs`，ES 模块使用 `.mjs`。复用 Tailwind 设计令牌和共享 UI 组件。目前未配置专用的代码格式化或静态检查工具。

## 测试规范

测试采用独立的 Node 脚本，使用 `node:assert/strict`，命名为 `scripts/<feature>-smoke.mjs`。除运行 `npm run build` 外，还应直接运行相关测试，例如 `node scripts/credentials-smoke.mjs` 或 `node scripts/rpc-transcript-smoke.mjs`。涉及状态持久化的测试应使用临时目录。目前未设置覆盖率门槛。修改 UI 后，应在 Electron 中手动验证受影响的路由。

## 提交与拉取请求规范

Git 历史目前仅包含 `Initial commit`，尚未形成提交信息约定。提交标题应简短，以祈使语气描述变更。拉取请求（PR）应说明行为变化，列出验证命令及结果，关联相关 Issue；涉及可见的 UI 变化时，应附上截图。

## 安全与配置提示

凭据应保存在主进程的 Pi AuthStorage 中，通过 IPC 仅返回脱敏后的状态信息。禁止提交密钥，或将其暴露到渲染进程状态或日志中。测试凭据或 MCP 配置时，应将 `PI_CODING_AGENT_DIR` 指向临时目录。
