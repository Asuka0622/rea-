import { test } from "node:test";
import assert from "node:assert/strict";
import { createQuests, QUEST_LINES, ARCHIVE_QUEST, MAIN_QUEST, DIFFICULTIES, FOCUSES, DEMO_QUEST, DEMO_CASES } from "../public/game-quests.js";
import { caseCatalog } from "../lib/cases.mjs";

test("the main line is the prologue (same flow as the preview); the archive side line opens after it", () => {
  const quests = createQuests();
  assert.equal(quests.current().id, "visit-office");
  assert.equal(quests.clockState(), "stopped");
  assert.equal(quests.unlocked(ARCHIVE_QUEST), false, "the archive waits for the prologue");
  assert.deepEqual(MAIN_QUEST.chapters.slice(0, -1).map((c) => c.id), PROLOGUE.chapters.map((c) => c.id));
  const home = ["enter", "home"];
  const [a, b, c, d, e, f] = PROLOGUE_CASES.map((id) => ["solve", id]);
  for (const [kind, id] of [home, a, b, c, home, d, e, home, f, home, ["enter", "clocktower"]]) assert.equal(quests.event(kind, id), true, `${kind} ${id}`);
  assert.equal(quests.clockState(), "stopped", "the tower face stays at 11:58 through the prologue");
  assert.equal(quests.waitingAt(MAIN_QUEST).id, "london-1843", "chapter 1 belongs to the formal version");
  assert.ok(quests.unlocked(ARCHIVE_QUEST));
  assert.equal(quests.event("solve", "real-stories"), true);
  assert.equal(quests.current(), null);
  assert.deepEqual(quests.badges().map((badge) => badge.id), ["rea-detective"]);
  quests.reset();
  assert.equal(quests.current().id, "visit-office");
});

test("the old main line (chapter 1 and Bianjing) is gone from the web build", () => {
  const steps = QUEST_LINES.flatMap((line) => line.chapters.flatMap((chapter) => chapter.steps));
  assert.ok(steps.every((step) => step.type === "enter" || step.type === "solve"), "no mini-game or time-travel steps left");
  for (const id of ["open-door", "to-china", "teahouse-bill", "tower-beat", "meet-smith"]) assert.ok(!steps.some((step) => step.id === id), id);
});

