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
        <section className="flex flex-col justify-between rounded-lg border border-pi-border bg-pi-card p-4" data-purpose="credential-card" data-provider={provider.id} data-credential-status={busy ? "saving" : stored ? "stored" : "unconfigured"}>
            <div>
                <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                        <h2 className="truncate text-xs font-semibold text-pi-text">{provider.name}</h2>
                        <p className="truncate font-mono text-[10px] text-pi-muted">{provider.id}</p>
                    </div>
                    <span className={`shrink-0 rounded border px-2 py-0.5 font-mono text-[10px] ${stored ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-300"}`}>
                        {stored ? "已保存" : "未保存"}
                    </span>
                </div>

                {stored && !editing ? (
                    <p className="rounded border border-pi-border bg-pi-input px-3 py-2 font-mono text-xs text-pi-text">{status.mask || "••••"}</p>
                ) : (
                    <div className="space-y-2">
                        <label className="block font-mono text-[11px] text-pi-muted" htmlFor={`key-${provider.id}`}>API Key</label>
                        <input
                            id={`key-${provider.id}`}
                            type="password"
                            autoComplete="off"
                            disabled={busy}
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            placeholder="输入 API Key"
                            className="w-full rounded border border-pi-border bg-pi-input px-3 py-2 font-mono text-xs text-pi-text focus:border-pi-accent focus:outline-none"
                        />
                    </div>
                )}
                {error ? <p role="alert" className="mt-2 text-[11px] text-rose-300">{error}</p> : null}
            </div>

            <div className="mt-4 flex items-center justify-end gap-2 border-t border-pi-border pt-3">
                {stored && !editing ? (
                    <>
                        <button type="button" disabled={busy} onClick={() => void clear()} className="rounded px-2.5 py-1 text-[11px] text-rose-300 hover:bg-pi-cardHover disabled:opacity-50">清除</button>
                        <button type="button" disabled={busy} onClick={() => setEditing(true)} className="rounded border border-pi-border px-2.5 py-1 text-[11px] text-pi-text hover:bg-pi-cardHover disabled:opacity-50">更新密钥</button>
                    </>
                ) : (
                    <>
                        {editing ? <button type="button" disabled={busy} onClick={() => { setEditing(false); setDraft(""); setError(null); }} className="rounded px-2.5 py-1 text-[11px] text-pi-muted hover:bg-pi-cardHover disabled:opacity-50">取消</button> : null}
                        <button type="button" disabled={busy || !draft.trim()} onClick={() => void save()} className="rounded bg-pi-accent px-3 py-1 text-[11px] font-medium text-white hover:bg-pi-accentHover disabled:opacity-50">{busy ? "保存中…" : "保存密钥"}</button>
                    </>
                )}
            </div>
        </section>
    );
}
