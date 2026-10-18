// 知识点 × 剧情 × 深度 矩阵
//
// 用一张表回答一个问题：**同一个知识点，玩家是不是只在同一个故事里见过一次？**
// 只在序章见过一次的点，玩家顶多「说得出」；要在两个以上不同的故事里做过，才可能「做得出」。
//
// 用法：node scripts/knowledge-matrix.mjs
// 数据来源：public/prologue-quests.js（知识点目录 + 每份委托的 knowledge 标注）。
// 案例 JSON 里的 `knowledge` 字段如果存在，优先于委托清单。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { KNOWLEDGE_POINTS, PROLOGUE_QUESTS, coverageGaps } from "../public/prologue-quests.js";

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const caseRoot = path.join(project, "samples", "cases");

/** 深度四级。名次用于比较，标签用于显示。 */
const DEPTHS = [
  ["L1", "见过", 1],
  ["L2", "说得出", 2],
  ["L3", "做得出", 3],
  ["L4", "判得准", 4],
];
const rank = (depth) => DEPTHS.find(([key]) => key === depth)?.[2] ?? 0;

/** REA 的原理与局限，拆成可以被多个故事复用的知识点。 */
const KNOWLEDGE = KNOWLEDGE_POINTS;

/** 每个故事把哪个知识点教到哪一层，来自序章委托清单。 */
const STORIES = Object.fromEntries(
  PROLOGUE_QUESTS.map((quest) => [
    quest.caseId || quest.id,
    Object.fromEntries((quest.knowledge || []).map((entry) => [entry.id, entry.depth])),
  ]),
);

function readCaseIds() {
  if (!fs.existsSync(caseRoot)) return [];
  return fs
    .readdirSync(caseRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(caseRoot, entry.name, "workbench-case.json")))
    .map((entry) => entry.name);
}

/** 案例 JSON 里的 `knowledge` 优先于脚本内置的标注。 */
function readDeclaredKnowledge() {
  const declared = {};
  for (const id of readCaseIds()) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(caseRoot, id, "workbench-case.json"), "utf8"));
      if (!Array.isArray(data.knowledge)) continue;
      declared[id] = {};
      for (const entry of data.knowledge) {
        if (entry?.id && entry?.depth) declared[id][entry.id] = entry.depth;
      }
    } catch {
      /* 读不动的案例留给别的测试去报错 */
    }
  }
  return declared;
}

const ids = readCaseIds();
const declared = readDeclaredKnowledge();
const stories = Object.keys({ ...STORIES, ...declared }).filter((id) => ids.includes(id));
const depthOf = (story, knowledgeId) => declared[story]?.[knowledgeId] ?? STORIES[story]?.[knowledgeId];

// 覆盖率：每个知识点出现在几个故事里、最高到哪一层。
const rows = Object.entries(KNOWLEDGE).map(([id, label]) => {
  const hits = stories.filter((story) => depthOf(story, id));
  const best = hits.reduce((top, story) => (rank(depthOf(story, id)) > rank(top) ? depthOf(story, id) : top), "");
  return { id, label, hits, best, bestRank: rank(best) };
});

const width = Math.max(...rows.map((row) => [...row.label].length)) + 2;
const pad = (text, n) => text + " ".repeat(Math.max(0, n - [...text].length));

console.log("知识点 × 剧情 × 深度\n");
console.log(pad("知识点", width) + stories.map((story) => pad(story.slice(0, 12), 14)).join(""));
for (const row of rows) {
  const cells = stories.map((story) => pad(depthOf(story, row.id) ?? "·", 14)).join("");
  console.log(pad(row.label, width) + cells);
}

console.log("\n覆盖情况");
const lonely = rows.filter((row) => row.hits.length <= 1);
const deep = rows.filter((row) => row.bestRank >= 3);
const migrated = rows.filter((row) => row.hits.filter((story) => rank(depthOf(story, row.id)) >= 3).length >= 2);

console.log(`- 知识点共 ${rows.length} 个，出现在 2 个以上故事的：${rows.length - lonely.length} 个`);
console.log(`- 到过 L3（做得出）的：${deep.length} 个 —— ${deep.map((row) => row.id).join(", ") || "无"}`);
console.log(`- 在两个以上故事里到过 L3 的：${migrated.length} 个 —— ${migrated.map((row) => row.id).join(", ") || "无"}`);
if (lonely.length) console.log(`- 只在 1 个故事里出现：${lonely.map((row) => row.id).join(", ")}`);

const missing = ids.filter((id) => !stories.includes(id));
if (missing.length) console.log(`- 还没有标注的故事：${missing.join(", ")}`);
