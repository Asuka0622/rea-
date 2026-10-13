// End-to-end smoke test: starts the workbench in its own sandbox and drives the HTTP API.
// Nothing outside test/.sandbox-smoke is written.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = path.join(root, "test", ".sandbox-smoke");
const fixture = path.join(root, "samples", "notes-demo");
let server;
let base;
let token;

async function api(route, body) {
  const response = await fetch(base + route, {
    method: body === undefined ? "GET" : "POST",
    headers: { "X-Workbench-Token": token, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const events = text.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
  const streamed = response.headers.get("content-type")?.includes("ndjson");
  return { status: response.status, data: streamed ? events : events[0] };
}

before(async () => {
  fs.rmSync(sandbox, { recursive: true, force: true });
  server = spawn(process.execPath, [path.join(root, "sandbox.mjs"), "--no-open", "--port", "7461"], {
    env: { ...process.env, REA_WORKBENCH_SANDBOX: sandbox },
  });
  base = await new Promise((resolve, reject) => {
    let out = "";
    server.stdout.on("data", (chunk) => {
      out += chunk;
      const match = out.match(/(http:\/\/127\.0\.0\.1:\d+)\//);
      if (match) resolve(match[1]);
    });
    server.on("exit", (code) => reject(new Error(`server exited ${code}: ${out}`)));
  });
  const html = await (await fetch(`${base}/`)).text();
  token = html.match(/name="workbench-token" content="([0-9a-f]+)"/)[1];
});

after(() => server?.kill());

test("rejects API calls without the token and foreign Host headers", async () => {
  assert.equal((await fetch(`${base}/api/overview`)).status, 403);
  // fetch() cannot override Host, so use a raw request to simulate DNS rebinding.
  const status = await new Promise((resolve, reject) => {
    const url = new URL(base);
    http
      .get({ host: url.hostname, port: url.port, path: "/api/overview", headers: { Host: "evil.example", "X-Workbench-Token": token } }, (res) => resolve(res.statusCode))
      .on("error", reject);
  });
  assert.equal(status, 403);
});

test("analyses an Electron app into a Chinese report", { timeout: 120_000 }, async () => {
  const { data } = await api("/api/analyze", { path: fixture });
  const detected = data.find((e) => e.type === "detected");
  assert.equal(detected.kind, "javascript");
  const done = data.find((e) => e.type === "step-done");
  assert.ok(done.ok, JSON.stringify(done.error));
  assert.match(done.report.headline, /Electron 桌面应用/);
  const ipc = done.report.sections.find((s) => s.title.startsWith("主进程提供的功能"));
  assert.deepEqual(ipc.table.rows.map((r) => r[0]).sort(), ["notes:export", "notes:list", "notes:save"]);
  const bridge = done.report.sections.find((s) => s.title === "暴露给界面的接口");
  assert.ok(bridge.items.includes("window.notes.save()"));
  const raw = await fetch(`${base}/api/raw?id=${done.rawId}`, { headers: { "X-Workbench-Token": token } });
  assert.equal(raw.status, 200);
});

test("analyses a Windows executable and checks for .NET", { timeout: 120_000, skip: process.platform !== "win32" }, async () => {
  const { data } = await api("/api/analyze", { path: path.join(process.env.SystemRoot, "System32", "notepad.exe") });
  const steps = data.filter((e) => e.type === "step-done");
  assert.deepEqual(steps.map((s) => s.command), ["inspect-artifact", "inspect-managed-artifact"]);
  for (const step of steps) assert.ok(step.ok, JSON.stringify(step.error));
  assert.match(steps[1].report.headline, /不是 \.NET/);
});

test("runs a follow-up command but refuses commands outside the allow-list", { timeout: 120_000, skip: process.platform !== "win32" }, async () => {
  const dll = path.join(process.env.SystemRoot, "Microsoft.NET", "Framework64", "v4.0.30319", "Accessibility.dll");
  const { data } = await api("/api/analyze", { path: dll, commands: ["inspect-managed-members", "uninstall"] });
  const steps = data.filter((e) => e.type === "step-done");
  assert.deepEqual(steps.map((s) => s.command), ["inspect-managed-members"]);
  assert.match(steps[0].report.headline, /找到 \d+ 个类型/);
});

test("reports a missing path in plain language", async () => {
  const { data } = await api("/api/analyze", { path: path.join(sandbox, "nope.apk") });
  assert.match(data.find((e) => e.type === "fatal").message, /找不到/);
});

test("lists engines with install options", async () => {
  const { data } = await api("/api/engines");
  const ids = data.map((e) => e.id);
  for (const id of ["java", "ghidra", "jadx", "adb", "apktool", "browser", "hopper", "ida", "jeb"]) assert.ok(ids.includes(id), id);
  assert.ok(data.find((e) => e.id === "jadx").installable);
  assert.ok(!data.find((e) => e.id === "ida").installable);
});

test("connects and disconnects a workbench-managed client without touching other servers", async () => {
  const appData = process.platform === "win32" ? path.join(sandbox, "appdata", "Roaming") : process.platform === "darwin" ? path.join(sandbox, "home", "Library", "Application Support") : path.join(sandbox, "home", ".config");
  const configPath = path.join(appData, "Trae CN", "User", "mcp.json");
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify({ mcpServers: { other: { command: "keep-me" } } }));

  const list = (await api("/api/clients")).data;
  const trae = list.extra.find((c) => c.id === "trae_cn");
  assert.equal(trae.installed, true);
  assert.equal(trae.configPath, configPath);

  const connected = (await api("/api/clients/connect", { id: "trae_cn" })).data;
  assert.ok(fs.existsSync(connected.backupPath));
  const written = JSON.parse(fs.readFileSync(configPath, "utf8"));
  assert.equal(written.mcpServers.other.command, "keep-me");
  assert.deepEqual(written.mcpServers.rea.args.slice(-2), ["--profile", "essential"]);
  assert.equal(written.mcpServers.rea.env.REA_MCP_INPUT_SCHEMA_PROFILE, "compact");

  await api("/api/clients/disconnect", { id: "trae_cn" });
  const after = JSON.parse(fs.readFileSync(configPath, "utf8"));
  assert.deepEqual(Object.keys(after.mcpServers), ["other"]);
});

test("refuses to rewrite a client config that is not strict JSON", async () => {
  const configPath = (await api("/api/clients")).data.extra.find((c) => c.id === "kiro").configPath;
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, '{ // comment\n "mcpServers": {} }');
  const { status, data } = await api("/api/clients/connect", { id: "kiro" });
  assert.equal(status, 500);
  assert.match(data.error, /不是标准 JSON/);
  assert.equal(fs.readFileSync(configPath, "utf8"), '{ // comment\n "mcpServers": {} }');
});

test("connects a REA-native client through REA's own setup inside the sandbox", { timeout: 180_000 }, async () => {
  fs.mkdirSync(path.join(sandbox, "home", ".cursor"), { recursive: true });
  const preview = (await api("/api/clients/preview", { id: "cursor" })).data;
  assert.ok(preview.actions.every((a) => a.target.startsWith(sandbox)), JSON.stringify(preview.actions));
  const { status } = await api("/api/clients/connect", { id: "cursor" });
  assert.equal(status, 200);
  const config = JSON.parse(fs.readFileSync(path.join(sandbox, "home", ".cursor", "mcp.json"), "utf8"));
  assert.ok(config.mcpServers.rea);
});

/** Drive one MCP stdio server: send messages, collect replies by id. */
function mcpSession(command, args, env) {
  const child = spawn(command, args, { env: { ...process.env, ...env } });
  let out = "";
  child.stdout.on("data", (chunk) => (out += chunk));
  const send = (message) => child.stdin.write(`${JSON.stringify(message)}\n`);
  const reply = (id, timeoutMs = 30_000) =>
    new Promise((resolve, reject) => {
      const started = Date.now();
      const poll = setInterval(() => {
        for (const line of out.split("\n")) {
          if (!line.trim()) continue;
          const message = JSON.parse(line);
          if (message.id === id) {
            clearInterval(poll);
            return resolve(message);
          }
        }
        if (Date.now() - started > timeoutMs) {
          clearInterval(poll);
          reject(new Error(`no reply for ${id}: ${out.slice(0, 500)}`));
        }
      }, 100);
    });
  send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "smoke", version: "0" } } });
  send({ jsonrpc: "2.0", method: "notifications/initialized" });
  return { send, reply, close: () => child.kill() };
}

