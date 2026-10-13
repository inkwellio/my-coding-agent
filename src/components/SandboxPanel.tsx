import type { SandboxController } from "../hooks/useSandbox";
import { Icon } from "./Icon";

export function SandboxPanel({ controller }: { controller: SandboxController }) {
    const { available, status, busy, error, setEnabled, install } = controller;
    const enabled = status.state === "on";
    return (
        <section className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-space-lg" aria-label="沙盒设置">
            <div className="flex flex-wrap items-center justify-between gap-space-md">
                <div className="flex items-center gap-space-sm">
                    <Icon name="shield" className={enabled ? "text-tertiary" : "text-outline"} />
                    <h2 className="font-headline-sm text-headline-sm font-semibold">沙盒 · 命令隔离</h2>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                        {status.state === "enabling" ? "正在启用" : enabled ? "已启用" : "未启用"}
                    </span>
                </div>
                <div className="flex gap-space-sm">
                    {status.installRequired ? (
                        <button type="button" disabled={!available || busy} onClick={() => void install()} className="rounded bg-primary px-space-md py-space-sm text-on-primary disabled:opacity-50">
                            {busy ? "正在处理…" : "安装沙盒组件"}
                        </button>
                    ) : null}
                    <button type="button" disabled={!available || busy || status.capability === "unsupported"} onClick={() => void setEnabled(!status.requested)} aria-pressed={enabled} className="rounded bg-surface-container-high px-space-md py-space-sm text-on-surface disabled:opacity-50">
                        {busy ? "正在处理…" : status.requested ? "关闭沙盒" : "启用沙盒"}
                    </button>
                </div>
            </div>
            <p className="mt-space-md font-body-sm text-body-sm text-on-surface-variant">
                隔离代理的 Shell 命令和内置终端，允许修改当前工作区，限制工作区外写入，并阻止外网访问。
                代理的文件编辑工具和 MCP 服务不在此隔离范围内。修改设置会重启当前窗口的引擎和终端；请先等待当前回答结束。
            </p>
            {!available ? <p className="mt-space-sm text-outline">命令隔离仅在桌面窗口中可用。</p> : null}
            {error || status.detail ? <p role="status" className="mt-space-sm whitespace-pre-wrap break-words text-error">{error || status.detail}</p> : null}
            {status.warnings.length ? <p className="mt-space-sm whitespace-pre-wrap text-on-surface-variant">{status.warnings.join("；")}</p> : null}
        </section>
    );
}
