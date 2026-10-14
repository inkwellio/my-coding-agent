import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { EMPTY_CREDENTIALS, type EngineSnapshot, type PromptResult, type RpcStatus, type RpcWireEvent, type SessionSummary, type SessionView, type TranscriptBlock, type WorkspaceState } from "./types";
import { appendUserBlock, applyRpcEvent, hydrateMessages, settleTranscript } from "./transcript";

interface RpcContextValue {
    status: RpcStatus;
    hydrated: boolean;
    blocks: TranscriptBlock[];
    notice: string | null;
    /** True when the notice is about missing or rejected credentials. */
    noticeNeedsCredentials: boolean;
    dismissNotice: () => void;
    sessions: SessionSummary[];
    activeSessionId: string | null;
    sessionBusy: boolean;
    workspaceState: WorkspaceState;
    workspaceBusy: boolean;
    addWorkspace: () => Promise<boolean>;
    /** Removes a workspace from the list (never its files); resolves with the failure reason, if any. */
    removeWorkspace: (cwd: string) => Promise<{ ok: boolean; message?: string }>;
    switchWorkspace: (cwd: string) => Promise<boolean>;
    changeSession: (sessionId: string | null) => Promise<boolean>;
    sendPrompt: (text: string) => Promise<boolean>;
    abort: () => Promise<boolean>;
}

const offlineStatus = (): RpcStatus => ({
    available: false,
    webContentsId: null,
    engine: "disconnected",
    pid: null,
    cwd: "",
    modelLabel: null,
    detail: null,
    credentials: EMPTY_CREDENTIALS,
    credentialsHref: "#/credentials",
});

const RpcContext = createContext<RpcContextValue | null>(null);

function withBridge(snapshot: EngineSnapshot): RpcStatus {
    return { ...snapshot, available: true };
}