test("the essential proxy exposes only real REA tools from its list and blocks the rest", { timeout: 60_000 }, async () => {
  const { TOOL_PROFILES } = await import("../lib/toolsets.mjs");
  const direct = mcpSession(process.execPath, [path.join(root, "node_modules", "rea-agents", "scripts", "rea.mjs"), "mcp"]);
  direct.send({ jsonrpc: "2.0", id: 2, method: "tools/list" });
  const all = new Set((await direct.reply(2)).result.tools.map((tool) => tool.name));
  direct.close();
  const missing = [...TOOL_PROFILES.essential.tools].filter((name) => !all.has(name));
  assert.deepEqual(missing, [], "essential profile names a tool REA does not have");

  const proxy = mcpSession(process.execPath, [path.join(root, "mcp-proxy.mjs"), "--profile", "essential"]);
  assert.equal((await proxy.reply(1)).result.serverInfo.name, "rea");
  proxy.send({ jsonrpc: "2.0", id: 2, method: "tools/list" });
  const exposed = (await proxy.reply(2)).result.tools.map((tool) => tool.name);
  assert.equal(exposed.length, TOOL_PROFILES.essential.tools.size);
  proxy.send({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "push_adb_file", arguments: {} } });
  assert.match((await proxy.reply(3)).error.message, /not enabled/);
  proxy.close();
});

