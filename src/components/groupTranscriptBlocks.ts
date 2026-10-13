import type { TranscriptBlock } from "../rpc/types";

type ToolBlock = Extract<TranscriptBlock, { kind: "tool" }>;

export type DisplayBlock = Exclude<TranscriptBlock, { kind: "tool" }> | {
  kind: "tool_group";
  id: string;
  tools: ToolBlock[];
};

/** Keep tool runs in their event order, with one compact entry per consecutive run. */
export function groupTranscriptBlocks(blocks: TranscriptBlock[]): DisplayBlock[] {
  const result: DisplayBlock[] = [];
  let group: Extract<DisplayBlock, { kind: "tool_group" }> | null = null;
  for (const block of blocks) {
    if (block.kind === "tool") {
      if (!group) {
        group = { kind: "tool_group", id: `tools-${block.id}`, tools: [] };
        result.push(group);
      }
      group.tools.push(block);
    } else {
      group = null;
      result.push(block);
    }
  }
  return result;
}
