/**
 * Drives the window host against scripts/pi-rpc-fixture.mjs.
 * Checks text_delta/contentIndex forwarding, idle after turn_end (not agent_end),
 * and a second prompt sent as streamingBehavior "steer".
 */
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createWindowSession, toWireEvent } from "../electron/rpc-host.mjs";
import { applyRpcEvent } from "../src/rpc/transcript.ts";

const secret = "sk-test-fixture-key-1234";
process.env.ANTHROPIC_API_KEY = secret;
process.env.PI_CLI = new URL("./pi-rpc-fixture.mjs", import.meta.url).pathname;
process.env.PI_FIXTURE_RETRY = "1";
const logDir = mkdtempSync(join(tmpdir(), "pi-fixture-"));
const logPath = join(logDir, "commands.jsonl");
process.env.PI_FIXTURE_LOG = logPath;

const dropped = toWireEvent({
  type: "message_update",
  assistantMessageEvent: { type: "thinking_delta", contentIndex: 0, delta: "hidden" },
});
assert.equal(dropped, null);

const wireDelta = toWireEvent({
  type: "message_update",
  assistantMessageEvent: { type: "text_delta", contentIndex: 1, delta: "B" },
});
assert.equal(wireDelta.deltaKind, "text_delta");
assert.equal(wireDelta.contentIndex, 1);
assert.equal(wireDelta.delta, "B");

const wireEnd = toWireEvent({
  type: "message_end",
  message: { role: "assistant", content: [{ type: "text", text: "cumulative" }] },
});
assert.equal(wireEnd.text, undefined);
assert.equal(wireEnd.role, "assistant");
const wireError = toWireEvent({
  type: "message_end",
  message: { role: "assistant", stopReason: "error", errorMessage: "HTTP 401: invalid API key" },
});
assert.equal(wireError.errorMessage, "HTTP 401: invalid API key");

const events = [];
let armed = false;
let sawTurnEnd = false;
let idleBeforeTurnEnd = false;

const session = createWindowSession({
  webContentsId: 7,
  cwd: process.cwd(),
  cwdWarning: null,
  send(channel, payload) {
    if (channel === "rpc:event") {
      events.push(payload);
      if (payload.type === "turn_end") sawTurnEnd = true;
    }
    if (channel === "rpc:status" && armed && payload.engine === "idle" && !sawTurnEnd) {
      idleBeforeTurnEnd = true;
    }
  },
});

function waitFor(predicate, label) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      if (predicate()) {
        clearInterval(timer);
        resolve();
      } else if (Date.now() - started > 8000) {
        clearInterval(timer);
        reject(new Error(`timeout: ${label}; engine=${session.snapshot().engine}`));
      }
    }, 20);
  });
}

try {
  await session.start();
  await waitFor(() => session.snapshot().engine === "idle", "startup idle");
  assert.equal(JSON.stringify(session.snapshot()).includes(secret), false);
  assert.equal(session.snapshot().credentials.mask, "ANTHROPIC_API_KEY");

  const first = await session.prompt("ping");
  assert.equal(first.ok, true);
  armed = true;
  sawTurnEnd = events.some((event) => event.type === "turn_end");
  const second = await session.prompt("nudge");
  assert.equal(second.ok, true, second.message || "second prompt");

  await waitFor(
    () => session.snapshot().engine === "idle" && events.filter((event) => event.type === "turn_end").length >= 2,
    "idle after steered turn",
  );
  assert.equal(idleBeforeTurnEnd, false);

  const commands = readFileSync(logPath, "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  assert.deepEqual(
    commands.map((command) => command.streamingBehavior),
    [null, "steer"],
  );

  let blocks = [];
  for (const event of events) blocks = applyRpcEvent(blocks, event);
  const assistants = blocks.filter((block) => block.kind === "assistant");
  assert.equal(assistants[0].text, "pong — fixt!ure stream");
  assert.equal(assistants[0].text.includes("NOT THE STREAM"), false);
  assert.equal(assistants[0].text.includes("hidden"), false);
  assert.equal(assistants.at(-1).text, "nud!ged");
  assert.equal(events.some((event) => event.type === "agent_end" && event.willRetry), true);

  console.log("rpc host smoke ok");
} finally {
  await session.stop();
  rmSync(logDir, { recursive: true, force: true });
  delete process.env.ANTHROPIC_API_KEY;
}
