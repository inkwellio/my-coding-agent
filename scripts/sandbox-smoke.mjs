import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import terminalServiceModule from "../electron/terminal-service.cjs";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSandboxExecutor, buildSandboxConfig, sandboxEnvironment, assertWorkspaceCwd,
    createSandboxHandshake, SANDBOX_ENV, SANDBOX_READY, SANDBOX_ERROR } from "../electron/sandbox-execution.mjs";
import { createSandboxService } from "../electron/sandbox-service.mjs";
import { createWindowSession } from "../electron/rpc-host.mjs";

const root = await mkdtemp(join(tmpdir(), "pi-sandbox-test-"));
const cwd = join(root, "workspace");
const tempDir = join(root, "temp");
const outside = join(root, "workspace-other");
await Promise.all([mkdir(cwd), mkdir(tempDir), mkdir(outside)]);
const options = { cwd, tempDir, token: "test-token" };
let executor;
let session;
try {
    const config = buildSandboxConfig(cwd, tempDir, {}, process.env, "linux");
    assert.deepEqual(config.network.allowedDomains, []);
    assert.deepEqual(config.filesystem.allowWrite, [cwd, tempDir]);
    assert.ok(config.filesystem.denyRead.some((entry) => entry.endsWith(".ssh")));
    assert.ok(config.filesystem.denyWrite.some((entry) => entry.endsWith("node_modules")));
    // Windows keeps only deny paths inside granted roots so ACL stamping stays out of the user profile.
    const windowsConfig = buildSandboxConfig(cwd, tempDir, {}, process.env, "win32");
    assert.ok(!windowsConfig.filesystem.denyRead.some((entry) => entry.endsWith(".ssh")));
    assert.ok(!windowsConfig.filesystem.denyWrite.some((entry) => entry.endsWith("_logs")));
    assert.ok(windowsConfig.filesystem.denyRead.some((entry) => entry.endsWith(".env")));
    assert.ok(windowsConfig.filesystem.denyWrite.some((entry) => entry.endsWith("node_modules")));
    const env = sandboxEnvironment({ PATH: "/bin", ANTHROPIC_API_KEY: "secret", AWS_SECRET_ACCESS_KEY: "secret",
        NODE_OPTIONS: "--require untrusted.js", BASH_ENV: "untrusted.sh", [SANDBOX_ENV]: "private", LANG: "C" }, tempDir);
    assert.equal(env.PATH, "/bin");
    for (const name of ["ANTHROPIC_API_KEY", "AWS_SECRET_ACCESS_KEY", "NODE_OPTIONS", "BASH_ENV", SANDBOX_ENV]) assert.equal(env[name], undefined);
    assert.equal(env.TMPDIR, tempDir);
    assert.throws(() => assertWorkspaceCwd(cwd, outside), /工作区/);
    if (process.platform !== "win32") {
        await symlink(outside, join(cwd, "escape"));
        assert.throws(() => assertWorkspaceCwd(cwd, join(cwd, "escape")), /工作区/);
    }

    const hand = createSandboxHandshake(options.token);
    assert.equal(hand.handleEvent({ type: "extension_ui_request", method: "notify", message: `${SANDBOX_READY}wrong` }), false);
    hand.handleEvent({ type: "extension_ui_request", method: "notify", message: `${SANDBOX_READY}${options.token}` });
    await hand.ready;
    hand.dispose();
    const failedHand = createSandboxHandshake(options.token);
    failedHand.handleEvent({ type: "extension_ui_request", method: "notify", message: `${SANDBOX_ERROR}${options.token}:blocked` });
    await assert.rejects(failedHand.ready, /blocked/);
    failedHand.dispose();
    const missingHand = createSandboxHandshake("missing", 10);
    await assert.rejects(missingHand.ready, /未确认/);
    missingHand.dispose();

    let wrapped = 0;
    let spawned = 0;
    let cleanups = 0;
    let rejectWrap = false;
    const runtime = { SandboxManager: {
        async initialize(actual) { assert.deepEqual(actual.network.allowedDomains, []); },
        isSandboxingEnabled: () => true,
        async wrapWithSandboxArgv(command) {
            wrapped++;
            if (rejectWrap) throw new Error("wrap failed");
            return { argv: process.platform === "win32"
                ? command === "wait" ? [process.execPath, "-e", "setInterval(() => {}, 1000)"]
                    : [process.execPath, "-e", "process.stdout.write(process.argv[1])", command]
                : command === "wait" ? ["/bin/sleep", "5"] : ["/bin/echo", command], env: process.env };
        },
        annotateStderrWithSandboxFailures: (_id, stderr) => stderr,
        cleanupAfterCommand: () => { cleanups++; },
        async reset() {},
    } };
    executor = await createSandboxExecutor(options, { runtime, spawnProcess: (program, args, settings) => {
        spawned++;
        assert.equal(settings.shell, false);
        assert.equal(settings.env.ANTHROPIC_API_KEY, undefined);
        return spawn(program, args, settings);
    } });
    const command = "printf 'quotes' && $(echo substitution); `echo backticks` > outside.txt";
    let output = "";
    assert.equal((await executor.exec(command, cwd, { onData: (data) => { output += data; } })).exitCode, 0);
    assert.equal(output, command + (process.platform === "win32" ? "" : "\n"), "command bytes must be passed to the isolated descriptor, never the host shell");
    await assert.rejects(executor.exec("wait", cwd, { timeout: 0.05 }), /timeout/);
    const controller = new AbortController();
    const pending = executor.exec("wait", cwd, { signal: controller.signal });
    setTimeout(() => controller.abort(), 30);
    await assert.rejects(pending, /aborted/i);
    const before = spawned;
    const aborted = new AbortController();
    aborted.abort();
    await assert.rejects(executor.exec("blocked", cwd, { signal: aborted.signal }));
    assert.equal(spawned, before);
    rejectWrap = true;
    await assert.rejects(executor.exec("blocked", cwd), /wrap failed/);
    assert.equal(spawned, before, "wrap errors must never fall back to local execution");
    assert.ok(wrapped >= 4 && cleanups >= 4);
    await executor.reset();
    await assert.rejects(executor.exec("blocked", cwd), /尚未就绪/);

    await assert.rejects(createSandboxExecutor(options, { runtime: { SandboxManager: {
        initialize: async () => { throw new Error("dependencies missing"); }, reset: async () => {},
    } } }), /dependencies missing/);
    const unavailable = createSandboxService({ loadRuntime: async () => { throw new Error("package missing"); } });
    assert.equal((await unavailable.probe()).ready, false);
    await assert.rejects(unavailable.prepare(1, cwd), /package missing/);
    assert.equal(unavailable.snapshot(1, cwd).state, "off");
    for (const code of ["ERR_MODULE_NOT_FOUND", "MODULE_NOT_FOUND"]) {
        const missingDependency = createSandboxService({ loadRuntime: async () => {
            throw Object.assign(new Error("Cannot find package 'sandbox-runtime'"), { code });
        } });
        const status = await missingDependency.probe();
        assert.equal(status.ready, false);
        assert.equal(status.installRequired, false, "missing npm dependencies must not trigger Windows system installation");
        assert.match(status.detail, /npm install/);
        assert.match(status.detail, /重启应用/);
    }
    const unsupported = createSandboxService({ platform: "unsupported" });
    assert.equal((await unsupported.probe()).capability, "unsupported");
    let cancelledInstall = true;
    const windows = createSandboxService({ platform: "win32", loadRuntime: async () => ({
        VENDORED_SRT_WIN_EXE: "trusted.exe", resolveSrtWin: () => ({ exe: "trusted.exe" }),
        checkWindowsSandboxStatusAsync: async () => ({ user: { provisioned: !cancelledInstall, credPresent: !cancelledInstall } }),
        installWindowsSandboxAsync: async () => ({ cancelled: cancelledInstall }),
        SandboxManager: { updateConfig() {}, checkDependenciesAsync: async () => ({ errors: [], warnings: [] }) },
    }) });
    assert.equal((await windows.probe()).installRequired, true);
    assert.equal((await windows.installWindows()).cancelled, true);
    assert.equal(windows.snapshot(2, cwd).state, "off");
    cancelledInstall = false;
    assert.equal((await windows.installWindows()).ok, true);
    const concurrentWindows = await Promise.allSettled([windows.prepare(21, cwd), windows.prepare(22, outside)]);
    assert.equal(concurrentWindows.filter((result) => result.status === "fulfilled").length, 1,
        "Windows account grants must not span concurrent workspaces");
    await Promise.all([windows.release(21), windows.release(22)]);

    const starts = [];
    class FakeTerminal extends EventEmitter {
        stdin = new PassThrough();
        stdout = new PassThrough();
        stderr = new PassThrough();
        kill() { queueMicrotask(() => this.emit("close", 0)); }
    }
    const terminal = terminalServiceModule.createTerminalService(() => {}, { spawnProcess: (program, args, settings) => {
        starts.push({ program, args, settings });
        const child = new FakeTerminal();
        if (settings.stdio.includes("ipc")) queueMicrotask(() => child.emit("message", { type: "error", message: "isolation blocked" }));
        return child;
    } });
    assert.equal((await terminal.start(10, cwd)).ok, true);
    await terminal.stop(10);
    const isolatedTerminal = await terminal.start(10, cwd, options);
    assert.equal(isolatedTerminal.ok, false);
    assert.match(isolatedTerminal.message, /isolation blocked/);
    assert.match(starts.at(-1).args[0], /sandbox-terminal\.mjs$/);
    assert.equal(starts.at(-1).program, process.execPath, "the sandbox wrapper must not depend on node in PATH");
    assert.equal(starts.at(-1).settings.env.ELECTRON_RUN_AS_NODE, "1");
    assert.equal(starts.length, 2, "terminal startup failure must not fall back to a host shell");
    const cancelledTerminal = terminal.start(11, cwd);
    await terminal.stop(11);
    assert.equal((await cancelledTerminal).ok, false);
    assert.equal(starts.length, 2, "a cancelled start must not spawn later");

    let current;
    let rejectReady = false;
    class FakeRpcClient {
        constructor(settings) { this.settings = settings; current = this; }
        onEvent(callback) { this.event = callback; }
        async start() {
            const sandbox = this.settings.env[SANDBOX_ENV] && JSON.parse(this.settings.env[SANDBOX_ENV]);
            if (sandbox) this.event({ type: "extension_ui_request", method: "notify",
                message: `${rejectReady ? SANDBOX_ERROR : SANDBOX_READY}${sandbox.token}${rejectReady ? ":initialization failed" : ""}` });
        }
        async getState() { return { isStreaming: false, sessionFile: join(root, "session.jsonl") }; }
        async stop() {}
        getStderr() { return ""; }
    }
    await writeFile(join(root, "session.jsonl"), "");
    session = createWindowSession({ webContentsId: 3, cwd, cwdWarning: null, send() {}, RpcClientCtor: FakeRpcClient });
    await session.start();
    assert.equal(session.snapshot().engine, "idle");
    assert.equal((await session.setSandbox(options)).ok, true);
    assert.ok(current.settings.args.includes("--extension"));
    assert.ok(current.settings.args.includes(join(root, "session.jsonl")), "restart must preserve the active session file");
    assert.equal(JSON.parse(current.settings.env[SANDBOX_ENV]).cwd, cwd);
    rejectReady = true;
    assert.equal((await session.reloadMcp()).ok, false);
    assert.equal(session.snapshot().engine, "disconnected", "the RPC engine cannot accept prompts without the sandbox handshake");
    assert.ok(current.settings.args.includes("--extension"), "restart failure must retain the policy");
    rejectReady = false;
    assert.equal((await session.setSandbox(null)).ok, true);
    assert.equal(current.settings.env[SANDBOX_ENV], "");
    console.log("sandbox smoke passed: policy, secrets, cwd, quoting, abort, timeout, fail-closed startup, Windows cancellation, RPC restart");
} finally {
    await session?.stop();
    await executor?.reset();
    await rm(root, { recursive: true, force: true });
}
