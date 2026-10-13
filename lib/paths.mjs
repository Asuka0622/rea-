import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export const isWindows = process.platform === "win32";
export const isMac = process.platform === "darwin";

export function homeDir() {
  return process.env.USERPROFILE || process.env.HOME || os.homedir();
}

/** Per-user application data: %APPDATA% on Windows, ~/Library/Application Support on macOS, ~/.config elsewhere. */
export function appDataDir() {
  if (isWindows) return process.env.APPDATA || path.join(homeDir(), "AppData", "Roaming");
  if (isMac) return path.join(homeDir(), "Library", "Application Support");
  return process.env.XDG_CONFIG_HOME || path.join(homeDir(), ".config");
}

/** Where the workbench keeps its own settings, downloaded engines, uploads and results. */
export function workbenchHome() {
  const dir = process.env.REA_WORKBENCH_HOME || path.join(homeDir(), ".rea-workbench");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function workbenchDir(...parts) {
  const dir = path.join(workbenchHome(), ...parts);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Absolute path to the installed REA CLI entry script. */
export function reaScript() {
  const pkg = require.resolve("rea-agents/package.json");
  return path.join(path.dirname(pkg), "scripts", "rea.mjs");
}

export function reaVersion() {
  return require("rea-agents/package.json").version;
}
