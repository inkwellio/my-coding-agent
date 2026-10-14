import { useCallback, useEffect, useRef, useState } from "react";
import { DiffLines } from "../components/DiffLines";
import { Icon } from "../components/Icon";
import { Select, type SelectOption } from "../components/ui/Select";
import { GIT_HEAD_CHANGED, relativeTime } from "../git/format";
import type { GitBranches, GitCommit } from "../git/types";
import { useRpc } from "../rpc/RpcProvider";

const PAGE_SIZE = 50;
const CURRENT = "HEAD";

function refTone(ref: string) {
    if (ref.startsWith("HEAD")) return "bg-primary/15 text-primary";
    if (ref.startsWith("tag: ")) return "bg-tertiary/15 text-tertiary";
    if (ref.includes("/")) return "bg-surface-container-high text-on-surface-variant";
    return "bg-secondary/15 text-secondary";
}

export function HistoryPage() {
    const { status: engine } = useRpc();
    const desktop = window.piDesktop;
    const [branches, setBranches] = useState<GitBranches | null>(null);
    const [ref, setRef] = useState(CURRENT);
    const [commits, setCommits] = useState<GitCommit[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [selected, setSelected] = useState<string | null>(null);
    const [detail, setDetail] = useState<{ hash: string; text: string } | null>(null);
    const requestId = useRef(0);

    const load = useCallback(async (skip: number) => {
        if (!desktop?.getGitLog) {
            setError("请在 Electron 桌面应用中打开工作区");
            return;
        }
        const request = ++requestId.current;
        setLoading(true);
        try {
            const result = await desktop.getGitLog({ ref, skip, limit: PAGE_SIZE });
            if (request !== requestId.current) return;
            if (!result.ok) {
                setError(result.message || "读取提交历史失败");
                if (skip === 0) setCommits([]);
                setHasMore(false);
                return;
            }
            setError("");
            setHasMore(result.hasMore);
            setCommits((current) => (skip === 0 ? result.commits : [...current, ...result.commits]));
            if (skip === 0) setSelected((current) => (result.commits.some((commit) => commit.hash === current) ? current : result.commits[0]?.hash ?? null));
        } catch (cause) {
            if (request === requestId.current) setError(cause instanceof Error ? cause.message : "读取提交历史失败");
        } finally {
            if (request === requestId.current) setLoading(false);
        }
    }, [desktop, ref]);

    useEffect(() => {
        if (!desktop?.listGitBranches) return;
        let active = true;
        const refresh = () => {
            void desktop.listGitBranches().then((result) => {
                if (active && result.ok) setBranches(result);
            });
        };
        refresh();
        window.addEventListener(GIT_HEAD_CHANGED, refresh);
        return () => {
            active = false;
            window.removeEventListener(GIT_HEAD_CHANGED, refresh);
        };
    }, [desktop, engine.cwd]);

    useEffect(() => {
        void load(0);
        const reload = () => void load(0);
        window.addEventListener(GIT_HEAD_CHANGED, reload);
        return () => window.removeEventListener(GIT_HEAD_CHANGED, reload);
    }, [load, engine.cwd]);

    useEffect(() => {
        if (!selected || !desktop?.showGitCommit) {
            setDetail(null);
            return;
        }
        let active = true;
        const hash = selected;
        void desktop.showGitCommit(hash).then((result) => {
            if (active) setDetail({ hash, text: result.ok ? result.text || "" : result.message || "读取提交详情失败" });
        }).catch((cause) => {
            if (active) setDetail({ hash, text: cause instanceof Error ? cause.message : "读取提交详情失败" });
        });
        return () => { active = false; };
    }, [desktop, selected, engine.cwd]);

    const currentLabel = branches ? (branches.detached ? `当前 HEAD（${branches.current}）` : `当前分支（${branches.current}）`) : "当前分支";
    const options: SelectOption<string>[] = [
        { value: CURRENT, label: currentLabel, icon: "radio_button_checked" },
        ...(branches?.local ?? []).filter((branch) => !branch.current).map((branch) => ({ value: branch.name, label: branch.name, icon: "call_split" })),
        ...(branches?.remote ?? []).map((branch) => ({ value: branch.name, label: branch.name, icon: "cloud" })),
    ];
    const detailText = detail && detail.hash === selected ? detail.text : null;
    const selectedCommit = commits.find((commit) => commit.hash === selected);

    return (
        <main className="flex h-full min-h-0 w-full overflow-hidden bg-surface text-on-surface">
            <section className="flex w-[360px] shrink-0 flex-col border-r border-surface-container-high bg-surface-container-lowest">
                <div className="flex flex-col gap-space-sm border-b border-surface-container-high p-space-md">
                    <div className="flex items-center justify-between">
                        <h1 className="font-headline-sm text-headline-sm">提交历史</h1>
                        <div className="flex items-center gap-1">
                            <a href="#/branch" title="切换分支" className="rounded p-1 text-on-surface-variant hover:bg-surface-container-high">
                                <Icon name="fork_right" className="text-[18px]" />
                            </a>
                            <button type="button" onClick={() => void load(0)} disabled={loading} title="刷新" className="rounded p-1 text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50">
                                <Icon name="refresh" className="text-[18px]" />
                            </button>
                        </div>
                    </div>
                    <Select label="分支" value={ref} options={options} onChange={setRef} disabled={!branches} />
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-space-xs py-space-xs">
                    {error ? <p role="alert" className="whitespace-pre-wrap p-space-md text-error">{error}</p> : null}
                    {loading && commits.length === 0 ? <p className="p-space-md text-on-surface-variant">正在读取提交…</p> : null}
                    {!loading && !error && commits.length === 0 ? <p className="p-space-md text-on-surface-variant">这个分支还没有提交。</p> : null}
                    {commits.map((commit) => {
                        const active = commit.hash === selected;
                        return (
                            <button
                                key={commit.hash}
                                type="button"
                                onClick={() => setSelected(commit.hash)}
                                className={`flex w-full flex-col gap-0.5 rounded px-space-sm py-1.5 text-left ${active ? "bg-surface-container-high text-on-surface" : "text-on-surface-variant hover:bg-surface-container"}`}
                            >
                                <span className="w-full truncate font-body-sm text-body-sm text-on-surface" title={commit.subject}>{commit.subject || "（无提交说明）"}</span>
                                <span className="flex min-w-0 items-center gap-2 font-label-xs text-label-xs text-outline">
                                    <span className="font-code-sm text-secondary">{commit.shortHash}</span>
                                    <span className="truncate">{commit.author}</span>
                                    <span className="ml-auto shrink-0" title={new Date(commit.date * 1000).toLocaleString("zh-CN")}>{relativeTime(commit.date)}</span>
                                </span>
                                {commit.refs.length ? (
                                    <span className="flex flex-wrap gap-1 pt-0.5">
                                        {commit.refs.map((item) => (
                                            <span key={item} className={`rounded px-1 py-0.5 font-code-xs text-code-xs ${refTone(item)}`}>{item}</span>
                                        ))}
                                    </span>
                                ) : null}
                            </button>
                        );
                    })}
                    {hasMore ? (
                        <button
                            type="button"
                            disabled={loading}
                            onClick={() => void load(commits.length)}
                            className="my-space-xs w-full rounded py-1.5 font-label-sm text-label-sm text-secondary hover:bg-surface-container disabled:opacity-50"
                        >
                            {loading ? "正在加载…" : "加载更多"}
                        </button>
                    ) : null}
                </div>
            </section>
            <section className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center gap-space-sm border-b border-surface-container-high px-space-md py-space-sm font-code-sm text-code-sm text-on-surface-variant">
                    {selectedCommit ? (
                        <>
                            <span className="text-secondary">{selectedCommit.shortHash}</span>
                            <span className="truncate text-on-surface">{selectedCommit.subject}</span>
                        </>
                    ) : "选择提交查看详情"}
                </div>
                <div className="min-h-0 flex-1 select-text overflow-auto bg-surface py-space-sm font-code-sm text-code-sm">
                    {selected ? (
                        detailText !== null ? <DiffLines text={detailText} /> : (
                            <p className="px-space-md text-on-surface-variant/60">正在读取提交详情…</p>
                        )
                    ) : null}
                </div>
            </section>
        </main>
    );
}
