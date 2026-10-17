import { test } from "node:test";
import assert from "node:assert/strict";
import { SKILL_TREE, branchesOfPart, PART } from "../public/game-skills.js";
import { TIERS, SKILL_DRILLS, CASE_OF_SKILL, caseFor, drillsFor, ladderFor, skillMastery, starsFor, recordStars } from "../public/game-drills.js";
import { caseCatalog } from "../lib/cases.mjs";
import { shippedLines, searchCode } from "../public/case-puzzle.js";

const skills = new Map(SKILL_TREE.flatMap((branch) => branch.skills).map((skill) => [skill.id, skill]));

test("every drill hangs on a skill the story teaches", () => {
  for (const [skillId, drills] of Object.entries(SKILL_DRILLS)) {
    const skill = skills.get(skillId);
    assert.ok(skill, `${skillId} is a skill in the tree`);
    assert.ok(skill.from, `${skillId} is taught by a quest step, so its drills can open`);
    assert.ok(CASE_OF_SKILL[skillId], `${skillId} knows which case it drills`);
    assert.equal(drills.length, TIERS.length, `${skillId} has one drill per tier`);
    drills.forEach((drill, index) => {
      assert.equal(drill.tier, index + 1, `${drill.id} sits in tier ${index + 1}`);
      assert.ok(drill.title && drill.why, `${drill.id} says what it is and why it is harder`);
      assert.equal(drill.harder.hints, false, `${drill.id} takes the hints away`);
    });
  }
});

test("a drill's ladder opens one tier at a time", () => {
  const step = (lit, stars) => ladderFor("privacy", { lit, stars });
  assert.deepEqual(step(false, {}).map((d) => d.state), ["closed", "closed", "closed"]);
  assert.deepEqual(step(true, {}).map((d) => d.state), ["open", "locked", "locked"]);
  assert.deepEqual(step(true, { "privacy-1": 1 }).map((d) => d.state), ["cleared", "locked", "locked"]);
  assert.deepEqual(step(true, { "privacy-1": 2 }).map((d) => d.state), ["cleared", "open", "locked"]);
  assert.deepEqual(step(true, { "privacy-1": 2, "privacy-2": 2 }).map((d) => d.state), ["cleared", "cleared", "locked"]);
  assert.deepEqual(step(true, { "privacy-1": 3, "privacy-2": 3 }).map((d) => d.state), ["cleared", "cleared", "open"]);
  assert.match(step(true, {})[1].needs, /2 星/);
});

test("only the best run of a drill counts", () => {
  let stars = {};
  stars = recordStars(stars, "format-1", 2);
  assert.equal(stars["format-1"], 2);
  stars = recordStars(stars, "format-1", 1);
  assert.equal(stars["format-1"], 2, "a worse replay never lowers the record");
  stars = recordStars(stars, "format-1", 3);
  assert.equal(stars["format-1"], 3);
  assert.equal(recordStars(stars, "format-1", 9)["format-1"], 3, "stars are capped at three");
});

test("clean runs earn three stars, slips cost them", () => {
  assert.equal(starsFor({}), 3);
  assert.equal(starsFor({ hintsUsed: 1 }), 2);
  assert.equal(starsFor({ mistakes: 1 }), 2);
  assert.equal(starsFor({ mistakes: 2 }), 1);
});

test("mastery adds up a whole ladder", () => {
  assert.deepEqual(
    (({ cleared, total, stars, max, permed }) => ({ cleared, total, stars, max, permed }))(skillMastery("format", { lit: true, stars: { "format-1": 3, "format-2": 2 } })),
    { cleared: 2, total: 3, stars: 5, max: 9, permed: false },
  );
  assert.equal(skillMastery("format", { lit: true, stars: { "format-1": 3, "format-2": 3, "format-3": 3 } }).permed, true);
  assert.equal(skillMastery("format", { lit: false, stars: { "format-1": 3 } }).cleared, 1, "a finished drill stays counted");
});

test("the decoy words really are absent from the sample code", () => {
  const cases = new Map(caseCatalog().map((entry) => [entry.id, entry]));
  for (const [skillId, drills] of Object.entries(SKILL_DRILLS)) {
    const item = cases.get(caseFor(skillId));
    assert.ok(item, `${skillId} points at a real case`);
    // Three of the six cases are still analysis-only; their drills wait for the room.
    if (!item.game?.lab?.sources) continue;
    const code = shippedLines(item.game.lab.sources);
    for (const decoy of drills[0].harder.decoys || []) {
      assert.equal(searchCode(code, decoy.code).hits.length, 0, `${decoy.code} must not be in ${item.id}`);
    }
  }
});

test("drills are listed in tier order and unknown skills have none", () => {
  assert.deepEqual(drillsFor("privacy").map((d) => d.tier), [1, 2, 3]);
  assert.deepEqual(drillsFor("basics"), []);
  assert.equal(caseFor("basics"), null);
});

test("第一部的树上只有人工智能和序章的安全线", () => {
  const ids = branchesOfPart(PART).map((branch) => branch.id);
  assert.deepEqual(ids, ["security", "ai"]);
  assert.deepEqual(SKILL_TREE.filter((branch) => branch.part && branch.part > 1).map((branch) => branch.id), ["computer", "code", "network"]);
});

test("every drill belongs to a skill the first part actually teaches", () => {
  const partOne = new Set(branchesOfPart(PART).flatMap((branch) => branch.skills.map((skill) => skill.id)));
  for (const skillId of Object.keys(SKILL_DRILLS)) assert.ok(partOne.has(skillId), `${skillId} is in part 1`);
  // The AI line has no drills yet: its chapters are still being made.
  assert.deepEqual(Object.keys(SKILL_DRILLS).filter((id) => SKILL_TREE.find((b) => b.id === "ai").skills.some((s) => s.id === id)), []);
});
