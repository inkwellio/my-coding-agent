const { app, BrowserWindow, dialog, ipcMain, Menu, shell } = require("electron");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { createWorkspaceStore } = require("./workspace-store.cjs");
const gitService = require("./git-service.cjs");
const { createTerminalService } = require("./terminal-service.cjs");
const { createMcpStore } = require("./mcp-service.cjs");

const isDev = process.env.ELECTRON_DEV === "1";

if (process.env.ELECTRON_NO_SANDBOX === "1") {
    app.commandLine.appendSwitch("no-sandbox");
    app.commandLine.appendSwitch("disable-dev-shm-usage");
}

/** @type {Map<number, { start: () => Promise<void>, stop: () => Promise<void>, prompt: (message: string) => Promise<unknown>, snapshot: () => unknown, isStopping: () => boolean }>} */
const sessions = new Map();
const switchingWorkspaces = new Set();
const workspaceTasks = new Map();
const terminalService = createTerminalService((id, payload) => {
    const win = BrowserWindow.getAllWindows().find((entry) => entry.webContents.id === id);
    if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) win.webContents.send("terminal:event", payload);
});

const hostPromise = import("./rpc-host.mjs");
const credentialsPromise = import("./credentials.mjs");
const sandboxPromise = import("./sandbox-service.mjs").then(({ createSandboxService }) => createSandboxService({
    publish(id, status) {
        const win = BrowserWindow.getAllWindows().find((entry) => entry.webContents.id === id);
        if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) win.webContents.send("sandbox:status", status);
    },
}));
const sandboxTasks = new Map();
let workspaceStorePromise;
let mcpStore;

function getMcpStore() {
    mcpStore ??= createMcpStore(
        path.join(process.env.PI_CODING_AGENT_DIR || path.join(os.homedir(), ".pi", "agent"), "mcp.json"),
        path.join(app.getPath("userData"), "mcp-servers.json"),
    );
    return mcpStore;
}

async function reloadMcpSessions() {
    const results = await Promise.all([...sessions.values()].map((session) => session.reloadMcp().catch(() => ({ ok: false }))));
    return results.every((result) => result.ok);
}

function getWorkspaceStore() {
    workspaceStorePromise ??= (async () => {
        await app.whenReady();
        const host = await hostPromise;
        const filePath = path.join(app.getPath("userData"), "workspaces.json");
        return createWorkspaceStore(filePath, host.resolveProjectCwd().cwd);
    })();
    return workspaceStorePromise;
}

function broadcast(channel, payload) {
    for (const win of BrowserWindow.getAllWindows()) {
        if (win.isDestroyed() || win.webContents.isDestroyed()) continue;
        try {
            win.webContents.send(channel, payload);
        } catch {
            // The frame can close between the destroyed check and send.
        }
    }
}

async function publishCredentials() {
    const credentials = await credentialsPromise;
    const providers = await credentials.getStatus();
    const summary = credentials.summaryFrom(providers);
    for (const session of sessions.values()) {
        session.setCredentials?.(summary);
    }
    broadcast("credentials:status", { summary, providers });
    return { summary, providers };
}

function windowFromEvent(event) {
    return BrowserWindow.fromWebContents(event.sender);
}

const EXTERNAL_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);
const DEV_ORIGIN = "http://127.0.0.1:5173";

function openExternalLink(url) {
    try {
        if (EXTERNAL_PROTOCOLS.has(new URL(url).protocol)) void shell.openExternal(url);
    } catch {
        // Ignore malformed links.
    }
}

function isAppUrl(url) {
    try {
        const target = new URL(url);
        if (isDev) return target.origin === DEV_ORIGIN;
        return target.protocol === "file:" && path.resolve(decodeURIComponent(target.pathname.replace(/^\/([A-Za-z]:)/, "$1"))) === path.join(__dirname, "../dist/index.html");
    } catch {
        return false;
    }
}

