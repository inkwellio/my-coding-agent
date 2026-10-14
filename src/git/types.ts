export interface GitResult {
    ok: boolean;
    message?: string;
}

export interface GitFile {
    path: string;
    index: string;
    worktree: string;
    staged: boolean;
}

export interface GitStatus extends GitResult {
    branch: string;
    files: GitFile[];
}

export interface GitLocalBranch {
    name: string;
    upstream: string | null;
    ahead: number;
    behind: number;
    gone: boolean;
    /** Unix seconds of the tip commit. */
    date: number;
    current: boolean;
}

export interface GitRemoteBranch {
    name: string;
    date: number;
}

export interface GitBranches extends GitResult {
    /** Branch name, or the short commit hash when HEAD is detached. */
    current: string;
    detached: boolean;
    local: GitLocalBranch[];
    remote: GitRemoteBranch[];
    changes: number;
}

export interface GitCheckoutRequest {
    name: string;
    create?: boolean;
    remote?: boolean;
    stash?: boolean;
}

export interface GitCheckoutResult extends Partial<GitBranches> {
    ok: boolean;
    message?: string;
    branch?: string;
    stashed?: boolean;
}

export interface GitCommit {
    hash: string;
    shortHash: string;
    author: string;
    email: string;
    date: number;
    parents: string[];
    refs: string[];
    subject: string;
}

export interface GitLog extends GitResult {
    ref: string;
    commits: GitCommit[];
    hasMore: boolean;
}

export interface GitLogRequest {
    ref?: string;
    skip?: number;
    limit?: number;
}
