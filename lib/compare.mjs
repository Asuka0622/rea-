import fs from "node:fs";
import path from "node:path";
import { runRea } from "./rea.mjs";
import { summarize } from "./summarize.mjs";
import { withSourceClues } from "./source-clues.mjs";

// 版本对比: analyse two versions of the same JavaScript application with REA and report what changed.
// A comparison folder holds workbench-compare.json naming the two version folders inside it.

export const COMPARE_FILE = "workbench-compare.json";

/** The two version folders of a comparison, resolved and kept inside `target`. */
export function readComparison(target) {
  const spec = JSON.parse(fs.readFileSync(path.join(target, COMPARE_FILE), "utf8").replace(/^﻿/, ""));
  if (spec.format !== "rea-workbench-compare-v1") throw new Error("对比说明文件格式不对，应为 rea-workbench-compare-v1");
  const side = (entry, fallback) => {
    const dir = path.resolve(target, String(entry?.path || ""));
    const relative = path.relative(target, dir);
    if (!entry?.path || relative.startsWith("..") || path.isAbsolute(relative) || !fs.statSync(dir, { throwIfNoEntry: false })?.isDirectory()) {
      throw new Error(`找不到${fallback}的文件夹，它必须在对比文件夹里面`);
    }
    return { dir, label: String(entry.label || entry.path) };
  };
  return { before: side(spec.before, "旧版本"), after: side(spec.after, "新版本") };
}

function versionInfo(dir) {
  let version = "";
  try {
    version = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8")).version || "";
  } catch {}
  let changelog = "";
  for (const name of ["CHANGELOG.md", "CHANGELOG.txt", "更新说明.md"]) {
    const file = path.join(dir, name);
    if (fs.existsSync(file)) {
      changelog = fs.readFileSync(file, "utf8").slice(0, 4000);
      break;
    }
  }
  return { version, changelog };
}

/** Lines of the newest entry of a changelog: everything under the first "## " heading. */
export function latestChanges(changelog) {
  const lines = changelog.split(/\r?\n/);
  const start = lines.findIndex((line) => /^##\s/.test(line));
  if (start < 0) return lines.map((l) => l.replace(/^[-*]\s*/, "").trim()).filter((l) => l && !l.startsWith("#")).slice(0, 8);
  const out = [];
  for (const line of lines.slice(start + 1)) {
    if (/^##\s/.test(line)) break;
    const text = line.replace(/^[-*]\s*/, "").trim();
    if (text) out.push(text);
  }
  return out;
}

const SKIP = new Set(["Electron 结构", "代码文件", "被引用最多的模块"]);
const rowsOf = (section) => (section.table ? section.table.rows.map((row) => ({ key: String(row[0]), row })) : (section.items || []).map((item) => ({ key: String(item), row: item })));

/** Sections listing what appeared and disappeared between two reports, keyed by each row's first cell. */
export function diffReports(before, after) {
  const titles = [...new Set([...after.sections, ...before.sections].map((s) => s.title))].filter((t) => !SKIP.has(t));
  const added = [];
  const removed = [];
  for (const title of titles) {
    const a = before.sections.find((s) => s.title === title);
    const b = after.sections.find((s) => s.title === title);
    const oldKeys = new Set(a ? rowsOf(a).map((r) => r.key) : []);
    const newKeys = new Set(b ? rowsOf(b).map((r) => r.key) : []);
    const plus = b ? rowsOf(b).filter((r) => !oldKeys.has(r.key)) : [];
    const minus = a ? rowsOf(a).filter((r) => !newKeys.has(r.key)) : [];
    const shape = (source, list) => (source.table ? { table: { columns: source.table.columns, rows: list.map((r) => r.row) } } : { items: list.map((r) => r.row) });
    if (plus.length) added.push({ title: `新增 · ${title}`, explain: `新版本里有、旧版本里没有的。${b.explain || ""}`, ...shape(b, plus) });
    if (minus.length) removed.push({ title: `去掉 · ${title}`, explain: "旧版本里有、新版本里没有了的。", ...shape(a, minus) });
  }
  return { added, removed };
}

function countRows(sections) {
  return sections.reduce((sum, s) => sum + (s.table ? s.table.rows.length : (s.items || []).length), 0);
}

/** Build the comparison report from two analysed versions (pure, for tests). */
export function comparisonReport({ before, after }) {
  const { added, removed } = diffReports(before.report, after.report);
  const plus = countRows(added);
  const minus = countRows(removed);
  const notes = latestChanges(after.info.changelog);
  const sections = [
    {
      title: "更新说明",
      explain: "开发者在新版本里自己写的更新说明。拿它和下面实际找到的变化对比一下：说的和做的一样吗？",
      items: notes.length ? notes : ["新版本没有附带更新说明"],
    },
    ...added,
    ...removed,
  ];
  return {
    title: "版本对比",
    headline: plus || minus ? `新版本（${after.label}）比旧版本（${before.label}）新增了 ${plus} 项、去掉了 ${minus} 项。` : `新版本（${after.label}）和旧版本（${before.label}）在报告能看到的范围内没有区别。`,
    facts: [
      { label: "旧版本", value: `${before.label}${before.info.version ? `（${before.info.version}）` : ""}` },
      { label: "新版本", value: `${after.label}${after.info.version ? `（${after.info.version}）` : ""}` },
      { label: "新增", value: `${plus} 项` },
      { label: "去掉", value: `${minus} 项` },
    ],
    sections,
    cautions: ["对比只覆盖报告里列出的内容（通道、接口、联网、敏感能力、定时任务、补充扫描等）。改了某个功能的内部写法、但名字没变时，这里看不出来。"],
    nextSteps: [],
  };
}

/** Analyse both versions with REA and compare them. Resolves { ok, raw, report } or { ok: false, error }. */
export async function compareVersions(target, { signal, onProgress } = {}) {
  const { before, after } = readComparison(target);
  const sides = {};
  const raw = { scanner: "rea-workbench/compare-versions", before: null, after: null };
  for (const [name, side] of [["before", before], ["after", after]]) {
    onProgress?.(`正在分析${side.label}…`);
    const result = await runRea(["analyze-javascript-application", side.dir], { signal, onProgress: (p) => onProgress?.(`${side.label}：${p.message}`) });
    if (!result.ok) return { ok: false, error: result.error, side: side.label };
    raw[name] = result.data;
    sides[name] = { label: side.label, info: versionInfo(side.dir), report: withSourceClues(summarize("analyze-javascript-application", result.data), side.dir) };
  }
  return { ok: true, raw, report: comparisonReport(sides) };
}