// Model output can contain links. They open in the system browser, never inside an
// Electron window that could reach the preload bridge.
app.on("web-contents-created", (_event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
        openExternalLink(url);
        return { action: "deny" };
    });
    contents.on("will-navigate", (event, url) => {
        if (isAppUrl(url)) return;
        event.preventDefault();
        openExternalLink(url);
    });
    contents.on("will-attach-webview", (event) => event.preventDefault());
});

function createRpcSession(win, host, cwd, cwdWarning = null, sandboxOptions = null) {
    return host.createWindowSession({
        webContentsId: win.webContents.id,
        cwd,
        cwdWarning,
        sandboxOptions,
        send(channel, payload) {
            try {
                if (win.isDestroyed() || win.webContents.isDestroyed()) return;
                win.webContents.send(channel, payload);
            } catch {
                // The frame can close between the destroyed check and send.
            }
        },
    });
}

function switchWindowWorkspace(win, cwd) {
    const id = win?.webContents.id;
    if (workspaceTasks.has(id)) return getWorkspaceStore().then((store) => ({ ok: false, state: store.snapshot(), message: "正在切换工作区" }));
    const task = switchWindowWorkspaceNow(win, cwd);
    workspaceTasks.set(id, task);
    void task.finally(() => { if (workspaceTasks.get(id) === task) workspaceTasks.delete(id); });
    return task;
}

async function switchWindowWorkspaceNow(win, cwd) {
    const store = await getWorkspaceStore();
    if (!win || win.__piClosing || win.isDestroyed() || win.webContents.isDestroyed()) return { ok: false, state: store.snapshot(), message: "窗口已关闭" };
    const id = win.webContents.id;
    if (sandboxTasks.has(id)) return { ok: false, state: store.snapshot(), message: "正在修改沙盒设置" };
    if (switchingWorkspaces.has(id)) return { ok: false, state: store.snapshot(), message: "正在切换工作区" };
    const known = store.snapshot().paths.find((entry) => entry === cwd);
    if (!known) return { ok: false, state: store.snapshot(), message: "请先添加这个工作区" };
    const previous = sessions.get(id);
    if (previous?.snapshot().engine === "chatting") {
        return { ok: false, state: store.snapshot(), message: "请等待当前回答结束后再切换工作区" };
    }
    if (previous?.snapshot().cwd === known) {
        try {
            return { ok: true, state: store.activate(known) };
        } catch (error) {
            return { ok: false, state: store.snapshot(), message: error instanceof Error ? error.message : "保存工作区失败" };
        }
    }

    switchingWorkspaces.add(id);
    try {
        const host = await hostPromise;
        const sandbox = await sandboxPromise;
        const keepSandbox = sandbox.snapshot(id, previous?.snapshot().cwd).requested;
        const state = store.activate(known);
        await terminalService.stop(id);
        if (previous) {
            await previous.stop();
            if (sessions.get(id) === previous) sessions.delete(id);
        }
        if (win.__piClosing || win.isDestroyed() || win.webContents.isDestroyed()) return { ok: false, state: store.snapshot(), message: "窗口已关闭" };
        await sandbox.release(id);
        const options = keepSandbox ? await sandbox.prepare(id, known) : null;
        if (win.__piClosing || win.isDestroyed()) return { ok: false, state: store.snapshot(), message: "窗口已关闭" };
        const next = createRpcSession(win, host, known, null, options);
        sessions.set(id, next);
        win.webContents.send("rpc:status", next.snapshot());
        broadcast("workspaces:changed", state);
        await next.start();
        if (keepSandbox) sandbox.complete(id, next.snapshot().engine !== "disconnected", next.snapshot().engine === "disconnected" ? next.snapshot().detail : null);
        return { ok: true, state };
    } catch (error) {
        return { ok: false, state: store.snapshot(), message: error instanceof Error ? error.message : "切换工作区失败" };
    } finally {
        switchingWorkspaces.delete(id);
    }
}

const SHUTDOWN_TIMEOUT_MS = 15_000;

