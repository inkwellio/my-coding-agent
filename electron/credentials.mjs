/**
 * Thin main-process wrap over Pi AuthStorage.
 *
 * API keys are written with AuthStorage.modify(providerId, fn) into
 * ~/.pi/agent/auth.json (or PI_CODING_AGENT_DIR). The stored value is
 * `{ "type": "api_key", "key": "..." }` under that provider id. The renderer
 * only ever receives a mask, a source, and a status.
 *
 * Provider ids come from pi-ai via ModelRuntime.getProviders(). Model ids come
 * from ModelRegistry.getAll() (the same pi-ai catalog). Auth flow flags come
 * from each provider's auth.apiKey / auth.oauth login, not a hardcoded subset.
 *
 * DeepSeek is provider id `deepseek`. After that key is saved, the desktop
 * host resolves the flash model from ModelRegistry and calls RPC set_model
 * with that pair. The installed catalog resolves to `deepseek/deepseek-flash`.
 */

import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DEEPSEEK_FLASH_LABEL, DEEPSEEK_PROVIDER_ID, isDeepSeekFlash, resolveDeepSeekFlash } from "./deepseek-flash.mjs";

export { DEEPSEEK_PROVIDER_ID, resolveDeepSeekFlash };

const emptySummary = {
  configured: false,
  source: null,
  mask: null,
  providerId: null,
};

let runtimePromise;
let authStoragePromise;
let findEnvKeysFn;
let readStoredCredentialFn;
let settingsManagerFn;
let ModelRegistryCtor;
let openExternal = async () => {};
let emitOAuth = () => {};
const flowCache = new Map();
const oauthJobs = new Map();

function packageRoot() {
  const indexPath = fileURLToPath(import.meta.resolve("@earendil-works/pi-coding-agent"));
  return join(dirname(indexPath), "..");
}

async function piAiEnv() {
  if (!findEnvKeysFn) {
    const piAiIndex = fileURLToPath(import.meta.resolve("@earendil-works/pi-ai"));
    const href = pathToFileURL(join(dirname(piAiIndex), "env-api-keys.js")).href;
    const mod = await import(href);
    findEnvKeysFn = mod.findEnvKeys;
  }
  return findEnvKeysFn;
}

async function readStored() {
  if (!readStoredCredentialFn) {
    const coding = await import("@earendil-works/pi-coding-agent");
    readStoredCredentialFn = coding.readStoredCredential;
  }
  return readStoredCredentialFn;
}

async function settingsManager() {
  if (!settingsManagerFn) {
    const coding = await import("@earendil-works/pi-coding-agent");
    settingsManagerFn = coding.SettingsManager;
  }
  return settingsManagerFn;
}

export function setBrowserOpener(fn) {
  openExternal = typeof fn === "function" ? fn : async () => {};
}

export function setOAuthEmitter(fn) {
  emitOAuth = typeof fn === "function" ? fn : () => {};
}

async function getRuntime() {
  runtimePromise ??= (async () => {
    const { ModelRuntime } = await import("@earendil-works/pi-coding-agent");
    return ModelRuntime.create({ refreshOnCreate: false, allowModelNetwork: false });
  })();
  return runtimePromise;
}

/**
 * AuthStorage is not on the package public export (only readStoredCredential is).
 * modify(provider, fn) matches upstream: fn(current) returns the next credential,
 * and the file becomes `{ [provider]: credential }`.
 */
async function authStorage() {
  authStoragePromise ??= (async () => {
    const href = pathToFileURL(join(packageRoot(), "dist/core/auth-storage.js")).href;
    const mod = await import(href);
    return mod.AuthStorage.create();
  })();
  return authStoragePromise;
}

async function modelRegistry() {
  if (!ModelRegistryCtor) {
    const coding = await import("@earendil-works/pi-coding-agent");
    ModelRegistryCtor = coding.ModelRegistry;
  }
  const runtime = await getRuntime();
  return new ModelRegistryCtor(runtime);
}

function maskSecret(value) {
  if (typeof value !== "string") return "••••";
  const trimmed = value.trim();
  if (trimmed.length < 8) return "••••";
  return `••••${trimmed.slice(-4)}`;
}

