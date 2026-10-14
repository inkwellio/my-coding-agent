import { useRef, useState, type KeyboardEvent } from "react";
import { ModelSelect } from "./ModelSelect";
import { Icon } from "./Icon";

interface ComposerProps {
    modelLabel?: string | null;
    busy?: boolean;
    /** The assistant is generating: a send becomes a steer and the stop button appears. */
    streaming?: boolean;
    guide?: string | null;
    guideHref?: string | null;
    onDismissGuide?: () => void;
    onSend?: (text: string) => void | boolean | Promise<void | boolean>;
    onStop?: () => void | Promise<unknown>;
}

export function Composer({ modelLabel, busy = false, streaming = false, guide, guideHref = "#/credentials", onDismissGuide, onSend, onStop }: ComposerProps) {
    const [text, setText] = useState("");
    const [stopping, setStopping] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    // A second Enter before the first send resolves must not post the same text twice.
    const sending = useRef(false);

    async function send() {
        const trimmed = text.trim();
        if (!trimmed || busy || !onSend || sending.current) return;
        sending.current = true;
        try {
            const accepted = await onSend(trimmed);
            if (accepted !== false) {
                setText("");
                if (textareaRef.current) textareaRef.current.style.height = "";
            }
        } finally {
            sending.current = false;
        }
    }

    async function stop() {
        if (!onStop || stopping) return;
        setStopping(true);
        try {
            await onStop();
        } finally {
            setStopping(false);
        }
    }

    function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
        if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
        event.preventDefault();
        void send();
    }

    const showStop = streaming && Boolean(onStop) && !text.trim();

    return (
        <div className="bg-surface px-space-md py-space-sm lg:px-space-lg">
            {guide ? (
                <div className="mx-auto mb-space-sm flex max-w-5xl items-start gap-space-sm rounded-lg bg-surface-container px-space-md py-space-sm font-body-sm text-body-sm text-on-surface">
                    <span className="min-w-0 flex-1 whitespace-pre-wrap break-words" data-credential-gate="open">
                        {guide}
                        {guideHref ? (
                            <a href={guideHref} className="ml-space-sm font-medium text-primary hover:underline">打开凭据页</a>
                        ) : null}
                    </span>
                    {onDismissGuide ? (
                        <button
                            type="button"
                            title="关闭提示"
                            aria-label="关闭提示"
                            onClick={onDismissGuide}
                            className="-mr-1 flex h-5 w-5 shrink-0 items-center justify-center rounded text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                        >
                            <Icon name="close" className="text-[15px]" />
                        </button>
                    ) : null}
                </div>
            ) : null}
            <div className="mx-auto flex min-h-11 max-w-5xl items-end gap-2 rounded-pill border border-composer-border bg-composer-surface px-3 py-2 shadow-sm transition-colors focus-within:border-composer-border-focus sm:items-center">
                <textarea
                    ref={textareaRef}
                    data-shortcut-tab
                    className="scrollbar-hidden min-h-6 max-h-32 min-w-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent py-0 font-body-md text-body-md leading-6 text-composer-text outline-none placeholder:text-composer-muted"
                    placeholder={streaming ? "补充说明，会插入当前回答…" : "继续提问…"}
                    aria-label="消息内容；按 Enter 发送，Shift+Enter 换行"
                    rows={1}
                    spellCheck={false}
                    value={text}
                    onChange={(event) => {
                        setText(event.target.value);
                        event.currentTarget.style.height = "auto";
                        event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 128)}px`;
                    }}
                    onKeyDown={onKeyDown}
                />
                <div className="mb-0.5 flex shrink-0 items-center gap-2 border-l border-composer-border pl-2 sm:mb-0">
                    <ModelSelect variant="composer" fallback={modelLabel || undefined} />
                    {showStop ? (
                        <button
                            type="button"
                            title="停止生成"
                            aria-label="停止生成"
                            disabled={stopping}
                            onClick={() => void stop()}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-inverse-surface text-inverse-on-surface transition-opacity enabled:hover:opacity-90 disabled:cursor-wait disabled:opacity-50"
                        >
                            <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" aria-hidden="true">
                                <rect width="10" height="10" rx="1.5" fill="currentColor" />
                            </svg>
                        </button>
                    ) : (
                        <button
                            type="button"
                            title={streaming ? "发送补充说明" : "发送"}
                            aria-label={streaming ? "发送补充说明" : "发送"}
                            disabled={!text.trim() || busy}
                            onClick={() => void send()}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-inverse-surface text-inverse-on-surface transition-opacity enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
                        >
                            <Icon name="arrow_upward" className="text-[20px] leading-none" fill />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
