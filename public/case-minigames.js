// 小游戏模块 (docs/minigame-genres.md): the case's sandbox step can be one of these instead of a plain lab.
// Each keeps the lab contract so case-session needs no changes: take { h, icon, lab, onMistake, onHint,
// onDone } and call onDone() when finished. Every mapping is chosen so the action in the game is the
// action in the job — see the genre doc for what each one stands for.
//
// 塔防 borrows from 保卫萝卜 / 明日方舟: one path, deployment slots along it, a deployment budget that
// regenerates, units you place and upgrade, waves of data collectors walking toward what you protect.
// The budget is the point: every control costs something, and the lamp still has to work.
//
// 节奏 borrows from 音游 (Cytus / Muse Dash / 太鼓): notes ride a lane toward a judgment line, hits are
// graded, combo and accuracy are shown, misses say what leaked out.

//
// 经营 borrows from Game Dev Story / Papers, Please: a company, a daily ledger, one switch per
// permission. Ad money only flows while the lamp works; 查处 risk only builds while the dangerous
// ones stay on; when the hammer falls it names the permission that called it down.
//
// 卡牌 borrows from 逆转裁判's cross-examination: the developer claims one thing at a time and the
// player presents the one evidence card that answers exactly that claim. Wrong cards say what they
// DO prove, so a miss is still a lesson in "evidence must match the claim".

const cls = (parts) => parts.filter(Boolean).join(" ");

// A mini-game's picture is optional: public/art/pixel/minigames/<id>.png replaces the room drawn in
// code. The list of what the studio has delivered arrives from /api/art after boot — later than the
// game mounts — so a game asks hasMiniArt() and re-paints itself when the answer lands.
let miniArt = null;
const miniArtWaiting = new Set();
if (typeof location !== "undefined") {
  const token = document.querySelector('meta[name="workbench-token"]')?.content;
  fetch("/api/art", { cache: "no-cache", headers: token ? { "X-Workbench-Token": token } : {} })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)
    .then((data) => {
      miniArt = new Set(data?.pixel || []);
      for (const paint of miniArtWaiting) paint();
      miniArtWaiting.clear();
    });
}
const hasMiniArt = (id) => Boolean(miniArt?.has(`minigames/${id}`));
const whenMiniArt = (paint) => (miniArt === null ? miniArtWaiting.add(paint) : paint());

/** A picture that appears the moment the studio delivers it; an empty <img> until then. */
function artImg(h, id, className) {
  const img = h("img", { class: className, alt: "", "aria-hidden": "true" });
  const sync = () => {
    const has = hasMiniArt(id);
    if (has) img.src = `/art/pixel/minigames/${id}.png`;
    else img.removeAttribute("src");
    img.classList.toggle("on", has);
  };
  sync();
  whenMiniArt(sync);
  return img;
}

/** The same for a background picture: the class turns the CSS background on. */
function artBg(el, id, className = "art") {
  const sync = () => el.classList.toggle(className, hasMiniArt(id));
  sync();
  whenMiniArt(sync);
  return el;
}

// A sprite sheet arrives with a JSON saying the frame size and which row is which animation.
// Loaded once, and only by a game that already has the sheet.
const sheets = new Map();
function loadSheet(id) {
  if (!sheets.has(id)) {
    sheets.set(id, fetch(`/art/pixel/minigames/${id}.json`, { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : null)).catch(() => null));
  }
  return sheets.get(id);
}
const sheetWhenReady = (id, then) => {
  const get = () => { if (hasMiniArt(id)) loadSheet(id).then(then); };
  get();
  whenMiniArt(get);
};

function head(h, icon, title, onHint) {
  return h("div", { class: "mini-head" }, h("b", {}, title),
    h("button", { class: "btn small", type: "button", onclick: () => onHint?.() }, icon("learn", { size: 14 }), "给个提示"));
}

/**
 * 塔防 · 权限 (王奶奶)
 * 数据：{ budget, regen, hp, weak, eliteHp, eliteSpeed,
 *        kinds:{id:{label,why}}, slots:[{at}],
 *        units:[{id,label,cost,dps,range,slow,strong:[kind],note}],
 *        waves:[{count,kind|kinds[],hp,speed,elite}] }
 *
 * 每个措施只克制它真能管住的那类收集者（最小权限管"读"、沙盒管"发"、限速谁也杀不掉，
 * 只拖慢）。克错的也能打，但只打 weak 折——所以铺满不再等于赢，得看清来的是什么。
 */
/* 数据在机房里是分两路走的：进了大门是一条主干，到分线器分成上下两路，出机房前又并回一条。
   守哪一段、放哪一种措施，就是这份玩法唯一的决定——所以路怎么分叉，必须一眼看得出来。 */
