import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// 九区规划（docs/world/town-v2-plan.json）的硬规矩：谁改布局都要过这几条。
const plan = JSON.parse(readFileSync(new URL("../docs/world/town-v2-plan.json", import.meta.url), "utf8"));
const [W, H] = plan.coordinateSystem.world;
const zone = (id) => plan.zones.find((z) => z.id === id);

const segRects = (points, width) => points.slice(1).map(([x2, y2], i) => {
  const [x1, y1] = points[i];
  return [Math.min(x1, x2) - width / 2, Math.min(y1, y2) - width / 2, Math.abs(x2 - x1) + width, Math.abs(y2 - y1) + width];
});
const overlap = (a, b, m = 0) => a[0] - m < b[0] + b[2] && b[0] - m < a[0] + a[2] && a[1] - m < b[1] + b[3] && b[1] - m < a[1] + a[3];
const inside = ([x, y], r) => r[0] <= x && x <= r[0] + r[2] && r[1] <= y && y <= r[1] + r[3];
const fp = (b) => [b.footprint.x, b.footprint.y, b.footprint.w, b.footprint.h];
const circleHits = ([cx, cy, r], rect, m = 0) => {
  const nx = Math.max(rect[0], Math.min(cx, rect[0] + rect[2]));
  const ny = Math.max(rect[1], Math.min(cy, rect[1] + rect[3]));
  return (nx - cx) ** 2 + (ny - cy) ** 2 < (r + m) ** 2;
};

test("town plan: one 3×3 layout, linked the way the grid says, every link a pair of edge-midpoint exits", () => {
  const at = Object.fromEntries(plan.zones.map((z) => [z.grid.join(","), z.id]));
  assert.deepEqual([0, 1, 2].map((y) => [0, 1, 2].map((x) => at[`${x},${y}`])), [
    ["forest", "north", "riverside"],
    ["homes-west", "center", "craft-west"],
    ["homes-east", "south", "craft-east"],
  ]);
  const opposite = { N: "S", S: "N", W: "E", E: "W" };
  for (const [a, b] of plan.links) {
    const za = zone(a), zb = zone(b);
    assert.equal(Math.abs(za.grid[0] - zb.grid[0]) + Math.abs(za.grid[1] - zb.grid[1]), 1, `${a}–${b} are neighbours`);
    const ea = za.exits.find((e) => e.to === b), eb = zb.exits.find((e) => e.to === a);
    assert.ok(ea && eb && opposite[ea.edge] === eb.edge, `${a}–${b} exits face each other`);
    for (const e of [ea, eb]) assert.ok(e.anchor[0] === W / 2 || e.anchor[1] === H / 2, "exits sit on the edge midpoint");
  }
});

test("town plan: zone names say what the place is, not a compass direction that contradicts the map", () => {
  for (const z of plan.zones) assert.doesNotMatch(z.name, /[东西]区|[东西]街/, z.id);
});

test("town plan: roads reach every exit, buildings stay off roads, water and each other, and every door reaches a road", () => {
  for (const z of plan.zones) {
    const roads = z.roads.flatMap((r) => segRects(r.points, r.width));
    const water = (z.water || []).flatMap((w) => segRects(w.points, w.width));
    const walk = (z.landmarks || []).filter((l) => l.walkable);
    for (const e of z.exits) assert.ok(roads.some((r) => inside(e.anchor, r)), `${z.id}: exit ${e.edge} has a road`);
    z.buildings.forEach((b, i) => {
      const f = fp(b);
      assert.ok(f[0] >= 64 && f[1] >= 64 && f[0] + f[2] <= W - 64 && f[1] + f[3] <= H - 64, `${z.id}/${b.id} inside`);
      assert.ok(!roads.some((r) => overlap(f, r, 16)), `${z.id}/${b.id} off the road`);
      assert.ok(!water.some((r) => overlap(f, r, 16)), `${z.id}/${b.id} off the water`);
      z.buildings.forEach((c, j) => j !== i && assert.ok(!overlap(f, fp(c), 48), `${z.id}: ${b.id} and ${c.id} keep apart`));
      for (const l of z.landmarks || []) assert.ok(!(l.circle ? circleHits(l.circle, f, 24) : overlap(f, l.rect, 24)), `${z.id}/${b.id} clear of ${l.id}`);
      const spur = z.paths.find((p) => p.building === b.id);
      const end = spur ? spur.points.at(-1) : [b.door.x, b.door.y];
      if (spur) assert.deepEqual(spur.points[0], [b.door.x, b.door.y], `${z.id}/${b.id}: the path starts at the door`);
      const reach = roads.some((r) => inside(end, r)) || walk.some((l) => (l.circle ? (end[0] - l.circle[0]) ** 2 + (end[1] - l.circle[1]) ** 2 <= l.circle[2] ** 2 : inside(end, l.rect)));
      assert.ok(reach, `${z.id}/${b.id}: the door reaches a road`);
    });
  }
});

