// NPC 的简单动作（网页预告版）。不要求美术画新动画：只用已经交付的精灵表里有的行——
// 走路（walk-down / walk-up / walk-side）、待机、说话、各人自己的小动作（check-phone、check-watch……）。
// 坐长椅也不画「坐下」动画：人走到椅子上，程序把腿藏到椅面后面（外壳给 .seated 样式）。
// 逐帧画走路、坐下老出错（docs/art/review/animations/walk-8f-qa-2026-10-18.md），这一版绕开它；
// 正式版改骨骼动画（docs/roadmap.md）。
//
// 每个 NPC 一台小状态机：站一会儿 →（散步到附近一点 / 做个小动作 / 去长椅坐一会儿）→ 回来接着站。
// 玩家走近就停下，说话时播说话帧。坐标就是地图坐标（和 npc.x / npc.y 同一套）。

const BASE = new Set(["idle", "talk", "walk", "walk-down", "walk-up", "walk-side"]);

/** 各人的习惯：散步半径、能坐的长椅、走路快慢。没写的按默认。 */
export const NPC_HABITS = {
  "pigeon-uncle": { radius: 20, sit: "bench-plaza-3" }, // 老周：去广场南边的长椅上看鸽子
  fisher: { radius: 24 },
  jogger: { radius: 70, speed: 42, pause: [1500, 3500] }, // 跑者：跑得远、停得短
  kid: { radius: 40, speed: 30 },
  musician: { radius: 12 },
  vendor: { radius: 10 }, // 摊主守着摊
  doctor: { radius: 16 },
};
const DEFAULT = { radius: 28, speed: 20, pause: [3500, 8000] };
/** 有委托的人站在自家门口等玩家，只在门口附近挪两步。 */
const QUEST_RADIUS = 8;

export const habitOf = (npc) => ({ ...DEFAULT, ...(npc.quest || npc.take ? { radius: QUEST_RADIUS } : {}), ...(NPC_HABITS[npc.id] || {}) });

/** 精灵表里这个人有的小动作行（除了待机、说话、走路）。 */
export const gesturesOf = (meta) => Object.keys(meta?.animations || {}).filter((name) => !BASE.has(name));
const canWalk = (meta) => Boolean(meta?.animations?.["walk-side"] && meta.animations["walk-down"] && meta.animations["walk-up"]);

/** 两点之间直线能不能走（每 4 像素查一次脚下）。 */
export function clearPath(blocked, a, b) {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 4));
  for (let i = 1; i <= steps; i += 1) if (blocked(a.x + ((b.x - a.x) * i) / steps, a.y + ((b.y - a.y) * i) / steps)) return false;
  return true;
}

/** 一段动画放完要多久（毫秒）。 */
const clipMs = (anim, loops = 1) => {
  const list = Array.isArray(anim.ms) ? anim.ms : [anim.ms ?? 200];
  let total = 0;
  for (let i = 0; i < anim.frames; i += 1) total += list[i] ?? list[list.length - 1] ?? 200;
  return total * loops;
};

/**
 * npcs: 这一区的 NPC（会直接更新它们的 x / y，好让交谈距离、走过去都跟着人走）。
 * blocked(x, y): 地图上这点能不能站。benches: { id: { x, y } }。rng: 随机数（测试里换成固定的）。
 */
