import { createSandboxExecutor, killSandboxChild, SANDBOX_ENV, sandboxMessage } from "./sandbox-execution.mjs";

let executor;
let child;
let closing = false;
async function close(code = 0) {
    if (closing) return;
    closing = true;
    killSandboxChild(child);
    await executor?.reset().catch(() => {});
    process.exit(code);
}
process.on("SIGTERM", () => void close());
process.on("SIGINT", () => void close());
process.on("disconnect", () => void close());
process.on("message", (event) => { if (event?.type === "stop") void close(); });

try {
    const options = JSON.parse(process.env[SANDBOX_ENV] || "null");
    if (!options?.cwd || !options.tempDir) throw new Error("缺少桌面沙盒配置");
    executor = await createSandboxExecutor(options);
    const launched = await executor.launch(
        process.platform === "win32" ? "cmd.exe /D /Q" : "exec /bin/bash --noprofile --norc",
        options.cwd,
    );
    child = launched.child;
    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
    process.stdin.pipe(child.stdin);
    child.stdin.on("error", () => {});
    child.on("error", (error) => {
        process.send?.({ type: "error", message: sandboxMessage(error) });
        void close(1);
    });
    child.on("close", (code) => void close(code ?? 1));
    child.once("spawn", () => process.send?.({ type: "ready" }));
} catch (error) {
    process.send?.({ type: "error", message: sandboxMessage(error) });
    await close(1);
}
