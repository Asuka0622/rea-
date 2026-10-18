// 权限塔防的规则（没有画面，Node 里也能跑，用来配平关卡）。tower-game.js 负责把它画出来。
//
// 数据在机房里分两路走：进门一条主干，到分线器分成上下两路，出门前并回一条。每个位置守路上的
// 一段；每种措施只克它真能管住的那类收集者（最小权限管「读」，沙盒管「发」），克错只打 weak 折；
// 限速谁也杀不掉，只让收集者在别人的射程里多待一会儿——「加急上传」跑得太快，不先拖住，沙盒来不及关。
//
// 另外三种措施不直接打人：出站防火墙每隔几秒把一个想往外发的「拦死」（不看血量）；数据脱敏把扫过的
// 收集者手里的数据变成没用的，就算它溜出去也不扣隐私；权限审计给扫过的收集者做标记——别的措施打它更狠，
// 打扮成正常请求的「伪装 SDK」也只有被审计扫到才看得见、打得着。
//
// 预算的规矩：只有收集者在路上时才回预算，拦下一个有赏金，清完一波有奖励；波与波之间不回预算，
// 所以「站着等攒满」行不通，钱要花在刀刃上。措施可以升级，也可以拆掉退一半钱——每波走的路不一样，
// 布防得跟着改。

export const TD_LANES = {
  up: [[95, 50], [72, 50], [62, 28], [38, 28], [28, 50], [10, 50]],
  down: [[95, 50], [72, 50], [62, 72], [38, 72], [28, 50], [10, 50]],
};
// y 是舞台高度的百分比，按舞台长宽比折算成和 x 同样的单位，弧长才是真实的走路时间。
const TD_YSCALE = 0.25;
export const TD_TRACK = Object.fromEntries(Object.entries(TD_LANES).map(([lane, pts]) => {
  const segs = [];
  let total = 0;
  for (let i = 1; i < pts.length; i += 1) {
    const dx = pts[i][0] - pts[i - 1][0];
    const dy = (pts[i][1] - pts[i - 1][1]) * TD_YSCALE;
    const len = Math.hypot(dx, dy);
    segs.push({ from: pts[i - 1], to: pts[i], len, at: total });
    total += len;
  }
  return [lane, { segs, total, pts }];
}));

/** 走完全程的 t（0 刚进大门，1 摸到保险柜）时，它在舞台的哪个位置（百分比）。 */
export function tdPosAt(lane, t) {
  const track = TD_TRACK[lane] || TD_TRACK.up;
  const d = Math.max(0, Math.min(1, t)) * track.total;
  for (const seg of track.segs) {
    if (d <= seg.at + seg.len) {
      const k = seg.len ? (d - seg.at) / seg.len : 0;
      return { x: seg.from[0] + (seg.to[0] - seg.from[0]) * k, y: seg.from[1] + (seg.to[1] - seg.from[1]) * k };
    }
  }
  const tail = track.segs[track.segs.length - 1];
  return { x: tail.to[0], y: tail.to[1] };
}

/** 这一段路归不归这个位置管。射程按路算，不按直线距离——上下两条路离得太近了。 */
export const tdInRange = (slot, enemy) =>
  (slot.guards || []).some((g) => g.lanes.includes(enemy.lane) && enemy.t >= g.t0 && enemy.t <= g.t1);

/** 取路上 [t0,t1] 之间的 13 个点，画守卫灯带用。 */
export function tdGuardPoints(lane, t0, t1) {
  const out = [];
  for (let i = 0; i <= 12; i += 1) {
    const p = tdPosAt(lane, t0 + (t1 - t0) * (i / 12));
    out.push(`${p.x},${p.y}`);
  }
  return out.join(" ");
}

const waveKinds = (w) => (w.kind ? [w.kind] : w.kinds || []);

/** 一波的阵容：每个收集者是什么、走哪条路、是不是厚皮。预告和出兵用同一份，说的就是来的。 */
export function waveRoster(spec, w) {
  const list = waveKinds(w);
  const lanes = w.lanes || ["up", "down"];
  const out = [];
  for (let i = 0; i < (w.count || 0); i += 1) {
    const kind = list[i % list.length];
    out.push({ kind, lane: lanes[i % lanes.length], elite: i < (w.elite || 0) });
  }
  return out;
}

/** 预告：按路说清楚谁走哪边——「上路 通讯录×2 · 下路 后台上传×2，1 个厚皮」。 */
export function waveText(spec, w) {
  const roster = waveRoster(spec, w);
  const label = (k) => spec.kinds?.[k]?.label || k;
  const lanes = [];
  for (const [lane, name] of [["up", "上路"], ["down", "下路"]]) {
    const tally = new Map();
    for (const r of roster) if (r.lane === lane) tally.set(r.kind, (tally.get(r.kind) || 0) + 1);
    if (tally.size) lanes.push(`${name} ${[...tally].map(([k, n]) => `${label(k)}×${n}`).join("、")}`);
  }
  return lanes.join(" · ") + (w.elite ? `，${w.elite} 个厚皮` : "");
}