test("serves seven ArtCraft demos through the authenticated API", async () => {
  const {status,data} = await api("/api/demos");
  assert.equal(status,200);
  assert.equal(data.demos.length,7);
  for(const demo of data.demos) {
    assert.equal(new URL(demo.repository).hostname,"github.com");
    assert.equal(new URL(demo.official).hostname,"getartcraft.com");
    if(!demo.ready) assert.equal(demo.path,null);
  }
});

test("analyses a Rust source workspace into real module evidence", async () => {
  const target=path.join(sandbox,"rust-fixture");
  fs.mkdirSync(path.join(target,"src"),{recursive:true});
  fs.writeFileSync(path.join(target,"Cargo.toml"),'[package]\nname="real-fixture"\nversion="0.1.0"\n[dependencies]\negui="0.30"\n');
  fs.writeFileSync(path.join(target,"src","main.rs"),'fn main() { panic!("must not execute"); }');
  const {data} = await api("/api/analyze",{path:target});
  assert.equal(data.find(event=>event.type==="detected").kind,"rust");
  const step=data.find(event=>event.type==="step-done");
  assert.equal(step.ok,true);
  assert.equal(step.command,"inspect-rust-project");
  assert.equal(step.report.sections[0].table.rows[0][0],"real-fixture");
  assert.ok(step.report.sections[1].table.rows.some(row=>row[0]==="egui"));
  assert.match(step.rawId,/^[0-9a-f]{16}$/);
  assert.ok(data.some(event=>event.type==="done"));
});

