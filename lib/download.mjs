import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { pipeline } from "node:stream/promises";
import { Readable, Transform } from "node:stream";
import { isWindows } from "./paths.mjs";

const USER_AGENT = "rea-workbench";

/**
 * The system's own curl. On networks where Node's TLS connections to GitHub are reset
 * (common in mainland China), the OS curl (Schannel on Windows) often still gets through.
 */
const CURL = isWindows ? path.join(process.env.SystemRoot || "C:\\Windows", "System32", "curl.exe") : "curl";

/** Network-level failures worth retrying with curl; HTTP errors and checksum mismatches are not. */
function isNetworkError(error) {
  if (error?.name === "AbortError") return false;
  const code = error?.cause?.code || error?.code || "";
  return error?.message === "fetch failed" || /^(ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|UND_ERR_|EPIPE|ERR_SSL)/.test(code);
}

function curl(args, { signal, stdout = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(CURL, ["--silent", "--show-error", "--location", "--fail", "--retry", "5", "--retry-all-errors", "--retry-delay", "2", "--connect-timeout", "20", "--user-agent", USER_AGENT, ...args], { windowsHide: true });
    const out = [];
    let stderr = "";
    if (stdout) child.stdout.on("data", (chunk) => out.push(chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    const abort = () => child.kill();
    signal?.addEventListener("abort", abort);
    child.on("error", (error) => reject(new Error(`无法启动系统 curl：${error.message}`)));
    child.on("close", (code) => {
      signal?.removeEventListener("abort", abort);
      if (signal?.aborted) reject(new DOMException("已取消", "AbortError"));
      else if (code === 0) resolve(Buffer.concat(out));
      else reject(new Error(`下载失败（curl ${code}）：${stderr.trim().slice(0, 300)}`));
    });
  });
}

/** GET a JSON document, falling back to the system curl when Node cannot connect. */
export async function fetchJson(url, { headers = {}, signal } = {}) {
  try {
    const response = await fetch(url, { headers: { "User-Agent": USER_AGENT, ...headers }, signal });
    if (!response.ok) throw Object.assign(new Error(`HTTP ${response.status}`), { status: response.status });
    return await response.json();
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    const extra = Object.entries(headers).flatMap(([key, value]) => ["--header", `${key}: ${value}`]);
    return JSON.parse((await curl([...extra, url], { signal, stdout: true })).toString("utf8"));
  }
}

function verify(partial, dest, sha256, digest) {
  if (sha256 && digest.toLowerCase() !== sha256.toLowerCase()) {
    fs.rmSync(partial, { force: true });
    throw new Error(`文件校验失败（SHA-256 不匹配），已删除。期望 ${sha256}，实际 ${digest}`);
  }
  fs.renameSync(partial, dest);
}

async function downloadWithFetch(url, partial, { onProgress, signal }) {
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT }, redirect: "follow", signal });
  if (!response.ok || !response.body) throw Object.assign(new Error(`下载失败：HTTP ${response.status}（${url}）`), { status: response.status });
  const total = Number(response.headers.get("content-length")) || 0;
  const hash = crypto.createHash("sha256");
  let received = 0;
  let lastReport = 0;
  const meter = new Transform({
    transform(chunk, _encoding, callback) {
      hash.update(chunk);
      received += chunk.length;
      const now = Date.now();
      if (now - lastReport > 300) {
        lastReport = now;
        onProgress?.({ received, total });
      }
      callback(null, chunk);
    },
  });
  await pipeline(Readable.fromWeb(response.body), meter, fs.createWriteStream(partial), { signal });
  onProgress?.({ received, total: total || received });
  return { digest: hash.digest("hex"), bytes: received };
}

async function downloadWithCurl(url, partial, { onProgress, signal, expectedSize }) {
  onProgress?.({ phase: "网络较慢，已改用系统下载工具继续…" });
  fs.rmSync(partial, { force: true });
  // curl writes the file itself; report progress by watching it grow.
  const timer = setInterval(() => {
    try {
      const received = fs.statSync(partial).size;
      onProgress?.({ received, total: expectedSize || 0 });
    } catch {
      /* not created yet */
    }
  }, 500);
  try {
    await curl(["--output", partial, url], { signal });
  } finally {
    clearInterval(timer);
  }
  const bytes = fs.statSync(partial).size;
  onProgress?.({ received: bytes, total: expectedSize || bytes });
  const hash = crypto.createHash("sha256");
  await pipeline(fs.createReadStream(partial), hash);
  return { digest: hash.digest("hex"), bytes };
}

/**
 * Download a URL to disk, reporting progress and verifying SHA-256 when one is known.
 * The file only appears at `dest` after the digest matched. Falls back to the system curl
 * when Node's own connection is reset.
 */
export async function downloadFile(url, dest, { sha256, onProgress, signal, expectedSize } = {}) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const partial = `${dest}.part`;
  let result;
  try {
    result = await downloadWithFetch(url, partial, { onProgress, signal });
  } catch (error) {
    if (!isNetworkError(error)) {
      fs.rmSync(partial, { force: true });
      throw error;
    }
    result = await downloadWithCurl(url, partial, { onProgress, signal, expectedSize });
  }
  verify(partial, dest, sha256, result.digest);
  return { path: dest, sha256: result.digest, bytes: result.bytes };
}

/** Find a release asset in a GitHub repository; returns { url, name, sha256?, size, tag }. */
export async function githubAsset(repo, { tag, match }) {
  const endpoint = tag ? `https://api.github.com/repos/${repo}/releases/tags/${tag}` : `https://api.github.com/repos/${repo}/releases/latest`;
  let release;
  try {
    release = await fetchJson(endpoint, { headers: { Accept: "application/vnd.github+json" } });
  } catch (error) {
    throw new Error(`无法读取 ${repo} 的发布信息：${error.message}`);
  }
  const asset = release.assets.find((candidate) => match.test(candidate.name));
  if (!asset) throw new Error(`在 ${repo} ${release.tag_name} 中没有找到匹配的安装包`);
  const digest = typeof asset.digest === "string" && asset.digest.startsWith("sha256:") ? asset.digest.slice(7) : undefined;
  return { url: asset.browser_download_url, name: asset.name, sha256: digest, size: asset.size, tag: release.tag_name };
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    let stderr = "";
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${command} 失败：${stderr.slice(0, 500)}`))));
  });
}

/**
 * Extract a .zip or .tar.gz into `destDir` using the system's own archiver
 * (bsdtar ships with Windows 10+ and macOS; it refuses absolute and parent-relative entry paths).
 */
export async function extractArchive(archive, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  if (archive.endsWith(".zip") && process.platform === "linux") {
    await run("unzip", ["-q", "-o", archive, "-d", destDir]);
  } else {
    const tar = isWindows ? path.join(process.env.SystemRoot || "C:\\Windows", "System32", "tar.exe") : "tar";
    await run(tar, ["-xf", archive, "-C", destDir]);
  }
}

/** The single top-level directory an archive extracted into, or `destDir` itself. */
export function soleChild(destDir) {
  const entries = fs.readdirSync(destDir, { withFileTypes: true }).filter((entry) => !entry.name.startsWith("."));
  return entries.length === 1 && entries[0].isDirectory() ? path.join(destDir, entries[0].name) : destDir;
}
