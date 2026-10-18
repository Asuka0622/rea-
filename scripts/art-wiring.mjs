// 素材接线检查：哪些图已经交付到 public/art/，但游戏代码还没用上。
//
// 用法：node scripts/art-wiring.mjs
//
// 游戏的素材接入有三种方式，检查时分开对待：
//   1. 显式引用：代码里写死 id。
//   2. 拼接引用：id 由数据字段拼出来——anim-<portrait>（quests/cases 的 portrait 字段）、
//      sprite-<npc id>（npc-chatter 的 id）、faces/<who>-<face>（SPEAKERS 与任务数据）。
//      这类要看数据文件，不能只 grep 代码。
//   3. 数据驱动：has()/artImg()/artBg() 按 id 现查现用（minigames/、regions/、case-props/
//      等目录，文件一进目录就生效）。
//   4. 没人用：文件在部署目录里，但没有任何代码或数据路径会碰它——这些才是要处理的。
//
// 输出分档：OK（已接线）、AUTO（数据驱动，到位即生效）、ORPHAN（孤儿，需要决定接入还是归档）。

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const PIXEL = join(ROOT, "public", "art", "pixel");
const FACES = join(ROOT, "public", "art", "faces");
// 立绘（1086×1448 源图）不进部署：游戏只用 faces/ 的 webp 小头像。源图归档在
// docs/art/portraits-archive/，这里只确认归档在位，不再当孤儿报。
const PORTRAIT_ARCHIVE = join(ROOT, "docs", "art", "portraits-archive");

// 代码 + 数据 + 样式全部拼起来做引用匹配（quests 的 portrait/client 在 data/ 里）。
const sources = (() => {
  const files = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(js|mjs|css|html|json)$/.test(entry.name)) files.push(full);
    }
  };
  for (const dir of ["public", "data", "samples", "test"]) walk(join(ROOT, dir));
  return files.map((f) => readFileSync(f, "utf8")).join("\n");
})();

const walkPng = (dir, prefix = "") =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return walkPng(full, `${prefix}${entry.name}/`);
    return extname(entry.name) === ".png" ? [`${prefix}${entry.name.slice(0, -4)}`] : [];
  });

// 数据驱动目录：文件进目录即由 has()/artBg() 拾取。
const AUTO_DIRS = ["minigames/", "regions/", "case-props/", "eras/", "fx/", "props/", "skills/"];
// 由数据字段拼接的 id：anim-<portrait>、sprite-<npc>、faces/<who>-<face>。
const FACE_SUFFIX = /-(normal|happy|thinking|surprised|sorry|unsure|flustered|point|cornered|confident|shy|guilty)$/;

const pixelIds = walkPng(PIXEL);
const faceIds = existsSync(FACES)
  ? readdirSync(FACES).filter((n) => n.endsWith(".webp")).map((n) => n.slice(0, -5))
  : [];
const portraitFiles = existsSync(PORTRAIT_ARCHIVE)
  ? readdirSync(PORTRAIT_ARCHIVE).filter((n) => /\.png$/i.test(n))
  : [];

// 拼接引用的判定：anim-ada 的 "ada" 要在数据里作为 portrait 出现过；
// sprite-baker 的 "baker" 要作为 npc id 出现过；faces/qiushi-x 的 "qiushi" 同理。
// 做法：把 id 的"人名部分"在全部源码里找，出现即算接线（宁可少报孤儿，不漏接）。
const wired = (id) => {
  if (sources.includes(id)) return true;
  const m = id.match(/^(?:anim|sprite)-(.+)$/);
  if (m && sources.includes(m[1])) return true;
  const f = id.match(/^faces\/(.+?)(?:-(?:normal|happy|thinking|surprised|sorry|unsure|flustered|point|cornered|confident|shy|guilty))?$/);
  if (f && sources.includes(f[1])) return true;
  return false;
};

const orphans = [];
const auto = [];
const ok = [];

for (const id of pixelIds) {
  if (AUTO_DIRS.some((d) => id.startsWith(d))) auto.push(id);
  else if (wired(id)) ok.push(id);
  else orphans.push(id);
}
for (const id of faceIds) {
  const base = id.replace(FACE_SUFFIX, "");
  if (sources.includes(id) || sources.includes(base)) ok.push(`faces/${id}`);
  else orphans.push(`faces/${id}`);
}

const reviewDir = join(ROOT, "docs", "art", "review");
const reviewCount = (() => {
  if (!existsSync(reviewDir)) return 0;
  const count = (dir) =>
    readdirSync(dir, { withFileTypes: true }).reduce(
      (n, e) => n + (e.isDirectory() ? count(join(dir, e.name)) : /\.png$/i.test(e.name) ? 1 : 0),
      0,
    );
  return count(reviewDir);
})();

console.log(`素材接线检查 · ${new Date().toISOString().slice(0, 10)}`);
console.log(`  pixel ${pixelIds.length} 张 · faces ${faceIds.length} 张 · portraits ${portraitFiles.length} 张 · review 候选 ${reviewCount} 张`);
console.log(`\n已接线 ${ok.length} · 数据驱动 ${auto.length} · 孤儿 ${orphans.length}`);
if (orphans.length) {
  console.log("\n孤儿（部署目录里没有任何代码或数据引用）：");
  for (const id of orphans.sort()) console.log(`  - ${id}`);
}
if (portraitFiles.length) {
  console.log(`\n立绘源图 ${portraitFiles.length} 张已归档在 docs/art/portraits-archive/（不进部署，游戏用 faces/ 头像）。`);
} else {
  console.log("\n注意：docs/art/portraits-archive/ 不在，立绘源图可能被误放回 public/art/portraits/。");
}
