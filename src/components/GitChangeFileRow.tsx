import { memo, type ChangeEvent } from "react";
import type { GitFile } from "../git/types";
import { StageCheckbox } from "./ui/StageCheckbox";

function fileLabel(file: GitFile) {
  if (file.index === "?" && file.worktree === "?") return "未跟踪";
  if (file.index === "D" || file.worktree === "D") return "已删除";
  if (file.index === "A") return "新增";
  if (file.index === "R" || file.worktree === "R") return "重命名";
  return "已修改";
}

export interface GitChangeFileRowProps {
  file: GitFile;
  selected: boolean;
  stageBusy: boolean;
  onSelect: (path: string) => void;
  onToggleStage: (path: string, staged: boolean) => void;
  onStageLatest: (path: string) => void;
}

export const GitChangeFileRow = memo(function GitChangeFileRow({
  file,
  selected,
  stageBusy,
  onSelect,
  onToggleStage,
  onStageLatest,
}: GitChangeFileRowProps) {
  const showPartialStage = file.staged && file.worktree !== " ";

  function onCheck(event: ChangeEvent<HTMLInputElement>) {
    onToggleStage(file.path, event.target.checked);
  }

  return (
    <div
      className={`flex items-center gap-2 rounded px-space-sm py-2 ${selected ? "bg-surface-container-high" : "hover:bg-surface-container"}`}
    >
      <StageCheckbox
        checked={file.staged}
        onChange={onCheck}
        aria-label={`${file.staged ? "取消暂存" : "暂存"} ${file.path}`}
      />
      <button type="button" onClick={() => onSelect(file.path)} className="min-w-0 flex-1 text-left">
        <span className="block truncate font-code-sm text-code-sm text-on-surface" title={file.path}>
          {file.path}
        </span>
        <span className="block min-h-4 truncate font-label-xs text-label-xs leading-4 text-on-surface-variant">
          {fileLabel(file)}
        </span>
      </button>
      <div className="flex h-8 w-7 shrink-0 items-center justify-center">
        {showPartialStage ? (
          <button
            type="button"
            disabled={stageBusy}
            onClick={() => onStageLatest(file.path)}
            title={`暂存 ${file.path} 的最新改动`}
            aria-label={`暂存 ${file.path} 的最新改动`}
            className="rounded px-1.5 text-secondary hover:bg-surface-container-high disabled:opacity-50"
          >
            +
          </button>
        ) : null}
      </div>
    </div>
  );
}, (previous, next) => (
  previous.selected === next.selected
  && previous.stageBusy === next.stageBusy
  && previous.file.path === next.file.path
  && previous.file.staged === next.file.staged
  && previous.file.index === next.file.index
  && previous.file.worktree === next.file.worktree
));
