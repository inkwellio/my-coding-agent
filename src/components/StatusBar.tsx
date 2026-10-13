import { useEffect, useState } from "react";
import { readLocationQuery } from "../router";
import type { RpcStatus } from "../rpc/types";
import { engineChipLabel, nextSandboxState, readPolicyNoteOpen, type EngineState, type SandboxState } from "../status";
import { Icon } from "./Icon";

interface StatusBarProps {
  variant: "workspace" | "branch" | "engine";
  engine: EngineState;
  sandbox: SandboxState;
  connection?: RpcStatus | null;
  onEngineChange: (engine: EngineState) => void;
  onSandboxChange: (sandbox: SandboxState) => void;
}

const engineSamples: { id: EngineState; dot: string }[] = [
  { id: "idle", dot: "bg-success" },
  { id: "chatting", dot: "bg-secondary animate-pulse" },
  { id: "reconnecting", dot: "spin" },
  { id: "disconnected", dot: "bg-error/60" },
];

function LiveEngineChip({ connection }: { connection: RpcStatus }) {
  return (
    <span
      data-engine={connection.engine}
      data-web-contents={connection.webContentsId ?? ""}
      title={`每窗口独立进程${connection.webContentsId != null ? ` · #${connection.webContentsId}` : ""}`}
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

export function StatusBar({ variant, engine, sandbox, connection, onEngineChange, onSandboxChange }: StatusBarProps) {
  const [policyOpen, setPolicyOpen] = useState(() => readPolicyNoteOpen(readLocationQuery()));
  const [hoveringSandbox, setHoveringSandbox] = useState(false);

  useEffect(() => {
    const sync = () => setPolicyOpen(readPolicyNoteOpen(readLocationQuery()));
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  if (variant === "branch") {
    return (
      <footer className="fixed bottom-0 left-0 right-0 z-chrome flex h-6 select-none items-center justify-between bg-surface-container-lowest px-space-md font-code-sm text-code-sm text-on-surface-variant">
        <div className="flex items-center gap-space-sm">
          <a
            href="#/branch"
            className="flex h-5 items-center gap-1 rounded px-1.5 font-code-sm text-code-sm text-secondary transition-colors hover:bg-surface-container-high"
          >
            <span>⎇ main</span>
            <span className="text-[10px] text-outline">▾</span>
          </a>
          <span className="text-outline">·</span>
          <span className="flex items-center gap-1.5">
            {connection?.available ? (
              <LiveEngineChip connection={connection} />
            ) : (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-tertiary" />
                <span>引擎 · 已连接</span>
              </>
            )}
          </span>
          <span className="text-outline">|</span>
          <span>权限: 自动执行 (安全模式)</span>
        </div>
        <div className="flex items-center gap-space-md">
          <span>已消耗 4.2k tokens</span>
          <span className="text-outline">|</span>
          <span>延迟 24ms</span>
        </div>
      </footer>
    );
  }

  if (variant === "engine") {
    const sandboxOn = sandbox === "on";
    const sandboxEnabling = sandbox === "enabling";
    return (
      <footer className="fixed bottom-0 left-0 right-0 z-chrome flex h-12 select-none items-center justify-between bg-surface-container-lowest/95 px-space-md backdrop-blur-md">
        <div className="flex h-full items-center gap-space-sm overflow-x-auto py-1">
          <a
            href="#/branch"
            className="flex shrink-0 items-center gap-1.5 rounded border border-outline-variant/30 bg-surface-container px-space-sm py-1 font-code-sm text-code-sm text-on-surface shadow-sm transition-all hover:border-primary hover:text-primary"
          >
            <span className="font-semibold text-primary">⎇</span>
            <span>main</span>
            <span className="text-[10px] text-outline">▾</span>
          </a>
          <div className="mx-0.5 h-6 w-px shrink-0 bg-outline-variant/30" />
          <div className="flex shrink-0 items-center gap-space-xs">
            {engineSamples.map((sample) => {
              const active = engine === sample.id;
              return (
                <button
                  key={sample.id}
                  type="button"
                  title="每窗口独立进程"
                  onClick={() => onEngineChange(sample.id)}
                  className={`flex flex-col justify-center rounded border px-2.5 py-1 shadow-sm transition-colors hover:bg-surface-container-high ${
                    active
                      ? "border-primary/40 bg-surface-container"
                      : "border-outline-variant/20 bg-surface-container"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {sample.dot === "spin" ? (
                      <span className="h-2 w-2 animate-spin rounded-full border border-primary border-t-transparent" />
                    ) : (
                      <span className={`h-2 w-2 rounded-full ${sample.dot}`} />
                    )}
                    <span
                      className={`font-label-sm text-label-sm font-medium ${
                        sample.id === "disconnected" ? "text-on-surface-variant" : "text-on-surface"
                      }`}
                    >
                      {engineChipLabel(sample.id)}
                    </span>
                  </span>
                  <span className="mt-0.5 pl-3.5 font-label-xs text-[10px] font-normal leading-none text-outline">
                    每窗口独立进程
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mx-0.5 h-6 w-px shrink-0 bg-outline-variant/30" />
          <div
            className="relative shrink-0"
            onMouseEnter={() => setHoveringSandbox(true)}
            onMouseLeave={() => setHoveringSandbox(false)}
          >
            <button
              type="button"
              data-sandbox={sandbox}
              onClick={() => onSandboxChange(nextSandboxState(sandbox))}
              className={`flex select-none items-center gap-2 rounded-full border px-3 py-1.5 shadow-sm transition-all ${
                sandboxOn
                  ? "border-tertiary/40 bg-tertiary/10 text-tertiary"
                  : sandboxEnabling
                    ? "border-primary/40 bg-surface-container text-primary"
                    : "border-outline-variant/30 bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              {sandboxEnabling ? (
                <span className="h-2 w-2 shrink-0 animate-spin rounded-full border border-primary border-t-transparent" />
              ) : (
                <span className={`h-2 w-2 shrink-0 rounded-full ${sandboxOn ? "bg-tertiary" : "bg-outline/50"}`} />
              )}
              <span className={`font-label-sm text-label-sm font-medium tracking-wide ${sandboxOn ? "text-tertiary" : "text-on-surface"}`}>
                {sandboxLabel(sandbox)}
              </span>
              <Icon name="shield" className={`shrink-0 text-[15px] ${sandboxOn ? "text-tertiary" : "text-outline"}`} />
            </button>
            {(hoveringSandbox || policyOpen) && sandboxOn ? (
              <div className="absolute bottom-12 left-0 z-chrome w-[380px] rounded-lg border border-tertiary/40 bg-surface-container-high/95 p-space-md shadow-2xl backdrop-blur-md">
                <div className="mb-2 flex items-center justify-between border-b border-outline-variant/30 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Icon name="shield_with_heart" className="text-[18px] text-tertiary" />
                    <span className="font-headline-sm text-[13px] font-semibold text-on-surface">沙盒隔离策略</span>
                  </div>
                  <span className="rounded border border-tertiary/30 bg-tertiary/10 px-1.5 py-0.5 font-label-xs text-tertiary">
                    已生效
                  </span>
                </div>
                <p className="font-body-sm text-[12px] leading-relaxed text-on-surface">
                  主要防范工作区外的文件操作，并限制随意联网；仍可修改当前项目。当前仅隔离终端命令。帮助降低命令风险，非绝对安全。
                </p>
                <div className="mt-2 flex items-center justify-between border-t border-outline-variant/20 pt-2 font-label-xs text-outline">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-tertiary" />
                    终端命令：独立沙箱
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
                    外网请求：白名单拦截
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-space-md pl-space-md font-code-sm text-code-sm text-on-surface-variant">
          <span className="flex items-center gap-1 rounded px-space-xs py-0.5 font-medium text-tertiary">
            <Icon name="wifi" className="text-[15px]" />
            延迟 42ms
          </span>
          <div className="h-4 w-px bg-outline-variant/30" />
          <span className="flex items-center gap-1 text-on-surface">
            <span className="font-medium text-primary">⚡</span>
            <span>4.2k / 128k</span>
            <span className="text-[11px] text-outline">(3.2%)</span>
          </span>
          <div className="h-4 w-px bg-outline-variant/30" />
          <span className="flex items-center gap-space-xs text-outline">
            <span>UTF-8</span>
            <span>·</span>
            <span>LF</span>
            <span>·</span>
            <a href="#/status" className="text-on-surface hover:text-primary">
              TypeScript
            </a>
          </span>
          <div className="h-4 w-px bg-outline-variant/30" />
          <span className="flex items-center gap-space-xs font-medium">
            <span className="flex items-center gap-0.5 text-error">
              <span className="text-[11px]">⊗</span> 0
            </span>
            <span className="ml-1 flex items-center gap-0.5 text-secondary">
              <span className="text-[11px]">⚠</span> 0
            </span>
          </span>
        </div>
      </footer>
    );
  }

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-chrome flex h-6 select-none items-center justify-between bg-surface-container-lowest px-space-md font-code-sm text-code-sm text-on-surface-variant">
      <div className="flex items-center gap-space-md">
        <a href="#/branch" className="hover:text-on-surface">
          Git: main ✓
        </a>
        <span className="text-outline">|</span>
        {connection?.available ? <LiveEngineChip connection={connection} /> : <span>引擎: v2.4 (Ready)</span>}
        <span className="text-outline">|</span>
        <span>权限: 自动执行 (安全模式)</span>
      </div>
      <div className="flex items-center gap-space-md">
        <a href="#/status" className="hover:text-on-surface">
          已消耗 4.2k tokens
        </a>
        <span className="text-outline">|</span>
        <a href="#/engine" className="hover:text-on-surface">
          延迟 24ms
        </a>
      </div>
    </footer>
  );
}
