/**
 * Tiny JSONL stand-in for `pi --mode rpc`.
 *
 * Smoke the shell without an API key:
 *   PI_CLI=scripts/pi-rpc-fixture.mjs npm run dev
 *
 * Records are split on `\n` only. This file does not use Node readline.
 */
import { appendFileSync } from "node:fs";
import { StringDecoder } from "node:string_decoder";

const decoder = new StringDecoder("utf8");
let buffer = "";
let streaming = false;
let retried = false;
const steerQueue = [];

function write(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function noteCommand(command) {
  if (!process.env.PI_FIXTURE_LOG) return;
  appendFileSync(
    process.env.PI_FIXTURE_LOG,
    `${JSON.stringify({
      type: command.type,
      streamingBehavior: command.streamingBehavior ?? null,
      message: typeof command.message === "string" ? command.message : null,
    })}\n`,
  );
}

async function emitDeltas(text) {
  const mid = Math.ceil(text.length / 2);
  const head = text.slice(0, mid);
  const tail = text.slice(mid);
  for (const chunk of head) {
    write({
      type: "message_update",
      assistantMessageEvent: { type: "text_delta", contentIndex: 0, delta: chunk },
    });
    await sleep(8);
  }
  for (const chunk of tail) {
    write({
      type: "message_update",
      assistantMessageEvent: { type: "text_delta", contentIndex: 1, delta: chunk },
    });
    await sleep(8);
  }
  write({
    type: "message_update",
    assistantMessageEvent: { type: "text_delta", contentIndex: 0, delta: "!" },
  });
  write({
    type: "message_update",
    assistantMessageEvent: { type: "thinking_delta", contentIndex: 0, delta: "hidden" },
  });
}

async function finishTurn() {
  write({
    type: "message_end",
    message: { role: "assistant", content: [{ type: "text", text: "NOT THE STREAM" }] },
  });
  if (process.env.PI_FIXTURE_RETRY === "1" && !retried) {
    retried = true;
    write({ type: "agent_end", messages: [], willRetry: true });
    await sleep(160);
    write({ type: "auto_retry_start" });
    await sleep(40);
  }
  write({ type: "agent_end", messages: [], willRetry: false });
  streaming = false;
  write({ type: "turn_end" });
  write({ type: "agent_settled" });
}

async function runTurn(message) {
  const text = message === "nudge" ? "nudged" : "pong — fixture stream";
  write({ type: "agent_start" });
  write({ type: "turn_start" });
  write({ type: "message_start", message: { role: "assistant", content: [] } });
  await emitDeltas(text);
  write({
    type: "tool_execution_start",
    toolCallId: "call_fixture",
    toolName: "bash",
    args: { command: "echo fixture" },
  });
  write({
    type: "tool_execution_end",
    toolCallId: "call_fixture",
    toolName: "bash",
    isError: false,
    result: { content: [{ type: "text", text: "fixture\n" }] },
  });
  await finishTurn();
  while (steerQueue.length > 0) {
    const next = steerQueue.shift();
    streaming = true;
    await runTurn(next);
  }
}

async function handle(line) {
  if (!line) return;
  let command;
  try {
    command = JSON.parse(line);
  } catch {
    write({ type: "response", command: "parse", success: false, error: "Failed to parse command" });
    return;
  }
  const id = command.id;
  if (command.type === "get_state") {
    write({
      id,
      type: "response",
      command: "get_state",
      success: true,
      data: {
        model: { provider: "fixture", id: "fixture-small", name: "Fixture" },
        thinkingLevel: "off",
        isStreaming: streaming,
        messageCount: 0,
        sessionId: "fixture-session",
      },
    });
    return;
  }
  if (command.type === "get_messages") {
    write({ id, type: "response", command: "get_messages", success: true, data: { messages: [] } });
    return;
  }
  if (command.type === "new_session") {
    write({ id, type: "response", command: "new_session", success: true, data: { cancelled: false } });
    return;
  }
  if (command.type === "prompt") {
    noteCommand(command);
    if (streaming && !command.streamingBehavior) {
      write({
        id,
        type: "response",
        command: "prompt",
        success: false,
        error: "Agent is already processing. Specify streamingBehavior ('steer' or 'followUp') to queue the message.",
      });
      return;
    }
    if (streaming) {
      steerQueue.push(typeof command.message === "string" ? command.message : "");
      write({ id, type: "response", command: "prompt", success: true });
      return;
    }
    streaming = true;
    write({ id, type: "response", command: "prompt", success: true });
    await runTurn(typeof command.message === "string" ? command.message : "");
    return;
  }
  write({ id, type: "response", command: command.type || "unknown", success: true });
}

function takeLines(chunk, onLine) {
  buffer += typeof chunk === "string" ? chunk : decoder.write(chunk);
  while (true) {
    const newline = buffer.indexOf("\n");
    if (newline === -1) return;
    let line = buffer.slice(0, newline);
    buffer = buffer.slice(newline + 1);
    if (line.endsWith("\r")) line = line.slice(0, -1);
    onLine(line);
  }
}

process.stdin.on("data", (chunk) => {
  takeLines(chunk, (line) => {
    void handle(line);
  });
});

process.stdin.on("end", () => {
  buffer += decoder.end();
  if (buffer.length > 0) void handle(buffer.endsWith("\r") ? buffer.slice(0, -1) : buffer);
});
