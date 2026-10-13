import { useEffect, useState, type ReactNode } from "react";
import { useRpc } from "../rpc/RpcProvider";
import { Icon } from "./Icon";

/** Inline SVGs — Material subset lacks minimize / crop_square, which overflow as ligature text. */
function MinimizeIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" className="shrink-0">
      <rect x="1" y="4.5" width="8" height="1" fill="currentColor" />
    </svg>
  );
}

function MaximizeIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" className="shrink-0">
      <rect x="1.5" y="1.5" width="7" height="7" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" className="shrink-0">
      <path d="M2 2 L8 8 M8 2 L2 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function WindowControl({
  label,
  onClick,
  children,
  danger = false,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`titlebar-no-drag flex h-10 w-11 shrink-0 items-center justify-center overflow-hidden text-on-surface-variant transition-colors ${
        danger
          ? "hover:bg-[#c42b1c] hover:text-white"
          : "hover:bg-surface-container-high hover:text-on-surface"
      }`}
    >
      {children}
    </button>
  );
}

function TerminalTab() {
  return (
    <div className="titlebar-no-drag flex items-center px-space-xs">
      <button type="button" onClick={() => window.dispatchEvent(new Event("terminal:toggle"))} className="titlebar-no-drag flex h-8 shrink-0 items-center gap-1 rounded px-space-sm font-label-sm text-label-sm text-on-surface-variant transition-colors hover:bg-surface-container/50 hover:text-on-surface" title="终端 Terminal">
        <Icon name="terminal" className="text-[15px]" />
        <span>终端</span>
      </button>
    </div>
  );
}

function WindowControls({ desktop }: { desktop?: Window["piDesktop"] }) {
  return (
    <div className="titlebar-no-drag flex h-10 shrink-0 items-stretch border-l border-surface-container-high/40">
      <WindowControl label="最小化" onClick={() => desktop?.minimize()}>
        <MinimizeIcon />
      </WindowControl>
      <WindowControl label="最大化" onClick={() => desktop?.toggleMaximize()}>
        <MaximizeIcon />
      </WindowControl>
      <WindowControl label="关闭" danger onClick={() => desktop?.close()}>
        <CloseIcon />
      </WindowControl>
    </div>
  );
}

export function TitleBar({ showTerminal = false }: { showTerminal?: boolean }) {
  const desktop = window.piDesktop;
  const { addWorkspace, workspaceBusy, status } = useRpc();
  const [gitCount, setGitCount] = useState<number | null>(null);
  const [branch, setBranch] = useState<string | null>(null);

  useEffect(() => {
    const desktop = window.piDesktop;
    if (!desktop?.getGitStatus) return;
    let active = true;
    const refresh = () => {
      void desktop.getGitStatus().then((result) => {
        if (!active) return;
        setGitCount(result.ok ? result.files.length : null);
        setBranch(result.ok ? result.branch : null);
      }).catch(() => { if (active) setGitCount(null); });
    };
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("git:changed", refresh);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
      window.removeEventListener("git:changed", refresh);
    };
  }, [status.cwd]);

  return (
    <header className="titlebar-drag fixed left-0 right-0 top-0 z-chrome flex h-10 select-none items-center overflow-hidden bg-surface-container-lowest pl-space-md">
      <div className="flex min-w-0 flex-1 items-center gap-space-md">
        <div className="titlebar-no-drag flex shrink-0 items-center gap-space-xs">
          <button
            type="button"
            disabled={workspaceBusy}
            onClick={() => {
              if (desktop?.addWorkspace) void addWorkspace();
              else window.location.hash = "#/onboarding";
            }}
            className="flex h-7 items-center gap-1.5 rounded bg-surface-container px-space-sm font-label-sm text-label-sm text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="folder_open" className="text-[15px] text-on-surface-variant" />
            <span>打开文件夹</span>
          </button>
          <a
            href="#/diff"
            className="flex h-7 items-center gap-1.5 rounded bg-surface-container px-space-sm font-label-sm text-label-sm text-on-surface transition-colors hover:bg-surface-container-high"
          >
            <Icon name="commit" className="text-[15px] text-tertiary" />
            <span>提交更改{gitCount === null ? "" : ` (${gitCount})`}</span>
          </a>
        </div>
        <div className="flex shrink-0 items-center gap-space-sm" onDoubleClick={() => desktop?.toggleMaximize()}>
          <a
            href="#/branch"
            title="切换分支"
            className="titlebar-no-drag flex shrink-0 items-center gap-1 rounded bg-surface-container-high px-1.5 py-0.5 font-code-sm text-code-sm text-secondary transition-colors hover:bg-surface-bright"
          >
            <span>{branch || "main"}</span>
            <span className="text-outline">⌥</span>
          </a>
        </div>
      </div>
      {showTerminal ? (
        <div className="flex h-10 shrink-0 items-stretch">
          <TerminalTab />
          <WindowControls desktop={desktop} />
        </div>
      ) : (
        <div className="ml-space-sm">
          <WindowControls desktop={desktop} />
        </div>
      )}
    </header>
  );
}
