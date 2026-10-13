import assert from "node:assert/strict";
import { createServer } from "vite";

const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
});

try {
  const router = await server.ssrLoadModule("/src/router.ts");
  const status = await server.ssrLoadModule("/src/status.ts");

  function shell(hash, search = "") {
    const params = router.readLocationQuery(hash, search);
    const bar = status.readStatusFromLocation(params);
    return {
      route: router.readRoute(hash),
      engine: bar.engine,
      sandbox: bar.sandbox,
      dirty: status.readDirtyWorktree(params),
      policy: status.readPolicyNoteOpen(params),
    };
  }

  assert.deepEqual(shell("#/branch?dirty=0"), {
    route: "branch",
    engine: "idle",
    sandbox: "off",
    dirty: false,
    policy: false,
  });

  assert.deepEqual(
    { sandbox: shell("#/engine?sandbox=on").sandbox, policy: shell("#/engine?sandbox=on").policy },
    { sandbox: "on", policy: false },
  );

  assert.deepEqual(shell("#/engine?sandbox=on&policy=1"), {
    route: "engine",
    engine: "idle",
    sandbox: "on",
    dirty: true,
    policy: true,
  });

  assert.equal(shell("#/engine?policy=1", "?sandbox=on").policy, true);
  assert.equal(shell("#/engine?policy=1", "?sandbox=on").sandbox, "on");
  assert.equal(shell("#/branch", "?dirty=0").dirty, false);
  assert.equal(shell("#/engine?sandbox=on", "?sandbox=off").sandbox, "on");
  assert.equal(shell("#/branch?dirty=0", "?dirty=1").dirty, false);
  assert.equal(shell("#/engine").sandbox, "off");
  assert.equal(shell("#/branch").dirty, true);
  assert.equal(shell("#/engine?engine=chatting&sandbox=enabling").engine, "chatting");
  assert.equal(shell("#/engine?engine=chatting&sandbox=enabling").sandbox, "enabling");
  assert.equal(shell("#/engine?engine=nope&sandbox=nope").engine, "idle");
  assert.equal(shell("#/engine?engine=nope&sandbox=nope").sandbox, "off");

  console.log("hash query smoke ok");
} finally {
  await server.close();
}
