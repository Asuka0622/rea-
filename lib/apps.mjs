import fs from "node:fs";
import path from "node:path";
import { homeDir, isMac, isWindows } from "./paths.mjs";

/**
 * Find desktop apps a beginner can analyse without engines: Electron apps,
 * recognised by their resources/app.asar (or unpacked resources/app).
 * Only directory listings are read; nothing is opened or executed.
 */
export function findInstalledApps(limit = 60) {
  const found = new Map();
  const isElectron = (dir) => fs.existsSync(path.join(dir, "resources", "app.asar")) || fs.existsSync(path.join(dir, "resources", "app", "package.json"));
  const add = (name, dir) => {
    if (!found.has(dir) && found.size < limit) found.set(dir, { name, path: dir });
  };
  const list = (dir) => {
    try {
      return fs.readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isDirectory());
    } catch {
      return [];
    }
  };

  if (isWindows) {
    const roots = [process.env.ProgramFiles, process.env["ProgramFiles(x86)"], process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Programs"), process.env.LOCALAPPDATA].filter(Boolean);
    for (const root of new Set(roots)) {
      for (const app of list(root)) {
        const dir = path.join(root, app.name);
        if (isElectron(dir)) {
          add(app.name, dir);
          continue;
        }
        // Squirrel-style installs keep each version in app-x.y.z (Discord, Slack, …); pick the newest.
        const versions = list(dir).filter((entry) => /^app-\d/.test(entry.name)).map((entry) => entry.name).sort().reverse();
        for (const version of versions) {
          if (isElectron(path.join(dir, version))) {
            add(app.name, path.join(dir, version));
            break;
          }
        }
        for (const child of list(dir).filter((entry) => !/^app-\d/.test(entry.name)).slice(0, 30)) {
          if (isElectron(path.join(dir, child.name))) add(`${app.name} ${child.name}`, path.join(dir, child.name));
        }
      }
    }
  } else if (isMac) {
    for (const root of ["/Applications", path.join(homeDir(), "Applications")]) {
      for (const app of list(root).filter((entry) => entry.name.endsWith(".app"))) {
        const resources = path.join(root, app.name, "Contents", "Resources");
        if (fs.existsSync(path.join(resources, "app.asar"))) add(app.name.replace(/\.app$/, ""), path.join(resources, "app.asar"));
      }
    }
  }
  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name, "zh"));
}
