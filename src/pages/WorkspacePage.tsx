import { useEffect, useRef } from "react";
import { Composer } from "../components/Composer";
import { LiveTranscript } from "../components/LiveTranscript";
import { useRpc } from "../rpc/RpcProvider";
import { comboKeys, useKeybindings } from "../shortcuts";

/** Distance from the bottom, in pixels, that still counts as "following" the reply. */
const STICKY_THRESHOLD = 80;

function EmptyConversation() {
    const bindings = useKeybindings();
    const tips: { keys: string[]; label: string }[] = [
        { keys: ["Enter"], label: "发送消息" },
        { keys: ["Shift", "Enter"], label: "换行" },
        { keys: comboKeys(bindings.abort), label: "停止生成" },
        { keys: comboKeys(bindings.newSession), label: "新建会话" },
        { keys: comboKeys(bindings.openModelPicker), label: "选择模型" },
    ];
    return (
        <div className="mx-auto flex h-full w-full max-w-xl flex-col items-center justify-center gap-space-lg p-space-xl text-center">
            <div className="flex flex-col gap-space-xs">
                <h2 className="font-headline-md text-headline-md text-on-surface">开始新的对话</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                    描述你想完成的任务，代理会在当前工作区里读取代码、执行命令并修改文件。
                </p>
            </div>
            <ul className="grid w-full grid-cols-1 gap-space-xs sm:grid-cols-2">
                {tips.map((tip) => (
                    <li key={tip.label} className="flex items-center justify-between rounded-lg bg-surface-container-low px-space-md py-space-sm font-body-sm text-body-sm text-on-surface-variant">
                        <span>{tip.label}</span>
                        <span className="flex gap-1">
                            {tip.keys.map((key, index) => (
                                <kbd key={`${key}-${index}`} className="rounded border border-outline-variant/60 bg-surface-container-high px-1.5 font-code-xs text-code-xs text-on-surface">{key}</kbd>
                            ))}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export function WorkspacePage() {
    const rpc = useRpc();
    const { hydrated } = rpc;
    const scroller = useRef<HTMLDivElement>(null);
    const sticky = useRef(true);
    const live = rpc.status.available;
    const credentialGuide = live && hydrated && !rpc.status.credentials.configured
        ? "模型凭据未配置。API 密钥只留在主进程 AuthStorage（~/.pi/agent/auth.json）或环境变量里，不会进入这个窗口。"
        : null;
    const engineGuide = live && hydrated && (rpc.status.engine === "disconnected" || rpc.status.engine === "reconnecting")
        ? rpc.status.detail
        : null;
    // Engine state outranks a one-off notice; only credential problems link to the credentials page.
    const guide = engineGuide || rpc.notice || credentialGuide;
    const guideHref = !engineGuide && (rpc.notice ? rpc.noticeNeedsCredentials : Boolean(credentialGuide)) ? "#/credentials" : null;
    const streaming = live && rpc.status.engine === "chatting";

    useEffect(() => {
        const node = scroller.current;
        if (!node || rpc.blocks.length === 0 || !sticky.current) return;
        node.scrollTo({ top: node.scrollHeight });
    }, [rpc.blocks]);

    return (
        <main className="flex h-full min-h-0 w-full flex-col bg-surface lg:flex-row">
            <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-surface">
                <div
                    ref={scroller}
                    onScroll={(event) => {
                        const node = event.currentTarget;
                        sticky.current = node.scrollHeight - node.scrollTop - node.clientHeight < STICKY_THRESHOLD;
                    }}
                    className="min-h-0 flex-1 overflow-y-auto"
                >
                    {rpc.blocks.length > 0 ? <LiveTranscript blocks={rpc.blocks} />
                        // History loads once the engine is idle; before that an empty list is not an empty session.
                        : hydrated && !rpc.sessionBusy && (!live || rpc.status.engine === "idle") ? <EmptyConversation /> : null}
                </div>
                <Composer
                    modelLabel={live ? rpc.status.modelLabel : null}
                    busy={rpc.sessionBusy || (live && rpc.status.engine === "reconnecting")}
                    streaming={streaming}
                    guide={guide}
                    guideHref={guideHref}
                    onDismissGuide={!engineGuide && rpc.notice ? rpc.dismissNotice : undefined}
                    onSend={(text) => {
                        // Sending always returns the view to the newest message.
                        sticky.current = true;
                        return rpc.sendPrompt(text);
                    }}
                    onStop={rpc.abort}
                />
            </section>
        </main>
    );
}
