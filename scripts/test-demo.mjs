// Verify the 预告测试版 package: node scripts/test-demo.mjs dist/BitTown-Detective-Demo-v<ver>-win-x64.zip
// Extracts it under dist/, starts its own node.exe in demo mode with every user folder pointed inside the
// test folder (nothing touches the real home), and checks the page is in demo mode, the three demo cases
// analyse from the packaged samples, every clue and every doubt matches the real reports, and each case's
// hands-on lab has its sample files.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const zip = path.resolve(process.argv[2] || "");
assert.ok(zip.endsWith(".zip") && fs.existsSync(zip), "Pass the demo zip");
const work = path.join(project, "dist", "test-demo");
fs.rmSync(work, { recursive: true, force: true });
fs.mkdirSync(work, { recursive: true });
execFileSync("powershell", ["-NoProfile", "-Command", `Expand-Archive -LiteralPath '${zip}' -DestinationPath '${work}' -Force`], { stdio: "inherit" });
const bundle = path.join(work, fs.readdirSync(work)[0]);
assert.ok(fs.existsSync(path.join(bundle, "runtime", "node.exe")), "node.exe in the package");
assert.ok(fs.existsSync(path.join(bundle, "开始游戏.bat")), "launcher in the package");
assert.ok(!fs.existsSync(path.join(bundle, "runtime", "python")), "no Python in the demo");
assert.ok(!fs.existsSync(path.join(bundle, "public", "art", "portraits")), "no original portraits in the demo");
assert.ok(fs.readFileSync(path.join(bundle, "开始游戏.bat"), "utf8").includes("REA_DEMO=1"), "launcher starts demo mode");

const home = path.join(work, "home");
const env = { ...process.env, REA_DEMO: "1", REA_WORKBENCH_HOME: path.join(bundle, "data"), HOME: home, USERPROFILE: home, APPDATA: path.join(home, "Roaming"), LOCALAPPDATA: path.join(home, "Local"), XDG_CONFIG_HOME: path.join(home, ".config"), CLAUDE_CONFIG_DIR: path.join(home, ".claude"), CODEX_HOME: path.join(home, ".codex") };
delete env.JAVA_HOME;
for (const dir of [env.APPDATA, env.LOCALAPPDATA, env.XDG_CONFIG_HOME]) fs.mkdirSync(dir, { recursive: true });

const { clueTarget, provesClaim } = await import(pathToFileURL(path.join(bundle, "public", "case-game.js")).href);
const { DEMO_CASES } = await import(pathToFileURL(path.join(bundle, "public", "game-quests.js")).href);
const checks = [];
let server;
try {
  server = spawn(path.join(bundle, "runtime", "node.exe"), ["server.mjs", "--no-open", "--port", "7543"], { cwd: bundle, env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  const base = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error("server did not start")), 25000);
    let output = "";
    server.stdout.on("data", (chunk) => {
      output += chunk;
      const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) {
        clearTimeout(timer);
        resolve(match[0]);
      }
    });
    server.on("exit", (code) => reject(Error(`server exited ${code}`)));
  });
  const html = await (await fetch(`${base}/`)).text();
  assert.match(html, /name="workbench-demo" content="1"/);
  const token = html.match(/name="workbench-token" content="([0-9a-f]+)"/)?.[1];
  assert.ok(token);
  checks.push("page starts in demo mode");
  const headers = { "X-Workbench-Token": token, "Content-Type": "application/json" };
  const catalog = (await (await fetch(`${base}/api/cases`, { headers })).json()).cases;
  for (const id of DEMO_CASES) {
    const item = catalog.find((c) => c.id === id);
    assert.ok(item?.path?.startsWith(bundle), `${id} analyses the packaged sample`);
    const text = await (await fetch(`${base}/api/analyze`, { method: "POST", headers, body: JSON.stringify({ path: item.path }) })).text();
    const reports = text.trim().split("\n").map((line) => JSON.parse(line)).filter((e) => e.type === "step-done" && e.report).map((e) => e.report);
    assert.ok(reports.length, `${id} produced a report`);
    const bag = [];
    for (const question of item.questions) {
      const target = clueTarget(question, reports);
      if (target.kind === "rows") {
        assert.ok(target.available, `${id}/${question.id}: the report has the rows`);
        bag.push(...target.required);
      }
    }
    for (const claim of item.game.verdict.claims) assert.ok(bag.some((e) => provesClaim(claim, e)), `${id}: ${claim.text}`);
    checks.push(`${id}: every clue and doubt matches its real report`);
    const lab = item.game.lab;
    assert.ok(lab && lab.files.every((file) => lab.sources?.[file]), `${id}: the lab's sample files are packaged`);
    checks.push(`${id}: its ${lab.kind} lab has the sample files`);
  }
  assert.equal((await fetch(`${base}/api/cases`)).status, 403);
  checks.push("API rejects requests without the token");
  console.log(JSON.stringify({ ok: true, bundle: path.basename(bundle), checks }, null, 1));
} finally {
  server?.kill();
}
