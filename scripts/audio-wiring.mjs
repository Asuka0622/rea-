// 音频接线检查：需求清单（docs/audio/audio-cues.csv）与实际落盘素材是否对得上。
//
// 用法：node scripts/audio-wiring.mjs
//
// 分档说明（与素材接线 art-wiring.mjs 同一套思路）：
//   WIRED     运行版文件在部署目录，且代码中已出现该 id（播放器接上了）。
//   DELIVERED 文件已到部署目录，但代码还没引用——等播放器接上就变 WIRED。
//   REVIEW    文件名带 -review，是待审试样：先过审批，通过后才改名进正式目录。
//             不算孤儿，也不算已交付。
//   PLANNED   清单里有、文件还没有，按优先级排队等制作。
//   ORPHAN    部署目录里有文件，但清单里查无此项——要么补进清单，要么归档。
//
// 注意：public/audio/ 是部署目录，会打进桌面包和网页包。母版 WAV 不要长期留在这里，
// 审核通过后只放压缩运行版，母版归档到 docs/audio/master/。

import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, extname, basename } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const AUDIO = join(ROOT, "public", "audio");
const CUES = join(ROOT, "docs", "audio", "audio-cues.csv");
// 待审试样放这里：文件名 <id>-review.wav，审批通过后才改名进 public/audio/。
const REVIEW_DIR = join(ROOT, "docs", "audio", "review");
// 母版归档：过了审的 WAV 母版放这里，不进打包产物。
const MASTER_DIR = join(ROOT, "docs", "audio", "master");

// 代码 + 数据 + 样式拼起来做引用匹配：播放器一旦引用某个 id，这里就能看到。
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

if (!existsSync(CUES)) {
  console.error(`找不到需求清单：${CUES}`);
  process.exit(1);
}

const rows = readFileSync(CUES, "utf8").trim().split(/\r?\n/).slice(1)
  .map((line) => line.trim()).filter(Boolean)
  .map((line) => {
    const [id, category, priority, trigger, loop, targetSeconds, status, targetDirectory] = line.split(",");
    return { id, category, priority, trigger, loop, targetSeconds, status, targetDirectory };
  });

const AUDIO_EXT = /\.(wav|ogg|mp3|m4a|flac|webm)$/i;
const RUNTIME_EXT = /\.(ogg|mp3|m4a|webm)$/i;
const MASTER_EXT = /\.(wav|flac)$/i;
const REVIEW_SUFFIX = /-review$/i;

// key = 相对 public/audio/ 的去扩展名路径，例如 music/bgm-town-day
const onDisk = new Map();
const scan = (dir, prefix = "") => {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) { scan(full, `${prefix}${entry.name}/`); continue; }
    const ext = extname(entry.name).toLowerCase();
    if (ext === ".json") {
      const key = `${prefix}${basename(entry.name, ".json")}`;
      if (!onDisk.has(key)) onDisk.set(key, { master: null, runtime: [], meta: full });
      else onDisk.get(key).meta = full;
      continue;
    }
    if (!AUDIO_EXT.test(entry.name)) continue;
    const key = `${prefix}${basename(entry.name, ext)}`;
    if (!onDisk.has(key)) onDisk.set(key, { master: null, runtime: [], meta: null });
    const rec = onDisk.get(key);
    if (RUNTIME_EXT.test(entry.name)) rec.runtime.push(ext.slice(1));
    else if (MASTER_EXT.test(entry.name)) rec.master = full;
  }
};
scan(AUDIO);

// 待审试样：<id>-review.<ext>，按 id 反查清单条目。
const pending = new Map(); // id -> 文件绝对路径
if (existsSync(REVIEW_DIR)) {
  for (const entry of readdirSync(REVIEW_DIR, { withFileTypes: true })) {
    if (!entry.isFile() || !AUDIO_EXT.test(entry.name)) continue;
    const stem = basename(entry.name, extname(entry.name));
    if (!REVIEW_SUFFIX.test(stem)) continue;
    pending.set(stem.replace(REVIEW_SUFFIX, ""), join(REVIEW_DIR, entry.name));
  }
}

