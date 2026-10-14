/** @type {import('tailwindcss').Config} */
const sans = [
    "Geist",
    "Noto Sans SC",
    "WenQuanYi Micro Hei",
    "PingFang SC",
    "Hiragino Sans GB",
    "Microsoft YaHei",
    "sans-serif",
];

const mono = ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"];

const config = {
    darkMode: "class",
    content: ["./index.html", "./src/**/*.{ts,tsx}"],
    theme: {
        extend: {
            colors: {
                "inverse-surface": "#e1e2e9",
                "surface-container": "#1d2025",
                "surface-container-high": "#272a2f",
                "surface-tint": "#bfc1ff",
                "inverse-on-surface": "#2e3036",
                "on-secondary-container": "#00374d",
                outline: "#908f9f",
                "on-surface-variant": "#c7c5d5",
                "on-tertiary-container": "#00311f",
                "on-tertiary": "#003824",
                primary: "#bfc1ff",
                "on-surface": "#e1e2e9",
                "tertiary-container": "#00a572",
                "outline-variant": "#464653",
                "surface-container-lowest": "#0b0e13",
                "inverse-primary": "#4b51c2",
                tertiary: "#4edea3",
                surface: "#101418",
                "error-container": "#93000a",
                "on-error-container": "#ffdad6",
                "surface-dim": "#101418",
                "on-background": "#e1e2e9",
                secondary: "#7bd0ff",
                "primary-container": "#7f85f9",
                background: "#101418",
                "on-primary-container": "#0d0b8e",
                error: "#ffb4ab",
                "secondary-container": "#00a6e0",
                "on-primary": "#171994",
                "surface-bright": "#36393f",
                "surface-variant": "#32353a",
                "on-error": "#690005",
                "on-secondary": "#00354a",
                "surface-container-low": "#191c21",
                "surface-container-highest": "#32353a",
                composer: {
                    surface: "#232323",
                    border: "#3b3b3b",
                    "border-focus": "#606060",
                    text: "#f1f1f1",
                    "text-secondary": "#d7d7d7",
                    muted: "#8f8f8f",
                    chip: "#3b3b3b",
                    "chip-hover": "#505050",
                },
                divider: "#ffffff",
                warning: "#ffb95f",
                "window-close": "#c42b1c",
            },
            zIndex: {
                sidebar: "40",
                chrome: "50",
                dropdown: "100",
            },
            borderRadius: {
                DEFAULT: "0.125rem",
                xs: "0.125rem",
                sm: "0.25rem",
                md: "0.375rem",
                lg: "0.5rem",
                xl: "0.75rem",
                "2xl": "1rem",
                pill: "1.5rem",
                full: "9999px",
            },
            spacing: {
                "space-xl": "1.5rem",
                "space-xs": "0.25rem",
                margin: "1rem",
                "space-md": "0.75rem",
                "space-lg": "1rem",
                "space-sm": "0.5rem",
                gutter: "0.75rem",
            },
            fontFamily: {
                // Unprefixed text (and preflight's html default) uses the app stack, not Tailwind's.
                sans,
                mono,
                "headline-lg": sans,
                "headline-md": sans,
                "headline-sm": sans,
                "body-lg": sans,
                "body-md": sans,
                "body-sm": sans,
                "body-xs": sans,
                "label-md": sans,
                "label-sm": sans,
                "label-xs": sans,
                "code-md": mono,
                "code-sm": mono,
                "code-xs": mono,
            },
            fontSize: {
                "headline-lg": ["1.5rem", { lineHeight: "2rem", letterSpacing: "-0.02em", fontWeight: "600" }],
                "headline-md": ["1.25rem", { lineHeight: "1.75rem", letterSpacing: "-0.015em", fontWeight: "600" }],
                "headline-sm": ["1.0625rem", { lineHeight: "1.5rem", letterSpacing: "-0.01em", fontWeight: "500" }],
                "body-lg": ["0.9375rem", { lineHeight: "1.5rem", fontWeight: "400" }],
                "body-md": ["0.875rem", { lineHeight: "1.375rem", fontWeight: "400" }],
                "body-sm": ["0.8125rem", { lineHeight: "1.25rem", fontWeight: "400" }],
                "body-xs": ["0.75rem", { lineHeight: "1.125rem", fontWeight: "400" }],
                "label-md": ["0.8125rem", { lineHeight: "1rem", letterSpacing: "0.01em", fontWeight: "500" }],
                "label-sm": ["0.75rem", { lineHeight: "0.875rem", letterSpacing: "0.02em", fontWeight: "500" }],
                "label-xs": ["0.6875rem", { lineHeight: "0.75rem", letterSpacing: "0.04em", fontWeight: "600" }],
                "code-md": ["0.8125rem", { lineHeight: "1.375rem", fontWeight: "400" }],
                "code-sm": ["0.75rem", { lineHeight: "1.25rem", fontWeight: "400" }],
                "code-xs": ["0.6875rem", { lineHeight: "1rem", fontWeight: "400" }],
            },
        },
    },
    plugins: [],
};

