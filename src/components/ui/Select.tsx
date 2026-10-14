import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "../Icon";

export interface SelectOption<T extends string> {
    value: T;
    label: string;
    description?: string;
    icon?: string;
}

interface SelectProps<T extends string> {
    label: string;
    value: T;
    options: SelectOption<T>[];
    onChange: (value: T) => void;
    disabled?: boolean;
}

export function Select<T extends string>({ label, value, options, onChange, disabled }: SelectProps<T>) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const labelId = useId();
    const selected = options.find((option) => option.value === value) ?? options[0];

    useEffect(() => {
        if (!open) return;
        menuRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus();
        function onPointerDown(event: MouseEvent) {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
        }
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                event.preventDefault();
                setOpen(false);
                triggerRef.current?.focus();
                return;
            }
            if (event.key === "Tab") {
                setOpen(false);
                return;
            }
            if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
            const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []);
            if (!items.length) return;
            event.preventDefault();
            const index = items.indexOf(document.activeElement as HTMLButtonElement);
            const step = event.key === "ArrowDown" ? 1 : -1;
            items[(index + step + items.length) % items.length].focus();
        }
        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    function pick(next: T) {
        setOpen(false);
        triggerRef.current?.focus();
        if (next !== value) onChange(next);
    }

    return (
        <div ref={rootRef} className="relative space-y-1">
            <span id={labelId} className="block font-label-sm text-label-sm text-on-surface-variant">{label}</span>
            <button
                ref={triggerRef}
                type="button"
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-labelledby={labelId}
                onClick={() => setOpen((current) => !current)}
                onKeyDown={(event) => {
                    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
                        event.preventDefault();
                        setOpen(true);
                    }
                }}
                className={`flex h-10 w-full items-center gap-2.5 rounded-lg border bg-surface-container-lowest px-3 text-left font-body-md text-body-md text-on-surface outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    open ? "border-primary" : "border-outline-variant/40 hover:border-outline-variant focus-visible:border-primary"
                }`}
            >
                {selected?.icon ? <Icon name={selected.icon} className="shrink-0 text-[17px] text-on-surface-variant" /> : null}
                <span className="min-w-0 flex-1 truncate">{selected?.label}</span>
                <Icon
                    name="expand_more"
                    className={`shrink-0 text-[18px] text-outline transition-transform duration-150 ${open ? "rotate-180" : ""}`}
                />
            </button>
            {open ? (
                <div
                    ref={menuRef}
                    role="listbox"
                    aria-labelledby={labelId}
                    className="popover-panel absolute left-0 right-0 top-full z-dropdown mt-1 p-1"
                >
                    {options.map((option) => {
                        const active = option.value === value;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                role="option"
                                aria-selected={active}
                                onClick={() => pick(option.value)}
                                className={`flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left outline-none transition-colors focus-visible:bg-surface-container-high ${
                                    active ? "bg-primary/10" : "hover:bg-surface-container-high"
                                }`}
                            >
                                {option.icon ? (
                                    <Icon
                                        name={option.icon}
                                        className={`mt-px shrink-0 text-[17px] ${active ? "text-primary" : "text-on-surface-variant"}`}
                                    />
                                ) : null}
                                <span className="flex min-w-0 flex-1 flex-col">
                                    <span className={`font-body-md text-body-md ${active ? "font-semibold text-primary" : "text-on-surface"}`}>{option.label}</span>
                                    {option.description ? (
                                        <span className="font-body-xs text-body-xs text-on-surface-variant">{option.description}</span>
                                    ) : null}
                                </span>
                                {active ? <Icon name="check" className="mt-px shrink-0 text-[16px] text-primary" /> : null}
                            </button>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
}
