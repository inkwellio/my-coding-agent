/**
 * Pick the native DeepSeek flash model from a ModelRegistry list.
 * Prefer id `deepseek-flash`. Otherwise the first deepseek model whose name
 * contains "Flash". Relay catalogs (OpenRouter and similar) use other ids
 * such as `deepseek-v4-flash`; those are not the native provider pair.
 */
export const DEEPSEEK_PROVIDER_ID = "deepseek";
export const DEEPSEEK_FLASH_LABEL = "DeepSeek V4 Flash";

export function resolveDeepSeekFlash(models) {
  const list = (Array.isArray(models) ? models : []).filter((model) => {
    if (!model || typeof model.id !== "string") return false;
    return model.provider == null || model.provider === DEEPSEEK_PROVIDER_ID;
  });
  const exact = list.find((model) => model.id === "deepseek-flash");
  const match = exact ?? list.find((model) => typeof model.name === "string" && model.name.includes("Flash"));
  if (!match) return null;
  return { providerId: DEEPSEEK_PROVIDER_ID, modelId: match.id };
}

export function isDeepSeekFlash(providerId, modelId, name) {
  if (providerId !== DEEPSEEK_PROVIDER_ID) return false;
  if (modelId === "deepseek-flash") return true;
  return typeof name === "string" && name.includes("Flash");
}