const lightPalette = {
    surface: "#f7f8fb",
    "surface-dim": "#e3e5ea",
    background: "#f7f8fb",
    "surface-bright": "#ffffff",
    "surface-variant": "#e1e2ec",
    "surface-container-lowest": "#ffffff",
    "surface-container-low": "#f1f3f7",
    "surface-container": "#eceef3",
    "surface-container-high": "#e4e7ed",
    "surface-container-highest": "#dadde4",
    "on-surface": "#1a1c22",
    "on-background": "#1a1c22",
    "on-surface-variant": "#464653",
    outline: "#767586",
    "outline-variant": "#c7c5d5",
    "inverse-surface": "#2e3036",
    "inverse-on-surface": "#f0f0f7",
    primary: "#4b51c2",
    "on-primary": "#ffffff",
    "primary-container": "#e1e0ff",
    "on-primary-container": "#03006d",
    "inverse-primary": "#bfc1ff",
    "surface-tint": "#4b51c2",
    secondary: "#00658d",
    "on-secondary": "#ffffff",
    "secondary-container": "#c4e7ff",
    "on-secondary-container": "#001e2c",
    tertiary: "#006c4a",
    "on-tertiary": "#ffffff",
    "tertiary-container": "#6ffbbe",
    "on-tertiary-container": "#002113",
    error: "#ba1a1a",
    "on-error": "#ffffff",
    "error-container": "#ffdad6",
    "on-error-container": "#410002",
    "composer-surface": "#ffffff",
    "composer-border": "#d0d4dc",
    "composer-border-focus": "#9aa0ab",
    "composer-text": "#1a1c22",
    "composer-text-secondary": "#464653",
    "composer-muted": "#8a8d96",
    "composer-chip": "#eceef3",
    "composer-chip-hover": "#dadde4",
    divider: "#000000",
    warning: "#8a5100",
    "window-close": "#c42b1c",
};

function flatten(colors, prefix = "") {
    const out = {};
    for (const [key, value] of Object.entries(colors)) {
        const name = prefix ? `${prefix}-${key}` : key;
        if (typeof value === "string") out[name] = value;
        else Object.assign(out, flatten(value, name));
    }
    return out;
}

function channels(hex) {
    const value = hex.replace("#", "");
    return [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16)).join(" ");
}

function toVars(colors, prefix = "") {
    const out = {};
    for (const [key, value] of Object.entries(colors)) {
        const name = prefix ? `${prefix}-${key}` : key;
        out[key] = typeof value === "string" ? `rgb(var(--c-${name}) / <alpha-value>)` : toVars(value, name);
    }
    return out;
}

const darkPalette = flatten(config.theme.extend.colors);
const cssVars = (palette) => Object.fromEntries(Object.entries(palette).map(([name, hex]) => [`--c-${name}`, channels(hex)]));

config.theme.extend.colors = toVars(config.theme.extend.colors);
config.plugins.push(({ addBase }) => {
    addBase({
        ":root": { ...cssVars(darkPalette), colorScheme: "dark" },
        '[data-theme="light"]': { ...cssVars(lightPalette), colorScheme: "light" },
    });
});

module.exports = config;
