import type { EngineState } from "../status";

/** Credential probe returned by the main process. Never includes a raw key. */
export interface CredentialProbe {
  configured: boolean;
  source: "stored" | "environment" | null;
  mask: string | null;
  providerId: string | null;
}

/** Per-window RPC snapshot. `webContentsId` scopes the status to one Electron window. */
export interface EngineSnapshot {
  webContentsId: number | null;
  engine: EngineState;
  pid: number | null;
  cwd: string;
  modelLabel: string | null;
  detail: string | null;
  credentials: CredentialProbe;
  credentialsHref: "#/credentials";
}

export interface RpcStatus extends EngineSnapshot {
  available: boolean;
}

export interface PromptResult {
  ok: boolean;
  code?: "credentials" | "disconnected" | "error" | "empty";
  href?: "#/credentials";
  message?: string;
}

export interface SessionSummary {
  id: string;
  title: string;
  modified: string;
  messageCount: number;
}

export interface WorkspaceState {
  paths: string[];
  activeCwd: string;
}

export interface WorkspaceActionResult {
  ok: boolean;
  state: WorkspaceState;
  cancelled?: boolean;
  message?: string;
}

export type HistoryMessage =
  | { role: "user"; text: string }
  | { role: "assistant"; content: Array<{ type: "text"; text: string } | { type: "toolCall"; id: string; name: string; args: string }> }
  | { role: "toolResult"; toolCallId: string; text: string; isError: boolean };

export type SessionView =
  | { ok: true; sessionId: string | null; messages: HistoryMessage[] }
  | { ok: false; message: string };

/** Subset of pi RPC stdout events forwarded to the renderer. */
export interface RpcWireEvent {
  type: string;
  role?: string | null;
  /** Present only for `text_delta`. Blocks are joined in this order. */
  contentIndex?: number;
  deltaKind?: string | null;
  delta?: string;
  toolName?: string | null;
  toolCallId?: string | null;
  argsPreview?: string;
  outputPreview?: string;
  isError?: boolean;
  willRetry?: boolean;
  errorMessage?: string;
}

export type TranscriptBlock =
  | { id: string; kind: "user"; text: string }
  | {
      id: string;
      kind: "assistant";
      text: string;
      /** `text_delta` chunks keyed by `contentIndex`. `text` is the joined display string. */
      parts: Record<number, string>;
      pending: boolean;
    }
  | {
      id: string;
      kind: "tool";
      toolCallId: string;
      name: string;
      args: string;
      output: string;
      pending: boolean;
      isError: boolean;
    };

export const EMPTY_CREDENTIALS: CredentialProbe = {
  configured: false,
  source: null,
  mask: null,
  providerId: null,
};
