import type { TranscriptBlock } from "../rpc/types";
import { Icon } from "./Icon";
import { MarkdownContent } from "./MarkdownContent";
import { groupTranscriptBlocks, type DisplayBlock } from "./groupTranscriptBlocks";

function AssistantBlock({ block }: { block: Extract<TranscriptBlock, { kind: "assistant" }> }) {
  return (
    <article className="flex min-w-0 flex-col gap-space-sm">
      {block.pending ? (
        <span className="inline-flex w-fit items-center gap-1.5 font-code-sm text-code-sm text-outline">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary" />
          正在回复…
        </span>
      ) : null}
      {block.text ? (
        <MarkdownContent text={block.text} />
      ) : block.pending ? (
        <span className="text-on-surface-variant">…</span>
      ) : null}
    </article>
  );
}

function ToolGroup({ group }: { group: Extract<DisplayBlock, { kind: "tool_group" }> }) {
  const running = group.tools.some((tool) => tool.pending);
  const failed = group.tools.filter((tool) => tool.isError).length;
  return (
    <details className="group min-w-0 rounded-lg border border-outline-variant/50 bg-surface-container-low text-on-surface-variant">
      <summary className="flex cursor-pointer list-none items-center gap-space-sm px-space-md py-space-sm hover:text-on-surface">
        <Icon name="chevron_right" className="shrink-0 text-[16px] transition-transform group-open:rotate-90" />
        <Icon name="terminal" className="shrink-0 text-[15px] text-secondary" />
        <span className="shrink-0 font-label-sm text-label-sm font-medium">执行过程 · {group.tools.length} 次工具调用</span>
        <span className="min-w-0 truncate font-code-sm text-code-sm text-outline">
          {group.tools.map((tool) => tool.name).join(" · ")}
        </span>
        <span className={`ml-auto shrink-0 font-code-sm text-code-sm ${failed ? "text-error" : running ? "text-secondary" : "text-tertiary"}`}>
          {running ? `运行中${failed ? ` · ${failed} 次失败` : ""}` : failed ? `${failed} 次失败` : "已完成"}
        </span>
      </summary>
      <div className="space-y-space-xs border-t border-outline-variant/50 p-space-sm">
        {group.tools.map((tool) => (
          <details key={tool.id} className="rounded bg-surface-container-lowest">
            <summary className="flex cursor-pointer list-none items-center gap-space-sm px-space-sm py-space-xs font-label-sm text-label-sm">
              <Icon name="chevron_right" className="text-[14px]" />
              <span className="min-w-0 truncate">{tool.name}</span>
              <span className={`ml-auto shrink-0 ${tool.isError ? "text-error" : tool.pending ? "text-secondary" : "text-tertiary"}`}>
                {tool.pending ? "运行中" : tool.isError ? "失败" : "完成"}
              </span>
            </summary>
            <div className="space-y-space-xs border-t border-outline-variant/30 p-space-sm">
              {tool.args ? (
                <pre className="max-h-48 select-text overflow-auto whitespace-pre-wrap break-all font-code-sm text-code-sm text-on-surface-variant">{tool.args}</pre>
              ) : null}
              {tool.output ? (
                <pre className="max-h-64 select-text overflow-auto whitespace-pre-wrap break-all rounded bg-surface-container p-space-sm font-code-sm text-code-sm text-on-surface">{tool.output}</pre>
              ) : null}
            </div>
          </details>
        ))}
      </div>
    </details>
  );
}

function UserBlock({ block }: { block: Extract<TranscriptBlock, { kind: "user" }> }) {
  return (
    <article className="group relative w-full">
      <div className="select-text whitespace-pre-wrap rounded-2xl border border-composer-border/80 bg-composer-surface px-space-lg py-space-md font-body-md text-body-md leading-relaxed text-composer-text shadow-sm">
        {block.text}
      </div>
    </article>
  );
}

export function LiveTranscript({ blocks }: { blocks: TranscriptBlock[] }) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-space-xl p-space-lg lg:p-space-xl">
      {groupTranscriptBlocks(blocks).map((block) => {
        if (block.kind === "user") return <UserBlock key={block.id} block={block} />;
        if (block.kind === "tool_group") return <ToolGroup key={block.id} group={block} />;
        return <AssistantBlock key={block.id} block={block} />;
      })}
    </div>
  );
}
