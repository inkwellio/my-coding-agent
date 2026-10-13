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
