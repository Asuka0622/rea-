import { test } from "node:test";
import assert from "node:assert/strict";
import { createNpcMotion, clearPath, gesturesOf, habitOf } from "../public/npc-motion.js";

const sheet = {
  side: "right",
  animations: {
    idle: { row: 0, frames: 2, ms: [1800, 160] },
    "walk-down": { row: 1, frames: 6, ms: 100 },
    "walk-up": { row: 2, frames: 6, ms: 100 },
    "walk-side": { row: 3, frames: 6, ms: 100 },
    talk: { row: 4, frames: 2, ms: 250 },
  },
};
const withPhone = { ...sheet, animations: { ...sheet.animations, "check-phone": { row: 5, frames: 4, ms: 200 } } };
const seq = (...values) => { let i = 0; return () => values[i++ % values.length]; };

/** 跑 ms 毫秒，每帧 50 ms，返回最后的样子和途中出现过的动画。 */
function run(motion, npc, ms, ctx = {}) {
  const seen = new Set();
  let pose;
  for (let now = 0; now <= ms; now += 50) {
    pose = motion.update(npc, { now, dt: 50, meta: sheet, ...ctx });
    seen.add(pose.anim + (pose.flip ? ":flip" : ""));
  }
  return { pose, seen };
}

test("NPC 只用精灵表里有的行：有走路行的会散步，往左走时侧面翻过来", () => {
  const npc = { id: "paperboy", x: 100, y: 100 };
  // 先站着（第一个随机数决定散步），再朝左边走（角度 π）
  const motion = createNpcMotion({ rng: seq(0.6, 0.5, 1, 0.5) });
  const { seen } = run(motion, npc, 12000);
  assert.ok(seen.has("walk-side:flip"), [...seen].join(","));
  for (const name of seen) assert.ok(["idle", "walk-side", "walk-up", "walk-down"].includes(name.replace(":flip", "")), name);
  assert.ok(Math.hypot(npc.x - 100, npc.y - 100) <= habitOf(npc).radius + 0.5, "不会走出散步半径");
});

test("没有走路行的人不会滑着走，只做自己的小动作或站着", () => {
  const npc = { id: "wang-nainai", quest: "x", x: 50, y: 50 };
  const motion = createNpcMotion({ rng: seq(0.3) });
  const seen = new Set();
  const still = { animations: { idle: withPhone.animations.idle, "check-phone": withPhone.animations["check-phone"] } };
  for (let now = 0; now <= 30000; now += 50) seen.add(motion.update(npc, { now, dt: 50, meta: still }).anim);
  assert.deepEqual([...seen].sort(), ["check-phone", "idle"]);
  assert.deepEqual({ x: npc.x, y: npc.y }, { x: 50, y: 50 });
  assert.deepEqual(gesturesOf(withPhone), ["check-phone"]);
});

test("路线上有障碍就不走过去", () => {
  const wall = (x) => x > 110;
  assert.equal(clearPath((x) => wall(x), { x: 100, y: 0 }, { x: 120, y: 0 }), false);
  const npc = { id: "paperboy", x: 100, y: 100 };
  const motion = createNpcMotion({ blocked: (x) => x > 101 || x < 99, rng: seq(0.6, 0.5, 0, 0.5) });
  run(motion, npc, 12000);
  assert.ok(Math.abs(npc.x - 100) <= 1.01, `x=${npc.x}`);
});

test("玩家走近就停下，说话时播说话帧", () => {
  const npc = { id: "paperboy", x: 100, y: 100 };
  const motion = createNpcMotion({ rng: seq(0.6, 0.5, 1, 0.5) });
  run(motion, npc, 6000);
  const at = { x: npc.x, y: npc.y };
  const { pose, seen } = run(motion, npc, 3000, { playerNear: true });
  assert.deepEqual([...seen], ["idle"]);
  assert.deepEqual({ x: npc.x, y: npc.y }, at);
  assert.equal(motion.update(npc, { now: 99999, meta: sheet, talking: true }).anim, "talk");
  assert.equal(pose.flip, false);
});

test("老周会走到长椅上坐下（腿交给样式藏），坐够了走回原处", () => {
  const npc = { id: "pigeon-uncle", x: 452, y: 300 };
  const motion = createNpcMotion({ benches: { "bench-plaza-3": { x: 420, y: 339 } }, rng: seq(0.1, 0.5) });
  let sat = false;
  for (let now = 0; now <= 120000; now += 50) {
    const pose = motion.update(npc, { now, dt: 50, meta: sheet });
    if (pose.seated) {
      sat = true;
      assert.deepEqual({ x: pose.x, y: pose.y }, { x: 420, y: 343 });
      assert.equal(pose.anim, "idle");
    }
  }
  assert.ok(sat);
  motion.reset(npc);
  assert.deepEqual({ x: npc.x, y: npc.y }, { x: 452, y: 300 });
});
