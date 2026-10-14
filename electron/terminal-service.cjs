const { spawn } = require("node:child_process");
const { StringDecoder } = require("node:string_decoder");
const path = require("node:path");

function createTerminalService(send, { spawnProcess = spawn } = {}) {
    const terminals = new Map();
    const generations = new Map();

    async function stop(id) {
        generations.set(id, (generations.get(id) || 0) + 1);
        const terminal = terminals.get(id);
        if (!terminal) return;
        terminals.delete(id);
        const closed = new Promise((done) => terminal.once("close", done));
        send(id, { type: "exit", code: null });
        const timer = setTimeout(() => terminal.kill("SIGKILL"), 10_000);
        if (terminal.connected) terminal.send({ type: "stop" }, () => {});
        else terminal.kill();
        try { await closed; } finally { clearTimeout(timer); }
    }

    async function start(id, cwd, sandboxOptions = null) {
        const stopping = stop(id);
        const generation = generations.get(id);
        await stopping;
        if (generations.get(id) !== generation) return { ok: false, message: "终端启动已取消" };
        const shell = process.platform === "win32" ? (process.env.ComSpec || "cmd.exe") : (process.env.SHELL || "/bin/sh");
        const windows = process.platform === "win32";
        // Run the sandbox wrapper with Electron's own Node so it works without Node on PATH.
        const child = spawnProcess(sandboxOptions ? process.execPath : shell, sandboxOptions
            ? [path.join(__dirname, "sandbox-terminal.mjs")]
            : windows ? ["/D", "/Q", "/K", "chcp 65001>nul"] : [], {
            cwd,
            env: { ...process.env, TERM: "dumb", NO_COLOR: "1", ...(windows ? { PROMPT: " " } : {}),
                ...(sandboxOptions ? { ELECTRON_RUN_AS_NODE: "1" } : {}),
                PI_DESKTOP_SANDBOX_CONFIG: sandboxOptions ? JSON.stringify(sandboxOptions) : "" },
            stdio: sandboxOptions ? ["pipe", "pipe", "pipe", "ipc"] : ["pipe", "pipe", "pipe"],
            windowsHide: true,
        });
        terminals.set(id, child);
        // A write racing the shell's exit raises EPIPE asynchronously; unhandled, it crashes the main process.
        child.stdin.on("error", (error) => {
            if (terminals.get(id) === child) send(id, { type: "error", data: error.message });
        });
        for (const stream of [child.stdout, child.stderr]) {
            const decoder = new StringDecoder("utf8");
            stream.on("data", (data) => {
                const text = decoder.write(data);
                if (text) send(id, { type: "output", data: text });
            });
            stream.on("end", () => {
                const text = decoder.end();
                if (text) send(id, { type: "output", data: text });
            });
        }
        child.on("error", (error) => send(id, { type: "error", data: error.message }));
        child.on("close", (code) => {
            if (terminals.get(id) !== child) return;
            terminals.delete(id);
            send(id, { type: "exit", code });
        });
        if (sandboxOptions) {
            try {
                await new Promise((ready, reject) => {
                    const timer = setTimeout(() => { cleanup(); reject(new Error("沙盒终端启动超时")); }, 20_000);
                    const message = (event) => {
                        if (event?.type === "ready") { cleanup(); ready(); }
                        else if (event?.type === "error") { cleanup(); reject(new Error(event.message)); }
                    };
                    const failed = (error) => { cleanup(); reject(error instanceof Error ? error : new Error("沙盒终端启动失败")); };
                    const cleanup = () => {
                        clearTimeout(timer);
                        child.off("message", message);
                        child.off("error", failed);
                        child.off("close", failed);
                    };
                    child.on("message", message);
                    child.once("error", failed);
                    child.once("close", failed);
                });
                if (terminals.get(id) !== child) return { ok: false, message: "终端启动已取消" };
            } catch (error) {
                if (terminals.get(id) === child) await stop(id);
                return { ok: false, message: error.message };
            }
        }
        return { ok: true, cwd };
    }

    function write(id, command) {
        const child = terminals.get(id);
        if (!child || !child.stdin.writable) return { ok: false, message: "终端未运行" };
        if (typeof command !== "string" || command.length > 100_000) return { ok: false, message: "命令无效或过长" };
        const line = command + (process.platform === "win32" ? "\r\n" : "\n");
        child.stdin.write(line);
        return { ok: true };
    }

    return { start, write, stop };
}

module.exports = { createTerminalService };
