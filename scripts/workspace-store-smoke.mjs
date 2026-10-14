import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { createWorkspaceStore } = require("../electron/workspace-store.cjs");
const dir = mkdtempSync(join(tmpdir(), "workspace-store-smoke-"));
try {
    const first = join(dir, "first");
    const second = join(dir, "second");
    mkdirSync(first);
    mkdirSync(second);
    const file = join(dir, "workspaces.json");
    const store = createWorkspaceStore(file, first);
    store.add(second);
    assert.deepEqual(store.snapshot().paths, [first, second]);

    // The open workspace cannot be removed; another one can, and the change persists.
    assert.throws(() => store.remove(first), /当前打开/);
    assert.throws(() => store.remove(join(dir, "missing")), /不存在/);
    assert.deepEqual(store.remove(second).paths, [first]);
    assert.deepEqual(JSON.parse(readFileSync(file, "utf8")).paths, [first]);
    assert.deepEqual(createWorkspaceStore(file, first).snapshot().paths, [first]);
    console.log("Workspace store add/remove smoke test passed");
} finally {
    rmSync(dir, { recursive: true, force: true });
}