function scrub(text, secret) {
  let out = String(text ?? "");
  if (secret && secret.length >= 4) out = out.split(secret).join("••••");
  out = out.replace(/sk-[A-Za-z0-9_-]{6,}/g, "sk-…");
  return out.slice(0, 400);
}

function safeLabel(source) {
  if (typeof source !== "string" || source.trim() === "") return null;
  const label = source.trim();
  if (label.length > 80 || /sk-|bearer\s+[A-Za-z0-9]|api[_-]?key\s*[:=]/i.test(label)) return "••••";
  return label;
}

function knownEnvVarNames(findEnvKeys, providerId) {
  const env = new Proxy({}, { get: () => "1" });
  const names = findEnvKeys(providerId, env);
  return Array.isArray(names) ? names.filter((name) => typeof name === "string") : [];
}

function presentEnvVarNames(findEnvKeys, providerId) {
  const names = findEnvKeys(providerId);
  return Array.isArray(names) ? names.filter((name) => typeof name === "string") : [];
}

async function classify(provider) {
  const cached = flowCache.get(provider.id);
  if (cached) return cached;
  const oauth = typeof provider.auth?.oauth?.login === "function";
  const login = provider.auth?.apiKey?.login;
  let flow = "ambient";
  if (typeof login !== "function") {
    flow = oauth ? "oauth" : "ambient";
  } else {
    const prompts = [];
    const controller = new AbortController();
    let single = false;
    try {
      const credential = await login({
        signal: controller.signal,
        notify() {},
        prompt: async (prompt) => {
          prompts.push(prompt?.type);
          if (prompts.length > 1 || prompt?.type !== "secret") {
            controller.abort();
            throw new Error("probe");
          }
          return "probe-discard";
        },
      });
      single = prompts.length === 1
        && prompts[0] === "secret"
        && credential?.type === "api_key"
        && credential.key === "probe-discard";
    } catch {
      single = false;
    }
    if (!single) flow = "multi-step";
    else flow = oauth ? "both" : "api_key";
  }
  flowCache.set(provider.id, flow);
  return flow;
}

function modelsOf(models) {
  const seen = new Set();
  const rows = [];
  for (const model of models ?? []) {
    if (!model || typeof model.id !== "string" || seen.has(model.id)) continue;
    seen.add(model.id);
    rows.push({
      id: model.id,
      name: typeof model.name === "string" && model.name ? model.name : model.id,
    });
  }
  return rows;
}

function sealProvider(provider, flow, envVarNames, models) {
  const flash = provider.id === DEEPSEEK_PROVIDER_ID ? resolveDeepSeekFlash(models) : null;
  return {
    id: provider.id,
    name: typeof provider.name === "string" && provider.name ? provider.name : provider.id,
    authFlow: flow,
    apiKey: flow === "api_key" || flow === "both",
    oauth: flow === "oauth" || flow === "both",
    oauthOnly: flow === "oauth",
    multiStep: flow === "multi-step",
    envVarNames,
    models,
    flashModelId: flash?.modelId ?? null,
  };
}

function sealStatus(row) {
  return {
    providerId: row.providerId,
    mask: row.mask ?? null,
    source: row.source ?? null,
    status: row.status,
    configured: Boolean(row.configured),
    ...(row.message ? { message: row.message } : {}),
  };
}

async function statusForProvider(runtime, findEnvKeys, provider, storedType) {
  const providerId = provider.id;
  let check;
  try {
    check = await runtime.checkAuth(providerId);
  } catch {
    check = undefined;
  }
  const envNames = presentEnvVarNames(findEnvKeys, providerId);
  if (storedType === "oauth" || check?.type === "oauth") {
    return sealStatus({
      providerId,
      status: "oauth",
      source: "oauth",
      mask: "oauth ••••",
      configured: true,
    });
  }
  if (storedType === "api_key" || check?.source === "stored credential") {
    const read = await readStored();
    const cred = read(providerId);
    const mask = cred?.type === "api_key" ? maskSecret(cred.key) : "••••";
    return sealStatus({
      providerId,
      status: "stored",
      source: "stored",
      mask,
      configured: true,
    });
  }
  if (check?.type === "api_key") {
    const label = safeLabel(check.source) ?? envNames[0] ?? "环境变量";
    return sealStatus({
      providerId,
      status: "environment",
      source: "environment",
      mask: label,
      configured: true,
    });
  }
  if (envNames.length > 0) {
    return sealStatus({
      providerId,
      status: "environment",
      source: "environment",
      mask: envNames[0],
      configured: true,
    });
  }
  return sealStatus({
    providerId,
    status: "unconfigured",
    source: null,
    mask: null,
    configured: false,
  });
}

