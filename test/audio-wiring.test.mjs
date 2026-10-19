import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, extname, basename } from "node:path";

// 音频接线与美术接线同一套规矩：清单是唯一事实来源，
// 部署目录里不能出现清单上没有的孤儿文件。
const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const CUES = join(ROOT, "docs", "audio", "audio-cues.csv");
const AUDIO = join(ROOT, "public", "audio");

const DIR_BY_CATEGORY = {
  music: "public/audio/music/",
  stinger: "public/audio/stingers/",
  ambience: "public/audio/ambience/",
  sfx: "public/audio/sfx/",
};

const rows = (() => {
  const text = readFileSync(CUES, "utf8").trim();
  const lines = text.split(/\r?\n/);
  return {
    header: lines[0].split(","),
    items: lines.slice(1).filter((l) => l.trim()).map((line) => {
      const [id, category, priority, trigger, loop, targetSeconds, status, targetDirectory] = line.split(",");
      return { id, category, priority, trigger, loop, targetSeconds, status, targetDirectory };
    }),
  };
})();

test("audio cues: the list exists, is well formed, and every id is unique", () => {
  assert.deepEqual(rows.header, ["id", "category", "priority", "trigger", "loop", "target_seconds", "status", "target_directory"]);
  assert.ok(rows.items.length >= 27, "the full cue list is there");
  const ids = rows.items.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length, "no duplicate ids");
  for (const row of rows.items) {
    assert.match(row.id, /^[a-z0-9-]+$/, `${row.id}: lower-case kebab id`);
    assert.ok(Object.hasOwn(DIR_BY_CATEGORY, row.category), `${row.id}: known category`);
    assert.ok(["P0", "P1", "P2"].includes(row.priority), `${row.id}: priority is P0/P1/P2`);
    assert.ok(["yes", "no"].includes(row.loop), `${row.id}: loop is yes/no`);
    assert.ok(row.trigger?.trim(), `${row.id}: says where it fires`);
  }
});

test("audio cues: each cue points at the directory its category owns", () => {
  for (const row of rows.items) {
    assert.equal(row.targetDirectory, DIR_BY_CATEGORY[row.category], `${row.id}: lands in ${DIR_BY_CATEGORY[row.category]}`);
  }
});

test("audio cues: the deploy directory holds no orphans", () => {
  const known = new Set(rows.items.map((r) => r.id));
  const orphans = [];
  if (existsSync(AUDIO)) {
    const walk = (dir, prefix = "") => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) { walk(full, `${prefix}${entry.name}/`); continue; }
        if (!/\.(wav|ogg|mp3|m4a|flac|webm)$/i.test(entry.name)) continue;
        const id = basename(entry.name, extname(entry.name));
        if (!known.has(id)) orphans.push(`${prefix}${entry.name}`);
      }
    };
    walk(AUDIO);
  }
  assert.deepEqual(orphans, [], "every file in public/audio/ is on the cue list");
});

test("audio cues: no heavy master files sit in the deploy directory", () => {
  const heavy = [];
  if (existsSync(AUDIO)) {
    const walk = (dir, prefix = "") => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) { walk(full, `${prefix}${entry.name}/`); continue; }
        if (!/\.(wav|flac)$/i.test(entry.name)) continue;
        const { size } = statSync(full);
        if (size > 5 * 1024 * 1024) heavy.push(`${prefix}${entry.name}`);
      }
    };
    walk(AUDIO);
  }
  assert.deepEqual(heavy, [], "masters are archived in docs/audio/master/, not shipped from public/audio/");
});