test("game workshop keeps separate examples and rejects invalid export data",async()=>{
  assert.equal((await fetch(base+"/api/game-mods")).status,403);
  const catalog=await api("/api/game-mods");assert.equal(catalog.data.items.length,4);assert.equal((await api("/api/demos")).data.demos.length,7);
  const invalid=await api("/api/game-mods/preview",{id:"training-sword",values:{damage:-2,interval:1,uses:100}});assert.equal(invalid.status,400);
  const preview=await api("/api/game-mods/preview",{id:"battle-demo",values:{playerHp:40,playerAttack:12,enemyHp:30,enemyAttack:5}});assert.match(preview.data.playHtml,/"playerAttack":12/);
});
test("modified mod drafts analyse into real reports and export inside the sandbox",async()=>{
  const draft=await api("/api/game-mods/build",{id:"training-wall",values:{health:1800,armor:5,copper:20}});assert.ok(draft.data.path.startsWith(sandbox+path.sep));
  const report=(await api("/api/analyze",{path:draft.data.path})).data.find(event=>event.type==="step-done");assert.equal(report.ok,true);assert.equal(report.command,"inspect-game-mod");assert.equal(report.report.sections[0].table.rows[0][1],1800);
  const raw=await api("/api/raw?id="+report.rawId);assert.equal(raw.data.values.health,1800);
  const response=await fetch(base+"/api/game-mods/export",{method:"POST",headers:{"X-Workbench-Token":token,"Content-Type":"application/json"},body:JSON.stringify({id:"healing-food",values:{heal:8,yield:2}})});assert.equal(response.status,200);const exported=response.headers.get("X-Artifact-Path");assert.ok(exported.startsWith(sandbox+path.sep));const bytes=Buffer.from(await response.arrayBuffer());assert.deepEqual(bytes,fs.readFileSync(exported));assert.equal(bytes.readUInt32LE(),0x04034b50);
});


test("real game cases are authenticated and separate from ArtCraft",async()=>{
  assert.equal((await fetch(base+"/api/game-cases")).status,403);
  const result=await api("/api/game-cases");assert.equal(result.status,200);assert.equal(result.data.items.length,4);assert.ok(result.data.items.every(item=>item.repository.startsWith("https://github.com/")));
  assert.equal((await api("/api/game-cases/guide",{id:"../bad"})).status,400);
  for(const item of result.data.items.filter(item=>item.ready)){
    const guide=await api("/api/game-cases/guide",{id:item.id});assert.equal(guide.status,200);assert.ok(guide.data.files.every(file=>file.present));
    const {data}=await api("/api/analyze",{path:item.path});assert.equal(data.find(e=>e.type==="detected").kind,"gamesource");const step=data.find(e=>e.type==="step-done");assert.ok(step.ok,JSON.stringify(step.error));assert.equal(step.command,"inspect-game-source");
    const raw=await fetch(base+"/api/raw?id="+step.rawId,{headers:{"X-Workbench-Token":token}});assert.equal(raw.status,200);assert.equal((await raw.json()).scanner,"rea-workbench/inert-game-source-scan");
  }
});


test("model guide and inert model analysis use authenticated API and project report storage",async()=>{
  assert.equal((await fetch(base+"/api/model-mods/guide")).status,403);
  const guide=await api("/api/model-mods/guide");assert.equal(guide.status,200);assert.ok(guide.data.tools.some(x=>x.id==="blender"&&x.mcpKind==="official"));
  const dir=path.join(sandbox,"model-fixture");fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,"mod.ini"),"[TextureOverrideBody]\nhash = abcdef12\n[ResourceBody]\nfilename = body.buf\n[ResourceDiffuse]\nfilename = missing.dds\n");fs.writeFileSync(path.join(dir,"body.buf"),"fixture");
  const result=await api("/api/analyze",{path:dir});assert.equal(result.data.find(x=>x.type==="detected").kind,"modelmod");const step=result.data.find(x=>x.type==="step-done");assert.ok(step.ok,JSON.stringify(step.error));assert.equal(step.command,"inspect-model-mod");assert.match(step.report.headline,/1 处静态引用未找到/);
  assert.ok(fs.existsSync(path.join(sandbox,"game-mods","results",step.rawId+".json")));const raw=await fetch(base+"/api/raw?id="+step.rawId,{headers:{"X-Workbench-Token":token}});assert.equal((await raw.json()).scanner,"rea-workbench/inert-model-mod-scan");
});
