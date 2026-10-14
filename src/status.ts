export const ENGINE_STATES = ["idle", "chatting", "reconnecting", "disconnected"] as const;

export type EngineState = (typeof ENGINE_STATES)[number];

export const SANDBOX_STATES = ["off", "enabling", "on"] as const;

export type SandboxState = (typeof SANDBOX_STATES)[number];

export function engineChipLabel(engine: EngineState): string {
    if (engine === "idle") return "引擎 · RPC 空闲 · 已连接";
    if (engine === "chatting") return "引擎 · RPC 对话中";
    if (engine === "reconnecting") return "引擎 · RPC 重连中";
    return "引擎 · RPC 已断开";
}