export function RpcProvider({ children }: { children: ReactNode }) {
    const [status, setStatus] = useState<RpcStatus>(() => {
        if (typeof window !== "undefined" && window.piDesktop?.getEngineStatus) {
            return { ...offlineStatus(), available: true, engine: "reconnecting" };
        }
        return offlineStatus();
    });
    const [hydrated, setHydrated] = useState(false);
    const [blocks, setBlocks] = useState<TranscriptBlock[]>([]);
    const [noticeState, setNoticeState] = useState<{ text: string; credentials: boolean } | null>(null);
    const setNotice = useCallback((text: string | null, credentials = false) => {
        setNoticeState(text ? { text, credentials } : null);
    }, []);
    const dismissNotice = useCallback(() => setNoticeState(null), []);
    const [sessions, setSessions] = useState<SessionSummary[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [sessionBusy, setSessionBusy] = useState(false);
    const [workspaceState, setWorkspaceState] = useState<WorkspaceState>({ paths: [], activeCwd: "" });
    const [workspaceBusy, setWorkspaceBusy] = useState(false);
    const initialized = useRef(false);
    const loading = useRef(false);
    const bufferedEvents = useRef<RpcWireEvent[]>([]);
    const cwdRef = useRef("");
    const workspaceEpoch = useRef(0);
    const workspaceAction = useRef(false);
    const promptCounter = useRef(0);

    const refreshSessions = useCallback(async () => {
        const desktop = window.piDesktop;
        if (!desktop?.listSessions) return;
        const requestCwd = cwdRef.current;
        try {
            const next = await desktop.listSessions();
            if (requestCwd === cwdRef.current) setSessions(next);
        } catch (error) {
            if (requestCwd === cwdRef.current) setNotice(error instanceof Error ? error.message : "读取历史会话失败");
        }
    }, []);

    const loadView = useCallback(async (request: () => Promise<SessionView>) => {
        if (loading.current) return false;
        const epoch = workspaceEpoch.current;
        loading.current = true;
        bufferedEvents.current = [];
        setSessionBusy(true);
        let appliedEvents = 0;
        try {
            const view = await request();
            if (epoch !== workspaceEpoch.current) return false;
            if (!view.ok) {
                setNotice(view.message);
                return false;
            }
            const events = bufferedEvents.current.slice();
            appliedEvents = events.length;
            setBlocks(events.reduce(applyRpcEvent, hydrateMessages(view.messages)));
            setActiveSessionId(view.sessionId);
            setNotice(null);
            initialized.current = true;
            await refreshSessions();
            return true;
        } catch (error) {
            if (epoch === workspaceEpoch.current) setNotice(error instanceof Error ? error.message : "读取会话失败");
            return false;
        } finally {
            if (epoch === workspaceEpoch.current) {
                const events = bufferedEvents.current.slice(appliedEvents);
                if (events.length) setBlocks((current) => events.reduce(applyRpcEvent, current));
                bufferedEvents.current = [];
                loading.current = false;
                setSessionBusy(false);
            }
        }
    }, [refreshSessions]);

    useEffect(() => {
        if (status.engine !== "idle") return;
        setBlocks((current) => settleTranscript(current));
    }, [status.engine]);

    useEffect(() => {
        const desktop = window.piDesktop;
        if (!desktop?.getEngineStatus || !desktop.onEngineStatus || !desktop.onRpcEvent) return;
        const apply = (snapshot: EngineSnapshot) => {
            if (cwdRef.current && snapshot.cwd !== cwdRef.current) {
                workspaceEpoch.current += 1;
                initialized.current = false;
                loading.current = false;
                bufferedEvents.current = [];
                setBlocks([]);
                setSessions([]);
                setActiveSessionId(null);
                setSessionBusy(false);
            }
            cwdRef.current = snapshot.cwd;
            setStatus(withBridge(snapshot));
            setHydrated(true);
        };
        let receivedStatus = false;
        const offStatus = desktop.onEngineStatus((snapshot) => {
            receivedStatus = true;
            apply(snapshot);
        });
        const offEvent = desktop.onRpcEvent((event) => {
            if (loading.current) bufferedEvents.current.push(event);
            else setBlocks((current) => applyRpcEvent(current, event));
            if (event.type === "message_end" && event.errorMessage) {
                setNotice(`模型请求失败：${event.errorMessage}`);
            } else if (event.type === "agent_start") {
                setNotice(null);
            }
        });
        let cancelled = false;
        desktop.getEngineStatus().then((snapshot) => {
            if (!cancelled && !receivedStatus) apply(snapshot);
        }).catch((error) => {
            if (!cancelled && !receivedStatus) setStatus((current) => ({ ...current, engine: "disconnected", detail: error instanceof Error ? error.message : "读取引擎状态失败" }));
        });
        return () => {
            cancelled = true;
            offStatus();
            offEvent();
        };
    }, []);

    useEffect(() => {
        const desktop = window.piDesktop;
        if (!desktop?.listWorkspaces || !desktop.onWorkspacesChanged) return;
        let changed = false;
        const off = desktop.onWorkspacesChanged((state) => {
            changed = true;
            setWorkspaceState(state);
        });
        void desktop.listWorkspaces().then((state) => {
            if (!changed) setWorkspaceState(state);
        }).catch((error) => setNotice(error instanceof Error ? error.message : "读取工作区失败"));
        return off;
    }, []);

    useEffect(() => {
        if (status.engine === "reconnecting" || status.engine === "disconnected") {
            initialized.current = false;
            return;
        }
        if (status.engine !== "idle") return;
        if (!initialized.current) {
            const desktop = window.piDesktop;
            if (desktop?.getSessionView) void loadView(() => desktop.getSessionView());
        } else {
            void refreshSessions();
        }
    }, [status.engine, loadView, refreshSessions]);

    useEffect(() => {
        if (status.cwd) void refreshSessions();
    }, [status.cwd, refreshSessions]);

    useEffect(() => {
        const desktop = window.piDesktop;
        if (!desktop?.onCredentialStatus) return;
        return desktop.onCredentialStatus((payload) => {
            setStatus((current) => ({ ...current, credentials: payload.summary }));
            if (payload.summary.configured) {
                setNoticeState((current) => (current?.credentials ? null : current));
            }
        });
    }, []);

    const sendPrompt = useCallback(async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return false;
        const desktop = window.piDesktop;
        if (loading.current || sessionBusy || workspaceBusy) return false;
        if (!desktop?.sendPrompt) {
            setNotice("RPC 引擎只在 Electron 窗口里运行。用 npm run dev 打开桌面壳。");
            return false;
        }
        if (!status.credentials.configured) {
            setNotice("模型凭据未配置。密钥只留在主进程 AuthStorage，请打开凭据页。", true);
            return false;
        }
        // Show the user bubble before the request: the engine can stream the reply before the ack.
        promptCounter.current += 1;
        const blockId = `prompt-${promptCounter.current}`;
        const withdraw = () => setBlocks((current) => current.filter((block) => block.id !== blockId));
        setBlocks((current) => appendUserBlock(current, trimmed, blockId));
        let result: PromptResult;
        try {
            result = await desktop.sendPrompt(trimmed);
        } catch (error) {
            withdraw();
            setNotice(error instanceof Error ? error.message : "发送失败");
            return false;
        }
        if (!result.ok) {
            withdraw();
            if (result.code === "credentials") {
                setNotice(result.message ? `模型凭据不可用：${result.message}` : "模型凭据未配置。请打开凭据页。", true);
                return false;
            }
            setNotice(result.message || "发送失败");
            return false;
        }
        setNotice(null);
        return true;
    }, [status.credentials.configured, sessionBusy, workspaceBusy]);

    const abort = useCallback(async () => {
        const desktop = window.piDesktop;
        if (!desktop?.abortPrompt) return false;
        try {
            const result = await desktop.abortPrompt();
            if (!result.ok) setNotice(result.message || "中止失败");
            return result.ok;
        } catch (error) {
            setNotice(error instanceof Error ? error.message : "中止失败");
            return false;
        }
    }, [setNotice]);

    const changeSession = useCallback(async (sessionId: string | null) => {
        const desktop = window.piDesktop;
        if (!desktop?.changeSession || loading.current || workspaceBusy) return false;
        if (sessionId !== null && sessionId === activeSessionId) return true;
        return loadView(() => desktop.changeSession(sessionId));
    }, [activeSessionId, loadView, workspaceBusy]);

    const addWorkspace = useCallback(async () => {
        const desktop = window.piDesktop;
        if (!desktop?.addWorkspace || workspaceAction.current) return false;
        workspaceAction.current = true;
        setWorkspaceBusy(true);
        try {
            const result = await desktop.addWorkspace();
            setWorkspaceState(result.state);
            if (result.message) setNotice(result.message);
            if (result.ok) window.location.hash = "#/";
            return result.ok;
        } catch (error) {
            setNotice(error instanceof Error ? error.message : "添加工作区失败");
            return false;
        } finally {
            workspaceAction.current = false;
            setWorkspaceBusy(false);
        }
    }, []);

    const removeWorkspace = useCallback(async (cwd: string) => {
        const desktop = window.piDesktop;
        // An already-open window keeps its old preload until the app restarts.
        if (!desktop?.removeWorkspace) return { ok: false, message: "请完全退出并重新启动应用后再移除工作区" };
        if (workspaceAction.current) return { ok: false, message: "正在处理其他工作区操作" };
        workspaceAction.current = true;
        try {
            const result = await desktop.removeWorkspace(cwd);
            if (result.state) setWorkspaceState(result.state);
            return result.ok ? { ok: true } : { ok: false, message: result.message || "移除工作区失败" };
        } catch (error) {
            return { ok: false, message: error instanceof Error ? error.message : "移除工作区失败" };
        } finally {
            workspaceAction.current = false;
        }
    }, []);

    const switchWorkspace = useCallback(async (cwd: string) => {
        const desktop = window.piDesktop;
        if (!desktop?.switchWorkspace || workspaceAction.current) return false;
        if (cwd === status.cwd) {
            window.location.hash = "#/";
            return true;
        }
        workspaceAction.current = true;
        setWorkspaceBusy(true);
        try {
            const result = await desktop.switchWorkspace(cwd);
            setWorkspaceState(result.state);
            if (!result.ok) setNotice(result.message || "切换工作区失败");
            else {
                setNotice(null);
                window.location.hash = "#/";
            }
            return result.ok;
        } catch (error) {
            setNotice(error instanceof Error ? error.message : "切换工作区失败");
            return false;
        } finally {
            workspaceAction.current = false;
            setWorkspaceBusy(false);
        }
    }, [status.cwd]);

    const value = useMemo(
        () => ({
            status, hydrated, blocks, notice: noticeState?.text ?? null, noticeNeedsCredentials: Boolean(noticeState?.credentials), dismissNotice,
            sessions, activeSessionId, sessionBusy, workspaceState, workspaceBusy,
            addWorkspace, removeWorkspace, switchWorkspace, changeSession, sendPrompt, abort,
        }),
        [status, hydrated, blocks, noticeState, dismissNotice, sessions, activeSessionId, sessionBusy, workspaceState, workspaceBusy, addWorkspace, removeWorkspace, switchWorkspace, changeSession, sendPrompt, abort],
    );

    return <RpcContext.Provider value={value}>{children}</RpcContext.Provider>;
}

export function useRpc() {
    const value = useContext(RpcContext);
    if (!value) throw new Error("useRpc must be used within RpcProvider");
    return value;
}
