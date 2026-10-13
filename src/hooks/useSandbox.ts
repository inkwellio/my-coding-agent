import { useCallback, useEffect, useState } from "react";
import type { SandboxActionResult, SandboxSnapshot } from "../sandbox/types";

const initialStatus: SandboxSnapshot = {
    capability: "available", state: "off", requested: false, ready: false,
    installRequired: false, detail: null, warnings: [],
};

export function useSandbox() {
    const available = Boolean(window.piDesktop?.getSandboxStatus);
    const [status, setStatus] = useState(initialStatus);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        const desktop = window.piDesktop;
        if (!desktop?.getSandboxStatus) return;
        let active = true;
        let receivedEvent = false;
        const unsubscribe = desktop.onSandboxStatus((next) => {
            receivedEvent = true;
            if (active) setStatus(next);
        });
        void desktop.getSandboxStatus().then((next) => {
            if (active && !receivedEvent) setStatus(next);
        }).catch((failure) => { if (active) setError(String(failure)); });
        return () => { active = false; unsubscribe(); };
    }, []);

    const perform = useCallback(async (action: () => Promise<SandboxActionResult>) => {
        setBusy(true);
        setError(null);
        try {
            const result = await action();
            setStatus(result.status);
            if (!result.ok && !result.cancelled) setError(result.message || result.status.detail || "沙盒操作失败");
            return result.ok;
        } catch (failure) {
            setError(failure instanceof Error ? failure.message : "沙盒操作失败");
            return false;
        } finally { setBusy(false); }
    }, []);

    const setEnabled = useCallback((enabled: boolean) => {
        const desktop = window.piDesktop;
        if (!desktop) return Promise.resolve(false);
        return perform(() => desktop.setSandboxEnabled(enabled));
    }, [perform]);
    const install = useCallback(() => {
        const desktop = window.piDesktop;
        if (!desktop) return Promise.resolve(false);
        return perform(() => desktop.installSandbox());
    }, [perform]);
    return { available, status, busy, error, setEnabled, install };
}

export type SandboxController = ReturnType<typeof useSandbox>;
