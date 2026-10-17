/**
 * Smoke test for a packaged build: verifies the app's bundled code can locate
 * Pi's CLI inside the app resources and start the RPC child with Electron's own
 * Node runtime (no system Node needed).
 *
 * Run with the packaged executable in Node mode:
 *   ELECTRON_RUN_AS_NODE=1 "<packaged executable>" scripts/packaged-smoke.mjs "<resources>/app"
 */
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const appDir = resolve(process.argv[2] || "");
assert.ok(process.versions.electron, "run this script with the packaged Electron executable and ELECTRON_RUN_AS_NODE=1");

const agentDir = mkdtempSync(join(tmpdir(), "mca-packaged-smoke-"));
process.env.PI_CODING_AGENT_DIR = agentDir;
process.env.PI_SKIP_VERSION_CHECK = "1";
process.env.PI_TELEMETRY = "0";

const host = await import(pathToFileURL(join(appDir, "electron", "rpc-host.mjs")).href);
const cliPath = host.resolvePiCli();
assert.ok(cliPath, "Pi CLI was not found");
assert.ok(resolve(cliPath).startsWith(appDir + sep), `Pi CLI should come from the app resources, got ${cliPath}`);

const runtime = host.piNodeRuntime();
assert.ok(runtime, "Electron Node runtime should be used inside Electron");
assert.equal(runtime.command, process.execPath, "Pi should run with the packaged executable");

const RpcClient = await host.loadRpcClientClass();
const rpc = new RpcClient({ cliPath, cwd: agentDir, env: {} });
try {
    await rpc.start();
    const state = await rpc.getState();
    assert.equal(state.isStreaming, false);
    if (process.platform !== "win32") {
        const result = await rpc.bash("echo \"flag=[${ELECTRON_RUN_AS_NODE:-unset}]\"");
        assert.match(String(result.output), /flag=\[unset\]/, "ELECTRON_RUN_AS_NODE must not leak into agent commands");
    }
    console.log(`packaged smoke ok: electron ${process.versions.electron}, node ${process.version}, pi ${cliPath}`);
} finally {
    await rpc.stop().catch(() => {});
    rmSync(agentDir, { recursive: true, force: true });
}
