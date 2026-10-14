import { useEffect, useState } from "react";
import { clearProviderKey, saveProviderKey } from "../credentials/board";
import type { ProviderInfo, ProviderStatus } from "../credentials/types";

interface CredentialCardProps {
    provider: ProviderInfo;
    status: ProviderStatus | undefined;
}

export function CredentialCard({ provider, status }: CredentialCardProps) {
    const [draft, setDraft] = useState("");
    const [editing, setEditing] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const stored = status?.status === "stored";

    useEffect(() => {
        if (stored) {
            setDraft("");
            setEditing(false);
            setError(null);
        }
    }, [stored, status?.mask]);

    async function save() {
        setBusy(true);
        setError(null);
        try {
            const result = await saveProviderKey(provider.id, draft);
            if (result.status !== "stored") {
                setError(result.message || "保存失败，请检查 API Key 后重试");
                return;
            }
            setDraft("");
            setEditing(false);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "保存失败，请重试");
        } finally {
            setBusy(false);
        }
    }

    async function clear() {
        setBusy(true);
        setError(null);
        try {
            const result = await clearProviderKey(provider.id);
            if (result.status === "error") throw new Error(result.message || "清除失败");
            setDraft("");
            setEditing(false);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "清除失败");
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className="flex flex-col justify-between rounded-lg border border-outline-variant/40 bg-surface-container-low p-space-lg" data-purpose="credential-card" data-provider={provider.id} data-credential-status={busy ? "saving" : stored ? "stored" : "unconfigured"}>
            <div>
                <div className="mb-space-md flex items-center justify-between gap-space-sm">
                    <div className="min-w-0">
                        <h2 className="truncate font-label-md text-label-md font-semibold text-on-surface">{provider.name}</h2>
                        <p className="mt-0.5 truncate font-code-sm text-code-sm text-on-surface-variant">{provider.id}</p>
                    </div>
                    <span className={`shrink-0 rounded border px-2 py-0.5 font-label-xs text-label-xs ${stored ? "border-tertiary/40 bg-tertiary/10 text-tertiary" : "border-warning/40 bg-warning/10 text-warning"}`}>
                        {stored ? "已保存" : "未保存"}
                    </span>
                </div>

                {stored && !editing ? (
                    <p className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 font-code-sm text-code-sm text-on-surface">{status.mask || "••••"}</p>
                ) : (
                    <div className="space-y-space-xs">
                        <label className="block font-label-sm text-label-sm text-on-surface-variant" htmlFor={`key-${provider.id}`}>API Key</label>
                        <input
                            id={`key-${provider.id}`}
                            type="password"
                            autoComplete="off"
                            disabled={busy}
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            placeholder="输入 API Key"
                            className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 font-code-sm text-code-sm text-on-surface outline-none placeholder:text-outline focus:border-primary"
                        />
                    </div>
                )}
                {error ? <p role="alert" className="mt-space-sm font-body-sm text-body-sm text-error">{error}</p> : null}
            </div>

            <div className="mt-space-lg flex items-center justify-end gap-space-sm border-t border-outline-variant/40 pt-space-md">
                {stored && !editing ? (
                    <>
                        <button type="button" disabled={busy} onClick={() => void clear()} className="rounded px-2.5 py-1 font-label-sm text-label-sm text-error hover:bg-surface-container-high disabled:opacity-50">清除</button>
                        <button type="button" disabled={busy} onClick={() => setEditing(true)} className="rounded border border-outline-variant/50 px-2.5 py-1 font-label-sm text-label-sm text-on-surface hover:bg-surface-container-high disabled:opacity-50">更新密钥</button>
                    </>
                ) : (
                    <>
                        {editing ? <button type="button" disabled={busy} onClick={() => { setEditing(false); setDraft(""); setError(null); }} className="rounded px-2.5 py-1 font-label-sm text-label-sm text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50">取消</button> : null}
                        <button type="button" disabled={busy || !draft.trim()} onClick={() => void save()} className="rounded bg-primary px-3 py-1 font-label-sm text-label-sm text-on-primary hover:bg-primary/90 disabled:opacity-50">{busy ? "保存中…" : "保存密钥"}</button>
                    </>
                )}
            </div>
        </section>
    );
}