export async function listProviders() {
  const [runtime, findEnvKeys, registry] = await Promise.all([getRuntime(), piAiEnv(), modelRegistry()]);
  const modelsByProvider = new Map();
  for (const model of registry.getAll()) {
    const providerId = model?.provider;
    if (typeof providerId !== "string") continue;
    const bucket = modelsByProvider.get(providerId);
    if (bucket) bucket.push(model);
    else modelsByProvider.set(providerId, [model]);
  }
  const rows = [];
  for (const provider of runtime.getProviders()) {
    const flow = await classify(provider);
    rows.push(sealProvider(
      provider,
      flow,
      knownEnvVarNames(findEnvKeys, provider.id),
      modelsOf(modelsByProvider.get(provider.id)),
    ));
  }
  return rows;
}

export async function getStatus() {
  const [runtime, findEnvKeys] = await Promise.all([getRuntime(), piAiEnv()]);
  const listed = await runtime.listCredentials();
  const stored = new Map(listed.map((entry) => [entry.providerId, entry.type]));
  const rows = [];
  for (const provider of runtime.getProviders()) {
    rows.push(await statusForProvider(runtime, findEnvKeys, provider, stored.get(provider.id)));
  }
  return rows;
}

export function summaryFrom(rows) {
  const preferred = rows.find((row) => row.status === "stored" || row.status === "oauth")
    ?? rows.find((row) => row.configured);
  if (!preferred) return { ...emptySummary };
  return {
    configured: true,
    source: preferred.status === "environment" ? "environment" : "stored",
    mask: preferred.mask,
    providerId: preferred.providerId,
  };
}

export async function summaryProbe() {
  try {
    return summaryFrom(await getStatus());
  } catch {
    return { ...emptySummary };
  }
}

function requireProviderId(providerId) {
  if (typeof providerId !== "string" || !/^[a-z0-9][a-z0-9.-]*$/i.test(providerId)) {
    throw new Error("未知服务商");
  }
  return providerId;
}

function failure(providerId, message) {
  return sealStatus({
    providerId: providerId ?? "",
    status: "error",
    source: null,
    mask: null,
    configured: false,
    message: message || "保存失败，请重试",
  });
}

export async function saveApiKey(providerId, apiKey) {
  let id = "";
  const key = typeof apiKey === "string" ? apiKey.trim() : "";
  try {
    id = requireProviderId(providerId);
  } catch (error) {
    return failure("", scrub(error instanceof Error ? error.message : error, key));
  }
  if (!key) return failure(id, "请输入 API Key");
  try {
    const runtime = await getRuntime();
    const provider = runtime.getProvider(id);
    if (!provider) return failure(id, "未知服务商");
    const flow = await classify(provider);
    if (flow !== "api_key" && flow !== "both") {
      const message = flow === "multi-step"
        ? "此服务商需要多步登录，当前页面不能保存单个密钥"
        : flow === "oauth"
          ? "此服务商只支持 OAuth 登录"
          : "此服务商不能在此页保存 API Key";
      return failure(id, message);
    }
    const storage = await authStorage();
    let wrote = false;
    try {
      await storage.modify(id, async () => {
        wrote = true;
        return { type: "api_key", key };
      });
      const check = await runtime.checkAuth(id);
      const listed = await runtime.listCredentials();
      const storedType = listed.find((entry) => entry.providerId === id)?.type;
      if (!check || storedType !== "api_key") {
        if (wrote) await storage.delete(id).catch(() => {});
        return failure(id, "校验未通过，未保留本地保存");
      }
    } catch (error) {
      if (wrote) await storage.delete(id).catch(() => {});
      return failure(id, `保存失败，请重试：${scrub(error instanceof Error ? error.message : error, key)}`);
    }
    const [findEnvKeys] = await Promise.all([piAiEnv()]);
    const listed = await runtime.listCredentials();
    const storedType = listed.find((entry) => entry.providerId === id)?.type;
    return await statusForProvider(runtime, findEnvKeys, provider, storedType);
  } catch (error) {
    return failure(id, `保存失败，请重试：${scrub(error instanceof Error ? error.message : error, key)}`);
  }
}

