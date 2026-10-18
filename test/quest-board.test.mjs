import { test } from "node:test";
import assert from "node:assert/strict";
import {
  prerequisiteMessage,
  parseNeed,
  levelRank,
  questState,
  availableQuests,
  recommendQuests,
  knowledgeGain,
  replayableQuests,
  sourceSeen,
} from "../public/quest-board.js";

const QUESTS = [
  { id: "ledger", title: "小林的小账本", discover: "board", knowledge: [{ id: "data-flow", depth: "L3" }] },
  { id: "keys", title: "学长的钥匙", discover: "board", knowledge: [{ id: "hardcoded-secret", depth: "L3" }] },
  { id: "eggs", title: "小雨的计算器", discover: "rumor:计算器", needs: ["after-calculator"], knowledge: [{ id: "hidden-entry", depth: "L3" }] },
  { id: "save", title: "朵朵的存档", discover: "npc:朵朵", knowledge: [{ id: "save-format", depth: "L3" }] },
  { id: "versions", title: "周姐的便签", discover: "board", after: ["ledger"], knowledge: [{ id: "version-diff", depth: "L3" }] },
  { id: "packed", title: "加密猫", discover: "npc:老秦", needs: ["static-read:L2"], knowledge: [{ id: "packing", depth: "L3" }] },
  { id: "drill", title: "复勘 · 小账本", discover: "board", after: ["ledger"], repeatable: true, replayOf: "ledger", knowledge: [{ id: "data-flow", depth: "L4" }] },
];

test("a need is knowledge id plus a level, and a bare id means L1", () => {
  assert.deepEqual(parseNeed("data-flow:L2"), { id: "data-flow", level: "L2" });
  assert.deepEqual(parseNeed("data-flow"), { id: "data-flow", level: "L1" });
  assert.deepEqual(parseNeed("data-flow:L9"), { id: "data-flow", level: "L1" });
  assert.equal(parseNeed(""), null);
  assert.equal(levelRank("L3"), 3);
  assert.equal(levelRank("nonsense"), 0);
});

test("the board only shows quests whose source has been found", () => {
  assert.equal(sourceSeen({ discover: "board" }, { discovered: [] }), true);
  assert.equal(sourceSeen({ discover: "npc:朵朵" }, { discovered: [] }), false);
  assert.equal(sourceSeen({ discover: "npc:朵朵" }, { discovered: ["npc:朵朵"] }), true);
  assert.equal(sourceSeen({ discover: "npc:朵朵" }, { discovered: ["npc"] }), true, "the whole channel counts");

  const state = questState(QUESTS[3], {});
  assert.equal(state.status, "undiscovered");
});

test("a quest with an unmet prerequisite is locked and says what is missing", () => {
  const locked = questState(QUESTS[4], {});
  assert.equal(locked.status, "locked");
  assert.deepEqual(locked.missing, ["先完成 ledger"]);

  const byKnowledge = questState(QUESTS[5], { discovered: ["npc:老秦"], knowledge: { "static-read": "L1" } });
  assert.equal(byKnowledge.status, "locked");
  assert.deepEqual(byKnowledge.missing, ["static-read 要到 L2"]);

  const open = questState(QUESTS[5], { discovered: ["npc:老秦"], knowledge: { "static-read": "L3" } });
  assert.equal(open.status, "available");
});

test("a finished quest leaves the board unless it is replayable", () => {
  assert.equal(questState(QUESTS[0], { completed: { ledger: true } }).status, "done");
  const drill = questState(QUESTS[6], { completed: { ledger: true } });
  assert.equal(drill.status, "available", "a drill can be taken again");
});

test("available quests are ordered by how neatly they fit the player's level", () => {
  const player = { knowledge: { "data-flow": "L1", "hardcoded-secret": "L2" } };
  const open = availableQuests(QUESTS, player);
  // keys is one step away (L2 → L3); ledger is two steps away (L1 → L3), so keys comes first.
  assert.deepEqual(open.map((item) => item.id).slice(0, 2), ["keys", "ledger"]);
  assert.ok(open[0].gain.score > open[1].gain.score);
});

test("a quest that would jump two levels is worth less than one that fits", () => {
  const near = knowledgeGain({ knowledge: [{ id: "a", depth: "L2" }] }, { knowledge: { a: "L1" } });
  const far = knowledgeGain({ knowledge: [{ id: "b", depth: "L4" }] }, { knowledge: { b: "L1" } });
  const done = knowledgeGain({ knowledge: [{ id: "c", depth: "L3" }] }, { knowledge: { c: "L4" } });
  assert.ok(near.score > far.score);
  assert.equal(done.score, 0);
  assert.deepEqual(near.items, [{ id: "a", from: "L1", to: "L2" }]);
});

test("recommendations are a short list of what is open right now", () => {
  const player = { knowledge: { "data-flow": "L1" } };
  assert.equal(recommendQuests(QUESTS, player).length, 2, "ledger and keys are on the board from the start");
  assert.equal(recommendQuests(QUESTS, player, 1).length, 1);
});

test("replays are listed separately from the first run", () => {
  assert.deepEqual(replayableQuests(QUESTS, { completed: { ledger: true } }).map((q) => q.id), ["drill"]);
  assert.deepEqual(replayableQuests(QUESTS, {}).map((q) => q.id), []);
});


test("prerequisite guidance names available teachers without spoiling unknown tasks", () => {
  const learner = { id: "later", needs: ["read:L2"], discover: "board" };
  const teachers = [
    { id: "base", title: "基础读码", knowledge: [{ id: "read", depth: "L2" }] },
    { id: "secret", title: "未发现的秘密", discover: "npc:秘密", knowledge: [{ id: "read", depth: "L2" }] },
    { id: "blocked", title: "尚锁住的课", after: ["other"], knowledge: [{ id: "read", depth: "L2" }] },
  ];
  const text = prerequisiteMessage(learner, {}, teachers, { read: "静态读代码（搜索）" });
  assert.ok(text.includes("静态读代码") && text.includes("基础读码"));
  assert.ok(!text.includes("未发现的秘密") && !text.includes("尚锁住的课"));
  assert.equal(prerequisiteMessage({ after: ["base"] }, {}, teachers), "先完成「基础读码」");
  assert.equal(prerequisiteMessage(learner, { knowledge: { read: "L2" } }, teachers), "");
});
