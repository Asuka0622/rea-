import test from "node:test";
import assert from "node:assert/strict";
import { AUTHORITY_ITEMS, AUTHORITY_ROUNDS, simulateWeek, serverSlots } from "../public/authority-engine.js";

const right = (ids) => Object.fromEntries(ids.map((id) => [id, AUTHORITY_ITEMS[id].affects ? "server" : "local"]));
const all = AUTHORITY_ROUNDS.flatMap((r) => r.items);

test("authority: what affects other players goes to the server, the rest stays local, and that passes both weeks", () => {
  assert.equal(simulateWeek(0, right(AUTHORITY_ROUNDS[0].items), "hard").passed, true);
  assert.equal(simulateWeek(1, right(all), "hard").passed, true);
});

test("authority: leaving an item that affects others on the player's machine gets it exploited", () => {
  const placement = { ...right(all), price: "local" };
  const res = simulateWeek(1, placement);
  assert.equal(res.passed, false);
  assert.deepEqual(res.report.filter((r) => r.result === "exploited").map((r) => r.id), ["price"]);
});

test("authority: putting everything on the server is not the answer either", () => {
  const everything = Object.fromEntries(all.map((id) => [id, "server"]));
  const res = simulateWeek(1, everything);
  assert.equal(res.exploited, 0);
  assert.ok(res.wasted >= 4);
  assert.equal(res.passed, false);
  const oneWaste = { ...right(all), volume: "server" };
  assert.equal(simulateWeek(1, oneWaste, "normal").passed, true, "normal forgives one wasted item");
  assert.equal(simulateWeek(1, oneWaste, "hard").passed, false, "hard does not");
});

test("authority: every round mixes both kinds, an unplaced item blocks the week, and hard gives exactly enough server slots", () => {
  for (const round of AUTHORITY_ROUNDS) {
    assert.ok(round.items.some((id) => AUTHORITY_ITEMS[id].affects));
    assert.ok(round.items.some((id) => !AUTHORITY_ITEMS[id].affects));
  }
  const missing = right(AUTHORITY_ROUNDS[0].items);
  delete missing.gold;
  assert.equal(simulateWeek(0, missing).unset, 1);
  assert.equal(serverSlots(0), 4);
  assert.equal(serverSlots(1), 6);
  for (const item of Object.values(AUTHORITY_ITEMS)) assert.ok(item.affects ? item.exploit && item.server : item.local && item.wasted, item.label);
});
