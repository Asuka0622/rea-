import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCandidates, buildPrompt, buildSpec, sourceKind } from "../public/replicate-spec.js";

// Shaped like the workbench's Electron report (see lib/summarize.mjs).
const electronReport = {
  title: "JavaScript 应用分析",
  headline: "这是一个 Electron 桌面应用，共 3 个源码模块。",
  facts: [],
  sections: [
    { title: "主进程提供的功能（IPC 通道）", table: { columns: ["通道名", "方式", "位置"], rows: [["notes:list", "请求后回复结果", "第 16 行"], ["notes:save", "请求后回复结果", "第 17 行"], ["notes:export", "请求后回复结果", "第 23 行"]] } },
    { title: "用到的外部能力", items: ["Node 内置：fs", "第三方包：electron-store"] },
    { title: "代码文件", items: ["main.js", "preload.js"] },
  ],
};

test("lists rebuildable features from a report, plus a whole-app option", () => {
  const { supported, groups } = buildCandidates([electronReport]);
  assert.equal(supported, true);
  assert.equal(groups[0].options[0].id, "whole");
  const ipc = groups.find((group) => group.title.startsWith("主进程提供的功能"));
  assert.deepEqual(ipc.options.map((option) => option.label), ["notes:list", "notes:save", "notes:export"]);
  assert.ok(!groups.some((group) => group.title === "代码文件"), "file lists are not features");
});

test("writes a clean-room spec with rules and a checklist", () => {
  const { groups } = buildCandidates([electronReport]);
  const save = groups.flatMap((group) => group.options).find((option) => option.label === "notes:save");
  const spec = buildSpec({ reports: [electronReport], target: "C:\\apps\\SomeNotes", choice: save.id, platform: "web", goal: "一个能记笔记的小本子", now: new Date("2026-10-13T12:00:00Z") });
  assert.match(spec, /^# 复刻说明书：一个能记笔记的小本子/);
  assert.match(spec, /通道：notes:save（请求后回复结果 · 第 17 行）/);
  assert.match(spec, /notes:export/, "related channels in the same part are listed for context");
  assert.match(spec, /用到的外部能力：Node 内置：fs；第三方包：electron-store/);
  assert.match(spec, /不要去找或复制原软件的源代码/);
  assert.match(spec, /不发布、不售卖/, "third-party software gets the personal-use rule");
  assert.match(spec, /- \[ \] 能完成：notes:save/);
});

test("open-source samples get license wording instead of the personal-use rule", () => {
  assert.equal(sourceKind("D:\\gpt\\rea\\samples\\notes-demo"), "open");
  assert.equal(sourceKind("C:\\Program Files\\Foo"), "third-party");
  const spec = buildSpec({ reports: [electronReport], target: "D:\\gpt\\rea\\samples\\notes-demo", choice: "whole", platform: "web" });
  assert.match(spec, /遵守它的许可证/);
  assert.match(spec, /- \[ \] 能完成：notes:list/, "the whole-app option checks every listed feature");
});

test("asset-only reports point to the model-Mod guide instead", () => {
  const result = buildCandidates([{ title: "人物模型 Mod · 文件与资源", headline: "", sections: [] }]);
  assert.equal(result.supported, false);
  assert.match(result.reason, /人物模型 Mod/);
});

test("prompts differ by route", () => {
  const spec = "# 复刻说明书：x";
  assert.match(buildPrompt({ spec, route: "web-ai", platform: "web" }), /一个单独的 HTML 文件/);
  assert.match(buildPrompt({ spec, route: "coding-tool", platform: "existing" }), /等我确认后再写代码/);
  assert.ok(buildPrompt({ spec, route: "web-ai", platform: "web" }).endsWith(spec));
});

test("guesses a plain-language meaning from common English words", async () => {
  const { guessMeaning } = await import("../public/replicate-spec.js");
  assert.equal(guessMeaning("notes:save"), "可能是：保存 笔记");
  assert.equal(guessMeaning("DailyTodayWidget"), "可能是：今日 小组件");
  assert.equal(guessMeaning("xyz:qwe"), "");
});
