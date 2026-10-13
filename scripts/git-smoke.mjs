import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import gitService from "../electron/git-service.cjs";

const run = promisify(execFile);
const cwd = await mkdtemp(join(tmpdir(), "pi-git-smoke-"));
const remote = await mkdtemp(join(tmpdir(), "pi-git-remote-"));
const git = (...args) => run("git", args, { cwd });

try {
  await git("init", "-q");
  await git("config", "user.name", "Git Smoke Test");
  await git("config", "user.email", "git-smoke@example.invalid");
  await writeFile(join(cwd, "selected.txt"), "selected\n");
  await writeFile(join(cwd, "other.txt"), "other\n");

  let state = await gitService.status(cwd);
  assert.equal(state.ok, true);
  assert.equal(state.files.length, 2);
  assert.equal((await gitService.commit(cwd, "empty")).ok, false);

  state = await gitService.stage(cwd, "selected.txt", true);
  assert.equal(state.files.find((file) => file.path === "selected.txt")?.staged, true);
  assert.match((await gitService.diff(cwd, "selected.txt")).text, /\+selected/);

  state = await gitService.stage(cwd, "selected.txt", false);
  assert.equal(state.files.find((file) => file.path === "selected.txt")?.staged, false);

  await gitService.stage(cwd, "selected.txt", true);
  const committed = await gitService.commit(cwd, "test: selected file");
  assert.equal(committed.ok, true);
  assert.match(committed.hash, /^[a-f0-9]+$/);
  assert.deepEqual(committed.files.map((file) => file.path), ["other.txt"]);
  assert.equal((await git("show", "--pretty=format:", "--name-only", "HEAD")).stdout.trim(), "selected.txt");

  const nested = join(cwd, "nested");
  await mkdir(nested);
  state = await gitService.status(nested);
  assert.deepEqual(state.files.map((file) => file.path), ["other.txt"]);
  state = await gitService.stage(nested, null, true);
  assert.equal(state.files[0].staged, true);
  assert.equal((await gitService.commit(nested, "test: stage from subdirectory")).ok, true);
  assert.equal((await gitService.status(cwd)).files.length, 0);

  assert.match((await gitService.push(cwd)).message, /尚未配置远程仓库/);
  await run("git", ["init", "--bare", "-q", remote]);
  await git("remote", "add", "origin", remote);
  const firstPush = await gitService.push(cwd);
  assert.equal(firstPush.ok, true, firstPush.message);
  const branch = (await git("branch", "--show-current")).stdout.trim();
  assert.equal((await git("rev-parse", "@{upstream}")).stdout.trim(), (await git("rev-parse", "HEAD")).stdout.trim());

  await writeFile(join(cwd, "later.txt"), "later\n");
  await gitService.stage(cwd, "later.txt", true);
  assert.equal((await gitService.commit(cwd, "test: push again")).ok, true);
  const secondPush = await gitService.push(cwd);
  assert.equal(secondPush.ok, true, secondPush.message);
  const remoteHead = await run("git", ["--git-dir", remote, "rev-parse", `refs/heads/${branch}`]);
  assert.equal(remoteHead.stdout.trim(), (await git("rev-parse", "HEAD")).stdout.trim());

  await git("checkout", "-q", "-b", "untracked-upstream");
  await git("remote", "add", "backup", remote);
  assert.match((await gitService.push(cwd)).message, /多个远程仓库/);
  await git("checkout", "-q", "--detach");
  assert.match((await gitService.push(cwd)).message, /分离 HEAD/);
  console.log("Git commit and push smoke test passed");
} finally {
  await rm(cwd, { recursive: true, force: true });
  await rm(remote, { recursive: true, force: true });
}
