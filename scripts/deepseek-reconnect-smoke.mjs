import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createWindowSession } from "../electron/rpc-host.mjs";

const dir = mkdtempSync(join(tmpdir(), "pi-deepseek-reconnect-"));
process.env.PI_CODING_AGENT_DIR = dir;
const credentials = await import("../electron/credentials.mjs");
const calls = [];

class FakeRpcClient {
  process = null;
  onEvent() {}
  async start() {
    calls.push("start");
    const authFile = join(dir, "auth.json");
    const auth = existsSync(authFile) ? JSON.parse(readFileSync(authFile, "utf8")) : {};
    if (!auth.deepseek) throw new Error("no configured model");
  }
  async getState() {
    return { model: { provider: "deepseek", id: "deepseek-flash" }, isStreaming: false };
  }
  async setModel(provider, modelId) {
    calls.push(`${provider}/${modelId}`);
    return { provider, id: modelId };
  }
  async stop() {}
}

const session = createWindowSession({
  webContentsId: 10,
  cwd: process.cwd(),
  cwdWarning: null,
  send() {},
  RpcClientCtor: FakeRpcClient,
});

try {
  await session.start();
  assert.equal(session.snapshot().engine, "disconnected");
  const saved = await credentials.saveApiKey("deepseek", "sk-test-reconnect-1234");
  assert.equal(saved.status, "stored");
  const applied = await credentials.afterApiKeySaved("deepseek", session);
  assert.equal(applied.live.ok, true, applied.live.message);
  assert.deepEqual(calls, ["start", "start", "deepseek/deepseek-flash"]);
  assert.equal(session.snapshot().engine, "idle");
  assert.equal(session.snapshot().modelLabel, "deepseek/deepseek-flash");
  console.log("deepseek reconnect smoke ok");
} finally {
  await session.stop();
  rmSync(dir, { recursive: true, force: true });
}
