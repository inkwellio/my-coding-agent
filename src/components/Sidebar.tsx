import { useState } from "react";
import type { Route } from "../router";
import { useRpc } from "../rpc/RpcProvider";
import { Icon } from "./Icon";

function workspaceName(cwd: string) {
  return cwd.split(/[\\/]/).filter(Boolean).at(-1) || cwd;
}

export function Sidebar({ route, width }: { route: Route; width: number }) {
  const { status, sessions, activeSessionId, sessionBusy, workspaceState, workspaceBusy, switchWorkspace, changeSession } = useRpc();
  const [expandedByPath, setExpandedByPath] = useState<Record<string, boolean>>({});
  const cwd = status.available ? status.cwd : "";
  const paths = workspaceState.paths.length ? workspaceState.paths : cwd ? [cwd] : [];

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
                <div className={`flex min-w-0 items-center rounded ${active ? "bg-surface-container-high text-on-surface" : "text-on-surface-variant hover:bg-surface-container"}`}>
                  <button
                    type="button"
                    aria-label={`${expanded ? "折叠" : "展开"} ${workspaceName(workspacePath)} 的会话`}
                    aria-expanded={expanded}
                    aria-controls={active ? "sidebar-workspace-sessions" : undefined}
                    title={workspacePath}
                    disabled={switchingDisabled}
                    onClick={() => toggleWorkspace(workspacePath)}
                    className="flex min-w-0 flex-1 items-center rounded py-1.5 pl-space-xs pr-space-sm text-left font-body-sm text-body-sm hover:bg-surface-container-highest disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Icon name="chevron_right" className={`mr-1 shrink-0 text-[17px] transition-transform ${expanded ? "rotate-90" : ""}`} />
                    <Icon name="folder" className="mr-2 shrink-0 text-[15px] text-on-surface-variant" />
                    <span className="truncate">{workspaceName(workspacePath)}</span>
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
                        title="新建会话"
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
                    ) : sessions.map((session) => (
                      <button
                        key={session.id}
                        type="button"
                        title={session.title}
                        aria-current={session.id === activeSessionId ? "page" : undefined}
                        disabled={sessionBusy || workspaceBusy || status.engine !== "idle"}
                        onClick={() => void openSession(session.id)}
                        className={`flex min-w-0 flex-col rounded px-space-sm py-1.5 text-left disabled:cursor-not-allowed disabled:opacity-50 ${session.id === activeSessionId ? "bg-surface-container-high text-on-surface" : "text-on-surface-variant hover:bg-surface-container"}`}
                      >
                        <span className="w-full truncate font-body-sm text-body-sm">{session.title}</span>
                        <span className="font-label-xs text-label-xs text-outline">{new Date(session.modified).toLocaleString("zh-CN")}</span>
                      </button>
                    ))}
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
            ? "flex items-center rounded bg-surface-container-high px-space-sm py-1.5 font-medium text-on-surface"
            : "flex items-center rounded px-space-sm py-1.5 font-body-sm text-body-sm text-on-surface-variant hover:bg-surface-container"}
        >
          设置
        </a>
      </nav>
    </aside>
  );
}
