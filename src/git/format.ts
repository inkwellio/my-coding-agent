export function diffTone(line: string) {
    if (line.startsWith("+") && !line.startsWith("+++")) return "bg-tertiary-container/15 text-tertiary";
    if (line.startsWith("-") && !line.startsWith("---")) return "bg-error-container/20 text-error";
    if (line.startsWith("@@")) return "bg-surface-container text-secondary";
    return "text-on-surface-variant";
}

export function relativeTime(unixSeconds: number, now = Date.now()) {
    if (!unixSeconds) return "";
    const seconds = Math.max(0, Math.round(now / 1000 - unixSeconds));
    if (seconds < 60) return "刚刚";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟前`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} 小时前`;
    if (seconds < 86400 * 30) return `${Math.floor(seconds / 86400)} 天前`;
    return new Date(unixSeconds * 1000).toLocaleDateString("zh-CN");
}

/** Fired after HEAD moves (branch switch) so views showing worktree or history reload. */
export const GIT_HEAD_CHANGED = "git:head-changed";

export function notifyHeadChanged() {
    window.dispatchEvent(new Event(GIT_HEAD_CHANGED));
    window.dispatchEvent(new Event("git:changed"));
}
