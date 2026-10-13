const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("piDesktop", {
    minimize: () => ipcRenderer.send("window:minimize"),
    toggleMaximize: () => ipcRenderer.send("window:toggle-maximize"),
    close: () => ipcRenderer.send("window:close"),
    startTerminal: () => ipcRenderer.invoke("terminal:start"),
    writeTerminal: (command) => ipcRenderer.invoke("terminal:write", command),
    stopTerminal: () => ipcRenderer.invoke("terminal:stop"),
    onTerminalEvent: (callback) => {
        const listener = (_event, payload) => callback(payload);
        ipcRenderer.on("terminal:event", listener);
        return () => ipcRenderer.removeListener("terminal:event", listener);
    },
    getEngineStatus: () => ipcRenderer.invoke("rpc:get-status"),
    sendPrompt: (message) => ipcRenderer.invoke("rpc:prompt", message),
    abortPrompt: () => ipcRenderer.invoke("rpc:abort"),
    listSessions: () => ipcRenderer.invoke("rpc:list-sessions"),
    getSessionView: () => ipcRenderer.invoke("rpc:get-session-view"),
    changeSession: (sessionId) => ipcRenderer.invoke("rpc:change-session", sessionId),
    listWorkspaces: () => ipcRenderer.invoke("workspaces:list"),
    addWorkspace: () => ipcRenderer.invoke("workspaces:add"),
    switchWorkspace: (cwd) => ipcRenderer.invoke("workspaces:switch", cwd),
    getGitStatus: () => ipcRenderer.invoke("git:status"),
    getGitDiff: (filePath) => ipcRenderer.invoke("git:diff", filePath),
    stageGitFile: (filePath, selected) => ipcRenderer.invoke("git:stage", filePath, selected),
    commitGitChanges: (message) => ipcRenderer.invoke("git:commit", message),
    pushGitChanges: () => ipcRenderer.invoke("git:push"),
    onWorkspacesChanged: (callback) => {
        const listener = (_event, state) => callback(state);
        ipcRenderer.on("workspaces:changed", listener);
        return () => ipcRenderer.removeListener("workspaces:changed", listener);
    },
    onEngineStatus: (callback) => {
        const listener = (_event, status) => callback(status);
        ipcRenderer.on("rpc:status", listener);
        return () => ipcRenderer.removeListener("rpc:status", listener);
    },
    onRpcEvent: (callback) => {
        const listener = (_event, event) => callback(event);
        ipcRenderer.on("rpc:event", listener);
        return () => ipcRenderer.removeListener("rpc:event", listener);
    },
    listProviders: () => ipcRenderer.invoke("credentials:listProviders"),
    getCredentialStatus: () => ipcRenderer.invoke("credentials:getStatus"),
    saveApiKey: (providerId, apiKey) => ipcRenderer.invoke("credentials:saveApiKey", { providerId, apiKey }),
    clearCredential: (providerId) => ipcRenderer.invoke("credentials:clear", { providerId }),
    startOAuth: (providerId) => ipcRenderer.invoke("credentials:startOAuth", { providerId }),
    logoutOAuth: (providerId) => ipcRenderer.invoke("credentials:logoutOAuth", { providerId }),
    detectEnv: (providerId) => ipcRenderer.invoke("credentials:detectEnv", providerId ? { providerId } : {}),
    onOAuthEvent: (callback) => {
        const listener = (_event, event) => callback(event);
        ipcRenderer.on("credentials:oauth-event", listener);
        return () => ipcRenderer.removeListener("credentials:oauth-event", listener);
    },
    onCredentialStatus: (callback) => {
        const listener = (_event, payload) => callback(payload);
        ipcRenderer.on("credentials:status", listener);
        return () => ipcRenderer.removeListener("credentials:status", listener);
    },
    getSelectedModel: () => ipcRenderer.invoke("models:get"),
    setSelectedModel: (providerId, modelId) => ipcRenderer.invoke("models:set", { providerId, modelId }),
    getModelSettings: () => ipcRenderer.invoke("models:get-settings"),
    setThinkingLevel: (level) => ipcRenderer.invoke("models:set-thinking", level),
    onSelectedModel: (callback) => {
        const listener = (_event, model) => callback(model);
        ipcRenderer.on("models:selected", listener);
        return () => ipcRenderer.removeListener("models:selected", listener);
    },
    listMcpServers: () => ipcRenderer.invoke("mcp:list"),
    saveMcpServer: (server) => ipcRenderer.invoke("mcp:save", server),
    removeMcpServer: (id) => ipcRenderer.invoke("mcp:remove", id),
    setMcpServerEnabled: (id, enabled) => ipcRenderer.invoke("mcp:set-enabled", id, enabled),
    testMcpServer: (id) => ipcRenderer.invoke("mcp:test", id),
    reloadMcpTools: () => ipcRenderer.invoke("mcp:reload"),
    onMcpChanged: (callback) => {
        const listener = (_event, servers) => callback(servers);
        ipcRenderer.on("mcp:changed", listener);
        return () => ipcRenderer.removeListener("mcp:changed", listener);
    },
});
