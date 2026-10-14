#!/usr/bin/env node
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { isMac, isWindows, reaVersion, workbenchDir, workbenchHome } from "./lib/paths.mjs";
import { analyzeTarget, commandCatalog, rawPath } from "./lib/analyze.mjs";
import { engineStatus, installEngine, setEngineValue } from "./lib/engines.mjs";
import { connectClient, disconnectClient, listClients, previewClient, setCompact, setToolProfile } from "./lib/clients.mjs";
import { runRea } from "./lib/rea.mjs";
import {modelModGuide} from "./lib/model-mods.mjs";
import {gameCaseCatalog,gameCaseGuide} from "./lib/game-cases.mjs";
import {gameModCatalog,buildModFiles,writeModFiles,modZip} from "./lib/game-mods.mjs";
import { demoCatalog } from "./lib/demos.mjs";
import { findInstalledApps } from "./lib/apps.mjs";
import { openPractice, revealPractice, savePractice } from "./lib/practice.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(here, "public");
const gameGeneratedRoot = process.env.REA_WORKBENCH_SANDBOX || here;
const args = process.argv.slice(2);
const preferredPort = Number(args[args.indexOf("--port") + 1]) || Number(process.env.PORT) || 7321;
const openBrowser = !args.includes("--no-open");

// Every API call must carry this token. It is only ever embedded in the page this server serves,
// so other websites open in the same browser cannot drive the workbench.
const TOKEN = crypto.randomBytes(24).toString("hex");
let port = preferredPort;

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".woff": "font/woff" };

function sendJson(res, status, value) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(value));
}

async function readJson(req, limit = 1_000_000) {
  let text = "";
  for await (const chunk of req) {
    text += chunk;
    if (text.length > limit) throw new Error("请求太大");
  }
  return text ? JSON.parse(text) : {};
}

/** Newline-delimited JSON stream for long tasks; `signal` aborts when the browser goes away. */
function openStream(req, res) {
  res.writeHead(200, { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" });
  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) controller.abort();
  });
  return {
    signal: controller.signal,
    emit: (event) => {
      if (!res.writableEnded) res.write(`${JSON.stringify(event)}\n`);
    },
    end: () => res.end(),
  };
}

/** Native file/folder picker so beginners never have to type a path. */
function pickPath(kind) {
  return new Promise((resolve) => {
    let command;
    let commandArgs;
    if (isWindows) {
      const script =
        kind === "folder"
          ? "Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.FolderBrowserDialog; $d.Description = '选择要分析的文件夹'; $d.ShowNewFolderButton = $false; $f = New-Object System.Windows.Forms.Form -Property @{TopMost=$true}; if ($d.ShowDialog($f) -eq 'OK') { [Console]::OutputEncoding = [Text.Encoding]::UTF8; $d.SelectedPath }"
          : "Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.OpenFileDialog; $d.Title = '选择要分析的文件'; $f = New-Object System.Windows.Forms.Form -Property @{TopMost=$true}; if ($d.ShowDialog($f) -eq 'OK') { [Console]::OutputEncoding = [Text.Encoding]::UTF8; $d.FileName }";
      command = "powershell.exe";
      commandArgs = ["-NoProfile", "-STA", "-Command", script];
    } else if (isMac) {
      command = "osascript";
      commandArgs = ["-e", kind === "folder" ? 'POSIX path of (choose folder with prompt "选择要分析的文件夹")' : 'POSIX path of (choose file with prompt "选择要分析的文件")'];
    } else {
      command = "zenity";
      commandArgs = ["--file-selection", ...(kind === "folder" ? ["--directory"] : [])];
    }
    const child = spawn(command, commandArgs, { windowsHide: false });
    let out = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => (out += chunk));
    child.on("error", () => resolve(null));
    child.on("close", () => resolve(out.trim().replace(/\/$/, "") || null));
  });
}

function safeName(name) {
  const base = path.basename(String(name || "upload")).replace(/[^\p{L}\p{N}._-]+/gu, "_").slice(0, 120);
  return base || "upload";
}

const DOCTOR_NAMES = { node: "Node.js", host: "操作系统", hopper: "Hopper 引擎", ghidra: "Ghidra 引擎", "ida-registration": "IDA 引擎", "skill:identity": "REA 技能说明" };

