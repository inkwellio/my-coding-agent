/**
 * Launches Pi's CLI with Electron's bundled Node runtime.
 *
 * The desktop app spawns `<electron> pi-bootstrap.mjs <pi-cli> ...args` with
 * ELECTRON_RUN_AS_NODE=1 so that a packaged build does not need a system Node.
 * The flag is removed before Pi starts so it does not leak into commands Pi
 * spawns (for example an Electron-based editor launched from a Bash tool).
 */
import { pathToFileURL } from "node:url";

delete process.env.ELECTRON_RUN_AS_NODE;

const [cliPath, ...rest] = process.argv.slice(2);
if (!cliPath) {
    process.stderr.write("pi-bootstrap: missing Pi CLI path\n");
    process.exit(2);
}
process.argv = [process.argv[0], cliPath, ...rest];
await import(pathToFileURL(cliPath).href);
