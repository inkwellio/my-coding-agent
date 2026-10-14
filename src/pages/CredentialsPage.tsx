import { useMemo, useState } from "react";
import { useCredentialBoard } from "../credentials/board";
import { CredentialCard } from "./CredentialCard";

function goBack() {
    if (window.history.length > 1) window.history.back();
    else window.location.hash = "#/settings";
}

export function CredentialsPage() {
    const board = useCredentialBoard();
    const [query, setQuery] = useState("");

    const providers = useMemo(() => {
        const needle = query.trim().toLowerCase();
        return board.providers
            .filter((provider) => provider.apiKey && !provider.multiStep)
            .filter((provider) => !needle || [provider.name, provider.id, ...provider.models.map((model) => model.name)]
                .join(" ").toLowerCase().includes(needle))
            .sort((a, b) => {
                const bySaved = Number(board.statuses[b.id]?.status === "stored") - Number(board.statuses[a.id]?.status === "stored");
                return bySaved || a.name.localeCompare(b.name);
            });
    }, [board.providers, board.statuses, query]);

    return (
        <main className="h-full min-h-0 overflow-y-auto bg-surface p-space-xl text-on-surface">
            <div className="mx-auto max-w-[940px] space-y-space-xl">
                <header className="flex items-start gap-space-sm border-b border-outline-variant/40 pb-space-lg">
                    <button
                        type="button"
                        title="返回"
                        aria-label="返回"
                        onClick={goBack}
                        className="-ml-1.5 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
                    >
                        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    <div className="min-w-0">
                        <h1 className="font-headline-sm text-headline-sm font-semibold">API Key 配置</h1>
                        <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">选择服务商，保存或更新本地 API Key。保存后只显示密钥末尾四位。</p>
                    </div>
                </header>

                <input
                    aria-label="搜索服务商"
                    className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 font-body-sm text-body-sm text-on-surface outline-none placeholder:text-outline focus:border-primary"
                    placeholder="搜索服务商"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                />
                {board.loadError ? <p role="alert" className="font-body-sm text-body-sm text-error">{board.loadError}</p> : null}
                {!board.loaded ? <p className="font-body-sm text-body-sm text-on-surface-variant">正在读取服务商…</p> : null}
                {board.loaded && !board.available ? (
                    <p className="font-body-sm text-body-sm text-on-surface-variant">API Key 只能在 Electron 桌面窗口中保存。</p>
                ) : null}
                {board.loaded && board.available && providers.length === 0 ? (
                    <p className="font-body-sm text-body-sm text-on-surface-variant">没有匹配的 API Key 服务商。</p>
                ) : null}

                <div className="grid grid-cols-1 gap-space-md md:grid-cols-2">
                    {providers.map((provider) => (
                        <CredentialCard key={provider.id} provider={provider} status={board.statuses[provider.id]} />
                    ))}
                </div>
            </div>
        </main>
    );
}
