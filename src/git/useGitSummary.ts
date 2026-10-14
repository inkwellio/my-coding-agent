import { useEffect, useState } from "react";

export interface GitSummary {
    branch: string | null;
    changes: number | null;
}

export function useGitSummary(cwd: string): GitSummary {
    const [summary, setSummary] = useState<GitSummary>({ branch: null, changes: null });

    useEffect(() => {
        const desktop = window.piDesktop;
        if (!desktop?.getGitStatus) return;
        let active = true;
        const refresh = () => {
            void desktop.getGitStatus().then((result) => {
                if (!active) return;
                setSummary(result.ok ? { branch: result.branch, changes: result.files.length } : { branch: null, changes: null });
            }).catch(() => {
                if (active) setSummary({ branch: null, changes: null });
            });
        };
        refresh();
        window.addEventListener("focus", refresh);
        window.addEventListener("git:changed", refresh);
        return () => {
            active = false;
            window.removeEventListener("focus", refresh);
            window.removeEventListener("git:changed", refresh);
        };
    }, [cwd]);

    return summary;
}
