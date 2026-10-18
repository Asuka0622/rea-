import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PROLOGUE_QUESTS,
  KNOWLEDGE_POINTS,
  questsOfTier,
  knowledgeFromCompletion,
  coverageGaps,
  freshPlayer,
  takeKind,
  onBoard,
} from "../public/prologue-quests.js";
import { CHATTER_NPCS } from "../public/npc-chatter.js";
import { REGIONS } from "../public/game-regions.js";
import { availableQuests, questState } from "../public/quest-board.js";

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const caseFile = (id) => path.join(project, "samples", "cases", id, "workbench-case.json");
const LEVELS = ["L1", "L2", "L3", "L4"];

test("every quest points at a real case file and has a unique id", () => {
  const ids = new Set();
  for (const quest of PROLOGUE_QUESTS) {
    assert.ok(!ids.has(quest.id), `duplicate quest id ${quest.id}`);
    ids.add(quest.id);
    assert.ok(fs.existsSync(caseFile(quest.caseId)), `${quest.id} → samples/cases/${quest.caseId}`);
  }
});

test("quest references hang together: known knowledge ids, valid levels, no dangling prerequisites", () => {
  const ids = new Set(PROLOGUE_QUESTS.map((quest) => quest.id));
  for (const quest of PROLOGUE_QUESTS) {
    for (const id of quest.after) assert.ok(ids.has(id), `${quest.id} waits for unknown ${id}`);
    for (const need of quest.needs) {
      const [id, level = "L1"] = String(need).split(":");
      assert.ok(KNOWLEDGE_POINTS[id], `${quest.id} needs unknown knowledge ${id}`);
      assert.ok(LEVELS.includes(level), `${quest.id} needs a bad level ${level}`);
    }
    for (const entry of quest.knowledge) {
      assert.ok(KNOWLEDGE_POINTS[entry.id], `${quest.id} grants unknown knowledge ${entry.id}`);
      assert.ok(LEVELS.includes(entry.depth), `${quest.id} grants a bad depth ${entry.depth}`);
    }
  }
});

test("the prerequisites form no cycle", () => {
  const byId = new Map(PROLOGUE_QUESTS.map((quest) => [quest.id, quest]));
  const state = new Map();
  const visit = (id, trail = []) => {
    if (state.get(id) === "done") return;
    assert.ok(state.get(id) !== "open", `cycle: ${[...trail, id].join(" → ")}`);
    state.set(id, "open");
    for (const next of byId.get(id)?.after || []) visit(next, [...trail, id]);
    state.set(id, "done");
  };
  for (const quest of PROLOGUE_QUESTS) visit(quest.id);
});

test("a fresh player sees two commissions on the board, and neither is a prerequisite trap", () => {
  const open = availableQuests(PROLOGUE_QUESTS, freshPlayer());
  assert.deepEqual(open.map((item) => item.id).sort(), ["privacy-ledger", "weather-keys"]);
  for (const item of open) assert.ok(item.gain.score > 0, `${item.id} should teach something`);
});

test("quests unlock by finding their source, not by story order", () => {
  const player = { discovered: ["npc:老秦"], completed: {}, knowledge: { "static-read": "L2" } };
  const packed = questState(PROLOGUE_QUESTS.find((q) => q.id === "packed-echo"), player);
  assert.equal(packed.status, "available");

  const noSource = { discovered: [], completed: {}, knowledge: { "static-read": "L3" } };
  assert.equal(questState(PROLOGUE_QUESTS.find((q) => q.id === "packed-echo"), noSource).status, "undiscovered");

  const noKnowledge = { discovered: ["npc:老秦"], completed: {}, knowledge: {} };
  const locked = questState(PROLOGUE_QUESTS.find((q) => q.id === "packed-echo"), noKnowledge);
  assert.equal(locked.status, "locked");
  assert.deepEqual(locked.missing, ["static-read 要到 L2"]);
});

