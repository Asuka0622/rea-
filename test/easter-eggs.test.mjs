import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EASTER_EGGS,
  EGG_STORAGE_KEY,
  eggsInRegion,
  eggById,
  loadFound,
  saveFound,
  collect,
  remainingIn,
} from "../public/easter-eggs.js";
import { REGIONS, REGION_SIZE } from "../public/game-regions.js";

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

test("every egg sits on a real map, inside the picture, with a unique id", () => {
  const ids = new Set();
  for (const egg of EASTER_EGGS) {
    assert.ok(!ids.has(egg.id), `duplicate egg ${egg.id}`);
    ids.add(egg.id);
    assert.ok(REGIONS[egg.region], `${egg.id} is on unknown region ${egg.region}`);
    assert.ok(egg.title && egg.text, `${egg.id} needs a title and a line`);
    assert.ok(egg.x > 0 && egg.x <= 1440 && egg.y > 0 && egg.y <= 810, `${egg.id} is inside the biggest allowed map`);
  }
});

test("every region has something to find", () => {
  for (const name of ["center", "homes", "craft", "north", "south"]) {
    assert.ok(eggsInRegion(name).length >= 1, `${name} has no easter egg`);
  }
});

test("found eggs are stored, deduplicated and survive junk", () => {
  const storage = fakeStorage();
  assert.deepEqual(loadFound(storage), []);
  saveFound(["a", "a", "b"], storage);
  assert.deepEqual(loadFound(storage), ["a", "b"]);
  storage.data[EGG_STORAGE_KEY] = "{oops";
  assert.deepEqual(loadFound(storage), []);
});

test("collecting only accepts real eggs and never doubles", () => {
  const first = collect([], "fountain-coin");
  assert.deepEqual(first, ["fountain-coin"]);
  assert.deepEqual(collect(first, "fountain-coin"), ["fountain-coin"]);
  assert.deepEqual(collect(first, "not-an-egg"), ["fountain-coin"], "unknown ids are ignored");
});

test("remaining counts what is still out there", () => {
  const total = eggsInRegion("center").length;
  assert.equal(remainingIn("center", []), total);
  const first = eggsInRegion("center")[0];
  assert.equal(remainingIn("center", [first.id]), total - 1);
  assert.ok(eggById(first.id));
  assert.equal(eggById("nope"), null);
  assert.ok(REGION_SIZE.w > 0);
});
