import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon";

const rows = [
  { id: "current", name: "main", section: "当前分支 CURRENT" },
  { id: "auth", name: "feat/auth-race", section: "本地分支 LOCAL BRANCHES" },
  { id: "sse", name: "fix/sse-parser", section: "本地分支 LOCAL BRANCHES" },
  { id: "deps", name: "chore/deps", section: "本地分支 LOCAL BRANCHES" },
  { id: "origin-main", name: "origin/main", section: "远程分支 REMOTE BRANCHES" },
  { id: "origin-auth", name: "origin/feat/auth-race", section: "远程分支 REMOTE BRANCHES" },
];

export function BranchSwitcher({
  dirty,
  onDirtyChange,
  onClose,
}: {
  dirty: boolean;
  onDirtyChange: (dirty: boolean) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const needle = query.trim().toLowerCase();
  const visible = useMemo(
    () => rows.filter((row) => !needle || row.name.toLowerCase().includes(needle) || row.section.toLowerCase().includes(needle)),
    [needle],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function shown(id: string) {
    return visible.some((row) => row.id === id);
  }

  return (
    <div className="fixed bottom-8 left-64 z-[60] w-[380px] max-w-[calc(100vw-18rem)] overflow-hidden rounded-xl bg-surface-container-low shadow-2xl">
      <div className="h-1 bg-gradient-to-r from-primary via-secondary to-primary-container" />
      <div className="flex items-center justify-between px-space-md pb-2 pt-space-md">
        <div className="flex items-center gap-2">
          <Icon name="fork_right" className="text-[18px] text-primary" />
          <h3 className="font-headline-sm text-body-lg font-semibold tracking-tight text-on-surface">切换分支</h3>
          <span className="rounded bg-surface-container px-1.5 py-0.5 font-code-sm text-[10px] text-outline">GIT</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="select-none rounded bg-surface-container px-1.5 py-0.5 font-code-sm text-[11px] text-on-surface-variant">
            Esc
          </span>
          <button
            type="button"
            title="关闭"
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded text-outline transition-colors hover:bg-surface-container hover:text-on-surface"
          >
            <Icon name="close" className="text-[15px]" />
          </button>
        </div>
      </div>
      <div className="px-space-md py-1">
        <label className="flex h-8 w-full items-center gap-2 rounded-lg bg-surface-container-lowest px-2.5 text-on-surface-variant focus-within:bg-surface-container-high">
          <Icon name="search" className="text-[15px] text-outline" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索分支或输入新分支名…"
            className="w-full bg-transparent font-body-sm text-body-sm text-on-surface outline-none placeholder:text-outline/70"
          />
          <span className="select-none font-code-sm text-[11px] text-outline">⌘K</span>
        </label>
      </div>
      <div className="flex max-h-72 flex-col gap-1 overflow-y-auto px-space-xs py-1.5">
        {shown("current") ? (
          <>
            <div className="px-2 pb-0.5 pt-1 font-label-xs font-semibold uppercase tracking-wider text-outline">当前分支 CURRENT</div>
            <div className="mx-1 flex cursor-default items-center justify-between rounded-lg bg-primary/10 px-2 py-1.5 text-on-surface">
              <div className="flex min-w-0 items-center gap-2">
                <Icon name="radio_button_checked" className="text-[16px] text-primary" />
                <span className="truncate font-code-sm text-body-sm font-semibold text-primary">main</span>
                <span className="rounded bg-primary/20 px-1 py-0.5 font-code-sm text-[10px] text-primary">HEAD</span>
              </div>
              <Icon name="check" className="text-[18px] text-primary" />
            </div>
          </>
        ) : null}
        {shown("auth") || shown("sse") || shown("deps") ? (
          <div className="px-2 pb-0.5 pt-2.5 font-label-xs font-semibold uppercase tracking-wider text-outline">本地分支 LOCAL BRANCHES</div>
        ) : null}
        {shown("auth") ? (
          <button type="button" onClick={() => setNotice("演示不会真正切换到 feat/auth-race。")} className="mx-1 flex items-center justify-between rounded-lg px-2 py-1.5 text-on-surface transition-colors hover:bg-surface-container-high">
            <span className="flex min-w-0 items-center gap-2">
              <Icon name="call_split" className="text-[16px] text-outline" />
              <span className="truncate font-code-sm text-body-sm">feat/auth-race</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="rounded bg-surface-container px-1.5 py-0.5 font-code-sm text-[10px] text-secondary" title="领先 1 个提交，落后 0 个">↑1 ↓0</span>
              <span className="font-label-xs text-outline">3小时前</span>
            </span>
          </button>
        ) : null}
        {shown("sse") ? (
          <button type="button" onClick={() => setNotice("演示不会真正切换到 fix/sse-parser。")} className="mx-1 flex items-center justify-between rounded-lg bg-surface-container-high px-2 py-1.5 text-on-surface shadow-sm">
            <span className="flex min-w-0 items-center gap-2">
              <Icon name="call_split" className="text-[16px] text-primary" />
              <span className="truncate font-code-sm text-body-sm font-medium">fix/sse-parser</span>
              <span className="rounded bg-tertiary-container/30 px-1 py-0.5 font-code-sm text-[10px] text-tertiary">匹配</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="rounded bg-surface-container px-1.5 py-0.5 font-code-sm text-[10px] text-tertiary">↑2</span>
              <span className="font-label-xs font-medium text-tertiary">刚刚</span>
            </span>
          </button>
        ) : null}
        {shown("deps") ? (
          <button type="button" onClick={() => setNotice("演示不会真正切换到 chore/deps。")} className="mx-1 flex items-center justify-between rounded-lg px-2 py-1.5 text-on-surface transition-colors hover:bg-surface-container-high">
            <span className="flex min-w-0 items-center gap-2">
              <Icon name="call_split" className="text-[16px] text-outline" />
              <span className="truncate font-code-sm text-body-sm text-on-surface-variant">chore/deps</span>
            </span>
            <span className="font-label-xs text-outline">昨天</span>
          </button>
        ) : null}
        {shown("origin-main") || shown("origin-auth") ? (
          <div className="px-2 pb-0.5 pt-2.5 font-label-xs font-semibold uppercase tracking-wider text-outline">远程分支 REMOTE BRANCHES</div>
        ) : null}
        {shown("origin-main") ? (
          <button type="button" className="group mx-1 rounded-lg px-2 py-1.5 text-outline transition-colors hover:bg-surface-container-high">
            <span className="flex items-center justify-between">
              <span className="flex min-w-0 items-center gap-2">
                <Icon name="cloud" className="text-[16px]" />
                <span className="truncate font-code-sm text-body-sm group-hover:text-on-surface-variant">origin/main</span>
              </span>
              <span className="text-[11px] opacity-70">同步</span>
            </span>
          </button>
        ) : null}
        {shown("origin-auth") ? (
          <button type="button" className="group mx-1 rounded-lg px-2 py-1.5 text-outline transition-colors hover:bg-surface-container-high">
            <span className="flex items-center justify-between">
              <span className="flex min-w-0 items-center gap-2">
                <Icon name="cloud" className="text-[16px]" />
                <span className="truncate font-code-sm text-body-sm group-hover:text-on-surface-variant">origin/feat/auth-race</span>
              </span>
              <span className="text-[11px] opacity-70">2天前</span>
            </span>
          </button>
        ) : null}
      </div>
      {dirty ? (
        <div className="mx-space-xs my-1.5 flex flex-col gap-2 rounded-xl bg-error-container/20 p-2.5">
          <div className="flex items-start gap-2">
            <Icon name="warning" className="mt-0.5 shrink-0 text-[18px] text-error" />
            <div className="flex min-w-0 flex-col">
              <span className="font-label-md text-label-md font-semibold tracking-tight text-error">
                检测到 3 个未提交更改 (Dirty Worktree)
              </span>
              <span className="mt-0.5 font-body-sm text-xs leading-snug text-on-surface-variant">
                直接切换分支可能会导致工作区未暂存代码冲突。
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              title="强制丢弃或覆写"
              onClick={() => setNotice("已选择仍要切换（演示）。状态栏分支仍显示 main*。")}
              className="flex h-6 items-center rounded bg-surface-container-highest px-2.5 font-label-xs font-semibold text-error transition-colors hover:bg-surface-container"
            >
              仍要切换 (Force)
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-6 rounded bg-surface-container px-2.5 font-label-xs text-on-surface-variant transition-colors hover:bg-surface-container-high"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => {
                onDirtyChange(false);
                setNotice("已暂存后再切（演示）。脏工作区提示已收起。");
              }}
              className="ml-auto flex items-center gap-0.5 font-code-sm text-xs text-secondary hover:underline"
            >
              暂存后再切 (Stash)
              <Icon name="arrow_forward" className="text-[13px]" />
            </button>
          </div>
        </div>
      ) : null}
      {notice ? <p className="px-space-md pb-2 font-code-sm text-[11px] text-secondary">{notice}</p> : null}
      <div className="flex items-center justify-between border-t border-surface-container-high/40 bg-surface-container-lowest px-space-md py-2 text-on-surface-variant">
        <button
          type="button"
          onClick={() => setNotice(query.trim() ? `将创建分支 ${query.trim()}（演示）` : "输入新分支名后再创建")}
          className="flex h-7 items-center gap-1.5 rounded px-2.5 font-label-sm text-label-sm font-medium text-on-surface transition-colors hover:bg-surface-container"
        >
          <Icon name="add" className="text-[15px] text-primary" />
          <span>新建分支…</span>
          <span className="ml-1 font-code-sm text-[10px] text-outline">⌘N</span>
        </button>
        <button
          type="button"
          title="Fetch Remote Refs"
          onClick={() => onDirtyChange(!dirty)}
          className="flex h-7 items-center gap-1.5 rounded px-2.5 font-label-sm text-label-sm text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
        >
          <Icon name="sync" className="text-[15px]" />
          <span>刷新 (Fetch)</span>
        </button>
      </div>
    </div>
  );
}
