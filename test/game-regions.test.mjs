import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { REGIONS, REGION_SIZE, regionOf } from "../public/game-regions.js";
import { QUEST_LINES } from "../public/game-quests.js";

const inside = (p) => p.x > 0 && p.x < REGION_SIZE.w && p.y > 0 && p.y < REGION_SIZE.h;
// Same trigger as the game: an exit fires a little inside its zone.
const inExit = (exit, p, pad = 16) => p.x > exit.x - pad && p.x < exit.x + exit.w + pad && p.y > exit.y - pad && p.y < exit.y + exit.h + pad;

test("every region has its picture, and exits lead to real regions without bouncing back", () => {
  for (const [name, region] of Object.entries(REGIONS)) {
    assert.ok(fs.existsSync(new URL(`../public/art/pixel/regions/town-${name}.png`, import.meta.url)), name);
    assert.ok(inside(region.spawn), `${name} spawn`);
    for (const exit of region.exits) {
      const to = REGIONS[exit.to];
      assert.ok(to, `${name} -> ${exit.to}`);
      assert.ok(inside(exit.at), `${name} -> ${exit.to} arrival`);
      assert.ok(!to.exits.some((back) => inExit(back, exit.at)), `${name} -> ${exit.to} arrives inside an exit`);
      assert.ok(to.exits.some((back) => back.to === name), `${exit.to} has no road back to ${name}`);
    }
  }
});

test("buildings sit on their map and every quest place is somewhere in town", () => {
  for (const region of Object.values(REGIONS)) {
    for (const [id, spot] of Object.entries(region.spots)) {
      assert.ok(inside(spot.door), `${id} door`);
      assert.ok(spot.door.y > spot.y, `${id} door is below its building`);
    }
  }
  for (const line of QUEST_LINES) for (const chapter of line.chapters) for (const step of chapter.steps) assert.ok(regionOf(step.spot), `${step.id}: ${step.spot}`);
});
