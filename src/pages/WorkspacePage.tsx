import { useEffect, useRef } from "react";
import { Composer } from "../components/Composer";
import { LiveTranscript } from "../components/LiveTranscript";
import { useRpc } from "../rpc/RpcProvider";

export function WorkspacePage() {
    const rpc = useRpc();
    const { hydrated } = rpc;
    const scroller = useRef<HTMLDivElement>(null);
    const live = rpc.status.available;
    const credentialGuide = live && hydrated && !rpc.status.credentials.configured
        ? "模型凭据未配置。API 密钥只留在主进程 AuthStorage（~/.pi/agent/auth.json）或环境变量里，不会进入这个窗口。"
        : null;
    const engineGuide = live && hydrated && (rpc.status.engine === "disconnected" || rpc.status.engine === "reconnecting")
        ? rpc.status.detail
        : null;
    const guide = engineGuide || rpc.notice || credentialGuide;

    useEffect(() => {
        const node = scroller.current;
        if (!node || rpc.blocks.length === 0) return;
        node.scrollTo({ top: node.scrollHeight });
    }, [rpc.blocks]);

    return (
        <main className="flex h-full min-h-0 w-full flex-col bg-surface lg:flex-row">
            <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-surface">
        
                <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
                    {rpc.blocks.length > 0 && <LiveTranscript blocks={rpc.blocks} />}
                </div>
                <Composer
                    modelLabel={live ? rpc.status.modelLabel : null}
                    busy={rpc.sessionBusy || (live && rpc.status.engine === "reconnecting")}
                    guide={guide}
                    guideHref={engineGuide ? null : "#/credentials"}
                    onSend={(text) => rpc.sendPrompt(text)}
                />
            </section>
        </main>
    );
}
