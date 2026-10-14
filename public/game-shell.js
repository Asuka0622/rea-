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
    h("button", { class: "btn small", type: "button", onclick: () => goTown() }, icon("compass", { size: 14 }), "小镇地图"),
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

  /* ----- scale: the 320x180 world is drawn at a whole-number size that fits the screen ----- */
  function fit() {
    const scale = Math.max(1, Math.floor(Math.min(window.innerWidth / 320, window.innerHeight / 180)));
    const fractional = Math.min(window.innerWidth / 320, window.innerHeight / 180);
    // Phones are narrower than 2x: fill the width instead (pixels then scale unevenly, which is fine there).
    const px = fractional < 2 ? fractional : scale;
    stage.style.setProperty("--px", String(px));
  }
  window.addEventListener("resize", fit);

  /* ----- drawing ----- */
  const has = (name) => art().pixel.has(name);
  const sprite = (name, x, extra = "") =>
    has(`sprite-${name}`)
      ? h("img", { class: `game-sprite ${extra}`, src: `/art/pixel/sprite-${name}.png`, alt: "", style: `--sx:${x}` })
      : h("span", { class: `game-sprite drawn ${name} ${extra}`, style: `--sx:${x}`, "aria-hidden": "true" }, h("i", {}), h("b", {}), h("u", {}));

  function drawTown() {
    const picture = has("town");
    stage.dataset.view = "town";
    stage.replaceChildren(
      picture ? h("img", { class: "game-bg", src: "/art/pixel/town.png", alt: "" }) : h("div", { class: "game-bg drawn town", "aria-hidden": "true" }, h("span", { class: "path h" }), h("span", { class: "path v" }), h("span", { class: "pond" }), h("span", { class: "river" })),
      ...Object.entries(TOWN).map(([id, spot]) => {
        const scene = SCENES[id];
        return h(
          "button",
          { class: `game-building ${picture ? "over-art" : spot.kind}`, type: "button", style: `--bx:${spot.x};--by:${spot.y};--bw:${spot.w};--bh:${spot.h}`, onclick: () => walkTo(doorOf(id), () => enter(id)), "aria-label": `进入${scene.place}（${scene.purpose}）` },
          !picture && h("span", { class: "roof", "aria-hidden": "true" }),
          !picture && h("span", { class: "wall", "aria-hidden": "true" }, h("span", { class: "door" })),
          h("span", { class: "game-label" }, scene.place, h("small", {}, scene.purpose)),
        );
      }),
      (playerEl = sprite("lumi", 0, "player")),
    );
    placePlayer();
  }

  function drawRoom(id) {
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
    if (x < 6 || x > 314 || y < 14 || y > 178) return true;
    return blocks().some((b) => x + 4 > b.x && x - 4 < b.x + b.w && y > b.y && y - 3 < b.y + b.h);
  }

  function placePlayer() {
    if (!playerEl) return;
    playerEl.style.left = `calc(${player.x.toFixed(2)}px * var(--px))`;
    playerEl.style.top = `calc(${player.y.toFixed(2)}px * var(--px))`;
    playerEl.classList.toggle("walking", player.walking);
    playerEl.classList.toggle("face-left", player.left);
  }

  function walkTo(point, then) {
    if (stage.dataset.view !== "town") return then?.();
    target = { x: point.x, y: point.y, then };
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
      if (!moved && target) target = { ...target, x: player.x, y: player.y }; // stuck: stop here, still arrive
      if (dx) player.left = dx < 0;
      movedSinceSpawn += Math.abs(dx * step) + Math.abs(dy * step);
      // Walking into a doorway goes inside.
      if (movedSinceSpawn > 6 && !target) {
        const door = Object.keys(TOWN).find((id) => Math.hypot(player.x - doorOf(id).x, player.y - doorOf(id).y) < 5);
        if (door) {
          player.walking = false;
          keys.clear();
          placePlayer();
          enter(door);
          return;
        }
      }
    }
    placePlayer();
  }
  requestAnimationFrame(tick);

  // Right-click on the map: walk there.
  stage.addEventListener("contextmenu", (event) => {
    if (!enabled || stage.dataset.view !== "town") return;
    event.preventDefault();
    const box = stage.getBoundingClientRect();
    const scale = box.width / 320;
    walkTo({ x: (event.clientX - box.left) / scale, y: (event.clientY - box.top) / scale });
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

  /* ----- navigation ----- */
  function goTown() {
    closeWindow();
    if (place) lastPlace = place;
    place = null;
    menu.hidden = true;
    if (lastPlace) Object.assign(player, { x: doorOf(lastPlace).x, y: doorOf(lastPlace).y + 10 });
    movedSinceSpawn = 0;
    target = null;
    drawTown();
    say([
      { text: "这里是我们的小镇。每栋房子都能帮你做一件事。", face: "happy" },
      {
        text: touch
          ? "用左下角的轮盘走路，走到门口就能进去；直接点房子也行。第一次来的话，推荐先去中间的侦探事务所。"
          : "用 WASD 或方向键走路，也可以用鼠标右键点地面走过去；走到门口就能进去，左键点房子也行。第一次来的话，推荐先去中间的侦探事务所。",
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
