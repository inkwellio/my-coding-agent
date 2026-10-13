/**
 * AuthStorage credential wrap: provider registry, masked save, DeepSeek Flash.
 * Uses PI_CODING_AGENT_DIR so it does not touch the real ~/.pi/agent store.
 */
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "pi-credentials-"));
process.env.PI_CODING_AGENT_DIR = dir;
const secret = "sk-test-deepseek-flash-demo-key-99zz";
const envSecret = "sk-env-deepseek-should-not-leak-77aa";

const credentials = await import("../electron/credentials.mjs");

try {
  const providers = await credentials.listProviders();
  assert.ok(providers.length > 6, "provider list should be the pi-ai registry, not a six-card mock");
  const deepseek = providers.find((provider) => provider.id === "deepseek");
  assert.ok(deepseek, "deepseek missing from pi-ai registry");
  assert.equal(deepseek.id, "deepseek");
  assert.equal(providers.some((provider) => provider.id === "deepseek-chat"), false);
  assert.equal(deepseek.apiKey, true);
  assert.equal(deepseek.oauth, false);
  assert.equal(deepseek.multiStep, false);
  assert.ok(deepseek.models.length > 0, "deepseek models should come from ModelRegistry");
  assert.equal(credentials.DEEPSEEK_PROVIDER_ID, "deepseek");
  assert.equal(deepseek.flashModelId, "deepseek-flash");
  const resolved = await credentials.resolveDeepSeekFlashModel();
  assert.deepEqual(resolved, { providerId: "deepseek", modelId: "deepseek-flash" });
  assert.deepEqual(await credentials.modelAfterApiKeySave("deepseek"), resolved);
  assert.equal(await credentials.modelAfterApiKeySave("anthropic"), null);
  assert.deepEqual(credentials.resolveDeepSeekFlash([
    { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash", provider: "deepseek" },
    { id: "deepseek-flash", name: "DeepSeek V4.1 Flash", provider: "deepseek" },
  ]), { providerId: "deepseek", modelId: "deepseek-flash" });
  assert.deepEqual(credentials.resolveDeepSeekFlash([
    { id: "custom-flash", name: "Example Flash", provider: "deepseek" },
  ]), { providerId: "deepseek", modelId: "custom-flash" });
  assert.equal(credentials.displayModelName("deepseek", "deepseek-flash", "DeepSeek V4.1 Flash"), "DeepSeek V4 Flash");

  const codex = providers.find((provider) => provider.id === "openai-codex");
  assert.equal(codex?.oauthOnly, true);
  assert.equal(codex?.apiKey, false);

  for (const id of ["amazon-bedrock", "google-vertex"]) {
    const provider = providers.find((entry) => entry.id === id);
    assert.equal(provider?.authFlow, "multi-step", id);
    assert.equal(provider?.multiStep, true, id);
  }

  for (const id of ["anthropic", "github-copilot", "openrouter", "xai", "kimi-coding", "radius"]) {
    const provider = providers.find((entry) => entry.id === id);
    assert.equal(provider?.oauth, true, id);
  }

  const saved = await credentials.saveApiKey("deepseek", secret);
  assert.equal(saved.status, "stored");
  assert.equal(saved.source, "stored");
  assert.equal(saved.mask, "••••99zz");
  assert.equal(saved.configured, true);
  const savedJson = JSON.stringify(saved);
  assert.equal(savedJson.includes(secret), false);
  assert.equal(savedJson.includes("99zz"), true);

  const authFile = readFileSync(join(dir, "auth.json"), "utf8");
  const auth = JSON.parse(authFile);
  assert.deepEqual(auth.deepseek, { type: "api_key", key: secret });
  assert.equal(authFile.includes(secret), true);

  const other = providers.find((provider) => provider.apiKey && provider.id !== "deepseek");
  assert.ok(other, "expected another single-secret provider from the registry");
  const otherSecret = "sk-other-vendor-demo-key-11aa";
  const savedOther = await credentials.saveApiKey(other.id, otherSecret);
  assert.equal(savedOther.status, "stored");
  assert.equal(JSON.stringify(savedOther).includes(otherSecret), false);
  const both = JSON.parse(readFileSync(join(dir, "auth.json"), "utf8"));
  assert.deepEqual(both[other.id], { type: "api_key", key: otherSecret });
  assert.deepEqual(both.deepseek, { type: "api_key", key: secret });
  const clearedOther = await credentials.clearCredential(other.id);
  assert.equal(clearedOther.status === "unconfigured" || clearedOther.status === "environment", true);
  assert.equal(readFileSync(join(dir, "auth.json"), "utf8").includes(otherSecret), false);

  const calls = [];
  const applied = await credentials.afterApiKeySaved("deepseek", {
    async setModel(provider, modelId) {
      calls.push({ type: "set_model", provider, modelId });
      return { ok: true, provider, id: modelId, label: `${provider}/${modelId}` };
    },
  });
  assert.deepEqual(calls, [{ type: "set_model", provider: "deepseek", modelId: "deepseek-flash" }]);
  assert.equal(applied.ok, true);
  assert.equal(applied.name, "DeepSeek V4 Flash");
  assert.equal(applied.providerId, "deepseek");
  assert.equal(applied.modelId, "deepseek-flash");
  assert.equal(JSON.stringify(applied).includes(secret), false);
  const settingsFile = readFileSync(join(dir, "settings.json"), "utf8");
  assert.equal(settingsFile.includes("deepseek-flash"), true);
  assert.equal(settingsFile.includes("deepseek-v4-flash"), false);
  assert.equal(settingsFile.includes(secret), false);
  const current = await credentials.getSelectedModel();
  assert.equal(current.modelId, "deepseek-flash");
  assert.equal(current.providerId, "deepseek");
  assert.equal(current.name, "DeepSeek V4 Flash");

  const summary = credentials.summaryFrom(await credentials.getStatus());
  assert.equal(summary.configured, true);
  assert.equal(summary.providerId, "deepseek");
  assert.equal(summary.mask, "••••99zz");
  assert.equal(JSON.stringify(summary).includes(secret), false);

  const cleared = await credentials.clearCredential("deepseek");
  assert.equal(cleared.status, "unconfigured");
  assert.equal(readFileSync(join(dir, "auth.json"), "utf8").includes(secret), false);

  process.env.DEEPSEEK_API_KEY = envSecret;
  const detected = await credentials.detectEnv("deepseek");
  assert.deepEqual(detected, [{ providerId: "deepseek", envVars: ["DEEPSEEK_API_KEY"] }]);
  assert.equal(JSON.stringify(detected).includes(envSecret), false);
  const afterEnv = (await credentials.getStatus()).find((row) => row.providerId === "deepseek");
  assert.equal(afterEnv?.status, "environment");
  assert.equal(afterEnv?.source, "environment");
  assert.equal(afterEnv?.mask, "DEEPSEEK_API_KEY");
  assert.equal(JSON.stringify(afterEnv).includes(envSecret), false);

  const blocked = await credentials.saveApiKey("openai-codex", secret);
  assert.equal(blocked.status, "error");
  assert.equal(JSON.stringify(blocked).includes(secret), false);

  console.log("credentials smoke ok");
} finally {
  delete process.env.DEEPSEEK_API_KEY;
  rmSync(dir, { recursive: true, force: true });
}
