import { SCENES } from "./scenes.js";
import { DIFFICULTIES } from "./game-quests.js";

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
  learn: { x: 50, y: 22, w: 87, h: 69, door: { x: 93, y: 93 }, kind: "library" },
  home: { x: 270, y: 40, w: 88, h: 69, door: { x: 316, y: 111 }, kind: "office" },
  engines: { x: 428, y: 33, w: 66, h: 66, door: { x: 457, y: 101 }, kind: "workshop" },
  clients: { x: 138, y: 215, w: 75, h: 59, door: { x: 173, y: 276 }, kind: "post" },
  doctor: { x: 400, y: 210, w: 83, h: 63, door: { x: 438, y: 275 }, kind: "clinic" },
};
/** The case clients' homes (keyed by case id): walking to the door and pressing E takes the case. */
const CASE_HOUSES = {
  "privacy-ledger": { x: 128, y: 118, w: 82, h: 59, door: { x: 165, y: 179 } },
  "weather-keys": { x: 190, y: 28, w: 47, h: 56, door: { x: 222, y: 86 } },
  "calculator-eggs": { x: 550, y: 215, w: 60, h: 59, door: { x: 565, y: 276 } },
  "farm-save": { x: 553, y: 22, w: 60, h: 49, door: { x: 588, y: 73 } },
  "flashlight-apk": { x: 415, y: 132, w: 65, h: 49, door: { x: 450, y: 183 } },
  "real-stories": { x: 537, y: 130, w: 73, h: 53, door: { x: 573, y: 185 } },
};
/** Other things you cannot walk through: the fountain, the pond and stream, and the river except at the bridge. */
const OBSTACLES = [
  { x: 300, y: 150, w: 33, h: 30 },
  { x: 353, y: 94, w: 22, h: 18 },
  { x: 0, y: 150, w: 72, h: 55 },
  { x: 0, y: 205, w: 22, h: 100 },
  { x: 0, y: 305, w: 296, h: 55 },
  { x: 336, y: 305, w: 304, h: 55 },
];
const SPAWN = { x: 320, y: 250 };

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