test("every case step points at a real case, and playable chapters have story lines", () => {
  const ids = new Set(caseCatalog().map((c) => c.id));
  for (const line of QUEST_LINES) {
    for (const chapter of line.chapters) {
      if (chapter.ready === false) continue;
      assert.ok(chapter.done?.length, `${line.id}/${chapter.id}`);
      for (const step of chapter.steps) {
        // open-tower 故意不说话：守夜那场戏紧接着就播，先说会抢戏（game-quests.js d-finale）。
        assert.ok(step.goal && (step.say?.length || step.id === "open-tower"), step.id);
        if (step.type === "solve") assert.ok(ids.has(step.case), step.case);
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

test("each skill tree page is a proper tree: unique cells, needs above in the same branch", async () => {
  const { SKILL_TREE } = await import("../public/game-skills.js");
  const ids = new Set();
  for (const branch of SKILL_TREE) {
    const here = new Map(branch.skills.map((skill) => [skill.id, skill]));
    const cells = new Set();
    for (const skill of branch.skills) {
      assert.ok(!ids.has(skill.id), `duplicate id ${skill.id}`);
      ids.add(skill.id);
      const cell = skill.at.join(",");
      assert.ok(!cells.has(cell), `${branch.id}: two skills at ${cell}`);
      cells.add(cell);
      assert.ok(skill.at[0] >= 0 && skill.at[0] < 5, `${skill.id} column`);
      for (const need of skill.needs || []) {
        assert.ok(here.has(need), `${skill.id} needs ${need}, not in ${branch.id}`);
        assert.ok(here.get(need).at[1] < skill.at[1], `${skill.id} needs ${need}, which is not above it`);
      }
    }
  }
});

test("achievements point at real steps, chapters, games and regions", async () => {
  const { ACHIEVEMENTS } = await import("../public/game-achievements.js");
  const { REGIONS } = await import("../public/game-regions.js");
  const steps = new Set(QUEST_LINES.flatMap((line) => line.chapters.flatMap((chapter) => chapter.steps.map((step) => step.id))));
  const chapters = new Set(QUEST_LINES.flatMap((line) => line.chapters.map((chapter) => chapter.id)));
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, ACHIEVEMENTS.length, "ids are unique");
  for (const { id, when } of ACHIEVEMENTS) {
    if (when.step) assert.ok(steps.has(when.step), `${id}: ${when.step}`);
    if (when.chapter) assert.ok(chapters.has(when.chapter), `${id}: ${when.chapter}`);
    if (when.region) assert.ok(REGIONS[when.region], `${id}: ${when.region}`);
    if (when.regions) assert.ok(when.regions <= Object.keys(REGIONS).length, id);
  }
});

test("lines written for a difficulty only use the known levels", () => {
  const levels = new Set(Object.keys(DIFFICULTIES));
  for (const line of QUEST_LINES) {
    for (const chapter of line.chapters) {
      const all = [...(chapter.done || []), ...chapter.steps.flatMap((step) => [...(step.say || []), ...(step.done || [])])];
      for (const said of all) {
        if (typeof said === "string") continue;
        assert.ok(said.text, "every line has a normal text");
        if (said.only) for (const level of said.only.split(" ")) assert.ok(levels.has(level), `only: ${level}`);
        if (said.focus) for (const focus of said.focus.split(" ")) assert.ok(focus in FOCUSES, `focus: ${focus}`);
      }
    }
  }
});

import { DEMO_QUEST as PROLOGUE, DEMO_CASES as PROLOGUE_CASES } from "../public/game-quests.js";

/** The whole prologue in story order: three acts of cases, back to the office between acts, then the tower. */
function playDemo(quests, { until } = {}) {
  const [a, b, c, d, e, f] = PROLOGUE_CASES;
  const events = [["enter", "home"], ["solve", a], ["solve", b], ["solve", c], ["enter", "home"], ["solve", d], ["solve", e], ["enter", "home"], ["solve", f], ["enter", "home"], ["enter", "clocktower"]];
  for (const [kind, id] of events) {
    if (id === until) return;
    assert.equal(quests.event(kind, id), true, `${kind} ${id}`);
  }
}

test("the demo is the whole prologue: six puzzle-room cases in three acts, then the vigil and the tower", () => {
  const catalog = caseCatalog();
  assert.equal(PROLOGUE_CASES.length, 6);
  for (const id of PROLOGUE_CASES) assert.ok(catalog.find((c) => c.id === id)?.game?.puzzle, `${id} is played in its puzzle room (no engine needed there)`);
  const ids = PROLOGUE.chapters.map((c) => c.id);
  for (const id of ["d-interlude", "d-midpoint", "d-vigil", "d-finale"]) assert.ok(ids.includes(id), id);
  assert.ok(ids.indexOf("d-vigil") < ids.indexOf("d-finale"));
  // The finale's goal says nothing: its lines would otherwise play before the vigil scene.
  assert.deepEqual(PROLOGUE.chapters.find((c) => c.id === "d-finale").steps[0].say, []);
  const quests = createQuests([PROLOGUE], { key: "test-demo" });
  playDemo(quests);
  assert.equal(quests.current(), null);
  assert.deepEqual(quests.badges().map((b) => b.id), ["rea-detective"]);
});

test("the demo opens its cases act by act", () => {
  const quests = createQuests([PROLOGUE], { key: "test-demo-acts" });
  const open = () => PROLOGUE_CASES.filter((id) => quests.caseReachable(id));
  assert.deepEqual(open(), PROLOGUE_CASES.slice(0, 3));
  playDemo(quests, { until: PROLOGUE_CASES[3] });
  assert.deepEqual(open(), PROLOGUE_CASES.slice(0, 5));
  assert.equal(quests.current().chapter.id, "d-case-4");
  const later = createQuests([PROLOGUE], { key: "test-demo-acts-3" });
  playDemo(later, { until: PROLOGUE_CASES[5] });
  assert.equal(later.caseReachable(PROLOGUE_CASES[5]), true);
  assert.equal(quests.caseReachable("not-a-demo-case"), true);
});

test("demo clocks stay stopped through the London introduction", () => {
  const quests = createQuests([DEMO_QUEST], { key: "demo-clock-player-qa" });
  assert.equal(quests.clockState(), "stopped");
  playDemo(quests);
  assert.equal(quests.current(), null);
  assert.equal(quests.clockState(), "stopped");
});