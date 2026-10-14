import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { practiceHtml } from "../public/practice-html.js";
export { extractHtml } from "../public/practice-html.js";
import { isMac, isWindows, workbenchDir } from "./paths.mjs";

// Practice files: the HTML a learner got back from an AI in the replicate exercise.
// Desktop-only; the hosted version previews in a sandboxed frame and offers a download instead.

function practiceDir() {
  return workbenchDir("practice");
}

function safeTitle(title) {
  return (String(title || "我的工具").replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "我的工具");
}

/** Resolve a path the browser sent back, refusing anything outside the practice folder. */
export function practiceFile(file) {
  const dir = path.resolve(practiceDir());
  const resolved = path.resolve(String(file || ""));
  if (!resolved.startsWith(dir + path.sep) || path.extname(resolved).toLowerCase() !== ".html" || !fs.existsSync(resolved)) throw new Error("找不到这个练习文件");
  const actual=fs.realpathSync(resolved),base=fs.realpathSync(dir);
  const relative=path.relative(base,actual);
  if(!relative || relative.startsWith('..'+path.sep) || path.isAbsolute(relative) || !fs.statSync(actual).isFile()) throw new Error('找不到这个练习文件');
  return resolved;
}

export function savePractice(html, title) {
  const body = practiceHtml(html);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
  const file = path.join(practiceDir(), `${stamp}-${safeTitle(title)}-${randomUUID().slice(0,8)}.html`);
  fs.writeFileSync(file, body, {encoding:"utf8",flag:"wx"});
  return { path: file, name: path.basename(file), folder: practiceDir() };
}

function launch(command, args) {
  const child=spawn(command, args, {detached:true,stdio:"ignore",windowsHide:true});
  child.on("error",error=>console.error("无法打开练习文件：",error.message));
  child.unref();
}

/** Open a saved practice file in the system's default browser (file:// keeps it away from the workbench's own origin). */
export function openPractice(file) {
  const target = practiceFile(file);
  if (isWindows) launch("explorer.exe", [target]);
  else if (isMac) launch("open", [target]);
  else launch("xdg-open", [target]);
  return { path: target };
}

export function revealPractice(file) {
  const target = practiceFile(file);
  if (isWindows) launch("explorer.exe", [`/select,${target}`]);
  else if (isMac) launch("open", ["-R", target]);
  else launch("xdg-open", [path.dirname(target)]);
  return { path: target };
}
