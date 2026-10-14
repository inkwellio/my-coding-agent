import { useSyncExternalStore } from "react";

export type ShortcutAction =
    | "abort"
    | "newSession"
    | "openModelPicker"
    | "nextModel"
    | "previousModel"
    | "cycleThinking";

export interface ShortcutDef {
    id: ShortcutAction;
    label: string;
    description: string;
    defaultKey: string;
}

export const SHORTCUTS: ShortcutDef[] = [
    { id: "abort", label: "中止回复", description: "停止当前正在生成的回答", defaultKey: "escape" },
    { id: "newSession", label: "新建会话", description: "开始一个空白会话", defaultKey: "ctrl+n" },
    { id: "openModelPicker", label: "打开模型选择", description: "展开输入框里的模型下拉菜单", defaultKey: "ctrl+l" },
    { id: "nextModel", label: "下一个模型", description: "在已配置凭据的模型之间向后切换", defaultKey: "ctrl+p" },
    { id: "previousModel", label: "上一个模型", description: "在已配置凭据的模型之间向前切换", defaultKey: "ctrl+shift+p" },
    { id: "cycleThinking", label: "切换思考档位", description: "按当前模型支持的档位依次切换", defaultKey: "shift+tab" },
];

const STORAGE_KEY = "pi.keybindings";
const KEY_ALIASES: Record<string, string> = {
    " ": "space",
    esc: "escape",
    arrowup: "up",
    arrowdown: "down",
    arrowleft: "left",
    arrowright: "right",
};

export type Keybindings = Record<ShortcutAction, string>;

function defaults(): Keybindings {
    return Object.fromEntries(SHORTCUTS.map((item) => [item.id, item.defaultKey])) as Keybindings;
}

function readOverrides(): Partial<Keybindings> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (!parsed || typeof parsed !== "object") return {};
        const result: Partial<Keybindings> = {};
        for (const item of SHORTCUTS) {
            const value = parsed[item.id];
            if (typeof value === "string" && value) result[item.id] = value;
        }
        return result;
    } catch {
        return {};
    }
}

let overrides = readOverrides();
let bindings: Keybindings = { ...defaults(), ...overrides };
const listeners = new Set<() => void>();

function commit(next: Partial<Keybindings>) {
    overrides = next;
    bindings = { ...defaults(), ...overrides };
    try {
        if (Object.keys(overrides).length) localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
        else localStorage.removeItem(STORAGE_KEY);
    } catch {
        // Bindings still apply for this window.
    }
    for (const listener of listeners) listener();
}

export function getKeybindings() {
    return bindings;
}

export function useKeybindings() {
    return useSyncExternalStore(
        (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        getKeybindings,
        getKeybindings,
    );
}

export function setKeybinding(id: ShortcutAction, combo: string) {
    const next = { ...overrides };
    if (combo === SHORTCUTS.find((item) => item.id === id)?.defaultKey) delete next[id];
    else next[id] = combo;
    commit(next);
}

export function resetKeybinding(id: ShortcutAction) {
    const next = { ...overrides };
    delete next[id];
    commit(next);
}

export function resetAllKeybindings() {
    commit({});
}

/** Normalized combo such as `ctrl+shift+p`, or null for a bare modifier press. */
export function comboFromEvent(event: KeyboardEvent): string | null {
    const raw = event.key.toLowerCase();
    if (raw === "control" || raw === "shift" || raw === "alt" || raw === "meta" || raw === "dead") return null;
    const key = KEY_ALIASES[raw] ?? raw;
    const parts: string[] = [];
    if (event.ctrlKey) parts.push("ctrl");
    if (event.altKey) parts.push("alt");
    if (event.shiftKey) parts.push("shift");
    if (event.metaKey) parts.push("meta");
    parts.push(key);
    return parts.join("+");
}

/** Reason a combo cannot be used, or null when it is fine. */
export function comboProblem(combo: string): string | null {
    const parts = combo.split("+");
    const key = parts[parts.length - 1];
    const hasCommandModifier = parts.some((part) => part === "ctrl" || part === "alt" || part === "meta");
    if (!hasCommandModifier && (key.length === 1 || key === "space" || key === "enter" || key === "backspace" || key === "delete")) {
        return "会影响正常输入，请配合 Ctrl 或 Alt 使用";
    }
    return null;
}

const KEY_LABELS: Record<string, string> = {
    ctrl: "Ctrl",
    alt: "Alt",
    shift: "Shift",
    meta: "Win",
    escape: "Esc",
    tab: "Tab",
    enter: "Enter",
    space: "Space",
    backspace: "Backspace",
    delete: "Delete",
    up: "↑",
    down: "↓",
    left: "←",
    right: "→",
};

export function comboKeys(combo: string) {
    return combo.split("+").map((part) => {
        if (KEY_LABELS[part]) return KEY_LABELS[part];
        if (/^f\d{1,2}$/.test(part)) return part.toUpperCase();
        return part.length === 1 ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1);
    });
}

let capturing = false;

/** While the settings page records a new combo, global shortcuts stay quiet. */
export function setShortcutCapture(active: boolean) {
    capturing = active;
}

export function isShortcutCapture() {
    return capturing;
}
