import { useEffect, useState } from "react";
import { Select, type SelectOption } from "../components/ui/Select";
import type { McpActionResult, McpServer, McpTestResult } from "../mcp/types";

interface McpForm { name: string; description: string; exposure: NonNullable<McpServer["exposure"]>; transport: "stdio" | "http"; command: string; args: string; env: string; url: string; headers: string }
const empty: McpForm = { name: "", description: "", exposure: "codemode", transport: "stdio", command: "", args: "", env: "", url: "", headers: "" };

const exposureOptions: SelectOption<McpForm["exposure"]>[] = [
    { value: "codemode", label: "codemode（默认）", description: "由 codemode 脚本调用，不直接声明给模型", icon: "code" },
    { value: "deferred", label: "按需搜索", description: "经 tool_search 搜到后才提供给模型", icon: "search" },
    { value: "direct", label: "直接提供给模型", description: "像内置工具一样直接声明给模型", icon: "bolt" },
    { value: "hidden", label: "隐藏工具", description: "已注册但模型无法调用", icon: "lock" },
];

const transportOptions: SelectOption<McpForm["transport"]>[] = [
    { value: "stdio", label: "本地命令 (stdio)", description: "在本机启动进程，通过标准输入输出通信", icon: "terminal" },
    { value: "http", label: "远程地址 (Streamable HTTP)", description: "连接一个远程 MCP 服务地址", icon: "cloud" },
];

function parsePairs(text: string, header = false) {
    const values: Record<string, string> = {};
    for (const rawLine of text.split("\n")) {
        const line = rawLine.replace(/\r$/, "");
        if (!line.trim()) continue;
        const equal = line.indexOf("=");
        const key = line.slice(0, equal).trim();
        const valid = header ? /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(key) : /^[A-Za-z_][A-Za-z0-9_]*$/.test(key);
        if (equal < 1 || !valid) throw new Error(`${header ? "请求头" : "环境变量"}格式无效：${key}`);
        values[key] = line.slice(equal + 1);
    }
    return values;
}