/** A stuck cleanup step must not keep a window or the app open forever. */
function withShutdownTimeout(task) {
    let timer;
    return Promise.race([
        Promise.resolve(task).catch((error) => {
            console.error("[pi-desktop] shutdown cleanup failed", error instanceof Error ? error.message : error);
        }),
        new Promise((done) => { timer = setTimeout(done, SHUTDOWN_TIMEOUT_MS); }),
    ]).finally(() => clearTimeout(timer));
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 1180,
        minHeight: 720,
        backgroundColor: "#0b0e13",
        title: "智能编程工作台",
        frame: false,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, "preload.cjs"),
            contextIsolation: true,
            nodeIntegration: false,
            // Chromium’s sandbox cannot start in some Linux containers. The same
            // ELECTRON_NO_SANDBOX=1 switch documented for the browser process also
            // has to turn off the renderer sandbox or the preload bridge never loads.
            sandbox: process.env.ELECTRON_NO_SANDBOX !== "1",
        },
    });

    Menu.setApplicationMenu(null);

    const webContentsId = win.webContents.id;

    win.webContents.on("did-finish-load", () => {
        if (win.isDestroyed()) return;
        const current = sessions.get(webContentsId);
        if (current) win.webContents.send("rpc:status", current.snapshot());
        void sandboxPromise.then((sandbox) => {
            if (!win.isDestroyed()) win.webContents.send("sandbox:status", sandbox.snapshot(webContentsId, current?.snapshot().cwd));
        });
        void getWorkspaceStore().then((store) => {
            if (!win.isDestroyed()) win.webContents.send("workspaces:changed", store.snapshot());
        });
    });

    let closing = false;
    win.on("close", (event) => {
        if (closing) { event.preventDefault(); return; }
        event.preventDefault();
        closing = true;
        win.__piClosing = true;
        withShutdownTimeout(Promise.allSettled([sandboxTasks.get(webContentsId), workspaceTasks.get(webContentsId)]).then(async () => {
            await terminalService.stop(webContentsId);
            await sessions.get(webContentsId)?.stop();
            const sandbox = await sandboxPromise;
            await sandbox.release(webContentsId);
        })).finally(() => {
            sessions.delete(webContentsId);
            if (!win.isDestroyed()) win.destroy();
        });
    });

    const load = () => {
        if (win.isDestroyed() || win.__piLoaded) return;
        win.__piLoaded = true;
        if (isDev) {
            win.loadURL("http://127.0.0.1:5173");
            return;
        }
        const indexPath = path.join(__dirname, "../dist/index.html");
        if (!fs.existsSync(indexPath)) {
            win.loadURL(
                "data:text/html;charset=utf-8," +
                    encodeURIComponent(
                        "<body style='background:#101418;color:#e1e2e9;font-family:sans-serif;padding:24px'>Renderer build not found. Run <code>npm start</code> or <code>npm run dev</code>.</body>",
                    ),
            );
            return;
        }
        win.loadFile(indexPath);
    };

    Promise.all([hostPromise, getWorkspaceStore()])
        .then(([host, store]) => {
            if (win.__piClosing || win.isDestroyed()) return null;
            const project = host.resolveProjectCwd();
            const cwd = store.snapshot().activeCwd;
            const session = createRpcSession(win, host, cwd, cwd === project.cwd ? project.warning : null);
            sessions.set(webContentsId, session);
            const starting = session.start();
            load();
            return starting;
        })
        .catch((error) => {
            console.error("[pi-rpc] failed to start session", error instanceof Error ? error.message : error);
            load();
        });
}

ipcMain.on("window:minimize", (event) => windowFromEvent(event)?.minimize());
ipcMain.on("window:toggle-maximize", (event) => {
    const win = windowFromEvent(event);
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
});
ipcMain.on("window:close", (event) => windowFromEvent(event)?.close());

