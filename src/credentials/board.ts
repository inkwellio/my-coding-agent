import { useEffect, useSyncExternalStore } from "react";
import type { CredentialBroadcast, EnvHit, OAuthEvent, ProviderInfo, ProviderStatus, SelectedModel, SetModelResult } from "./types";

export interface CredentialBoard {
  available: boolean;
  loaded: boolean;
  loadError: string | null;
  providers: ProviderInfo[];
  statuses: Record<string, ProviderStatus>;
  selected: SelectedModel;
  oauth: Record<string, OAuthEvent>;
  modelNote: string | null;
}

const emptySelected: SelectedModel = { providerId: null, modelId: null, name: null };

let board: CredentialBoard = {
  available: false,
  loaded: false,
  loadError: null,
  providers: [],
  statuses: {},
  selected: emptySelected,
  oauth: {},
  modelNote: null,
};

const listeners = new Set<() => void>();
let loadPromise: Promise<void> | null = null;
let listening = false;

function emit() {
  for (const listener of listeners) listener();
}

function update(patch: Partial<CredentialBoard>) {
  board = { ...board, ...patch };
  emit();
}

function indexStatuses(rows: ProviderStatus[]) {
  const statuses: Record<string, ProviderStatus> = {};
  for (const row of rows) statuses[row.providerId] = row;
  return statuses;
}

function subscribeDesktop() {
  if (listening) return;
  const desktop = window.piDesktop;
  if (!desktop?.onCredentialStatus || !desktop.onOAuthEvent || !desktop.onSelectedModel) return;
  listening = true;
  desktop.onCredentialStatus((payload: CredentialBroadcast) => {
    update({ statuses: indexStatuses(payload.providers) });
  });
  desktop.onOAuthEvent((event: OAuthEvent) => {
    update({ oauth: { ...board.oauth, [event.providerId]: event } });
  });
  desktop.onSelectedModel((model: SetModelResult) => {
    update({
      selected: {
        providerId: model.providerId ?? null,
        modelId: model.modelId ?? null,
        name: model.name ?? null,
      },
      modelNote: model.live && model.live.ok === false ? model.live.message ?? "运行中的会话还没切到这个模型" : null,
    });
  });
}

export function subscribeCredentialBoard(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCredentialBoard() {
  return board;
}

export function ensureCredentialBoard() {
  if (board.loaded) return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const desktop = window.piDesktop;
    if (!desktop?.listProviders || !desktop.getCredentialStatus || !desktop.getSelectedModel) {
      update({ available: false, loaded: true, loadError: null });
      return;
    }
    subscribeDesktop();
    try {
      const [providers, statuses, selected] = await Promise.all([
        desktop.listProviders(),
        desktop.getCredentialStatus(),
        desktop.getSelectedModel(),
      ]);
      update({
        available: true,
        loaded: true,
        loadError: null,
        providers,
        statuses: indexStatuses(statuses),
        selected,
      });
    } catch (error) {
      update({
        available: true,
        loaded: true,
        loadError: error instanceof Error ? error.message : "读取凭据失败",
      });
    }
  })().finally(() => {
    loadPromise = null;
  });
  return loadPromise;
}

export function useCredentialBoard() {
  const snapshot = useSyncExternalStore(subscribeCredentialBoard, getCredentialBoard, getCredentialBoard);
  useEffect(() => {
    void ensureCredentialBoard();
  }, []);
  return snapshot;
}

export async function saveProviderKey(providerId: string, apiKey: string) {
  const desktop = window.piDesktop;
  if (!desktop?.saveApiKey) throw new Error("凭据只在 Electron 窗口里保存");
  const result = await desktop.saveApiKey(providerId, apiKey);
  if (result.status !== "error") {
    update({ statuses: { ...board.statuses, [providerId]: result } });
  }
  return result;
}

export async function clearProviderKey(providerId: string) {
  const desktop = window.piDesktop;
  if (!desktop?.clearCredential) throw new Error("凭据只在 Electron 窗口里清除");
  const result = await desktop.clearCredential(providerId);
  const oauth = { ...board.oauth };
  delete oauth[providerId];
  update({ statuses: { ...board.statuses, [providerId]: result }, oauth });
  return result;
}

export async function beginOAuth(providerId: string) {
  const desktop = window.piDesktop;
  if (!desktop?.startOAuth) throw new Error("OAuth 只在 Electron 窗口里发起");
  const result = await desktop.startOAuth(providerId);
  if (result.status !== "error") {
    update({ statuses: { ...board.statuses, [providerId]: result } });
  }
  return result;
}

export async function endOAuth(providerId: string) {
  const desktop = window.piDesktop;
  if (!desktop?.logoutOAuth) throw new Error("OAuth 只在 Electron 窗口里退出");
  const result = await desktop.logoutOAuth(providerId);
  update({ statuses: { ...board.statuses, [providerId]: result } });
  const oauth = { ...board.oauth };
  delete oauth[providerId];
  update({ oauth });
  return result;
}

export async function refreshEnv(providerId?: string): Promise<EnvHit[]> {
  const desktop = window.piDesktop;
  if (!desktop?.detectEnv) throw new Error("环境变量检测只在 Electron 窗口里运行");
  return desktop.detectEnv(providerId);
}

export async function chooseModel(providerId: string, modelId: string): Promise<SetModelResult> {
  const desktop = window.piDesktop;
  if (!desktop?.setSelectedModel) throw new Error("模型选择只在 Electron 窗口里保存");
  const result = await desktop.setSelectedModel(providerId, modelId);
  if (result.ok && result.providerId && result.modelId) {
    update({
      selected: { providerId: result.providerId, modelId: result.modelId, name: result.name ?? null },
      modelNote: result.live && result.live.ok === false ? result.live.message ?? "已写入设置，运行中的会话尚未切换" : null,
    });
  }
  return result;
}

export function modelChoiceLabel(providerId: string, modelId: string, name: string, flashModelId?: string | null) {
  if (providerId === "deepseek" && flashModelId && modelId === flashModelId) return "DeepSeek V4 Flash";
  if (providerId === "deepseek" && (modelId === "deepseek-flash" || name.includes("Flash"))) return "DeepSeek V4 Flash";
  return name || modelId;
}
