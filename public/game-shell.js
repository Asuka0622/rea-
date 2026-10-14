import { SCENES } from "./scenes.js";

// 游戏外壳 (beginner mode): the workbench presented like an indie game. A full-screen town map is the
// home screen; clicking a building enters it, the guide talks in a dialogue box at the bottom, and
// choosing what to do opens an in-game window holding the existing page (cases, reports, tutorial…).
// Nothing is rewritten: the page's <main> is moved into the window and back again.
// Pictures are optional: public/art/pixel/town.png and room-<place>.png (320x180) replace the drawn
// stand-ins, sprite-<name>.png (16x32) stands in the scenes, portraits come from art/pixel/portraits.

const WEB_KEY = "rea-wb-web-mode";

/** Where each building sits on the 320x180 town map (left/top of its footprint, in map pixels). */
const TOWN = {
  home: { x: 132, y: 34, w: 58, kind: "office" },
  learn: { x: 30, y: 30, w: 52, kind: "library" },
  engines: { x: 236, y: 34, w: 50, kind: "workshop" },
  clients: { x: 44, y: 104, w: 48, kind: "post" },
  doctor: { x: 226, y: 104, w: 50, kind: "clinic" },
};

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
      picture ? h("img", { class: "game-bg", src: "/art/pixel/town.png", alt: "" }) : h("div", { class: "game-bg drawn town", "aria-hidden": "true" }, h("span", { class: "path h" }), h("span", { class: "path v" }), h("span", { class: "pond" })),
      ...Object.entries(TOWN).map(([id, spot]) => {
        const scene = SCENES[id];
        return h(
          "button",
          { class: `game-building ${picture ? "over-art" : spot.kind}`, type: "button", style: `--bx:${spot.x};--by:${spot.y};--bw:${spot.w}`, onclick: () => enter(id), "aria-label": `进入${scene.place}（${scene.purpose}）` },
          !picture && h("span", { class: "roof", "aria-hidden": "true" }),
          !picture && h("span", { class: "wall", "aria-hidden": "true" }, h("span", { class: "door" })),
          h("span", { class: "game-label" }, scene.place, h("small", {}, scene.purpose)),
        );
      }),
      sprite("lumi", 172, "town"),
    );
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
  const portrait = () => {
    const name = art().portraits.has("lumi-normal") ? "lumi-normal" : null;
    return name
      ? h("div", { class: "case-portrait", "aria-hidden": "true" }, h("img", { src: `/art/pixel/portraits/${name}.png`, alt: "", width: 80, height: 80 }))
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
    dialogue.hidden = false;
    dialogue.replaceChildren(
      portrait(),
      h("div", { class: "case-say-text" }, h("b", {}, "路米"), h("p", {}, lines[lineIndex]), !last && h("span", { class: "game-more" }, "点击继续")),
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

  /* ----- navigation ----- */
  function goTown() {
    closeWindow();
    place = null;
    menu.hidden = true;
    drawTown();
    say(["这里是我们的小镇。每栋房子都能帮你做一件事。", "点一栋房子走进去看看吧。第一次来的话，推荐先去中间的侦探事务所。"]);
  }

  function enter(id) {
    closeWindow();
    place = id;
    menu.hidden = true;
    drawRoom(id);
    say([SCENES[id].line, EXTRA_LINES[id]], () =>
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
  document.addEventListener("keydown", (event) => {
    if (!enabled || event.target.closest?.("input,textarea,select,[contenteditable]")) return;
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
