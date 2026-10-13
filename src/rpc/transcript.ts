import type { HistoryMessage, RpcWireEvent, TranscriptBlock } from "./types";

function nextId(blocks: TranscriptBlock[], prefix: string) {
  return `${prefix}-${blocks.length + 1}`;
}

function patch(blocks: TranscriptBlock[], index: number, block: TranscriptBlock) {
  const next = blocks.slice();
  next[index] = block;
  return next;
}

function lastPendingAssistant(blocks: TranscriptBlock[]) {
  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    const block = blocks[index];
    if (block.kind === "assistant" && block.pending) return index;
  }
  return -1;
}

function joinedText(parts: Record<number, string>) {
  return Object.keys(parts)
    .map((key) => Number(key))
    .filter((index) => Number.isInteger(index))
    .sort((a, b) => a - b)
    .map((index) => parts[index] ?? "")
    .join("");
}

function contentIndexOf(event: RpcWireEvent) {
  const index = event.contentIndex;
  if (typeof index === "number" && Number.isInteger(index) && index >= 0) return index;
  return 0;
}

function openAssistant(blocks: TranscriptBlock[]) {
  const next = blocks.concat({
    id: nextId(blocks, "assistant"),
    kind: "assistant",
    text: "",
    parts: {},
    pending: true,
  });
  return { blocks: next, index: next.length - 1 };
}

/** `fresh` starts a new bubble when the current pending assistant already has text. */
function ensureAssistant(blocks: TranscriptBlock[], fresh: boolean) {
  const index = lastPendingAssistant(blocks);
  if (index === -1) return openAssistant(blocks);
  const current = blocks[index];
  if (current.kind !== "assistant") return openAssistant(blocks);
  if (fresh && current.text !== "") return openAssistant(blocks);
  return { blocks, index };
}

function findTool(blocks: TranscriptBlock[], toolCallId: string) {
  if (!toolCallId) return -1;
  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    const block = blocks[index];
    if (block.kind === "tool" && block.toolCallId === toolCallId) return index;
  }
  return -1;
}

/** Clear pending flags once the engine is idle. `agent_end` must not do this. */
export function settleTranscript(blocks: TranscriptBlock[]) {
  return blocks.map((block) => (block.kind === "user" || !block.pending ? block : { ...block, pending: false }));
}

/**
 * Fold pi RPC events into chat blocks.
 * Assistant text comes only from `text_delta`, joined by `contentIndex`.
 * User echoes are ignored; the composer owns that bubble.
 */
export function applyRpcEvent(blocks: TranscriptBlock[], event: RpcWireEvent): TranscriptBlock[] {
  if (event.type === "message_start") {
    if (event.role && event.role !== "assistant") return blocks;
    return ensureAssistant(blocks, true).blocks;
  }

  if (event.type === "message_end") return blocks;

  if (event.type === "message_update") {
    if (event.deltaKind !== "text_delta" || !event.delta) return blocks;
    const ensured = ensureAssistant(blocks, false);
    const current = ensured.blocks[ensured.index];
    if (current.kind !== "assistant") return blocks;
    const index = contentIndexOf(event);
    const parts = { ...current.parts, [index]: `${current.parts[index] ?? ""}${event.delta}` };
    return patch(ensured.blocks, ensured.index, { ...current, parts, text: joinedText(parts) });
  }

  if (event.type === "tool_execution_start") {
    const toolCallId = event.toolCallId || nextId(blocks, "tool-call");
    return blocks.concat({
      id: nextId(blocks, "tool"),
      kind: "tool",
      toolCallId,
      name: event.toolName || "tool",
      args: event.argsPreview || "",
      output: "",
      pending: true,
      isError: false,
    });
  }

  if (event.type === "tool_execution_update" || event.type === "tool_execution_end") {
    const index = findTool(blocks, event.toolCallId || "");
    if (index === -1) return blocks;
    const current = blocks[index];
    if (current.kind !== "tool") return blocks;
    return patch(blocks, index, {
      ...current,
      output: event.outputPreview || current.output,
      pending: event.type !== "tool_execution_end",
      isError: event.type === "tool_execution_end" ? Boolean(event.isError) : current.isError,
    });
  }

  return blocks;
}

export function appendUserBlock(blocks: TranscriptBlock[], text: string): TranscriptBlock[] {
  return blocks.concat({ id: nextId(blocks, "user"), kind: "user", text });
}

/** Build the same visible blocks from persisted messages after a restart or session switch. */
export function hydrateMessages(messages: HistoryMessage[]): TranscriptBlock[] {
  let blocks: TranscriptBlock[] = [];
  for (const message of messages) {
    if (message.role === "user") {
      blocks = appendUserBlock(blocks, message.text);
    } else if (message.role === "assistant") {
      let textIndex = -1;
      for (const part of message.content) {
        if (part.type === "text" && part.text) {
          const current = blocks[textIndex];
          if (current?.kind === "assistant") {
            blocks = patch(blocks, textIndex, { ...current, text: current.text + part.text, parts: { 0: current.text + part.text } });
          } else {
            blocks = blocks.concat({ id: nextId(blocks, "assistant"), kind: "assistant", text: part.text, parts: { 0: part.text }, pending: false });
            textIndex = blocks.length - 1;
          }
        } else if (part.type === "toolCall") {
          textIndex = -1;
          blocks = blocks.concat({
            id: nextId(blocks, "tool"),
            kind: "tool",
            toolCallId: part.id,
            name: part.name,
            args: part.args,
            output: "",
            pending: true,
            isError: false,
          });
        }
      }
    } else if (message.role === "toolResult") {
      const index = findTool(blocks, message.toolCallId);
      if (index === -1) continue;
      const tool = blocks[index];
      if (tool.kind !== "tool") continue;
      blocks = patch(blocks, index, { ...tool, output: message.text, isError: message.isError, pending: false });
    }
  }
  return settleTranscript(blocks);
}
