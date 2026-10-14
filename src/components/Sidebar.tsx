import { useEffect, useState } from "react";
import { relativeTime } from "../git/format";
import type { Route } from "../router";
import { useRpc } from "../rpc/RpcProvider";
import { Icon } from "./Icon";
import { showToast } from "./ShortcutToast";

/** How long the delete button waits for the confirming second click. */
const DELETE_CONFIRM_MS = 3000;

function TrashIcon() {
    return (
        <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 4h11M6.5 4V2.5h3V4M4 4l.7 9.5h6.6L12 4M6.75 7v4M9.25 7v4" />
        </svg>
    );
}

function workspaceName(cwd: string) {
    return cwd.split(/[\\/]/).filter(Boolean).at(-1) || cwd;
}

export function Sidebar({ route, width }: { route: Route; width: number }) {
    const { status, sessions, activeSessionId, sessionBusy, workspaceState, workspaceBusy, switchWorkspace, removeWorkspace, changeSession, deleteSession } = useRpc();
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);

    useEffect(() => {
        if (!confirmDelete) return;
        const timer = window.setTimeout(() => setConfirmDelete(null), DELETE_CONFIRM_MS);
        return () => window.clearTimeout(timer);
    }, [confirmDelete]);

    async function removeSession(id: string, title: string) {
        // First click arms the button; a second click within DELETE_CONFIRM_MS deletes.
        if (confirmDelete !== id) {
            setConfirmDelete(id);
            return;
        }
        setConfirmDelete(null);
        setDeleting(id);
        try {
            const result = await deleteSession(id);
            showToast(result.ok ? `已删除「${title}」，可在系统回收站中恢复` : result.message ?? "删除会话失败");
        } finally {
            setDeleting(null);
        }
    }
    const [expandedByPath, setExpandedByPath] = useState<Record<string, boolean>>({});
    const cwd = status.available ? status.cwd : "";
    const paths = workspaceState.paths.length ? workspaceState.paths : cwd ? [cwd] : [];
    const busyReason = status.engine === "chatting" ? "代理正在回答，完成或中止后才能切换"
        : workspaceBusy ? "正在切换工作区"
        : sessionBusy ? "正在读取会话"
        : status.engine !== "idle" ? "引擎尚未就绪"
        : null;

    async function openSession(id: string | null) {
        if (await changeSession(id)) window.location.hash = "#/";
    }

    function toggleWorkspace(path: string) {
        if (path === cwd) {
            setExpandedByPath((current) => ({ ...current, [path]: !(current[path] ?? true) }));
        } else {
            setExpandedByPath((current) => ({ ...current, [path]: true }));
            void switchWorkspace(path);
        }
    }

    function openWorkspace(path: string) {
        if (path === cwd) window.location.hash = "#/";
        else void switchWorkspace(path);
    }

    return (
        <aside
            style={{ width }}
            className="flex h-full min-h-0 shrink-0 flex-col justify-between overflow-y-auto bg-surface-container-lowest"
        >
            <div className="flex flex-col">
                <nav aria-label="工作区" className="flex flex-col gap-space-xs px-space-sm py-space-xs">
                    <div className="px-space-sm pb-space-xs pt-space-sm font-label-xs text-label-xs font-semibold uppercase tracking-wider text-outline">
                        工作区
                    </div>
                    {paths.length === 0 ? (
                        <p className="px-space-sm py-1.5 font-body-sm text-body-sm text-outline">尚未连接工作区</p>
                    ) : paths.map((workspacePath) => {
                        const active = workspacePath === cwd;
                        const expanded = active && (expandedByPath[workspacePath] ?? true);
                        const switchingDisabled = !active && (!cwd || workspaceBusy || sessionBusy || status.engine === "chatting");
                        return (
                            <div key={workspacePath} className="flex min-w-0 flex-col gap-0.5">
                                <div className={`group/workspace flex min-w-0 items-center rounded ${active ? "bg-surface-container-high text-on-surface" : "text-on-surface-variant hover:bg-surface-container"}`}>
                                    <button
                                        type="button"
                                        aria-label={`${expanded ? "折叠" : "展开"} ${workspaceName(workspacePath)} 的会话`}
                                        aria-expanded={expanded}
                                        aria-controls={active ? "sidebar-workspace-sessions" : undefined}
                                        title={switchingDisabled && busyReason ? `${workspacePath}\n${busyReason}` : workspacePath}
                                        disabled={switchingDisabled}
                                        onClick={() => toggleWorkspace(workspacePath)}
                                        className="flex min-w-0 flex-1 items-center rounded py-1.5 pl-space-xs pr-space-sm text-left font-body-sm text-body-sm hover:bg-surface-container-highest disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <Icon name="chevron_right" className={`mr-1 shrink-0 text-[17px] transition-transform ${expanded ? "rotate-90" : ""}`} />
                                        <Icon name="folder" className="mr-2 shrink-0 text-[15px] text-on-surface-variant" />
                                        <span className="truncate">{workspaceName(workspacePath)}</span>
                                    </button>
                                    {/* Opacity, not display:none, so the button stays reachable by keyboard. */}
                                    <button
                                        type="button"
                                        title={active ? "当前打开的工作区不能移除，请先切换到其他工作区" : "从列表移除（不会删除文件）"}
                                        aria-label={`从列表移除 ${workspaceName(workspacePath)}`}
                                        aria-disabled={active || workspaceBusy}
                                        onClick={() => {
                                            if (active) showToast("当前打开的工作区不能移除，请先切换到其他工作区");
                                            else if (!workspaceBusy) {
                                                void removeWorkspace(workspacePath).then((result) => {
                                                    showToast(result.ok ? `已从列表移除 ${workspaceName(workspacePath)}` : result.message ?? "移除工作区失败");
                                                });
                                            }
                                        }}
                                        className={`flex h-8 w-7 shrink-0 items-center justify-center rounded text-on-surface-variant opacity-0 transition-opacity focus-visible:opacity-100 group-hover/workspace:opacity-100 ${
                                            active || workspaceBusy ? "cursor-not-allowed !text-outline/60" : "hover:bg-surface-container-highest hover:text-error"
                                        }`}
                                    >
                                        <Icon name="close" className="text-[15px]" />
                                    </button>
                                    <button
                                        type="button"
                                        title="打开工作区"
                                        aria-label={`打开 ${workspaceName(workspacePath)} 工作区`}
                                        disabled={switchingDisabled}
                                        onClick={() => openWorkspace(workspacePath)}
                                        className="flex h-8 w-7 shrink-0 items-center justify-center overflow-hidden rounded text-on-surface-variant hover:bg-surface-container-highest disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M11 4h5v5M16 4l-7 7" />
                                            <path d="M16 11v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h4" />
                                        </svg>
                                    </button>
                                </div>
                                {active ? (
                                    <div id="sidebar-workspace-sessions" className={expanded ? "ml-4 flex flex-col gap-0.5 border-l border-outline-variant/50 pl-2" : "hidden"}>
                                        <div className="flex items-center justify-between px-space-sm pt-space-sm">
                                            <span className="font-label-xs text-label-xs font-semibold uppercase tracking-wider text-outline">历史会话</span>
                                            <button
                                                type="button"
                                                title={busyReason ? `新建会话（${busyReason}）` : "新建会话"}
                                                aria-label="新建会话"
                                                disabled={sessionBusy || workspaceBusy || status.engine !== "idle"}
                                                onClick={() => void openSession(null)}
                                                className="rounded p-1 text-on-surface-variant hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                <Icon name="add" className="text-[17px]" />
                                            </button>
                                        </div>
                                        {sessions.length === 0 ? (
                                            <p className="px-space-sm py-space-xs font-body-sm text-body-sm text-outline">暂无历史会话</p>
                                        ) : sessions.map((session) => {
                                            const current = session.id === activeSessionId;
                                            const sessionDisabled = sessionBusy || workspaceBusy || status.engine !== "idle";
                                            const armed = confirmDelete === session.id;
                                            return (
                                                <div
                                                    key={session.id}
                                                    className={`group/session flex min-w-0 items-center rounded ${current ? "bg-surface-container-high text-on-surface" : "text-on-surface-variant hover:bg-surface-container"}`}
                                                >
                                                    <button
                                                        type="button"
                                                        title={busyReason ? `${session.title}\n${busyReason}` : session.title}
                                                        aria-current={current ? "page" : undefined}
                                                        disabled={sessionDisabled}
                                                        onClick={() => void openSession(session.id)}
                                                        className="flex min-w-0 flex-1 flex-col rounded px-space-sm py-1.5 text-left disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        <span className="w-full truncate font-body-sm text-body-sm">{session.title}</span>
                                                        <span className="font-label-xs text-label-xs text-outline" title={new Date(session.modified).toLocaleString("zh-CN")}>
                                                            {relativeTime(Math.floor(Date.parse(session.modified) / 1000))}
                                                        </span>
                                                    </button>
                                                    {/* Opacity, not display:none, so the button stays reachable by keyboard. */}
                                                    <button
                                                        type="button"
                                                        title={sessionDisabled && busyReason ? `删除会话（${busyReason}）` : armed ? "再次点击确认删除" : "删除会话（移到系统回收站）"}
                                                        aria-label={armed ? `确认删除会话 ${session.title}` : `删除会话 ${session.title}`}
                                                        disabled={sessionDisabled || deleting !== null}
                                                        onClick={() => void removeSession(session.id, session.title)}
                                                        onBlur={() => { if (armed) setConfirmDelete(null); }}
                                                        className={`mr-0.5 flex h-7 shrink-0 items-center justify-center gap-1 rounded transition-opacity disabled:cursor-not-allowed disabled:opacity-30 ${
                                                            armed
                                                                ? "bg-error-container px-1.5 font-label-xs text-label-xs text-on-error-container opacity-100"
                                                                : "w-7 text-on-surface-variant opacity-0 hover:bg-surface-container-highest hover:text-error focus-visible:opacity-100 group-hover/session:opacity-100"
                                                        }`}
                                                    >
                                                        <TrashIcon />
                                                        {armed ? <span>确认</span> : null}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </nav>
            </div>
            <nav aria-label="设置" className="bg-surface-container-lowest px-space-sm py-space-sm">
                <a
                    href="#/settings"
                    aria-current={route === "settings" || route === "credentials" ? "page" : undefined}
                    className={route === "settings" || route === "credentials"
                        ? "flex items-center gap-2 rounded bg-surface-container-high px-space-sm py-1.5 font-medium text-on-surface"
                        : "flex items-center gap-2 rounded px-space-sm py-1.5 font-body-sm text-body-sm text-on-surface-variant hover:bg-surface-container"}
                >
                    <Icon name="settings" className="text-[17px]" />
                    设置
                </a>
            </nav>
        </aside>
    );
}