ipcMain.handle("terminal:start", async (event) => {
    if (windowFromEvent(event)?.__piClosing || sandboxTasks.has(event.sender.id) || workspaceTasks.has(event.sender.id)) return { ok: false, message: "正在更新或关闭工作区" };
    const cwd = sessions.get(event.sender.id)?.snapshot().cwd;
    if (!cwd) return { ok: false, message: "工作区尚未就绪" };
    const sandbox = await sandboxPromise;
    const status = sandbox.snapshot(event.sender.id, cwd);
    if (status.requested && status.state !== "on") return { ok: false, message: status.detail || "沙盒尚未就绪，终端已阻止启动" };
    return terminalService.start(event.sender.id, cwd, status.requested ? sandbox.options(event.sender.id) : null);
});
ipcMain.handle("terminal:write", async (event, command) => {
    const sandbox = await sandboxPromise;
    const policy = sandbox.snapshot(event.sender.id, sessions.get(event.sender.id)?.snapshot().cwd);
    if (windowFromEvent(event)?.__piClosing || sandboxTasks.has(event.sender.id) || workspaceTasks.has(event.sender.id)) return { ok: false, message: "正在更新或关闭工作区" };
    if (policy.requested && policy.state !== "on") return { ok: false, message: policy.detail || "沙盒尚未就绪，命令已阻止" };
    return terminalService.write(event.sender.id, command);
});
ipcMain.handle("terminal:stop", async (event) => {
    await terminalService.stop(event.sender.id);
    return { ok: true };
});

ipcMain.handle("rpc:get-status", async (event) => {
    const session = sessions.get(event.sender.id);
    if (session) return session.snapshot();
    const host = await hostPromise;
    const project = host.resolveProjectCwd();
    return host.disconnectedSnapshot(event.sender.id, project.cwd);
});

ipcMain.handle("rpc:prompt", async (event, message) => {
    if (windowFromEvent(event)?.__piClosing || sandboxTasks.has(event.sender.id) || workspaceTasks.has(event.sender.id)) return { ok: false, code: "error", message: "正在更新或关闭工作区" };
    const session = sessions.get(event.sender.id);
    if (!session) return { ok: false, code: "disconnected", message: "这个窗口没有 RPC 会话" };
    const sandbox = await sandboxPromise;
    const policy = sandbox.snapshot(event.sender.id, session.snapshot().cwd);
    if (policy.requested && policy.state !== "on") return { ok: false, code: "error", message: policy.detail || "沙盒尚未就绪，已阻止发送" };
    return session.prompt(message);
});

ipcMain.handle("sandbox:get-status", async (event) => {
    const sandbox = await sandboxPromise;
    const cwd = sessions.get(event.sender.id)?.snapshot().cwd;
    await sandbox.probe();
    return sandbox.snapshot(event.sender.id, cwd);
});

ipcMain.handle("sandbox:set-enabled", (event, enabled) => {
    const id = event.sender.id;
    const task = Promise.resolve(sandboxTasks.get(id)).catch(() => {}).then(async () => {
        const sandbox = await sandboxPromise;
        const session = sessions.get(id);
        const cwd = session?.snapshot().cwd;
        try {
            if (typeof enabled !== "boolean") throw new Error("无效的沙盒设置");
            if (!session || !windowFromEvent(event) || windowFromEvent(event).__piClosing || event.sender.isDestroyed()) throw new Error("工作区尚未就绪");
            if (workspaceTasks.has(id)) throw new Error("正在切换工作区");
            if (session.snapshot().engine === "chatting") throw new Error("请等待当前回答结束后再修改沙盒设置");
            const before = sandbox.snapshot(id, cwd);
            if (enabled && before.state === "on") return { ok: true, status: before };
            if (!enabled && !before.requested) return { ok: true, status: before };
            const options = enabled ? await sandbox.prepare(id, cwd) : null;
            await terminalService.stop(id);
            const result = await session.setSandbox(options);
            if (result.unchanged) {
                if (!before.requested) await sandbox.release(id);
                else sandbox.complete(id, before.state === "on", before.detail);
                return { ...result, status: sandbox.snapshot(id, cwd) };
            }
            if (!enabled) await sandbox.release(id);
            sandbox.complete(id, enabled && result.ok, result.ok ? null : result.message);
            return { ...result, status: sandbox.snapshot(id, cwd) };
        } catch (error) {
            const message = error instanceof Error ? error.message : "修改沙盒设置失败";
            const before = sandbox.snapshot(id, cwd);
            sandbox.complete(id, before.state === "on", message);
            return { ok: false, message, status: sandbox.snapshot(id, cwd) };
        }
    });
    sandboxTasks.set(id, task);
    void task.finally(() => { if (sandboxTasks.get(id) === task) sandboxTasks.delete(id); });
    return task;
});

