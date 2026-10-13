import { useEffect, useState } from "react";

const EVENT = "app:toast";

export function showToast(text: string) {
    window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: text }));
}

export function ShortcutToast() {
    const [toast, setToast] = useState<{ text: string; key: number } | null>(null);

    useEffect(() => {
        const onToast = (event: Event) => {
            const text = (event as CustomEvent<string>).detail;
            setToast({ text, key: Date.now() });
        };
        window.addEventListener(EVENT, onToast);
        return () => window.removeEventListener(EVENT, onToast);
    }, []);

    useEffect(() => {
        if (!toast) return;
        const timer = window.setTimeout(() => setToast(null), 1800);
        return () => window.clearTimeout(timer);
    }, [toast]);

    if (!toast) return null;
    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-12 z-dropdown flex justify-center">
            <div
                key={toast.key}
                role="status"
                className="popover-panel rounded-lg px-space-md py-space-sm font-label-sm text-label-sm text-on-surface"
            >
                {toast.text}
            </div>
        </div>
    );
}
