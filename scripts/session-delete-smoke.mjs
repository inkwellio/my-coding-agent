import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createWindowSession } from "../electron/rpc-host.mjs";

const dir = await mkdtemp(join(tmpdir(), "pi-session-delete-"));
process.env.PI_CODING_AGENT_DIR = dir;
const credentials = async () => ({ configured: true, source: "stored", mask: "••••", providerId: "test" });
const steps = [];

function makeClient({ streaming = false, cancelNew = false } = {}) {
    return class FakeClient {
        process = Object.assign(new EventEmitter(), { pid: 1, exitCode: null });
        state = { sessionId: "current", sessionFile: join(dir, "current.jsonl"), isStreaming: streaming };
        onEvent() {}
        async start() {}
        async getState() { return { ...this.state }; }
        async newSession() {
            steps.push("newSession");
            if (cancelNew) return { cancelled: true };
            this.state = { ...this.state, sessionId: "fresh", sessionFile: join(dir, "fresh.jsonl") };
            return { cancelled: false };
        }
        async stop() { this.process.exitCode = 0; this.process.emit("exit", 0); }
    };
}

const entries = [
    { id: "current", path: join(dir, "current.jsonl"), cwd: dir, messageCount: 2 },
    { id: "old", path: join(dir, "old.jsonl"), cwd: dir, messageCount: 2 },
    { id: "elsewhere", path: join(dir, "elsewhere.jsonl"), cwd: join(dir, "other-project"), messageCount: 2 },
];

async function open(options = {}, extra = {}) {
    steps.length = 0;
    const session = createWindowSession({
        webContentsId: 1, cwd: dir, send() {}, credentialReader: credentials, RpcClientCtor: makeClient(options),
        sessionLister: async () => entries,
        trashFile: async (filePath) => { steps.push(`trash:${filePath}`); },
        ...extra,
    });
    await session.start();
    assert.equal(session.snapshot().engine, options.streaming ? "chatting" : "idle", session.snapshot().detail);
    return session;
}

try {
    // A session that is not open is removed without touching the live one.
    let session = await open();
    assert.deepEqual(await session.deleteSession("old"), { ok: true, switched: false });
    assert.deepEqual(steps, [`trash:${join(dir, "old.jsonl")}`]);
    await session.stop();

    // The open session is replaced by a new one before its file is removed.
    session = await open();
    assert.deepEqual(await session.deleteSession("current"), { ok: true, switched: true });
    assert.deepEqual(steps, ["newSession", `trash:${join(dir, "current.jsonl")}`]);
    await session.stop();

    // Unknown ids and sessions of another workspace are refused.
    session = await open();
    assert.match((await session.deleteSession("missing")).message, /不存在/);
    assert.match((await session.deleteSession("elsewhere")).message, /不属于当前工作区/);
    assert.equal((await session.deleteSession("")).ok, false);
    assert.deepEqual(steps, []);
    await session.stop();

    // A cancelled switch away from the open session keeps its file.
    session = await open({ cancelNew: true });
    assert.match((await session.deleteSession("current")).message, /已取消/);
    assert.deepEqual(steps, ["newSession"]);
    await session.stop();

    // Nothing is deleted while the assistant is answering.
    session = await open({ streaming: true });
    assert.match((await session.deleteSession("old")).message, /回答结束/);
    assert.deepEqual(steps, []);
    await session.stop();

    // Without an injected trash, the file itself is removed.
    const real = join(dir, "real.jsonl");
    await writeFile(real, "{}\n");
    session = createWindowSession({
        webContentsId: 2, cwd: dir, send() {}, credentialReader: credentials, RpcClientCtor: makeClient(),
        sessionLister: async () => [{ id: "real", path: real, cwd: dir, messageCount: 1 }],
    });
    await session.start();
    assert.equal((await session.deleteSession("real")).ok, true);
    assert.equal(existsSync(real), false);
    await session.stop();

    console.log("Session delete smoke test passed");
} finally {
    await rm(dir, { recursive: true, force: true });
}
