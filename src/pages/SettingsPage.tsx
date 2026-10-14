import { useEffect, useRef, useState } from "react";
import { Icon } from "../components/Icon";
import { ModelSelect } from "../components/ModelSelect";
import { useCredentialBoard } from "../credentials/board";
import { thinkingLevelLabel, useModelSettings } from "../credentials/modelSettings";
import { useRpc } from "../rpc/RpcProvider";
import { applyThemePreset, readThemePreset, type ThemePreset } from "../theme";
import { KeybindingsPanel } from "./KeybindingsPanel";
import { McpPanel } from "./McpPanel";
import { SandboxPanel } from "../components/SandboxPanel";
import type { SandboxController } from "../hooks/useSandbox";

function compactTokens(tokens: number) {
    if (tokens >= 1_000_000) return `${Number((tokens / 1_000_000).toFixed(1))}M`;
    if (tokens >= 1_000) return `${Number((tokens / 1_000).toFixed(1))}K`;
    return String(tokens);
}

type SettingsDomain = "appearance" | "models" | "permissions" | "keybindings" | "plugins";

const themePresetMeta: Record<ThemePreset, { label: string; badge: string; description: string }> = {
    "deep-charcoal": {
        label: "Deep Charcoal",
        badge: "默认",
        description: "低反差无眩光工程暗阶",
    },
    "soft-light": {
        label: "Soft Light",
        badge: "浅色",
        description: "浅色背景 · 高可读日间模式",
    },
};

function navItemClass(active: boolean) {
    return active
        ? "w-full flex items-center gap-space-sm px-space-md py-2.5 rounded text-left transition-all bg-surface-container-high text-primary shadow-sm group"
        : "w-full flex items-center gap-space-sm px-space-md py-2.5 rounded text-left transition-all text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface group";
}