let sandboxInstallTask;
ipcMain.handle("sandbox:install", async (event) => {
    const sandbox = await sandboxPromise;
    const cwd = sessions.get(event.sender.id)?.snapshot().cwd;
    if (process.platform !== "win32") return { ok: false, status: sandbox.snapshot(event.sender.id, cwd), message: "当前系统不需要此安装步骤" };
    if (sandboxInstallTask) return { ok: false, status: sandbox.snapshot(event.sender.id, cwd), message: "另一个窗口正在安装沙盒组件" };
    const win = windowFromEvent(event);
    if (!win) return { ok: false, status: sandbox.snapshot(event.sender.id, cwd), message: "窗口已关闭" };
    sandboxInstallTask = true;
    try {
        const response = await dialog.showMessageBox(win, {
            type: "question", title: "安装沙盒组件", message: "安装命令隔离所需的系统组件？",
            detail: "系统会请求管理员权限。安装会创建专用沙盒账户和网络过滤规则；你可以取消。",
            buttons: ["取消", "安装"], defaultId: 0, cancelId: 0,
        });
        if (response.response !== 1) return { ok: false, cancelled: true, status: sandbox.snapshot(event.sender.id, cwd) };
        sandboxInstallTask = sandbox.installWindows();
        const result = await sandboxInstallTask;
        return { ...result, status: sandbox.snapshot(event.sender.id, cwd) };
    } catch (error) {
        return { ok: false, status: sandbox.snapshot(event.sender.id, cwd), message: error instanceof Error ? error.message : "安装沙盒组件失败" };
    } finally { sandboxInstallTask = null; }
});

ipcMain.handle("rpc:abort", async (event) => {
    const session = sessions.get(event.sender.id);
    return session ? session.abort() : { ok: false, message: "这个窗口没有 RPC 会话" };
});

ipcMain.handle("rpc:list-sessions", async (event) => {
    const session = sessions.get(event.sender.id);
    return session ? session.listSessions() : [];
});

ipcMain.handle("rpc:get-session-view", async (event) => {
    const session = sessions.get(event.sender.id);
    return session ? session.getSessionView() : { ok: false, message: "这个窗口没有 RPC 会话" };
});

ipcMain.handle("rpc:change-session", async (event, sessionId) => {
    const session = sessions.get(event.sender.id);
    return session ? session.changeSession(sessionId) : { ok: false, message: "这个窗口没有 RPC 会话" };
});

ipcMain.handle("mcp:list", () => getMcpStore().list());

ipcMain.handle("mcp:save", async (_event, value) => {
    try {
        getMcpStore().save(value);
        const servers = getMcpStore().list();
        broadcast("mcp:changed", servers);
        return { ok: true, servers, applied: await reloadMcpSessions() };
    } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : "保存 MCP 服务失败" };
    }
});

ipcMain.handle("mcp:remove", async (_event, id) => {
    try {
        const servers = getMcpStore().remove(id);
        broadcast("mcp:changed", servers);
        return { ok: true, servers, applied: await reloadMcpSessions() };
    } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : "删除 MCP 服务失败" };
    }
});

ipcMain.handle("mcp:set-enabled", async (_event, id, enabled) => {
    try {
        const servers = getMcpStore().setEnabled(id, enabled);
        broadcast("mcp:changed", servers);
        return { ok: true, servers, applied: await reloadMcpSessions() };
    } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : "更新 MCP 服务失败" };
    }
});

ipcMain.handle("mcp:reload", async () => {
    const applied = await reloadMcpSessions();
    return { ok: applied, applied, message: applied ? undefined : "请等待当前回答结束后再重载 MCP 工具" };
});

