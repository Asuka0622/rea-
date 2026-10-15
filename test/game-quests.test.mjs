import { test } from "node:test";
import assert from "node:assert/strict";
import { createQuests, QUEST_LINES, REA_QUEST, MAIN_QUEST, DIFFICULTIES } from "../public/game-quests.js";
import { caseCatalog } from "../lib/cases.mjs";
import { MINIGAME_IDS } from "../public/game-minigames.js";

test("the prologue opens the detective line, which ends with a badge", () => {
  const quests = createQuests();
  const finished = [];
  const said = [];
  quests.onChange(({ finishedChapter, story }) => {
    if (finishedChapter) finished.push(finishedChapter.id);
    said.push(...story);
  });
  assert.equal(quests.current().id, "visit-office");
  assert.equal(quests.clockState(), "stopped");
  assert.equal(quests.unlocked(REA_QUEST), false, "the detective line waits for the prologue");
  assert.equal(quests.event("enter", "learn"), false, "the wrong building does not complete the step");
  assert.equal(quests.event("enter", "home"), true);
  quests.event("enter", "learn");
  // A case solved before its line opens still counts later.
  quests.event("solve", "farm-save");
  assert.equal(quests.current().id, "visit-tower");
  quests.event("enter", "clocktower");
  assert.deepEqual(finished, ["prologue"]);
  assert.ok(quests.unlocked(REA_QUEST));
  assert.equal(quests.waitingAt(MAIN_QUEST).id, "ch1", "chapter 1 waits for the first case");
  assert.match(quests.waitReason(MAIN_QUEST.chapters[1]), /委托一/);
  assert.equal(quests.current().id, "solve-privacy", "with the main line waiting, the tracker follows the open side line");
  assert.ok(said.some((line) => line.text.includes("小林")), "the next step's lines are said");
  quests.event("solve", "privacy-ledger");
  assert.equal(quests.current().id, "meet-smith", "the first case brings 铁叔 back: the main story goes first");
  // Chapter 1: meet 铁叔, then three mini-games at the clock tower.
  quests.event("enter", "engines");
  assert.equal(quests.playAt("clocktower").game, "binary");
  for (const game of ["binary", "parts", "drawers"]) assert.equal(quests.event("play", game), true, game);
  assert.equal(quests.clockState(), "drifting", "after chapter 1 the clock runs, but wrong");
  assert.equal(quests.waitingAt(MAIN_QUEST).id, "ch2");
  quests.track("rea");
  for (const id of ["weather-keys", "calculator-eggs"]) quests.event("solve", id);
  assert.equal(quests.current().id, "solve-versions", "farm-save was already done, so case 5 is next");
  quests.event("solve", "notes-versions");
  quests.event("enter", "engines");
  quests.event("solve", "flashlight-apk");
  quests.event("solve", "real-stories");
  quests.event("enter", "home");
  assert.equal(quests.current(), null);
  assert.deepEqual(quests.badges().map((b) => b.id), ["rea-detective"]);
  quests.reset();
  assert.equal(quests.current().id, "visit-office");
});

test("every case step points at a real case, and playable chapters have story lines", () => {
  const ids = new Set(caseCatalog().map((c) => c.id));
  for (const line of QUEST_LINES) {
    for (const chapter of line.chapters) {
      if (chapter.ready === false) continue;
      assert.ok(chapter.done?.length, `${line.id}/${chapter.id}`);
      for (const step of chapter.steps) {
        assert.ok(step.goal && step.say?.length, step.id);
        if (step.type === "solve") assert.ok(ids.has(step.case), step.case);
        if (step.type === "play") assert.ok(MINIGAME_IDS.includes(step.game), step.game);
      }
    }
  }
  assert.deepEqual(Object.keys(DIFFICULTIES), ["easy", "normal", "hard"]);
});

test("every skill is taught by a real quest step", async () => {
  const { SKILL_TREE } = await import("../public/game-skills.js");
  const steps = new Set(QUEST_LINES.flatMap((line) => line.chapters.flatMap((chapter) => chapter.steps.map((step) => step.id))));
  for (const branch of SKILL_TREE) for (const skill of branch.skills) if (skill.from) assert.ok(steps.has(skill.from), `${skill.id}: ${skill.from}`);
});
