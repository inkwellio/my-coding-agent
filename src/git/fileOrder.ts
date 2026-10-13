import type { GitFile, GitStatus } from "./types";

function comparePath(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

/** Keep the list order the user already sees; append new paths sorted at the end. */
export function stableGitFiles(previous: GitFile[] | undefined, incoming: GitFile[]): GitFile[] {
  if (!previous?.length) {
    return [...incoming].sort((a, b) => comparePath(a.path, b.path));
  }
  const byPath = new Map(incoming.map((file) => [file.path, file]));
  const ordered: GitFile[] = [];
  for (const file of previous) {
    const latest = byPath.get(file.path);
    if (latest) {
      ordered.push(latest);
      byPath.delete(file.path);
    }
  }
  const added = [...byPath.values()].sort((a, b) => comparePath(a.path, b.path));
  return [...ordered, ...added];
}

export function withStableFileOrder(previous: GitStatus | null, next: GitStatus): GitStatus {
  if (!next.ok) return next;
  return {
    ...next,
    files: stableGitFiles(previous?.ok ? previous.files : undefined, next.files),
  };
}
