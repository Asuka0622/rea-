import { test } from "node:test";
import assert from "node:assert/strict";
import { ACHIEVEMENTS, createAchievements } from "../public/game-achievements.js";

const ids = (fresh) => fresh.map((a) => a.id);
const byId = (id) => ACHIEVEMENTS.find((a) => a.id === id);

test("every achievement has a unique id, a fun title and a note", () => {
  const seen = new Set();
  for (const achievement of ACHIEVEMENTS) {
    assert.ok(!seen.has(achievement.id), `duplicate ${achievement.id}`);
    seen.add(achievement.id);
    assert.ok(achievement.title && achievement.note, achievement.id);
    assert.ok(achievement.when && Object.keys(achievement.when).length, `${achievement.id} needs a trigger`);
  }
  assert.ok(ACHIEVEMENTS.length >= 40, "the list grew");
});

test("easter eggs unlock as they pile up", () => {
  const achievements = createAchievements();
  assert.deepEqual(ids(achievements.note({ type: "eggs", count: 1 })), ["egg-first"]);
  assert.deepEqual(ids(achievements.note({ type: "eggs", count: 3 })), [], "three is not a milestone");
  assert.deepEqual(ids(achievements.note({ type: "eggs", count: 5 })), ["egg-five"]);
  assert.deepEqual(ids(achievements.note({ type: "eggs", count: 12 })), ["egg-half"]);
  assert.deepEqual(ids(achievements.note({ type: "eggs", count: 23 })), ["egg-all"]);
  assert.equal(achievements.got("egg-all") !== null, true);
});

test("closing a case well, or honestly, is its own achievement", () => {
  const achievements = createAchievements();
  assert.deepEqual(ids(achievements.note({ type: "case", stars: 2 })), []);
  assert.deepEqual(ids(achievements.note({ type: "case", stars: 3 })), ["case-three-stars"]);
  assert.deepEqual(ids(achievements.note({ type: "claim", kind: "insufficient" })), ["claim-insufficient"]);
});

test("the board and the side quests count separately", () => {
  const achievements = createAchievements();
  assert.deepEqual(ids(achievements.note({ type: "board", done: 3 })), []);
  assert.deepEqual(ids(achievements.note({ type: "board", done: 6 })), ["board-clear"]);
  assert.deepEqual(ids(achievements.note({ type: "side", done: 1 })), ["side-first"]);
  assert.deepEqual(ids(achievements.note({ type: "side", done: 3 })), ["side-three"]);
});

test("sprinting adds up before it unlocks", () => {
  const achievements = createAchievements();
  assert.deepEqual(ids(achievements.note({ type: "sprint", by: 600 })), []);
  assert.deepEqual(ids(achievements.note({ type: "sprint", by: 600 })), ["sprint-1k"]);
  assert.deepEqual(ids(achievements.note({ type: "sprint", by: 4000 })), ["sprint-5k"]);
});

test("visiting the craft street is worth a title", () => {
  const achievements = createAchievements();
  assert.deepEqual(ids(achievements.note({ type: "region", id: "craft" })), ["craft-regular"]);
});

test("secret achievements stay secret until they pop", () => {
  for (const id of ["egg-all", "sprint-5k"]) assert.equal(byId(id).secret, true, id);
  assert.ok(ACHIEVEMENTS.filter((a) => a.secret).length >= 2);
});

test("count reports how many are unlocked", () => {
  const achievements = createAchievements();
  achievements.note({ type: "eggs", count: 1 });
  achievements.note({ type: "case", stars: 3 });
  assert.equal(achievements.count(), 2);
});
