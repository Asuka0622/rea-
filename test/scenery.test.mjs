import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SCENERY,
  sceneryInRegion,
  sceneryById,
  promptFor,
  sitDown,
  standUp,
} from "../public/scenery.js";
import { REGIONS } from "../public/game-regions.js";
import { ACHIEVEMENTS } from "../public/game-achievements.js";
import { createAchievements } from "../public/game-achievements.js";

test("every piece of scenery sits on a real map with a label and a line", () => {
  const ids = new Set();
  for (const prop of SCENERY) {
    assert.ok(!ids.has(prop.id), `duplicate ${prop.id}`);
    ids.add(prop.id);
    assert.ok(REGIONS[prop.region], `${prop.id} is on unknown region ${prop.region}`);
    assert.ok(prop.label, `${prop.id} needs a label`);
    assert.ok(["sit", "touch"].includes(prop.kind), `${prop.id} has an unknown kind`);
    assert.ok(prop.x > 0 && prop.x <= 1440 && prop.y > 0 && prop.y <= 810);
    assert.ok(Array.isArray(prop.lines) && prop.lines.length, `${prop.id} needs a line`);
  }
});

test("there is somewhere to sit in more than one part of town", () => {
  const sits = SCENERY.filter((prop) => prop.kind === "sit");
  assert.ok(sits.length >= 4);
  const regions = new Set(sits.map((prop) => prop.region));
  assert.ok(regions.size >= 3, "chairs are spread across the map");
  assert.equal(sceneryInRegion("nowhere").length, 0);
  assert.ok(sceneryInRegion("south").length >= 2);
  assert.equal(sceneryById(SCENERY[0].id), SCENERY[0]);
  assert.equal(sceneryById("nope"), null);
});

test("the prompt says what the player is about to do", () => {
  const bench = SCENERY.find((prop) => prop.kind === "sit");
  const touch = SCENERY.find((prop) => prop.kind === "touch");
  assert.match(promptFor(bench), /^坐下 · /);
  assert.match(promptFor(touch), /^看看 · /);
});

test("sitting down and standing up are a small state machine", () => {
  const bench = SCENERY.find((prop) => prop.kind === "sit");
  const down = sitDown(null, bench);
  assert.equal(down.sitting, bench.id);
  assert.equal(down.line, bench.lines[0]);
  const again = sitDown(down.sitting, bench);
  assert.equal(again.sitting, bench.id, "sitting twice keeps you there");
  const up = standUp(again.sitting);
  assert.equal(up.sitting, null);
  assert.equal(up.stoodUp, true);
  assert.equal(standUp(null).stoodUp, false);
});

test("sitting unlocks a title, and three seats are worth another", () => {
  const achievements = createAchievements();
  assert.deepEqual(achievements.note({ type: "sit", id: "bench-plaza" }).map((a) => a.id), ["sit-once"]);
  assert.deepEqual(achievements.note({ type: "sit", id: "bench-plaza" }).map((a) => a.id), [], "the same bench does not count twice");
  assert.deepEqual(achievements.note({ type: "sit", id: "pier" }).map((a) => a.id), []);
  assert.deepEqual(achievements.note({ type: "sit", id: "steps-north" }).map((a) => a.id), ["sit-three"]);
  assert.ok(ACHIEVEMENTS.some((a) => a.when?.scenery === "fountain"));
  assert.deepEqual(achievements.note({ type: "scenery", id: "fountain" }).map((a) => a.id), ["fountain-coin-touch"]);
});
