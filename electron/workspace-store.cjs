const fs = require("node:fs");
const path = require("node:path");

function directoryPath(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const resolved = path.resolve(value);
    return fs.statSync(resolved).isDirectory() ? resolved : null;
  } catch {
    return null;
  }
}

function pathKey(value) {
  return process.platform === "win32" ? value.toLowerCase() : value;
}

function createWorkspaceStore(filePath, fallbackCwd) {
  const fallback = directoryPath(fallbackCwd) || process.cwd();
  let saved = {};
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (parsed && typeof parsed === "object") saved = parsed;
  } catch {
    // First run, or a damaged metadata file: keep the current working directory available.
  }

  const paths = [];
  for (const value of Array.isArray(saved.paths) ? saved.paths : []) {
    const candidate = directoryPath(value);
    if (candidate && !paths.some((entry) => pathKey(entry) === pathKey(candidate))) paths.push(candidate);
  }
  if (paths.length === 0) paths.push(fallback);
  const preferred = directoryPath(saved.activeCwd);
  let activeCwd = paths.find((entry) => preferred && pathKey(entry) === pathKey(preferred)) || paths[0];

  function snapshot() {
    return { paths: [...paths], activeCwd };
  }

  function persist() {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const temporary = `${filePath}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(snapshot(), null, 2), "utf8");
    fs.renameSync(temporary, filePath);
  }

  return {
    snapshot,
    add(value) {
      const candidate = directoryPath(value);
      if (!candidate) throw new Error("所选工作区目录不存在");
      if (!paths.some((entry) => pathKey(entry) === pathKey(candidate))) {
        paths.push(candidate);
        try {
          persist();
        } catch (error) {
          paths.pop();
          throw error;
        }
      }
      return candidate;
    },
    activate(value) {
      const candidate = paths.find((entry) => typeof value === "string" && pathKey(entry) === pathKey(value));
      if (!candidate || !directoryPath(candidate)) throw new Error("工作区不存在，请重新添加目录");
      const previous = activeCwd;
      activeCwd = candidate;
      try {
        persist();
      } catch (error) {
        activeCwd = previous;
        throw error;
      }
      return snapshot();
    },
  };
}

module.exports = { createWorkspaceStore };
