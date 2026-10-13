import { createBashTool, createPowerShellToolDefinition, getShellConfig, getPowerShellConfig } from "@earendil-works/pi-coding-agent";
import { createSandboxExecutor, SANDBOX_ENV, SANDBOX_ERROR, SANDBOX_READY, sandboxMessage } from "./sandbox-execution.mjs";

export default function desktopSandbox(pi, {
    createExecutor = createSandboxExecutor,
    resolveBash = () => getShellConfig().shell,
    resolvePowerShell = () => getPowerShellConfig().shell,
    platform = process.platform,
} = {}) {
    const options = JSON.parse(process.env[SANDBOX_ENV] || "null");
    if (!options?.cwd || !options.tempDir || !options.token) throw new Error("缺少桌面沙盒配置");
    let executor;
    let failure = "沙盒尚未就绪，命令已阻止";
    const operations = (resolveShell) => ({
        async exec(command, cwd, params) {
            if (!executor) throw new Error(failure);
            let shell;
            try { shell = resolveShell(); } catch {
                throw new Error("未找到命令解释器。Windows 的 Bash 命令需要 Git Bash，也可以使用 PowerShell 工具。");
            }
            return executor.exec(command, cwd, { ...params, shell });
        },
    });
    // Resolve Bash only when requested; Windows can initialize isolation using native cmd/PowerShell.
    const bashOperations = operations(resolveBash);
    const bash = createBashTool(options.cwd, { operations: bashOperations });
    pi.registerTool({ ...bash, label: "bash（沙盒）" });
    if (platform === "win32") {
        pi.registerTool(createPowerShellToolDefinition(options.cwd, { operations: operations(resolvePowerShell) }));
    }
    pi.on("user_bash", () => ({ operations: bashOperations }));
    pi.on("session_start", async (_event, ctx) => {
        try {
            executor ??= await createExecutor(options);
            const result = await executor.exec(platform === "win32" ? "exit /b 0" : "true", options.cwd, { timeout: 10 });
            if (result.exitCode !== 0) throw new Error("系统拒绝启动隔离命令，请检查沙盒依赖或系统权限");
            ctx.ui.notify(`${SANDBOX_READY}${options.token}`, "info");
        } catch (error) {
            failure = `沙盒初始化失败，命令已阻止：${sandboxMessage(error)}`;
            ctx.ui.notify(`${SANDBOX_ERROR}${options.token}:${failure}`, "error");
        }
    });
    pi.on("session_shutdown", async () => {
        const current = executor;
        executor = undefined;
        await current?.reset();
    });
}
