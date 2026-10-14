import { useEffect, useState } from "react";
import { Icon } from "../components/Icon";
import { useRpc } from "../rpc/RpcProvider";

const OPEN_SHORTCUT = /Mac/i.test(navigator.userAgent) ? "⌘ O" : "Ctrl O";

function workspaceName(cwd: string) {
    return cwd.split(/[\\/]/).filter(Boolean).at(-1) || cwd;
}

export function OnboardingPage() {
    const { addWorkspace, switchWorkspace, workspaceState, workspaceBusy, status } = useRpc();
    const [toast, setToast] = useState<string | null>(null);
    const activeCwd = status.available ? status.cwd : workspaceState.activeCwd;
    const recent = [...workspaceState.paths].reverse().sort((a, b) => Number(b === activeCwd) - Number(a === activeCwd));

    async function openRecent(path: string) {
        if (path === activeCwd || await switchWorkspace(path)) window.location.hash = "#/";
        else setToast(`无法打开 ${workspaceName(path)}`);
    }

    function chooseWorkspace() {
        if (window.piDesktop?.addWorkspace) void addWorkspace();
        else setToast("请在桌面应用中选择工作区目录");
    }

    useEffect(() => {
        if (!toast) return;
        const timer = window.setTimeout(() => setToast(null), 2200);
        return () => window.clearTimeout(timer);
    }, [toast]);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "o") return;
            event.preventDefault();
            chooseWorkspace();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [addWorkspace]);

    return (
        <main className="h-full min-h-screen w-full overflow-y-auto bg-surface text-on-surface font-body-md text-body-md">
            <div className="relative flex min-h-full w-full flex-col items-center justify-center overflow-hidden px-margin py-space-xl">
                <div className="pointer-events-none absolute -top-24 left-1/2 h-[360px] w-[720px] -translate-x-1/2 rounded-full bg-primary-container/10 blur-[130px]" />
                <div className="pointer-events-none absolute top-1/3 -right-20 h-[420px] w-[420px] rounded-full bg-secondary-container/10 blur-[140px]" />
                <div className="relative flex w-full max-w-2xl flex-col gap-space-xl">
                    <section className="rounded-xl bg-surface-container-lowest p-space-xl text-center shadow-xl">
                        <h1 className="mb-space-sm font-headline-lg text-headline-lg font-semibold tracking-tight text-on-surface">
                            欢迎使用智能编程工作台
                        </h1>
                        <p className="mx-auto max-w-xl font-body-md text-body-md leading-relaxed text-on-surface-variant">
                            选择一个本地项目目录作为工作区，即可与 Pi 编程代理协作。
                        </p>
                    </section>
                    <button
                        type="button"
                        onClick={chooseWorkspace}
                        className="group relative flex flex-col rounded-xl bg-surface-container-low p-space-lg text-left shadow-sm transition-all duration-200 hover:bg-surface-container hover:shadow-xl"
                    >
                        <span className="absolute left-0 right-0 top-0 h-1 rounded-t-xl bg-gradient-to-r from-primary via-primary-container to-secondary opacity-90" />
                        <span className="mb-space-md flex items-center justify-between">
                            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-105">
                                <Icon name="folder_open" className="text-[22px]" />
                            </span>
                            <kbd className="rounded bg-surface-container-lowest px-1.5 py-0.5 font-code-sm text-code-sm text-on-surface-variant">
                                {OPEN_SHORTCUT}
                            </kbd>
                        </span>
                        <span className="mb-space-xs font-headline-sm text-headline-sm text-on-surface transition-colors group-hover:text-primary">
                            打开本地项目文件夹
                        </span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                            选择目录后会加入侧栏的工作区列表，并在当前窗口中打开。
                        </span>
                        <span className="flex items-center gap-1 pt-space-md font-label-sm text-label-sm font-medium text-primary">
                            浏览本地目录
                            <Icon name="arrow_forward" className="text-[16px] transition-transform group-hover:translate-x-0.5" />
                        </span>
                    </button>
                    {recent.length ? (
                        <section className="flex flex-col rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
                            <div className="mb-space-md flex items-center gap-space-sm">
                                <Icon name="history" className="text-[20px] text-primary" />
                                <h2 className="font-headline-sm text-headline-sm text-on-surface">最近项目</h2>
                                <span className="rounded-full bg-surface-container px-2 py-0.5 font-code-sm text-code-sm text-on-surface-variant">
                                    {recent.length}
                                </span>
                            </div>
                            <div className="flex flex-col gap-space-xs">
                                {recent.map((path) => (
                                    <button
                                        key={path}
                                        type="button"
                                        title={path}
                                        disabled={workspaceBusy || (path !== activeCwd && status.engine === "chatting")}
                                        onClick={() => void openRecent(path)}
                                        className="group flex items-center gap-space-md rounded-lg bg-surface-container-low p-space-md text-left transition-all hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <Icon name="folder" className="shrink-0 text-[20px] text-on-surface-variant" />
                                        <span className="flex min-w-0 flex-1 flex-col">
                                            <span className="truncate font-label-md text-label-md font-semibold text-on-surface group-hover:text-primary">
                                                {workspaceName(path)}
                                            </span>
                                            <span className="truncate font-code-sm text-code-sm text-outline">{path}</span>
                                        </span>
                                        {path === activeCwd ? (
                                            <span className="shrink-0 rounded bg-primary/15 px-1.5 py-0.5 font-label-xs text-label-xs text-primary">当前</span>
                                        ) : null}
                                        <Icon name="chevron_right" className="shrink-0 text-[18px] text-outline group-hover:text-on-surface" />
                                    </button>
                                ))}
                            </div>
                        </section>
                    ) : null}
                </div>
            </div>
            <div className={"fixed bottom-space-lg right-space-lg z-dropdown flex items-center gap-space-sm rounded-lg bg-surface-container-highest px-space-md py-space-sm text-on-surface shadow-2xl transition-all duration-300" + (toast ? "" : " pointer-events-none translate-y-12 opacity-0")}>
                <Icon name="info" className="text-[18px] text-primary" />
                <span className="font-body-sm text-body-sm">{toast}</span>
            </div>
        </main>
    );
}
