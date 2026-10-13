import type { CredentialProbe } from "../rpc/types";

export type AuthFlow = "api_key" | "oauth" | "both" | "multi-step" | "ambient";

export interface ProviderModel {
    id: string;
    name: string;
}

/** Capability flags from the pi-ai provider registry. No secrets. */
export interface ProviderInfo {
    id: string;
    name: string;
    authFlow: AuthFlow;
    apiKey: boolean;
    oauth: boolean;
    oauthOnly: boolean;
    multiStep: boolean;
    envVarNames: string[];
    models: ProviderModel[];
    /** Native flash id from ModelRegistry, or null when this provider has none. */
    flashModelId: string | null;
}

export type CredentialUiStatus = "unconfigured" | "stored" | "environment" | "oauth" | "error";

/** Mask, source, and status. Never an API key. */
export interface ProviderStatus {
    providerId: string;
    mask: string | null;
    source: "stored" | "environment" | "oauth" | null;
    status: CredentialUiStatus;
    configured: boolean;
    message?: string;
}

export interface EnvHit {
    providerId: string;
    envVars: string[];
}

export interface OAuthEvent {
    providerId: string;
    phase: "opened" | "waiting" | "success" | "error";
    message?: string;
    url?: string;
    userCode?: string;
}

export interface SelectedModel {
    providerId: string | null;
    modelId: string | null;
    name: string | null;
}

export interface SetModelResult {
    ok: boolean;
    message?: string;
    providerId?: string;
    modelId?: string;
    name?: string | null;
    live?: { ok: boolean; message?: string; label?: string } | null;
}

export type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";

/** Selected model limits from the pi model catalog. `live` means the values came from the running engine. */
export interface ModelSettings {
    providerId: string | null;
    modelId: string | null;
    contextWindow: number | null;
    maxTokens: number | null;
    levels: ThinkingLevel[];
    thinkingLevel: ThinkingLevel;
    live: boolean;
}

export type SetThinkingResult =
    | { ok: true; settings: ModelSettings }
    | { ok: false; message?: string };

export interface CredentialBroadcast {
    summary: CredentialProbe;
    providers: ProviderStatus[];
}