export function createGameShell({ h, icon, showTab, isPro, setMode, art, cases = () => [], startCase = () => {}, quests = null }) {
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
    h("button", { class: "btn small", type: "button", onclick: () => setMode("pro") }, icon("wrench", { size: 14 }), "专业模式"),
    h("button", { class: "btn small", type: "button", onclick: () => { setWebMode(true); sync(); } }, icon("monitor", { size: 14 }), "网页模式"),
  );
  // The current quest, right of the menu bar; clicking it (or J) opens the quest log.
  const tracker = h("button", { class: "game-quest-tracker", type: "button", onclick: () => openLog() });
  if (quests) hud.append(tracker);
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
  const world = { w: 640, h: 360 };
  const camera = { x: 0, y: 0 };
  function fit() {
    // Cover the whole window: the 320x180 scene is scaled up until no border is left; what does not
    // fit is cropped at the edges, and on the map the camera keeps the player in view.
    roomPx = Math.max(window.innerWidth / 320, window.innerHeight / 180);
    // The town is scaled by its own size, so a bigger map shows more of the town instead of zooming in.
    townPx = Math.max(window.innerWidth / world.w, window.innerHeight / world.h);
    stage.style.setProperty("--px", String(roomPx));
    worldEl?.style.setProperty("--px", String(townPx));
    placePlayer();
  }
  window.addEventListener("resize", fit);
  const viewW = () => stage.clientWidth / townPx; // how much of the town (in map pixels) fits on screen
  const viewH = () => stage.clientHeight / townPx;
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
    spotCache = null;
    nearDoor = null; // the prompt is re-attached to the new world layer when needed
    const background = picture ? h("img", { class: "game-bg", src: "/art/pixel/town.png", alt: "" }) : null;
    if (background) {
      background.addEventListener("load", () => {
        world.w = background.naturalWidth;
        world.h = background.naturalHeight;
        worldEl.style.width = `calc(${world.w}px * var(--px))`;
        worldEl.style.height = `calc(${world.h}px * var(--px))`;
        fit();
      });
    }
    worldEl = h("div", { class: "game-world", style: `--px:${townPx};width:calc(${world.w}px * var(--px));height:calc(${world.h}px * var(--px))` });
    stage.replaceChildren(worldEl);
    worldEl.append(
      background || h("div", { class: "game-bg drawn town", "aria-hidden": "true" }, h("span", { class: "path h" }), h("span", { class: "path v" }), h("span", { class: "pond" }), h("span", { class: "river" })),
      ...Object.entries(spots()).map(([id, spot]) => {
        const scene = info(id);
        const objective = quests?.current()?.spot === id;
        return h(
          "button",
          { class: `game-building ${picture ? "over-art" : spot.kind || "office"} ${TOWN[id] ? "" : "case-home"} ${objective ? "objective" : ""}`, type: "button", style: `--bx:${spot.x};--by:${spot.y};--bw:${spot.w};--bh:${spot.h}`, onclick: () => walkTo(doorOf(id)), "aria-label": `走到${scene.place}（${scene.purpose}）${objective ? "，当前任务目标" : ""}` },
          !picture && h("span", { class: "roof", "aria-hidden": "true" }),
          !picture && h("span", { class: "wall", "aria-hidden": "true" }, h("span", { class: "door" })),
          h("span", { class: "game-label" }, objective && h("span", { class: "game-objective", "aria-hidden": "true" }, "!"), scene.place, h("small", {}, scene.purpose)),
        );
      }),
      ...[], // fronts are added by addFronts() below
      (playerEl = has("anim-lumi") ? h("span", { class: "game-sprite player sheet", style: "background-image:url(/art/pixel/anim-lumi.png)", "aria-hidden": "true" }) : sprite("lumi", 0, "player")),
    );
    placePlayer();
    addFronts();
  }

  function drawRoom(id) {
    worldEl = null;
    const scene = SCENES[id];
    const picture = has(`room-${id}`);
    stage.dataset.view = id;
    stage.replaceChildren(
      h("div", { class: "game-room" },
        picture ? h("img", { class: "game-bg", src: `/art/pixel/room-${id}.png`, alt: "" }) : h("div", { class: `game-bg drawn room ${id}`, "aria-hidden": "true" }, h("span", { class: "window" }), h("span", { class: "shelf" }), h("span", { class: "desk" })),
        sprite("lumi", 110, "indoor")),
      h("div", { class: "game-place-sign" }, icon(scene.icon, { size: 16 }), scene.place),
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
  const player = { x: SPAWN.x, y: SPAWN.y, left: false, walking: false };
  let playerEl = null;
  let target = null; // { x, y, then }
  let lastPlace = null;
  let movedSinceSpawn = 0;
  const keys = new Set();
  const stick = { x: 0, y: 0 };
  const KEY_DIRS = { w: [0, -1], arrowup: [0, -1], s: [0, 1], arrowdown: [0, 1], a: [-1, 0], arrowleft: [-1, 0], d: [1, 0], arrowright: [1, 0] };

  /** Case homes whose case exists in the library. */
  const caseHouses = () => Object.fromEntries(Object.entries(CASE_HOUSES).filter(([id]) => cases().some((c) => c.id === id)));
  // Built once per drawing of the town: collision checks run thousands of times per path search.
  let spotCache = null;
  const spots = () => (spotCache ||= { ...TOWN, ...caseHouses() });
  /** Name and purpose shown on a spot's sign. */
  function info(id) {
    if (SCENES[id] && TOWN[id]) return { place: SCENES[id].place, purpose: SCENES[id].purpose };
    const item = cases().find((c) => c.id === id);
    return { place: item?.scene?.place || item?.title || id, purpose: item?.type === "stories" ? "真实世界故事" : `委托 · 案例 ${item?.order ?? ""}` };
  }
  const doorOf = (id) => (TOWN[id] || CASE_HOUSES[id]).door;
  const blocks = () => [
    ...Object.values(spots()).map((b) => {
      const roof = Math.round(b.h * 0.45); // the top of the picture is roof: you can stand behind it
      return { x: b.x, y: b.y + roof, w: b.w, h: b.h - roof - 2 };
    }),
    ...OBSTACLES,
  ];
  /* Walkability map built from the town picture (scripts/build-walkmap.py): trees, walls, fences,
     benches, lamps and water are blocked; paths, grass and paving are open. */
  let walkMap = null;
  fetch("/art/pixel/town-walk.json", { cache: "no-cache" })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      walkMap = data;
      addFronts();
    })
    .catch(() => {});
  /* Depth: every tree and house has its own pixels on town-front.png and a base line. Each is drawn as
     a layer whose stacking order is its base; the player's order is the y of its feet. So the player
     is hidden behind a canopy or roof when standing above its base, and in front of it otherwise. */
  function addFronts() {
    if (!worldEl || !walkMap?.fronts || !has("town") || !has("town-front")) return;
    worldEl.querySelectorAll(".game-front").forEach((el) => el.remove());
    for (const f of walkMap.fronts) {
      worldEl.append(
        h("span", {
          class: "game-front",
          "aria-hidden": "true",
          style: [
            `left:calc(${f.x}px * var(--px))`, `top:calc(${f.y}px * var(--px))`,
            `width:calc(${f.w}px * var(--px))`, `height:calc(${f.h}px * var(--px))`,
            `background-size:calc(${world.w}px * var(--px)) calc(${world.h}px * var(--px))`,
            `background-position:calc(${-f.x}px * var(--px)) calc(${-f.y}px * var(--px))`,
            `z-index:${f.base}`,
          ].join(";"),
        }),
      );
    }
  }
  const openGround = (x, y) => {
    if (!walkMap || !has("town")) return true;
    const row = walkMap.rows[Math.floor(y / walkMap.cell)];
    return row ? row[Math.floor(x / walkMap.cell)] === "1" : false;
  };
  const nearDoorway = (x, y) => Object.values(spots()).some((b) => Math.abs(x - b.door.x) < 7 && y >= b.door.y - 4 && y - b.door.y < 9);
  /** The feet (an 8x3 box at the bottom of the sprite) would hit something, or leave the map. */
  function blocked(x, y) {
    if (x < 6 || x > world.w - 6 || y < 14 || y > world.h - 2) return true;
    if (nearDoorway(x, y)) return false;
    if (blocks().some((b) => x + 4 > b.x && x - 4 < b.x + b.w && y > b.y && y - 3 < b.y + b.h)) return true;
    return [[-4, 0], [4, 0], [-4, -3], [4, -3], [0, -1]].some(([dx, dy]) => !openGround(x + dx, y + dy));
  }

  /* Sprite-sheet animation (anim-<name>.png + .json): idle frames while standing, walk frames while moving. */
  // The sheet is drawn at any resolution; on the map one frame is always 16x32 map pixels.
  let animation = { frame: [16, 32], sheet: [4, 2], side: "right", animations: { idle: { row: 0, frames: 2, ms: [2200, 160] }, walk: { row: 1, frames: 4, ms: 140 } } };
  fetch("/art/pixel/anim-lumi.json", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null)).then((data) => data && (animation = data)).catch(() => {});
  let animClock = 0;
  let facing = "down"; // down | up | side
  let lastClip = "";
  function animate(dt, dx, dy) {
    if (!playerEl?.classList.contains("sheet")) return;
    const clips = animation.animations;
    if (player.walking) facing = Math.abs(dy) > Math.abs(dx) ? (dy < 0 ? "up" : "down") : "side";
    // Older sheets have one "walk" row; newer ones have a row per direction.
    const name = !player.walking ? "idle" : clips[`walk-${facing}`] ? `walk-${facing}` : "walk";
    const clip = clips[name] || clips.idle;
    if (name !== lastClip) {
      animClock = 0;
      lastClip = name;
    }
    const durations = Array.isArray(clip.ms) ? clip.ms : Array(clip.frames).fill(clip.ms);
    const total = durations.reduce((a, b) => a + b, 0);
    animClock = (animClock + dt * 1000) % total;
    let t = animClock;
    let index = 0;
    while (t >= durations[index] && index < clip.frames - 1) t -= durations[index++];
    const [cols, rows] = animation.sheet || [4, 2];
    playerEl.style.backgroundSize = `calc(${cols * 16}px * var(--px)) calc(${rows * 32}px * var(--px))`;
    playerEl.style.backgroundPosition = `calc(${-index * 16}px * var(--px)) calc(${-clip.row * 32}px * var(--px))`;
    // Mirror the side view when walking the other way; front and back views are never mirrored.
    const sideFacesLeft = animation.side === "left";
    playerEl.classList.toggle("face-left", name.includes("side") ? player.left !== sideFacesLeft : name === "walk" && player.left);
    playerEl.classList.toggle("smooth", Boolean(animation.smooth));
  }

  function placePlayer() {
    if (!playerEl) return;
    playerEl.style.left = `calc(${player.x.toFixed(2)}px * var(--px))`;
    playerEl.style.top = `calc(${player.y.toFixed(2)}px * var(--px))`;
    playerEl.classList.toggle("walking", player.walking);
    playerEl.classList.toggle("face-left", player.left);
    playerEl.style.zIndex = String(Math.round(player.y));
    followCamera();
  }

  /* Path finding: A* over a 4-pixel grid of the town, then straightened so the walk looks natural. */
  const CELL = 4;
  // Paths keep a pixel of clearance, so rounding never leaves the player stuck on an obstacle's edge.
  const free = (x, y) => !blocked(x, y) && !blocked(x - 1, y) && !blocked(x + 1, y) && !blocked(x, y - 1) && !blocked(x, y + 1);
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

  // Development aid: open the page with ?debug to drive and inspect the player from the console.
  if (new URLSearchParams(location.search).has("debug")) window.__game = { walkTo: (x, y) => walkTo({ x, y }), findPath: (a, b) => findPath(a, b), blocked: (x, y) => blocked(x, y), player };
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
      else if (dx && !dy) {
        // Brushing a corner while walking sideways: slip up or down around it.
        for (const nudge of [1, -1, 2, -2, 3, -3]) {
          if (!blocked(nx, player.y + nudge)) {
            [player.x, player.y, moved] = [nx, player.y + nudge * Math.min(1, step), true];
            break;
          }
        }
      }
      if (!blocked(player.x, ny)) [player.y, moved] = [ny, true];
      else if (dy && !dx) {
        for (const nudge of [1, -1, 2, -2, 3, -3]) {
          if (!blocked(player.x + nudge, ny)) {
            [player.x, player.y, moved] = [player.x + nudge * Math.min(1, step), ny, true];
            break;
          }
        }
      }
      // Squeezing diagonally through a gap: neither axis alone is free, but the diagonal step is.
      if (!moved && !blocked(nx, ny)) [player.x, player.y, moved] = [nx, ny, true];
      if (!moved && target) target = { ...target, x: player.x, y: player.y, rest: [] }; // stuck: stop here, still arrive
      if (dx) player.left = dx < 0;
      movedSinceSpawn += Math.abs(dx * step) + Math.abs(dy * step);
    }
    placePlayer();
    animate(dt, dx, dy);
    showDoorPrompt();
  }

  /* At a doorway, a prompt appears; E / Enter / Space (or tapping it) goes inside. */
  let nearDoor = null;
  const prompt = h("button", { class: "game-interact", type: "button", onclick: () => nearDoor && enterSpot(nearDoor) });
  prompt.hidden = true;
  function showDoorPrompt() {
    const id = Object.keys(spots()).find((key) => Math.abs(player.x - doorOf(key).x) < 9 && player.y >= doorOf(key).y - 3 && player.y - doorOf(key).y < 12) || null;
    if (id === nearDoor) {
      if (id) positionPrompt();
      return;
    }
    nearDoor = id;
    prompt.hidden = !id;
    if (!id) return;
    prompt.replaceChildren(h("kbd", {}, touch ? "点这里" : "E"), TOWN[id] ? `进入 · ${info(id).place}` : `接委托 · ${info(id).place}`);
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
          ...Object.entries(spots()).map(([id, spot]) => h("button", { class: `game-map-pin ${TOWN[id] ? "" : "case"} ${quests?.current()?.spot === id ? "objective" : ""}`, type: "button", style: mark(spot.door.x, spot.door.y), onclick: () => travel(id), title: info(id).place }, TOWN[id] ? "▼" : "!")),
          h("span", { class: "game-map-you", style: mark(player.x, player.y), "aria-label": "你在这里" }, "你")),
        h("div", { class: "game-map-list" },
          h("b", {}, "小镇设施"),
          h("ul", {}, ...Object.keys(TOWN).map((id) => listItem(id))),
          Object.keys(caseHouses()).length > 0 && h("b", {}, "委托人的家"),
          h("ul", {}, ...Object.keys(caseHouses()).map((id) => listItem(id))))),
    );
    mapPanel.hidden = false;
    mapPanel.querySelector(".game-map-list button")?.focus({ preventScroll: true });
  }
  function listItem(id) {
    return h("li", {}, h("button", { class: "game-choice", type: "button", onclick: () => travel(id) }, h("span", { class: "game-cursor", "aria-hidden": "true" }, "▶"), info(id).place, h("small", {}, info(id).purpose)));
  }
  function closeMap() {
    mapPanel.hidden = true;
  }
  function travel(id) {
    closeMap();
    walkTo(doorOf(id));
  }

  /* ----- quests: difficulty, the quest log, and the guide's story lines ----- */
  let questLines = []; // waiting to be said the next time the player is free (not in a window)
  const takeQuestLines = () => questLines.splice(0);
  function renderTracker() {
    if (!quests) return;
    const step = quests.current();
    tracker.replaceChildren(icon("learn", { size: 14 }), h("span", {}, step ? step.goal : "支线完成！"));
    tracker.title = step ? `${step.chapter.title}：${step.goal}（J 打开任务日志）` : "侦探事务所支线已完成（J 打开任务日志）";
  }
  quests?.onChange(({ finishedChapter, next }) => {
    questLines.push(...(finishedChapter?.done || []));
    if (next && next.chapter !== finishedChapter && next.say) questLines.push(...next.say);
    renderTracker();
    if (enabled && !windowOpen && stage.dataset.view === "town") {
      drawTown();
      say(takeQuestLines());
    }
  });

  const overlay = h("div", { class: "game-panel", role: "dialog", "aria-modal": "true" });
  overlay.hidden = true;
  shell.append(overlay);
  const closeOverlay = () => {
    overlay.hidden = true;
  };

  /** Pick a difficulty; the first time, the story starts afterwards. */
  function chooseDifficulty(first = false) {
    overlay.replaceChildren(
      h("div", { class: "game-panel-head" }, h("h2", {}, first ? "选择难度" : "更换难度"), !first && h("button", { class: "btn small", type: "button", onclick: closeOverlay }, icon("close", { size: 14 }), "关闭")),
      h("p", { class: "game-panel-note" }, first ? "随时可以在任务日志里更换。不确定的话，选「轻松」或「标准」。" : "更换难度不会影响已经完成的进度。"),
      h("div", { class: "game-difficulties" },
        ...Object.entries(DIFFICULTIES).map(([id, d]) =>
          h("button", { class: `game-difficulty ${quests.difficulty === id ? "chosen" : ""}`, type: "button", onclick: () => {
            quests.setDifficulty(id);
            closeOverlay();
            if (first) {
              shownControls = false;
              goTown();
            }
            else renderLog();
          } }, h("b", {}, d.label), h("small", {}, d.note)))),
    );
    overlay.hidden = false;
    overlay.querySelector(".game-difficulty")?.focus({ preventScroll: true });
  }

  function renderLog() {
    const step = quests.current();
    overlay.replaceChildren(
      h("div", { class: "game-panel-head" }, h("h2", {}, quests.quest.title), h("button", { class: "btn small", type: "button", onclick: closeOverlay }, icon("close", { size: 14 }), "关闭（J）")),
      h("p", { class: "game-panel-note" }, quests.quest.subtitle, " · 难度：", h("b", {}, DIFFICULTIES[quests.difficulty]?.label || "未选"), " ", h("button", { class: "link-btn", type: "button", onclick: () => chooseDifficulty(false) }, "更换")),
      step && h("div", { class: "game-log-now" }, h("small", {}, "当前任务"), h("b", {}, step.goal), h("span", {}, step.chapter.title)),
      h("ol", { class: "game-log" },
        ...quests.quest.chapters.map((chapter) => {
          const done = quests.chapterDone(chapter);
          const now = step?.chapter === chapter;
          return h("li", { class: done ? "done" : now ? "now" : "" }, h("span", { class: "game-log-mark", "aria-hidden": "true" }, done ? "✓" : now ? "▶" : "·"), chapter.title);
        })),
      quests.badges().includes("rea-detective") && h("p", { class: "game-badge" }, "🏅 已获得徽章：见习侦探"),
      h("div", { class: "game-panel-foot" }, h("button", { class: "btn small", type: "button", onclick: () => {
        if (!window.confirm("要从头开始这条支线吗？已完成的案子成绩会保留。")) return;
        quests.reset();
        closeOverlay();
        goTown();
      } }, "从头开始这条支线")),
    );
  }
  function openLog() {
    if (!quests || windowOpen) return;
    if (!overlay.hidden) return closeOverlay();
    renderLog();
    overlay.hidden = false;
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
    renderTracker();
    const controls = {
      text: touch
        ? "用左下角的轮盘走路，走到门口会出现「进入」按钮。点上面的「地图」可以选地方，我会自己走过去；当前任务显示在右上角，头上有「!」的房子就是目标。"
        : "用 WASD 或方向键走路，右键点地面也能走过去；走到门口按 E 进去。M 打开地图，J 打开任务日志；头上有「!」的房子就是当前目标。",
      face: "normal",
    };
    const pending = takeQuestLines();
    const step = quests?.current();
    if (pending.length) say(pending);
    else if (!shownControls) {
      shownControls = true;
      say([...(step?.say || [{ text: "这里是我们的小镇。每栋房子都能帮你做一件事。", face: "happy" }]), controls]);
    } else if (step) say([{ text: `接下来：${step.goal}。`, face: "normal" }]);
    else dialogue.hidden = true;
  }
  let shownControls = false;

  function enterSpot(id) {
    if (TOWN[id]) return enter(id);
    // A client's home: the case opens in the game window; closing it returns to this door.
    closeWindow();
    target = null;
    keys.clear();
    place = null;
    lastPlace = id;
    menu.hidden = true;
    dialogue.hidden = true;
    windowOpen = true;
    showTab("home");
    windowTitle.textContent = `${info(id).place} · ${cases().find((c) => c.id === id)?.title || "委托"}`;
    gameWindow.hidden = false;
    windowBody.scrollTop = 0;
    startCase(id);
    // When the analysis finishes, the client's conversation appears: bring it into view.
    const quest = document.querySelector("#case-quest");
    const stories = document.querySelector("#case-stories");
    const started = Date.now();
    const watch = setInterval(() => {
      const shown = [quest, stories].find((el) => el && !el.hidden);
      if (shown || !windowOpen || Date.now() - started > 120000) {
        clearInterval(watch);
        shown?.scrollIntoView({ block: "start" });
      }
    }, 300);
  }

  function enter(id) {
    closeWindow();
    target = null;
    keys.clear();
    place = id;
    menu.hidden = true;
    drawRoom(id);
    quests?.event("enter", id);
    const story = takeQuestLines();
    say([...story, { text: SCENES[id].line, face: "happy" }, { text: EXTRA_LINES[id], face: "thinking" }], () =>
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
    else if (stage.dataset.view !== "town" || lastPlace) goTown();
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
      if (quests && !quests.difficulty) chooseDifficulty(true);
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
    if (!overlay.hidden) {
      if (event.key === "Escape" || (key === "j" && overlay.querySelector(".game-log"))) closeOverlay();
      return;
    }
    if (key === "j" && !windowOpen && quests) {
      event.preventDefault();
      openLog();
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
      enterSpot(nearDoor);
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
