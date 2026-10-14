import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { caseCatalog } from "../lib/cases.mjs";
import { scanSourceClues, clueSections, mask } from "../lib/source-clues.mjs";
import { comparisonReport, diffReports, latestChanges, readComparison } from "../lib/compare.mjs";
import { detectTarget } from "../lib/detect.mjs";
import { questionOptions, isCorrect } from "../public/case-quest.js";
import { openSave, packSave, gameLoads } from "../public/save-lab.js";
import { encodeAxml, zip, MANIFEST } from "../scripts/build-case-apk.mjs";

const byId = Object.fromEntries(caseCatalog().map((c) => [c.id, c]));
const report = (target) => ({ sections: clueSections(scanSourceClues(target)) });
/** Every pick question of a case is answerable from the given reports, and only by its answer. */
function assertAnswerable(item, reports, sections) {
  for (const question of item.questions.filter((q) => q.type !== "choice" && sections.includes(q.section))) {
    const { available, correct, options } = questionOptions(question, reports);
    assert.ok(options.length >= 2, `${item.id}/${question.id} offers a real choice`);
    assert.ok(available, `${item.id}/${question.id} has its section`);
    assert.ok(isCorrect(question, reports, correct), `${item.id}/${question.id}`);
    if (question.type === "pick-row") assert.equal(correct.length, 1, `${item.id}/${question.id} has one right row`);
  }
}

test("the case library lists every case in order", () => {
  assert.deepEqual(caseCatalog().map((c) => c.id), ["privacy-ledger", "weather-keys", "calculator-eggs", "farm-save", "notes-versions", "flashlight-apk", "real-stories"]);
  assert.match(byId["flashlight-apk"].path, /xiaoguang-flashlight\.apk$/);
  assert.deepEqual(byId["flashlight-apk"].requires, ["jadx", "java"]);
  assert.equal(byId["real-stories"].path, null);
  for (const story of byId["real-stories"].stories) if (story.related) assert.ok(byId[story.related], story.id);
  for (const item of caseCatalog().filter((c) => c.type !== "stories")) {
    for (const question of item.questions) {
      assert.ok(question.prompt && question.hint && question.explain, `${item.id}/${question.id}`);
      if (question.type === "choice") assert.ok(question.options.includes(question.answer), `${item.id}/${question.id}`);
    }
  }
});

test("secrets in the weather sample are found and masked", () => {
  const clues = scanSourceClues(byId["weather-keys"].path);
  assert.deepEqual(clues.secrets.map((s) => s.name).sort(), ["MAP_ACCESS_TOKEN", "STATS_DB_URL", "WEATHER_API_KEY", "adminPassword"]);
  assert.ok(clues.secrets.every((s) => !/Xiaobai2024|letmein-8848|4f9c2a7e/.test(s.value)), "values are masked");
  assert.equal(mask("postgres://admin:pw123@db.example/x"), "postgres://admin:••••••@db.example/x");
  assertAnswerable(byId["weather-keys"], [report(byId["weather-keys"].path)], ["疑似密钥"]);
});

test("hidden entries in the calculator sample are found", () => {
  const clues = scanSourceClues(byId["calculator-eggs"].path);
  assert.deepEqual(clues.hidden.map((h) => h.clue), ["快捷键 Ctrl+Shift+D", "暗号 1314520", "按键序列 ↑↑↓↓←→←→BA", "隐藏页面 #/__debug"]);
  assertAnswerable(byId["calculator-eggs"], [report(byId["calculator-eggs"].path)], ["快捷键与隐藏入口"]);
});

