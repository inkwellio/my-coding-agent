export type ThemePreset = "deep-charcoal" | "soft-light";

const STORAGE_KEY = "pi.theme";

export function readThemePreset(): ThemePreset {
    try {
        return localStorage.getItem(STORAGE_KEY) === "soft-light" ? "soft-light" : "deep-charcoal";
    } catch {
        return "deep-charcoal";
    }
}

export function applyThemePreset(preset: ThemePreset) {
    const root = document.documentElement;
    const light = preset === "soft-light";
    root.dataset.theme = light ? "light" : "dark";
    root.classList.toggle("dark", !light);
    // Lets the main process paint new windows in this theme before the page loads.
    window.piDesktop?.setWindowTheme?.(light ? "light" : "dark");
    try {
        localStorage.setItem(STORAGE_KEY, preset);
    } catch {
        /* ignore quota / private mode */
    }
}
