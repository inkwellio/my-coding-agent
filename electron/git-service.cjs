const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const fs = require("node:fs/promises");
const path = require("node:path");

const exec = promisify(execFile);

async function git(cwd, args, options = {}) {
  const { stdout } = await exec("git", args, { cwd, encoding: "utf8", maxBuffer: 16 * 1024 * 1024, ...options });
  return stdout;
}

function errorMessage(error) {
  return (error?.stderr || error?.message || "Git 操作失败").trim();
}

async function status(cwd) {
  try {
    const root = (await git(cwd, ["rev-parse", "--show-toplevel"])).trim();
    const raw = await git(root, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
    const records = raw.split("\0");
    const files = [];
    for (let i = 0; i < records.length && records[i]; i += 1) {
      const record = records[i];
      const index = record.slice(0, 1);
      const worktree = record.slice(1, 2);
      const filePath = record.slice(3);
      files.push({ path: filePath, index, worktree, staged: index !== " " && index !== "?" });
      if (index === "R" || index === "C" || worktree === "R" || worktree === "C") i += 1;
    }
    const branch = (await git(root, ["branch", "--show-current"])).trim() || "HEAD";
    return { ok: true, branch, files };
  } catch (error) {
    return { ok: false, message: errorMessage(error), branch: "", files: [] };
  }
}

async function diff(cwd, filePath) {
  const current = await status(cwd);
  if (!current.ok) return current;
  const file = current.files.find((item) => item.path === filePath);
  if (!file) return { ok: false, message: "文件不在当前变更列表中" };
  try {
    const root = (await git(cwd, ["rev-parse", "--show-toplevel"])).trim();
    const parts = [];
    if (file.staged) parts.push(await git(root, ["diff", "--cached", "--no-ext-diff", "--", filePath]));
    if (file.worktree !== " " && file.worktree !== "?") {
      parts.push(await git(root, ["diff", "--no-ext-diff", "--", filePath]));
    }
    if (file.index === "?" && file.worktree === "?") {
      const absolute = path.resolve(root, filePath);
      if (absolute !== root && absolute.startsWith(root + path.sep)) {
        const info = await fs.lstat(absolute);
        if (!info.isFile()) parts.push("此文件类型无法预览");
        else if (info.size > 200000) parts.push("文件超过 200 KB，暂不预览");
        else {
          const bytes = await fs.readFile(absolute);
          parts.push(bytes.includes(0) ? "二进制文件，无法预览" : bytes.toString("utf8"));
        }
      }
    }
    return { ok: true, text: parts.filter(Boolean).join("\n") || "没有可显示的文本差异" };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

async function stage(cwd, filePath, selected) {
  const current = await status(cwd);
  if (!current.ok) return current;
  if (filePath !== null && !current.files.some((item) => item.path === filePath)) {
    return { ok: false, message: "文件不在当前变更列表中" };
  }
  try {
    const root = (await git(cwd, ["rev-parse", "--show-toplevel"])).trim();
    if (selected) {
      await git(root, filePath === null ? ["add", "--all"] : ["add", "--", filePath]);
    } else if (filePath !== null) {
      await git(root, ["reset", "-q", "--", filePath]);
    }
    return await status(cwd);
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

async function commit(cwd, message) {
  if (typeof message !== "string" || !message.trim()) return { ok: false, message: "请输入提交说明" };
  const current = await status(cwd);
  if (!current.ok) return current;
  if (!current.files.some((file) => file.staged)) return { ok: false, message: "请先暂存要提交的文件" };
  try {
    const root = (await git(cwd, ["rev-parse", "--show-toplevel"])).trim();
    await git(root, ["commit", "-m", message.trim()]);
    const hash = (await git(root, ["rev-parse", "--short", "HEAD"])).trim();
    return { ...(await status(cwd)), hash };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

async function push(cwd) {
  const current = await status(cwd);
  if (!current.ok) return current;
  if (current.branch === "HEAD") return { ok: false, message: "当前处于分离 HEAD 状态，请先切换到分支" };
  try {
    const root = (await git(cwd, ["rev-parse", "--show-toplevel"])).trim();
    await git(root, ["rev-parse", "--verify", "HEAD"]);
    const pushOptions = { timeout: 120000, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } };
    let upstream = false;
    try {
      await git(root, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"]);
      upstream = true;
    } catch {
      // A new branch may not have a remote tracking branch yet.
    }
    if (upstream) {
      await git(root, ["push"], pushOptions);
      return { ok: true, message: `已推送 ${current.branch} 到远程仓库` };
    }
    const remotes = (await git(root, ["remote"])).trim().split("\n").filter(Boolean);
    if (remotes.length === 0) return { ok: false, message: "尚未配置远程仓库，请先添加 Git remote" };
    if (remotes.length > 1) return { ok: false, message: "当前分支没有上游分支，且存在多个远程仓库。请先在终端指定要推送的远程仓库" };
    await git(root, ["push", "--set-upstream", remotes[0], "HEAD"], pushOptions);
    return { ok: true, message: `已推送 ${current.branch} 到 ${remotes[0]}，并设置上游分支` };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

module.exports = { status, diff, stage, commit, push };
