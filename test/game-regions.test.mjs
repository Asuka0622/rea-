import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { REGIONS, REGION_SIZE, regionLinks, regionOf, regionSpotAnchor, regionViewportRect } from "../public/game-regions.js";
import { QUEST_LINES } from "../public/game-quests.js";

const inside = (p) => p.x > 0 && p.x < REGION_SIZE.w && p.y > 0 && p.y < REGION_SIZE.h;
// Same trigger as the game: an exit fires a little inside its zone.
const inExit = (exit, p, pad = 16) => p.x > exit.x - pad && p.x < exit.x + exit.w + pad && p.y > exit.y - pad && p.y < exit.y + exit.h + pad;

test("every region has its picture, and exits lead to real regions without bouncing back", () => {
  for (const [name, region] of Object.entries(REGIONS)) {
    assert.ok(fs.existsSync(new URL(`../public/art/pixel/${region.image || `regions/town-${name}`}.png`, import.meta.url)), name);
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
  for (const line of QUEST_LINES) for (const chapter of line.chapters) for (const step of chapter.steps) if (step.spot) assert.ok(regionOf(step.spot), `${step.id}: ${step.spot}`);
});

test("road exits link the five runtime region maps in both directions", () => {
  const labels = { center: "小镇中心", homes: "住宅区", craft: "手艺街", north: "北区", south: "南岸" };
  assert.deepEqual(regionLinks("center", labels).map((link) => link.to).sort(), ["craft", "homes", "north", "south"]);
  for (const id of ["homes", "craft", "north", "south"]) {
    const [link] = regionLinks(id, labels);
    assert.equal(link.to, "center", `${id} should connect to the center`);
    assert.ok(link.x >= 0 && link.x <= 100 && link.y >= 0 && link.y <= 100, `${id} link position`);
  }
});

test("the region renderer shows road exits as navigable map buttons", () => {
  const shell = fs.readFileSync(new URL("../public/game-shell.js", import.meta.url), "utf8");
  assert.match(shell, /regionLinks\(region\.id/);
  assert.match(shell, /game-region-exit/);
  assert.match(shell, /chooseRegion\(exit\.to\)/);
});

test("building pins anchor to canonical door coordinates and map artwork stays aligned when letterboxed", () => {
  assert.deepEqual(regionSpotAnchor("center", "learn"), { x: 220, y: 190 });
  assert.equal(regionSpotAnchor("south", "missing"), null);
  assert.deepEqual(regionViewportRect({ x: 0, y: 0, w: 960, h: 540 }, { w: 1440, h: 900 }), { x: 0, y: 5, w: 100, h: 90 });
  const tower = regionViewportRect({ x: 736, y: 120, w: 80, h: 150 }, { w: 960, h: 540 });
  assert.ok(Math.abs(tower.x - 76.6667) < 0.001 && Math.abs(tower.y - 22.2222) < 0.001);
  assert.ok(Math.abs(tower.w - 8.3333) < 0.001 && Math.abs(tower.h - 27.7778) < 0.001);
});

test("the north map displays the clocktower as a story landmark", () => {
  const shell = fs.readFileSync(new URL("../public/game-shell.js", import.meta.url), "utf8");
  assert.match(shell, /north-clocktower-stopped/);
  assert.match(shell, /spotKey: "clocktower"/);
});
test("clocktower sprites are catalogued at the authored 80x150 size", () => {
  const manifest = JSON.parse(fs.readFileSync(new URL("../public/art/pixel/regions/manifest.json", import.meta.url), "utf8"));
  for (const asset of manifest.storyBuildings) {
    assert.deepEqual(asset.size, [80, 150]);
    assert.ok(fs.existsSync(new URL(`../public/art/pixel/regions/${asset.file}`, import.meta.url)), asset.file);
  }
});