export function SettingsPage({ sandboxController }: { sandboxController: SandboxController }) {
    const board = useCredentialBoard();
    const flashModelId = board.providers.find((provider) => provider.id === "deepseek")?.flashModelId ?? null;
    const [themePreset, setThemePresetState] = useState<ThemePreset>(readThemePreset);

    function setThemePreset(preset: ThemePreset) {
        setThemePresetState(preset);
        applyThemePreset(preset);
    }
    const { status } = useRpc();
    const modelKey = `${board.selected.providerId ?? ""}/${board.selected.modelId ?? ""}|${status.modelLabel ?? ""}|${status.engine === "idle" || status.engine === "chatting"}`;
    const {
        available: modelSettingsAvailable,
        settings: modelSettings,
        error: thinkingError,
        saving: thinkingSaving,
        chooseThinkingLevel,
    } = useModelSettings(modelKey);
    const contextPlaceholder = modelSettingsAvailable ? "读取中…" : "仅在桌面窗口中可用";
    const [activeDomain, setActiveDomain] = useState<SettingsDomain>("appearance");
    const contentScrollerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        contentScrollerRef.current?.scrollTo({ top: 0 });
    }, [activeDomain]);

    return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden">
        <div className="pointer-events-none absolute -top-24 right-1/4 h-96 w-96 rounded-full bg-primary/5 blur-3xl">
        </div>
        <div className="pointer-events-none absolute top-1/3 -left-20 h-80 w-80 rounded-full bg-secondary/5 blur-3xl">
        </div>
        <header className="relative z-10 flex shrink-0 items-center justify-between border-b border-outline-variant/20 bg-surface-container-lowest/60 px-space-lg py-space-md backdrop-blur">
            <div className="flex items-center gap-space-md">
                <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary shadow-sm">
                    <Icon name="tune" className="text-[18px]" />
                </div>
                <div className="flex flex-col">
                    <h1 className="font-headline-sm text-headline-sm font-semibold text-on-surface tracking-tight">
                        工作区偏好设置
                    </h1>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                        控制 IDE 外观视效、模型推理链路及自主执行安全沙箱策略
                    </span>
                </div>
            </div>
        </header>
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
            {/* Left Navigation Dock */}
            <nav className="hidden shrink-0 flex-col justify-between overflow-y-auto border-r border-outline-variant/20 bg-surface-container-lowest/40 p-space-md md:flex md:w-[280px] lg:w-[300px]">
                <div className="flex flex-col gap-space-xs">
                    <div className="px-space-sm py-space-xs text-outline font-label-xs text-label-xs uppercase tracking-wider font-semibold">
                        配置范畴 DOMAINS
                    </div>
                    <button type="button" onClick={() => setActiveDomain("appearance")} className={navItemClass(activeDomain === "appearance")}>
                        <Icon name="palette" className={`text-[17px] ${activeDomain === "appearance" ? "text-primary" : "text-outline group-hover:text-on-surface"}`} fill={activeDomain === "appearance"} />
                        <div className="flex flex-col">
                            <span className={`font-label-md text-label-md ${activeDomain === "appearance" ? "font-semibold text-on-surface" : ""}`}>
                                外观与主题 Appearance
                            </span>
                            <span className={`font-code-sm text-code-sm ${activeDomain === "appearance" ? "text-primary/80" : "text-outline"}`}>
                                Theme Preset
                            </span>
                        </div>
                        {activeDomain === "appearance" ? <Icon name="chevron_right" className="ml-auto text-[16px] text-primary" /> : null}
                    </button>
                    <button type="button" onClick={() => setActiveDomain("models")} className={navItemClass(activeDomain === "models")}>
                        <Icon name="psychology" className={`text-[17px] ${activeDomain === "models" ? "text-primary" : "text-outline group-hover:text-on-surface"}`} />
                        <div className="flex flex-col">
                            <span className={`font-label-md text-label-md ${activeDomain === "models" ? "font-semibold text-on-surface" : ""}`}>
                                模型与计算 Models &amp; Inference
                            </span>
                            <span className={`font-code-sm text-code-sm ${activeDomain === "models" ? "text-primary/80" : "text-outline"}`}>
                                Routing, Reasoning, Context
                            </span>
                        </div>
                        {activeDomain === "models" ? <Icon name="chevron_right" className="ml-auto text-[16px] text-primary" /> : null}
                    </button>
                    <button type="button" onClick={() => setActiveDomain("permissions")} className={navItemClass(activeDomain === "permissions")}>
                        <Icon name="shield" className={`text-[17px] ${activeDomain === "permissions" ? "text-primary" : "text-outline group-hover:text-on-surface"}`} />
                        <div className="flex flex-col">
                            <span className={`font-label-md text-label-md ${activeDomain === "permissions" ? "font-semibold text-on-surface" : ""}`}>
                                权限与安全沙箱 Permissions
                            </span>
                            <span className={`font-code-sm text-code-sm ${activeDomain === "permissions" ? "text-primary/80" : "text-outline"}`}>
                                Terminal, Shell, File Guards
                            </span>
                        </div>
                        {activeDomain === "permissions" ? <Icon name="chevron_right" className="ml-auto text-[16px] text-primary" /> : null}
                    </button>
                    <button type="button" onClick={() => setActiveDomain("keybindings")} className={navItemClass(activeDomain === "keybindings")}>
                        <Icon name="keyboard" className={`text-[17px] ${activeDomain === "keybindings" ? "text-primary" : "text-outline group-hover:text-on-surface"}`} />
                        <div className="flex flex-col">
                            <span className={`font-label-md text-label-md ${activeDomain === "keybindings" ? "font-semibold text-on-surface" : ""}`}>
                                快捷键 Keybindings
                            </span>
                            <span className={`font-code-sm text-code-sm ${activeDomain === "keybindings" ? "text-primary/80" : "text-outline"}`}>
                                Hotkeys
                            </span>
                        </div>
                        {activeDomain === "keybindings" ? <Icon name="chevron_right" className="ml-auto text-[16px] text-primary" /> : null}
                    </button>
                    <button type="button" onClick={() => setActiveDomain("plugins")} className={navItemClass(activeDomain === "plugins")}>
                        <Icon name="hub" className={`text-[17px] ${activeDomain === "plugins" ? "text-primary" : "text-outline group-hover:text-on-surface"}`} />
                        <div className="flex flex-col">
                            <span className={`font-label-md text-label-md ${activeDomain === "plugins" ? "font-semibold text-on-surface" : ""}`}>
                                扩展与 MCP 服务 Plugins &amp; MCP
                            </span>
                            <span className={`font-code-sm text-code-sm ${activeDomain === "plugins" ? "text-primary/80" : "text-outline"}`}>
                                Model Context Protocol
                            </span>
                        </div>
                        {activeDomain === "plugins" ? (
                            <Icon name="chevron_right" className="ml-auto text-[16px] text-primary" />
                        ) : (
                            <span className="ml-auto rounded bg-tertiary-container/30 px-1.5 py-0.5 font-code-sm text-code-sm text-tertiary">
                                MCP
                            </span>
                        )}
                    </button>
                </div>
            </nav>
            {/* Right Main Workspace — only this column scrolls */}
            <div ref={contentScrollerRef} className="min-h-0 min-w-0 flex-1 overflow-y-auto p-space-xl">
                <div className="space-y-space-xl">
                {activeDomain === "appearance" ? (
                <section className="flex flex-col gap-space-md bg-surface-container-low p-space-xl rounded-xl shadow-sm">
                    <div className="flex items-center justify-between pb-space-xs">
                        <div className="flex items-center gap-space-sm">
                            <Icon name="palette" className="text-primary text-[20px]" />
                            <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                                外观与主题 Appearance
                            </h2>
                        </div>
                        <span className="rounded bg-surface-container-high px-2 py-0.5 font-code-sm text-code-sm text-on-surface-variant">
                            Active: {themePresetMeta[themePreset].label}
                        </span>
                    </div>
                    <div className="flex flex-col gap-space-xs">
                        <label className="font-label-sm text-label-sm font-semibold uppercase tracking-wide text-on-surface-variant">
                            工作区配色风格 Theme Preset
                        </label>
                        <div className="grid grid-cols-1 gap-space-md pt-space-xs sm:grid-cols-2 sm:max-w-2xl">
                            <button
                                type="button"
                                aria-pressed={themePreset === "deep-charcoal"}
                                onClick={() => setThemePreset("deep-charcoal")}
                                className={`relative flex flex-col gap-space-sm rounded-lg p-space-md text-left transition-colors ${
                                    themePreset === "deep-charcoal"
                                        ? "bg-surface-container-high shadow-md ring-1 ring-primary/40"
                                        : "bg-surface-container hover:bg-surface-container-high"
                                }`}
                            >
                                {themePreset === "deep-charcoal" ? (
                                    <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-on-primary">
                                        <Icon name="check" className="text-[11px] font-bold" />
                                    </span>
                                ) : null}
                                <div className="flex h-16 flex-col justify-between rounded bg-surface-container-lowest p-2">
                                    <div className="flex gap-1">
                                        <span className="h-2 w-2 rounded-full bg-[#ff5f56]" />
                                        <span className="h-2 w-2 rounded-full bg-[#ffbd2e]" />
                                        <span className="h-2 w-2 rounded-full bg-[#27c93f]" />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="h-1.5 w-12 rounded bg-primary/70" />
                                        <span className="h-1.5 w-6 rounded bg-secondary/50" />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center gap-1.5 font-label-md text-label-md font-semibold text-on-surface">
                                        <span>{themePresetMeta["deep-charcoal"].label}</span>
                                        <span className="font-code-sm text-code-sm font-normal text-tertiary">{themePresetMeta["deep-charcoal"].badge}</span>
                                    </div>
                                    <p className="font-body-sm text-body-sm text-outline">{themePresetMeta["deep-charcoal"].description}</p>
                                </div>
                            </button>
                            <button
                                type="button"
                                aria-pressed={themePreset === "soft-light"}
                                onClick={() => setThemePreset("soft-light")}
                                className={`relative flex flex-col gap-space-sm rounded-lg p-space-md text-left transition-colors ${
                                    themePreset === "soft-light"
                                        ? "bg-surface-container-high shadow-md ring-1 ring-primary/40"
                                        : "bg-surface-container hover:bg-surface-container-high"
                                }`}
                            >
                                {themePreset === "soft-light" ? (
                                    <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-on-primary">
                                        <Icon name="check" className="text-[11px] font-bold" />
                                    </span>
                                ) : null}
                                <div className="flex h-16 flex-col justify-between rounded border border-[#d0d7de] bg-[#f6f8fa] p-2">
                                    <div className="flex gap-1">
                                        <span className="h-2 w-2 rounded-full bg-[#ff5f56]" />
                                        <span className="h-2 w-2 rounded-full bg-[#ffbd2e]" />
                                        <span className="h-2 w-2 rounded-full bg-[#27c93f]" />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="h-1.5 w-12 rounded bg-[#4b51c2]/80" />
                                        <span className="h-1.5 w-6 rounded bg-[#0969da]/50" />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center gap-1.5 font-label-md text-label-md font-semibold text-on-surface">
                                        <span>{themePresetMeta["soft-light"].label}</span>
                                        <span className="font-code-sm text-code-sm font-normal text-secondary">{themePresetMeta["soft-light"].badge}</span>
                                    </div>
                                    <p className="font-body-sm text-body-sm text-outline">{themePresetMeta["soft-light"].description}</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </section>
                ) : null}
                {activeDomain === "models" ? (
                <section className="flex flex-col gap-space-md bg-surface-container-low p-space-xl rounded-xl shadow-sm">
                    <div className="flex items-center gap-space-sm pb-space-xs">
                        <Icon name="cognition" className="text-secondary text-[20px]" />
                        <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                            模型与推理配置 Models &amp; Inference
                        </h2>
                    </div>
                    <div className="max-w-2xl">
                        {/* Main Model */}
                        <div className="flex flex-col gap-space-xs">
                            <label className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">
                                默认主模型 Primary Agent Model
                            </label>
                            <ModelSelect variant="field" />
                            <p className="font-code-sm text-code-sm text-outline">
                                保存 DeepSeek API Key 后，主进程会调用 set_model，切到 DeepSeek V4 Flash。
                                {flashModelId ? <span className="mt-0.5 block font-mono text-[10px] text-on-surface-variant">deepseek/{flashModelId}</span> : null}
                            </p>
                            <a
                                href="#/credentials"
                                className="mt-space-xs inline-flex w-fit items-center gap-2 rounded-lg border border-primary/50 bg-primary/15 px-space-md py-2 font-label-sm text-label-sm font-semibold text-primary shadow-sm transition-colors hover:border-primary hover:bg-primary/25 hover:text-on-primary-container"
                            >
                                <Icon name="vpn_key" className="text-[18px]" />
                                <span>API Key 配置</span>
                                <Icon name="chevron_right" className="text-[16px] opacity-80" />
                            </a>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg pt-space-xs">
                        <div className="flex flex-col gap-space-xs">
                            <div className="flex items-center justify-between">
                                <label className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">
                                    最大上下文窗口 Context Window
                                </label>
                                <span className="font-code-sm text-code-sm text-secondary font-semibold">
                                    {modelSettings?.contextWindow ? `${modelSettings.contextWindow.toLocaleString("en-US")} tokens` : "—"}
                                </span>
                            </div>
                            <div className="h-10 rounded bg-surface-container px-space-md flex items-center justify-between">
                                <span className="font-code-md text-code-md text-on-surface">
                                    {modelSettings?.contextWindow
                                        ? `${compactTokens(modelSettings.contextWindow)} 上下文${modelSettings.maxTokens ? ` · 单次输出上限 ${compactTokens(modelSettings.maxTokens)}` : ""}`
                                        : contextPlaceholder}
                                </span>
                                <Icon name="data_usage" className="text-outline text-[16px]" />
                            </div>
                            <span className="font-code-sm text-code-sm text-outline">
                                {modelSettings?.modelId ? `${modelSettings.providerId}/${modelSettings.modelId} · ${modelSettings.live ? "来自运行中的引擎" : "来自模型目录"}` : "选择模型后显示"}
                            </span>
                        </div>
                        <div className="flex flex-col gap-space-xs">
                            <label className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">
                                深度思考 (Reasoning Effort)
                            </label>
                            <div className="flex h-10 gap-space-xs">
                                {(modelSettings?.levels ?? ["off"]).map((level) => {
                                    const active = modelSettings?.thinkingLevel === level;
                                    return (
                                        <button
                                            key={level}
                                            type="button"
                                            disabled={!modelSettings || modelSettings.levels.length <= 1 || thinkingSaving}
                                            onClick={() => {
                                                if (!active) void chooseThinkingLevel(level);
                                            }}
                                            className={active
                                                ? "flex min-w-0 flex-1 items-center justify-center gap-1 rounded bg-primary-container font-label-sm text-label-sm font-semibold text-on-primary-container shadow-sm"
                                                : "flex min-w-0 flex-1 items-center justify-center rounded bg-surface-container font-label-sm text-label-sm text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:hover:bg-surface-container"}
                                        >
                                            {active && level !== "off" ? <Icon name="auto_awesome" className="text-[14px]" /> : null}
                                            <span className="truncate">{thinkingLevelLabel[level]}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            <span className={`font-code-sm text-code-sm ${thinkingError ? "text-error" : "text-outline"}`}>
                                {thinkingError
                                    ?? (!modelSettings
                                        ? contextPlaceholder
                                        : modelSettings.levels.length <= 1
                                            ? "当前模型不支持深度思考"
                                            : modelSettings.live
                                                ? "切换后立即作用于当前会话，并保存为该模型的默认档位"
                                                : "已保存为该模型的默认档位，引擎启动后生效")}
                            </span>
                        </div>
                    </div>
                </section>
                ) : null}
                {activeDomain === "permissions" ? <SandboxPanel controller={sandboxController} /> : null}
                {activeDomain === "keybindings" ? <KeybindingsPanel /> : null}
                {activeDomain === "plugins" ? <McpPanel /> : null}
                </div>
            </div>
        </div>
    </div>
    );
}
