import { spawn } from "node:child_process";
import { resolvePiCli } from "./rpc-host.mjs";

function findServer(report, name) {
    const entries = Array.isArray(report) ? report : Array.isArray(report?.servers) ? report.servers : Object.entries(report?.servers ?? {}).map(([key, value]) => ({ name: key, ...value }));
    return entries.find((item) => item?.name === name || item?.id === name);
}

export async function testMcpServer(name, cwd) {
    const cliPath = resolvePiCli();
    if (!cliPath) return { ok: false, message: "找不到 Pi 命令行程序" };
    return new Promise((resolve) => {
        const child = spawn(process.execPath, [cliPath, "mcp", "list", "--json"], {
            cwd,
            env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", PI_SKIP_VERSION_CHECK: "1", PI_TELEMETRY: "0" },
            stdio: ["ignore", "pipe", "pipe"],
            windowsHide: true,
        });
        let stdout = "";
        let stderr = "";
        let settled = false;
        const timer = setTimeout(() => child.kill(), 75000);
        child.stdout.on("data", (chunk) => { stdout += chunk; if (stdout.length > 1_000_000) child.kill(); });
        child.stderr.on("data", (chunk) => { stderr += chunk; if (stderr.length > 10000) stderr = stderr.slice(-10000); });
        child.on("error", (error) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve({ ok: false, message: error.message });
        });
        child.on("close", (code, signal) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            let report;
            try { report = JSON.parse(stdout); }
            catch {
                resolve({ ok: false, message: signal ? "Pi MCP 检查超时" : (stderr.trim() || "Pi 未返回 MCP 检查结果").slice(0, 500) });
                return;
            }
            const server = findServer(report, name);
            if (!server) {
                resolve({ ok: false, message: "Pi 未在检查结果中找到该服务" });
                return;
            }
            const status = String(server.status ?? server.state ?? "").toLowerCase();
            const connected = server.connected === true || ["connected", "ready", "ok"].includes(status);
            const tools = Array.isArray(server.tools) ? server.tools.map((tool) => ({
                name: typeof tool === "string" ? tool : String(tool.name ?? ""),
                description: typeof tool === "string" ? "" : String(tool.description ?? ""),
            })) : [];
            resolve(connected
                ? { ok: true, tools }
                : { ok: false, message: String(server.error ?? server.message ?? (code === 0 ? "服务未连接" : "Pi MCP 检查失败")).slice(0, 500) });
        });
    });
}
