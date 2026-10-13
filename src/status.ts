import { readLocationQuery } from "./router";

export const ENGINE_STATES = ["idle", "chatting", "reconnecting", "disconnected"] as const;

export type EngineState = (typeof ENGINE_STATES)[number];

export const SANDBOX_STATES = ["off", "enabling", "on"] as const;

export type SandboxState = (typeof SANDBOX_STATES)[number];

export interface StatusBarState {
  engine: EngineState;
  sandbox: SandboxState;
}

export function isEngineState(value: string | null): value is EngineState {
  return ENGINE_STATES.some((state) => state === value);
}

export function isSandboxState(value: string | null): value is SandboxState {
  return SANDBOX_STATES.some((state) => state === value);
}

export function readStatusFromLocation(params = readLocationQuery()): StatusBarState {
  const engine = params.get("engine");
  const sandbox = params.get("sandbox");
  return {
    engine: isEngineState(engine) ? engine : "idle",
    sandbox: isSandboxState(sandbox) ? sandbox : "off",
  };
}

export function readDirtyWorktree(params = readLocationQuery()): boolean {
  return params.get("dirty") !== "0";
}

export function readPolicyNoteOpen(params = readLocationQuery()): boolean {
  return params.get("policy") === "1";
}

export function nextEngineState(current: EngineState): EngineState {
  const index = ENGINE_STATES.indexOf(current);
  return ENGINE_STATES[(index + 1) % ENGINE_STATES.length];
}

export function nextSandboxState(current: SandboxState): SandboxState {
  const index = SANDBOX_STATES.indexOf(current);
  return SANDBOX_STATES[(index + 1) % SANDBOX_STATES.length];
}

export function engineChipLabel(engine: EngineState): string {
  if (engine === "idle") return "引擎 · RPC 空闲 · 已连接";
  if (engine === "chatting") return "引擎 · RPC 对话中";
  if (engine === "reconnecting") return "引擎 · RPC 重连中";
  return "引擎 · RPC 已断开";
}
