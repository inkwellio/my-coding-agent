import { useEffect, useState } from "react";
import { Icon } from "../components/Icon";
import {
  SHORTCUTS,
  comboFromEvent,
  comboKeys,
  comboProblem,
  resetAllKeybindings,
  resetKeybinding,
  setKeybinding,
  setShortcutCapture,
  useKeybindings,
  type ShortcutAction,
} from "../shortcuts";

function KeyChips({ combo }: { combo: string }) {
  return (
    <span className="flex items-center gap-1">
      {comboKeys(combo).map((key, index) => (
        <kbd
          key={`${key}-${index}`}
          className="min-w-[1.75rem] rounded-md border border-outline-variant/60 bg-surface-container-high px-1.5 py-0.5 text-center font-code-sm text-code-sm font-semibold text-on-surface shadow-[inset_0_-1px_0_rgb(var(--c-outline-variant)/0.6)]"
        >
          {key}
        </kbd>
      ))}
    </span>
  );
}

export function KeybindingsPanel() {
  const bindings = useKeybindings();
  const [recording, setRecording] = useState<ShortcutAction | null>(null);
  const [error, setError] = useState<{ id: ShortcutAction; text: string } | null>(null);
  const customized = SHORTCUTS.some((item) => bindings[item.id] !== item.defaultKey);

  useEffect(() => {
    if (!recording) return;
    setShortcutCapture(true);
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const combo = comboFromEvent(event);
      if (!combo) return;
      if (combo === "escape") {
        setRecording(null);
        return;
      }
      const problem = comboProblem(combo);
      if (problem) {
        setError({ id: recording, text: problem });
        return;
      }
      const owner = SHORTCUTS.find((item) => item.id !== recording && bindings[item.id] === combo);
      if (owner) {
        setError({ id: recording, text: `已被「${owner.label}」占用` });
        return;
      }
      setKeybinding(recording, combo);
      setError(null);
      setRecording(null);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      setShortcutCapture(false);
    };
  }, [recording, bindings]);

  return (
    <section className="flex flex-col gap-space-md rounded-xl bg-surface-container-low p-space-xl shadow-sm">
      <div className="flex items-center justify-between gap-space-md pb-space-xs">
        <div className="flex items-center gap-space-sm">
          <Icon name="keyboard" className="text-[20px] text-secondary" />
          <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">快捷键 Keybindings</h2>
        </div>
        <button
          type="button"
          disabled={!customized}
          onClick={() => {
            resetAllKeybindings();
            setError(null);
            setRecording(null);
          }}
          className="flex h-8 items-center gap-1.5 rounded bg-surface-container px-space-md font-label-sm text-label-sm text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-surface-container"
        >
          <Icon name="restart_alt" className="text-[15px]" />
          <span>全部恢复默认</span>
        </button>
      </div>
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        点击「修改」后按下新的组合键，按 Esc 取消。修改立即生效并保存在本机。
      </p>
      <div className="overflow-hidden rounded-lg border border-outline-variant/30">
        {SHORTCUTS.map((item, index) => {
          const combo = bindings[item.id];
          const isRecording = recording === item.id;
          const rowError = error?.id === item.id ? error.text : null;
          return (
            <div
              key={item.id}
              className={`flex items-center gap-space-md px-space-md py-space-sm ${index > 0 ? "border-t border-outline-variant/20" : ""} ${isRecording ? "bg-primary/10" : "bg-surface-container-lowest/40"}`}
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="font-label-md text-label-md font-semibold text-on-surface">{item.label}</span>
                <span className={`truncate font-body-sm text-body-sm ${rowError ? "text-error" : "text-outline"}`}>
                  {rowError ?? item.description}
                </span>
              </div>
              {isRecording ? (
                <span className="rounded-md border border-dashed border-primary/70 px-space-sm py-0.5 font-code-sm text-code-sm text-primary">
                  请按下组合键…
                </span>
              ) : (
                <KeyChips combo={combo} />
              )}
              <div className="flex w-[8.5rem] shrink-0 justify-end gap-1">
                {combo !== item.defaultKey && !isRecording ? (
                  <button
                    type="button"
                    title="恢复默认"
                    aria-label={`恢复「${item.label}」默认快捷键`}
                    onClick={() => {
                      resetKeybinding(item.id);
                      if (error?.id === item.id) setError(null);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded text-outline transition-colors hover:bg-surface-container-high hover:text-on-surface"
                  >
                    <Icon name="restart_alt" className="text-[16px]" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setRecording(isRecording ? null : item.id);
                  }}
                  className={isRecording
                    ? "h-8 rounded px-space-md font-label-sm text-label-sm text-on-surface-variant transition-colors hover:bg-surface-container-high"
                    : "h-8 rounded bg-surface-container px-space-md font-label-sm text-label-sm text-on-surface transition-colors hover:bg-surface-container-high"}
                >
                  {isRecording ? "取消" : "修改"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <p className="font-code-sm text-code-sm text-outline">
        「中止回复」只在助手生成时生效；聊天输入框中 Enter 发送、Shift + Enter 换行。Pi 终端界面的快捷键（~/.pi/agent/keybindings.json）不作用于桌面窗口。
      </p>
    </section>
  );
}
