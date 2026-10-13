import type { ReactNode } from "react";
import { useStoredPanelWidth } from "../hooks/useStoredPanelWidth";
import { ResizeHandle } from "./ResizeHandle";
import { Sidebar } from "./Sidebar";
import { TerminalPanel } from "./TerminalPanel";
import type { Route } from "../router";

interface MainShellLayoutProps {
  route: Route;
  underlayRoute: Route;
  contentPadClass: string;
  showTerminal: boolean;
  terminalCwd: string;
  onCloseTerminal: () => void;
  children: ReactNode;
}

export function MainShellLayout({
  route,
  underlayRoute,
  contentPadClass,
  showTerminal,
  terminalCwd,
  onCloseTerminal,
  children,
}: MainShellLayoutProps) {
  const sidebar = useStoredPanelWidth("pi.shell.sidebarWidth", 240, 200, 420);
  const terminal = useStoredPanelWidth("pi.shell.terminalWidth", 340, 260, 640);

  const sidebarRoute = route === "branch" ? underlayRoute : route;

  return (
    <div className={`flex h-full min-h-0 flex-col pt-10 ${contentPadClass}`}>
      <div className="flex min-h-0 min-w-0 flex-1">
        <Sidebar route={sidebarRoute} width={sidebar.width} />
        <ResizeHandle
          label="调整侧栏宽度"
          onDelta={(dx) => sidebar.setWidth((current) => current + dx)}
          onReset={sidebar.reset}
        />
        <div className="min-h-0 min-w-0 flex-1 bg-surface">{children}</div>
        {showTerminal ? (
          <>
            <ResizeHandle
              label="调整终端宽度"
              onDelta={(dx) => terminal.setWidth((current) => current - dx)}
              onReset={terminal.reset}
            />
            <TerminalPanel cwd={terminalCwd} width={terminal.width} onClose={onCloseTerminal} />
          </>
        ) : null}
      </div>
    </div>
  );
}
