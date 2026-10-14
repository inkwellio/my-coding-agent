import { useGitSummary } from "../git/useGitSummary";
import type { RpcStatus } from "../rpc/types";
import { engineChipLabel, type SandboxState } from "../status";
import type { SandboxSnapshot } from "../sandbox/types";

interface StatusBarProps {
    sandbox: SandboxState;
    sandboxStatus?: SandboxSnapshot | null;
    connection?: RpcStatus | null;
}

function LiveEngineChip({ connection }: { connection: RpcStatus }) {
    return (
        <span
            data-engine={connection.engine}
            data-web-contents={connection.webContentsId ?? ""}
            title={connection.detail || `每窗口独立进程${connection.webContentsId != null ? ` · #${connection.webContentsId}` : ""}`}
            className="inline-flex items-center gap-1.5"
        >
            {connection.engine === "reconnecting" ? (
                <span className="h-1.5 w-1.5 animate-spin rounded-full border border-primary border-t-transparent" />
            ) : (
                <span
                    className={`h-1.5 w-1.5 rounded-full ${
                        connection.engine === "idle"
                            ? "bg-success"
                            : connection.engine === "chatting"
                                ? "bg-secondary animate-pulse"
                                : "bg-error/60"
                    }`}
                />
            )}
            <span>{engineChipLabel(connection.engine)}</span>
        </span>
    );
}

function sandboxLabel(sandbox: SandboxState) {
    if (sandbox === "on") return "沙盒 · 命令隔离";
    if (sandbox === "enabling") return "沙盒 · 正在启用";
    return "沙盒 · 未启用";
}

export function StatusBar({ sandbox, sandboxStatus, connection }: StatusBarProps) {
    const git = useGitSummary(connection?.cwd ?? "");
    const branchLabel = git.branch === "HEAD" ? "分离 HEAD" : git.branch;

    return (
        <footer className="fixed bottom-0 left-0 right-0 z-chrome flex h-6 select-none items-center bg-surface-container-lowest px-space-md font-code-sm text-code-sm text-on-surface-variant">
            <div className="flex items-center gap-space-md">
                {branchLabel ? (
                    <a href="#/branch" title={git.changes ? `${git.changes} 个未提交更改` : "工作区干净"} className="hover:text-on-surface">
                        Git: {branchLabel}{git.changes ? "*" : " ✓"}
                    </a>
                ) : null}
                {connection?.available ? (
                    <>
                        {branchLabel ? <span className="text-outline">|</span> : null}
                        <LiveEngineChip connection={connection} />
                    </>
                ) : null}
                {sandboxStatus ? (
                    <>
                        <span className="text-outline">|</span>
                        <a href="#/settings" title={sandboxStatus.detail || "在设置中管理命令隔离"} className="hover:text-on-surface">{sandboxLabel(sandbox)}</a>
                    </>
                ) : null}
            </div>
        </footer>
    );
}
