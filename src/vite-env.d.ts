/// <reference types="vite/client" />

import type { CredentialBroadcast, ModelSettings, ProviderInfo, ProviderStatus, SelectedModel, SetModelResult, SetThinkingResult, ThinkingLevel } from "./credentials/types";
import type { EngineSnapshot, PromptResult, RpcWireEvent, SessionSummary, SessionView, WorkspaceActionResult, WorkspaceState } from "./rpc/types";
import type { GitBranches, GitCheckoutRequest, GitCheckoutResult, GitLog, GitLogRequest, GitResult, GitStatus } from "./git/types";
import type { McpActionResult, McpServer, McpTestResult } from "./mcp/types";
import type { SandboxActionResult, SandboxSnapshot } from "./sandbox/types";

export interface PiDesktopApi {
    minimize: () => void;
    toggleMaximize: () => void;
    close: () => void;
    getSandboxStatus: () => Promise<SandboxSnapshot>;
    setSandboxEnabled: (enabled: boolean) => Promise<SandboxActionResult>;
    installSandbox: () => Promise<SandboxActionResult>;
    onSandboxStatus: (callback: (status: SandboxSnapshot) => void) => () => void;
    startTerminal: () => Promise<{ ok: boolean; cwd?: string; message?: string }>;
    writeTerminal: (command: string) => Promise<{ ok: boolean; message?: string }>;
    stopTerminal: () => Promise<{ ok: boolean }>;
    onTerminalEvent: (callback: (event: { type: "output" | "error" | "exit"; data?: string; code?: number | null }) => void) => () => void;
    getEngineStatus: () => Promise<EngineSnapshot>;
    sendPrompt: (message: string) => Promise<PromptResult>;
    abortPrompt: () => Promise<{ ok: boolean; idle?: boolean; message?: string }>;
    listSessions: () => Promise<SessionSummary[]>;
    getSessionView: () => Promise<SessionView>;
    changeSession: (sessionId: string | null) => Promise<SessionView>;
    listWorkspaces: () => Promise<WorkspaceState>;
    addWorkspace: () => Promise<WorkspaceActionResult>;
    switchWorkspace: (cwd: string) => Promise<WorkspaceActionResult>;
    getGitStatus: () => Promise<GitStatus>;
    getGitDiff: (filePath: string) => Promise<GitResult & { text?: string }>;
    stageGitFile: (filePath: string | null, selected: boolean) => Promise<GitStatus>;
    commitGitChanges: (message: string) => Promise<GitStatus & { hash?: string }>;
    pushGitChanges: () => Promise<GitResult>;
    listGitBranches: () => Promise<GitBranches>;
    checkoutGitBranch: (request: GitCheckoutRequest) => Promise<GitCheckoutResult>;
    fetchGitRemotes: () => Promise<GitBranches>;
    getGitLog: (request?: GitLogRequest) => Promise<GitLog>;
    showGitCommit: (hash: string) => Promise<GitResult & { text?: string; truncated?: boolean }>;
    onWorkspacesChanged: (callback: (state: WorkspaceState) => void) => () => void;
    onEngineStatus: (callback: (status: EngineSnapshot) => void) => () => void;
    onRpcEvent: (callback: (event: RpcWireEvent) => void) => () => void;
    listProviders: () => Promise<ProviderInfo[]>;
    getCredentialStatus: () => Promise<ProviderStatus[]>;
    saveApiKey: (providerId: string, apiKey: string) => Promise<ProviderStatus>;
    clearCredential: (providerId: string) => Promise<ProviderStatus>;
    onCredentialStatus: (callback: (payload: CredentialBroadcast) => void) => () => void;
    getSelectedModel: () => Promise<SelectedModel>;
    setSelectedModel: (providerId: string, modelId: string) => Promise<SetModelResult>;
    getModelSettings: () => Promise<ModelSettings>;
    setThinkingLevel: (level: ThinkingLevel) => Promise<SetThinkingResult>;
    onSelectedModel: (callback: (model: SetModelResult) => void) => () => void;
    listMcpServers: () => Promise<McpServer[]>;
    saveMcpServer: (server: Omit<McpServer, "id"> & { id?: string }) => Promise<McpActionResult>;
    removeMcpServer: (id: string) => Promise<McpActionResult>;
    setMcpServerEnabled: (id: string, enabled: boolean) => Promise<McpActionResult>;
    testMcpServer: (id: string) => Promise<McpTestResult>;
    reloadMcpTools: () => Promise<McpActionResult>;
    onMcpChanged: (callback: (servers: McpServer[]) => void) => () => void;
}

declare global {
    interface Window {
        piDesktop?: PiDesktopApi;
    }
}
