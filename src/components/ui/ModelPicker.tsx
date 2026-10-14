import { useEffect, useRef, useState } from "react";
import { modelChoiceLabel } from "../../credentials/board";
import type { ProviderInfo } from "../../credentials/types";
import { Icon } from "../Icon";

export type ModelPickerTone = "composer" | "field" | "chip";

interface ModelPickerProps {
    tone: ModelPickerTone;
    configured: ProviderInfo[];
    value: string;
    label: string;
    title: string;
    onPick: (pair: string) => void | Promise<void>;
}

const toneConfig = {
    composer: {
        placement: "up" as const,
        root: "relative min-w-0",
        trigger:
            "inline-flex max-w-[9.5rem] min-w-0 items-center gap-0.5 rounded-md px-1 py-0.5 text-left outline-none transition-colors hover:bg-composer-chip-hover focus-visible:ring-1 focus-visible:ring-divider/40 sm:max-w-[11rem]",
        label: "min-w-0 flex-1 truncate font-label-sm text-label-sm text-composer-text-secondary",
        menu: "absolute bottom-full right-0 z-dropdown mb-2 min-w-[13rem]",
    },
    field: {
        placement: "down" as const,
        root: "relative w-full min-w-0",
        trigger:
            "flex h-10 w-full items-center justify-between gap-2 rounded bg-surface-container px-space-md text-left outline-none transition-colors hover:bg-surface-container-high focus-visible:ring-1 focus-visible:ring-primary/50",
        label: "min-w-0 flex-1 truncate font-code-sm text-code-sm font-semibold text-on-surface",
        menu: "absolute left-0 right-0 top-full z-dropdown mt-1 min-w-full",
    },
    chip: {
        placement: "down" as const,
        root: "relative min-w-0",
        trigger:
            "inline-flex h-8 max-w-[16rem] min-w-0 items-center gap-1 rounded bg-surface-container px-space-sm text-left outline-none transition-colors hover:bg-surface-container-high focus-visible:ring-1 focus-visible:ring-primary/40",
        label: "min-w-0 flex-1 truncate font-label-sm text-label-sm text-on-surface",
        menu: "absolute left-0 top-full z-dropdown mt-1 min-w-[13rem]",
    },
};

const OPEN_EVENT = "model-picker:open";
let pendingOpen = false;

/** Opens the composer picker now, or as soon as the composer mounts. */
export function requestModelPickerOpen() {
    pendingOpen = true;
    window.dispatchEvent(new Event(OPEN_EVENT));
}

export function ModelPicker({ tone, configured, value, label, title, onPick }: ModelPickerProps) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const config = toneConfig[tone];

    useEffect(() => {
        if (tone !== "composer") return;
        const openFromShortcut = () => {
            pendingOpen = false;
            setOpen(true);
        };
        if (pendingOpen) openFromShortcut();
        window.addEventListener(OPEN_EVENT, openFromShortcut);
        return () => window.removeEventListener(OPEN_EVENT, openFromShortcut);
    }, [tone]);

    useEffect(() => {
        if (!open) return;
        const options = menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]');
        const active = menuRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]');
        (active ?? options?.[0])?.focus();
    }, [open]);

    useEffect(() => {
        if (!open) return;
        function onPointerDown(event: MouseEvent) {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
        }
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                event.preventDefault();
                setOpen(false);
                return;
            }
            if (event.key === "Tab") {
                setOpen(false);
                return;
            }
            if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
            const options = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []);
            if (!options.length) return;
            event.preventDefault();
            const index = options.indexOf(document.activeElement as HTMLButtonElement);
            const step = event.key === "ArrowDown" ? 1 : -1;
            options[(index + step + options.length) % options.length].focus();
        }
        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    async function pick(next: string) {
        try {
            if (next !== value) await onPick(next);
        } finally {
            setOpen(false);
        }
    }

    return (
        <div ref={rootRef} className={config.root}>
            <button
                type="button"
                aria-label="选择模型"
                aria-haspopup="listbox"
                aria-expanded={open}
                title={title}
                onClick={() => setOpen((current) => !current)}
                className={config.trigger}
            >
                <span className={config.label}>{label}</span>
                <Icon
                    name="expand_more"
                    className={`shrink-0 text-[18px] leading-none text-outline transition-transform ${open ? "rotate-180" : ""}`}
                />
            </button>
            {open ? (
                <div ref={menuRef} role="listbox" aria-label="模型列表" className={`popover-panel ${config.menu}`}>
                    {configured.length === 0 ? (
                        <div className="px-3 py-2 font-body-sm text-body-sm text-outline">还没有配置凭据的模型</div>
                    ) : null}
                    {configured.map((provider) => (
                        <div key={provider.id} className="py-0.5">
                            <div className="px-3 py-1 font-label-xs text-label-xs font-medium uppercase tracking-wide text-outline">
                                {provider.name}
                            </div>
                            {provider.models.map((model) => {
                                const pair = `${provider.id}/${model.id}`;
                                const itemLabel = modelChoiceLabel(provider.id, model.id, model.name, provider.flashModelId);
                                const active = value === pair;
                                return (
                                    <button
                                        key={pair}
                                        type="button"
                                        role="option"
                                        aria-selected={active}
                                        onClick={() => void pick(pair)}
                                        className={`flex w-full items-center gap-2 px-3 py-2 text-left font-body-sm text-body-sm outline-none transition-colors focus-visible:bg-surface-container-high ${
                                            active
                                                ? "bg-surface-container-highest text-on-surface"
                                                : "text-on-surface-variant hover:bg-surface-container"
                                        }`}
                                    >
                                        <span className="min-w-0 flex-1 truncate">{itemLabel}</span>
                                        {active ? <Icon name="check" className="shrink-0 text-[16px] text-outline" /> : null}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
