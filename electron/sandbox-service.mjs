import { randomUUID } from "node:crypto";
import { mkdtemp, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildSandboxConfig, sandboxMessage } from "./sandbox-execution.mjs";

export function createSandboxService({ publish = () => {}, platform = process.platform, loadRuntime = () => import("@anthropic-ai/sandbox-runtime") } = {}) {
    const windows = new Map();
    let support = { capability: ["darwin", "linux", "win32"].includes(platform) ? "available" : "unsupported", ready: false, installRequired: false, detail: null, warnings: [] };
    let checking;
    function entry(id, cwd) {
        if (!windows.has(id)) windows.set(id, { state: "off", requested: false, cwd, options: null, detail: null });
        return windows.get(id);
    }
    function snapshot(id, cwd) {
        const current = entry(id, cwd);
        return { ...support, state: current.state, requested: current.requested, cwd: current.cwd,
            capability: current.state === "on" ? "enabled" : support.capability,
            detail: current.detail || support.detail };
    }
    function emit(id) { const current = windows.get(id); if (current) publish(id, snapshot(id, current.cwd)); }
    async function probe() {
        if (checking) return checking;
        checking = (async () => {
            if (support.capability === "unsupported") {
                support.detail = "当前系统不支持命令隔离";
                return support;
            }
            try {
                const runtime = await loadRuntime();
                // The main process only probes; each Pi/terminal process owns its manager.
                runtime.SandboxManager.updateConfig(buildSandboxConfig(process.cwd(), tmpdir(), runtime));
                const dependencies = await runtime.SandboxManager.checkDependenciesAsync();
                let installRequired = false;
                if (platform === "win32") {
                    const status = await runtime.checkWindowsSandboxStatusAsync({ srtWin: runtime.resolveSrtWin({ path: runtime.VENDORED_SRT_WIN_EXE }) });
                    installRequired = !status.user.provisioned || !status.user.credPresent || status.wfp?.state === "absent";
                }
                support = { ...support, ready: dependencies.errors.length === 0 && !installRequired,
                    installRequired, warnings: dependencies.warnings,
                    detail: installRequired ? "需要安装系统沙盒组件，可取消安装" : dependencies.errors.join("；") || null };
            } catch (error) {
                const missingDependency = error?.code === "ERR_MODULE_NOT_FOUND" || error?.code === "MODULE_NOT_FOUND";
                support = { ...support, ready: false, installRequired: false,
                    detail: missingDependency
                        ? "沙盒运行依赖尚未安装或不完整。请在项目目录执行 npm install，完成后重启应用。"
                        : `沙盒不可用：${sandboxMessage(error)}` };
            }
            for (const id of windows.keys()) emit(id);
            return support;
        })().finally(() => { checking = null; });
        return checking;
    }
    async function prepare(id, cwd) {
        const current = entry(id, cwd);
        current.detail = null;
        if (platform === "win32") {
            const target = (await realpath(cwd)).toLowerCase();
            for (const [otherId, other] of windows) {
                if (otherId !== id && other.requested && (await realpath(other.cwd)).toLowerCase() !== target) {
                    throw new Error("Windows 沙盒当前仅支持同时隔离一个工作区，请先关闭其他工作区的沙盒");
                }
            }
        }
        current.state = "enabling";
        current.requested = true;
        current.cwd = cwd;
        emit(id);
        try {
            const available = await probe();
            if (!available.ready) throw new Error(available.detail || "沙盒依赖尚未就绪");
            current.options ??= { cwd, tempDir: await mkdtemp(join(tmpdir(), "pi-desktop-sandbox-")), token: randomUUID() };
        } catch (error) {
            current.state = "off";
            if (!current.options) current.requested = false;
            current.detail = sandboxMessage(error);
            emit(id);
            throw error;
        }
        return current.options;
    }
    function complete(id, enabled, detail = null) {
        const current = windows.get(id);
        if (!current) return;
        current.state = enabled ? "on" : "off";
        current.detail = detail;
        emit(id);
    }
    async function release(id) {
        const current = windows.get(id);
        if (!current) return;
        // Call only after the old Pi and terminal processes have stopped.
        if (current.options) await rm(current.options.tempDir, { recursive: true, force: true });
        windows.delete(id);
    }
    async function installWindows() {
        if (platform !== "win32") return { ok: false, message: "当前系统不需要此安装步骤" };
        const runtime = await loadRuntime();
        const result = await runtime.installWindowsSandboxAsync({
            srtWin: runtime.resolveSrtWin({ path: runtime.VENDORED_SRT_WIN_EXE }),
        });
        await probe();
        return { ok: !result.cancelled && support.ready, cancelled: Boolean(result.cancelled) };
    }
    return { snapshot, probe, prepare, complete, release, installWindows,
        options: (id) => windows.get(id)?.options || null };
}
