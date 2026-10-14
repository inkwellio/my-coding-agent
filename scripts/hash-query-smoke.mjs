import assert from "node:assert/strict";
import { createServer } from "vite";

const server = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "error",
});

try {
    const router = await server.ssrLoadModule("/src/router.ts");

    assert.equal(router.readRoute(""), "workspace");
    assert.equal(router.readRoute("#/"), "workspace");
    assert.equal(router.readRoute("#/diff"), "diff");
    assert.equal(router.readRoute("#/branch?x=1"), "branch");
    assert.equal(router.readRoute("#//history"), "history");
    assert.equal(router.readRoute("#/settings"), "settings");
    assert.equal(router.readRoute("#/credentials"), "credentials");
    assert.equal(router.readRoute("#/onboarding"), "onboarding");
    assert.equal(router.readRoute("#/engine"), "workspace");
    assert.equal(router.readRoute("#/status"), "workspace");

    const params = router.readLocationQuery("#/branch?a=hash&b=2", "?a=search&c=3");
    assert.equal(params.get("a"), "hash");
    assert.equal(params.get("b"), "2");
    assert.equal(params.get("c"), "3");

    console.log("hash query smoke ok");
} finally {
    await server.close();
}
