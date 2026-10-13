import { useEffect, useState } from "react";
import { MainShellLayout } from "./components/MainShellLayout";
import { ShortcutToast } from "./components/ShortcutToast";
import { useGlobalShortcuts } from "./hooks/useGlobalShortcuts";
import { useSandbox } from "./hooks/useSandbox";
import { StatusBar } from "./components/StatusBar";
import { TitleBar } from "./components/TitleBar";
import { BranchCanvas } from "./pages/BranchCanvas";
import { BranchSwitcher } from "./pages/BranchSwitcher";
import { CredentialsFrame } from "./pages/CredentialsFrame";
import { DiffPage } from "./pages/DiffPage";
import { EngineStatusPage } from "./pages/EngineStatusPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { SettingsPage } from "./pages/SettingsPage";
import { StatusSpecPage } from "./pages/StatusSpecPage";
import { WorkspacePage } from "./pages/WorkspacePage";
import { useRpc } from "./rpc/RpcProvider";
import { readLocationQuery, readRoute, type Route } from "./router";
import {
    readDirtyWorktree,
    readStatusFromLocation,
    type EngineState,
    type SandboxState,
} from "./status";

function readShellFromLocation() {
    const params = readLocationQuery();
    const status = readStatusFromLocation(params);
    return {
        route: readRoute(),
        engine: status.engine,
        sandbox: status.sandbox,
        dirty: readDirtyWorktree(params),
    };
}

function shellFor(route: Route): { pad: string; bar: "workspace" | "branch" | "engine" | "none" } {
    if (route === "engine") return { pad: "pb-12", bar: "engine" };
    if (route === "status") return { pad: "pb-0", bar: "none" };
    if (route === "branch") return { pad: "pb-6", bar: "branch" };
    return { pad: "pb-6", bar: "workspace" };
}

export default function App() {
    const rpc = useRpc();
    const sandboxController = useSandbox();
    const initial = readShellFromLocation();
    const [route, setRoute] = useState<Route>(initial.route);
    const [engine, setEngine] = useState<EngineState>(initial.engine);
    const [sandboxSample, setSandbox] = useState<SandboxState>(initial.sandbox);
    const sandbox = sandboxController.available ? sandboxController.status.state : sandboxSample;
    const [underlay, setUnderlay] = useState<Route>(initial.route === "branch" || initial.route === "onboarding" ? "workspace" : initial.route);
    const [branchDirty, setBranchDirty] = useState(initial.dirty);
    const [terminalOpen, setTerminalOpen] = useState(false);

    useEffect(() => {
        const toggle = () => setTerminalOpen((open) => !open);
        window.addEventListener("terminal:toggle", toggle);
        return () => window.removeEventListener("terminal:toggle", toggle);
    }, []);

    useEffect(() => {
        const sync = () => {
            const next = readShellFromLocation();
            setRoute(next.route);
            setEngine(next.engine);
            setSandbox(next.sandbox);
            setBranchDirty(next.dirty);
        };
        window.addEventListener("hashchange", sync);
        return () => window.removeEventListener("hashchange", sync);
    }, []);

    useEffect(() => {
        if (route !== "branch" && route !== "onboarding" && route !== "credentials") setUnderlay(route);
    }, [route]);

    useGlobalShortcuts(route !== "onboarding" && route !== "credentials" && route !== "branch" && sandbox !== "enabling");

    useEffect(() => {
        if (sandbox !== "enabling") return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            if (sandboxController.available) void sandboxController.setEnabled(false);
            else setSandbox("off");
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

    if (route === "credentials") {
        return <CredentialsFrame />;
    }

    const shell = shellFor(route);
    const page = route === "branch" ? <BranchCanvas />
        : underlay === "diff" ? <DiffPage />
        : underlay === "settings" ? <SettingsPage sandboxController={sandboxController} />
        : underlay === "status" ? <StatusSpecPage />
        : underlay === "engine" ? <EngineStatusPage />
        : <WorkspacePage />;

    return (
        <div className="h-screen overflow-hidden bg-surface font-body-md text-body-md text-on-surface antialiased">
            <TitleBar showTerminal={route === "diff" || route === "workspace"} />
            <MainShellLayout
                route={route}
                underlayRoute={underlay}
                contentPadClass={shell.pad}
                showTerminal={terminalOpen && (route === "workspace" || route === "diff")}
                terminalCwd={rpc.status.cwd}
                terminalSandboxState={sandboxController.available ? `${sandbox}:${sandboxController.status.requested}` : undefined}
                onCloseTerminal={() => setTerminalOpen(false)}
            >
                {page}
            </MainShellLayout>
            {shell.bar === "none" ? null : (
                <StatusBar
                    variant={shell.bar}
                    engine={engine}
                    sandbox={sandbox}
                    sandboxStatus={sandboxController.available ? sandboxController.status : null}
                    sandboxBusy={sandboxController.busy}
                    connection={rpc.status}
                    onEngineChange={setEngine}
                    onSandboxChange={(next) => {
                        if (sandboxController.available) void sandboxController.setEnabled(next !== "off");
                        else setSandbox(next);
                    }}
                />
            )}
            <ShortcutToast />
            {route === "branch" ? (
                <BranchSwitcher
                    dirty={branchDirty}
                    onDirtyChange={setBranchDirty}
                    onClose={() => {
                        window.location.hash = underlay === "workspace" ? "#/" : `#/${underlay}`;
                    }}
                />
            ) : null}
        </div>
    );
}
