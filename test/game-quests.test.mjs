import { test } from "node:test";
import assert from "node:assert/strict";
import { createQuests, REA_QUEST, DIFFICULTIES } from "../public/game-quests.js";
import { caseCatalog } from "../lib/cases.mjs";

test("the REA side quest follows its chapters in order and ends with a badge", () => {
  const quests = createQuests();
  const said = [];
  quests.onChange(({ finishedChapter }) => finishedChapter && said.push(finishedChapter.id));
  assert.equal(quests.current().id, "visit-office");
  assert.equal(quests.event("enter", "learn"), false, "the wrong building does not complete the step");
  assert.equal(quests.event("enter", "home"), true);
  assert.equal(quests.current().id, "visit-library");
  quests.event("enter", "learn");
  // Solving a later case first still counts when its chapter comes up.
  quests.event("solve", "farm-save");
  for (const id of ["privacy-ledger", "weather-keys", "calculator-eggs"]) quests.event("solve", id);
  assert.equal(quests.current().id, "solve-versions", "farm-save was already done, so case 5 is next");
  quests.event("solve", "notes-versions");
  quests.event("enter", "engines");
  quests.event("solve", "flashlight-apk");
  quests.event("solve", "real-stories");
  quests.event("enter", "home");
  assert.equal(quests.current(), null);
  assert.deepEqual(quests.badges(), ["rea-detective"]);
  assert.ok(said.includes("prologue") && said.includes("finale"));
});

test("every case step points at a real case, and every chapter has story lines", () => {
  const ids = new Set(caseCatalog().map((c) => c.id));
  for (const chapter of REA_QUEST.chapters) {
    assert.ok(chapter.done?.length, chapter.id);
    for (const step of chapter.steps) {
      assert.ok(step.goal && step.say?.length, step.id);
      if (step.type === "solve") assert.ok(ids.has(step.case), step.case);
    }
  }
  assert.deepEqual(Object.keys(DIFFICULTIES), ["easy", "normal", "hard"]);
});
