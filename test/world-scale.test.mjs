import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VIEW,
  BASE_SPEED,
  SPRINT_MULTIPLIER,
  MIN_INTERACTIVES_PER_VIEW,
  RECOMMENDED_SIZE,
  sprintSpeed,
  crossSeconds,
  interactivesOf,
  densityReport,
  densityAdvice,
} from "../public/world-scale.js";
import { REGIONS, REGION_SIZE } from "../public/game-regions.js";
import { EASTER_EGGS } from "../public/easter-eggs.js";

test("a bigger map is only worth it if sprinting keeps the walk short", () => {
  assert.ok(SPRINT_MULTIPLIER > 1);
  assert.equal(sprintSpeed(), Math.round(BASE_SPEED * SPRINT_MULTIPLIER));
  const now = crossSeconds(REGION_SIZE.w);
  const next = crossSeconds(RECOMMENDED_SIZE.w);
  assert.ok(next.walk > now.walk, "the bigger map takes longer to cross");
  assert.ok(next.sprint <= 15, "sprinting keeps it under a quarter of a minute");
  assert.ok(RECOMMENDED_SIZE.w > REGION_SIZE.w && RECOMMENDED_SIZE.h > REGION_SIZE.h);
});

test("interactives are doors, objects and anything that can be touched", () => {
  const region = {
    spots: {
      home: { x: 10, y: 10, door: { x: 60, y: 90 } },
      closed: { x: 20, y: 20, door: { x: 30, y: 30 }, soon: { place: "x" } },
    },
    objects: [{ id: "rock", x: 700, y: 400 }],
  };
  const points = interactivesOf(region);
  assert.equal(points.length, 3);
  assert.equal(points[0].x, 60, "a door is measured where the player stands, not where the roof is");
  assert.equal(points.find((p) => p.id === "closed").kind, "closed");
  assert.equal(points.find((p) => p.id === "rock").kind, "object");
});

test("density counts things per 640x360 view and flags empty screens", () => {
  const region = {
    spots: { a: { door: { x: 10, y: 10 } }, b: { door: { x: 20, y: 20 } } },
  };
  const report = densityReport(region, { w: 1280, h: 720 });
  assert.equal(report.cells.length, 4, "1280x720 is four views");
  assert.equal(report.points, 2);
  assert.ok(report.empty >= 3, "three of the four views are empty");
  assert.equal(report.meets, false);
  assert.match(densityAdvice(report), /空/);
});

test("two things per view is the bar; meeting it everywhere passes", () => {
  const spots = {};
  let n = 0;
  for (let y = 0; y < 720; y += VIEW.h) {
    for (let x = 0; x < 1280; x += VIEW.w) {
      spots[`s${n++}`] = { door: { x: x + 10, y: y + 10 } };
      spots[`t${n++}`] = { door: { x: x + 30, y: y + 30 } };
    }
  }
  const report = densityReport({ spots }, { w: 1280, h: 720 });
  assert.equal(report.empty, 0);
  assert.equal(report.worst.count, MIN_INTERACTIVES_PER_VIEW);
  assert.equal(report.meets, true);
  assert.match(densityAdvice(report), /密度够了/);
});

test("extras (easter eggs, props) count towards density", () => {
  const region = { spots: {} };
  const extras = [
    { id: "e1", x: 10, y: 10 },
    { id: "e2", x: 20, y: 20 },
  ];
  const report = densityReport(region, { w: 640, h: 360 }, extras);
  assert.equal(report.points, 2);
  assert.equal(report.empty, 0);
  assert.equal(report.meets, true);
});

test("every real town region clears the hard floor now that the eggs fill the empty screens", () => {
  for (const [name, region] of Object.entries(REGIONS)) {
    if (region.era) continue;
    const eggs = EASTER_EGGS.filter((egg) => egg.region === name).map((egg) => ({ id: egg.id, x: egg.x, y: egg.y }));
    const withEggs = densityReport(region, REGION_SIZE, eggs);
    assert.equal(withEggs.empty, 0, `${name} still has an empty screen`);
    assert.equal(withEggs.meetsHard, true, `${name} is below the hard floor`);
  }
  const center = densityReport(REGIONS.center, REGION_SIZE);
  assert.ok(center.points >= 5);
  const south = densityReport(REGIONS.south, REGION_SIZE);
  assert.equal(south.points, 0, "the south bank still has no buildings of its own");
});
