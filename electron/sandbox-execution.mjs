import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { realpathSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const SANDBOX_ENV = "PI_DESKTOP_SANDBOX_CONFIG";
export const SANDBOX_READY = "desktop-sandbox-ready:";
export const SANDBOX_ERROR = "desktop-sandbox-error:";

export function createSandboxHandshake(token, timeoutMs = 20_000) {
    let resolveReady;
    let rejectReady;
    const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
    ready.catch(() => {});
    const timer = setTimeout(() => rejectReady(new Error("沙盒扩展未确认隔离状态，已阻止启动")), timeoutMs);
    return {
        ready,
        handleEvent(event) {
            if (event?.type !== "extension_ui_request" || event.method !== "notify") return false;
            if (event.message === `${SANDBOX_READY}${token}`) { clearTimeout(timer); resolveReady(); return true; }
            if (typeof event.message === "string" && event.message.startsWith(`${SANDBOX_ERROR}${token}:`)) {
                clearTimeout(timer);
                rejectReady(new Error(event.message.slice(`${SANDBOX_ERROR}${token}:`.length)));
                return true;
            }
            return false;
        },
        dispose() { clearTimeout(timer); rejectReady(new Error("沙盒启动已结束")); },
    };
}

export function sandboxMessage(error) {
    return String(error instanceof Error ? error.message : error)
        .replace(/sk-[A-Za-z0-9_-]{8,}/g, "sk-…")
        .replace(/(Bearer\s+)\S+/gi, "$1…")
        .slice(0, 500);
}

function insideAny(target, roots, platform) {
    const fold = (value) => platform === "win32" ? value.toLowerCase() : value;
    return roots.some((root) => {
        const subpath = relative(fold(root), fold(target));
        return !(subpath === ".." || subpath.startsWith(`..${sep}`) || isAbsolute(subpath));
    });
}

export function buildSandboxConfig(cwd, tempDir, runtime, env = process.env, platform = process.platform) {
    const workspace = realpathSync(cwd);
    const home = homedir();
    const installRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
    const temp = realpathSync(tempDir);
    const windows = platform === "win32";
    // Windows stamps each deny path and its parent with inheritable ACEs, walking whole trees such as
    // the user profile past srt-win's 60s limit. Its sandbox user only reaches granted roots, so
    // deny entries outside them are redundant there.
    const reachable = (paths) => windows ? paths.filter((entry) => insideAny(entry, [workspace, installRoot, temp], platform)) : paths;
    return {
        network: { allowedDomains: [], deniedDomains: [], allowLocalBinding: false },
        filesystem: {
            denyRead: reachable([
                join(home, ".ssh"), join(home, ".aws"), join(home, ".gnupg"),
                join(home, ".pi"), join(home, ".npmrc"), join(home, ".git-credentials"),
                resolve(env.PI_CODING_AGENT_DIR || join(home, ".pi", "agent")),
                join(workspace, ".env"), join(workspace, ".env.*"),
            ]),
            allowWrite: [workspace, temp],
            denyWrite: reachable([
                join(installRoot, "electron"), join(installRoot, "node_modules"),
                join(workspace, ".git", "hooks"), join(workspace, ".pi"),
                join(workspace, ".agents"), join(workspace, ".codex"),
                join(home, ".npm", "_logs"), join(home, ".claude", "debug"),
            ]),
            ...(windows ? { allowRead: [workspace, installRoot] } : {}),
        },
        enableWeakerNestedSandbox: false,
        enableWeakerNetworkIsolation: false,
        ...(windows ? { windows: { srtWin: { path: runtime.VENDORED_SRT_WIN_EXE } } } : {}),
    };
}

// Shell children need tooling paths, but must not inherit model keys or host hooks.
export function sandboxEnvironment(env = process.env, tempDir) {
    const result = {};
    const allowed = /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|HOME|USER|LOGNAME|LANG|LC_\w+|TERM|COLORTERM|TZ|NUMBER_OF_PROCESSORS|PROCESSOR_ARCHITECTURE)$/i;
    for (const [name, value] of Object.entries(env)) {
        if (allowed.test(name) && typeof value === "string") result[name] = value;
    }
    if (tempDir) Object.assign(result, { TMPDIR: tempDir, TMP: tempDir, TEMP: tempDir });
    return { ...result, TERM: "dumb", NO_COLOR: "1" };
}

export function assertWorkspaceCwd(workspace, cwd) {
    const target = realpathSync(cwd);
    const subpath = relative(realpathSync(workspace), target);
    if (subpath === ".." || subpath.startsWith(`..${sep}`) || isAbsolute(subpath)) {
        throw new Error("沙盒命令的工作目录必须位于当前工作区内");
    }
    return target;
}