ipcMain.handle("mcp:test", async (event, id) => {
    const server = getMcpStore().list().find((item) => item.id === id);
    if (!server) return { ok: false, message: "MCP 服务不存在" };
    if (!server.enabled) return { ok: false, message: "请先启用该服务" };
    const { testMcpServer } = await import("./mcp-diagnostics.mjs");
    const cwd = sessions.get(event.sender.id)?.snapshot().cwd || process.cwd();
    return testMcpServer(server.name, cwd);
});

ipcMain.handle("workspaces:list", async () => (await getWorkspaceStore()).snapshot());

ipcMain.handle("workspaces:add", async (event) => {
    const win = windowFromEvent(event);
    const store = await getWorkspaceStore();
    if (!win) return { ok: false, state: store.snapshot(), message: "窗口已关闭" };
    const selection = await dialog.showOpenDialog(win, {
        title: "添加工作区",
        properties: ["openDirectory", "createDirectory"],
    });
    if (selection.canceled || !selection.filePaths[0]) return { ok: false, cancelled: true, state: store.snapshot() };
    try {
        const cwd = store.add(selection.filePaths[0]);
        broadcast("workspaces:changed", store.snapshot());
        return await switchWindowWorkspace(win, cwd);
    } catch (error) {
        return { ok: false, state: store.snapshot(), message: error instanceof Error ? error.message : "添加工作区失败" };
    }
});

ipcMain.handle("workspaces:switch", async (event, cwd) => switchWindowWorkspace(windowFromEvent(event), cwd));

function gitCwd(event) {
    return sessions.get(event.sender.id)?.snapshot().cwd || null;
}

ipcMain.handle("git:status", (event) => {
    const cwd = gitCwd(event);
    return cwd ? gitService.status(cwd) : { ok: false, message: "这个窗口没有工作区", files: [], branch: "" };
});
ipcMain.handle("git:diff", (event, filePath) => {
    const cwd = gitCwd(event);
    return cwd ? gitService.diff(cwd, filePath) : { ok: false, message: "这个窗口没有工作区" };
});
ipcMain.handle("git:stage", (event, filePath, selected) => {
    const cwd = gitCwd(event);
    return cwd ? gitService.stage(cwd, filePath, selected) : { ok: false, message: "这个窗口没有工作区" };
});
ipcMain.handle("git:commit", (event, message) => {
    const cwd = gitCwd(event);
    return cwd ? gitService.commit(cwd, message) : { ok: false, message: "这个窗口没有工作区" };
});
ipcMain.handle("git:push", (event) => {
    const cwd = gitCwd(event);
    return cwd ? gitService.push(cwd) : { ok: false, message: "这个窗口没有工作区" };
});
ipcMain.handle("git:branches", (event) => {
    const cwd = gitCwd(event);
    return cwd ? gitService.branches(cwd) : { ok: false, message: "这个窗口没有工作区", current: "", detached: false, local: [], remote: [], changes: 0 };
});
ipcMain.handle("git:checkout", (event, request) => {
    const cwd = gitCwd(event);
    if (!cwd) return { ok: false, message: "这个窗口没有工作区" };
    if (sessions.get(event.sender.id)?.snapshot().engine === "chatting") return { ok: false, message: "代理正在运行，请等待完成或中止后再切换分支" };
    return gitService.checkout(cwd, request);
});
ipcMain.handle("git:fetch", (event) => {
    const cwd = gitCwd(event);
    return cwd ? gitService.fetch(cwd) : { ok: false, message: "这个窗口没有工作区", current: "", detached: false, local: [], remote: [], changes: 0 };
});
ipcMain.handle("git:log", (event, request) => {
    const cwd = gitCwd(event);
    return cwd ? gitService.log(cwd, request) : { ok: false, message: "这个窗口没有工作区", ref: "", commits: [], hasMore: false };
});
ipcMain.handle("git:show", (event, hash) => {
    const cwd = gitCwd(event);
    return cwd ? gitService.show(cwd, hash) : { ok: false, message: "这个窗口没有工作区" };
});

