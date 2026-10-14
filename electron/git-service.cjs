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
            const file = { path: filePath, index, worktree, staged: index !== " " && index !== "?" };
            if (index === "R" || index === "C" || worktree === "R" || worktree === "C") {
                // -z puts the original path of a rename or copy in the next record.
                i += 1;
                if (records[i]) file.from = records[i];
            }
            files.push(file);
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
        // Git prints forward slashes on Windows; normalize before comparing paths.
        const root = path.resolve((await git(cwd, ["rev-parse", "--show-toplevel"])).trim());
        const parts = [];
        if (file.staged) parts.push(await git(root, ["diff", "--cached", "--no-ext-diff", "--", filePath]));
        if (file.worktree !== " " && file.worktree !== "?") {
            parts.push(await git(root, ["diff", "--no-ext-diff", "--", filePath]));
        }
        if (file.index === "?" && file.worktree === "?") {
            const absolute = path.resolve(root, filePath);
            const relative = path.relative(root, absolute);
            if (relative && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)) {
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
    const file = filePath === null ? null : current.files.find((item) => item.path === filePath);
    if (filePath !== null && !file) {
        return { ok: false, message: "文件不在当前变更列表中" };
    }
    try {
        const root = (await git(cwd, ["rev-parse", "--show-toplevel"])).trim();
        if (selected) {
            await git(root, filePath === null ? ["add", "--all"] : ["add", "--", filePath]);
        } else if (filePath !== null) {
            // Unstaging a rename must also restore the staged deletion of its original path.
            await git(root, ["reset", "-q", "--", filePath, ...(file.from && file.index === "R" ? [file.from] : [])]);
        } else {
            await git(root, ["reset", "-q"]);
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

const networkOptions = { timeout: 120000, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } };

function parseTrack(track) {
    const ahead = /ahead (\d+)/.exec(track);
    const behind = /behind (\d+)/.exec(track);
    return { ahead: ahead ? Number(ahead[1]) : 0, behind: behind ? Number(behind[1]) : 0, gone: track === "gone" };
}

async function refExists(root, ref) {
    try {
        await git(root, ["show-ref", "--verify", "--quiet", ref]);
        return true;
    } catch {
        return false;
    }
}

async function validBranchName(root, name) {
    if (typeof name !== "string" || !name.trim() || name.trim().startsWith("-")) return null;
    try {
        return (await git(root, ["check-ref-format", "--branch", name.trim()])).trim();
    } catch {
        return null;
    }
}

async function branches(cwd) {
    try {
        const root = (await git(cwd, ["rev-parse", "--show-toplevel"])).trim();
        const current = (await git(root, ["branch", "--show-current"])).trim();
        let head = "";
        try {
            head = (await git(root, ["rev-parse", "--short", "HEAD"])).trim();
        } catch {
            // An unborn branch has no commit yet.
        }
        const raw = await git(root, [
            "for-each-ref",
            "--sort=-committerdate",
            "--format=%(refname)%00%(refname:short)%00%(upstream:short)%00%(upstream:track,nobracket)%00%(committerdate:unix)",
            "refs/heads",
            "refs/remotes",
        ]);
        const local = [];
        const remote = [];
        for (const line of raw.split("\n")) {
            if (!line) continue;
            const [ref, name, upstream, track, date] = line.split("\0");
            if (ref.startsWith("refs/heads/")) {
                local.push({ name, upstream: upstream || null, ...parseTrack(track), date: Number(date) || 0, current: name === current });
            } else if (!ref.endsWith("/HEAD")) {
                remote.push({ name, date: Number(date) || 0 });
            }
        }
        const state = await status(root);
        return {
            ok: true,
            current: current || head,
            detached: !current,
            local,
            remote,
            changes: state.ok ? state.files.length : 0,
        };
    } catch (error) {
        return { ok: false, message: errorMessage(error), current: "", detached: false, local: [], remote: [], changes: 0 };
    }
}

async function checkout(cwd, request) {
    const create = request?.create === true;
    const fromRemote = request?.remote === true;
    try {
        const root = (await git(cwd, ["rev-parse", "--show-toplevel"])).trim();
        const name = await validBranchName(root, request?.name);
        if (!name) return { ok: false, message: "分支名无效" };

        let args;
        let target = name;
        if (create) {
            if (await refExists(root, `refs/heads/${name}`)) return { ok: false, message: `分支 ${name} 已存在` };
            args = ["switch", "-c", name];
        } else if (fromRemote) {
            if (!(await refExists(root, `refs/remotes/${name}`))) return { ok: false, message: `远程分支 ${name} 不存在` };
            const remotes = (await git(root, ["remote"])).trim().split("\n").filter(Boolean);
            const remoteName = remotes.filter((item) => name.startsWith(`${item}/`)).sort((a, b) => b.length - a.length)[0];
            if (!remoteName) return { ok: false, message: `无法识别 ${name} 所属的远程仓库` };
            target = name.slice(remoteName.length + 1);
            args = (await refExists(root, `refs/heads/${target}`)) ? ["switch", target] : ["switch", "-c", target, "--track", name];
        } else {
            if (!(await refExists(root, `refs/heads/${name}`))) return { ok: false, message: `本地分支 ${name} 不存在` };
            args = ["switch", name];
        }

        let stashed = false;
        if (request?.stash === true) {
            const current = await status(root);
            if (current.ok && current.files.length > 0) {
                await git(root, ["stash", "push", "--include-untracked", "-m", `pi: 切换到 ${target} 前自动暂存`]);
                stashed = true;
            }
        }
        try {
            await git(root, args);
        } catch (error) {
            if (stashed) await git(root, ["stash", "pop"]).catch(() => {});
            throw error;
        }
        return { ...(await branches(root)), branch: target, stashed };
    } catch (error) {
        return { ok: false, message: errorMessage(error) };
    }
}

async function fetchRemotes(cwd) {
    try {
        const root = (await git(cwd, ["rev-parse", "--show-toplevel"])).trim();
        const remotes = (await git(root, ["remote"])).trim().split("\n").filter(Boolean);
        if (remotes.length === 0) return { ...(await branches(root)), ok: false, message: "尚未配置远程仓库" };
        await git(root, ["fetch", "--all", "--prune"], networkOptions);
        return await branches(root);
    } catch (error) {
        return { ok: false, message: errorMessage(error), current: "", detached: false, local: [], remote: [], changes: 0 };
    }
}

async function log(cwd, request = {}) {
    const limit = Math.min(Math.max(Number(request.limit) || 50, 1), 200);
    const skip = Math.max(Number(request.skip) || 0, 0);
    const ref = typeof request.ref === "string" && request.ref.trim() ? request.ref.trim() : "HEAD";
    if (ref.startsWith("-")) return { ok: false, message: "引用无效", ref, commits: [], hasMore: false };
    try {
        const root = (await git(cwd, ["rev-parse", "--show-toplevel"])).trim();
        try {
            await git(root, ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]);
        } catch {
            if (ref === "HEAD") return { ok: true, ref, commits: [], hasMore: false };
            return { ok: false, message: `找不到 ${ref}`, ref, commits: [], hasMore: false };
        }
        const raw = await git(root, [
            "log",
            "--format=%H%x1f%h%x1f%an%x1f%ae%x1f%at%x1f%P%x1f%D%x1f%s%x1e",
            `--max-count=${limit + 1}`,
            `--skip=${skip}`,
            ref,
            "--",
        ]);
        const commits = raw.split("\x1e").map((record) => record.replace(/^\n/, "")).filter(Boolean).map((record) => {
            const [hash, shortHash, author, email, date, parents, refs, subject] = record.split("\x1f");
            return {
                hash,
                shortHash,
                author,
                email,
                date: Number(date) || 0,
                parents: parents ? parents.split(" ") : [],
                refs: refs ? refs.split(", ").filter(Boolean) : [],
                subject,
            };
        });
        return { ok: true, ref, commits: commits.slice(0, limit), hasMore: commits.length > limit };
    } catch (error) {
        return { ok: false, message: errorMessage(error), ref, commits: [], hasMore: false };
    }
}

const SHOW_LIMIT = 400000;

async function show(cwd, hash) {
    if (typeof hash !== "string" || !/^[0-9a-f]{7,64}$/i.test(hash)) return { ok: false, message: "提交哈希无效" };
    try {
        const root = (await git(cwd, ["rev-parse", "--show-toplevel"])).trim();
        const text = await git(root, ["show", "--format=fuller", "--stat", "--patch", "--no-ext-diff", "--no-color", hash, "--"]);
        if (text.length <= SHOW_LIMIT) return { ok: true, text };
        return { ok: true, text: `${text.slice(0, SHOW_LIMIT)}\n\n… 差异超过 400 KB，已截断`, truncated: true };
    } catch (error) {
        return { ok: false, message: errorMessage(error) };
    }
}

module.exports = { status, diff, stage, commit, push, branches, checkout, fetch: fetchRemotes, log, show };
