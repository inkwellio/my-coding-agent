import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { EMPTY_CREDENTIALS, type EngineSnapshot, type PromptResult, type RpcStatus, type RpcWireEvent, type SessionSummary, type SessionView, type TranscriptBlock, type WorkspaceState } from "./types";
import { appendUserBlock, applyRpcEvent, hydrateMessages, settleTranscript } from "./transcript";

interface RpcContextValue {
  status: RpcStatus;
  hydrated: boolean;
  blocks: TranscriptBlock[];
  notice: string | null;
  sessions: SessionSummary[];
  activeSessionId: string | null;
  sessionBusy: boolean;
  workspaceState: WorkspaceState;
  workspaceBusy: boolean;
  addWorkspace: () => Promise<boolean>;
  switchWorkspace: (cwd: string) => Promise<boolean>;
  changeSession: (sessionId: string | null) => Promise<boolean>;
  sendPrompt: (text: string) => Promise<boolean>;
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
  const [notice, setNotice] = useState<string | null>(null);
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
    const offStatus = desktop.onEngineStatus(apply);
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
      if (!cancelled) apply(snapshot);
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
        setNotice((current) => (current && current.includes("凭据") ? null : current));
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
      setNotice("模型凭据未配置。密钥只留在主进程 AuthStorage，请打开凭据页。");
      return false;
    }
    const result: PromptResult = await desktop.sendPrompt(trimmed);
    if (!result.ok) {
      if (result.code === "credentials") {
        setNotice(result.message ? `模型凭据不可用：${result.message}` : "模型凭据未配置。请打开凭据页。");
        return false;
      }
      setNotice(result.message || "发送失败");
      return false;
    }
    setNotice(null);
    setBlocks((current) => appendUserBlock(current, trimmed));
    return true;
  }, [status.credentials.configured, sessionBusy, workspaceBusy]);

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
    () => ({ status, hydrated, blocks, notice, sessions, activeSessionId, sessionBusy, workspaceState, workspaceBusy, addWorkspace, switchWorkspace, changeSession, sendPrompt }),
    [status, hydrated, blocks, notice, sessions, activeSessionId, sessionBusy, workspaceState, workspaceBusy, addWorkspace, switchWorkspace, changeSession, sendPrompt],
  );

  return <RpcContext.Provider value={value}>{children}</RpcContext.Provider>;
}

export function useRpc() {
  const value = useContext(RpcContext);
  if (!value) throw new Error("useRpc must be used within RpcProvider");
  return value;
}