export function McpPanel() {
    const desktop = window.piDesktop;
    const [servers, setServers] = useState<McpServer[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(empty);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [note, setNote] = useState<string | null>(null);
    const [test, setTest] = useState<{ id: string; result: McpTestResult } | null>(null);

    useEffect(() => {
        if (!desktop?.listMcpServers) return;
        void desktop.listMcpServers().then(setServers).catch((cause) => setError(cause instanceof Error ? cause.message : "读取 MCP 配置失败"));
        return desktop.onMcpChanged(setServers);
    }, [desktop]);

    async function run(key: string, action: () => Promise<McpActionResult>) {
        setBusy(key);
        setError(null);
        setNote(null);
        try {
            const result = await action();
            if (!result.ok) throw new Error(result.message || "操作失败");
            if (result.servers) setServers(result.servers);
            setNote(result.applied ? "MCP 配置已加载；可使用“测试连接”查看服务工具。" : "配置已保存。当前会话忙碌时，请在回答结束后点击“重载工具”。");
            return true;
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "操作失败");
            return false;
        } finally {
            setBusy(null);
        }
    }

    async function save() {
        if (!desktop) return;
        let options: Partial<Pick<McpServer, "url" | "headers" | "command" | "args" | "env">>;
        try {
            options = form.transport === "http"
                ? { url: form.url.trim(), headers: parsePairs(form.headers, true) }
                : { command: form.command.trim(), args: form.args.split("\n").map((value) => value.trim()).filter(Boolean), env: parsePairs(form.env) };
        } catch (cause) { setError(cause instanceof Error ? cause.message : "配置格式无效"); return; }
        const saved = await run("save", () => desktop.saveMcpServer({
            ...(editingId ? { id: editingId } : {}),
            name: form.name.trim(), description: form.description.trim(), exposure: form.exposure, transport: form.transport, ...options,
            enabled: servers.find((server) => server.id === editingId)?.enabled ?? true,
        }));
        if (saved) { setEditingId(null); setForm(empty); }
    }

    function edit(server: McpServer) {
        setEditingId(server.id);
        setForm({
            name: server.name, description: server.description || "", exposure: server.exposure || "codemode", transport: server.transport || "stdio", command: server.command || "",
            args: server.args?.join("\n") || "", env: Object.entries(server.env || {}).map(([key, value]) => `${key}=${value}`).join("\n"),
            url: server.url || "", headers: Object.entries(server.headers || {}).map(([key, value]) => `${key}=${value}`).join("\n"),
        });
        setError(null);
    }

    async function testServer(server: McpServer) {
        if (!desktop) return;
        setBusy(server.id);
        setTest(null);
        try { setTest({ id: server.id, result: await desktop.testMcpServer(server.id) }); }
        catch (cause) { setTest({ id: server.id, result: { ok: false, message: cause instanceof Error ? cause.message : "连接失败" } }); }
        finally { setBusy(null); }
    }

    const inputClass = "w-full rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none focus:border-primary";
    const buttonClass = "rounded-lg border border-outline-variant/40 px-3 py-1.5 text-xs text-on-surface hover:bg-surface-container-high disabled:opacity-50";

    return (
        <section className="space-y-5 rounded-xl bg-surface-container-low p-space-xl shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">MCP 服务</h2>
                    <p className="mt-1 text-xs text-on-surface-variant">使用 Pi 内置 MCP。默认通过 codemode 调用服务工具。</p>
                </div>
                <button type="button" className={buttonClass} disabled={!desktop || !!busy} onClick={() => desktop && void run("reload", () => desktop.reloadMcpTools())}>重载工具</button>
            </div>
            {!desktop ? <p className="text-xs text-on-surface-variant">请在桌面窗口中管理 MCP 服务。</p> : null}
            {error ? <p role="alert" className="text-xs text-red-400">{error}</p> : null}
            {note ? <p role="status" className="text-xs text-primary">{note}</p> : null}
            <div className="space-y-2">
                {servers.length === 0 ? <p className="text-xs text-on-surface-variant">尚未添加 MCP 服务。</p> : null}
                {servers.map((server) => (
                    <div key={server.id} className="rounded-lg border border-outline-variant/30 bg-surface-container p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0">
                                <div className="text-sm font-semibold text-on-surface">{server.name} <span className="ml-2 text-xs font-normal text-on-surface-variant">{server.enabled ? "已启用" : "已停用"} · {server.exposure || "codemode"}</span></div>
                                <div className="truncate font-mono text-xs text-on-surface-variant">{server.transport === "http" ? server.url : `${server.command} ${server.args?.join(" ") || ""}`}</div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button type="button" className={buttonClass} disabled={!!busy} onClick={() => void testServer(server)}>测试连接</button>
                                <button type="button" className={buttonClass} disabled={!!busy} onClick={() => edit(server)}>编辑</button>
                                <button type="button" className={buttonClass} disabled={!!busy || !desktop} onClick={() => desktop && void run(server.id, () => desktop.setMcpServerEnabled(server.id, !server.enabled))}>{server.enabled ? "停用" : "启用"}</button>
                                <button type="button" className={`${buttonClass} text-red-400`} disabled={!!busy || !desktop} onClick={() => desktop && void run(server.id, () => desktop.removeMcpServer(server.id))}>删除</button>
                            </div>
                        </div>
                        {test?.id === server.id ? <div className={`mt-2 text-xs ${test.result.ok ? "text-primary" : "text-red-400"}`}>{test.result.ok ? `连接成功，发现 ${test.result.tools?.length ?? 0} 个工具：${test.result.tools?.map((tool) => tool.name).join("、") || "无"}` : test.result.message}</div> : null}
                    </div>
                ))}
            </div>
            <div className="space-y-3 rounded-lg border border-outline-variant/30 bg-surface-container p-4">
                <h3 className="text-sm font-semibold text-on-surface">{editingId ? "编辑 MCP 服务" : "添加 MCP 服务"}</h3>
                <label className="block space-y-1 text-xs text-on-surface-variant">名称（字母、数字、下划线或连字符）<input className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="例如 filesystem" /></label>
                <label className="block space-y-1 text-xs text-on-surface-variant">描述<input className={inputClass} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="这个服务提供什么能力" /></label>
                <Select label="工具调用方式" value={form.exposure} options={exposureOptions} onChange={(exposure) => setForm({ ...form, exposure })} />
                <Select label="连接方式" value={form.transport} options={transportOptions} onChange={(transport) => setForm({ ...form, transport })} />
                {form.transport === "stdio" ? (
                    <>
                        <label className="block space-y-1 text-xs text-on-surface-variant">可执行命令<input className={inputClass} value={form.command} onChange={(event) => setForm({ ...form, command: event.target.value })} placeholder="例如 npx 或绝对路径" /></label>
                        <label className="block space-y-1 text-xs text-on-surface-variant">参数（每行一个）<textarea className={inputClass} rows={3} value={form.args} onChange={(event) => setForm({ ...form, args: event.target.value })} placeholder={"-y\n@modelcontextprotocol/server-filesystem\n/path/to/project"} /></label>
                        <label className="block space-y-1 text-xs text-on-surface-variant">环境变量（每行 KEY=VALUE）<textarea className={inputClass} rows={2} value={form.env} onChange={(event) => setForm({ ...form, env: event.target.value })} placeholder="可选；已保存的值显示为 ••••••，不修改即沿用原值" /></label>
                    </>
                ) : (
                    <>
                        <label className="block space-y-1 text-xs text-on-surface-variant">MCP 地址<input className={inputClass} value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} placeholder="https://example.com/mcp" /></label>
                        <label className="block space-y-1 text-xs text-on-surface-variant">请求头（每行 KEY=VALUE）<textarea className={inputClass} rows={2} value={form.headers} onChange={(event) => setForm({ ...form, headers: event.target.value })} placeholder="例如 Authorization=Bearer ...；已保存的值显示为 ••••••，不修改即沿用原值" /></label>
                    </>
                )}
                <div className="flex gap-2">
                    <button type="button" disabled={!desktop || !!busy || !/^[A-Za-z0-9_-]+$/.test(form.name.trim()) || !(form.transport === "http" ? form.url.trim() : form.command.trim())} onClick={() => void save()} className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-on-primary disabled:opacity-50">{busy === "save" ? "保存中…" : "保存服务"}</button>
                    {editingId ? <button type="button" className={buttonClass} onClick={() => { setEditingId(null); setForm(empty); }}>取消</button> : null}
                </div>
            </div>
        </section>
    );
}