const sizeOf = (p) => { try { return statSync(p).size; } catch { return 0; } };
const MB = (n) => `${(n / 1024 / 1024).toFixed(1)}MB`;
const relDir = (d) => String(d || "").replace(/^public\/audio\//, "");

const known = new Set(rows.map((r) => r.id));
const buckets = { WIRED: [], DELIVERED: [], REVIEW: [], PLANNED: [], ORPHAN: [] };

for (const row of rows) {
  const prefix = relDir(row.targetDirectory);
  const rec = onDisk.get(`${prefix}${row.id}`);
  if (!rec) {
    const review = pending.get(row.id);
    if (review) buckets.REVIEW.push({ ...row, review });
    else buckets.PLANNED.push(row);
    continue;
  }
  const referenced = sources.includes(row.id);
  if (referenced && rec.runtime.length) buckets.WIRED.push({ ...row, rec });
  else if (REVIEW_SUFFIX.test(row.id)) buckets.REVIEW.push({ ...row, rec });
  else buckets.DELIVERED.push({ ...row, rec });
}

for (const [key, rec] of onDisk) {
  if (known.has(key) || known.has(key.split("/").pop())) continue;
  buckets.ORPHAN.push({ id: key, rec });
}

const CATS = ["music", "stinger", "ambience", "sfx"];
console.log(`音频接线检查 · ${new Date().toISOString().slice(0, 10)}`);
console.log(`  清单 ${rows.length} 项（docs/audio/audio-cues.csv）· 部署目录文件组 ${onDisk.size}`);
console.log(`\n已接线 ${buckets.WIRED.length} · 已交付待接 ${buckets.DELIVERED.length} · 待审试样 ${buckets.REVIEW.length} · 待制作 ${buckets.PLANNED.length} · 孤儿 ${buckets.ORPHAN.length}`);

console.log("\n按类别：");
for (const cat of CATS) {
  const list = rows.filter((r) => r.category === cat);
  if (!list.length) continue;
  const have = list.filter((r) => onDisk.has(`${relDir(r.targetDirectory)}${r.id}`)).length;
  const p0 = list.filter((r) => r.priority === "P0").length;
  console.log(`  ${cat.padEnd(9)} ${String(have).padStart(2)}/${list.length} 有文件 · P0 ${p0} 项`);
}

if (buckets.REVIEW.length) {
  console.log("\n待审试样（docs/audio/review/，审批通过后才进正式目录）：");
  for (const r of buckets.REVIEW) console.log(`  - ${r.id} · ${basename(r.review)} · ${MB(sizeOf(r.review))}`);
}
if (buckets.DELIVERED.length) {
  console.log("\n已交付待接线（文件在，播放器还没引用）：");
  for (const r of buckets.DELIVERED) {
    const missing = [];
    if (!r.rec.meta) missing.push("元数据json");
    if (!r.rec.runtime.length) missing.push("运行压缩版");
    console.log(`  - ${r.id}${missing.length ? ` · 缺 ${missing.join(" / ")}` : ""}`);
  }
}
if (buckets.ORPHAN.length) {
  console.log("\n孤儿（部署目录里有文件，清单里没有）：");
  for (const o of buckets.ORPHAN.sort((a, b) => a.id.localeCompare(b.id))) {
    console.log(`  - ${o.id}${o.rec.master ? ` · ${MB(sizeOf(o.rec.master))}` : ""}`);
  }
}

const heavy = [...onDisk.entries()].filter(([, rec]) => rec.master && sizeOf(rec.master) > 5 * 1024 * 1024);
if (heavy.length) {
  console.log("\n体积提醒（母版在 public/audio/ 下会进打包产物）：");
  for (const [key, rec] of heavy) console.log(`  - ${key} · ${MB(sizeOf(rec.master))} · 移到 docs/audio/master/，只留运行版`);
}

const masters = existsSync(MASTER_DIR) ? readdirSync(MASTER_DIR).filter((n) => MASTER_EXT.test(n)) : [];
console.log(`\n母版归档 ${masters.length} 份（docs/audio/master/，不进打包产物）。`);

if (!sources.includes("createMusic") && !sources.includes("game-music")) {
  console.log("\n播放层：尚未接线。清单里的项目前都只是需求，代码里还没有 BGM 切换 / 环境声 / 短音乐调度。");
}

if (buckets.ORPHAN.length) process.exitCode = 1;