test("every commission can be reached in some order", () => {
  const player = { discovered: PROLOGUE_QUESTS.map((quest) => quest.discover), completed: {}, knowledge: {} };
  let guard = 0;
  while (Object.keys(player.completed).length < PROLOGUE_QUESTS.length && guard < 50) {
    guard += 1;
    const open = availableQuests(PROLOGUE_QUESTS, player);
    assert.ok(open.length > 0, "the board never dead-ends");
    const pick = open[0];
    player.completed[pick.id] = true;
    player.knowledge = { ...player.knowledge, ...knowledgeFromCompletion(PROLOGUE_QUESTS, player.completed) };
  }
  assert.equal(Object.keys(player.completed).length, PROLOGUE_QUESTS.length);
});

test("finishing a quest grants the knowledge it declares", () => {
  const level = knowledgeFromCompletion(PROLOGUE_QUESTS, { "privacy-ledger": true });
  assert.equal(level["data-flow"], "L2");
  assert.equal(level["permission-manifest"], "L1");
  const both = knowledgeFromCompletion(PROLOGUE_QUESTS, { "privacy-ledger": true, "flashlight-apk": true });
  assert.equal(both["permission-manifest"], "L2", "the higher level wins");
});

test("the six core commissions only go as deep as L2; depth lives in side quests", () => {
  const core = questsOfTier("core");
  assert.equal(core.length, 6, "six basic commissions");
  for (const quest of core) {
    assert.equal(quest.tier, "core");
    for (const entry of quest.knowledge) {
      assert.ok(["L1", "L2"].includes(entry.depth), `${quest.id} should not claim ${entry.depth} on a core commission`);
    }
  }
  const side = questsOfTier("side");
  assert.ok(side.length >= 1, "at least one side quest is registered");
  assert.ok(side.every((quest) => quest.tier === "side"));
});

test("the coverage report names the knowledge points that no side quest takes to L3", () => {
  const gaps = coverageGaps();
  assert.ok(Array.isArray(gaps));
  for (const gap of gaps) {
    assert.ok(KNOWLEDGE_POINTS[gap.id]);
    assert.ok(gap.quests.length < 2, `${gap.id} should be a gap`);
  }
  // 现在还没有任何支线把知识点推到 L3，所以整张表都是待补清单。
  assert.equal(gaps.length, Object.keys(KNOWLEDGE_POINTS).length - 2);
  assert.ok(!gaps.some(g=>["hardcoded-secret","permission-manifest"].includes(g.id)));
});

test("not every commission is taken from the board: some are handed over in person, some just happen", () => {
  const board = PROLOGUE_QUESTS.filter(onBoard);
  const talk = PROLOGUE_QUESTS.filter((quest) => takeKind(quest) === "talk");
  const encounter = PROLOGUE_QUESTS.filter((quest) => takeKind(quest) === "encounter");
  // 板子上只留一部分——全在板上接，就没有「镇上撞见一件事」了。
  assert.ok(board.length >= 2, "委托板上总得有几份");
  assert.ok(board.length < PROLOGUE_QUESTS.length, "不能所有委托都从板上接");
  assert.equal(talk.length, 7);
  assert.equal(encounter.length, 1);

  for (const quest of talk) {
    assert.ok(quest.client, `${quest.id} 得说清是谁当面托付`);
    assert.ok(quest.ask?.length, `${quest.id} 得有当面开口的台词`);
    const npc = CHATTER_NPCS.find((one) => one.id === quest.client);
    assert.ok(npc, `${quest.id} 的委托人 ${quest.client} 得真的站在镇上`);
    assert.equal(npc.quest, quest.id, `${npc.id} 得指回这份委托`);
    assert.ok(REGIONS[npc.region], `${npc.id} 站的地方得是真实分区`);
  }
  for (const quest of encounter) {
    assert.ok(REGIONS[quest.at?.region], `${quest.id} 的遭遇地点得是真实分区`);
    assert.ok(quest.encounter?.length >= 2, `${quest.id} 得有「撞上来」的台词`);
  }
});
