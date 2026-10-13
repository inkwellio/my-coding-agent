const { spawn } = require("node:child_process");
const { StringDecoder } = require("node:string_decoder");

function createTerminalService(send) {
  const terminals = new Map();

  function stop(id) {
    const terminal = terminals.get(id);
    if (!terminal) return;
    terminals.delete(id);
    terminal.kill();
  }

  function start(id, cwd) {
    stop(id);
    const shell = process.platform === "win32" ? (process.env.ComSpec || "cmd.exe") : (process.env.SHELL || "/bin/sh");
    const windows = process.platform === "win32";
    const child = spawn(shell, windows ? ["/D", "/Q", "/K", "chcp 65001>nul"] : [], {
      cwd,
      env: { ...process.env, TERM: "dumb", NO_COLOR: "1", ...(windows ? { PROMPT: " " } : {}) },
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    terminals.set(id, child);
    for (const stream of [child.stdout, child.stderr]) {
      const decoder = new StringDecoder("utf8");
      stream.on("data", (data) => {
        const text = decoder.write(data);
        if (text) send(id, { type: "output", data: text });
      });
      stream.on("end", () => {
        const text = decoder.end();
        if (text) send(id, { type: "output", data: text });
      });
    }
    child.on("error", (error) => send(id, { type: "error", data: error.message }));
    child.on("close", (code) => {
      if (terminals.get(id) !== child) return;
      terminals.delete(id);
      send(id, { type: "exit", code });
    });
    return { ok: true, cwd };
  }

  function write(id, command) {
    const child = terminals.get(id);
    if (!child || !child.stdin.writable) return { ok: false, message: "终端未运行" };
    if (typeof command !== "string" || command.length > 100_000) return { ok: false, message: "命令无效或过长" };
    const line = command + (process.platform === "win32" ? "\r\n" : "\n");
    child.stdin.write(line);
    return { ok: true };
  }

  return { start, write, stop };
}

module.exports = { createTerminalService };
