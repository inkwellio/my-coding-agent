import type { SandboxState } from "../status";

export interface SandboxSnapshot {
    capability: "unsupported" | "available" | "enabled";
    state: SandboxState;
    requested: boolean;
    ready: boolean;
    installRequired: boolean;
    cwd?: string;
    detail: string | null;
    warnings: string[];
}

export interface SandboxActionResult {
    ok: boolean;
    status: SandboxSnapshot;
    cancelled?: boolean;
    message?: string;
}
