import { useMemo, useState } from "react";
import { useCredentialBoard } from "../credentials/board";
import { CredentialCard } from "./CredentialCard";

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
    <main className="min-h-0 flex-1 overflow-y-auto bg-pi-bg p-6 text-pi-text">
      <div className="mx-auto max-w-[940px] space-y-5">
        <header className="border-b border-pi-border pb-4">
          <h1 className="text-base font-semibold tracking-tight">API Key 配置</h1>
          <p className="mt-1.5 text-xs text-pi-muted">选择服务商，保存或更新本地 API Key。保存后只显示密钥末尾四位。</p>
        </header>

        <input
          aria-label="搜索服务商"
          className="w-full rounded border border-pi-border bg-pi-input px-3 py-2 text-xs text-pi-text focus:border-pi-accent focus:outline-none"
          placeholder="搜索服务商"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {board.loadError ? <p role="alert" className="text-xs text-rose-300">{board.loadError}</p> : null}
        {!board.loaded ? <p className="text-xs text-pi-muted">正在读取服务商…</p> : null}
        {board.loaded && !board.available ? (
          <p className="text-xs text-pi-muted">API Key 只能在 Electron 桌面窗口中保存。</p>
        ) : null}
        {board.loaded && board.available && providers.length === 0 ? (
          <p className="text-xs text-pi-muted">没有匹配的 API Key 服务商。</p>
        ) : null}

        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
          {providers.map((provider) => (
            <CredentialCard key={provider.id} provider={provider} status={board.statuses[provider.id]} />
          ))}
        </div>
      </div>
    </main>
  );
}
