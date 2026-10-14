const fs = require("node:fs");
const path = require("node:path");

const SERVER_NAME = /^[A-Za-z0-9_-]+$/;
const EXPOSURES = new Set(["codemode", "deferred", "direct", "hidden"]);
// Env values and headers often hold tokens. The renderer only sees this placeholder;
// saving it back keeps the stored value.
const MASKED_VALUE = "••••••";

function maskValues(values) {
    if (!values || typeof values !== "object" || Array.isArray(values)) return values;
    return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value ? MASKED_VALUE : value]));
}

function restoreMasked(values, previous, label) {
    const restored = {};
    for (const [key, value] of Object.entries(values)) {
        if (value !== MASKED_VALUE) {
            restored[key] = value;
            continue;
        }
        const stored = previous && typeof previous === "object" ? previous[key] : undefined;
        if (typeof stored !== "string") throw new Error(`请重新填写${label} ${key} 的值`);
        restored[key] = stored;
    }
    return restored;
}

function readConfig(filePath) {
    if (!fs.existsSync(filePath)) return { mcpServers: {} };
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Pi MCP 配置格式无效");
    if (data.mcpServers !== undefined && (!data.mcpServers || typeof data.mcpServers !== "object" || Array.isArray(data.mcpServers))) {
        throw new Error("Pi MCP 服务列表格式无效");
    }
    return { ...data, mcpServers: { ...data.mcpServers } };
}

function writeConfig(filePath, data) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const temp = `${filePath}.${process.pid}.tmp`;
    try {
        fs.writeFileSync(temp, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
        fs.renameSync(temp, filePath);
    } finally {
        if (fs.existsSync(temp)) fs.unlinkSync(temp);
    }
}

function validate(value) {
    const name = String(value?.name ?? "").trim();
    if (!SERVER_NAME.test(name) || name.length > 80) throw new Error("服务名称只能使用字母、数字、下划线和连字符，最多 80 字");
    const description = String(value?.description ?? "").trim();
    const exposure = value?.exposure ?? "codemode";
    if (!EXPOSURES.has(exposure)) throw new Error("工具暴露方式无效");
    const common = { enabled: value?.enabled !== false, exposure };
    if (description) common.description = description;
    if (value?.transport === "http") {
        const url = String(value?.url ?? "").trim();
        try { if (!["http:", "https:"].includes(new URL(url).protocol)) throw new Error(); }
        catch { throw new Error("请输入有效的 HTTP 或 HTTPS MCP 地址"); }
        const headers = value?.headers ?? {};
        if (!headers || typeof headers !== "object" || Array.isArray(headers) || Object.entries(headers).some(([key, val]) => !/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(key) || typeof val !== "string")) throw new Error("请求头格式无效");
        return { name, config: { url, headers, ...common } };
    }
    const command = String(value?.command ?? "").trim();
    const args = value?.args ?? [];
    const env = value?.env ?? {};
    if (!command || command.length > 1000) throw new Error("请输入可执行命令");
    if (!Array.isArray(args) || args.some((arg) => typeof arg !== "string")) throw new Error("命令参数必须是字符串数组");
    if (!env || typeof env !== "object" || Array.isArray(env) || Object.entries(env).some(([key, val]) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || typeof val !== "string")) throw new Error("环境变量格式无效");
    return { name, config: { command, args, env, ...common } };
}

function toRow(name, config) {
    const entry = config && typeof config === "object" ? config : {};
    const row = { ...entry, id: name, name, transport: entry.url ? "http" : "stdio", enabled: entry.enabled !== false, exposure: entry.exposure ?? "codemode" };
    if (row.env !== undefined) row.env = maskValues(row.env);
    if (row.headers !== undefined) row.headers = maskValues(row.headers);
    return row;
}

function createMcpStore(filePath, legacyPath) {
    function migrateLegacy() {
        if (!legacyPath || !fs.existsSync(legacyPath)) return;
        let legacy;
        try {
            legacy = JSON.parse(fs.readFileSync(legacyPath, "utf8"));
        } catch {
            // A damaged legacy file cannot be migrated; set it aside so it stops blocking every MCP action.
            fs.renameSync(legacyPath, `${legacyPath}.invalid`);
            return;
        }
        if (!Array.isArray(legacy?.servers) || legacy.servers.length === 0) return;
        const data = readConfig(filePath);
        let changed = false;
        for (const server of legacy.servers) {
            const base = String(server.name ?? "").trim().replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 80);
            if (!base) continue;
            let name = base;
            let suffix = 2;
            while (Object.keys(data.mcpServers).some((key) => key.replace(/-/g, "_") === name.replace(/-/g, "_"))) {
                name = `${base.slice(0, 76)}_${suffix++}`;
            }
            try {
                const clean = validate({ ...server, name });
                Object.defineProperty(data.mcpServers, name, { value: clean.config, enumerable: true, configurable: true, writable: true });
                changed = true;
            } catch { /* Leave invalid legacy entries in the original file. */ }
        }
        if (changed) writeConfig(filePath, data);
        fs.renameSync(legacyPath, `${legacyPath}.migrated`);
    }

    function list() {
        migrateLegacy();
        const data = readConfig(filePath);
        return Object.entries(data.mcpServers).map(([name, config]) => toRow(name, config));
    }

    return {
        list,
        save(value) {
            migrateLegacy();
            const { name, config } = validate(value);
            const data = readConfig(filePath);
            const oldName = typeof value?.id === "string" ? value.id : null;
            if (oldName && !Object.hasOwn(data.mcpServers, oldName)) throw new Error("MCP 服务不存在");
            if (Object.keys(data.mcpServers).some((key) => key !== oldName && key.replace(/-/g, "_") === name.replace(/-/g, "_"))) throw new Error("MCP 服务名称已存在");
            const previous = oldName ? data.mcpServers[oldName] : {};
            if (config.env) config.env = restoreMasked(config.env, previous?.env, "环境变量");
            if (config.headers) config.headers = restoreMasked(config.headers, previous?.headers, "请求头");
            if (oldName && oldName !== name) delete data.mcpServers[oldName];
            const merged = { ...previous, ...config };
            if (config.url) { delete merged.command; delete merged.args; delete merged.env; delete merged.cwd; }
            else { delete merged.url; delete merged.headers; delete merged.oauth; }
            if (!config.description) delete merged.description;
            Object.defineProperty(data.mcpServers, name, { value: merged, enumerable: true, configurable: true, writable: true });
            writeConfig(filePath, data);
            return toRow(name, merged);
        },
        remove(id) {
            migrateLegacy();
            const data = readConfig(filePath);
            if (!Object.hasOwn(data.mcpServers, id)) throw new Error("MCP 服务不存在");
            delete data.mcpServers[id];
            writeConfig(filePath, data);
            return list();
        },
        setEnabled(id, enabled) {
            migrateLegacy();
            const data = readConfig(filePath);
            if (!Object.hasOwn(data.mcpServers, id)) throw new Error("MCP 服务不存在");
            data.mcpServers[id] = { ...data.mcpServers[id], enabled: Boolean(enabled) };
            writeConfig(filePath, data);
            return list();
        },
    };
}

module.exports = { createMcpStore };