export function createNpcMotion({ blocked = () => false, benches = {}, rng = Math.random } = {}) {
  const states = new Map();
  const between = ([lo, hi]) => lo + rng() * (hi - lo);

  function stateOf(npc) {
    if (!states.has(npc.id)) states.set(npc.id, { home: { x: npc.x, y: npc.y }, mode: "idle", until: 0, anim: "idle", flip: false, seated: false, gestureAt: 0 });
    return states.get(npc.id);
  }

  function walkTo(npc, s, to, then, now) {
    if (!clearPath(blocked, npc, to)) return false;
    Object.assign(s, { mode: "walk", to, then, seated: false, until: now + 60000 });
    return true;
  }

  /** 站够了，挑下一件事。 */
  function next(npc, s, meta, now, habit) {
    const roll = rng();
    const gestures = gesturesOf(meta);
    const bench = habit.sit && benches[habit.sit];
    if (bench && canWalk(meta) && roll < 0.25 && walkTo(npc, s, { x: bench.x, y: bench.y + 4 }, "sit", now)) return;
    if (gestures.length && roll < 0.55) {
      const name = gestures[Math.floor(rng() * gestures.length)];
      Object.assign(s, { mode: "gesture", anim: name, gestureAt: now, until: now + clipMs(meta.animations[name], 2) });
      return;
    }
    if (canWalk(meta) && habit.radius > 0 && roll < 0.85) {
      const angle = rng() * Math.PI * 2;
      const r = habit.radius * (0.4 + 0.6 * rng());
      const to = { x: s.home.x + Math.cos(angle) * r, y: s.home.y + Math.sin(angle) * r * 0.6 };
      if (walkTo(npc, s, to, "idle", now)) return;
    }
    Object.assign(s, { mode: "idle", anim: "idle", until: now + between(habit.pause) });
  }

  /**
   * 推进一帧。ctx: { now, dt（毫秒）, meta（这个人的精灵表信息）, talking, playerNear }。
   * 返回这一帧的样子：{ x, y, anim, flip, seated, gestureAt }（anim 一定是精灵表里有的行）。
   */
  function update(npc, { now, dt = 16, meta, talking = false, playerNear = false }) {
    const s = stateOf(npc);
    const habit = habitOf(npc);
    const has = (name) => Boolean(meta?.animations?.[name]);
    if (talking || playerNear) {
      // 玩家走近就停下；说话时播说话帧。坐着的人坐着说。
      if (s.mode === "walk") Object.assign(s, { mode: "idle", until: now + between(habit.pause) });
      s.anim = talking && has("talk") ? "talk" : "idle";
      s.flip = false;
      return pose(npc, s, has);
    }
    if (s.mode === "walk") {
      const dx = s.to.x - npc.x;
      const dy = s.to.y - npc.y;
      const dist = Math.hypot(dx, dy);
      const step = (habit.speed * dt) / 1000;
      if (dist <= step || now > s.until) {
        npc.x = s.to.x;
        npc.y = s.to.y;
        if (s.then === "sit") Object.assign(s, { mode: "sit", seated: true, anim: "idle", flip: false, until: now + between([9000, 18000]) });
        else Object.assign(s, { mode: "idle", anim: "idle", until: now + between(habit.pause) });
      } else {
        npc.x += (dx / dist) * step;
        npc.y += (dy / dist) * step;
        const side = Math.abs(dx) > Math.abs(dy);
        s.anim = side ? "walk-side" : dy < 0 ? "walk-up" : "walk-down";
        // 侧面行画的是朝右（或 meta.side 写的方向），往另一边走就翻过来。
        s.flip = side && (dx < 0) !== (meta?.side === "left");
      }
      return pose(npc, s, has);
    }
    if (now >= s.until) {
      if (s.mode === "sit") {
        // 坐够了：站起来走回原处。
        s.seated = false;
        if (!walkTo(npc, s, s.home, "idle", now)) Object.assign(s, { mode: "idle", until: now + between(habit.pause) });
      } else if (s.mode === "gesture") Object.assign(s, { mode: "idle", anim: "idle", until: now + between(habit.pause) });
      else next(npc, s, meta, now, habit);
    }
    if (s.mode === "idle" || s.mode === "sit") s.anim = "idle";
    return pose(npc, s, has);
  }

  const pose = (npc, s, has) => ({ x: npc.x, y: npc.y, anim: has(s.anim) ? s.anim : "idle", flip: s.flip && s.anim === "walk-side", seated: s.seated, gestureAt: s.gestureAt });

  /** 人离开这一区再回来：回到原位，从头开始（不在别处坐着）。 */
  function reset(npc) {
    const s = states.get(npc.id);
    if (!s) return;
    npc.x = s.home.x;
    npc.y = s.home.y;
    states.delete(npc.id);
  }

  return { update, reset, stateOf };
}