async function deleteCredential(providerId) {
  const id = requireProviderId(providerId);
  const runtime = await getRuntime();
  const provider = runtime.getProvider(id);
  if (!provider) return failure(id, "未知服务商");
  const job = oauthJobs.get(id);
  if (job) {
    job.abort();
    oauthJobs.delete(id);
  }
  await runtime.logout(id);
  const findEnvKeys = await piAiEnv();
  return statusForProvider(runtime, findEnvKeys, provider, undefined);
}

export async function clearCredential(providerId) {
  try {
    return await deleteCredential(providerId);
  } catch (error) {
    return failure(String(providerId ?? ""), scrub(error instanceof Error ? error.message : error));
  }
}

export async function logoutOAuth(providerId) {
  return clearCredential(providerId);
}

function emit(providerId, phase, extra = {}) {
  const event = {
    providerId,
    phase,
    ...(extra.message ? { message: scrub(extra.message) } : {}),
    ...(typeof extra.url === "string" ? { url: extra.url } : {}),
    ...(typeof extra.userCode === "string" ? { userCode: extra.userCode } : {}),
  };
  try {
    emitOAuth(event);
  } catch {
    // The window may already be gone.
  }
  return event;
}

function oauthInteraction(providerId, signal) {
  return {
    signal,
    notify(event) {
      if (!event || typeof event !== "object") return;
      if (event.type === "auth_url" && typeof event.url === "string") {
        emit(providerId, "opened", { url: event.url, message: event.instructions || "已打开登录页" });
        if (/^https?:\/\//i.test(event.url)) void openExternal(event.url).catch(() => {});
        return;
      }
      if (event.type === "device_code") {
        const url = typeof event.verificationUri === "string" ? event.verificationUri : undefined;
        const userCode = typeof event.userCode === "string" ? event.userCode : undefined;
        emit(providerId, "opened", {
          url,
          userCode,
          message: userCode ? `在浏览器输入设备码 ${userCode}` : "已打开设备码登录页",
        });
        if (url && /^https?:\/\//i.test(url)) void openExternal(url).catch(() => {});
        emit(providerId, "waiting", { message: userCode ? `等待授权 · ${userCode}` : "等待授权" });
        return;
      }
      if (event.type === "progress" || event.type === "info") {
        emit(providerId, "waiting", { message: typeof event.message === "string" ? event.message : "等待授权" });
      }
    },
    prompt(prompt) {
      const message = typeof prompt?.message === "string" ? prompt.message : "";
      if (prompt?.type === "text" && /blank/i.test(message)) return "";
      const promptSignal = prompt?.signal;
      if (promptSignal && typeof promptSignal.addEventListener === "function") {
        emit(providerId, "waiting", { message: message || "在浏览器完成登录" });
        return new Promise((resolve, reject) => {
          const fail = () => reject(new Error("OAuth 登录已取消"));
          if (promptSignal.aborted) {
            fail();
            return;
          }
          promptSignal.addEventListener("abort", fail, { once: true });
        });
      }
      throw new Error("此 OAuth 步骤需要额外输入，当前页面只支持浏览器回调或设备码");
    },
  };
}

export async function startOAuth(providerId) {
  let id = "";
  try {
    id = requireProviderId(providerId);
    const runtime = await getRuntime();
    const provider = runtime.getProvider(id);
    if (!provider) return failure(id, "未知服务商");
    const flow = await classify(provider);
    if (flow !== "oauth" && flow !== "both") {
      return failure(id, "此服务商不支持 OAuth");
    }
    const previous = oauthJobs.get(id);
    if (previous) previous.abort();
    const controller = new AbortController();
    oauthJobs.set(id, controller);
    emit(id, "waiting", { message: "正在发起 OAuth 登录" });
    try {
      await runtime.login(id, "oauth", oauthInteraction(id, controller.signal));
      if (controller.signal.aborted) return failure(id, "OAuth 登录已取消");
      const check = await runtime.checkAuth(id);
      if (!check) return failure(id, "OAuth 登录未完成");
      const row = await statusForProvider(runtime, await piAiEnv(), provider, "oauth");
      emit(id, "success", { message: "OAuth 已登录" });
      return row;
    } catch (error) {
      if (controller.signal.aborted) {
        emit(id, "error", { message: "OAuth 登录已取消" });
        return failure(id, "OAuth 登录已取消");
      }
      const message = scrub(error instanceof Error ? error.message : error);
      emit(id, "error", { message });
      return failure(id, message || "OAuth 登录失败");
    } finally {
      if (oauthJobs.get(id) === controller) oauthJobs.delete(id);
    }
  } catch (error) {
    const message = scrub(error instanceof Error ? error.message : error);
    if (id) emit(id, "error", { message });
    return failure(id, message);
  }
}

export async function detectEnv(providerId) {
  const findEnvKeys = await piAiEnv();
  const runtime = await getRuntime();
  const ids = typeof providerId === "string" && providerId
    ? [requireProviderId(providerId)]
    : runtime.getProviders().map((provider) => provider.id);
  return ids.map((id) => ({
    providerId: id,
    envVars: presentEnvVarNames(findEnvKeys, id),
  }));
}

export function displayModelName(providerId, modelId, name) {
  if (isDeepSeekFlash(providerId, modelId, name)) return DEEPSEEK_FLASH_LABEL;
  return name || modelId;
}

/** DeepSeek saves select the flash model resolved from ModelRegistry. */
export async function resolveDeepSeekFlashModel() {
  const registry = await modelRegistry();
  const models = registry.getAll().filter((model) => model?.provider === DEEPSEEK_PROVIDER_ID);
  return resolveDeepSeekFlash(models);
}

export async function modelAfterApiKeySave(providerId) {
  if (providerId !== DEEPSEEK_PROVIDER_ID) return null;
  return resolveDeepSeekFlashModel();
}

export async function rememberSelectedModel(providerId, modelId) {
  const id = requireProviderId(providerId);
  if (typeof modelId !== "string" || !/^[A-Za-z0-9_.:/-]+$/.test(modelId)) {
    return { ok: false, message: "未知模型" };
  }
  const SettingsManager = await settingsManager();
  const settings = SettingsManager.create(process.cwd());
  settings.setDefaultModelAndProvider(id, modelId);
  await settings.flush();
  const registry = await modelRegistry();
  const model = registry.find(id, modelId);
  return {
    ok: true,
    providerId: id,
    modelId,
    name: displayModelName(id, modelId, model?.name || modelId),
    inRegistry: Boolean(model),
  };
}

/**
 * Persist the post-save model, then ask the live RPC session to set_model.
 * `session.setModel` is RpcClient.setModel(provider, modelId) → `{ type: "set_model", provider, modelId }`.
 */
export async function afterApiKeySaved(providerId, session) {
  const target = await modelAfterApiKeySave(providerId);
  if (!target) return null;
  const saved = await rememberSelectedModel(target.providerId, target.modelId);
  if (!saved.ok) return { ok: false, message: saved.message, live: null };
  let live = { ok: false, code: "disconnected", message: "引擎未连接" };
  if (session && typeof session.setModel === "function") {
    try {
      const result = await session.setModel(saved.providerId, saved.modelId);
      live = result && typeof result === "object" ? result : { ok: true };
      if (typeof live.message === "string") live = { ...live, message: scrub(live.message) };
    } catch (error) {
      live = { ok: false, message: scrub(error instanceof Error ? error.message : error) };
    }
  }
  return {
    ok: true,
    providerId: saved.providerId,
    modelId: saved.modelId,
    name: saved.name,
    inRegistry: saved.inRegistry,
    live,
  };
}

export async function getSelectedModel() {
  const SettingsManager = await settingsManager();
  const settings = SettingsManager.create(process.cwd());
  const providerId = settings.getDefaultProvider() ?? null;
  const modelId = settings.getDefaultModel() ?? null;
  if (!providerId || !modelId) return { providerId: null, modelId: null, name: null };
  const registry = await modelRegistry();
  const model = registry.find(providerId, modelId);
  const name = displayModelName(providerId, modelId, model?.name || modelId);
  return { providerId, modelId, name };
}

export const THINKING_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh", "max"];
const DEFAULT_THINKING_LEVEL = "medium";

/** Mirrors pi-ai getSupportedThinkingLevels, which the package does not export. */
export function supportedThinkingLevels(model) {
  if (!model?.reasoning) return ["off"];
  return THINKING_LEVELS.filter((level) => {
    const mapped = model.thinkingLevelMap?.[level];
    if (mapped === null) return false;
    if (level === "xhigh" || level === "max") return mapped !== undefined;
    return true;
  });
}

function clampThinkingLevel(levels, level) {
  if (levels.includes(level)) return level;
  const index = THINKING_LEVELS.indexOf(level);
  if (index === -1) return levels[0] ?? "off";
  for (let i = index; i < THINKING_LEVELS.length; i++) {
    if (levels.includes(THINKING_LEVELS[i])) return THINKING_LEVELS[i];
  }
  for (let i = index - 1; i >= 0; i--) {
    if (levels.includes(THINKING_LEVELS[i])) return THINKING_LEVELS[i];
  }
  return levels[0] ?? "off";
}

/** Context window and thinking levels of the selected model, from ModelRegistry and pi settings. */
export async function getModelSettings() {
  const SettingsManager = await settingsManager();
  const settings = SettingsManager.create(process.cwd());
  const providerId = settings.getDefaultProvider() ?? null;
  const modelId = settings.getDefaultModel() ?? null;
  if (!providerId || !modelId) {
    return { providerId: null, modelId: null, contextWindow: null, maxTokens: null, levels: ["off"], thinkingLevel: "off", live: false };
  }
  const registry = await modelRegistry();
  const model = registry.find(providerId, modelId);
  const levels = supportedThinkingLevels(model);
  const preferred = settings.getModelThinkingLevel(providerId, modelId)
    ?? settings.getDefaultThinkingLevel()
    ?? DEFAULT_THINKING_LEVEL;
  return {
    providerId,
    modelId,
    contextWindow: typeof model?.contextWindow === "number" ? model.contextWindow : null,
    maxTokens: typeof model?.maxTokens === "number" ? model.maxTokens : null,
    levels,
    thinkingLevel: clampThinkingLevel(levels, preferred),
    live: false,
  };
}

export async function saveThinkingLevel(level) {
  if (!THINKING_LEVELS.includes(level)) return { ok: false, message: "未知的思考档位" };
  const SettingsManager = await settingsManager();
  const settings = SettingsManager.create(process.cwd());
  const providerId = settings.getDefaultProvider();
  const modelId = settings.getDefaultModel();
  if (providerId && modelId) settings.setModelThinkingLevel(providerId, modelId, level);
  settings.setDefaultThinkingLevel(level);
  await settings.flush();
  return { ok: true };
}

export async function setSelectedModel(providerId, modelId) {
  const id = requireProviderId(providerId);
  if (typeof modelId !== "string" || !/^[A-Za-z0-9_.:/-]+$/.test(modelId)) {
    return { ok: false, message: "未知模型" };
  }
  const registry = await modelRegistry();
  const model = registry.find(id, modelId);
  if (!model) return { ok: false, message: "未知模型" };
  const SettingsManager = await settingsManager();
  const settings = SettingsManager.create(process.cwd());
  settings.setDefaultModelAndProvider(id, model.id);
  await settings.flush();
  return {
    ok: true,
    providerId: id,
    modelId: model.id,
    name: displayModelName(id, model.id, model.name),
  };
}
