import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../components/Icon";
import { notifyHeadChanged, relativeTime } from "../git/format";
import type { GitBranches, GitCheckoutRequest } from "../git/types";
import { useRpc } from "../rpc/RpcProvider";

function trackLabel(ahead: number, behind: number) {
    if (!ahead && !behind) return null;
    return [ahead ? `↑${ahead}` : "", behind ? `↓${behind}` : ""].filter(Boolean).join(" ");
}

export function BranchSwitcher({ onClose }: { onClose: () => void }) {
    const { status: engine } = useRpc();
    const desktop = window.piDesktop;
    const [data, setData] = useState<GitBranches | null>(null);
    const [query, setQuery] = useState("");
    const [busy, setBusy] = useState<"load" | "fetch" | "checkout" | null>("load");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [pending, setPending] = useState<GitCheckoutRequest | null>(null);
    const agentRunning = engine.engine === "chatting";
    const rootRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const [highlight, setHighlight] = useState(0);

    const load = useCallback(async () => {
        if (!desktop?.listGitBranches) {
            setBusy(null);
            setError("请在 Electron 桌面应用中打开工作区");
            return;
        }
        setBusy("load");
        try {
            const result = await desktop.listGitBranches();
            setData(result);
            setError(result.ok ? "" : result.message || "读取分支失败");
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "读取分支失败");
        } finally {
            setBusy(null);
        }
    }, [desktop]);

    useEffect(() => {
        void load();
    }, [load, engine.cwd]);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            // Esc backs out of the uncommitted-changes prompt before it closes the panel.
            if (pending) {
                setPending(null);
                setError("");
            } else {
                onClose();
            }
        };
        const onPointerDown = (event: MouseEvent) => {
            const target = event.target instanceof Element ? event.target : null;
            if (!target || rootRef.current?.contains(target) || target.closest('a[href="#/branch"]')) return;
            onClose();
        };
        window.addEventListener("keydown", onKey);
        document.addEventListener("mousedown", onPointerDown);
        return () => {
            window.removeEventListener("keydown", onKey);
            document.removeEventListener("mousedown", onPointerDown);
        };
    }, [onClose, pending]);

    const needle = query.trim().toLowerCase();
    const local = useMemo(
        () => (data?.local ?? []).filter((branch) => !branch.current && (!needle || branch.name.toLowerCase().includes(needle))),
        [data, needle],
    );
    const remote = useMemo(
        () => (data?.remote ?? []).filter((branch) => !needle || branch.name.toLowerCase().includes(needle)),
        [data, needle],
    );
    const newName = query.trim();
    const canCreate = Boolean(data?.ok && newName && !data.local.some((branch) => branch.name === newName));
    // Rows in display order, so arrow keys and Enter act on what the highlight shows.
    const items = useMemo<GitCheckoutRequest[]>(() => [
        ...(canCreate ? [{ name: newName, create: true }] : []),
        ...local.map((branch) => ({ name: branch.name })),
        ...remote.map((branch) => ({ name: branch.name, remote: true })),
    ], [canCreate, newName, local, remote]);
    const firstLocal = canCreate && local.length ? 1 : 0;

    useEffect(() => {
        setHighlight(firstLocal);
    }, [needle, data, firstLocal]);

    useEffect(() => {
        listRef.current?.querySelector('[data-highlighted="true"]')?.scrollIntoView({ block: "nearest" });
    }, [highlight]);

    const isHighlighted = (request: GitCheckoutRequest) => {
        const item = items[highlight];
        return Boolean(item && item.name === request.name && Boolean(item.create) === Boolean(request.create) && Boolean(item.remote) === Boolean(request.remote));
    };

    async function checkout(request: GitCheckoutRequest) {
        if (!desktop?.checkoutGitBranch || busy) return;
        setBusy("checkout");
        setError("");
        setNotice("");
        try {
            const result = await desktop.checkoutGitBranch(request);
            if (!result.ok) {
                setError(result.message || "切换分支失败");
                if (data && data.changes > 0) setPending({ ...request, stash: false });
                return;
            }
            setPending(null);
            notifyHeadChanged();
            if (result.stashed) {
                setData(result as GitBranches);
                setQuery("");
                setNotice(`已切换到 ${result.branch}。原来的改动已存入 stash，可在终端用 git stash pop 恢复。`);
            } else {
                onClose();
            }
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "切换分支失败");
        } finally {
            setBusy(null);
        }
    }

    function choose(request: GitCheckoutRequest) {
        if (data && data.changes > 0) {
            setError("");
            setPending(request);
            return;
        }
        void checkout(request);
    }

    async function fetchRemotes() {
        if (!desktop?.fetchGitRemotes || busy) return;
        setBusy("fetch");
        setError("");
        setNotice("");
        try {
            const result = await desktop.fetchGitRemotes();
            if (result.ok) {
                setData(result);
                setNotice("已从远程仓库拉取最新分支");
            } else {
                setError(result.message || "拉取远程分支失败");
            }
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "拉取远程分支失败");
        } finally {
            setBusy(null);
        }
    }

    const disabled = busy !== null || agentRunning || !data?.ok;
    const current = data?.local.find((branch) => branch.current);

    return (
        <div ref={rootRef} role="dialog" aria-label="切换分支" className="fixed left-1/2 top-12 z-[60] w-[420px] max-w-[calc(100vw-2rem)] -translate-x-1/2 overflow-hidden rounded-xl bg-surface-container-low shadow-2xl">
            <div className="h-1 bg-gradient-to-r from-primary via-secondary to-primary-container" />
            <div className="flex items-center justify-between px-space-md pb-2 pt-space-md">
                <div className="flex items-center gap-2">
                    <Icon name="fork_right" className="text-[18px] text-primary" />
                    <h3 className="font-headline-sm text-body-lg font-semibold tracking-tight text-on-surface">切换分支</h3>
                    <span className="rounded bg-surface-container px-1.5 py-0.5 font-code-xs text-code-xs text-outline">GIT</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="select-none rounded bg-surface-container px-1.5 py-0.5 font-code-xs text-code-xs text-on-surface-variant">
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
                        onKeyDown={(event) => {
                            if (event.nativeEvent.isComposing) return;
                            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                                event.preventDefault();
                                if (!items.length) return;
                                const step = event.key === "ArrowDown" ? 1 : -1;
                                setHighlight((current) => (current + step + items.length) % items.length);
                                return;
                            }
                            if (event.key !== "Enter" || disabled) return;
                            event.preventDefault();
                            const item = items[highlight];
                            if (item) choose(item);
                        }}
                        placeholder="搜索分支或输入新分支名，↑↓ 选择，Enter 切换"
                        className="w-full bg-transparent font-body-sm text-body-sm text-on-surface outline-none placeholder:text-outline/70"
                    />
                </label>
            </div>
            <div ref={listRef} className="flex max-h-72 flex-col gap-1 overflow-y-auto px-space-xs py-1.5">
                {busy === "load" && !data ? <p className="px-2 py-1.5 font-body-sm text-body-sm text-outline">正在读取分支…</p> : null}
                {data?.ok ? (
                    <>
                        <div className="px-2 pb-0.5 pt-1 font-label-xs font-semibold uppercase tracking-wider text-outline">当前分支 CURRENT</div>
                        <div className="mx-1 flex cursor-default items-center justify-between rounded-lg bg-primary/10 px-2 py-1.5 text-on-surface">
                            <div className="flex min-w-0 items-center gap-2">
                                <Icon name="radio_button_checked" className="text-[16px] text-primary" />
                                <span className="truncate font-code-sm text-body-sm font-semibold text-primary">
                                    {data.detached ? `分离 HEAD · ${data.current}` : data.current}
                                </span>
                                <span className="rounded bg-primary/20 px-1 py-0.5 font-code-xs text-code-xs text-primary">HEAD</span>
                                {current && trackLabel(current.ahead, current.behind) ? (
                                    <span className="rounded bg-surface-container px-1.5 py-0.5 font-code-xs text-code-xs text-secondary" title="相对上游分支领先/落后的提交数">
                                        {trackLabel(current.ahead, current.behind)}
                                    </span>
                                ) : null}
                            </div>
                            <Icon name="check" className="text-[18px] text-primary" />
                        </div>
                    </>
                ) : null}
                {canCreate ? (
                    <button
                        type="button"
                        disabled={disabled}
                        data-highlighted={isHighlighted({ name: newName, create: true })}
                        onMouseEnter={() => setHighlight(0)}
                        onClick={() => choose({ name: newName, create: true })}
                        className={`mx-1 mt-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-50 ${isHighlighted({ name: newName, create: true }) ? "bg-surface-container-high ring-1 ring-primary/40" : ""}`}
                    >
                        <Icon name="add" className="text-[16px] text-primary" />
                        <span className="min-w-0 truncate font-body-sm text-body-sm">
                            从当前分支新建 <span className="font-code-sm text-primary">{newName}</span> 并切换
                        </span>
                    </button>
                ) : null}
                {local.length ? (
                    <div className="px-2 pb-0.5 pt-2.5 font-label-xs font-semibold uppercase tracking-wider text-outline">本地分支 LOCAL BRANCHES</div>
                ) : null}
                {local.map((branch, index) => {
                    const track = trackLabel(branch.ahead, branch.behind);
                    const highlighted = isHighlighted({ name: branch.name });
                    return (
                        <button
                            key={branch.name}
                            type="button"
                            disabled={disabled}
                            data-highlighted={highlighted}
                            onMouseEnter={() => setHighlight((canCreate ? 1 : 0) + index)}
                            onClick={() => choose({ name: branch.name })}
                            className={`mx-1 flex items-center justify-between rounded-lg px-2 py-1.5 text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-50 ${highlighted || pending?.name === branch.name ? "bg-surface-container-high" : ""} ${highlighted ? "ring-1 ring-primary/40" : ""}`}
                        >
                            <span className="flex min-w-0 items-center gap-2">
                                <Icon name="call_split" className="text-[16px] text-outline" />
                                <span className="truncate font-code-sm text-body-sm">{branch.name}</span>
                                {branch.gone ? <span className="rounded bg-error-container/30 px-1 py-0.5 font-code-xs text-code-xs text-error" title="上游分支已被删除">上游已删除</span> : null}
                            </span>
                            <span className="flex shrink-0 items-center gap-2">
                                {track ? <span className="rounded bg-surface-container px-1.5 py-0.5 font-code-xs text-code-xs text-secondary" title="相对上游分支领先/落后的提交数">{track}</span> : null}
                                <span className="font-label-xs text-outline">{relativeTime(branch.date)}</span>
                            </span>
                        </button>
                    );
                })}
                {remote.length ? (
                    <div className="px-2 pb-0.5 pt-2.5 font-label-xs font-semibold uppercase tracking-wider text-outline">远程分支 REMOTE BRANCHES</div>
                ) : null}
                {remote.map((branch, index) => (
                    <button
                        key={branch.name}
                        type="button"
                        disabled={disabled}
                        title="检出为本地跟踪分支"
                        data-highlighted={isHighlighted({ name: branch.name, remote: true })}
                        onMouseEnter={() => setHighlight((canCreate ? 1 : 0) + local.length + index)}
                        onClick={() => choose({ name: branch.name, remote: true })}
                        className={`group mx-1 rounded-lg px-2 py-1.5 text-outline transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-50 ${isHighlighted({ name: branch.name, remote: true }) || pending?.name === branch.name ? "bg-surface-container-high" : ""} ${isHighlighted({ name: branch.name, remote: true }) ? "ring-1 ring-primary/40" : ""}`}
                    >
                        <span className="flex items-center justify-between">
                            <span className="flex min-w-0 items-center gap-2">
                                <Icon name="cloud" className="text-[16px]" />
                                <span className="truncate font-code-sm text-body-sm group-hover:text-on-surface-variant">{branch.name}</span>
                            </span>
                            <span className="shrink-0 font-body-xs text-body-xs opacity-70">{relativeTime(branch.date)}</span>
                        </span>
                    </button>
                ))}
                {data?.ok && needle && !local.length && !remote.length && !canCreate ? (
                    <p className="px-2 py-1.5 font-body-sm text-body-sm text-outline">没有匹配的分支</p>
                ) : null}
            </div>
            {pending && data ? (
                <div className="mx-space-xs my-1.5 flex flex-col gap-2 rounded-xl bg-error-container/20 p-2.5">
                    <div className="flex items-start gap-2">
                        <Icon name="warning" className="mt-0.5 shrink-0 text-[18px] text-error" />
                        <div className="flex min-w-0 flex-col">
                            <span className="font-label-md text-label-md font-semibold tracking-tight text-error">
                                有 {data.changes} 个未提交的更改
                            </span>
                            <span className="mt-0.5 font-body-xs text-body-xs text-on-surface-variant">
                                切换到 <span className="font-code-sm">{pending.name}</span> 时，不冲突的改动会被带过去；有冲突时 Git 会拒绝切换。也可以先把改动存入 stash。
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                        <button
                            type="button"
                            disabled={busy !== null}
                            onClick={() => void checkout({ ...pending, stash: false })}
                            className="flex h-6 items-center rounded bg-surface-container-highest px-2.5 font-label-xs font-semibold text-on-surface transition-colors hover:bg-surface-container disabled:opacity-50"
                        >
                            带着改动切换
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setPending(null);
                                setError("");
                            }}
                            className="h-6 rounded bg-surface-container px-2.5 font-label-xs text-on-surface-variant transition-colors hover:bg-surface-container-high"
                        >
                            取消
                        </button>
                        <button
                            type="button"
                            disabled={busy !== null}
                            onClick={() => void checkout({ ...pending, stash: true })}
                            className="ml-auto flex items-center gap-0.5 font-code-sm text-code-sm text-secondary hover:underline disabled:opacity-50"
                        >
                            存入 stash 后切换
                            <Icon name="arrow_forward" className="text-[13px]" />
                        </button>
                    </div>
                </div>
            ) : null}
            {agentRunning ? <p className="px-space-md pb-2 font-body-xs text-body-xs text-on-surface-variant">代理正在运行，完成或中止后才能切换分支。</p> : null}
            {busy === "checkout" ? <p className="px-space-md pb-2 font-body-xs text-body-xs text-secondary">正在切换…</p> : null}
            {error ? <p role="alert" className="whitespace-pre-wrap px-space-md pb-2 font-body-xs text-body-xs text-error">{error}</p> : null}
            {notice ? <p role="status" className="px-space-md pb-2 font-body-xs text-body-xs text-secondary">{notice}</p> : null}
            <div className="flex items-center justify-between border-t border-surface-container-high/40 bg-surface-container-lowest px-space-md py-2 text-on-surface-variant">
                <a
                    href="#/history"
                    className="flex h-7 items-center gap-1.5 rounded px-2.5 font-label-sm text-label-sm font-medium text-on-surface transition-colors hover:bg-surface-container"
                >
                    <Icon name="history" className="text-[15px] text-primary" />
                    <span>提交历史</span>
                </a>
                <button
                    type="button"
                    title="git fetch --all --prune"
                    disabled={busy !== null || !data?.ok}
                    onClick={() => void fetchRemotes()}
                    className="flex h-7 items-center gap-1.5 rounded px-2.5 font-label-sm text-label-sm text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:opacity-50"
                >
                    <Icon name="sync" className={`text-[15px] ${busy === "fetch" ? "animate-spin" : ""}`} />
                    <span>{busy === "fetch" ? "正在拉取…" : "拉取远程 (Fetch)"}</span>
                </button>
            </div>
        </div>
    );
}
