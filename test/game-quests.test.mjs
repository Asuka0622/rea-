import { test } from "node:test";
import assert from "node:assert/strict";
import { createQuests, QUEST_LINES, REA_QUEST, MAIN_QUEST, DIFFICULTIES } from "../public/game-quests.js";
import { caseCatalog } from "../lib/cases.mjs";

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
  assert.equal(quests.waitingAt(MAIN_QUEST).id, "ch1", "the main line waits at chapter 1, still being made");
  assert.equal(quests.current().id, "solve-privacy", "with the main line waiting, the tracker follows the open side line");
  assert.ok(said.some((line) => line.text.includes("小林")), "the next step's lines are said");
  for (const id of ["privacy-ledger", "weather-keys", "calculator-eggs"]) quests.event("solve", id);
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
      }
    }
  }
  assert.deepEqual(Object.keys(DIFFICULTIES), ["easy", "normal", "hard"]);
});
