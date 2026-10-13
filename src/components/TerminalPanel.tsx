import { useEffect, useRef, useState, type FormEvent } from "react";

export function TerminalPanel({ cwd, width, onClose }: { cwd: string; width: number; onClose: () => void }) {
  const [output, setOutput] = useState("");
  const [command, setCommand] = useState("");
  const [running, setRunning] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const desktop = window.piDesktop;
    if (!desktop) return;
    let active = true;
    setOutput("");
    setRunning(false);
    const unsubscribe = desktop.onTerminalEvent((event) => {
      if (!active) return;
      if (event.type === "exit") {
        setRunning(false);
        setOutput((value) => value + `\n[Shell 已退出，代码 ${event.code ?? "未知"}]\n`);
      } else {
        setOutput((value) => (value + (event.data || "")).slice(-200_000));
      }
    });
    void desktop.startTerminal().then((result) => {
      if (!active) return;
      setRunning(result.ok);
      setOutput(result.ok ? `工作目录：${result.cwd}\n` : `${result.message || "启动终端失败"}\n`);
    }).catch((error) => { if (active) setOutput(`${String(error)}\n`); });
    return () => {
      active = false;
      unsubscribe();
      void desktop.stopTerminal();
    };
  }, [cwd]);

  useEffect(() => { outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight }); }, [output, command]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = command;
    if (!value.trim() || !running) return;
    setOutput((current) => current + `${current.endsWith("\n") ? "" : "\n"}$ ${value}\n`);
    setCommand("");
    void window.piDesktop?.writeTerminal(value).then((result) => {
      if (!result.ok) setOutput((current) => current + `${result.message || "发送命令失败"}\n`);
    });
  }

  return (
    <aside
      style={{ width }}
      className="flex h-full min-h-0 shrink-0 flex-col bg-surface-container-lowest text-on-surface shadow-[-10px_0_28px_rgba(0,0,0,0.18)]"
      aria-label="终端"
    >
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-outline-variant/30 px-space-sm font-label-sm text-label-sm">
        <span className="min-w-0 truncate" title={cwd}>终端 · {cwd}</span>
        <button type="button" onClick={onClose} className="rounded px-2 py-1 hover:bg-surface-container-high" aria-label="关闭终端">×</button>
      </div>
      <div ref={outputRef} onClick={() => inputRef.current?.focus()} className="min-h-0 flex-1 cursor-text overflow-auto p-space-sm font-code-sm text-code-sm">
        <pre className="whitespace-pre-wrap break-all">{output}</pre>
        {running ? (
          <form onSubmit={submit} className="flex min-w-0 items-baseline gap-2">
            <span className="shrink-0">$</span>
            <input ref={inputRef} autoFocus value={command} onChange={(event) => setCommand(event.target.value)} aria-label="终端命令" className="min-w-0 flex-1 bg-transparent text-on-surface outline-none" autoComplete="off" spellCheck={false} />
          </form>
        ) : null}
      </div>
    </aside>
  );
}