export function killSandboxChild(child, platform = process.platform) {
    if (!child?.pid || child.exitCode !== null) return;
    if (platform !== "win32") {
        try { process.kill(-child.pid, "SIGKILL"); return; } catch { /* Process group already gone. */ }
    } else {
        const killer = spawn(join(process.env.SystemRoot || "C:\\Windows", "System32", "taskkill.exe"),
            ["/PID", String(child.pid), "/T", "/F"], { shell: false, windowsHide: true, stdio: "ignore" });
        killer.once("error", () => child.kill("SIGKILL"));
        killer.once("close", () => { if (child.exitCode === null) child.kill("SIGKILL"); });
        return;
    }
    child.kill("SIGKILL"); // The Windows runtime owns a kill-on-close job object.
}

export async function createSandboxExecutor(options, { runtime, spawnProcess = spawn } = {}) {
    runtime ??= await import("@anthropic-ai/sandbox-runtime");
    const manager = runtime.SandboxManager;
    const cwd = realpathSync(options.cwd);
    const config = buildSandboxConfig(cwd, options.tempDir, runtime);
    let initialized = false;
    let activeExecutions = 0;
    const children = new Set();
    try {
        await manager.initialize(config);
        if (!manager.isSandboxingEnabled()) throw new Error("当前系统无法启用命令隔离");
        initialized = true;
    } catch (error) {
        await manager.reset().catch(() => {});
        throw error;
    }

    async function launch(command, commandCwd, { signal, shell } = {}) {
        if (!initialized) throw new Error("沙盒尚未就绪，命令已阻止");
        signal?.throwIfAborted();
        const target = assertWorkspaceCwd(cwd, commandCwd);
        const commandId = randomUUID();
        const descriptor = await manager.wrapWithSandboxArgv(
            command, shell, undefined, signal, target, { commandId, commandText: command },
        );
        signal?.throwIfAborted();
        if (!initialized) throw new Error("沙盒已关闭，命令已阻止");
        if (!Array.isArray(descriptor.argv) || !descriptor.argv.length) throw new Error("沙盒未返回有效的执行程序");
        const child = spawnProcess(descriptor.argv[0], descriptor.argv.slice(1), {
            cwd: target,
            shell: false,
            env: sandboxEnvironment(descriptor.env, options.tempDir),
            detached: process.platform !== "win32",
            stdio: ["pipe", "pipe", "pipe"],
            windowsHide: true,
        });
        children.add(child);
        child.once("close", () => children.delete(child));
        return { child, commandId };
    }

    async function exec(command, commandCwd, { onData, signal, timeout, shell } = {}) {
        activeExecutions++;
        const controller = new AbortController();
        const abort = () => controller.abort();
        signal?.addEventListener("abort", abort, { once: true });
        if (signal?.aborted) abort();
        let timedOut = false;
        const timer = timeout > 0 ? setTimeout(() => { timedOut = true; abort(); }, timeout * 1000) : null;
        let child;
        try {
            const launched = await launch(command, commandCwd, { signal: controller.signal, shell });
            child = launched.child;
            const cancel = () => killSandboxChild(child);
            controller.signal.addEventListener("abort", cancel, { once: true });
            if (controller.signal.aborted) cancel();
            let stderr = "";
            child.stdout.on("data", (data) => onData?.(data));
            child.stderr.on("data", (data) => {
                stderr = (stderr + data.toString()).slice(-16_000);
                onData?.(data);
            });
            child.stdin.end();
            try {
                const exitCode = await new Promise((resolveExit, reject) => {
                    child.once("error", reject);
                    child.once("close", (code) => resolveExit(code));
                });
                if (timedOut) throw new Error(`timeout:${timeout}`);
                if (controller.signal.aborted) throw new Error("aborted");
                const annotated = manager.annotateStderrWithSandboxFailures(launched.commandId, stderr);
                if (annotated.startsWith(stderr) && annotated.length > stderr.length) {
                    onData?.(Buffer.from(annotated.slice(stderr.length)));
                }
                return { exitCode };
            } finally {
                controller.signal.removeEventListener("abort", cancel);
            }
        } finally {
            if (timer) clearTimeout(timer);
            signal?.removeEventListener("abort", abort);
            if (child) killSandboxChild(child);
            if (child && children.has(child)) await new Promise((done) => child.once("close", done));
            activeExecutions--;
            if (activeExecutions === 0) manager.cleanupAfterCommand();
        }
    }

    async function reset() {
        initialized = false;
        for (const child of children) killSandboxChild(child);
        await Promise.all([...children].map((child) => new Promise((done) => child.once("close", done))));
        children.clear();
        await manager.reset();
    }

    return { exec, launch, reset };
}