ipcMain.handle("credentials:listProviders", async () => {
    const credentials = await credentialsPromise;
    return credentials.listProviders();
});

ipcMain.handle("credentials:getStatus", async () => {
    const credentials = await credentialsPromise;
    return credentials.getStatus();
});

ipcMain.handle("credentials:saveApiKey", async (event, payload) => {
    const credentials = await credentialsPromise;
    const result = await credentials.saveApiKey(payload?.providerId, payload?.apiKey);
    if (result?.status === "error") return result;
    await publishCredentials();
    const session = sessions.get(event.sender.id);
    const applied = await credentials.afterApiKeySaved(result.providerId, session);
    if (applied?.ok) {
        broadcast("models:selected", {
            providerId: applied.providerId,
            modelId: applied.modelId,
            name: applied.name,
            live: applied.live,
        });
    }
    return result;
});

ipcMain.handle("credentials:clear", async (_event, payload) => {
    const credentials = await credentialsPromise;
    const result = await credentials.clearCredential(payload?.providerId);
    await publishCredentials();
    return result;
});

function settingsCwd(sender) {
    return sessions.get(sender.id)?.snapshot().cwd || process.cwd();
}

ipcMain.handle("models:get", async (event) => {
    const credentials = await credentialsPromise;
    return credentials.getSelectedModel(settingsCwd(event.sender));
});

ipcMain.handle("models:set", async (event, payload) => {
    const credentials = await credentialsPromise;
    const saved = await credentials.setSelectedModel(payload?.providerId, payload?.modelId, settingsCwd(event.sender));
    if (!saved.ok) return saved;
    const session = sessions.get(event.sender.id);
    let live = null;
    if (session?.setModel) {
        try {
            live = await session.setModel(saved.providerId, saved.modelId);
        } catch (error) {
            live = {
                ok: false,
                message: error instanceof Error ? error.message : "模型切换失败",
            };
        }
    }
    broadcast("models:selected", {
        providerId: saved.providerId,
        modelId: saved.modelId,
        name: saved.name,
        live,
    });
    return { ...saved, live };
});

async function modelSettingsFor(sender) {
    const credentials = await credentialsPromise;
    const stored = await credentials.getModelSettings(settingsCwd(sender));
    const session = sessions.get(sender.id);
    let live = null;
    try {
        live = session?.getThinkingState ? await session.getThinkingState() : null;
    } catch {
        live = null;
    }
    const sameModel = live && live.providerId === stored.providerId && live.modelId === stored.modelId;
    return sameModel ? { ...stored, ...live } : stored;
}

ipcMain.handle("models:get-settings", (event) => modelSettingsFor(event.sender));

ipcMain.handle("models:set-thinking", async (event, level) => {
    const credentials = await credentialsPromise;
    const saved = await credentials.saveThinkingLevel(level, settingsCwd(event.sender));
    if (!saved.ok) return saved;
    const session = sessions.get(event.sender.id);
    if (session?.setThinkingLevel) {
        try {
            await session.setThinkingLevel(level);
        } catch {
            // The saved default still applies when the engine starts next time.
        }
    }
    return { ok: true, settings: await modelSettingsFor(event.sender) };
});

let quitting = false;
app.on("before-quit", (event) => {
    if (quitting) return;
    const pending = [...sessions.values()].filter((session) => !session.isStopping());
    if (pending.length === 0) return;
    event.preventDefault();
    quitting = true;
    withShutdownTimeout(Promise.all(pending.map(async (session) => {
        const id = session.snapshot().webContentsId;
        await Promise.allSettled([sandboxTasks.get(id), workspaceTasks.get(id)]);
        await terminalService.stop(id);
        await sessions.get(id)?.stop();
        const sandbox = await sandboxPromise;
        await sandbox.release(id);
    }))).finally(() => {
        sessions.clear();
        app.quit();
    });
});

app.whenReady().then(() => {
    createWindow();
    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});
