// 同步给美术工作区：把 origin/main 合进 D:\gpt\rea-artwork，再推回远端。
//
// 为什么要有这个脚本：两个 agent 各用一个 worktree、各在各的分支上。
// 「美术看不到」= 两边是不同分支，而且那边落后很多。唯一真源是 origin/main。
//
// 用法：
//   node scripts/sync-art.mjs            # 直接跑
//   node scripts/sync-art.mjs --proxy    # 本机代理（github.com 直连不通时）
//   node scripts/sync-art.mjs --path D:\other\worktree
//
// 安全：发现美术那边有未提交改动就停下并提示，不替你丢东西。

import { execFileSync } from "node:child_process";
import path from "node:path";

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const valueOf = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const artPath = valueOf("--path", "D:\\gpt\\rea-artwork");
const source = valueOf("--source", "origin/main");
const proxyUrl = valueOf("--proxy-url", "http://127.0.0.1:1088");
const proxyArgs = has("--proxy") ? ["-c", `http.proxy=${proxyUrl}`, "-c", `https.proxy=${proxyUrl}`] : [];

const say = (message) => console.log(`[${new Date().toLocaleTimeString("zh-CN", { hour12: false })}] ${message}`);
const git = (gitArgs, { allowFail = false } = {}) => {
  try {
    const out = execFileSync("git", ["-C", artPath, ...gitArgs], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    process.stdout.write(out.replace(/^/gm, "    "));
    return { ok: true, out };
  } catch (error) {
    const text = `${error.stdout || ""}${error.stderr || ""}`.trim();
    if (text) process.stdout.write(text.replace(/^/gm, "    ") + "\n");
    if (!allowFail) process.exit(error.status ?? 1);
    return { ok: false, out: text, status: error.status };
  }
};

say(`美术工作区：${artPath}`);
const status = git(["status", "--porcelain"], { allowFail: true }).out || "";
const dirty = status.split("\n").filter((line) => line.trim());
if (dirty.length) {
  say(`还有 ${dirty.length} 项未提交改动，先提交再来：`);
  dirty.slice(0, 12).forEach((line) => console.log(`    ${line}`));
  say(`建议：cd ${artPath}; git add -A; git commit -m "WIP: art pass"`);
  process.exit(2);
}

say("拉取远端");
git([...proxyArgs, "fetch", "origin"]);

say(`把 ${source} 合进当前分支`);
const merge = git(["merge", "--no-edit", source], { allowFail: true });
if (!merge.ok) {
  say("合并有冲突。解决后 git add -A && git commit，再跑一次本脚本。");
  say("最可能冲突：public/game-shell.js、public/game.css、docs/art/prompts.md");
  process.exit(3);
}

const branch = git(["branch", "--show-current"], { allowFail: true }).out.trim() || "codex/local-seasonal-artwork";
say(`推回远端：${branch}`);
git([...proxyArgs, "push", "-u", "origin", branch]);

say("完成：美术那边现在能看到 origin/main 的全部内容了。");
void path;