const TD_LANES = {
  up: [[95, 50], [72, 50], [62, 28], [38, 28], [28, 50], [10, 50]],
  down: [[95, 50], [72, 50], [62, 72], [38, 72], [28, 50], [10, 50]],
};
// y 是舞台高度的百分比，按舞台长宽比折算成和 x 同样的单位，弧长才是真实的走路时间。
const TD_YSCALE = 0.25;
const TD_TRACK = Object.fromEntries(Object.entries(TD_LANES).map(([lane, pts]) => {
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
/** 走完全程的 t（0 是刚进大门，1 是摸到保险柜）时，它站在舞台的哪个位置。 */
const tdPosAt = (lane, t) => {
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
};
/** 这一段路是不是归这个措施管。射程按路算，不按直线距离——上下两条路离得太近了。 */
const tdInRange = (slot, enemy) =>
  (slot.guards || []).some((g) => g.lanes.includes(enemy.lane) && enemy.t >= g.t0 && enemy.t <= g.t1);
/** 取路上 [t0,t1] 之间的 13 个点，用来把「这段有人守着」画亮。 */
const tdGuardPoints = (lane, t0, t1) => {
  const out = [];
  for (let i = 0; i <= 12; i += 1) {
    const p = tdPosAt(lane, t0 + (t1 - t0) * (i / 12));
    out.push(`${p.x},${p.y}`);
  }
  return out.join(" ");
};

export function mountTower({ h, icon, lab, onMistake = () => {}, onHint = () => {}, onDone = () => {} }) {
  const spec = lab.tower || {};
  const units = spec.units || [];
  const slots = (spec.slots || []).map((slot) => ({ ...slot, unit: null }));
  const waves = spec.waves || [];
  const kinds = spec.kinds || {};
  const kindLabel = (id) => kinds[id]?.label || id;
  /** A measure that names no `strong` list (throttle) hits everything for the same small amount. */
  const dpsOn = (unit, kind) => (unit.strong ? (unit.strong.includes(kind) ? unit.dps : unit.dps * (spec.weak ?? 0.4)) : unit.dps);
  const counterOf = (kind) => units.find((u) => u.strong?.includes(kind));
  const waveKinds = (w) => (w.kind ? [w.kind] : w.kinds || []);
  /** 下一波长什么样：几种收集者、各走哪条路。路线也报出来，玩家才知道该守哪一边。 */
  const waveText = (w) => {
    const lanes = w.lanes || ["up", "down"];
    const tally = new Map();
    const road = { up: 0, down: 0 };
    for (let i = 0; i < (w.count || 0); i += 1) {
      const list = waveKinds(w);
      const k = list[i % list.length];
      tally.set(k, (tally.get(k) || 0) + 1);
      road[lanes[i % lanes.length]] += 1;
    }
    const names = [...tally].map(([k, n]) => `${kindLabel(k)}×${n}`).join("、");
    return `${names}（上路 ${road.up} · 下路 ${road.down}）` + (w.elite ? ` ${w.elite} 个厚皮` : "");
  };
  let budget = spec.budget ?? 24;
  let hp = spec.hp ?? 3;
  let wave = -1;
  let enemies = [];
  let picked = units[0]?.id || null;
  let running = false;
  let idle = false;
  let last = 0;

  const bar = h("div", { class: "mini-td-bar" });
  // What is being guarded, and what is coming for it: the studio's icons when they exist, the words
  // always — the words are what tells a beginner which end of the path is which.
  const home = h("div", { class: "mini-td-home" }, artImg(h, "mini-td-home", "mini-td-icon"), h("small", {}, "隐私"));
  const spawn = h("div", { class: "mini-td-spawn" }, artImg(h, "mini-td-spawn", "mini-td-icon"), h("small", {}, "收集者"));
  const track = h("div", { class: "mini-td-track-wrap" });
  const path = h("div", { class: "mini-td-path" }, track, home);
  artBg(path, "mini-td-path");
  const say = h("p", { class: "mini-say", role: "status" },
    "数据进机房是一条主干，到分线器分成上下两路，出门前又并回一条。守在入口和出口能顾到所有人，"
    + "守在两条支路上一次只能顾一条——但那两个位置才摆得下两个人手。"
    + "想「读」的用最小权限挡住，想「发」的用沙盒关住，限速只拖慢、杀不掉。");
  const palette = h("div", { class: "mini-td-units" });
  const start = h("button", { class: "btn primary", type: "button", onclick: () => nextWave() }, icon("scan", { size: 14 }), "放下一波");
  const tip = h("p", { class: "mini-td-tip" },
    "先在下面挑一个措施，再点机房里的一个空位把它放上；点已经放好的可以升级。"
    + "放之前看清楚预告：这一波谁走哪条路、想干什么。");
  const root = h("div", { class: "mini mini-td" }, head(h, icon, lab.sampleTitle || "权限塔防", onHint), bar, path, tip, palette, h("div", { class: "mini-controls" }, start), say);

  // The slots are rebuilt on every animation frame, so the icon is created once and only its src is
  // swapped — a picture re-created 60 times a second flickers.
  // A unit's picture is named after its `art` when the studio drew it under a different name than
  // the id the case uses (`least-privilege` is drawn as a padlock).
  const artOf = (unit) => (unit ? unit.art || unit.id : "");
  const setIcon = (img, id) => {
    const want = id && hasMiniArt(`mini-td-unit-${id}`) ? `/art/pixel/minigames/mini-td-unit-${id}.png` : "";
    if ((img.getAttribute("src") || "") !== want) {
      if (want) img.src = want;
      else img.removeAttribute("src");
    }
    img.classList.toggle("on", Boolean(want));
  };
  const slotIcons = slots.map(() => h("img", { class: "mini-td-icon", alt: "", "aria-hidden": "true" }));
  const slotNames = slots.map(() => h("b", {}, "空位"));
  const slotLevels = slots.map(() => h("i", {}, ""));
  const slotWhere = slots.map((slot) => h("em", {}, slot.label || ""));
  const slotEls = slots.map((slot, i) => h("button", {
    class: "mini-td-slot", type: "button", style: `left:${slot.x}%;top:${slot.y}%`,
    onclick: () => {
      if (slot.unit) return upgrade(slot);
      const unit = units.find((u) => u.id === picked);
      if (!unit) return;
      if (budget < unit.cost) { say.textContent = `${unit.label}：预算不够（剩 ${Math.round(budget)}）。`; return; }
      budget -= unit.cost;
      slot.unit = { ...unit, level: 1 };
      say.textContent = `${unit.label}：守${slot.label}——${unit.note || "这一段归它"}。`;
      paint();
    },
  }, slotIcons[i], slotNames[i], slotLevels[i], slotWhere[i]));
  slotEls.forEach((el) => path.append(el));
  path.append(spawn);

  const upgrade = (slot) => {
    const unit = slot.unit;
    if (budget < unit.cost) { say.textContent = `${unit.label}：预算不够升级。`; return; }
    budget -= unit.cost;
    unit.level += 1;
    unit.dps = Math.round(unit.dps * 1.6 * 10) / 10;
    say.textContent = `${unit.label} 升到 ${unit.level} 级。`;
    paint();
  };

  const paletteEls = units.map((unit) => h("button", {
    class: cls(["mini-td-unit", picked === unit.id && "picked"]), type: "button", onclick: () => { picked = unit.id; paint(); },
  }, artImg(h, `mini-td-unit-${artOf(unit)}`, "mini-td-icon"),
    h("div", { class: "mini-td-unit-text" }, h("b", {}, unit.label), h("span", {}, `${unit.cost} 点`),
      // 它管得住谁，比名字更重要——这一行就是选它的理由。
      h("em", {}, unit.strong ? `管得住：${unit.strong.map(kindLabel).join("、")}` : "只拖慢，拦不死"),
      ...(unit.note ? [h("small", {}, unit.note)] : []))));
  palette.append(...paletteEls);

  const paint = () => {
    const maxHp = spec.hp ?? 3;
    const next = waves[wave + 1];
    bar.replaceChildren(
      h("span", { class: "mini-td-stat" }, `预算 ${Math.round(budget)}`),
      h("span", { class: "mini-td-stat" }, `隐私 ${"●".repeat(Math.max(0, hp))}${"○".repeat(Math.max(0, maxHp - hp))}`),
      h("span", { class: "mini-td-stat" }, `第 ${Math.max(1, wave + 1)}/${waves.length} 波`),
      // What is coming next is shown on purpose: knowing the kind is what makes the pick a decision.
      next ? h("span", { class: "mini-td-stat next" }, `下一波 ${waveText(next)}`) : null);
    slotEls.forEach((el, i) => {
      const slot = slots[i];
      el.className = cls(["mini-td-slot", slot.unit && "placed"]);
      setIcon(slotIcons[i], artOf(slot.unit));
      slotNames[i].textContent = slot.unit ? slot.unit.label : "空位";
      slotLevels[i].textContent = slot.unit ? `Lv${slot.unit.level}` : "";
    });
    paletteEls.forEach((el, i) => el.classList.toggle("picked", units[i].id === picked));
    paintTrack();
  };

  /** 两条路画出来，被措施守住的那一段亮起来——守哪一段是这个玩法唯一要决定的事。 */
  let trackSig = "";
  const paintTrack = () => {
    const sig = slots.map((slot) => `${slot.unit?.id || "-"}${slot.unit?.level || 0}`).join("|");
    if (sig === trackSig) return; // 每帧重画 SVG 太浪费，只有措施动了才重画
    trackSig = sig;
    let lanes = "";
    for (const lane of ["up", "down"]) {
      const pts = TD_TRACK[lane].pts.map((p) => p.join(",")).join(" ");
      lanes += `<polyline class="mini-td-lane" points="${pts}"/><polyline class="mini-td-lane-core" points="${pts}"/>`;
    }
    let guards = "";
    for (const slot of slots) {
      if (!slot.unit) continue;
      for (const g of slot.guards || []) {
        for (const lane of g.lanes) {
          guards += `<polyline class="${cls(["mini-td-guard", slot.unit.strong && "strong"])}" points="${tdGuardPoints(lane, g.t0, g.t1)}"/>`;
        }
      }
    }
    track.innerHTML = `<svg class="mini-td-track" viewBox="0 0 100 100" preserveAspectRatio="none">${lanes}${guards}</svg>`;
  };

  // 收集者: the studio's sprite walks the four frames of row 0, and the "blocked" frame is left
  // behind where one of them is stopped. Without the sheet they stay the words 数据包.
  const SHEET = "anim-mini-td-collector";
  let sheet = null;
  sheetWhenReady(SHEET, (data) => { sheet = data; });
  const spriteCss = (el, row, col, scale = 2) => {
    const [fw, fh] = sheet.frame;
    // 交付的表是 2x 图：按 frame 的原始像素直接显示只有 12px 高，放大两倍才是画面上的正确尺寸。
    el.style.backgroundImage = `url(/art/pixel/minigames/${SHEET}.png)`;
    el.style.backgroundSize = `${sheet.sheet[0] * fw * scale}px ${sheet.sheet[1] * fh * scale}px`;
    el.style.backgroundPosition = `-${col * fw * scale}px -${row * fh * scale}px`;
  };
  // 拦截火花（mini-td-fx，三帧）：击杀的那一下在原地闪一次就散。
  const FX = "mini-td-fx";
  let fxSheet = null;
  sheetWhenReady(FX, (data) => { fxSheet = data; });
  const playFx = (enemy) => {
    if (!fxSheet) return;
    const anim = fxSheet.animations.intercept;
    const [fw, fh] = fxSheet.frame;
    const at = tdPosAt(enemy.lane, enemy.t);
    const el = h("div", { class: "mini-td-fx", style: `left:${at.x}%;top:${at.y}%` });
    let frame = 0;
    const paint = () => {
      el.style.backgroundImage = `url(/art/pixel/minigames/${FX}.png)`;
      el.style.backgroundSize = `${fxSheet.sheet[0] * fw * 2}px ${fxSheet.sheet[1] * fh * 2}px`;
      el.style.backgroundPosition = `-${frame * fw * 2}px 0`;
    };
    paint();
    path.append(el);
    const ms = Array.isArray(anim.ms) ? anim.ms[0] : anim.ms;
    const timer = setInterval(() => {
      frame += 1;
      if (frame >= anim.frames) { clearInterval(timer); el.remove(); return; }
      paint();
    }, ms);
  };

  const drawEnemies = (now = performance.now()) => {
    for (const enemy of enemies) {
      if (!enemy.el) {
        enemy.maxHp = enemy.hp;
        // 三种收集者共用一张走路的表，颜色按类型调开，名牌本来就有色——一眼分得清谁是谁。
        const body = h("i", { class: "mini-td-body" });
        const hpBar = h("i", { class: "mini-td-hp" }, h("b", {}));
        enemy.el = h("div", { class: cls(["mini-td-enemy", sheet && "sprite", enemy.elite && "elite"]), "data-kind": enemy.kind },
          body, h("i", { class: "mini-td-tag" }, kindLabel(enemy.kind), enemy.elite ? " · 厚" : ""), hpBar);
        enemy.body = body;
        enemy.hpBar = hpBar;
        path.append(enemy.el);
      }
      const at = tdPosAt(enemy.lane, enemy.t);
      enemy.el.style.left = `${at.x}%`;
      enemy.el.style.top = `${at.y}%`;
      // 还没进门的排在门外，先不画——不然一堆人叠在门口看不清谁是谁。
      enemy.el.style.opacity = enemy.t < 0 ? "0" : "1";
      if (sheet) {
        const walk = sheet.animations.walk;
        const ms = Array.isArray(walk.ms) ? walk.ms[0] : walk.ms;
        enemy.el.style.width = `${sheet.frame[0] * 2}px`;
        enemy.el.style.height = `${sheet.frame[1] * 2}px`;
        spriteCss(enemy.body, walk.row, Math.floor(now / ms) % walk.frames);
      }
      // 血条：被削到什么程度一眼可见，玩家才知道差多少。
      const pct = Math.max(0, enemy.hp) / (enemy.maxHp || 1);
      const fill = enemy.hpBar.firstChild;
      fill.style.width = `${Math.min(100, Math.max(0, pct * 100))}%`;
      fill.className = pct > 0.55 ? "" : pct > 0.25 ? "low" : "crit";
    }
    for (const el of [...path.querySelectorAll(".mini-td-enemy")]) {
      if (!enemies.some((enemy) => enemy.el === el)) el.remove();
    }
  };

  const tick = (now) => {
    if (!running) return;
    const dt = Math.min(0.4, (now - last) / 1000);
    last = now;
    budget = Math.min(spec.budget ?? 24, budget + (spec.regen ?? 1.5) * dt);
    for (const enemy of enemies) {
      enemy.t += (enemy.speed * (enemy.slow > 0 ? 0.45 : 1) * dt) / (TD_TRACK[enemy.lane] || TD_TRACK.up).total;
      enemy.slow = Math.max(0, enemy.slow - dt);
      if (enemy.t >= 1) {
        enemy.dead = true;
        hp -= 1;
        onMistake();
        const fix = counterOf(enemy.kind);
        say.textContent = `泄出去了「${kindLabel(enemy.kind)}」（走${enemy.lane === "up" ? "上" : "下"}路）：${kinds[enemy.kind]?.why || ""}`
          + (fix ? ` 那条路上要放「${fix.label}」。` : "");
      }
    }
    // One measure shoots one collector at a time — the one closest to getting out. With splash
    // damage a crowd was no harder than a single one, and the whole game collapsed into "fill it up".
    slots.forEach((slot, si) => {
      const unit = slot.unit;
      if (!unit) return;
      const enemy = enemies.filter((e) => !e.dead && e.t >= 0 && tdInRange(slot, e))
        .sort((a, b) => b.t - a.t)[0];
      if (!enemy) return;
      // 措施干活要看得见：开火的那一下边框亮一下。
      if (!slot.firing) {
        slot.firing = true;
        slotEls[si].classList.add("firing");
        setTimeout(() => { slot.firing = false; slotEls[si].classList.remove("firing"); }, 180);
      }
      enemy.hp -= dpsOn(unit, enemy.kind) * dt;
      if (unit.slow) enemy.slow = 1.2;
      if (enemy.hp <= 0) {
        enemy.dead = true;
        const exact = unit.strong?.includes(enemy.kind);
        say.textContent = `${unit.label}${exact ? "拦下了" : "勉强拖住了"}一个${kindLabel(enemy.kind)}。`;
        const at = tdPosAt(enemy.lane, enemy.t);
        playFx(enemy);
        // Leave the "blocked" frame lying where it fell for a moment, so a kill reads as a kill.
        const fall = sheet?.animations["blocked-fall"];
        if (fall) {
          // Not .mini-td-enemy: drawEnemies() sweeps those every frame, and this one has to stay.
          const ghost = h("div", { class: "mini-td-fall", style: `left:${at.x}%;top:${at.y}%;width:${sheet.frame[0] * 2}px;height:${sheet.frame[1] * 2}px` });
          spriteCss(ghost, fall.row, fall.start || 0);
          path.append(ghost);
          setTimeout(() => ghost.remove(), (Array.isArray(fall.ms) ? fall.ms[0] : fall.ms) + 60);
        }
      }
    });
    enemies = enemies.filter((enemy) => !enemy.dead);
    paint();
    drawEnemies(now);
    if (hp <= 0) return finish(false);
    if (!enemies.length && wave >= waves.length - 1) return finish(true);
    // Between waves the clock keeps running — budget keeps coming — but the next wave waits for the
    // player. Otherwise there is no time to save up for the measure the next kind needs.
    if (!enemies.length && !idle) {
      idle = true;
      const nxt = waves[wave + 1];
      if (nxt) say.textContent = `这一波清了。下一波是 ${waveText(nxt)}——趁现在补措施，攒够了再点「放下一波」。`;
    }
    requestAnimationFrame(tick);
  };

  const nextWave = () => {
    if (running && enemies.length) return; // mashing the button must not stack two waves on the path
    if (wave >= waves.length - 1) return finish(true);
    wave += 1;
    const w = waves[wave];
    const list = waveKinds(w);
    say.textContent = `第 ${wave + 1} 波：${waveText(w)}。`;
    const lanes = w.lanes || ["up", "down"];
    for (let i = 0; i < (w.count || 0); i += 1) {
      const elite = i < (w.elite || 0);
      enemies.push({
        // 谁走哪条路是这一波定好的，玩家看预告就能预判。
        lane: lanes[i % lanes.length],
        t: -i * (16 / TD_TRACK.up.total),
        hp: (w.hp ?? 3) * (elite ? (spec.eliteHp ?? 2.6) : 1),
        speed: (w.speed ?? 6) * (elite ? (spec.eliteSpeed ?? 0.7) : 1),
        slow: 0,
        kind: list[i % list.length],
        elite,
      });
    }
    running = true;
    idle = false;
    last = performance.now();
    paint();
    drawEnemies(last);
    requestAnimationFrame(tick);
  };

  const finish = (ok) => {
    running = false;
    start.disabled = true;
    say.textContent = ok ? "守住了：只用了该用的措施，灯也一直亮着。" : "隐私被掏空了——想想哪些门本可以不开。";
    onDone();
  };
  paint();
  return root;
}

/**
 * 节奏 · 定时上报 (小林)
 * 数据：{ bpm, lead, approach, notes:[{beat, kind:'upload'|'sync', label}] }
 */
export function mountRhythm({ h, icon, lab, onMistake = () => {}, onHint = () => {}, onDone = () => {} }) {
  const pattern = lab.rhythm || { bpm: 100, lead: 3, approach: 2.4, notes: [
    { beat: 0, kind: "sync", label: "你点的同步" },
    { beat: 2, kind: "upload", label: "自动上传" },
    { beat: 3.5, kind: "upload", label: "自动上传" },
    { beat: 5, kind: "sync", label: "你点的同步" },
    { beat: 6.5, kind: "upload", label: "自动上传" },
    { beat: 8, kind: "upload", label: "自动上传" }] };
  const beatMs = 60000 / (pattern.bpm || 100);
  const approach = (pattern.approach || 2.4) * beatMs;
  const notes = (pattern.notes || []).map((note, i) => ({ ...note, i, at: (pattern.lead ?? 3) * beatMs + note.beat * beatMs, judged: null }));
  const lane = h("div", { class: "mini-rh-lane" }, h("div", { class: "mini-rh-line" }));
  const say = h("p", { class: "mini-say", role: "status" }, "红色是它在偷偷上传——拍点上按空格切断；绿色是你自己点的同步，别切。");
  const score = h("div", { class: "mini-rh-score" });
  let running = false, start0 = 0, combo = 0, best = 0, perfect = 0, good = 0, missed = 0;
  const noteEls = notes.map((note) => h("div", { class: cls(["mini-rh-note", note.kind]), "data-note": note.i }, note.kind === "upload" ? "上传" : "同步"));
  const hit = h("div", { class: "mini-rh-hit", hidden: true }, "");
  lane.append(...noteEls, hit);
  const root = h("div", { class: "mini mini-rhythm" }, head(h, icon, lab.rhythmTitle || lab.sampleTitle || "定时上报", onHint), lane,
    h("div", { class: "mini-controls" }, h("button", { class: "btn primary", type: "button", onclick: () => go() }, icon("scan", { size: 14 }), "开始"), score), say);

  const show = (text, kind) => {
    hit.textContent = text;
    hit.className = cls(["mini-rh-hit", kind]);
    hit.hidden = false;
    clearTimeout(hit.timer);
    hit.timer = setTimeout(() => { hit.hidden = true; }, 550);
  };
  const paintScore = () => {
    const acc = Math.round(((perfect + good * 0.6) / (notes.length || 1)) * 100);
    score.replaceChildren(h("span", {}, `连击 ${combo}（最高 ${best}）`), h("span", {}, `准度 ${acc}%`), h("span", {}, `漏 ${missed}`));
  };
  const finish = () => {
    running = false;
    paintScore();
    say.textContent = missed ? `有 ${missed} 拍漏了——那些已经发出去了。` : "一拍没漏：它确实是自己在定时传。";
    onDone();
  };
  const step = (now) => {
    if (!running) return;
    const t = now - start0;
    for (const note of notes) {
      noteEls[note.i].style.left = `${100 - 85 * ((t - (note.at - approach)) / approach)}%`;
      if (!note.judged && t > note.at + 190) {
        if (note.kind === "upload") {
          note.judged = "miss";
          missed += 1;
          combo = 0;
          onMistake();
          say.textContent = `${note.label || "上传"}：漏了，东西已经发走了。`;
          show("漏掉", "miss");
        } else {
          note.judged = "ok";
          combo += 1;
          best = Math.max(best, combo);
          show("没切（对）", "good");
        }
      }
    }
    paintScore();
    if (t > (notes[notes.length - 1]?.at || 6000) + 900) return finish();
    requestAnimationFrame(step);
  };
  const press = (event) => {
    if (!running) return;
    if (event.type === "keydown" && event.key !== " ") return;
    event.preventDefault?.();
    const t = performance.now() - start0;
    const near = notes.filter((n) => !n.judged).sort((a, b) => Math.abs(a.at - t) - Math.abs(b.at - t))[0];
    if (!near || Math.abs(near.at - t) > 260) return;
    const grade = Math.abs(near.at - t) <= 90 ? "perfect" : "good";
    near.judged = grade;
    if (near.kind === "upload") {
      if (grade === "perfect") perfect += 1; else good += 1;
      combo += 1;
      best = Math.max(best, combo);
      show(grade === "perfect" ? "完美切断" : "还行", grade);
      say.textContent = `${near.label || "上传"}：${grade === "perfect" ? "干净地切断了" : "切断了，但慢了半拍"}。`;
    } else {
      onMistake();
      combo = 0;
      show("切错了", "miss");
      say.textContent = `${near.label || "同步"}：这是你要的同步，切了反而坏了。`;
    }
    paintScore();
  };
  const go = () => {
    if (running) return;
    running = true;
    start0 = performance.now();
    say.textContent = "来了——红拍上按空格。";
    requestAnimationFrame(step);
  };
  document.addEventListener("keydown", press);
  lane.addEventListener("click", () => press({ type: "click", preventDefault: () => {} }));
  paintScore();
  return root;
}

/**
 * 管道 · 数据流向 (阿哲): route the secret into the server, not into the package you are about to ship.
 */
export function mountPipes({ h, icon, lab, onMistake = () => {}, onHint = () => {}, onDone = () => {} }) {
  const spec = lab.pipes || { size: 4, tiles: [], start: [0, 0], exits: [] };
  const size = spec.size;
  const tiles = spec.tiles.map((tile) => ({ ...tile, dirs: [...tile.dirs] }));
  const at = (x, y) => tiles.find((t) => t.x === x && t.y === y);
  const grid = h("div", { class: "mini-grid", style: `--n:${size}` });
  const say = h("p", { class: "mini-say", role: "status" }, "点格子转动管道：把密钥接到「服务器」，别接到「发布包」。");
  const count = h("span", {}, "还没接通");
  let ended = false;
  const rotate = (tile) => {
    if (tile.fixed) return;
    tile.dirs.unshift(tile.dirs.pop());
    paint();
  };
  const reach = () => {
    const [sx, sy] = spec.start;
    const seen = new Set([`${sx},${sy}`]);
    const queue = [[sx, sy]];
    while (queue.length) {
      const [x, y] = queue.shift();
      const [up, right, down, left] = (at(x, y) || { dirs: [0, 0, 0, 0] }).dirs;
      const move = (nx, ny, open, back) => {
        if (!open) return;
        const other = at(nx, ny);
        if (!other || !other.dirs[back] || seen.has(`${nx},${ny}`)) return;
        seen.add(`${nx},${ny}`);
        queue.push([nx, ny]);
      };
      move(x, y - 1, up, 2); move(x + 1, y, right, 3); move(x, y + 1, down, 0); move(x - 1, y, left, 1);
    }
    return spec.exits.map((exit) => ({ exit, reached: seen.has(`${exit.x},${exit.y}`) }));
  };
  const cells = [];
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
    const tile = at(x, y) || { x, y, dirs: [0, 0, 0, 0], fixed: true };
    const pipe = h("span", { class: "mini-pipe" }, h("i", { class: "a-u" }), h("i", { class: "a-r" }), h("i", { class: "a-d" }), h("i", { class: "a-l" }), h("b", {}));
    cells.push(h("button", { class: "mini-cell", type: "button", "data-x": x, "data-y": y, onclick: () => rotate(tile) }, pipe));
  }
  grid.append(...cells);
  const cellAt = (x, y) => cells.find((cell) => Number(cell.dataset.x) === x && Number(cell.dataset.y) === y);
  for (const exit of spec.exits) cellAt(exit.x, exit.y)?.append(h("span", { class: `mini-exit ${exit.kind}` }, exit.kind === "server" ? "服务器" : "发布包"));
  cellAt(spec.start[0], spec.start[1])?.append(h("span", { class: "mini-exit start" }, "密钥"));
  const paint = () => {
    for (const cell of cells) {
      const tile = at(Number(cell.dataset.x), Number(cell.dataset.y));
      const [up, right, down, left] = tile?.dirs || [0, 0, 0, 0];
      cell.classList.toggle("fixed", Boolean(tile?.fixed));
      cell.querySelector(".mini-pipe").className = cls(["mini-pipe", up && "u", right && "r", down && "d", left && "l"]);
    }
    const state = reach();
    if (state.find((s) => s.exit.kind === "package")?.reached) {
      onMistake();
      count.textContent = "走错了";
      say.textContent = "密钥流进了发布包——谁拆开都能看到。转回去。";
      return;
    }
    if (state.find((s) => s.exit.kind === "server")?.reached) {
      count.textContent = "已接通服务器";
      say.textContent = "接通了：密钥该在服务器上，不该留在要发出去的包里。";
      if (!ended) { ended = true; onDone(); }
      return;
    }
    count.textContent = "还没接通";
  };
  paint();
  return h("div", { class: "mini mini-pipes" }, head(h, icon, lab.sampleTitle || "数据流向", onHint), grid, h("div", { class: "mini-controls" }, count), say);
}

/**
 * 经营 · 权限的代价 (王奶奶手电筒公司): the board handed you every switch turned on. Run the company for
 * a week — ad income flows only while the lamp works, users drain and 查处 risk builds while the
 * dangerous permissions stay on, and rent goes out either way. When the hammer falls it names the
 * permission that called it down.
 * 数据：{ days, users, rent, riskMax, bankFloor, perms:[{id,label,need,income,churn,risk,note}],
 *         events:[{at,lose,label,text}] }
 */
export function mountManage({ h, icon, lab, onMistake = () => {}, onHint = () => {}, onDone = () => {} }) {
  const spec = lab.manage || {
    days: 7, users: 100, rent: 4, riskMax: 120, bankFloor: -20,
    perms: [
      { id: "flash", label: "闪光灯（开灯用）", need: true, income: 0, churn: 0, risk: 0, note: "灯的本职。关了它，App 就是个摆设。" },
      { id: "internet", label: "INTERNET（联网）", income: 9, churn: 0, risk: 5, note: "广告要它；SDK 把数据传出去，也要它。" },
      { id: "contacts", label: "READ_CONTACTS（通讯录）", income: 6, churn: 2, risk: 6, note: "广告 SDK 想认识你的朋友。" },
      { id: "location", label: "FINE_LOCATION（精确定位）", income: 5, churn: 3, risk: 5, note: "好推「附近」的广告。" },
      { id: "boot", label: "BOOT_COMPLETED（开机自启）", income: 2, churn: 3, risk: 3, note: "一开机就开始干活。" },
      { id: "camera", label: "CAMERA（相机）", income: 0, churn: 1, risk: 2, note: "开灯用不着摄像头。" },
    ],
    events: [
      { at: 40, lose: 15, label: "商店问询", text: "商店来问：一个手电筒，为什么要读通讯录？" },
      { at: 80, lose: 30, label: "通报批评", text: "被通报「超范围收集」，用户吵翻了。" },
      { at: 120, lose: 999, label: "下架", text: "应用被下架了。" },
    ],
  };
  const perms = spec.perms.map((perm) => ({ ...perm, on: true }));
  const events = spec.events || [];
  let day = 1;
  let users = spec.users ?? 100;
  let cash = spec.cash ?? 0;
  let risk = 0;
  let fired = new Set();
  let notified = 0;
  let over = false;

  const say = h("p", { class: "mini-say", role: "status" }, "董事会把权限全开了，广告收入到账、用户在流失、查处风险在涨。该关哪几项，你来定——每过一天结一次账。");
  // The office: the studio's picture once it lands, a desk and a window drawn in CSS until then.
  // It answers to the ledger the way a shop answers to the owner in 日式经营 games — the lights go
  // out when the lamp's own permission is off, and the room runs hot when 查处 risk piles up.
  const bar = h("div", { class: "mini-mg-bar" });
  const officeId = lab.manageRoom || "mini-mg-office";
  const officeDrawn = [h("span", { class: "window" }), h("span", { class: "desk" }), h("span", { class: "plant" })];
  const office = h("div", { class: "mini-mg-office drawn" }, ...officeDrawn, bar);
  const paintOffice = () => {
    const has = hasMiniArt(officeId);
    if (has === Boolean(office.querySelector("img"))) return;
    office.className = cls(["mini-mg-office", !has && "drawn"]);
    office.replaceChildren(...(has
      ? [h("img", { class: "mini-mg-bg", src: `/art/pixel/minigames/${officeId}.png`, alt: "" })]
      : officeDrawn), bar);
  };
  paintOffice();
  whenMiniArt(paintOffice);
  const log = h("div", { class: "mini-mg-log" });
  const meter = h("span", { class: "mini-mg-meter" }, h("i", {}));
  const next = h("button", { class: "btn primary", type: "button", onclick: () => endDay() }, icon("scan", { size: 14 }), "过一天");
  const restart = h("button", { class: "btn", type: "button", hidden: true, onclick: () => reset() }, "重新开张");
  const permEls = perms.map((perm) => h("button", {
    class: "mini-mg-perm on", type: "button",
    onclick: () => {
      if (over) return;
      perm.on = !perm.on;
      if (perm.need && !perm.on) { onMistake(); say.textContent = "这是开灯本身要用的权限——灯不亮，什么都谈不上。"; }
      else if (!perm.need && perm.on) say.textContent = `${perm.label}：${perm.note || "打开它"}。`;
      else if (!perm.need) say.textContent = `关掉 ${perm.label}：广告少一份，风险也少一份。`;
      paint();
    },
  }, h("b", {}, perm.label),
    ...(perm.income ? [h("span", { class: "gain" }, `广告 +${perm.income}/天`)] : []),
    ...(perm.churn ? [h("span", { class: "cost" }, `掉粉 ${perm.churn}/天`)] : []),
    ...(perm.risk ? [h("span", { class: "cost" }, `风险 +${perm.risk}/天`)] : []),
    ...(perm.need ? [h("span", { class: "gain" }, "开灯必须")] : []),
    ...(perm.note ? [h("small", {}, perm.note)] : [])));
  const root = h("div", { class: "mini mini-manage" }, head(h, icon, lab.manageTitle || "权限的代价", onHint),
    office, h("div", { class: "mini-mg-perms" }, ...permEls), h("div", { class: "mini-controls" }, next, restart), say, log);

  const paint = () => {
    const maxRisk = spec.riskMax ?? 120;
    bar.replaceChildren(
      h("span", { class: "mini-td-stat" }, `第 ${Math.min(day, spec.days)}/${spec.days} 天`),
      h("span", { class: "mini-td-stat" }, `现金 ¥${Math.round(cash)}`),
      h("span", { class: "mini-td-stat" }, `用户 ${Math.max(0, Math.round(users))}`),
      h("span", { class: "mini-td-stat" }, `被查风险 ${Math.round(risk)}/${maxRisk}`));
    bar.append(meter);
    meter.firstChild.style.width = `${Math.min(100, (risk / maxRisk) * 100)}%`;
    permEls.forEach((el, i) => { el.className = cls(["mini-mg-perm", perms[i].on ? "on" : "off"]); });
    // The room answers to the ledger: no lamp permission means a dark shop, heavy risk means a hot one.
    const lamp = perms.find((perm) => perm.need);
    office.classList.toggle("dark", Boolean(lamp) && !lamp.on);
    office.classList.toggle("hot", risk >= maxRisk * 0.5);
  };

  const endDay = () => {
    if (over) return;
    const on = perms.filter((perm) => perm.on);
    const lamp = on.find((perm) => perm.need);
    const income = lamp ? on.reduce((sum, perm) => sum + (perm.income || 0), 0) : 0;
    const churn = on.reduce((sum, perm) => sum + (perm.churn || 0), 0);
    const rent = spec.rent ?? 4;
    const topRisk = () => [...perms].filter((perm) => perm.on && !perm.need && perm.risk).sort((a, b) => b.risk - a.risk)[0];
    cash += income - rent;
    users -= churn;
    risk += on.reduce((sum, perm) => sum + (perm.risk || 0), 0);
    const lines = [`第 ${day} 天：${lamp ? `进账 ¥${income}` : "灯没亮，收入 ¥0"}，房租 ¥${rent}${churn ? `，掉粉 ${churn}` : ""}。`];
    if (!lamp) {
      onMistake();
      lines.push("开灯要用的权限被关了——灯都不亮，谈不上生意。");
      say.textContent = "灯没亮。开灯那项是本职权限，不能关。";
    }
    for (const event of events) {
      if (risk >= event.at && !fired.has(event.label)) {
        fired.add(event.label);
        notified += 1;
        users -= event.lose;
        const culprit = topRisk();
        lines.push(`【${event.label}】${event.text}${culprit ? `（风险最大的一项：${culprit.label}）` : ""}`);
        say.textContent = `${event.label}：${event.text}`;
        if (event.label !== "商店问询") onMistake();
      }
    }
    users = Math.max(0, users);
    log.prepend(...lines.map((line) => h("div", {}, line)));
    if (users <= 0) return finish(false, `用户跑光了。${topRisk()?.label || "多余的权限"}把大家吓走了。`);
    if (cash < (spec.bankFloor ?? -20)) return finish(false, `钱烧完了（¥${Math.round(cash)}）：房租都交不起。`);
    if (day >= spec.days) return finish(true);
    day += 1;
    paint();
  };

  const finish = (ok, text) => {
    over = true;
    next.hidden = true;
    restart.hidden = false;
    if (ok) {
      say.textContent = `撑过 ${spec.days} 天：现金 ¥${Math.round(cash)}，剩 ${Math.round(users)} 个用户${notified ? `，被查 ${notified} 次` : ""}。`
        + (cash <= 10 ? "只留本职最安全，但也最穷——这就是最小权限的代价与安心。"
          : "钱赚到了，风险也在账上写着：每一项权限都要有人负责。");
      onDone();
    } else {
      say.textContent = text;
      onMistake();
      log.prepend(h("div", {}, text));
    }
    paint();
  };

  const reset = () => {
    day = 1;
    users = spec.users ?? 100;
    cash = spec.cash ?? 0;
    risk = 0;
    fired = new Set();
    notified = 0;
    over = false;
    for (const perm of perms) perm.on = true;
    next.hidden = false;
    restart.hidden = true;
    log.replaceChildren();
    say.textContent = "再开一次：这回先想好，哪几项是本职。";
    paint();
  };
  paint();
  return root;
}

/**
 * 卡牌 · 对质 (通用): the developer claims one thing at a time; the player presents the one evidence
 * card that answers exactly that claim, 逆转裁判 style. 出对牌 == 用对证据 — a wrong card says what it
 * does prove instead, so every miss still teaches "evidence must match the claim".
 * 数据：{ opponent, cards:[{id,label,note}], claims:[{text,answer,why}] }
 */
export function mountCards({ h, icon, lab, onMistake = () => {}, onHint = () => {}, onDone = () => {} }) {
  const spec = lab.cards || {
    opponent: "开发者",
    cards: [
      { id: "capture", label: "抓包记录", note: "你没点任何东西，它每 30 秒上传一次" },
      { id: "timer", label: "代码：setInterval(…, 30000)", note: "每 30 秒干一次活的，只有定时器" },
      { id: "sdk", label: "安装包里的 SDK 名单", note: "上传的收件人是广告 SDK 的地址" },
      { id: "terms", label: "用户协议第 14 条", note: "写着「可能收集信息」" },
      { id: "changelog", label: "更新日志", note: "只写了「修复闪退」" },
      { id: "lamp", label: "手电筒 APK 的权限清单", note: "另一个案子的证据，和本案无关" },
    ],
    claims: [
      { text: "我从不收集。你不点同步，它就不会上传。", answer: "capture", why: "抓包记录：你一下都没点，它每 30 秒自己传一次。" },
      { text: "就算有，那也是一次性的统计，不会自己定时跑。", answer: "timer", why: "代码里的 setInterval(30000)：会自己定时跑的，只有定时器。" },
      { text: "数据发到我们自己的服务器，没给过别人。", answer: "sdk", why: "收件地址在 SDK 名单里，是广告公司的，不是开发者的。" },
      { text: "用户都同意了，协议里写得明明白白。", answer: "terms", why: "第 14 条写的是「可能收集」，没说定时——还藏在 9 页长文里。" },
    ],
  };
  const cards = spec.cards || [];
  const claims = spec.claims || [];
  let idx = 0;
  let wrong = 0;

  // The room: the studio's picture (public/art/pixel/minigames/<id>.png) once it is delivered, a
  // bench and a desk drawn in CSS until then. The claim hangs over it the way a witness stand does
  // in 逆转裁判 — one speaker, one line at a time, nothing else competing for the eye.
  const roomId = lab.cardsRoom || "mini-cd-room";
  const drawn = [h("span", { class: "window" }), h("span", { class: "bench" }), h("span", { class: "desk" }), h("span", { class: "stand" })];
  const bubble = h("div", { class: "mini-cd-claim" });
  const stage = h("div", { class: "mini-cd-stage drawn" }, ...drawn, bubble);
  const paintRoom = () => {
    const has = hasMiniArt(roomId);
    if (has === Boolean(stage.querySelector("img"))) return;
    stage.className = cls(["mini-cd-stage", !has && "drawn"]);
    stage.replaceChildren(...(has ? [h("img", { class: "mini-cd-bg", src: `/art/pixel/minigames/${roomId}.png`, alt: "" })] : drawn), bubble);
  };
  paintRoom();
  whenMiniArt(paintRoom);

  const verdict = h("p", { class: "mini-cd-verdict" }, "");
  const count = h("span", { class: "mini-count" });
  const intro = `${spec.opponent || "对方"}一句句说，你出对应的那张证据牌。对质不是吵架：让每一句话都对上一件证据。`;
  const say = h("p", { class: "mini-say", role: "status" }, intro);
  const restart = h("button", { class: "btn", type: "button", onclick: () => reset() }, "重新对质");
  let flashTimer = 0;
  const flashStage = (kind) => {
    stage.classList.remove("hit", "miss");
    void stage.offsetWidth; // restart the animation even when the last one is still running
    stage.classList.add(kind);
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => stage.classList.remove("hit", "miss"), 560);
  };
  const paint = () => {
    bubble.replaceChildren(h("b", {}, `${spec.opponent || "对方"}：`), ` ${claims[idx]?.text || "……（他不说话了）"}`);
    count.textContent = `已驳回 ${idx}/${claims.length} · 打错 ${wrong}`;
  };
  const reset = () => {
    idx = 0;
    wrong = 0;
    verdict.className = "mini-cd-verdict";
    verdict.textContent = "";
    say.textContent = intro;
    paint();
  };
  const play = (card) => {
    const claim = claims[idx];
    if (!claim || !card) return;
    if (card.id === claim.answer) {
      idx += 1;
      flashStage("hit");
      verdict.className = "mini-cd-verdict refute";
      verdict.textContent = `【等一下！】${claim.why || "这句话被证据驳倒了。"}`;
      if (idx >= claims.length) {
        say.textContent = wrong
          ? `全部驳回，打错 ${wrong} 次——每张牌只说明一件事，出牌前先听清对面在主张什么。`
          : "一张没错。证据和主张一一对应，这就是证据链。";
        onDone();
      } else {
        say.textContent = "驳倒了。他换了种说法，下一句。";
      }
    } else {
      wrong += 1;
      flashStage("miss");
      onMistake();
      verdict.className = "mini-cd-verdict";
      verdict.textContent = `${card.label}——这张牌说明不了这句：它${card.note || "讲的是另一件事"}。`;
      say.textContent = "证据要对着主张出：先听清这句话在主张什么，再挑牌。";
    }
    paint();
  };
  // Hovering a card says what it proves, so the player can study the evidence before committing.
  // In 逆转裁判 you read the file first and decide later; the same beat, kept out of the card itself
  // so the card stays a picture and a name.
  const peekIdle = "把光标停在一张牌上看它说明什么；出牌前先听清对面在主张什么。";
  const peek = h("p", { class: "mini-cd-peek" }, peekIdle);
  const showNote = (card) => (peek.textContent = card.note ? `${card.label}——${card.note}` : card.label);
  const cardEls = cards.map((card) => h("button", {
    class: "mini-cd-card", type: "button", onclick: () => play(card),
    onmouseenter: () => showNote(card), onfocus: () => showNote(card),
    onmouseleave: () => (peek.textContent = peekIdle), onblur: () => (peek.textContent = peekIdle),
  }, h("span", { class: "mini-cd-card-art", "aria-hidden": "true" }),
    h("b", {}, card.label), ...(card.note ? [h("small", {}, card.note)] : [])));
  // The studio's frame turns each card into a 3:2 evidence card: the picture in the window, the name
  // on the plate below it. Without it the cards stay plain text buttons.
  const paintCards = () => {
    const framed = hasMiniArt("mini-cd-card-frame");
    for (const [i, card] of cards.entries()) {
      const box = cardEls[i].querySelector(".mini-cd-card-art");
      const pic = hasMiniArt(`mini-cd-art-${card.id}`);
      cardEls[i].classList.toggle("art", framed);
      if (pic && !box.firstChild) {
        box.append(h("img", { src: `/art/pixel/minigames/mini-cd-art-${card.id}.png`, alt: "" }));
      } else if (!pic && box.firstChild) {
        box.replaceChildren();
      }
    }
  };
  paintCards();
  whenMiniArt(paintCards);
  paint();
  return h("div", { class: "mini mini-cards" }, head(h, icon, lab.cardsTitle || "当面对质", onHint),
    stage, verdict, h("div", { class: "mini-cd-cards" }, ...cardEls), peek,
    h("div", { class: "mini-controls" }, count, restart), say);
}
