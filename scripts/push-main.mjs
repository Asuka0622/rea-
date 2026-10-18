// 把当前 HEAD 推到 origin/main（带代理与重试）
//
// 用法：
//   node scripts/push-main.mjs            # 直连
//   node scripts/push-main.mjs --proxy    # 走本机代理（github.com 直连不通时）
//   node scripts/push-main.mjs --remote origin --target main
//
// 经验：fetch 拉一个几百 MB 的包会卡很久；push 只需要传新增对象，通常几十秒内完成。

import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const valueOf = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const remote = valueOf("--remote", "origin");
const target = valueOf("--target", "main");
const proxyUrl = valueOf("--proxy-url", "http://127.0.0.1:1088");
const proxyArgs = has("--proxy") ? ["-c", `http.proxy=${proxyUrl}`, "-c", `https.proxy=${proxyUrl}`] : [];
const attempts = Number(valueOf("--attempts", "3"));
const sleepSync = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

const say = (message) => console.log(`[${new Date().toLocaleTimeString("zh-CN", { hour12: false })}] ${message}`);

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  say(`第 ${attempt} 次：push ${remote}/${target}`);
  try {
    const out = execFileSync("git", [...proxyArgs, "push", remote, `HEAD:${target}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 10 * 60 * 1000,
    });
    process.stdout.write(out.replace(/^/gm, "    "));
    say("推送成功");
    process.exit(0);
  } catch (error) {
    const text = `${error.stdout || ""}${error.stderr || ""}`.trim();
    if (text) process.stdout.write(text.replace(/^/gm, "    ") + "\n");
    say(`失败（${error.status ?? "timeout"}）`);
    if (attempt < attempts) sleepSync(5000);
  }
}

say("三次都没成功。稍后再试，或换网络后重跑本脚本。");
process.exit(1);
