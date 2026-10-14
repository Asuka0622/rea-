import { test } from "node:test";
import assert from "node:assert/strict";
import { caseCatalog } from "../lib/cases.mjs";
import { clueTarget, judgeClick, starsFor, provesClaim } from "../public/case-game.js";

const report = {
  sections: [
    { title: "主进程提供的功能（IPC 通道）", table: { columns: ["通道名"], rows: [["ledger:add"], ["ledger:list"], ["ledger:sync"], ["helper:peek-clipboard"]] } },
    { title: "联网请求（发往哪里）", table: { columns: ["网址"], rows: [["https://api.ledger-sync.example/v1/sync"], ["https://collect.quiet-stats.example/v2/report"]] } },
    { title: "敏感能力线索", table: { columns: ["能力"], rows: [["读取剪贴板"], ["读取电脑名"], ["读取系统用户名"]] } },
    { title: "定时执行的代码", table: { columns: ["多久一次"], rows: [["每 30 秒重复一次"]] } },
  ],
};
const privacy = caseCatalog().find((c) => c.id === "privacy-ledger");
const q = (id) => privacy.questions.find((x) => x.id === id);

test("every clue of the detective case is answered by clicking real report rows", () => {
  const needs = Object.fromEntries(privacy.questions.map((question) => [question.id, clueTarget(question, [report]).required]));
  assert.deepEqual(needs, {
    "count-urls": ["https://api.ledger-sync.example/v1/sync", "https://collect.quiet-stats.example/v2/report"],
    "suspicious-url": ["https://collect.quiet-stats.example/v2/report"],
    "hidden-channel": ["helper:peek-clipboard"],
    timer: ["每 30 秒重复一次"],
    "device-info": ["读取电脑名", "读取系统用户名"],
  });
  for (const question of privacy.questions) assert.ok(question.gamePrompt, question.id);
});

test("clicks are judged by section and row", () => {
  const target = clueTarget(q("hidden-channel"), [report]);
  assert.equal(judgeClick(target, [], "联网请求（发往哪里）", "https://collect.quiet-stats.example/v2/report"), "wrong-section");
  assert.equal(judgeClick(target, [], "主进程提供的功能（IPC 通道）", "ledger:add"), "wrong-row");
  assert.equal(judgeClick(target, [], "主进程提供的功能（IPC 通道）", "helper:peek-clipboard"), "found");
  assert.equal(judgeClick(target, ["helper:peek-clipboard"], "主进程提供的功能（IPC 通道）", "helper:peek-clipboard"), "again");
  assert.equal(clueTarget({ type: "choice", options: ["a"], answer: "a" }, [report]).kind, "choice");
  assert.equal(clueTarget(q("hidden-channel"), [{ sections: [] }]).available, false);
});

test("stars reward a clean run", () => {
  assert.equal(starsFor({}), 3);
  assert.equal(starsFor({ mistakes: 1, hints: 2 }), 2);
  assert.equal(starsFor({ mistakes: 3, hints: 1 }), 1);
});

test("each verdict claim is provable from the evidence the clues collect, and the normal sync URL proves none", () => {
  const bag = privacy.questions.flatMap((question) => clueTarget(question, [report]).required);
  for (const claim of privacy.game.verdict.claims) assert.ok(bag.some((e) => provesClaim(claim, e)), claim.text);
  assert.ok(privacy.game.verdict.claims.every((claim) => !provesClaim(claim, "https://api.ledger-sync.example/v1/sync")));
});
