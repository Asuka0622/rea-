import { SCENES } from "./scenes.js";

// 游戏外壳 (beginner mode): the workbench presented like an indie game. A full-screen town map is the
// home screen; clicking a building enters it, the guide talks in a dialogue box at the bottom, and
// choosing what to do opens an in-game window holding the existing page (cases, reports, tutorial…).
// Nothing is rewritten: the page's <main> is moved into the window and back again.
// Pictures are optional: public/art/pixel/town.png and room-<place>.png (320x180) replace the drawn
// stand-ins, sprite-<name>.png (16x32) stands in the scenes; dialogue portraits are anime-style art/faces/*.webp.

const WEB_KEY = "rea-wb-web-mode";

/**
 * The buildings on the 320x180 town map (town.png), in map pixels: the footprint (x, y, w, h) blocks
 * walking and is the click target, `door` is where walking in enters. Measured from the delivered map;
 * the drawn stand-in uses the same places.
 */
const TOWN = {
  learn: { x: 30, y: 6, w: 58, h: 44, door: { x: 61, y: 49 }, kind: "library" },
  home: { x: 128, y: 3, w: 62, h: 47, door: { x: 162, y: 49 }, kind: "office" },
  engines: { x: 240, y: 10, w: 50, h: 43, door: { x: 265, y: 52 }, kind: "workshop" },
  clients: { x: 37, y: 86, w: 48, h: 40, door: { x: 61, y: 121 }, kind: "post" },
  doctor: { x: 243, y: 82, w: 50, h: 44, door: { x: 267, y: 121 }, kind: "clinic" },
};
/** Other things you cannot walk through: the pond, and the river except at the bridge. */
const OBSTACLES = [
  { x: 142, y: 73, w: 46, h: 28 },
  { x: 0, y: 150, w: 146, h: 30 },
  { x: 174, y: 150, w: 146, h: 30 },
];

/** What can be done in each place. `target` is scrolled into view inside the window. */
const ACTIONS = {
  home: [
    { label: "看看委托板（案例馆）", tab: "home", target: "#case-library", open: "#case-library" },
    { label: "分析我自己的软件", tab: "home", target: "#task-card" },
    { label: "回看这次的报告", tab: "home", target: "#run", when: () => !document.querySelector("#run")?.hidden },
  ],
  learn: [{ label: "翻开教程", tab: "learn" }],
  engines: [{ label: "看看有什么工具", tab: "engines" }],
  clients: [{ label: "把工具寄给 AI 助手", tab: "clients" }],
  doctor: [{ label: "给装备做个体检", tab: "doctor" }],
};

const EXTRA_LINES = {
  home: "想从哪儿开始？第一次来的话，推荐先看看委托板。",
  learn: "书架上的教程按顺序排好了，挑一本翻开吧。",
  engines: "需要哪件工具，我帮你挑。",
  clients: "选好你常用的 AI 助手，我们把工具寄过去。",
  doctor: "我来给你的装备做个检查。",
};

