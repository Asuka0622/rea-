// 塔防 · 权限（王奶奶的手电筒）。规则在 tower-engine.js（Node 里能跑，tests 用它配平），这里只管画面和操作。
//
// 借的是保卫萝卜 / 明日方舟：一条分叉的路、路边的空位、会回的预算、能放能升级能拆的措施、一波波走向
// 保险柜的收集者。措施的规矩就是知识本身：最小权限管「读」，沙盒管「发」，限速只拖慢、要配合别的措施。
// 数据：samples/cases/flashlight-apk/workbench-case.json 的 game.lab.tower。

import { createTowerRun, tdPosAt, tdGuardPoints, TD_TRACK, waveText, upgradeCost, refundOf, dpsOn } from "./tower-engine.js";
import { hasMiniArt, whenMiniArt, artImg, sheetWhenReady, cls, miniHead } from "./mini-art.js";

const STYLE_ID = "tower-game-style";
function loadStyle() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
  const link = document.createElement("link");
  link.id = STYLE_ID;
  link.rel = "stylesheet";
  link.href = "/tower-game.css";
  document.head.append(link);
}

// 没有美术图时，措施用一个字的色块占位（美术需求见 docs/art/briefs/tower-defense-v2.md）。
const GLYPH = { "least-privilege": "锁", sandbox: "沙", throttle: "慢", firewall: "墙", mask: "脱", audit: "审" };
const glyph = (h, unit) => h("span", { class: "td2-glyph", "data-unit": unit?.id || "" }, unit ? GLYPH[unit.id] || unit.label.slice(0, 1) : "");

const DEFAULT_HINTS = [
  "看顶部的「下一波」：谁来、走哪条路。来「读」的（通讯录、定位）用最小权限挡，来「发」的（上传）用沙盒关。",
  "入口和出口两条路都管，但守的路短；上下路的前段、后段只管一条路，守得长。",
  "「加急上传」跑得太快，沙盒来不及关。在它前面一段放限速节流把它拖住，沙盒才打得完。",
  "预算只在收集者走在路上时才回，拦下一个有赏金，清完一波有奖励。上一波的布防不合适，点它可以拆掉，退一半钱。",
];

