import { test } from "node:test";
import assert from "node:assert/strict";
import { caseCatalog } from "../lib/cases.mjs";
import { isCorrect, questionOptions } from "../public/case-quest.js";
import { summarize } from "../lib/summarize.mjs";

const report = {
  sections: [
    { title: "联网请求（发往哪里）", table: { head: ["网址", "位置", "方式"], rows: [["https://api.ledger-sync.example/v1/sync", "main.js 第 32 行", "fetch"], ["https://collect.quiet-stats.example/v2/report", "main.js 第 46 行", "fetch"]] } },
    { title: "敏感能力线索", table: { head: ["能力"], rows: [["读取剪贴板"], ["读取电脑名"], ["读取系统用户名"]] } },
  ],
};

test("the case catalog lists the privacy case first, with its sample folder", () => {
  const [first] = caseCatalog();
  assert.equal(first.id, "privacy-ledger");
  assert.equal(first.format, "rea-workbench-case-v1");
  assert.match(first.path.replace(/\\/g, "/"), /samples\/cases\/privacy-ledger$/);
  for (const question of first.questions) assert.ok(question.prompt && question.hint && question.explain, question.id);
});

test("count questions offer numbers around the real row count", () => {
  const { available, options, correct } = questionOptions({ type: "count", section: "联网请求（发往哪里）" }, [report]);
  assert.ok(available);
  assert.deepEqual(options, ["1 处", "2 处", "3 处", "4 处"]);
  assert.deepEqual(correct, ["2 处"]);
});

test("pick-row options come from the report and only the matching row is right", () => {
  const question = { type: "pick-row", section: "联网请求（发往哪里）", answer: "quiet-stats" };
  assert.equal(questionOptions(question, [report]).options.length, 2);
  assert.ok(isCorrect(question, [report], ["https://collect.quiet-stats.example/v2/report"]));
  assert.ok(!isCorrect(question, [report], ["https://api.ledger-sync.example/v1/sync"]));
});

test("pick-rows needs exactly the right set", () => {
  const question = { type: "pick-rows", section: "敏感能力线索", answer: ["读取电脑名", "读取系统用户名"] };
  assert.ok(questionOptions(question, [report]).multi);
  assert.ok(isCorrect(question, [report], ["读取系统用户名", "读取电脑名"]));
  assert.ok(!isCorrect(question, [report], ["读取电脑名"]));
  assert.ok(!isCorrect(question, [report], ["读取电脑名", "读取系统用户名", "读取剪贴板"]));
});

test("a question whose section is missing is reported unavailable", () => {
  const result = questionOptions({ type: "pick-row", section: "不存在", answer: "x" }, [report]);
  assert.equal(result.available, false);
  assert.equal(isCorrect({ type: "pick-row", section: "不存在", answer: "x" }, [report], ["x"]), false);
});

// A trimmed REA semantic graph shaped like the one REA produces for the privacy sample.
const id = (n) => `n${n}`;
const node = (n, kind, role, line, extra = {}) => ({ node_id: id(n), kind, label: extra.label || kind, identity: { module_path: extra.file || "main.js", role_key: role, source_range: { start: { line } } }, properties: extra.properties || {} });
const semantic = {
  nodes: [
    node(1, "literal", 'literal:"https://api.ledger-sync.example/v1/sync"', 5),
    node(2, "binding", "binding:SYNC_URL", 5),
    node(3, "expression", "expression:argument:call:call:900:950:0", 32),
    node(4, "request", "request:900:950", 32, { label: "fetch" }),
    node(5, "literal", 'literal:"https://collect.quiet-stats.example/v2/report"', 6),
    node(6, "binding", "binding:STATS_URL", 6),
    node(7, "expression", "expression:argument:call:call:1400:1460:0", 46),
    node(8, "request", "request:1400:1460", 46, { label: "fetch" }),
    node(9, "timer", "timer:1", 12, { file: "renderer.js", label: "setInterval", properties: { method: "setInterval", delay_milliseconds: 30000 } }),
    node(10, "property-slot", 'property:["main.js:binding:clipboard",["readText"]]', 20),
    node(11, "property-slot", 'property:["main.js:binding:os",["hostname"]]', 40),
    node(12, "property-slot", 'property:["main.js:binding:os",["userInfo"]]', 41),
    node(13, "property-slot", 'property:["main.js:binding:os",["platform"]]', 42),
  ],
  relations: [
    { relation: "defines", source_node_id: id(1), target_node_id: id(2) },
    { relation: "reads", source_node_id: id(2), target_node_id: id(3) },
    { relation: "defines", source_node_id: id(5), target_node_id: id(6) },
    { relation: "aliases", source_node_id: id(6), target_node_id: id(7) },
  ],
};

test("JavaScript reports pair URLs with requests and list sensitive APIs and timers", () => {
  const result = {
    normalized_result: {
      graph: { nodes: [{ id: "e1", kind: "endpoint", label: "ledger.entries" }], edges: [] },
      semantic_graph: semantic,
    },
  };
  const sections = summarize("analyze-javascript-application", result).sections;
  const section = (title) => sections.find((s) => s.title === title);
  const requests = section("联网请求（发往哪里）").table.rows;
  assert.deepEqual(requests.map((row) => row[0]), ["https://api.ledger-sync.example/v1/sync", "https://collect.quiet-stats.example/v2/report"]);
  assert.match(requests[1][1], /main\.js 第 46 行/);
  assert.deepEqual(section("敏感能力线索").table.rows.map((row) => row[0]), ["读取剪贴板", "读取电脑名", "读取系统用户名"]);
  assert.match(JSON.stringify(section("定时执行的代码")), /每 30 秒重复一次/);
  assert.ok(!JSON.stringify(sections).includes("ledger.entries"), "store keys are not shown as web addresses");
});
