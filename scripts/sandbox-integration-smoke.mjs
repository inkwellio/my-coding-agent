import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSandboxExecutor } from "../electron/sandbox-execution.mjs";

// Requires installed runtime + OS dependencies; an unavailable sandbox fails this check.
const root = await mkdtemp(join(tmpdir(), "pi-sandbox-integration-"));
const cwd = join(root, "workspace");
const tempDir = join(root, "temp");
await Promise.all([mkdir(cwd), mkdir(tempDir)]);
let executor;
try {
    executor = await createSandboxExecutor({ cwd, tempDir });
    const windows = process.platform === "win32";
    const write = await executor.exec(windows ? "echo allowed> allowed.txt" : "printf allowed > allowed.txt", cwd);
    assert.equal(write.exitCode, 0, "workspace writes must work");
    assert.match(await readFile(join(cwd, "allowed.txt"), "utf8"), /allowed/);
    const denied = await executor.exec(windows ? "echo forbidden> ..\\outside.txt" : "printf forbidden > ../outside.txt", cwd);
    assert.notEqual(denied.exitCode, 0, "writes outside the workspace must fail");
    await assert.rejects(readFile(join(root, "outside.txt")), { code: "ENOENT" });
    assert.equal((await executor.exec("curl --version", cwd)).exitCode, 0, "curl must be available to test network isolation");
    let output = "";
    const network = await executor.exec("curl --max-time 5 --fail https://example.com", cwd, { timeout: 8, onData: (data) => { output += data; } });
    assert.notEqual(network.exitCode, 0, "network access must fail with an empty allowlist");
    assert.match(output, /sandbox_violations|blocked.by.sandbox|403|connection blocked/i, "the failure must come from sandbox policy");
    console.log("sandbox integration passed: workspace writes allowed, outside writes and network blocked");
} finally {
    await executor?.reset();
    await rm(root, { recursive: true, force: true });
}