test("town plan: reserved lots are each zone's own, clear of roads, paths, buildings and door fronts, and near a road", () => {
  const seen = new Set();
  for (const z of plan.zones) {
    const key = JSON.stringify(z.reservedLots.map((l) => [l.x, l.y]));
    if (z.reservedLots.length) {
      assert.ok(!seen.has(key), `${z.id}: lots are not copied from another zone`);
      seen.add(key);
    }
    const roads = z.roads.flatMap((r) => segRects(r.points, r.width));
    const paths = z.paths.flatMap((p) => segRects(p.points, p.width));
    for (const l of z.reservedLots) {
      const r = [l.x, l.y, l.w, l.h];
      assert.ok(!roads.some((x) => overlap(r, x, 24)) && !paths.some((x) => overlap(r, x, 16)), `${l.id} off roads and paths`);
      assert.ok(!z.buildings.some((b) => overlap(r, fp(b), 48) || overlap(r, [b.door.x - 48, b.door.y - 48, 96, 64], 8)), `${l.id} clear of buildings and doors`);
      const gap = Math.min(...roads.map((x) => Math.max(Math.abs(l.x + l.w / 2 - (x[0] + x[2] / 2)) - (l.w + x[2]) / 2, Math.abs(l.y + l.h / 2 - (x[1] + x[3] / 2)) - (l.h + x[3]) / 2)));
      assert.ok(gap <= 260, `${l.id} is reachable from a road`);
    }
  }
});

test("town plan: the places the prologue needs are on the map, and only the clock tower is a clock", () => {
  assert.ok(zone("north").buildings.some((b) => b.id === "clocktower"));
  assert.ok(zone("north").buildings.some((b) => b.id === "ai-lab" && b.role === "story"), "the AI lab where 小克 comes from");
  assert.ok(zone("center").buildings.some((b) => b.id === "ad-screen"), "the square's screen with the 悄悄统计 ad");
  for (const z of plan.zones) for (const b of z.buildings) if (b.id !== "clocktower") assert.doesNotMatch(b.name, /钟/, `${z.id}/${b.id}`);
});

test("town plan: the only water seam is the fountain's overflow, leaving the square and entering 南岸 at the same x", () => {
  const out = zone("center").water.find((w) => w.exit === "S").points.at(-1);
  const into = zone("south").water[0].points[0];
  assert.equal(out[0], into[0]);
  assert.equal(out[1], H);
  assert.equal(into[1], 0);
  for (const z of plan.zones) {
    for (const w of z.water || []) {
      if (w.outer) continue; // 河堤的小河从地图外边界流进流出，不经过任何相邻区
      for (const [x, y] of [w.points[0], w.points.at(-1)]) {
        const edge = y === 0 ? "N" : y === H ? "S" : x === 0 ? "W" : x === W ? "E" : null;
        if (!edge) continue;
        const neighbour = z.exits.find((e) => e.edge === edge)?.to;
        assert.ok(neighbour && (zone(neighbour).water || []).length, `${z.id}: water leaving ${edge} lands in a neighbour that takes it`);
      }
    }
  }
});
