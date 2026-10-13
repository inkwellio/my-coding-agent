import { useRef, useState, type KeyboardEvent } from "react";
import { ModelSelect } from "./ModelSelect";
import { Icon } from "./Icon";

interface ComposerProps {
  modelLabel?: string | null;
  busy?: boolean;
  guide?: string | null;
  onSend?: (text: string) => void | boolean | Promise<void | boolean>;
}

export function Composer({ modelLabel, busy = false, guide, onSend }: ComposerProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const label = modelLabel || "Sonnet-3.5";

  async function send() {
    const trimmed = text.trim();
    if (!trimmed || busy || !onSend) return;
    const accepted = await onSend(trimmed);
    if (accepted !== false) {
      setText("");
      if (textareaRef.current) textareaRef.current.style.height = "";
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    send();
  }

  return (
    <div className="bg-surface px-space-md py-space-sm lg:px-space-lg">
      {guide ? (
        <div className="mx-auto mb-space-sm flex max-w-5xl flex-wrap items-center gap-space-sm rounded-lg bg-surface-container px-space-md py-space-sm font-body-sm text-body-sm text-on-surface">
          <span data-credential-gate="open">{guide}</span>
          <a href="#/credentials" className="font-medium text-primary hover:underline">
            打开凭据页
          </a>
        </div>
      ) : null}
      <div className="mx-auto flex min-h-11 max-w-5xl items-end gap-2 rounded-pill border border-composer-border bg-composer-surface px-3 py-2 shadow-sm transition-colors focus-within:border-composer-border-focus sm:items-center">
        <button
          type="button"
          title="添加文件"
          aria-label="添加文件"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-composer-chip text-composer-text-secondary transition-colors hover:bg-composer-chip-hover"
        >
          <Icon name="add" className="text-[18px]" />
        </button>
        <textarea
          ref={textareaRef}
          className="scrollbar-hidden min-h-6 max-h-32 min-w-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent py-0 font-body-md text-body-md leading-6 text-composer-text outline-none placeholder:text-composer-muted"
          placeholder="继续提问…"
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
          <ModelSelect variant="composer" fallback={label} />
          <button
            type="button"
            title="发送"
            aria-label="发送"
            disabled={!text.trim() || busy}
            onClick={() => void send()}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-inverse-surface text-inverse-on-surface transition-opacity enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Icon name="arrow_upward" className="text-[20px] leading-none" fill />
          </button>
        </div>
      </div>
    </div>
  );
}