export function createGameShell({ h, icon, showTab, isPro, setMode, art }) {
  const root = document.documentElement;
  const main = document.querySelector("main");
  const mainHome = { parent: main.parentNode, next: main.nextSibling };
  let place = null; // null = on the town map
  let lines = [];
  let lineIndex = 0;
  let lineAfter = null;
  let windowOpen = false;
  let enabled = false;

  const webMode = () => {
    try {
      return localStorage.getItem(WEB_KEY) === "1";
    } catch {
      return false;
    }
  };
  const setWebMode = (on) => {
    try {
      localStorage.setItem(WEB_KEY, on ? "1" : "0");
    } catch {}
  };

  /* ----- elements ----- */
  const stage = h("div", { class: "game-stage", role: "region", "aria-label": "小镇" });
  const dialogue = h("div", { class: "game-dialogue", role: "group", "aria-label": "对话" });
  const menu = h("div", { class: "game-menu", role: "menu", "aria-label": "要做什么" });
  const windowBody = h("div", { class: "game-window-body" });
  const windowTitle = h("h2", { class: "game-window-title" });
  const gameWindow = h(
    "section",
    { class: "game-window", role: "dialog", "aria-modal": "false", "aria-labelledby": "game-window-title" },
    h("div", { class: "game-window-head" }, windowTitle, h("button", { class: "btn small", type: "button", onclick: () => closeWindow() }, icon("close", { size: 14 }), "关闭")),
    windowBody,
  );
  windowTitle.id = "game-window-title";
  gameWindow.hidden = true;
  const hud = h(
    "nav",
    { class: "game-hud", "aria-label": "游戏菜单" },
    h("button", { class: "btn small", type: "button", onclick: () => openMap() }, icon("compass", { size: 14 }), "地图（M）"),
    h("button", { class: "btn small", type: "button", onclick: () => document.querySelector("#open-glossary")?.click() }, icon("glossary", { size: 14 }), "小词典"),
    h("button", { class: "btn small", type: "button", onclick: () => document.querySelector("#theme-toggle")?.click() }, icon("sun", { size: 14 }), "白天/夜晚"),
    h("button", { class: "btn small", type: "button", onclick: () => setMode("pro") }, icon("wrench", { size: 14 }), "专业模式"),
    h("button", { class: "btn small", type: "button", onclick: () => { setWebMode(true); sync(); } }, icon("monitor", { size: 14 }), "网页模式"),
  );
  // Phones play in landscape: held upright, ask to turn the phone (or go fullscreen and lock landscape).
  const rotate = h(
    "div",
    { class: "game-rotate", role: "dialog", "aria-label": "请横过来" },
    h("div", { class: "game-rotate-phone", "aria-hidden": "true" }),
    h("p", {}, "把手机横过来玩"),
    h("small", {}, "小镇是横屏游戏。如果手机锁定了竖屏，可以先在控制中心里解锁屏幕旋转。"),
    h("div", { class: "game-rotate-actions" },
      h("button", { class: "btn primary", type: "button", onclick: () => landscape() }, "全屏横屏开始"),
      h("button", { class: "btn", type: "button", onclick: () => { setWebMode(true); sync(); } }, "用网页模式")),
  );
  const shell = h("div", { class: "game-shell", hidden: true }, stage, hud, gameWindow, menu, dialogue, rotate);
  shell.hidden = true;
  document.body.append(shell);

  /** Fullscreen, then lock landscape where the browser allows it (Android Chrome; not iOS Safari). */
  async function landscape() {
    try {
      await document.documentElement.requestFullscreen?.();
      await screen.orientation?.lock?.("landscape");
    } catch {}
  }

  /* ----- scale: the stage is 320x180 map pixels at a whole-number size that fits the screen. The town
     can be larger than that: its size comes from town.png, and the camera follows the player when it is
     (a 320x180 town does not scroll). ----- */
  let roomPx = 1;
  let townPx = 1;
  const world = { w: 320, h: 180 };
  const camera = { x: 0, y: 0 };
  function fit() {
    const fractional = Math.min(window.innerWidth / 320, window.innerHeight / 180);
    // Phones are narrower than 2x: fill the width instead (pixels then scale unevenly, which is fine there).
    roomPx = fractional < 2 ? fractional : Math.floor(fractional);
    townPx = roomPx;
    stage.style.setProperty("--px", String(roomPx));
    worldEl?.style.setProperty("--px", String(townPx));
    placePlayer();
  }
  window.addEventListener("resize", fit);
  const viewW = () => (320 * roomPx) / townPx; // how much of the town (in map pixels) fits on screen
  const viewH = () => (180 * roomPx) / townPx;
  let worldEl = null;
  function followCamera() {
    if (!worldEl) return;
    camera.x = Math.max(0, Math.min(world.w - viewW(), player.x - viewW() / 2));
    camera.y = Math.max(0, Math.min(world.h - viewH(), player.y - 16 - viewH() / 2));
    worldEl.style.translate = `${(-camera.x * townPx).toFixed(1)}px ${(-camera.y * townPx).toFixed(1)}px`;
  }

  /* ----- drawing ----- */
  const has = (name) => art().pixel.has(name);
  const sprite = (name, x, extra = "") =>
    has(`sprite-${name}`)
      ? h("img", { class: `game-sprite ${extra}`, src: `/art/pixel/sprite-${name}.png`, alt: "", style: `--sx:${x}` })
      : h("span", { class: `game-sprite drawn ${name} ${extra}`, style: `--sx:${x}`, "aria-hidden": "true" }, h("i", {}), h("b", {}), h("u", {}));

  function drawTown() {
    const picture = has("town");
    stage.dataset.view = "town";
    nearDoor = null; // the prompt is re-attached to the new world layer when needed
    const background = picture ? h("img", { class: "game-bg", src: "/art/pixel/town.png", alt: "" }) : null;
    if (background) {
      background.addEventListener("load", () => {
        world.w = background.naturalWidth;
        world.h = background.naturalHeight;
        worldEl.style.width = `calc(${world.w}px * var(--px))`;
        worldEl.style.height = `calc(${world.h}px * var(--px))`;
        followCamera();
      });
    }
    worldEl = h("div", { class: "game-world", style: `--px:${townPx};width:calc(${world.w}px * var(--px));height:calc(${world.h}px * var(--px))` });
    stage.replaceChildren(worldEl);
    worldEl.append(
      background || h("div", { class: "game-bg drawn town", "aria-hidden": "true" }, h("span", { class: "path h" }), h("span", { class: "path v" }), h("span", { class: "pond" }), h("span", { class: "river" })),
      ...Object.entries(TOWN).map(([id, spot]) => {
        const scene = SCENES[id];
        return h(
          "button",
          { class: `game-building ${picture ? "over-art" : spot.kind}`, type: "button", style: `--bx:${spot.x};--by:${spot.y};--bw:${spot.w};--bh:${spot.h}`, onclick: () => walkTo(doorOf(id)), "aria-label": `进入${scene.place}（${scene.purpose}）` },
          !picture && h("span", { class: "roof", "aria-hidden": "true" }),
          !picture && h("span", { class: "wall", "aria-hidden": "true" }, h("span", { class: "door" })),
          h("span", { class: "game-label" }, scene.place, h("small", {}, scene.purpose)),
        );
      }),
      (playerEl = has("anim-lumi") ? h("span", { class: "game-sprite player sheet", style: "background-image:url(/art/pixel/anim-lumi.png)", "aria-hidden": "true" }) : sprite("lumi", 0, "player")),
    );
    placePlayer();
  }

  function drawRoom(id) {
    worldEl = null;
    const scene = SCENES[id];
    const picture = has(`room-${id}`);
    stage.dataset.view = id;
    stage.replaceChildren(
      picture ? h("img", { class: "game-bg", src: `/art/pixel/room-${id}.png`, alt: "" }) : h("div", { class: `game-bg drawn room ${id}`, "aria-hidden": "true" }, h("span", { class: "window" }), h("span", { class: "shelf" }), h("span", { class: "desk" })),
      h("div", { class: "game-place-sign" }, icon(scene.icon, { size: 16 }), scene.place),
      sprite("lumi", 110),
    );
  }

  /* ----- dialogue: click or press Enter/Space to continue; choices when the lines run out ----- */
  // A line is "text" or { text, face }: the face picks Lumi's expression for that line.
  const portrait = (face = "normal") => {
    const name = [`lumi-${face}`, "lumi-normal"].find((n) => art().portraits.has(n));
    return name
      ? h("div", { class: "case-portrait", "aria-hidden": "true" }, h("img", { src: `/art/faces/${name}.webp`, alt: "", width: 160, height: 160 }))
      : h("div", { class: "guide-avatar", "aria-hidden": "true" }, h("span", {}));
  };

  function say(texts, after) {
    lines = texts;
    lineIndex = 0;
    lineAfter = after;
    dialogue.onclick = () => advance(after);
    renderLine(after);
  }

  function renderLine(after) {
    const last = lineIndex >= lines.length - 1;
    const line = typeof lines[lineIndex] === "string" ? { text: lines[lineIndex] } : lines[lineIndex];
    dialogue.hidden = false;
    dialogue.replaceChildren(
      portrait(line.face),
      h("div", { class: "case-say-text" }, h("b", {}, "路米"), h("p", {}, line.text), !last && h("span", { class: "game-more" }, "点击继续")),
    );
    if (last) after?.();
  }

  function advance(after) {
    if (lineIndex < lines.length - 1) {
      lineIndex += 1;
      renderLine(after);
    }
  }

  function showMenu(items) {
    menu.hidden = false;
    menu.replaceChildren(
      ...items.map((item) => h("button", { class: "game-choice", type: "button", role: "menuitem", onclick: item.run }, h("span", { class: "game-cursor", "aria-hidden": "true" }, "▶"), item.label)),
    );
    menu.querySelector("button")?.focus({ preventScroll: true });
  }

  /* ----- walking on the town map: WASD / arrow keys, right-click a spot, or the on-screen stick ----- */
  const SPEED = 72; // map pixels per second
  const player = { x: 160, y: 132, left: false, walking: false };
  let playerEl = null;
  let target = null; // { x, y, then }
  let lastPlace = null;
  let movedSinceSpawn = 0;
  const keys = new Set();
  const stick = { x: 0, y: 0 };
  const KEY_DIRS = { w: [0, -1], arrowup: [0, -1], s: [0, 1], arrowdown: [0, 1], a: [-1, 0], arrowleft: [-1, 0], d: [1, 0], arrowright: [1, 0] };

  const doorOf = (id) => TOWN[id].door;
  const blocks = () => [...Object.values(TOWN).map((b) => ({ x: b.x, y: b.y, w: b.w, h: b.h - 2 })), ...OBSTACLES];
  /** The feet (a small box at the bottom of the sprite) would hit a building, the pond or the edge. */
  function blocked(x, y) {
    if (x < 6 || x > world.w - 6 || y < 14 || y > world.h - 2) return true;
    return blocks().some((b) => x + 4 > b.x && x - 4 < b.x + b.w && y > b.y && y - 3 < b.y + b.h);
  }

  /* Sprite-sheet animation (anim-<name>.png + .json): idle frames while standing, walk frames while moving. */
  let animation = { frame: [16, 32], animations: { idle: { row: 0, frames: 2, ms: [2200, 160] }, walk: { row: 1, frames: 4, ms: 140 } } };
  fetch("/art/pixel/anim-lumi.json").then((r) => (r.ok ? r.json() : null)).then((data) => data && (animation = data)).catch(() => {});
  let animClock = 0;
  function animate(dt) {
    if (!playerEl?.classList.contains("sheet")) return;
    const clip = animation.animations[player.walking ? "walk" : "idle"] || animation.animations.idle;
    const durations = Array.isArray(clip.ms) ? clip.ms : Array(clip.frames).fill(clip.ms);
    const total = durations.reduce((a, b) => a + b, 0);
    animClock = (animClock + dt * 1000) % total;
    let t = animClock;
    let index = 0;
    while (t >= durations[index] && index < clip.frames - 1) t -= durations[index++];
    const [fw, fh] = animation.frame;
    playerEl.style.backgroundPosition = `calc(${-index * fw}px * var(--px)) calc(${-clip.row * fh}px * var(--px))`;
  }

  function placePlayer() {
    if (!playerEl) return;
    playerEl.style.left = `calc(${player.x.toFixed(2)}px * var(--px))`;
    playerEl.style.top = `calc(${player.y.toFixed(2)}px * var(--px))`;
    playerEl.classList.toggle("walking", player.walking);
    playerEl.classList.toggle("face-left", player.left);
    followCamera();
  }

  /* Path finding: A* over a 4-pixel grid of the town, then straightened so the walk looks natural. */
  const CELL = 4;
  const free = (x, y) => !blocked(x, y);
  function lineClear(a, b) {
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2);
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      if (!free(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false;
    }
    return true;
  }
  function findPath(from, to) {
    const cols = Math.ceil(world.w / CELL);
    const rows = Math.ceil(world.h / CELL);
    const cell = (p) => [Math.max(0, Math.min(cols - 1, Math.round(p.x / CELL))), Math.max(0, Math.min(rows - 1, Math.round(p.y / CELL)))];
    const center = (c, r) => ({ x: c * CELL, y: r * CELL });
    const [sc, sr] = cell(from);
    let [gc, gr] = cell(to);
    // A goal inside an obstacle: use the nearest free cell around it.
    if (!free(center(gc, gr).x, center(gc, gr).y)) {
      let best = null;
      for (let radius = 1; radius < 12 && !best; radius += 1) {
        for (let dc = -radius; dc <= radius; dc += 1) {
          for (const dr of [-radius, radius]) {
            const c = gc + dc;
            const r = gr + dr;
            if (c >= 0 && r >= 0 && c < cols && r < rows && free(c * CELL, r * CELL)) best ??= [c, r];
          }
        }
      }
      if (!best) return null;
      [gc, gr] = best;
    }
    const key = (c, r) => r * cols + c;
    const open = new Map([[key(sc, sr), { c: sc, r: sr, g: 0, f: 0, parent: null }]]);
    const closed = new Map();
    const h = (c, r) => Math.hypot(c - gc, r - gr);
    let guard = 0;
    while (open.size && guard++ < 20000) {
      let current = null;
      for (const node of open.values()) if (!current || node.f < current.f) current = node;
      open.delete(key(current.c, current.r));
      closed.set(key(current.c, current.r), current);
      if (current.c === gc && current.r === gr) {
        const cells = [];
        for (let n = current; n; n = n.parent) cells.unshift(center(n.c, n.r));
        cells[cells.length - 1] = free(to.x, to.y) ? { x: to.x, y: to.y } : cells[cells.length - 1];
        // Straighten: keep only the points needed to stay clear of obstacles.
        const points = [];
        let anchor = from;
        for (let i = 1; i < cells.length; i += 1) {
          if (!lineClear(anchor, cells[i])) {
            points.push(cells[i - 1]);
            anchor = cells[i - 1];
          }
        }
        points.push(cells[cells.length - 1]);
        return points;
      }
      for (let dc = -1; dc <= 1; dc += 1) {
        for (let dr = -1; dr <= 1; dr += 1) {
          if (!dc && !dr) continue;
          const c = current.c + dc;
          const r = current.r + dr;
          if (c < 0 || r < 0 || c >= cols || r >= rows || closed.has(key(c, r)) || !free(c * CELL, r * CELL)) continue;
          if (dc && dr && (!free((current.c + dc) * CELL, current.r * CELL) || !free(current.c * CELL, (current.r + dr) * CELL))) continue;
          const g = current.g + (dc && dr ? 1.414 : 1);
          const existing = open.get(key(c, r));
          if (!existing || g < existing.g) open.set(key(c, r), { c, r, g, f: g + h(c, r), parent: current });
        }
      }
    }
    return null;
  }

  function walkTo(point, then) {
    if (stage.dataset.view !== "town") return then?.();
    const path = findPath(player, point) || [point];
    target = { x: path[0].x, y: path[0].y, rest: path.slice(1), then };
    startWalking();
  }

  /** Any movement starts the walk: the dialogue box steps aside so the map is visible. */
  function startWalking() {
    dialogue.hidden = true;
  }

  let lastTime = 0;
  function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - lastTime) / 1000 || 0);
    lastTime = now;
    if (!enabled || windowOpen || stage.dataset.view !== "town") return;
    let dx = 0;
    let dy = 0;
    for (const key of keys) {
      const dir = KEY_DIRS[key];
      if (dir) [dx, dy] = [dx + dir[0], dy + dir[1]];
    }
    dx += stick.x;
    dy += stick.y;
    if (dx || dy) target = null; // steering by hand cancels a click-to-walk
    else if (target) {
      const tx = target.x - player.x;
      const ty = target.y - player.y;
      const dist = Math.hypot(tx, ty);
      if (dist < 1.5) {
        if (target.rest?.length) {
          const [next, ...rest] = target.rest;
          target = { ...target, x: next.x, y: next.y, rest };
          return;
        }
        const then = target.then;
        target = null;
        player.walking = false;
        placePlayer();
        then?.();
        return;
      }
      [dx, dy] = [tx / dist, ty / dist];
    }
    const length = Math.hypot(dx, dy);
    player.walking = length > 0;
    if (length) {
      const step = (SPEED * dt) / Math.max(1, length);
      const nx = player.x + dx * step;
      const ny = player.y + dy * step;
      let moved = false;
      if (!blocked(nx, player.y)) [player.x, moved] = [nx, true];
      if (!blocked(player.x, ny)) [player.y, moved] = [ny, true];
      if (!moved && target) target = { ...target, x: player.x, y: player.y, rest: [] }; // stuck: stop here, still arrive
      if (dx) player.left = dx < 0;
      movedSinceSpawn += Math.abs(dx * step) + Math.abs(dy * step);
    }
    placePlayer();
    animate(dt);
    showDoorPrompt();
  }

  /* At a doorway, a prompt appears; E / Enter / Space (or tapping it) goes inside. */
  let nearDoor = null;
  const prompt = h("button", { class: "game-interact", type: "button", onclick: () => nearDoor && enter(nearDoor) });
  prompt.hidden = true;
  function showDoorPrompt() {
    const id = Object.keys(TOWN).find((key) => Math.abs(player.x - doorOf(key).x) < 9 && player.y >= doorOf(key).y - 3 && player.y - doorOf(key).y < 12) || null;
    if (id === nearDoor) {
      if (id) positionPrompt();
      return;
    }
    nearDoor = id;
    prompt.hidden = !id;
    if (!id) return;
    prompt.replaceChildren(h("kbd", {}, touch ? "点这里" : "E"), `进入 · ${SCENES[id].place}`);
    worldEl?.append(prompt);
    positionPrompt();
  }
  function positionPrompt() {
    prompt.style.left = `calc(${player.x.toFixed(1)}px * var(--px))`;
    prompt.style.top = `calc(${(player.y - 36).toFixed(1)}px * var(--px))`;
  }
  requestAnimationFrame(tick);

  // Right-click on the map: walk there.
  stage.addEventListener("contextmenu", (event) => {
    if (!enabled || stage.dataset.view !== "town") return;
    event.preventDefault();
    const box = stage.getBoundingClientRect();
    walkTo({ x: camera.x + (event.clientX - box.left) / townPx, y: camera.y + (event.clientY - box.top) / townPx });
  });

  // Phones: a stick in the lower left.
  const knob = h("span", { class: "game-stick-knob" });
  const stickEl = h("div", { class: "game-stick", "aria-label": "移动轮盘", role: "application" }, knob);
  const moveStick = (event) => {
    const box = stickEl.getBoundingClientRect();
    const r = box.width / 2;
    let x = (event.clientX - box.left - r) / r;
    let y = (event.clientY - box.top - r) / r;
    const length = Math.hypot(x, y);
    if (length > 1) [x, y] = [x / length, y / length];
    stick.x = Math.abs(x) < 0.15 ? 0 : x;
    stick.y = Math.abs(y) < 0.15 ? 0 : y;
    knob.style.translate = `${x * r * 0.6}px ${y * r * 0.6}px`;
    if (stick.x || stick.y) startWalking();
  };
  const releaseStick = () => {
    stick.x = 0;
    stick.y = 0;
    knob.style.translate = "0 0";
  };
  let dragging = null;
  stickEl.addEventListener("pointerdown", (event) => {
    dragging = event.pointerId;
    try {
      stickEl.setPointerCapture(event.pointerId);
    } catch {}
    moveStick(event);
  });
  const follow = (event) => {
    if (dragging === event.pointerId) moveStick(event);
  };
  const stop = (event) => {
    if (dragging !== event.pointerId) return;
    dragging = null;
    releaseStick();
  };
  window.addEventListener("pointermove", follow);
  window.addEventListener("pointerup", stop);
  window.addEventListener("pointercancel", stop);
  shell.append(stickEl);

  const touch = window.matchMedia("(pointer: coarse)").matches;

  /* ----- the town map (M or the menu button): see every place and walk there by itself ----- */
  const mapPanel = h("div", { class: "game-map", role: "dialog", "aria-label": "小镇地图" });
  mapPanel.hidden = true;
  shell.append(mapPanel);
  function openMap() {
    if (windowOpen) return;
    if (stage.dataset.view !== "town") goTown();
    const picture = has("town");
    const mark = (x, y) => `left:${((x / world.w) * 100).toFixed(2)}%;top:${((y / world.h) * 100).toFixed(2)}%`;
    mapPanel.replaceChildren(
      h("div", { class: "game-map-head" }, h("h2", {}, "小镇地图"), h("button", { class: "btn small", type: "button", onclick: closeMap }, icon("close", { size: 14 }), "关闭（M）")),
      h("div", { class: "game-map-body" },
        h("div", { class: "game-map-picture", style: `aspect-ratio:${world.w} / ${world.h}` },
          picture ? h("img", { src: "/art/pixel/town.png", alt: "" }) : h("div", { class: "game-map-blank" }),
          ...Object.entries(TOWN).map(([id, spot]) => h("button", { class: "game-map-pin", type: "button", style: mark(spot.door.x, spot.door.y), onclick: () => travel(id), title: SCENES[id].place }, "▼")),
          h("span", { class: "game-map-you", style: mark(player.x, player.y), "aria-label": "你在这里" }, "你")),
        h("ul", { class: "game-map-list" },
          ...Object.entries(TOWN).map(([id]) => h("li", {}, h("button", { class: "game-choice", type: "button", onclick: () => travel(id) }, h("span", { class: "game-cursor", "aria-hidden": "true" }, "▶"), SCENES[id].place, h("small", {}, SCENES[id].purpose)))))),
    );
    mapPanel.hidden = false;
    mapPanel.querySelector(".game-map-list button")?.focus({ preventScroll: true });
  }
  function closeMap() {
    mapPanel.hidden = true;
  }
  function travel(id) {
    closeMap();
    walkTo(doorOf(id));
  }

  /* ----- navigation ----- */
  function goTown() {
    closeWindow();
    if (place) lastPlace = place;
    place = null;
    menu.hidden = true;
    if (lastPlace) Object.assign(player, { x: doorOf(lastPlace).x, y: doorOf(lastPlace).y + 10 });
    movedSinceSpawn = 0;
    target = null;
    nearDoor = null;
    prompt.hidden = true;
    drawTown();
    say([
      { text: "这里是我们的小镇。每栋房子都能帮你做一件事。", face: "happy" },
      {
        text: touch
          ? "用左下角的轮盘走路，走到门口会出现「进入」按钮。点右上角「地图」可以选地方，我会自己走过去。第一次来的话，推荐先去侦探事务所。"
          : "用 WASD 或方向键走路，右键点地面也能走过去；走到门口按 E 进去。按 M 打开地图选地方，我会自己走过去。第一次来的话，推荐先去侦探事务所。",
        face: "normal",
      },
    ]);
  }

  function enter(id) {
    closeWindow();
    target = null;
    keys.clear();
    place = id;
    menu.hidden = true;
    drawRoom(id);
    say([{ text: SCENES[id].line, face: "happy" }, { text: EXTRA_LINES[id], face: "thinking" }], () =>
      showMenu([
        ...ACTIONS[id].filter((action) => !action.when || action.when()).map((action) => ({ label: action.label, run: () => openWindow(id, action) })),
        { label: "回小镇地图", run: goTown },
      ]),
    );
  }

  function openWindow(id, action = ACTIONS[id][0]) {
    windowOpen = true; // before showTab, which reports back through onTab
    showTab(action.tab);
    windowTitle.textContent = `${SCENES[id].place} · ${action.label}`;
    gameWindow.hidden = false;
    menu.hidden = true;
    dialogue.hidden = true;
    if (action.open) document.querySelector(action.open).open = true;
    windowBody.scrollTop = 0;
    if (action.target) requestAnimationFrame(() => document.querySelector(action.target)?.scrollIntoView({ block: "start" }));
  }

  function closeWindow() {
    if (!windowOpen) return;
    gameWindow.hidden = true;
    windowOpen = false;
    if (place) enter(place);
  }

  /* ----- switching between game and page ----- */
  function sync() {
    const want = !isPro() && !webMode();
    if (want === enabled) return;
    enabled = want;
    root.dataset.game = want ? "on" : "off";
    if (want) {
      windowBody.append(main);
      shell.hidden = false;
      fit();
      goTown();
    } else {
      mainHome.parent.insertBefore(main, mainHome.next);
      shell.hidden = true;
      gameWindow.hidden = true;
      windowOpen = false;
    }
  }

  // Keyboard: Enter/Space continue the dialogue, Escape closes the window or leaves the building.
  document.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
  window.addEventListener("blur", () => keys.clear());
  document.addEventListener("keydown", (event) => {
    if (!enabled || event.target.closest?.("input,textarea,select,[contenteditable]")) return;
    const key = event.key.toLowerCase();
    if (KEY_DIRS[key] && !windowOpen && stage.dataset.view === "town") {
      event.preventDefault();
      if (!keys.has(key)) startWalking();
      keys.add(key);
      return;
    }
    if (key === "m" && !windowOpen) {
      event.preventDefault();
      if (mapPanel.hidden) openMap();
      else closeMap();
      return;
    }
    if (!mapPanel.hidden) {
      if (event.key === "Escape") closeMap();
      return;
    }
    if ((key === "e" || event.key === "Enter" || event.key === " ") && nearDoor && !windowOpen && stage.dataset.view === "town" && dialogue.hidden && !event.target.closest?.("button,a")) {
      event.preventDefault();
      enter(nearDoor);
      return;
    }
    if (event.key === "Escape") {
      if (windowOpen) closeWindow();
      else if (place) goTown();
    } else if ((event.key === "Enter" || event.key === " ") && !dialogue.hidden && !windowOpen && event.target === document.body) {
      event.preventDefault();
      dialogue.click();
    }
  });

  return {
    sync,
    /** The page switched tabs (e.g. a case started): show it in the game window. */
    onTab(tab) {
      if (!enabled || windowOpen) return;
      const id = Object.keys(SCENES).includes(tab) ? tab : "home";
      place = id;
      drawRoom(id);
      openWindow(id, ACTIONS[id].find((action) => action.tab === tab && !action.target) || { label: SCENES[id].purpose, tab });
    },
    leaveWebMode() {
      setWebMode(false);
      sync();
    },
    /** Pictures finished loading: draw the scene and the current line again with them. */
    redraw() {
      if (!enabled) return;
      if (windowOpen) return;
      if (place) drawRoom(place);
      else drawTown();
      if (!dialogue.hidden && lines.length) renderLine(lineIndex >= lines.length - 1 ? null : lineAfter);
    },
  };
}