export function mountTower(props) {
  const { h, icon, lab, onMistake = () => {}, onHint = () => {}, onDone = () => {}, story = async () => {} } = props;
  loadStyle();
  const spec = lab.tower || {};
  const run = createTowerRun(spec);
  const { state } = run;
  // ?debug：控制台里能看这一局（window.__td.state）。
  if (typeof location !== "undefined" && new URLSearchParams(location.search).has("debug")) window.__td = run;
  const units = run.units;
  const kinds = spec.kinds || {};
  const kindLabel = (id) => kinds[id]?.label || id;
  const maxBudget = spec.maxBudget ?? 60;
  const hints = spec.hints || DEFAULT_HINTS;
  let hintAt = 0;
  let picked = units[0]?.id || null;
  let selected = null; // 点中的、已经放了措施的位置
  let hover = null; // 鼠标停着的空位（预览它会守哪段）
  let speed = 1;
  let paused = false;
  let looping = false;
  let last = 0;
  let finished = false;

  /* ----- 画面骨架 ----- */
  const bar = h("div", { class: "mini-td-bar" });
  const home = h("div", { class: "mini-td-home" }, artImg(h, "mini-td-home", "mini-td-icon"), h("small", {}, "隐私"));
  const spawn = h("div", { class: "mini-td-spawn" }, artImg(h, "mini-td-spawn", "mini-td-icon"), h("small", {}, "收集者"));
  const track = h("div", { class: "mini-td-track-wrap" });
  const beams = h("div", { class: "td2-beams" });
  const path = h("div", { class: "mini-td-path td2-path" }, track, beams, home);
  const syncBackdrop = () => {
    const v2 = hasMiniArt("mini-td-path-v2");
    const id = v2 ? "mini-td-path-v2" : "mini-td-path";
    if (hasMiniArt(id)) {
      path.classList.add("art");
      path.style.backgroundImage = `url(/art/pixel/minigames/${id}.png)`;
    } else {
      path.classList.remove("art");
      path.style.backgroundImage = "";
    }
    path.classList.toggle("nolanes", v2);
  };
  syncBackdrop();
  whenMiniArt(syncBackdrop);

  const say = h("p", { class: "mini-say td2-say", role: "status" }, "挑一个措施，点空位放上去，再点「放下一波」。");
  const palette = h("div", { class: "mini-td-units" });
  const slotMenu = h("div", { class: "td2-slot-menu", hidden: true });
  const start = h("button", { class: "btn primary", type: "button", onclick: () => nextWave() }, icon("scan", { size: 14 }), "放下一波");
  const pauseBtn = h("button", { class: "btn", type: "button", onclick: () => togglePause() }, "暂停");
  const speedBtn = h("button", { class: "btn", type: "button", onclick: () => toggleSpeed() }, "×1");
  const root = h("div", { class: "mini mini-td td2" },
    miniHead(h, icon, lab.sampleTitle || "权限塔防", () => hint()),
    bar, path, slotMenu, palette,
    h("div", { class: "mini-controls td2-controls" }, start, pauseBtn, speedBtn),
    say);

  const hint = () => {
    onHint();
    say.textContent = `提示 ${hintAt + 1}/${hints.length}：${hints[hintAt]}`;
    hintAt = (hintAt + 1) % hints.length;
  };

  /* ----- 措施和位置 ----- */
  const artOf = (unit) => (unit ? unit.art || unit.id : "");
  const setIcon = (img, id) => {
    const want = id && hasMiniArt(`mini-td-unit-${id}`) ? `/art/pixel/minigames/mini-td-unit-${id}.png` : "";
    if ((img.getAttribute("src") || "") !== want) {
      if (want) img.src = want;
      else img.removeAttribute("src");
    }
    img.classList.toggle("on", Boolean(want));
  };
  const slotIcons = state.slots.map(() => h("img", { class: "mini-td-icon", alt: "", "aria-hidden": "true" }));
  const slotNames = state.slots.map(() => h("b", {}, "空位"));
  const slotLevels = state.slots.map(() => h("i", {}, ""));
  const slotGlyphs = state.slots.map(() => glyph(h, null));
  const slotEls = state.slots.map((slot, i) => h("button", {
    class: "mini-td-slot", type: "button", style: `left:${slot.x}%;top:${slot.y}%`,
    onmouseenter: () => { hover = slot.id; paintTrack(true); previewText(slot); },
    onmouseleave: () => { if (hover === slot.id) { hover = null; paintTrack(true); } },
    onfocus: () => { hover = slot.id; paintTrack(true); },
    onblur: () => { if (hover === slot.id) { hover = null; paintTrack(true); } },
    onclick: () => clickSlot(slot),
  }, slotIcons[i], slotGlyphs[i], slotNames[i], slotLevels[i], h("em", {}, slot.label || "")));
  slotEls.forEach((el) => path.append(el));
  path.append(spawn);

  const reach = (slot) => {
    const lanes = new Set(slot.guards.flatMap((g) => g.lanes));
    return lanes.size > 1 ? "上下两路都管，守的路短" : lanes.has("up") ? "只管上路" : "只管下路";
  };
  const goodAgainst = (unit) => unit.block ? `隔一会儿拦死一个：${unit.strong.map(kindLabel).join("、")}`
    : unit.mask ? "拦不住，但扫过的溜走了也不扣隐私"
    : unit.reveal ? "照出伪装的，标记后别人打得更狠"
    : unit.strong ? `管得住${unit.strong.map(kindLabel).join("、")}` : "谁都杀不掉，只拖慢";
  const previewText = (slot) => {
    if (slot.unit || finished) return;
    const unit = run.unitOf(picked);
    if (unit) say.textContent = `放在「${slot.label}」：${reach(slot)}。${unit.label}${goodAgainst(unit)}，要 ${unit.cost} 点。`;
  };

  function clickSlot(slot) {
    if (finished) return;
    if (slot.unit) {
      selected = selected === slot.id ? null : slot.id;
      paint();
      return;
    }
    selected = null;
    const unit = run.unitOf(picked);
    const res = run.place(slot.id, picked);
    if (!res.ok) {
      say.textContent = `${unit?.label || "措施"}：${res.why}。`;
      return;
    }
    say.textContent = `${unit.label}守「${slot.label}」：${reach(slot)}。`;
    paint();
    paintTrack(true);
  }

  function paintSlotMenu() {
    const slot = state.slots.find((s) => s.id === selected);
    if (!slot?.unit) {
      slotMenu.hidden = true;
      return;
    }
    const unit = slot.unit;
    const maxed = unit.level >= (spec.maxLevel ?? 3);
    const cost = upgradeCost(unit);
    slotMenu.hidden = false;
    slotMenu.replaceChildren(
      h("span", {}, `「${slot.label}」· ${unit.label} Lv${unit.level}`),
      h("button", { class: "btn small primary", type: "button", disabled: maxed || state.budget < cost, onclick: () => {
        const res = run.upgrade(slot.id);
        say.textContent = res.ok ? `${unit.label}升到 ${unit.level} 级，打得更狠了。` : `升级不了：${res.why}。`;
        paint();
        paintTrack(true);
      } }, maxed ? "已满级" : `升级 · ${cost} 点`),
      h("button", { class: "btn small", type: "button", onclick: () => {
        const res = run.sell(slot.id);
        say.textContent = `拆掉了${unit.label}，退回 ${res.back} 点。`;
        selected = null;
        paint();
        paintTrack(true);
      } }, `拆除 · 退 ${refundOf(unit)} 点`),
      h("button", { class: "btn small ghost", type: "button", onclick: () => { selected = null; paint(); } }, "取消"));
  }

  const paletteEls = units.map((unit) => h("button", {
    class: cls(["mini-td-unit", picked === unit.id && "picked"]), type: "button",
    onclick: () => { picked = unit.id; selected = null; paint(); if (hover) paintTrack(true); },
  }, artImg(h, `mini-td-unit-${artOf(unit)}`, "mini-td-icon"), glyph(h, unit),
    h("div", { class: "mini-td-unit-text" }, h("b", {}, unit.label), h("span", {}, `${unit.cost} 点`),
      h("em", {}, goodAgainst(unit)), ...(unit.note ? [h("small", {}, unit.note)] : []))));
  palette.append(...paletteEls);

  /* ----- 状态栏 ----- */
  function paint() {
    const next = run.waves[state.wave + 1];
    const parts = [
      h("span", { class: "mini-td-stat" }, `预算 ${Math.floor(state.budget)}/${maxBudget}`),
      h("span", { class: "mini-td-stat" }, `隐私 ${"●".repeat(Math.max(0, state.hp))}${"○".repeat(Math.max(0, state.maxHp - state.hp))}`),
      h("span", { class: "mini-td-stat" }, `第 ${Math.max(1, state.wave + 1)}/${run.waves.length} 波`),
    ];
    // 正在打的那一波说「这一波」，等着的时候说「下一波」——预告就是这个玩法的决策依据。
    if (state.status === "running") parts.push(h("span", { class: "mini-td-stat now" }, `这一波 ${waveText(spec, run.waves[state.wave])}`));
    else if (next) parts.push(h("span", { class: "mini-td-stat next" }, `下一波 ${waveText(spec, next)}`));
    bar.replaceChildren(...parts);
    slotEls.forEach((el, i) => {
      const slot = state.slots[i];
      el.className = cls(["mini-td-slot", slot.unit && "placed", selected === slot.id && "selected"]);
      setIcon(slotIcons[i], artOf(slot.unit));
      slotGlyphs[i].textContent = slot.unit ? GLYPH[slot.unit.id] || slot.unit.label.slice(0, 1) : "";
      slotGlyphs[i].dataset.unit = slot.unit?.id || "";
      slotNames[i].textContent = slot.unit ? slot.unit.label : "空位";
      slotLevels[i].textContent = slot.unit ? `Lv${slot.unit.level}` : "";
    });
    paletteEls.forEach((el, i) => {
      el.classList.toggle("picked", units[i].id === picked);
      el.classList.toggle("poor", state.budget < units[i].cost);
    });
    start.disabled = finished || state.status === "running";
    start.lastChild.textContent = state.status === "running" ? "这一波进行中…" : "放下一波";
    pauseBtn.disabled = state.status !== "running";
    paintSlotMenu();
    paintTrack();
  }

  /* ----- 两条路、守卫灯带、放之前的预览 ----- */
  let trackSig = "";
  function paintTrack(force = false) {
    const sig = state.slots.map((s) => `${s.unit?.id || "-"}${s.unit?.level || 0}`).join("|") + `#${hover}:${picked}`;
    if (!force && sig === trackSig) return;
    trackSig = sig;
    let lanes = "";
    for (const lane of ["up", "down"]) {
      const pts = TD_TRACK[lane].pts.map((p) => p.join(",")).join(" ");
      lanes += `<polyline class="mini-td-lane" points="${pts}"/><polyline class="mini-td-lane-mid" points="${pts}"/>`
        + `<polyline class="mini-td-lane-edge" points="${pts}"/><polyline class="mini-td-lane-line" points="${pts}"/>`;
    }
    lanes += `<rect class="mini-td-junction" x="70.4" y="38" width="3.2" height="24" rx="1"/>`
      + `<rect class="mini-td-junction" x="26.4" y="38" width="3.2" height="24" rx="1"/>`;
    let guards = "";
    for (const slot of state.slots) {
      const preview = !slot.unit && hover === slot.id && picked;
      if (!slot.unit && !preview) continue;
      const unit = slot.unit || run.unitOf(picked);
      for (const g of slot.guards || []) {
        for (const lane of g.lanes) {
          const pts = tdGuardPoints(lane, g.t0, g.t1);
          if (preview) guards += `<polyline class="td2-preview" points="${pts}"/>`;
          else guards += `<polyline class="${cls(["mini-td-guard", unit.strong && "strong", unit.slow && "slow"])}" points="${pts}"/>`
            + `<polyline class="mini-td-guard-flow" points="${pts}"/>`;
        }
      }
    }
    track.innerHTML = `<svg class="mini-td-track" viewBox="0 0 100 100" preserveAspectRatio="none">${lanes}${guards}</svg>`;
  }

  /* ----- 收集者 ----- */
  // 收集者的精灵表：每一种可以有自己的（anim-mini-td-<种类>），没有就用通用的那张、靠调色区分。
  const SHEET = "anim-mini-td-collector";
  const sheets = new Map();
  for (const id of [SHEET, ...Object.keys(kinds).map((k) => `anim-mini-td-${k}`)]) sheetWhenReady(id, (data) => { if (data) sheets.set(id, data); });
  const sheetFor = (kind) => (sheets.has(`anim-mini-td-${kind}`) ? [`anim-mini-td-${kind}`, sheets.get(`anim-mini-td-${kind}`)] : sheets.has(SHEET) ? [SHEET, sheets.get(SHEET)] : [null, null]);
  const spriteCss = (el, id, data, row, col, scale = 2) => {
    const [fw, fh] = data.frame;
    el.style.backgroundImage = `url(/art/pixel/minigames/${id}.png)`;
    el.style.backgroundSize = `${data.sheet[0] * fw * scale}px ${data.sheet[1] * fh * scale}px`;
    el.style.backgroundPosition = `-${col * fw * scale}px -${row * fh * scale}px`;
  };
  // 效果：拦截火花是通用的，拦死、揪出、脱敏各自有图就用自己的。
  const FX = { kill: "mini-td-fx", block: "mini-td-fx-block", reveal: "mini-td-fx-reveal", mask: "mini-td-fx-mask" };
  const fxSheets = new Map();
  for (const id of Object.values(FX)) sheetWhenReady(id, (data) => { if (data) fxSheets.set(id, data); });
  const enemyEls = new Map();

  function enemyEl(e) {
    let el = enemyEls.get(e.id);
    if (el) return el;
    const body = h("i", { class: "mini-td-body" });
    const hpFill = h("b", {});
    const tag = h("i", { class: "mini-td-tag" });
    el = h("div", { class: cls(["mini-td-enemy", "td2-enemy", e.elite && "elite"]), "data-kind": e.kind },
      body, tag, h("i", { class: "mini-td-hp" }, hpFill));
    el.body = body;
    el.tag = tag;
    el.hpFill = hpFill;
    path.append(el);
    enemyEls.set(e.id, el);
    return el;
  }

  function drawEnemies(now) {
    const alive = new Set();
    for (const e of state.enemies) {
      alive.add(e.id);
      const el = enemyEl(e);
      const at = tdPosAt(e.lane, e.t);
      el.style.left = `${at.x}%`;
      el.style.top = `${at.y}%`;
      el.style.opacity = e.t < 0 ? "0" : "1";
      const cloaked = e.hidden && e.revealed <= 0;
      const [sheetId, sheet] = sheetFor(e.kind);
      el.classList.toggle("sprite", Boolean(sheet));
      el.classList.toggle("own-sheet", sheetId !== SHEET && Boolean(sheet));
      el.classList.toggle("slowed", e.slowed > 0);
      // 伪装的没被照出来之前只是一个模糊的「？？？」；脱敏过的、被审计标记的都写在名牌上。
      el.classList.toggle("cloaked", cloaked);
      el.classList.toggle("marked", e.revealed > 0);
      el.classList.toggle("masked", e.masked);
      const label = cloaked ? "？？？" : `${kindLabel(e.kind)}${e.elite ? " · 厚" : ""}${e.masked ? " · 已脱敏" : ""}${e.revealed > 0 ? " !" : ""}`;
      if (el.tag.textContent !== label) el.tag.textContent = label;
      if (sheet) {
        // 伪装 SDK 的表有两种走法：伪装中（walk）和被照出来后（walk-revealed）。
        const walk = (!cloaked && sheet.animations["walk-revealed"]) || sheet.animations.walk;
        const ms = Array.isArray(walk.ms) ? walk.ms[0] : walk.ms;
        el.style.width = `${sheet.frame[0] * 2.5}px`;
        el.style.height = `${sheet.frame[1] * 2.5}px`;
        spriteCss(el.body, sheetId, sheet, walk.row, Math.floor(now / (ms * (e.slowed > 0 ? 2 : 1))) % walk.frames, 2.5);
      }
      const pct = Math.max(0, e.hp) / (e.maxHp || 1);
      el.hpFill.style.width = `${Math.min(100, pct * 100)}%`;
      el.hpFill.className = pct > 0.55 ? "" : pct > 0.25 ? "low" : "crit";
    }
    for (const [id, el] of enemyEls) {
      if (!alive.has(id)) {
        el.remove();
        enemyEls.delete(id);
      }
    }
  }

  /* ----- 打击感：光束、命中闪、击杀火花、泄漏 ----- */
  const slotPos = (slot) => ({ x: slot.x, y: slot.y });
  function drawBeams(fires) {
    let svg = "";
    for (const { slot, enemy, area } of fires) {
      if (area) continue; // 审计、脱敏是一片的：位置本身在闪，不画光束
      const a = slotPos(slot);
      const b = tdPosAt(enemy.lane, enemy.t);
      const unit = slot.unit;
      const kind = unit.slow ? "slow" : unit.strong?.includes(enemy.kind) ? "strong" : "weak";
      svg += `<line class="td2-beam ${kind}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;
      const el = enemyEls.get(enemy.id);
      if (el && kind !== "slow") {
        el.classList.remove("hit");
        void el.offsetWidth;
        el.classList.add("hit");
      }
    }
    beams.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none">${svg}</svg>`;
    const firing = new Set(fires.map((f) => f.slot.id));
    const pulsing = new Set(fires.filter((f) => f.area).map((f) => f.slot.id));
    slotEls.forEach((el, i) => {
      el.classList.toggle("firing", firing.has(state.slots[i].id) && !pulsing.has(state.slots[i].id));
      el.classList.toggle("pulsing", pulsing.has(state.slots[i].id));
    });
  }

  function burst(enemy, text, kind, fxKind = kind) {
    const at = tdPosAt(enemy.lane, Math.min(1, enemy.t));
    const pop = h("div", { class: `td2-pop ${kind}`, style: `left:${at.x}%;top:${at.y}%` }, text);
    path.append(pop);
    setTimeout(() => pop.remove(), 900);
    const fxId = fxSheets.has(FX[fxKind]) ? FX[fxKind] : kind === "kill" ? FX.kill : null;
    const fxSheet = fxId && fxSheets.get(fxId);
    if (fxSheet) {
      const anim = fxSheet.animations.intercept || Object.values(fxSheet.animations)[0];
      const [fw, fh] = fxSheet.frame;
      const fx = h("div", { class: "mini-td-fx", style: `left:${at.x}%;top:${at.y}%` });
      let frame = 0;
      const show = () => {
        fx.style.backgroundImage = `url(/art/pixel/minigames/${fxId}.png)`;
        fx.style.backgroundSize = `${fxSheet.sheet[0] * fw * 2}px ${fxSheet.sheet[1] * fh * 2}px`;
        fx.style.backgroundPosition = `-${frame * fw * 2}px 0`;
      };
      show();
      path.append(fx);
      const ms = Array.isArray(anim.ms) ? anim.ms[0] : anim.ms;
      const timer = setInterval(() => {
        frame += 1;
        if (frame >= anim.frames) { clearInterval(timer); fx.remove(); return; }
        show();
      }, ms);
    }
  }

  function leakFx(enemy) {
    home.classList.remove("td2-shake");
    void home.offsetWidth;
    home.classList.add("td2-shake");
    path.classList.remove("td2-flash");
    void path.offsetWidth;
    path.classList.add("td2-flash");
    const card = h("div", { class: "td2-leak-card" }, artImg(h, "mini-td-leak", "td2-leak-img"), `被拿走：${kindLabel(enemy.kind)}`);
    path.append(card);
    setTimeout(() => card.remove(), 1400);
  }

  /* ----- 一波一波 ----- */
  function handle(events) {
    const fires = [];
    for (const ev of events) {
      if (ev.type === "fire") fires.push(ev);
      else if (ev.type === "kill") {
        burst(ev.enemy, ev.blocked ? "拦死" : ev.exact ? "拦下" : "勉强拦下", "kill", ev.blocked ? "block" : "kill");
        say.textContent = `${ev.slot.unit.label}${ev.blocked ? "直接拦死了" : ev.exact ? "拦下了" : "勉强拦下了"}一个${kindLabel(ev.enemy.kind)}（+${spec.bounty ?? 2}）。`;
      } else if (ev.type === "reveal") {
        burst(ev.enemy, "揪出来了！", "reveal");
        say.textContent = `${ev.slot.unit.label}照出来了：它是「${kindLabel(ev.enemy.kind)}」，${kinds[ev.enemy.kind]?.why || ""}`;
      } else if (ev.type === "mask") {
        burst(ev.enemy, "已脱敏", "mask");
      } else if (ev.type === "leak" && ev.masked) {
        burst(ev.enemy, "拿走的是假数据", "mask");
        say.textContent = `一个${kindLabel(ev.enemy.kind)}溜出去了，可它手里的数据脱敏过，没用——不扣隐私。`;
      } else if (ev.type === "leak") {
        onMistake();
        leakFx(ev.enemy);
        const k = kinds[ev.enemy.kind] || {};
        say.textContent = `泄出去了「${k.label || ev.enemy.kind}」（走${ev.enemy.lane === "up" ? "上" : "下"}路）：${k.why || ""}`
          + (ev.fix ? ` 那条路上要放「${ev.fix.label}」。` : "");
      } else if (ev.type === "clear" && state.status === "ready") {
        const next = run.waves[state.wave + 1];
        say.textContent = `这一波清了（奖励 +${ev.bonus}）。下一波是 ${waveText(spec, next)}——看看布防要不要改，好了再点「放下一波」。`;
        // 波与波之间的剧情（lab.tower.talk["下一波的序号"]，从 1 数）。
        const lines = spec.talk?.[String(state.wave + 2)];
        if (lines?.length) story(lines);
      } else if (ev.type === "won" || ev.type === "lost") finish(ev.type === "won");
    }
    drawBeams(fires);
  }

  function loop(now) {
    if (!looping) return;
    const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
    last = now;
    if (!paused && state.status === "running") {
      // 两倍速就把这一帧拆成两步走，射程和命中判断不会被跳过。
      for (let i = 0; i < speed; i += 1) handle(run.step(dt));
      paint();
      drawEnemies(now);
    }
    if (state.status !== "running") {
      looping = false;
      beams.innerHTML = "";
      slotEls.forEach((el) => el.classList.remove("firing"));
      paint();
      drawEnemies(now);
      return;
    }
    requestAnimationFrame(loop);
  }

  function nextWave() {
    if (finished || state.status !== "ready") return;
    if (!run.startWave()) return;
    selected = null;
    say.textContent = `第 ${state.wave + 1} 波：${waveText(spec, run.waves[state.wave])}。`;
    paused = false;
    pauseBtn.textContent = "暂停";
    looping = true;
    last = performance.now();
    paint();
    requestAnimationFrame(loop);
  }

  function togglePause() {
    if (state.status !== "running") return;
    paused = !paused;
    pauseBtn.textContent = paused ? "继续" : "暂停";
    root.classList.toggle("paused", paused);
    if (paused) say.textContent = "暂停中：可以趁现在升级或拆掉措施。";
  }
  function toggleSpeed() {
    speed = speed === 1 ? 2 : 1;
    speedBtn.textContent = `×${speed}`;
  }

  async function finish(ok) {
    if (finished) return;
    finished = true;
    const leaks = state.leaked.length;
    say.textContent = ok
      ? (leaks ? `守住了，漏了 ${leaks} 个：${state.leaked.map(kindLabel).join("、")}。手电筒只该拿闪光灯，其余的门本可以不开。` : "一个都没漏！该挡的挡住了，灯也一直亮着。")
      : `隐私被掏空了——漏掉的是 ${state.leaked.map(kindLabel).join("、")}。看清每一波是谁、走哪条路，再放对的措施。`;
    paint();
    if (ok) return onDone();
    // 守不住不算过关：说一句，然后换一局新的（同样的设置）从第一波重来。
    await story(spec.lost || [{ text: "隐私被掏空了。看清每一波是谁、走哪条路，再放对的措施——从第一波重来。", face: "thinking" }]);
    root.replaceWith(mountTower(props));
  }

  paint();
  paintTrack(true);
  return root;
}

// 给节点测试和以后的「再来一局」用：不画画面也能算出一局的伤害是怎么分的。
export { dpsOn };