const routes = {
  "GET /api/model-mods/guide": async (_req,res)=>sendJson(res,200,modelModGuide()),
  "GET /api/game-cases": async (_req,res)=>sendJson(res,200,{items:gameCaseCatalog()}),
  "POST /api/game-cases/guide": async (req,res)=>{try{const {id}=await readJson(req);sendJson(res,200,gameCaseGuide(id));}catch(error){sendJson(res,400,{error:error.message});}},
  "GET /api/overview": async (_req, res) =>
    sendJson(res, 200, { reaVersion: reaVersion(), node: process.versions.node, platform: process.platform, workbenchHome: workbenchHome() }),

  "GET /api/commands": async (_req, res) => sendJson(res, 200, { commands: commandCatalog() }),

  "GET /api/game-mods": async (_req,res)=>sendJson(res,200,{items:gameModCatalog()}),

  "POST /api/game-mods/preview": async (req,res)=>{
    try {const {id,values}=await readJson(req);const result=buildModFiles(id,values);
      sendJson(res,200,{values:result.values,files:Object.entries(result.files).map(([name,data])=>({path:name,text:Buffer.isBuffer(data)?null:data})),playHtml:id==="battle-demo"?result.files["index.html"]:null});
    }catch(error){sendJson(res,400,{error:error.message});}
  },
  "POST /api/game-mods/build": async (req,res)=>{
    try {const {id,values}=await readJson(req);const result=buildModFiles(id,values);
      const target=path.join(gameGeneratedRoot,"samples","game-mods",".drafts",id+"-"+crypto.randomBytes(8).toString("hex"));
      writeModFiles(target,result.files);sendJson(res,200,{path:target,values:result.values});
    }catch(error){sendJson(res,400,{error:error.message});}
  },
  "POST /api/game-mods/export": async (req,res)=>{
    try {const {id,values}=await readJson(req);const result=buildModFiles(id,values);const zip=modZip(result.files);
      const dir=path.join(gameGeneratedRoot,"exports","game-mods");fs.mkdirSync(dir,{recursive:true});
      const filename=id+"-"+Date.now()+"-"+crypto.randomBytes(4).toString("hex")+".zip";
      const target=path.join(dir,filename);fs.writeFileSync(target,zip);
      res.writeHead(200,{"Content-Type":"application/zip","Content-Disposition":'attachment; filename="'+filename+'"',"X-Artifact-Path":target,"Cache-Control":"no-store"});res.end(zip);
    }catch(error){sendJson(res,400,{error:error.message});}
  },

  "GET /api/demos": async (_req, res) => sendJson(res, 200, { demos: demoCatalog() }),

  "GET /api/sample": async (_req, res) => sendJson(res, 200, { path: path.join(here, "samples", "notes-demo") }),

  "GET /api/installed-apps": async (_req, res) => sendJson(res, 200, { apps: findInstalledApps() }),

  // Replicate exercise (desktop only): save the learner's AI-made page, then open it in their own browser.
  "POST /api/practice/save": async (req, res) => {
    try {
      const { html, title, open } = await readJson(req, 3_000_000);
      const saved = savePractice(html, title);
      if (open) openPractice(saved.path);
      sendJson(res, 200, saved);
    } catch(error) { sendJson(res, 400, {error:error.message}); }
  },
  "POST /api/practice/open": async (req, res) => sendJson(res, 200, openPractice((await readJson(req)).path)),
  "POST /api/practice/reveal": async (req, res) => sendJson(res, 200, revealPractice((await readJson(req)).path)),

  "POST /api/pick": async (req, res) => {
    const { kind } = await readJson(req);
    sendJson(res, 200, { path: await pickPath(kind === "folder" ? "folder" : "file") });
  },

  "POST /api/upload": async (req, res, url) => {
    const dir = workbenchDir("uploads", new Date().toISOString().slice(0, 10));
    const target = path.join(dir, `${Date.now()}-${safeName(url.searchParams.get("name"))}`);
    await pipeline(req, fs.createWriteStream(target));
    sendJson(res, 200, { path: target });
  },

  "POST /api/analyze": async (req, res) => {
    const { path: target, commands } = await readJson(req);
    const stream = openStream(req, res);
    try {
      await analyzeTarget(String(target || "").trim().replace(/^"(.*)"$/, "$1"), { commands, emit: stream.emit, signal: stream.signal });
    } catch (error) {
      stream.emit({ type: "fatal", message: error.message });
    }
    stream.end();
  },

  "GET /api/raw": async (_req, res, url) => {
    const file = rawPath(url.searchParams.get("id") || "");
    if (!file) return sendJson(res, 404, { error: "结果已不存在" });
    res.writeHead(200, { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="rea-result-${url.searchParams.get("id")}.json"` });
    fs.createReadStream(file).pipe(res);
  },

  "GET /api/engines": async (_req, res) => sendJson(res, 200, await engineStatus()),

  "POST /api/engines/value": async (req, res) => {
    const { id, value } = await readJson(req);
    await setEngineValue(id, value);
    sendJson(res, 200, { ok: true });
  },

  "POST /api/engines/install": async (req, res) => {
    const { id } = await readJson(req);
    const stream = openStream(req, res);
    try {
      const result = await installEngine(id, { signal: stream.signal, onProgress: (p) => stream.emit({ type: "progress", ...p }) });
      stream.emit({ type: "done", ...result });
    } catch (error) {
      stream.emit({ type: "error", message: error.message });
    }
    stream.end();
  },

  "GET /api/clients": async (_req, res) => sendJson(res, 200, await listClients()),
  "POST /api/clients/preview": async (req, res) => sendJson(res, 200, await previewClient((await readJson(req)).id)),
  "POST /api/clients/connect": async (req, res) => sendJson(res, 200, await connectClient((await readJson(req)).id)),
  "POST /api/clients/disconnect": async (req, res) => sendJson(res, 200, disconnectClient((await readJson(req)).id)),
  "POST /api/settings/compact": async (req, res) => {
    setCompact((await readJson(req)).enabled);
    sendJson(res, 200, { ok: true });
  },

  "POST /api/settings/tool-profile": async (req, res) => {
    setToolProfile((await readJson(req)).profile);
    sendJson(res, 200, { ok: true });
  },

  "GET /api/doctor": async (_req, res) => {
    const result = await runRea(["doctor"], { timeoutMs: 120_000 });
    const data = result.ok ? result.data : result.error;
    const checks = (data?.checks || []).map((check) => ({
      name: DOCTOR_NAMES[check.name] || check.name,
      ok: check.ok,
      detail: check.detail || "",
      remediation: check.remediation || "",
    }));
    sendJson(res, 200, { checks });
  },

  "POST /api/uninstall-all": async (_req, res) => {
    const result = await runRea(["uninstall"], { timeoutMs: 120_000 });
    sendJson(res, result.ok ? 200 : 500, result.ok ? { ok: true, data: result.data } : { error: result.error.message });
  },
};

const server = http.createServer(async (req, res) => {
  const host = req.headers.host || "";
  if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) {
    res.writeHead(403);
    return res.end("forbidden");
  }
  const url = new URL(req.url, `http://${host}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      if (req.headers["x-workbench-token"] !== TOKEN) return sendJson(res, 403, { error: "无效的访问令牌，请刷新页面" });
      const handler = routes[`${req.method} ${url.pathname}`];
      if (!handler) return sendJson(res, 404, { error: "未知接口" });
      return await handler(req, res, url);
    }
    const name = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    const file = path.join(publicDir, name);
    if (!file.startsWith(publicDir + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      return res.end("not found");
    }
    let body = fs.readFileSync(file);
    if (name === "index.html") body = Buffer.from(body.toString("utf8").replace("__WORKBENCH_TOKEN__", TOKEN));
    // Fonts ship with the workbench (Google Fonts is unreachable for many users in mainland China); they never change.
    const cache = name.startsWith("fonts/") ? "public, max-age=31536000, immutable" : "no-store";
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": cache });
    res.end(body);
  } catch (error) {
    if (!res.headersSent) sendJson(res, 500, { error: error.message });
    else res.end();
  }
});
server.requestTimeout = 0;

function listen(candidate, attemptsLeft) {
  port = candidate;
  server.once("error", (error) => {
    if (error.code === "EADDRINUSE" && attemptsLeft > 0) listen(candidate + 1, attemptsLeft - 1);
    else throw error;
  });
  server.listen(candidate, "127.0.0.1", () => {
    const address = `http://127.0.0.1:${port}/`;
    console.log(`REA 工作台已启动：${address}`);
    console.log(`数据目录：${workbenchHome()}`);
    console.log("关闭这个窗口即可退出。");
    if (openBrowser) {
      const opener = isWindows ? ["cmd", ["/c", "start", "", address]] : isMac ? ["open", [address]] : ["xdg-open", [address]];
      spawn(opener[0], opener[1], { detached: true, stdio: "ignore", windowsHide: true }).unref();
    }
  });
}
listen(preferredPort, 10);
