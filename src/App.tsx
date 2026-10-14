import { useEffect, useState } from "react";
import { MainShellLayout } from "./components/MainShellLayout";
import { ShortcutToast } from "./components/ShortcutToast";
import { useGlobalShortcuts } from "./hooks/useGlobalShortcuts";
import { useSandbox } from "./hooks/useSandbox";
import { StatusBar } from "./components/StatusBar";
import { TitleBar } from "./components/TitleBar";
import { BranchSwitcher } from "./pages/BranchSwitcher";
import { CredentialsPage } from "./pages/CredentialsPage";
import { DiffPage } from "./pages/DiffPage";
import { HistoryPage } from "./pages/HistoryPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { SettingsPage } from "./pages/SettingsPage";
import { WorkspacePage } from "./pages/WorkspacePage";
import { useRpc } from "./rpc/RpcProvider";
import { readRoute, type Route } from "./router";

export default function App() {
    const rpc = useRpc();
    const sandboxController = useSandbox();
    const sandbox = sandboxController.status.state;
    const [route, setRoute] = useState<Route>(readRoute);
    const [underlay, setUnderlay] = useState<Route>(() => {
        const initial = readRoute();
        return initial === "branch" || initial === "onboarding" ? "workspace" : initial;
    });
    const [terminalOpen, setTerminalOpen] = useState(false);

    useEffect(() => {
        const toggle = () => setTerminalOpen((open) => !open);
        window.addEventListener("terminal:toggle", toggle);
        return () => window.removeEventListener("terminal:toggle", toggle);
    }, []);

    useEffect(() => {
        const sync = () => setRoute(readRoute());
        window.addEventListener("hashchange", sync);
        return () => window.removeEventListener("hashchange", sync);
    }, []);

    useEffect(() => {
        if (route !== "branch" && route !== "onboarding") setUnderlay(route);
    }, [route]);

    useGlobalShortcuts(route !== "onboarding" && route !== "credentials" && route !== "branch" && sandbox !== "enabling");

    useEffect(() => {
        if (sandbox !== "enabling" || !sandboxController.available) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            void sandboxController.setEnabled(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [sandbox, sandboxController.available, sandboxController.setEnabled]);

    if (route === "onboarding") {
        return (
            <div className="h-screen overflow-hidden bg-surface font-body-md text-body-md text-on-surface antialiased">
                <OnboardingPage />
            </div>
        );
    }

    const page = underlay === "diff" ? <DiffPage />
        : underlay === "history" ? <HistoryPage />
        : underlay === "settings" ? <SettingsPage sandboxController={sandboxController} />
        : underlay === "credentials" ? <CredentialsPage />
        : <WorkspacePage />;

    return (
        <div className="h-screen overflow-hidden bg-surface font-body-md text-body-md text-on-surface antialiased">
            <TitleBar showTerminal={route === "diff" || route === "workspace"} />
            <MainShellLayout
                route={route}
                underlayRoute={underlay}
                contentPadClass="pb-6"
                showTerminal={terminalOpen && (route === "workspace" || route === "diff")}
                terminalCwd={rpc.status.cwd}
                terminalSandboxState={sandboxController.available ? `${sandbox}:${sandboxController.status.requested}` : undefined}
                onCloseTerminal={() => setTerminalOpen(false)}
            >
                {page}
            </MainShellLayout>
            <StatusBar
                sandbox={sandbox}
                sandboxStatus={sandboxController.available ? sandboxController.status : null}
                connection={rpc.status}
            />
            <ShortcutToast />
            {route === "branch" ? (
                <BranchSwitcher
                    onClose={() => {
                        window.location.hash = underlay === "workspace" ? "#/" : `#/${underlay}`;
                    }}
                />
            ) : null}
        </div>
    );
}
