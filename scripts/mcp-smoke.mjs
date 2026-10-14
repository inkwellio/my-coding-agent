import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createMcpStore } = require("../electron/mcp-service.cjs");
const dir = mkdtempSync(join(tmpdir(), "mcp-smoke-"));
try {
    const file = join(dir, "agent", "mcp.json");
    const legacy = join(dir, "mcp-servers.json");
    writeFileSync(legacy, JSON.stringify({ servers: [
        { id: "old-id", name: "Old Server", command: "python3", args: ["server.py"], env: {}, enabled: true },
    ] }));
    const store = createMcpStore(file, legacy);
    assert.equal(store.list()[0].name, "Old_Server");
    assert.ok(existsSync(`${legacy}.migrated`));
    let config = JSON.parse(readFileSync(file, "utf8"));
    assert.equal(config.mcpServers.Old_Server.command, "python3");
    assert.equal(config.mcpServers.Old_Server.exposure, "codemode");

    config.autoEnableCodemode = false;
    config.mcpServers.external = { url: "https://example.test/mcp", oauth: { clientId: "existing" }, customField: true };
    writeFileSync(file, JSON.stringify(config));
    const saved = store.save({ name: "docs", transport: "http", url: "https://docs.test/mcp", headers: {}, description: "Search docs", exposure: "deferred" });
    assert.equal(saved.id, "docs");
    assert.equal(saved.exposure, "deferred");
    store.setEnabled("docs", false);
    config = JSON.parse(readFileSync(file, "utf8"));
    assert.equal(config.autoEnableCodemode, false);
    assert.equal(config.mcpServers.external.oauth.clientId, "existing");
    assert.equal(config.mcpServers.docs.enabled, false);
    assert.throws(() => store.save({ name: "bad name", command: "node" }), /名称/);
    store.remove("docs");
    assert.equal(JSON.parse(readFileSync(file, "utf8")).mcpServers.docs, undefined);
    assert.equal(store.list().length, 2);

    // Secrets stay in the main process: rows carry a placeholder that saves back unchanged.
    store.save({ name: "secret", transport: "stdio", command: "node", args: [], env: { TOKEN: "env-secret-value", EMPTY: "" } });
    store.save({ name: "remote", transport: "http", url: "https://remote.test/mcp", headers: { Authorization: "Bearer header-secret" } });
    const rows = store.list();
    assert.equal(JSON.stringify(rows).includes("env-secret-value"), false);
    assert.equal(JSON.stringify(rows).includes("header-secret"), false);
    const secretRow = rows.find((row) => row.id === "secret");
    assert.equal(secretRow.env.EMPTY, "");
    store.save({ ...secretRow, env: { ...secretRow.env, EXTRA: "new" } });
    store.save({ ...rows.find((row) => row.id === "remote"), name: "remote2" });
    config = JSON.parse(readFileSync(file, "utf8"));
    assert.deepEqual(config.mcpServers.secret.env, { TOKEN: "env-secret-value", EMPTY: "", EXTRA: "new" });
    assert.equal(config.mcpServers.remote2.headers.Authorization, "Bearer header-secret");
    assert.throws(() => store.save({ name: "fresh", transport: "stdio", command: "node", env: { TOKEN: secretRow.env.TOKEN } }), /重新填写/);

    // A damaged legacy file is set aside instead of failing every MCP action.
    const brokenDir = mkdtempSync(join(tmpdir(), "mcp-smoke-broken-"));
    try {
        const brokenLegacy = join(brokenDir, "mcp-servers.json");
        writeFileSync(brokenLegacy, "{not json");
        const brokenStore = createMcpStore(join(brokenDir, "agent", "mcp.json"), brokenLegacy);
        assert.deepEqual(brokenStore.list(), []);
        assert.ok(existsSync(`${brokenLegacy}.invalid`));
    } finally { rmSync(brokenDir, { recursive: true, force: true }); }
    console.log("Pi mcp.json configuration and legacy migration passed");
} finally { rmSync(dir, { recursive: true, force: true }); }