/** 一个措施打这一类收集者的伤害（每秒）。 */
export function dpsOn(spec, unit, kind) {
  if (!unit.strong) return unit.dps;
  return unit.strong.includes(kind) ? unit.dps : unit.dps * (spec.weak ?? 0.2);
}

/** 升到下一级要花多少：越往上越贵。 */
export const upgradeCost = (unit) => Math.round(unit.cost * (0.8 + 0.4 * unit.level));
/** 拆掉退多少：花在它身上的一半。 */
export const refundOf = (unit) => Math.floor(unit.spent / 2);

/**
 * 一局塔防。step(dt) 推进时间，返回这一下发生的事：
 *   { type: "fire", slot, enemy } · { type: "kill", slot, enemy, exact } · { type: "leak", enemy } ·
 *   { type: "clear", wave, bonus } · { type: "won" } · { type: "lost" }
 */
export function createTowerRun(spec) {
  const units = spec.units || [];
  const waves = spec.waves || [];
  const maxBudget = spec.maxBudget ?? 60;
  const state = {
    budget: spec.budget ?? 20,
    hp: spec.hp ?? 3,
    maxHp: spec.hp ?? 3,
    wave: -1,
    enemies: [],
    slots: (spec.slots || []).map((slot) => ({ ...slot, unit: null })),
    status: "ready", // ready（等玩家放下一波）· running · won · lost
    leaked: [],
    killed: 0,
    spent: 0,
  };
  const unitOf = (id) => units.find((u) => u.id === id);
  const slotOf = (id) => state.slots.find((s) => s.id === id);
  const counterOf = (kind) => units.find((u) => u.strong?.includes(kind));

  const place = (slotId, unitId) => {
    const slot = slotOf(slotId);
    const unit = unitOf(unitId);
    if (!slot || !unit || slot.unit) return { ok: false, why: "这里已经有措施了" };
    if (state.status === "won" || state.status === "lost") return { ok: false, why: "这一局已经结束了" };
    if (state.budget < unit.cost) return { ok: false, why: `预算不够（还差 ${Math.ceil(unit.cost - state.budget)}）` };
    state.budget -= unit.cost;
    state.spent += unit.cost;
    slot.unit = { ...unit, level: 1, spent: unit.cost };
    return { ok: true };
  };
  const upgrade = (slotId) => {
    const slot = slotOf(slotId);
    const unit = slot?.unit;
    if (!unit) return { ok: false, why: "这里还没有措施" };
    if (unit.level >= (spec.maxLevel ?? 3)) return { ok: false, why: "已经是最高级了" };
    const cost = upgradeCost(unit);
    if (state.budget < cost) return { ok: false, why: `升级要 ${cost}，预算不够` };
    state.budget -= cost;
    state.spent += cost;
    unit.spent += cost;
    unit.level += 1;
    unit.dps = Math.round(unit.dps * (spec.upgradeMul ?? 1.5) * 10) / 10;
    if (unit.slow) unit.slowFactor = Math.max(0.2, (unit.slowFactor ?? spec.slowFactor ?? 0.45) - 0.08);
    if (unit.block) unit.cooldown = Math.max(1.5, (unit.cooldown ?? 4) * 0.75);
    if (unit.mark) unit.mark = Math.round((unit.mark + 0.25) * 100) / 100;
    if (unit.mask) unit.maskRate = (unit.maskRate ?? 1) * 1.5;
    return { ok: true, cost };
  };
  const sell = (slotId) => {
    const slot = slotOf(slotId);
    if (!slot?.unit) return { ok: false, why: "这里没有措施" };
    const back = refundOf(slot.unit);
    state.budget = Math.min(maxBudget, state.budget + back);
    slot.unit = null;
    return { ok: true, back };
  };

  const startWave = () => {
    if (state.status !== "ready") return false;
    if (state.wave >= waves.length - 1) return false;
    state.wave += 1;
    const w = waves[state.wave];
    const gap = w.gap ?? 14;
    waveRoster(spec, w).forEach((r, i) => {
      const elite = r.elite;
      const k = spec.kinds?.[r.kind] || {};
      state.enemies.push({
        id: `${state.wave}-${i}`,
        kind: r.kind,
        lane: r.lane,
        elite,
        // 一个接一个排着进门：间隔按路长折算成 t。
        t: -i * (gap / TD_TRACK[r.lane].total),
        hp: (w.hp ?? k.hp ?? 3) * (elite ? (spec.eliteHp ?? 2.2) : 1),
        speed: (w.speed ?? k.speed ?? 6) * (elite ? (spec.eliteSpeed ?? 0.8) : 1),
        slowed: 0,
        hidden: Boolean(k.hidden),
        revealed: 0,
        masked: false,
      });
    });
    for (const e of state.enemies) e.maxHp = e.hp;
    state.status = "running";
    return true;
  };

  const step = (dt) => {
    const events = [];
    // 浏览器给的第一帧时间戳可能比按下按钮的时刻还早，dt 会是负的：不前进，也不让「拖慢」倒着算。
    if (state.status !== "running" || !(dt > 0)) return events;
    // 只有收集者在路上时才回预算。
    state.budget = Math.min(maxBudget, state.budget + (spec.regen ?? 1) * dt);
    for (const e of state.enemies) {
      const factor = e.slowed > 0 ? e.slowFactor ?? spec.slowFactor ?? 0.45 : 1;
      e.t += (e.speed * factor * dt) / TD_TRACK[e.lane].total;
      e.slowed = Math.max(0, e.slowed - dt);
      e.revealed = Math.max(0, e.revealed - dt);
      if (e.t >= 1 && !e.dead) {
        e.dead = true;
        // 脱敏过的：溜出去了，可拿走的数据没用，不扣隐私。
        if (e.masked) {
          state.maskedOut = (state.maskedOut || 0) + 1;
          events.push({ type: "leak", enemy: e, masked: true });
        } else {
          state.hp -= 1;
          state.leaked.push(e.kind);
          events.push({ type: "leak", enemy: e, fix: counterOf(e.kind) });
        }
      }
    }
    const visible = (e) => !e.hidden || e.revealed > 0;
    // 先结算范围型的措施（审计、脱敏）：射程里所有看得见的都算，审计还能把伪装的照出来。
    for (const slot of state.slots) {
      const unit = slot.unit;
      if (!unit || !(unit.reveal || unit.mask)) continue;
      const inside = state.enemies.filter((e) => !e.dead && e.t >= 0 && tdInRange(slot, e));
      for (const e of inside) {
        if (unit.reveal) {
          if (e.hidden && e.revealed <= 0) events.push({ type: "reveal", slot, enemy: e });
          e.revealed = spec.revealTime ?? 3;
          e.marked = unit.mark ?? 1.5;
        }
        if (unit.mask && visible(e) && !e.masked) {
          e.maskProgress = (e.maskProgress || 0) + dt * (unit.maskRate ?? 1);
          if (e.maskProgress >= (spec.maskTime ?? 1)) {
            e.masked = true;
            events.push({ type: "mask", slot, enemy: e });
          }
        }
      }
      if (inside.length) events.push({ type: "fire", slot, enemy: inside[0], area: true });
    }
    // 打人的措施一次只打一个：离出口最近的、看得见的那个。
    for (const slot of state.slots) {
      const unit = slot.unit;
      if (!unit || unit.reveal || unit.mask) continue;
      const pool = state.enemies.filter((e) => !e.dead && e.t >= 0 && visible(e) && tdInRange(slot, e));
      if (unit.block) {
        // 防火墙：冷却好了就拦死一个它管的（想往外发的），不看血量。
        unit.cd = Math.max(0, (unit.cd ?? 0) - dt);
        const target = pool.filter((e) => unit.strong?.includes(e.kind)).sort((a, b) => b.t - a.t)[0];
        if (!target || unit.cd > 0) continue;
        unit.cd = unit.cooldown ?? 4;
        target.dead = true;
        state.killed += 1;
        state.budget = Math.min(maxBudget, state.budget + (spec.bounty ?? 2));
        events.push({ type: "fire", slot, enemy: target }, { type: "kill", slot, enemy: target, exact: true, blocked: true });
        continue;
      }
      const target = pool.sort((a, b) => b.t - a.t)[0];
      if (!target) continue;
      events.push({ type: "fire", slot, enemy: target });
      target.hp -= dpsOn(spec, unit, target.kind) * dt * (target.revealed > 0 ? target.marked || 1 : 1);
      if (unit.slow) {
        target.slowed = spec.slowTime ?? 1.2;
        target.slowFactor = unit.slowFactor ?? spec.slowFactor ?? 0.45;
      }
      if (target.hp <= 0 && !target.dead) {
        target.dead = true;
        state.killed += 1;
        state.budget = Math.min(maxBudget, state.budget + (spec.bounty ?? 2));
        events.push({ type: "kill", slot, enemy: target, exact: Boolean(unit.strong?.includes(target.kind)) });
      }
    }
    state.enemies = state.enemies.filter((e) => !e.dead);
    if (state.hp <= 0) {
      state.status = "lost";
      events.push({ type: "lost" });
      return events;
    }
    if (!state.enemies.length) {
      const bonus = waves[state.wave]?.bonus ?? spec.waveBonus ?? 6;
      state.budget = Math.min(maxBudget, state.budget + bonus);
      if (state.wave >= waves.length - 1) {
        state.status = "won";
        events.push({ type: "clear", wave: state.wave, bonus }, { type: "won" });
      } else {
        state.status = "ready";
        events.push({ type: "clear", wave: state.wave, bonus });
      }
    }
    return events;
  };

  return { state, place, upgrade, sell, startWave, step, unitOf, slotOf, counterOf, waves, units };
}