test("the farm save format is found, and the save lab shows why the checksum matters", async () => {
  const item = byId["farm-save"];
  assertAnswerable(item, [report(item.path)], ["存档与本地数据", "疑似密钥"]);
  assert.deepEqual(scanSourceClues(item.path).secrets.map((s) => s.name), ["SAVE_SALT"], "the case description is not scanned");
  const { packed, state } = openSave(item.lab.content);
  assert.equal(state.gold, 230);
  const salt = item.lab.salt;
  assert.ok((await gameLoads(item.lab.content, salt)).ok, "the shipped save loads");
  const naive = await packSave(packed, { ...state, gold: 99999 }, { salt, fixChecksum: false });
  assert.equal((await gameLoads(naive, salt)).ok, false);
  const fixed = await packSave(packed, { ...state, gold: 99999 }, { salt, fixChecksum: true });
  assert.equal((await gameLoads(fixed, salt)).state.gold, 99999);
  assert.match(fs.readFileSync(new URL("../samples/cases/farm-save/save.js", import.meta.url), "utf8"), new RegExp(`SAVE_SALT = "${salt}"`));
});

test("version comparison lists what was added and removed", () => {
  const target = byId["notes-versions"].path;
  assert.equal(detectTarget(target).kind, "compare");
  assert.deepEqual(Object.values(readComparison(target)).map((s) => s.label), ["1.0 版", "1.1 版"]);
  assert.deepEqual(latestChanges("# 更新说明\n\n## 1.1.0\n- 修好了\n- 更快了\n\n## 1.0.0\n- 第一版"), ["修好了", "更快了"]);
  const table = (title, rows) => ({ title, table: { columns: ["名称"], rows: rows.map((r) => [r]) } });
  const before = { sections: [table("主进程提供的功能（IPC 通道）", ["notes:list", "notes:export-txt"]), table("定时执行的代码", ["每 30 秒重复一次"])] };
  const after = { sections: [table("主进程提供的功能（IPC 通道）", ["notes:list", "notes:pin"]), table("定时执行的代码", ["每 30 秒重复一次", "每 10 分钟重复一次"]), table("敏感能力线索", ["截取屏幕"])] };
  const { added, removed } = diffReports(before, after);
  assert.deepEqual(added.map((s) => [s.title, s.table.rows.flat()]), [
    ["新增 · 主进程提供的功能（IPC 通道）", ["notes:pin"]],
    ["新增 · 定时执行的代码", ["每 10 分钟重复一次"]],
    ["新增 · 敏感能力线索", ["截取屏幕"]],
  ]);
  assert.deepEqual(removed.map((s) => s.table.rows.flat()), [["notes:export-txt"]]);
  const result = comparisonReport({
    before: { label: "1.0 版", info: { version: "1.0.0", changelog: "" }, report: before },
    after: { label: "1.1 版", info: { version: "1.1.0", changelog: "## 1.1.0\n- 修复了一些小问题" }, report: after },
  });
  assert.equal(result.sections[0].items[0], "修复了一些小问题");
  assert.match(result.headline, /新增了 3 项、去掉了 1 项/);
  // Each single-row change gets distractors, so every question is a real choice.
  const reports = [{ sections: [{ title: "更新说明", items: ["修复了一些小问题"] }, ...added.map((s) => ({ ...s, title: s.title })), ...removed.map((s) => ({ ...s, title: `去掉 · 主进程提供的功能（IPC 通道）` }))] }];
  const removedQuestion = byId["notes-versions"].questions.find((q) => q.id === "removed");
  const { options, correct } = questionOptions(removedQuestion, reports);
  assert.equal(options.length, 4);
  assert.deepEqual(correct, ["notes:export-txt"]);
  assert.ok(!isCorrect(removedQuestion, reports, ["notes:pin"]));
});

test("the teaching APK is reproducible from its build script", () => {
  const built = zip({ "AndroidManifest.xml": encodeAxml(MANIFEST) });
  assert.deepEqual(built, fs.readFileSync(byId["flashlight-apk"].path));
  assert.equal(built.readUInt32LE(0), 0x04034b50);
  const axml = encodeAxml(MANIFEST);
  assert.equal(axml.readUInt16LE(0), 0x0003);
  assert.equal(axml.readUInt32LE(4), axml.length);
});
