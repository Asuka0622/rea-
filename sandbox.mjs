#!/usr/bin/env node
// 沙箱模式：把用户目录、AppData 等全部指向 ./.sandbox，
// 这样「一键接入」「一键安装」只会写到沙箱里，不会动到你真实的 AI 工具配置。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(process.env.REA_WORKBENCH_SANDBOX || path.join(path.dirname(fileURLToPath(import.meta.url)), ".sandbox"));
const dirs = {
  HOME: path.join(root, "home"),
  APPDATA: path.join(root, "appdata", "Roaming"),
  LOCALAPPDATA: path.join(root, "appdata", "Local"),
  XDG_CONFIG_HOME: path.join(root, "home", ".config"),
  REA_WORKBENCH_HOME: path.join(root, "workbench"),
};
for (const dir of Object.values(dirs)) fs.mkdirSync(dir, { recursive: true });
Object.assign(process.env, dirs, {
  USERPROFILE: dirs.HOME,
  CLAUDE_CONFIG_DIR: path.join(dirs.HOME, ".claude"),
  CODEX_HOME: path.join(dirs.HOME, ".codex"),
});
// Keep the user's real engines out of the sandbox so detection starts clean.
delete process.env.JAVA_HOME;
delete process.env.GHIDRA_INSTALL_DIR;
console.log(`[沙箱模式] 所有配置写入：${root}`);
await import("./server.mjs");
