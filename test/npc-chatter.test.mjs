import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CHATTER_NPCS,
  NPC_TALKED_KEY,
  npcsInRegion,
  npcById,
  loadTalked,
  saveTalked,
  markTalked,
} from "../public/npc-chatter.js";
import { REGIONS } from "../public/game-regions.js";
import { ACHIEVEMENTS } from "../public/game-achievements.js";

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = String(value);
    },
    data,
  };
}

test("every chatter NPC lives on a real map with a name and something to say", () => {
  const ids = new Set();
  for (const npc of CHATTER_NPCS) {
    assert.ok(!ids.has(npc.id), `duplicate npc ${npc.id}`);
    ids.add(npc.id);
    assert.ok(REGIONS[npc.region], `${npc.id} is on unknown region ${npc.region}`);
    assert.ok(npc.name && npc.look, `${npc.id} needs a name and a stand-in colour`);
    assert.ok(npc.x > 0 && npc.x <= 1440 && npc.y > 0 && npc.y <= 810);
    assert.ok(Array.isArray(npc.first) && npc.first.length, `${npc.id} needs a first line`);
    assert.ok(npc.after, `${npc.id} needs a line for later visits`);
  }
});

test("each region with a chatter NPC can find it back", () => {
  for (const npc of CHATTER_NPCS) assert.ok(npcsInRegion(npc.region).includes(npc));
  assert.equal(npcsInRegion("nowhere").length, 0);
  assert.equal(npcById(CHATTER_NPCS[0].id), CHATTER_NPCS[0]);
  assert.equal(npcById("nobody"), null);
});

test("talking is remembered, and only the first time counts", () => {
  const storage = fakeStorage();
  assert.deepEqual(loadTalked(storage), []);
  const first = markTalked([], "cobbler");
  assert.equal(first.first, true);
  saveTalked(first.talked, storage);
  assert.deepEqual(loadTalked(storage), ["cobbler"]);
  const again = markTalked(loadTalked(storage), "cobbler");
  assert.equal(again.first, false);
  assert.equal(markTalked([], "nobody").first, false, "unknown ids are ignored");
  storage.data[NPC_TALKED_KEY] = "{oops";
  assert.deepEqual(loadTalked(storage), []);
});

test("every chatter NPC has an achievement waiting for the first chat", () => {
  for (const npc of CHATTER_NPCS) {
    const achievement = ACHIEVEMENTS.find((a) => a.when?.talk === npc.id);
    assert.ok(achievement, `${npc.id} should unlock something`);
    assert.ok(achievement.title && achievement.note);
  }
  assert.ok(ACHIEVEMENTS.some((a) => a.when?.talked === 3), "there is a 'talk to a few townsfolk' title");
});
