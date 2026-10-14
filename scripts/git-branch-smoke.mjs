import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import gitService from "../electron/git-service.cjs";

const run = promisify(execFile);
const cwd = await mkdtemp(join(tmpdir(), "pi-git-branch-"));
const remote = await mkdtemp(join(tmpdir(), "pi-git-branch-remote-"));
const clone = await mkdtemp(join(tmpdir(), "pi-git-branch-clone-"));
const git = (dir, ...args) => run("git", args, { cwd: dir });

try {
    await git(cwd, "init", "-q", "-b", "main");
    await git(cwd, "config", "user.name", "Branch Smoke Test");
    await git(cwd, "config", "user.email", "branch-smoke@example.invalid");

    let history = await gitService.log(cwd);
    assert.equal(history.ok, true);
    assert.deepEqual(history.commits, []);

    let list = await gitService.branches(cwd);
    assert.equal(list.ok, true);
    assert.equal(list.current, "main");
    assert.equal(list.detached, false);
    assert.deepEqual(list.local, []);

    for (let index = 1; index <= 3; index += 1) {
        await writeFile(join(cwd, "file.txt"), `version ${index}\n`);
        await git(cwd, "add", "file.txt");
        await git(cwd, "commit", "-q", "-m", `commit ${index}`);
    }

    history = await gitService.log(cwd, { limit: 2 });
    assert.equal(history.ok, true);
    assert.deepEqual(history.commits.map((item) => item.subject), ["commit 3", "commit 2"]);
    assert.equal(history.hasMore, true);
    assert.equal(history.commits[0].author, "Branch Smoke Test");
    assert.ok(history.commits[0].refs.some((ref) => ref.includes("main")));
    history = await gitService.log(cwd, { limit: 2, skip: 2 });
    assert.deepEqual(history.commits.map((item) => item.subject), ["commit 1"]);
    assert.equal(history.hasMore, false);
    assert.equal((await gitService.log(cwd, { ref: "--all" })).ok, false);
    assert.equal((await gitService.log(cwd, { ref: "missing" })).ok, false);

    const detail = await gitService.show(cwd, history.commits[0].hash);
    assert.equal(detail.ok, true);
    assert.match(detail.text, /commit 1/);
    assert.match(detail.text, /\+version 1/);
    assert.equal((await gitService.show(cwd, "HEAD")).ok, false);
    assert.equal((await gitService.show(cwd, "--output=x")).ok, false);

    assert.equal((await gitService.checkout(cwd, { name: "-x", create: true })).ok, false);
    assert.equal((await gitService.checkout(cwd, { name: "bad..name", create: true })).ok, false);
    assert.equal((await gitService.checkout(cwd, { name: "missing" })).ok, false);

    let result = await gitService.checkout(cwd, { name: "feature/one", create: true });
    assert.equal(result.ok, true, result.message);
    assert.equal(result.current, "feature/one");
    assert.equal((await gitService.checkout(cwd, { name: "main", create: true })).ok, false);
    await writeFile(join(cwd, "feature.txt"), "feature\n");
    await git(cwd, "add", "feature.txt");
    await git(cwd, "commit", "-q", "-m", "feature commit");

    result = await gitService.checkout(cwd, { name: "main" });
    assert.equal(result.ok, true, result.message);
    assert.equal(result.current, "main");
    list = await gitService.branches(cwd);
    assert.deepEqual(list.local.map((item) => item.name).sort(), ["feature/one", "main"]);
    assert.equal(list.local.find((item) => item.current)?.name, "main");

    await writeFile(join(cwd, "file.txt"), "local edit\n");
    await writeFile(join(cwd, "scratch.txt"), "untracked\n");
    assert.equal((await gitService.branches(cwd)).changes, 2);
    result = await gitService.checkout(cwd, { name: "feature/one", stash: true });
    assert.equal(result.ok, true, result.message);
    assert.equal(result.stashed, true);
    assert.equal(result.changes, 0);
    assert.match((await git(cwd, "stash", "list")).stdout, /pi: 切换到 feature\/one 前自动暂存/);
    await gitService.checkout(cwd, { name: "main" });
    await git(cwd, "stash", "pop", "-q");
    assert.equal((await readFile(join(cwd, "file.txt"), "utf8")).trim(), "local edit");

    await git(cwd, "checkout", "-q", "--", "file.txt");
    await rm(join(cwd, "scratch.txt"));
    await git(cwd, "checkout", "-q", "--detach");
    list = await gitService.branches(cwd);
    assert.equal(list.detached, true);
    assert.match(list.current, /^[a-f0-9]+$/);
    await gitService.checkout(cwd, { name: "main" });

    assert.match((await gitService.fetch(cwd)).message, /尚未配置远程仓库/);
    await run("git", ["init", "--bare", "-q", remote]);
    await git(cwd, "remote", "add", "origin", remote);
    await git(cwd, "push", "-q", "origin", "main", "feature/one");
    await run("git", ["clone", "-q", remote, clone]);
    await git(clone, "config", "user.name", "Branch Smoke Test");
    await git(clone, "config", "user.email", "branch-smoke@example.invalid");

    list = await gitService.fetch(clone);
    assert.equal(list.ok, true, list.message);
    assert.ok(list.remote.some((item) => item.name === "origin/feature/one"));
    assert.ok(!list.remote.some((item) => item.name.endsWith("/HEAD")));
    result = await gitService.checkout(clone, { name: "origin/feature/one", remote: true });
    assert.equal(result.ok, true, result.message);
    assert.equal(result.current, "feature/one");
    const tracked = (await gitService.branches(clone)).local.find((item) => item.name === "feature/one");
    assert.equal(tracked?.upstream, "origin/feature/one");
    await writeFile(join(clone, "ahead.txt"), "ahead\n");
    await git(clone, "add", "ahead.txt");
    await git(clone, "commit", "-q", "-m", "ahead");
    assert.equal((await gitService.branches(clone)).local.find((item) => item.name === "feature/one")?.ahead, 1);
    await gitService.checkout(clone, { name: "main" });
    result = await gitService.checkout(clone, { name: "origin/feature/one", remote: true });
    assert.equal(result.ok, true, result.message);
    assert.equal(result.current, "feature/one");
    assert.equal((await gitService.log(clone, { limit: 1 })).commits[0].subject, "ahead");

    console.log("Git branch and history smoke test passed");
} finally {
    await rm(cwd, { recursive: true, force: true });
    await rm(remote, { recursive: true, force: true });
    await rm(clone, { recursive: true, force: true });
}
