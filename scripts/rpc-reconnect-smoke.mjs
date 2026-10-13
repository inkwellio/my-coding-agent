import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createWindowSession } from "../electron/rpc-host.mjs";
import { SANDBOX_ENV, SANDBOX_ERROR, SANDBOX_READY } from "../electron/sandbox-execution.mjs";

const dir = await mkdtemp(join(tmpdir(), "pi-rpc-reconnect-"));
process.env.PI_CODING_AGENT_DIR = dir;
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const options = { cwd: dir, tempDir: dir, token: "reconnect-test" };
const sessions = [];
let nextId = 1;
function createSession(RpcClientCtor, extra = {}) {
    const session = createWindowSession({ webContentsId: nextId++, cwd: dir, send() {}, RpcClientCtor,
        credentialReader: async () => ({ configured: false, source: null, mask: null, providerId: null }), ...extra });
    sessions.push(session);
    return session;
}
async function waitFor(predicate) {
    for (let i = 0; i < 100; i++) {
        if (predicate()) return;
        await sleep(20);
    }
    assert.fail("RPC transition did not finish");
}

try {
    let starts = 0;
    class SandboxFailureClient {
        process = Object.assign(new EventEmitter(), { pid: 123, exitCode: null });
        onEvent(callback) { this.event = callback; }
        async start() {
            starts++;
            this.event({ type: "extension_ui_request", method: "notify", message: `${SANDBOX_ERROR}${options.token}:sandbox initialization failed` });
        }
        async getState() { return { isStreaming: false }; }
        getStderr() { return "unrelated startup warning"; }
        async stop() {
            this.process.exitCode = 1;
            this.process.emit("exit", 1, null);
            await sleep(650); // Longer than the old reconnect delay.
        }
    }
    const failed = createSession(SandboxFailureClient, { sandboxOptions: options });
    await failed.start();
    assert.equal(failed.snapshot().engine, "disconnected", "cleanup exit must not turn a sandbox failure back into reconnecting");
    assert.match(failed.snapshot().detail, /sandbox initialization failed/, "a warning must not replace the sandbox failure");
    await sleep(450);
    assert.equal(starts, 1, "sandbox activation failures must not automatically retry");

    let timedOutClient;
    let resolveState;
    class HangingStateClient {
        constructor() { timedOutClient = this; }
        process = Object.assign(new EventEmitter(), { exitCode: null });
        onEvent() {}
        async start() {}
        getState() { return new Promise((done) => { resolveState = done; }); }
        async stop() { this.stopped = true; this.process.exitCode = 0; this.process.emit("exit", 0); }
    }
    const timedOut = createSession(HangingStateClient, { startupTimeoutMs: 100 });
    await timedOut.start();
    assert.equal(timedOut.snapshot().engine, "disconnected");
    assert.match(timedOut.snapshot().detail, /启动超时/);
    assert.equal(timedOutClient.stopped, true);
    resolveState({ isStreaming: false });
    await sleep(20);
    assert.equal(timedOut.snapshot().engine, "disconnected", "late replies must not restore readiness after timeout");

    let sandboxStateRequested = false;
    class MissingHandshakeClient extends HangingStateClient {
        getState() { sandboxStateRequested = true; return Promise.resolve({ isStreaming: false }); }
    }
    const missingHandshake = createSession(MissingHandshakeClient, { sandboxOptions: options, startupTimeoutMs: 100 });
    await missingHandshake.start();
    assert.equal(missingHandshake.snapshot().engine, "disconnected");
    assert.match(missingHandshake.snapshot().detail, /沙盒启动超时/);
    assert.equal(sandboxStateRequested, false, "get_state should wait until the sandbox extension finishes initialization");

    const reconnectClients = [];
    class HealthyClient {
        constructor() { reconnectClients.push(this); }
        process = Object.assign(new EventEmitter(), { exitCode: null });
        onEvent() {}
        async start() {}
        async getState() { return { isStreaming: false }; }
        async stop() { this.process.exitCode = 0; this.process.emit("exit", 0); }
    }
    const reconnect = createSession(HealthyClient);
    await reconnect.start();
    await reconnect.start();
    assert.equal(reconnectClients.length, 1, "an already-connected start should not spawn again");
    reconnectClients[0].process.exitCode = 1;
    reconnectClients[0].process.emit("exit", 1);
    await waitFor(() => reconnectClients.length === 2 && reconnect.snapshot().engine === "idle");
    reconnectClients[1].process.exitCode = 1;
    reconnectClients[1].process.emit("exit", 1);
    await sleep(450);
    assert.equal(reconnect.snapshot().engine, "disconnected");
    assert.equal(reconnectClients.length, 2, "rapid crashes must not reset the restart budget indefinitely");

    let delayedClient;
    let finishStart;
    class DelayedStartClient extends HealthyClient {
        process = null;
        constructor() { super(); delayedClient = this; }
        start() { return new Promise((done) => { finishStart = () => { this.process = Object.assign(new EventEmitter(), { exitCode: null }); done(); }; }); }
        async stop() { if (this.process) { this.process.exitCode = 0; this.process.emit("exit", 0); } }
    }
    const cancelled = createSession(DelayedStartClient, { startupTimeoutMs: 1000 });
    const starting = cancelled.start();
    await waitFor(() => Boolean(finishStart));
    await cancelled.stop();
    await starting;
    finishStart();
    await waitFor(() => delayedClient.process?.exitCode === 0);
    assert.equal(cancelled.snapshot().engine, "disconnected", "cancelled startup must dispose of a late process");

    class BrokenClient { constructor() { throw new Error("client constructor failed"); } }
    const broken = createSession(BrokenClient);
    await broken.start();
    assert.equal(broken.snapshot().engine, "disconnected");
    assert.match(broken.snapshot().detail, /client constructor failed/);

    const savedConfig = process.env[SANDBOX_ENV];
    try {
        process.env[SANDBOX_ENV] = JSON.stringify(options);
        const { default: desktopSandbox } = await import("../electron/sandbox-extension.mjs");
        const handlers = new Map();
        const tools = [];
        let bashLookups = 0;
        let notification;
        desktopSandbox({ registerTool: (tool) => tools.push(tool), on: (event, handler) => handlers.set(event, handler) }, {
            platform: "win32",
            resolveBash: () => { bashLookups++; throw new Error("Git Bash not installed"); },
            resolvePowerShell: () => "powershell.exe",
            createExecutor: async () => ({ exec: async (command, _cwd, params) => {
                assert.equal(command, "exit /b 0");
                assert.equal(params.timeout, 10);
                return { exitCode: 0 };
            }, reset: async () => {} }),
        });
        assert.equal(bashLookups, 0, "Windows sandbox registration must not require Git Bash");
        assert.ok(tools.some((tool) => tool.name === "powershell"));
        await handlers.get("session_start")({}, { ui: { notify: (message) => { notification = message; } } });
        assert.equal(notification, `${SANDBOX_READY}${options.token}`);
        const { operations } = handlers.get("user_bash")();
        await assert.rejects(operations.exec("echo hello", dir, {}), /Git Bash/);
        assert.equal(bashLookups, 1);
        await handlers.get("session_shutdown")();
    } finally {
        if (savedConfig === undefined) delete process.env[SANDBOX_ENV];
        else process.env[SANDBOX_ENV] = savedConfig;
    }
    console.log("rpc reconnect smoke passed: sandbox failure cleanup, startup deadline, handshake deadline, retry limit, cancellation, Windows without Git Bash");
} finally {
    await Promise.all(sessions.map((session) => session.stop()));
    await rm(dir, { recursive: true, force: true });
}
