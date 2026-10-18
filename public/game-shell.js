import { mountTransfer } from "./transfer-practice.js";
import { SCENES } from "./scenes.js";
import { DIFFICULTIES, FOCUSES } from "./game-quests.js";
import { REGIONS, REGION_SIZE, regionOf } from "./game-regions.js";
import { createMinigame } from "./game-minigames.js";
import { createWaterLayer } from "./game-water.js";
import { SKILL_TREE, skillsFrom } from "./game-skills.js";
import { ACHIEVEMENTS, createAchievements } from "./game-achievements.js";
import { renderSkillTree } from "./game-skilltree.js";
import { caseFor } from "./game-drills.js";
import { mountLab } from "./case-labs.js";
import { createSound } from "./game-sound.js";
import { createDirector } from "./game-director.js";
import { createCaseSession } from "./case-session.js";
import { unlockedTools, progressFromStars } from "./case-tension.js";
import { PROLOGUE_QUESTS, KNOWLEDGE_POINTS, takeKind, onBoard } from "./prologue-quests.js";
import { loadProgress, saveProgress, readNotices, markCompleted, markDiscovered, markAccepted, playerFor } from "./quest-progress.js";
import { boardLines, questState } from "./quest-board.js";
import { BASE_SPEED, sprintSpeed } from "./world-scale.js";
import { eggsInRegion, loadFound, saveFound, collect as collectEgg } from "./easter-eggs.js";
import { npcsInRegion, loadTalked, saveTalked, markTalked } from "./npc-chatter.js";
import { sceneryInRegion, promptFor } from "./scenery.js";

/** 已结案的星级表 → 已解锁的侦探工具（张力层的成长）。 */
const CASE_STARS_KEY = "rea-workbench-case-stars";
function detectiveTools() {
  try {
    return unlockedTools(progressFromStars(JSON.parse(localStorage.getItem(CASE_STARS_KEY) || "{}") || {}));
  } catch {
    return [];
  }
}

/** Who can speak in the dialogue box: a line's `who` (default 路米) picks the name and portrait set. */
const SPEAKERS = {
  lumi: "路米",
  smith: "铁叔",
  librarian: "书奶奶",
  postman: "阿信",
  doctor: "白医生",
  carpenter: "阿木",
  archivist: "老秦",
  bibi: "比比",
  xingbo: "星博士",
  ayan: "阿砚",
  liuniangzi: "柳娘子",
  hangonglian: "韩公廉",
  susong: "苏颂",
  xiaoke: "小克",
  ada: "爱达",
  babbage: "巴贝奇",
  duoduo: "朵朵",
  "wang-nainai": "王奶奶",
  "lao-qin": "老秦",
  xiaoyu: "小雨",
  baker: "阿桃",
  barista: "小鹿",
  "disk-vendor": "阿飞",
  parcel: "大壮",
  student: "小满",
  watchmaker: "老魏",
};

/** The time machine's dial (docs/concept.md): the eras in story order, and the map each one opens on. */
const ERAS = [
  { id: "china", title: "古代中国", place: "汴京", year: "约 1088 年", region: "era-china" },
  { id: "medieval", title: "中世纪欧洲", place: "城堡与修道院", year: "约 13 世纪" },
  { id: "industrial", title: "工业革命", place: "英国的工厂", year: "19 世纪" },
  { id: "forties", title: "1940 年代", place: "破译小组", year: "1940 年代" },
  { id: "internet", title: "连接世界", place: "大学机房", year: "1960–90 年代" },
  { id: "modern", title: "现代都市", place: "AI 研究所", year: "现在" },
];

/** 正式版的六站（docs/concept.md 第 4 节）：序章之后，从 1843 年的伦敦一路走回今天。 */
const PART_ONE = [
  { title: "1843 · 伦敦", note: "巴贝奇与爱达 · 程序是一步步的指令" },
  { title: "1950 · 曼彻斯特", note: "图灵 · 机器能思考吗" },
  { title: "1970 · 斯坦福", note: "专家系统 · 规则就是知识" },
  { title: "1997 · 纽约", note: "深蓝 · 算得多不等于想得懂" },
  { title: "2012–16 · 多伦多与首尔", note: "神经网络 · 从数据里学" },
  { title: "2017–今 · 现在", note: "生成式 AI · 回到 12:00" },
];

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

export function createGameShell({ h, icon, showTab, isPro, setMode, art, cases = () => [], startCase = () => {}, quests = null, demo = null }) {
  // 预告测试版: only demo.cases can be taken; the other clients' homes say they open in the full game.
  const inDemo = (id) => !demo || demo.cases.includes(id);
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
  const sound = createSound();
  const soundButton = h("button", { class: "btn small game-sound-toggle", type: "button", onclick: () => {
    const on = sound.toggle();
    paintSound(on);
    achievements.note({ type: "sound", on });
  } });
  const paintSound = (on) => {
    soundButton.textContent = on ? "♪" : "♪̸";
    soundButton.title = on ? "音效：开（点一下关闭）" : "音效：关（点一下打开）";
    soundButton.setAttribute("aria-label", soundButton.title);
    soundButton.setAttribute("aria-pressed", String(on));
  };
  paintSound(sound.on);
  const achievements = createAchievements({
    onUnlock: (a) => {
      toast(`成就解锁：${a.title}`, a.note, "trophy");
      sound.unlock();
    },
  });
  const skillCount = () => SKILL_TREE.flatMap((branch) => branch.skills).filter((skill) => skill.from && quests?.stepDone(skill.from)).length;
  // Old saves: grant what was already done, quietly.
  if (quests) {
    for (const line of quests.lines) {
      for (const chapter of line.chapters) {
        for (const step of chapter.steps) if (quests.isDone(line.id, step.id)) achievements.note({ type: "step", id: step.id }, { quiet: true });
        if (chapter.steps.length && quests.chapterDone(line, chapter)) achievements.note({ type: "chapter", id: chapter.id }, { quiet: true });
      }
    }
    achievements.note({ type: "skills", count: skillCount() }, { quiet: true });
  }
  if (quests) hud.append(h("button", { class: "btn small", type: "button", onclick: () => openSkills() }, icon("learn", { size: 14 }), "技能·成就（K）"));
  // 复勘 (docs/progression.md): the same knowledge points again, one step harder, from the toolbar.
  if (quests) hud.append(h("button", { class: "btn small", type: "button", onclick: () => openSkills("drills") }, icon("scan", { size: 14 }), "复勘（R）"));
  hud.append(soundButton);
  if (demo) hud.append(h("span", { class: "game-demo-tag", title: "预告测试版：侦探事务所和三份委托，约 30 分钟" }, "预告测试版"));
  const watchButton = h("button", { class: "btn small game-watch", type: "button", onclick: () => travelHome(), title: "按一下怀表，回比特镇的钟楼" }, "⌚ 回比特镇");
  watchButton.hidden = true;
  hud.append(watchButton);
  // The town clock (docs/story.md 第 8 节): stopped, drifting or running with the main story.
  const clockFace = h("span", { class: "game-clock-face", "aria-hidden": "true" }, h("i", { class: "hour" }), h("i", { class: "minute" }));
  const clockText = h("span", { class: "game-clock-text" });
  const clockEl = h("div", { class: "game-clock", role: "timer" }, clockFace, clockText);
  hud.append(clockEl);
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
  const fade = h("div", { class: "game-fade", "aria-hidden": "true" });
  // A puzzle case's full-screen views (notebook, laptop, confrontation): case-session.js fills it.
  const caseLayer = h("div", { class: "case-layer" });
  caseLayer.hidden = true;
  const shell = h("div", { class: "game-shell", hidden: true }, stage, fade, hud, gameWindow, caseLayer, menu, dialogue, rotate);
  shell.hidden = true;
  document.body.append(shell);

  /** Arriving somewhere (a room, the town, another region): the picture fades in from black. */
  function arrive() {
    fade.style.transition = "none";
    fade.style.opacity = "1";
    void fade.offsetWidth;
    fade.style.transition = "";
    fade.style.opacity = "0";
  }

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
    // A room is shown whole (the 320x180 picture fits the window; the rest is a dark border), so the
    // player can walk anywhere in it. On the map the camera keeps the player in view instead.
    roomPx = Math.min(window.innerWidth / 320, window.innerHeight / 180);
    // The town is scaled by its own size, so a bigger map shows more of the town instead of zooming in.
    // Region maps (960x540) keep the old town's density: about 640x360 of the map on screen, the camera following.
    const view = regional() ? { w: 640, h: 360 } : world;
    townPx = Math.max(window.innerWidth / view.w, window.innerHeight / view.h);
    stage.style.setProperty("--px", String(roomPx));
    stage.style.setProperty("--game-toolbar-height", `${Math.ceil(hud.getBoundingClientRect().height)}px`);
    worldEl?.style.setProperty("--px", String(townPx));
    placePlayer();
  }
  window.addEventListener("resize", fit);
  const viewW = () => stage.clientWidth / townPx; // how much of the town (in map pixels) fits on screen
  const viewH = () => stage.clientHeight / townPx;
  let worldEl = null;
  let cameraFocus = null; // a point a cutscene looks at instead of the player
  function followCamera() {
    if (!worldEl) return;
    const at = cameraFocus || player;
    camera.x = Math.max(0, Math.min(world.w - viewW(), at.x - viewW() / 2));
    camera.y = Math.max(0, Math.min(world.h - viewH(), at.y - 16 - viewH() / 2));
    worldEl.style.translate = `${(-camera.x * townPx).toFixed(1)}px ${(-camera.y * townPx).toFixed(1)}px`;
  }

  /* ----- drawing ----- */
  const has = (name) => art().pixel.has(name);
  // The town is five region maps (game-regions.js) once their pictures exist; before that, one town.png.
  const regional = () => has("regions/town-center");
  let region = "center";
  let regionStarted = false;
  const regionData = () => REGIONS[region];
  const townImage = () => (regional() ? REGIONS[region].image || `regions/town-${region}` : "town");
  const sprite = (name, x, extra = "") =>
    has(`sprite-${name}`)
      ? h("img", { class: `game-sprite ${extra}`, src: `/art/pixel/sprite-${name}.png`, alt: "", style: `--sx:${x}` })
      : h("span", { class: `game-sprite drawn ${name} ${extra}`, style: `--sx:${x}`, "aria-hidden": "true" }, h("i", {}), h("b", {}), h("u", {}));

  function drawTown() {
    if (regional()) {
      if (!regionStarted) {
        regionStarted = true;
        if (!lastPlace) Object.assign(player, regionData().spawn);
      }
      Object.assign(world, REGION_SIZE);
    }
    loadWalkMap();
    const picture = has(townImage());
    stage.dataset.view = "town";
    roomEl = null;
    room = null;
    spotCache = null;
    nearDoor = null; // the prompt is re-attached to the new world layer when needed
    const background = picture ? h("img", { class: "game-bg", src: `/art/pixel/${townImage()}.png`, alt: "" }) : null;
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
    if (regional()) stage.append(h("div", { class: "game-place-sign" }, icon("compass", { size: 16 }), regionData().name));
    watchButton.hidden = !(regional() && regionData().era);
    fit();
    worldEl.append(
      background || h("div", { class: "game-bg drawn town", "aria-hidden": "true" }, h("span", { class: "path h" }), h("span", { class: "path v" }), h("span", { class: "pond" }), h("span", { class: "river" })),
      ...waterFor(picture),
      ...Object.entries(spots()).map(([id, spot]) => {
        const scene = info(id);
        const objective = quests?.current()?.spot === id;
        return h(
          "button",
          { class: `game-building ${picture && !spot.placeholder ? "over-art" : spot.kind || "office"} ${ACTIONS[id] ? "" : "case-home"} ${objective ? "objective" : ""} ${spot.kind === "tower" && quests?.stepDone("open-door") ? "door-open" : ""}`, type: "button", style: `--bx:${spot.x};--by:${spot.y};--bw:${spot.w};--bh:${spot.h}${spot.placeholder ? `;z-index:${spot.y + spot.h}` : ""}`, onclick: () => walkTo(doorOf(id)), "aria-label": `走到${scene.place}（${scene.purpose}）${objective ? "，当前任务目标" : ""}` },
          (!picture || spot.placeholder) && h("span", { class: "roof", "aria-hidden": "true" }),
          (!picture || spot.placeholder) && h("span", { class: "wall", "aria-hidden": "true" },
            spot.kind === "tower" && h("span", { class: "clockface", "data-state": quests?.clockState() || "running" }),
            spot.kind === "tower" && h("span", { class: "tower-lamps" }, ...Array.from({ length: 8 }, () => h("i", { class: quests?.stepDone("open-door") ? "lit" : "" }))),
            h("span", { class: "door" })),
          h("span", { class: "game-label" }, objective && h("span", { class: "game-objective", "aria-hidden": "true" }, "!"), scene.place, h("small", {}, scene.purpose)),
        );
      }),
      ...exitSigns(),
      ...eggEls(),
      ...npcEls(),
      ...sceneryEls(),
      // fronts are added by addFronts() below
      (playerEl = has("anim-lumi") ? h("span", { class: "game-sprite player sheet", style: `background-image:url(/art/pixel/${has("anim-lumi-unified") ? "anim-lumi-unified" : "anim-lumi"}.png)`, "aria-hidden": "true" }) : sprite("lumi", 0, "player")),
    );
    placePlayer();
    addFronts();
    scatterLeaves();
  }

  /* 彩蛋：地图角落里的小东西，走过去就捡到（easter-eggs.js 里的数据）。 */
  function currentRegionName() {
    return regional() ? region : "center";
  }
  function eggEls() {
    const found = loadFound();
    return eggsInRegion(currentRegionName())
      .filter((egg) => !found.includes(egg.id))
      .map((egg) =>
        h("span", {
          class: "game-egg",
          "data-egg": egg.id,
          "aria-hidden": "true",
          style: `left:calc(${egg.x}px * var(--px));top:calc(${egg.y}px * var(--px));position:absolute;font-size:calc(9px * var(--px));line-height:1;color:#ffe9a8;text-shadow:0 0 calc(3px * var(--px)) #ffd166;pointer-events:none;z-index:5;`,
        }, "✦"),
      );
  }
  /** 走到彩蛋上就自动捡起来：一句台词 + 一个已捡记录，捡过的不再出现。 */
  function collectNearEggs() {    const found = loadFound();
    for (const egg of eggsInRegion(currentRegionName())) {
      if (found.includes(egg.id)) continue;
      if (Math.hypot(player.x - egg.x, player.y - egg.y) > 9) continue;
      saveFound(collectEgg(found, egg.id));
      achievements.note({ type: "eggs", count: loadFound().length });
      worldEl?.querySelector(`[data-egg="${CSS.escape(egg.id)}"]`)?.remove();
      toast(`彩蛋 · ${egg.title}`);
      void say([{ text: egg.text, face: "happy" }]);
      return;
    }
  }

  /* 会说话的 NPC：走近就搭话（npc-chatter.js）。
     12 位常驻的小人图已经交付（public/art/pixel/sprite-<id>.png，6 列 × 5 行：
     待机2 / 下走6 / 上走6 / 侧走6 / 说话2），交付源帧是 96×192，显示时缩成 16×32 逻辑像素。
     没有图的（委托人里的老秦）还是圆点，等图补齐再换。 */
  let nearNpcId = null;
  // 当前这区域里的活人：换图时重新登记，元素随 DOM 一起丢掉。
  const npcSprites = [];
  const npcSpriteEl = (npc) => {
    if (!has(`sprite-${npc.id}`)) {
      return h("i", { style: `display:block;width:calc(6px * var(--px));height:calc(6px * var(--px));margin:0 auto;border-radius:50%;background:${npc.look};box-shadow:0 0 calc(2px * var(--px)) rgba(0,0,0,.55);` });
    }
    const el = h("span", {
      class: "game-sprite npc", "aria-hidden": "true",
      style: `background-image:url(/art/pixel/sprite-${npc.id}.png);background-size:calc(96px * var(--px)) calc(160px * var(--px));background-position:0 0;`,
    });
    npcSprites.push({ el, npc });
    return el;
  };
  function npcEls() {
    npcSprites.length = 0;
    return npcsInRegion(currentRegionName()).map((npc) =>
      h("span", {
        class: "game-npc",
        "data-npc": npc.id,
        style: `left:calc(${npc.x}px * var(--px));top:calc(${npc.y}px * var(--px));position:absolute;z-index:6;pointer-events:none;text-align:center;`,
      },
        npcSpriteEl(npc),
        h("b", { style: `position:absolute;left:50%;bottom:calc(34px * var(--px));transform:translateX(-50%);display:block;font:calc(5px * var(--px))/1.3 sans-serif;color:#fff8e7;text-shadow:0 0 calc(1px * var(--px)) #000;white-space:nowrap;` }, npc.name),
      ),
    );
  }
  /** 小人动两下：平时是待机两帧（站很久，偶尔眨一下）；走近正在跟他说话的那个，换成说话帧。
     对话打开时主循环早退，所以这个必须在早退之前调。 */
  function paintNpcFrames(now) {
    for (const one of npcSprites) {
      const talking = one.npc.id === nearNpcId;
      const row = talking ? 4 : 0; // 第 4 行是说话
      const col = Math.floor(now / (talking ? 260 : 1900)) % 2;
      one.el.style.backgroundPosition = `calc(${-col * 16}px * var(--px)) calc(${-row * 32}px * var(--px))`;
    }
  }
  /** 走进范围就搭一句话；委托人当场开口托付，闲聊的给传闻。 */
  function talkNearNpcs() {
    const npc = npcsInRegion(currentRegionName()).find((one) => Math.hypot(player.x - one.x, player.y - one.y) <= 12) || null;
    const id = npc?.id || null;
    if (id === nearNpcId) return;
    nearNpcId = id;
    if (!npc) return;
    if (npc.quest) return talkToClient(npc);
    const { talked, first } = markTalked(loadTalked(), id);
    if (!first) {
      // 已经聊过：再聊一次只留一句短的，但如果他提到的委托你还没接，再提醒一遍。
      if (npc.discover) {
        const progress = loadProgress();
        if (!progress.discovered.includes(npc.discover)) {
          saveProgress(markDiscovered(progress, [npc.discover]));
          return void say([{ text: npc.hear, face: "normal" }]);
        }
      }
      return void toast(npc.after);
    }
    saveTalked(talked);
    achievements.note({ type: "talk", id });
    // 他们的头像都在 faces/ 里，聊天的就是他们本人，不是路米。
    const lines = npc.first.map((text) => ({ text, face: "happy", who: npc.id, name: npc.name }));
    // 传闻：聊到的人会把一件委托「带」到委托板上（quest-progress 的 discovered）。
    let learned = false;
    if (npc.discover) {
      const progress = loadProgress();
      if (!progress.discovered.includes(npc.discover)) {
        saveProgress(markDiscovered(progress, [npc.discover]));
        learned = true;
      }
      lines.push({ text: npc.hear, face: "normal" });
    }
    void say(lines, null, () => {
      if (learned) toast("委托板上多了一条 · 回事务所看看");
    });
  }

  /* ----- 委托人本人：他们的委托不在板上，走过去当面接（docs/quest-board.md 第 7 节） ----- */
  /** 一份委托现在能不能接：用委托板同一套判定（前置/知识点），只是接的地方换了。 */
  function questStatus(quest) {
    return questState(quest, playerFor(loadProgress(), PROLOGUE_QUESTS)).status;
  }

  /** 接下一份当面托付 / 世界遭遇的委托：记进 accepted，镇上会一直提醒。 */
  function acceptQuest(quest, extraLines = []) {
    menu.hidden = true;
    saveProgress(markAccepted(loadProgress(), quest.id));
    syncQuestTracker();
    if (extraLines.length) return void say(extraLines, null, () => enterSpot(quest.caseId));
    enterSpot(quest.caseId);
  }

  function talkToClient(npc) {
    const quest = PROLOGUE_QUESTS.find((one) => one.id === npc.quest || one.client === npc.id) || null;
    if (!quest) return void toast(npc.after);
    const { talked, first } = markTalked(loadTalked(), npc.id);
    if (first) {
      saveTalked(talked);
      achievements.note({ type: "talk", id: npc.id });
    }
    // 见到本人，就等于听说了这件事（不一定要先在别处听说）——所以先点亮，再判定能不能接。
    saveProgress(markDiscovered(loadProgress(), [quest.discover]));
    const progress = loadProgress();
    const status = questStatus(quest);
    const sayAs = (text, face = "normal") => ({ who: npc.id, name: npc.name, text, face });
    const greeting = first ? (npc.first || []).map((text) => sayAs(text, "normal")) : [];

    if (status === "done") {
      if(quest.transfer)return void say([sayAs('上次的副本还留着。想换成不看提示再独立检查一次吗？')],null,()=>showMenu([
        {label:'再独立检查一次',run:()=>{try{localStorage.removeItem(`rea-transfer-work:${quest.caseId}`);}catch{}acceptQuest(quest);}},
        {label:'先不重做',run:()=>{menu.hidden=true;}}
      ]));
      return void say([sayAs(npc.after, "happy")]);
    }
    if (progress.accepted.includes(quest.id)) {
      return void say([sayAs(npc.pending || npc.after)], null, () => {
        showMenu([
          { label: `现在就去：${quest.title}`, run: () => { menu.hidden = true; enterSpot(quest.caseId); } },
          { label: "再等一会儿", run: () => (menu.hidden = true) },
        ]);
      });
    }
    if (status !== "available") {
      // 条件还不够：他欲言又止，先不把事情摊开——省得剧透了又接不了。
      return void say([...greeting, sayAs(npc.later || npc.after, "unsure")]);
    }
    void say([...greeting, ...(quest.ask || [])], null, () => {
      showMenu([
        { label: `接下「${quest.title}」`, run: () => acceptQuest(quest) },
        { label: "先不接", run: () => { menu.hidden = true; toast(`${npc.name}还在那儿`); } },
      ]);
    });
  }

  /* ----- 世界遭遇：有些委托不用接，走到那儿事情自己撞上来 ----- */
  const ENCOUNTERS = PROLOGUE_QUESTS.filter((quest) => takeKind(quest) === "encounter" && quest.at);
  const encounterPlayed = new Set(); // 撞上一次就够了：接不接都别再拦着人走路
  function checkEncounters() {
    if (ENCOUNTERS.length === 0) return;
    for (const quest of ENCOUNTERS) {
      if (quest.at.region !== currentRegionName()) continue;
      if (encounterPlayed.has(quest.id)) continue;
      if (Math.hypot(player.x - quest.at.x, player.y - quest.at.y) > 14) continue;
      const progress = loadProgress();
      if (progress.completed[quest.id] || progress.accepted.includes(quest.id)) continue;
      if (questStatus(quest) !== "available") continue; // 还没听说过，走到门口也不会有事发生
      const lines = (quest.encounter || []).map((line) => (typeof line === "string" ? { text: line } : line));
      if (!lines.length) continue;
      encounterPlayed.add(quest.id);
      void say(lines, null, () => {
        showMenu([
          { label: `看看这台${quest.giver ? `${quest.giver}的` : ""}机器`, run: () => acceptQuest(quest) },
          { label: "先走开", run: () => (menu.hidden = true) },
        ]);
      });
      return;
    }
  }

  /* 可交互场景：长椅、秋千、码头、台阶（scenery.js）。坐下会真的把人放上去，按方向键站起来。 */
  let sittingOn = null;
  function sceneryEls() {
    return sceneryInRegion(currentRegionName()).map((prop) =>
      h("span", {
        class: "game-scenery",
        "data-scenery": prop.id,
        "aria-hidden": "true",
        style: `left:calc(${prop.x}px * var(--px));top:calc(${prop.y}px * var(--px));position:absolute;z-index:4;pointer-events:none;font-size:calc(7px * var(--px));line-height:1;color:#e8d9b5;text-shadow:0 0 calc(1px * var(--px)) #000;`,
      }, prop.kind === "sit" ? "▭" : "◇"),
    );
  }
  function sceneryNear() {
    return sceneryInRegion(currentRegionName()).find((prop) => Math.hypot(player.x - prop.x, player.y - prop.y) <= 14) || null;
  }
  function useScenery() {
    const prop = nearScenery;
    if (!prop) return;
    nearScenery = null;
    prompt.hidden = true;
    if (prop.kind === "sit") {
      sittingOn = prop.id;
      Object.assign(player, { x: prop.x, y: prop.y + 4, walking: false });
      target = null;
      placePlayer();
      achievements.note({ type: "sit", id: prop.id });
    } else {
      achievements.note({ type: "scenery", id: prop.id });
    }
    void say(prop.lines.map((text) => ({ text, face: "happy" })));
  }

  /* Inside a building (room pixels, 320x180): where the floor starts, furniture the feet cannot cross,
     the spot where the room's work happens (E opens its menu), the way out, and where you come in. */
  const ROOM_DEFAULT = { top: 118, blocks: [], spot: { x: 160, y: 128 }, exit: { x: 160, y: 176 }, spawn: { x: 160, y: 160 } };
  const ROOMS = {
    home: { top: 112, spot: { x: 132, y: 118 }, exit: { x: 288, y: 116 }, spawn: { x: 270, y: 126 }, spotLabel: "查看委托板和办公桌" },
    learn: { top: 100, blocks: [{ x: 104, y: 96, w: 118, h: 24 }], spot: { x: 162, y: 126 }, spotLabel: "和书奶奶说话" },
    engines: { top: 108, blocks: [{ x: 0, y: 100, w: 66, h: 28 }, { x: 262, y: 100, w: 58, h: 32 }], spot: { x: 186, y: 120 }, spotLabel: "看看工作台" },
    clients: { top: 122, spot: { x: 150, y: 128 }, spotLabel: "到柜台办事" },
    doctor: { top: 120, blocks: [{ x: 0, y: 112, w: 48, h: 20 }], spot: { x: 234, y: 126 }, spotLabel: "找白医生" },
  };
  const roomOf = (id) => ({ ...ROOM_DEFAULT, ...ROOMS[id] });
  /* Rooms are a closer view than the town. Measured on the rooms (a door is ~95px, a desk ~32px: about
     46px to a metre), Lumi (~1.5m) stands ~70px tall at the back wall, and a little taller nearer the
     front of the picture (perspective). Returns the size of a 16x32 frame relative to the town. */
  const indoorScale = () => !room ? 1 : caseRoom ? room.characterScale || 1.65 : 2.35 * (1 + 0.12 * Math.max(0, Math.min(1, (player.y - room.top) / (180 - room.top))));
  let roomEl = null;
  let room = null;

  /* Moving water over the map picture (game-water.js); one layer per map, kept while the map is shown. */
  let water = null;
  function waterFor(picture) {
    water?.stop();
    const name = `${townImage()}-water`;
    if (!picture || !has(name)) return (water = null), [];
    if (water?.name !== name) water = { name, ...createWaterLayer({ mask: `/art/pixel/${name}.png`, picture: `/art/pixel/${townImage()}.png`, width: (regional() ? REGION_SIZE : world).w, height: (regional() ? REGION_SIZE : world).h }) };
    water.start();
    return [water.canvas];
  }

  function drawRoom(id) {
    water?.stop();
    worldEl = null;
    nearDoor = null;
    const scene = SCENES[id];
    const picture = has(`room-${id}`);
    stage.dataset.view = id;
    room = roomOf(id);
    Object.assign(player, { x: room.spawn.x, y: room.spawn.y, walking: false });
    target = null;
    roomEl = h("div", { class: "game-room" },
      picture ? h("img", { class: "game-bg", src: `/art/pixel/room-${id}.png`, alt: "" }) : h("div", { class: `game-bg drawn room ${id}`, "aria-hidden": "true" }, h("span", { class: "window" }), h("span", { class: "shelf" }), h("span", { class: "desk" })),
      (playerEl = has("anim-lumi") ? h("span", { class: "game-sprite player sheet indoor", style: `background-image:url(/art/pixel/${has("anim-lumi-unified") ? "anim-lumi-unified" : "anim-lumi"}.png)`, "aria-hidden": "true" }) : sprite("lumi", 0, "player indoor")));
    stage.replaceChildren(roomEl, h("div", { class: "game-place-sign" }, icon(scene.icon, { size: 16 }), scene.place));
    placePlayer();
    animate(0, 0, 0);
  }

  /* ----- dialogue: click or press Enter/Space to continue; choices when the lines run out ----- */
  // A line is "text" or { text, face }: the face picks Lumi's expression for that line.
  const portrait = (face = "normal", who = "lumi", name = "") => {
    const file = [`${who}-${face}`, `${who}-normal`].find((n) => art().portraits.has(n));
    if (file) return h("div", { class: "case-portrait", "aria-hidden": "true" }, h("img", { src: `/art/faces/${file}.webp`, alt: "", width: 160, height: 160 }));
    // Someone without a portrait yet: a wooden frame with the first character of their name.
    if (who !== "lumi") return h("div", { class: "case-portrait game-portrait-stand-in", "aria-hidden": "true" }, h("span", {}, (name || SPEAKERS[who] || who).slice(0, 1)));
    return h("div", { class: "guide-avatar", "aria-hidden": "true" }, h("span", {}));
  };

  /*
   * Lines follow the chosen difficulty: a line's `easy` / `hard` text replaces `text` at that level, and
   * `only: "hard"` (or "easy", "easy normal" …) keeps a line to those levels. Plain strings always show.
   */
  const level = () => quests?.difficulty || "normal";
  const focus = () => quests?.focus || "balanced";
  function forLevel(line) {
    if (typeof line === "string") return line;
    if (line.only && !line.only.split(" ").includes(level())) return null;
    if (line.focus && !line.focus.split(" ").includes(focus())) return null;
    return line[level()] ? { ...line, text: line[level()] } : line;
  }
  let lineDone = null; // set by sayAndWait: called when the last line is clicked away
  function say(texts, after, done = null) {
    lines = texts.map(forLevel).filter(Boolean);
    lineDone = done;
    if (!lines.length) {
      dialogue.hidden = true;
      lineDone = null;
      after?.();
      return done?.();
    }
    lineIndex = 0;
    lineAfter = after;
    dialogue.onclick = () => advance(after);
    renderLine(after);
    if(caseRoom){dialogue.tabIndex=-1;dialogue.focus({preventScroll:true});}
  }

  // Lines appear a character at a time with a soft blip (a click shows the whole line at once).
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const VOICE = { lumi: 620, smith: 300, librarian: 480, postman: 560, bibi: 900, xiaoke: 880, xingbo: 520, ayan: 700, liuniangzi: 560, hangonglian: 340, susong: 280, ada: 740, babbage: 260, duoduo: 860, "wang-nainai": 380, "lao-qin": 300, xiaoyu: 900, baker: 600, barista: 660, "disk-vendor": 480, parcel: 340, student: 780, watchmaker: 300 };
  let typing = null;
  function renderLine(after) {
    const last = lineIndex >= lines.length - 1;
    const line = typeof lines[lineIndex] === "string" ? { text: lines[lineIndex] } : lines[lineIndex];
    dialogue.hidden = false;
    const text = h("p", { "aria-label": line.text });
    const more = !last && h("span", { class: "game-more" }, "点击继续");
    dialogue.replaceChildren(portrait(line.face, line.who, line.name), h("div", { class: "case-say-text" }, h("b", {}, line.name || SPEAKERS[line.who || "lumi"] || line.who), text, more || ""));
    stopTyping();
    if (reducedMotion) text.textContent = line.text;
    else {
      let shown = 0;
      if (more) more.hidden = true;
      typing = {
        finish: () => {
          text.textContent = line.text;
          if (more) more.hidden = false;
          clearInterval(typing?.timer);
          typing = null;
        },
      };
      typing.timer = setInterval(() => {
        shown += 1;
        text.textContent = line.text.slice(0, shown);
        if (shown % 2 === 1 && !/[，。！？、…「」（）\s]/.test(line.text[shown - 1] || "")) sound.blip(VOICE[line.who || "lumi"] || 520);
        if (shown >= line.text.length) typing?.finish();
      }, 28);
    }
    if (last) after?.();
  }
  function stopTyping() {
    if (typing) {
      clearInterval(typing.timer);
      typing = null;
    }
  }

  function advance(after) {
    // The first click finishes a line still being typed.
    if (typing) return typing.finish();
    if (lineIndex < lines.length - 1) {
      lineIndex += 1;
      renderLine(after);
    } else if (lineDone) {
      const done = lineDone;
      lineDone = null;
      dialogue.hidden = true;
      done();
    }
  }
  const sayAndWait = (texts) => new Promise((resolve) => say(texts, null, resolve));

  function showMenu(items) {
    menu.hidden = false;
    menu.replaceChildren(
      ...items.map((item) => h("button", { class: "game-choice", type: "button", role: "menuitem", onclick: item.run }, h("span", { class: "game-cursor", "aria-hidden": "true" }, "▶"), item.label)),
    );
    menu.querySelector("button")?.focus({ preventScroll: true });
  }

  /* ----- walking on the town map: WASD / arrow keys, right-click a spot, or the on-screen stick ----- */
  const SPEED = BASE_SPEED; // map pixels per second; hold Shift to sprint (world-scale.js)
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
  /** A region's buildings that lead somewhere now or later (a case home only once its case exists). */
  const regionSpots = (name) => Object.fromEntries(Object.entries(REGIONS[name].spots).filter(([id, spot]) => ACTIONS[id] || spot.soon || spot.placeholder || spot.label || cases().some((c) => c.id === id)));
  const spots = () => (spotCache ||= regional() ? regionSpots(region) : { ...TOWN, ...caseHouses() });
  const spotData = (id) => (regional() ? REGIONS[regionOf(id)]?.spots[id] : TOWN[id] || CASE_HOUSES[id]);
  /** Name and purpose shown on a spot's sign. */
  function info(id) {
    if (SCENES[id] && ACTIONS[id]) return { place: SCENES[id].place, purpose: SCENES[id].purpose };
    if (spotData(id)?.soon) return spotData(id).soon;
    if (spotData(id)?.placeholder) return spotData(id).placeholder;
    if (spotData(id)?.label) return spotData(id).label;
    const item = cases().find((c) => c.id === id);
    if (item && !inDemo(id)) return { place: item.scene?.place || item.title || id, purpose: "正式版开放" };
    const order = demo ? demo.cases.indexOf(id) + 1 : item?.order;
    return { place: item?.scene?.place || item?.title || id, purpose: item?.type === "stories" ? "真实世界故事" : (demo ? `委托${"一二三"[order - 1] || order}` : `委托 · 案例 ${order ?? ""}`) };
  }
  const doorOf = (id) => spotData(id).door;
  const blocks = () => [
    ...Object.values(spots()).map((b) => {
      const roof = Math.round(b.h * 0.45); // the top of the picture is roof: you can stand behind it
      return { x: b.x, y: b.y + roof, w: b.w, h: b.h - roof - 2 };
    }),
    ...(regional() ? regionData().obstacles : OBSTACLES),
  ];
  /** Edge roads between regions: a sign shows where each leads ("!" when the current goal is there). */
  function exitSigns() {
    if (!regional()) return [];
    return regionData().exits.map((exit) => {
      const objective = quests && regionOf(quests.current()?.spot) === exit.to;
      const [arrow, x, y] =
        exit.y === 0 ? ["↑", exit.x + exit.w / 2, 34] : exit.x === 0 ? ["←", 54, exit.y + exit.h / 2] : exit.x + exit.w >= REGION_SIZE.w ? ["→", REGION_SIZE.w - 54, exit.y + exit.h / 2] : ["↓", exit.x + exit.w / 2, REGION_SIZE.h - 30];
      return h("span", { class: `game-exit ${objective ? "objective" : ""}`, style: `left:calc(${x}px * var(--px));top:calc(${y}px * var(--px))` }, objective && h("span", { class: "game-objective", "aria-hidden": "true" }, "!"), `${arrow} ${REGIONS[exit.to].name}`);
    });
  }
  // Exits trigger a little inside the edge (the player cannot stand on the very edge).
  const inExit = (exit, x, y, pad = 16) => x > exit.x - pad && x < exit.x + exit.w + pad && y > exit.y - pad && y < exit.y + exit.h + pad;
  /** Roads the picture-based collision might take for shade, and the ground near every exit, are always open. */
  const forcedOpen = (x, y) => regional() && ((regionData().open || []).some((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) || regionData().exits.some((exit) => inExit(exit, x, y, 44)));
  /* Walkability map built from the town picture (scripts/build-walkmap.py): trees, walls, fences,
     benches, lamps and water are blocked; paths, grass and paving are open. */
  let walkMap = null;
  let walkMapName = null;
  let walkReady = Promise.resolve();
  function loadWalkMap() {
    const name = townImage();
    if (walkMapName === name) return walkReady;
    walkMapName = name;
    walkMap = null;
    walkReady = fetch(`/art/pixel/${name}-walk.json`, { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (walkMapName !== name) return;
        walkMap = data;
        addFronts();
      })
      .catch(() => {});
    return walkReady;
  }
  /* Depth: every tree and house has its own pixels on town-front.png and a base line. Each is drawn as
     a layer whose stacking order is its base; the player's order is the y of its feet. So the player
     is hidden behind a canopy or roof when standing above its base, and in front of it otherwise. */
  function addFronts() {
    if (!worldEl || !walkMap?.fronts || !has(townImage()) || !has(`${townImage()}-front`)) return;
    worldEl.querySelectorAll(".game-front").forEach((el) => el.remove());
    for (const f of walkMap.fronts) {
      worldEl.append(
        h("span", {
          class: "game-front",
          "aria-hidden": "true",
          style: [
            `left:calc(${f.x}px * var(--px))`, `top:calc(${f.y}px * var(--px))`,
            `width:calc(${f.w}px * var(--px))`, `height:calc(${f.h}px * var(--px))`,
            `background-image:url(/art/pixel/${townImage()}-front.png)`,
            `background-size:calc(${world.w}px * var(--px)) calc(${world.h}px * var(--px))`,
            `background-position:calc(${-f.x}px * var(--px)) calc(${-f.y}px * var(--px))`,
            `z-index:${f.base}`,
          ].join(";"),
        }),
      );
    }
  }
  const openGround = (x, y) => {
    if (!walkMap || !has(townImage())) return true;
    const row = walkMap.rows[Math.floor(y / walkMap.cell)];
    return row ? row[Math.floor(x / walkMap.cell)] === "1" : false;
  };
  const nearDoorway = (x, y) => Object.values(spots()).some((b) => Math.abs(x - b.door.x) < 7 && y >= b.door.y - 4 && y - b.door.y < 9);
  /** The feet (an 8x3 box at the bottom of the sprite) would hit something, or leave the map. */
  function blocked(x, y) {
    if (room) return x < 14 || x > 306 || y < room.top || y > 178 || room.blocks.some((b) => x + 9 > b.x && x - 9 < b.x + b.w && y > b.y && y - 5 < b.y + b.h);
    if (x < 6 || x > world.w - 6 || y < 14 || y > world.h - 2) return true;
    if (nearDoorway(x, y)) return false;
    if (blocks().some((b) => x + 4 > b.x && x - 4 < b.x + b.w && y > b.y && y - 3 < b.y + b.h)) return true;
    if (forcedOpen(x, y)) return false;
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
    const k = indoorScale();
    playerEl.style.backgroundSize = `calc(${cols * 16 * k}px * var(--px)) calc(${rows * 32 * k}px * var(--px))`;
    playerEl.style.backgroundPosition = `calc(${-index * 16 * k}px * var(--px)) calc(${-clip.row * 32 * k}px * var(--px))`;
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
    if (room) playerEl.style.setProperty("--k", indoorScale().toFixed(3));
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
    const area = room ? { w: 320, h: 180 } : world;
    const cols = Math.ceil(area.w / CELL);
    const rows = Math.ceil(area.h / CELL);
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
  // ?case=<id> goes straight into that case room, which is how backgrounds and prop anchors get checked.
  if (new URLSearchParams(location.search).has("debug")) {
    window.__game = { walkTo: (x, y) => walkTo({ x, y }), findPath: (a, b) => findPath(a, b), blocked: (x, y) => blocked(x, y), player, region: () => region, go: (name) => switchRegion(name), play: (script) => director.play(script), timeMachine: () => openTimeMachine(), enter: (id) => enterSpot(id), caseSession: () => caseRoom?.session };
    const jump = new URLSearchParams(location.search).get("case");
    if (jump) {
      // A fresh browser shows the welcome questions first; a review link answers them with the
      // recommended option, then opens the room. Cases and questions load asynchronously, so retry.
      let tries = 0;
      const tryEnter = () => {
        if (tries++ > 40) return;
        const question = document.querySelector(".game-difficulty");
        if (question) (document.querySelector(".game-difficulty.recommended") || question).click();
        else if (stage.dataset.view !== "case") {
          try { enterSpot(jump); } catch {}
        } else return;
        setTimeout(tryEnter, 700);
      };
      setTimeout(tryEnter, 800);
    }
    // ?debug&mini=<case id> drops a case's mini-game straight onto the page, to try it without playing
    // the whole case first.
    const mini = new URLSearchParams(location.search).get("mini");
    if (mini) {
      setTimeout(() => {
        const item = cases().find((entry) => entry.id === mini);
        if (!item?.game?.lab) return;
        if(item.game.practice){
          const host=h('div',{class:'mini-standalone'},h('p',{class:'mini-standalone-bar'},'支线调试预览：不写入正式委托完成记录'));
          host.append(mountTransfer({h,item,preview:true,onComplete:()=>toast('调试副本已通过；正式知识记录保持不变'),onClose:restart=>{if(restart)location.reload();else host.remove();}}));
          document.body.append(host);return;
        }
        const kind = new URLSearchParams(location.search).get("kind");
        const lab = kind ? { ...item.game.lab, kind } : item.game.lab;
        const host = h("div", { class: "mini-standalone" },
          h("div", { class: "mini-standalone-bar" }, h("span", {}, "试玩入口（调试用）· 这一关正式接入的是 " + item.game.lab.kind)),
          mountLab({ h, icon, lab, finishLabel: "做完了" }));
        document.body.append(host);
      }, 1000);
    }
  }
  function walkTo(point, then) {
    if (stage.dataset.view !== "town" && !room) return then?.();
    const path = findPath(player, point) || [point];
    target = { x: path[0].x, y: path[0].y, rest: path.slice(1), then };
    startWalking();
  }

  /** Any movement starts the walk: the dialogue box steps aside so the map is visible. */
  function startWalking() {
    dialogue.hidden = true;
    if (room) menu.hidden = true;
  }

  let lastTime = 0;
  let stepClock = 0;
  let walkedSince = 0;

  /* Falling autumn leaves over the town: a few small pixels drifting down across the camera's view. */
  const LEAF_COLORS = ["#d9622b", "#e8a53a", "#b8452a", "#f0c25a"];
  let leaves = [];
  function scatterLeaves() {
    leaves = [];
    if (reducedMotion || !worldEl) return;
    for (let i = 0; i < 14; i += 1) {
      const colors = (regional() && regionData().leaves) || LEAF_COLORS;
      const el = h("span", { class: "game-leaf", "aria-hidden": "true", style: `background:${colors[i % colors.length]}` });
      worldEl.append(el);
      leaves.push({ el, x: camera.x + Math.random() * viewW(), y: camera.y + Math.random() * viewH(), vx: 6 + Math.random() * 8, vy: 10 + Math.random() * 10, phase: Math.random() * 6 });
    }
  }
  function blowLeaves(dt) {
    for (const leaf of leaves) {
      leaf.phase += dt * 2;
      leaf.x += (leaf.vx + Math.sin(leaf.phase) * 10) * dt;
      leaf.y += leaf.vy * dt;
      if (leaf.y > camera.y + viewH() + 8 || leaf.x > camera.x + viewW() + 8) {
        leaf.x = camera.x + Math.random() * viewW() - 20;
        leaf.y = camera.y - 6;
      }
      leaf.el.style.left = `calc(${leaf.x.toFixed(1)}px * var(--px))`;
      leaf.el.style.top = `calc(${leaf.y.toFixed(1)}px * var(--px))`;
      leaf.el.style.transform = `rotate(${Math.round(Math.sin(leaf.phase) * 2) * 45}deg)`;
    }
  }
  function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - lastTime) / 1000 || 0);
    lastTime = now;
    paintNpcFrames(now);
    if (!enabled || windowOpen || caseBusy() || (stage.dataset.view !== "town" && !room)) return;
    let dx = 0;
    let dy = 0;
    if (!director.playing && closeupEl.hidden) {
      for (const key of keys) {
        const dir = KEY_DIRS[key];
        if (dir) [dx, dy] = [dx + dir[0], dy + dir[1]];
      }
      dx += stick.x;
      dy += stick.y;
    }
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
      const step = ((keys.has("shift") ? sprintSpeed() : SPEED) * dt) / Math.max(1, length);
      if (keys.has("shift")) achievements.note({ type: "sprint", by: step });
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
    if (player.walking) walkedSince += SPEED * dt;
    if (walkedSince > 300) {
      achievements.note({ type: "walked", by: Math.round(walkedSince) });
      walkedSince = 0;
    }
    if (player.walking && (stepClock += dt) > 0.3) {
      stepClock = 0;
      sound.step();
    }
    if (!room) blowLeaves(dt);
    if (regional() && !room) {
      const exit = regionData().exits.find((e) => inExit(e, player.x, player.y));
      if (exit) return switchRegion(exit.to, exit.at);
    }
    showDoorPrompt();
  }

  /** Walk into another region: its map is drawn and the player stands at `at`. */
  function switchRegion(name, at = REGIONS[name].spawn) {
    arrive();
    region = name;
    achievements.note({ type: "region", id: name });
    regionStarted = true;
    Object.assign(player, at);
    target = null;
    nearDoor = null;
    prompt.hidden = true;
    dialogue.hidden = true;
    drawTown();
    return walkReady;
  }

  /* At a doorway, a prompt appears; E / Enter / Space (or tapping it) goes inside. */
  let nearDoor = null;
  let nearScenery = null;
  const prompt = h("button", { class: "game-interact", type: "button", onclick: () => usePrompt() });
  function usePrompt() {
    if (!nearDoor && nearScenery) return useScenery();
    if (!nearDoor) return;
    if (!room) return enterSpot(nearDoor);
    const which = nearDoor;
    nearDoor = null;
    prompt.hidden = true;
    if (caseRoom) {
      if (which === "exit") return leaveCaseRoom();
      if (which === "client") return caseRoom.session.talk();
      return caseRoom.session.inspect(which.slice(5));
    }
    if (which === "exit") goTown();
    else roomMenu(place);
  }
  prompt.hidden = true;
  function showDoorPrompt() {
    if (director.playing || !closeupEl.hidden) {
      prompt.hidden = true;
      nearDoor = null;
      return;
    }
    if (room) return showRoomPrompt();
    collectNearEggs();
    talkNearNpcs();
    checkEncounters();
    const id = Object.keys(spots()).find((key) => Math.abs(player.x - doorOf(key).x) < 9 && player.y >= doorOf(key).y - 3 && player.y - doorOf(key).y < 12) || null;
    // 没有门，但附近有能坐/能摸的东西：显示“坐下 · 长椅”这类提示。
    const prop = id ? null : sceneryNear();
    if (!id && prop) {
      const changed = nearScenery?.id !== prop.id;
      nearScenery = prop;
      nearDoor = null;
      if (changed) {
        prompt.hidden = false;
        prompt.replaceChildren(h("kbd", {}, touch ? "点这里" : "E"), promptFor(prop));
        worldEl?.append(prompt);
      }
      positionPrompt();
      return;
    }
    nearScenery = null;
    if (id === nearDoor) {
      if (id) positionPrompt();
      return;
    }
    nearDoor = id;
    prompt.hidden = !id;
    if (!id) return;
    prompt.replaceChildren(h("kbd", {}, touch ? "点这里" : "E"), quests?.playAt(id) ? `调查 · ${info(id).place}` : ACTIONS[id] ? `进入 · ${info(id).place}` : spotData(id)?.soon || spotData(id)?.placeholder ? `看看 · ${info(id).place}` : `接委托 · ${info(id).place}`);
    worldEl?.append(prompt);
    positionPrompt();
  }
  function positionPrompt() {
    const x = room ? Math.max(46, Math.min(274, player.x)) : player.x;
    prompt.style.left = `calc(${x.toFixed(1)}px * var(--px))`;
    prompt.style.top = `calc(${(room ? Math.min(177, player.y + 12) : player.y - 36).toFixed(1)}px * var(--px))`;
    prompt.classList.toggle("room-prompt", Boolean(room));
  }
  /** Indoors: "spot" (the room's work: opens its menu) or "exit" (back to town). */
  function showRoomPrompt() {
    const near = (p, r) => Math.hypot(player.x - p.x, player.y - p.y) < r;
    if (caseRoom) return showCasePrompt(near);
    const id = !menu.hidden || !dialogue.hidden ? null : near(room.spot, 18) ? "spot" : near(room.exit, 16) ? "exit" : null;
    if (id === nearDoor) {
      if (id) positionPrompt();
      return;
    }
    nearDoor = id;
    prompt.hidden = !id;
    if (!id) return;
    prompt.replaceChildren(h("kbd", {}, touch ? "点这里" : "E"), id === "exit" ? "回小镇" : room.spotLabel || SCENES[place]?.purpose || "看看");
    roomEl?.append(prompt);
    positionPrompt();
  }
  /** In a case room: the nearest prop (by where you stand to look at it), the client, or the door. */
  function showCasePrompt(near) {
    const session = caseRoom.session;
    const standAt = (thing) => ({ x: thing.stand?.[0] ?? thing.at[0], y: thing.stand?.[1] ?? Math.max(room.top + 4, thing.at[1] + 4) });
    let id = null;
    if (menu.hidden && dialogue.hidden && !session.busy) {
      // Whatever is closest: a prop (measured from where you stand to look at it) or the client.
      const dist = (p) => Math.hypot(player.x - p.x, player.y - p.y);
      const candidates = [...room.items.map((thing) => ({ id: `item:${thing.id}`, d: dist(standAt(thing)) })), { id: "client", d: dist(room.client) }].filter((c) => c.d < 22).sort((a, b) => a.d - b.d);
      if (candidates.length) id = candidates[0].id;
      else if (near(room.exit, 16)) id = "exit";
    }
    session.near(id?.startsWith("item:") ? id.slice(5) : null);
    if (id === nearDoor) {
      if (id) positionPrompt();
      return;
    }
    nearDoor = id;
    prompt.hidden = !id;
    if (!id) return;
    const thing = id.startsWith("item:") && room.items.find((t) => t.id === id.slice(5));
    prompt.replaceChildren(h("kbd", {}, touch ? "点这里" : "E"), id === "exit" ? "回小镇" : id === "client" ? `和${caseRoom.item.game.client.name}说话` : session.label(thing));
    roomEl?.append(prompt);
    positionPrompt();
  }
  requestAnimationFrame(tick);

  // Right-click on the map: walk there.
  stage.addEventListener("contextmenu", (event) => {
    if (!enabled || (stage.dataset.view !== "town" && !room)) return;
    event.preventDefault();
    startWalking();
    if (room) {
      const box = roomEl.getBoundingClientRect();
      return walkTo({ x: (event.clientX - box.left) / roomPx, y: (event.clientY - box.top) / roomPx });
    }
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
    const picture = has(townImage());
    const mark = (x, y) => `left:${((x / world.w) * 100).toFixed(2)}%;top:${((y / world.h) * 100).toFixed(2)}%`;
    mapPanel.replaceChildren(
      h("div", { class: "game-map-head" }, h("h2", {}, "小镇地图"), h("button", { class: "btn small", type: "button", onclick: closeMap }, icon("close", { size: 14 }), "关闭（M）")),
      h("div", { class: "game-map-body" },
        h("div", { class: "game-map-picture", style: `aspect-ratio:${world.w} / ${world.h}` },
          picture ? h("img", { src: `/art/pixel/${townImage()}.png`, alt: "" }) : h("div", { class: "game-map-blank" }),
          ...Object.entries(spots()).map(([id, spot]) => h("button", { class: `game-map-pin ${ACTIONS[id] ? "" : "case"} ${quests?.current()?.spot === id ? "objective" : ""}`, type: "button", style: mark(spot.door.x, spot.door.y), onclick: () => travel(id), title: info(id).place }, ACTIONS[id] ? "▼" : spot.soon ? "…" : "!")),
          h("span", { class: "game-map-you", style: mark(player.x, player.y), "aria-label": "你在这里" }, "你")),
        regional()
          ? h("div", { class: "game-map-list" },
            ...Object.entries(REGIONS).filter(([, data]) => data.era === regionData().era).flatMap(([name, data]) => {
              const ids = Object.keys(regionSpots(name));
              return [
                h("b", {}, data.name, name === region ? "（你在这里）" : ""),
                ids.length ? h("ul", {}, ...ids.map((id) => listItem(id))) : h("ul", {}, h("li", {}, h("button", { class: "game-choice", type: "button", onclick: () => { closeMap(); switchRegion(name); } }, h("span", { class: "game-cursor", "aria-hidden": "true" }, "▶"), `去${data.name}逛逛`))),
              ];
            }))
          : h("div", { class: "game-map-list" },
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
  async function travel(id) {
    closeMap();
    // Another region: arrive at its entrance, then walk to the door like anywhere else.
    if (regional() && regionOf(id) && regionOf(id) !== region) await switchRegion(regionOf(id));
    else await walkReady;
    walkTo(doorOf(id));
  }

  /* ----- the clock: a game minute per real second while it runs; stopped at 11:58 until the tower is opened ----- */
  const CLOCK_KEY = "rea-game-clock";
  const clock = (() => {
    try {
      return { day: 1, minutes: 11 * 60 + 58, ...JSON.parse(localStorage.getItem(CLOCK_KEY) || "{}") };
    } catch {
      return { day: 1, minutes: 11 * 60 + 58 };
    }
  })();
  let clockShown = -1;
  function renderClock() {
    const state = quests?.clockState() || "running";
    clockEl.dataset.state = state;
    // Stopped, every clock in town shows the minute the tower stopped.
    let shown = state === "stopped" ? 11 * 60 + 58 : clock.minutes;
    // Drifting: the hands jump around the true time, as if someone keeps changing it.
    if (state === "drifting") shown = (clock.minutes + Math.round(Math.sin(clock.minutes / 7) * 23) + 1440) % 1440;
    if (shown === clockShown && clockEl.dataset.shown === state) return;
    clockShown = shown;
    clockEl.dataset.shown = state;
    const hh = Math.floor(shown / 60);
    const mm = shown % 60;
    clockFace.style.setProperty("--h", `${(hh % 12) * 30 + mm / 2}deg`);
    clockFace.style.setProperty("--m", `${mm * 6}deg`);
    const status = state === "stopped" ? "停摆" : state === "drifting" ? "不准" : "";
    // Narrow screens hide the day and the status (CSS); the title and label always have everything.
    clockText.replaceChildren(h("span", { class: "game-clock-day" }, `第 ${clock.day} 天 `), `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`, status && h("span", { class: "game-clock-status" }, ` · ${status}`));
    clockEl.title = `第 ${clock.day} 天 · ${state === "stopped" ? "钟楼停摆了，镇上的钟都停在 11:58" : state === "drifting" ? "钟楼的时间被人改乱了" : "比特镇的时间"}`;
    clockEl.setAttribute("aria-label", `${clockText.textContent}（${clockEl.title}）`);
  }
  setInterval(() => {
    if (!enabled || !quests || quests.clockState() === "stopped") return renderClock();
    clock.minutes += 1;
    if (clock.minutes >= 1440) [clock.minutes, clock.day] = [0, clock.day + 1];
    try {
      localStorage.setItem(CLOCK_KEY, JSON.stringify(clock));
    } catch {}
    renderClock();
  }, 1000);

  /* ----- cutscenes (game-director.js) ----- */
  const flashEl = h("div", { class: "game-flash", "aria-hidden": "true" });
  shell.append(flashEl);
  const tween = (ms, step) =>
    new Promise((resolve) => {
      const start = performance.now();
      const frame = (now) => {
        const t = Math.min(1, (now - start) / Math.max(1, ms));
        step(t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
        if (t < 1) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
  const director = createDirector({
    lock: (on) => {
      shell.classList.toggle("cutscene", on);
      if (on) {
        keys.clear();
        target = null;
      }
    },
    say: (texts) => sayAndWait(texts),
    walk: (x, y) => new Promise((resolve) => walkTo({ x, y }, resolve)),
    focus: (x, y, ms) => {
      const from = cameraFocus ? { ...cameraFocus } : { x: player.x, y: player.y };
      return tween(ms, (t) => {
        cameraFocus = { x: from.x + (x - from.x) * t, y: from.y + (y - from.y) * t };
        followCamera();
      });
    },
    release: (ms) => {
      if (!cameraFocus) return Promise.resolve();
      const from = { ...cameraFocus };
      return tween(ms, (t) => {
        cameraFocus = { x: from.x + (player.x - from.x) * t, y: from.y + (player.y - from.y) * t };
        followCamera();
      }).then(() => {
        cameraFocus = null;
        followCamera();
      });
    },
    shake: (ms) => {
      if (reducedMotion) return;
      stage.classList.remove("shake");
      void stage.offsetWidth;
      stage.classList.add("shake");
      setTimeout(() => stage.classList.remove("shake"), ms);
    },
    flash: (ms, color = "#fff8e0") => {
      flashEl.style.background = color;
      flashEl.style.transition = "none";
      flashEl.style.opacity = reducedMotion ? "0.4" : "0.85";
      void flashEl.offsetWidth;
      flashEl.style.transition = `opacity ${ms}ms ease-out`;
      flashEl.style.opacity = "0";
    },
    emote: (text, ms) => emote(text, ms),
    sound: (name, pitch) => sound[name]?.(pitch),
  });
  /** A bubble over the player's head: ! ? ♪ … */
  function emote(text, ms = 1400) {
    const host = roomEl || worldEl;
    if (!host) return;
    const bubble = h("span", { class: "game-emote", "aria-hidden": "true", style: `left:calc(${player.x.toFixed(1)}px * var(--px));top:calc(${(player.y - (room ? 32 * indoorScale() : 34)).toFixed(1)}px * var(--px))` }, text);
    host.append(bubble);
    setTimeout(() => bubble.remove(), ms);
  }

  /* Close-ups: a mini-game played on the thing itself (the tower door, its gears, the drawers), with the
     camera on that spot, instead of a parchment panel. Each game names its spot and look here. */
  const CLOSEUPS = {
    binary: { spot: "clocktower", look: "door", title: "钟楼的门" },
    parts: { spot: "clocktower", look: "gears", title: "钟楼里的机关" },
    drawers: { spot: "clocktower", look: "drawers", title: "记事板下的抽屉" },
    rods: { spot: "teahouse", look: "table", title: "柳娘子的账桌" },
    escapement: { spot: "tower-site", look: "wheel", title: "枢轮与天衡" },
  };
  const closeupEl = h("section", { class: "game-closeup", role: "dialog", "aria-modal": "true" });
  closeupEl.hidden = true;
  shell.append(closeupEl);
  function closeCloseup() {
    closeupEl.hidden = true;
    closeupEl.replaceChildren();
  }
  /* ----- cinema: full-screen story pictures behind the dialogue box (public/art/pixel/scenes/) -----
     The 序章结尾 and the 1843 intro are told with the delivered illustrations; the dialogue stays on
     top (z 46 above the cinema's 41), so the beat is written as ordinary `say` lines. */
  const cinema = h("div", { class: "game-cinema", "aria-hidden": "true" });
  cinema.hidden = true;
  shell.append(cinema);
  /** Show one picture; art is a path under /art/pixel/ without .png, checked against /api/art. */
  function showCinema(art, caption = "") {
    const picture = has(art);
    cinema.replaceChildren(
      picture ? h("img", { src: `/art/pixel/${art}.png`, alt: "" }) : null,
      caption ? h("p", { class: "cinema-caption" }, caption) : null,
    );
    cinema.hidden = false;
  }
  /** The chapter card: 「第一章 · 1843 年的伦敦 —— 未完待续」 over the dimmed street. */
  function showChapterCard() {
    if (!has("scenes/london-1843")) {
      cinema.replaceChildren(h("div", { class: "cinema-card bare" },
        h("p", {}, "第一章"), h("h2", {}, "1843 年的伦敦"), h("p", { class: "cinema-card-sub" }, "—— 未完待续 ——")));
    } else {
      cinema.replaceChildren(
        h("img", { src: "/art/pixel/scenes/london-1843.png", alt: "" }),
        h("div", { class: "cinema-card" },
          h("p", {}, "第一章"),
          h("h2", {}, "1843 年的伦敦"),
          h("p", { class: "cinema-card-sub" }, "—— 未完待续 ——")),
      );
    }
    cinema.hidden = false;
  }
  function hideCinema() {
    cinema.hidden = true;
    cinema.replaceChildren();
  }
  /** What happens in the world when a mini-game is won, before the story goes on. */
  const AFTER_GAME = {
    rods: (door) => [
      { camera: { x: door.x, y: door.y - 40 }, ms: 400 },
      { sound: "right" },
      { emote: "♪" },
      { wait: 700 },
      { camera: "player", ms: 400 },
    ],
    // The jacks strike for the first time: three bells, the tower shakes, warm light.
    escapement: (door) => [
      { camera: { x: door.x, y: door.y - 110 }, ms: 600 },
      { wait: 300 },
      { sound: "blip", pitch: 880 }, { wait: 380 },
      { sound: "blip", pitch: 880 }, { wait: 380 },
      { sound: "blip", pitch: 660 }, { wait: 300 },
      { shake: 500 },
      { flash: 900, color: "#ffe9b0" },
      { sound: "unlock" },
      { wait: 900 },
      { camera: "player", ms: 600 },
      { emote: "!" },
      { wait: 400 },
    ],
    binary: (door) => [
      { camera: { x: door.x, y: door.y - 46 }, ms: 500 },
      ...Array.from({ length: 8 }, (_, i) => [{ call: () => towerLamp(i) }, { sound: "blip", pitch: 520 + i * 70 }, { wait: 170 }]).flat(),
      { wait: 250 },
      { shake: 450 },
      { flash: 500 },
      { sound: "door" },
      { call: () => openTowerDoor() },
      { wait: 700 },
      { camera: "player", ms: 500 },
      { emote: "!" },
      { wait: 500 },
    ],
    parts: (door) => [
      { camera: { x: door.x, y: door.y - 70 }, ms: 500 },
      { call: () => worldEl?.querySelector(".game-building.tower")?.classList.add("whirring") },
      { sound: "step" }, { wait: 160 }, { sound: "step" }, { wait: 160 }, { sound: "step" },
      { shake: 250 },
      { wait: 700 },
      { camera: "player", ms: 500 },
      { emote: "♪" },
      { wait: 400 },
    ],
    drawers: (door) => [
      { camera: { x: door.x, y: door.y - 90 }, ms: 600 },
      { call: () => worldEl?.querySelector(".game-building.tower .clockface")?.classList.add("spin") },
      { wait: 900 },
      { sound: "right" },
      { wait: 300 },
      { flash: 700, color: "#fff2c8" },
      { sound: "unlock" },
      { wait: 900 },
      { camera: "player", ms: 600 },
      { emote: "♥" },
      { wait: 400 },
    ],
  };
  /** 时光机: the brass dial in the clock tower. Open eras can be chosen; the rest are silhouettes. */
  function openTimeMachine() {
    const open = quests?.erasOpen() || [];
    overlay.classList.add("timemachine");
    overlay.replaceChildren(
      h("div", { class: "game-panel-head" }, h("h2", {}, "钟楼时光机"), h("button", { class: "btn small", type: "button", onclick: closeOverlay }, icon("close", { size: 14 }), "关上")),
      h("p", { class: "game-panel-note" }, "转动表盘，选一个时代。亮着的格子可以去；其余的还在等待时机。"),
      h("div", { class: "tm-dial" },
        ...ERAS.map((era, i) => {
          const ready = open.includes(era.id) && REGIONS[era.region];
          return h("button", { class: `tm-era ${ready ? "open" : "closed"}`, type: "button", disabled: !ready, onclick: () => travelToEra(era) },
            h("span", { class: "tm-era-no" }, String(i + 1)),
            h("b", {}, ready ? era.title : "？？？"),
            h("small", {}, ready ? `${era.place} · ${era.year}` : open.includes(era.id) ? "制作中" : "还没到时候"));
        })),
    );
    overlay.hidden = false;
    overlay.querySelector(".tm-era.open")?.focus({ preventScroll: true });
  }
  async function travelToEra(era) {
    closeOverlay();
    const door = spotData("clocktower")?.door;
    await director.play([
      ...(door ? [{ camera: { x: door.x, y: door.y - 60 }, ms: 500 }] : []),
      { sound: "unlock" },
      { shake: 700 },
      { flash: 300, color: "#ffffff" },
      { wait: 350 },
      { flash: 300, color: "#d8f4ff" },
      { wait: 350 },
      { flash: 900, color: "#ffffff" },
      { call: () => {
        cameraFocus = null;
        lastPlace = null;
        switchRegion(era.region);
      } },
      { wait: 600 },
      { emote: "?" },
      { wait: 500 },
    ]);
    quests?.event("travel", era.id);
  }
  /** The pocket watch: from any era, straight back to the clock tower in Bit Town. */
  async function travelHome() {
    if (!regionData()?.era || windowOpen || director.playing) return;
    closeOverlay();
    closeCloseup();
    await director.play([
      { sound: "unlock" },
      { flash: 300, color: "#ffffff" },
      { wait: 300 },
      { flash: 800, color: "#ffffff" },
      { call: () => {
        cameraFocus = null;
        lastPlace = null;
        const door = REGIONS.north.spots.clocktower.door;
        switchRegion("north", { x: door.x, y: door.y + 6 });
      } },
      { wait: 500 },
      { emote: "♥" },
      { wait: 400 },
    ]);
    quests?.event("travel", "home");
  }
  function towerLamp(i) {
    worldEl?.querySelectorAll(".game-building.tower .tower-lamps i")[i]?.classList.add("lit");
  }
  function openTowerDoor() {
    worldEl?.querySelector(".game-building.tower")?.classList.add("door-open");
  }

  /* ----- 预告测试版: the ending — the tower opens, a short 1843 intro, then the chapter card and thanks ----- */
  let demoEnding = false;
  const DEMO_START = "rea-demo-started";
  async function playDemoEnding() {
    const door = REGIONS.north.spots.clocktower.door;
    await director.play([
      { flash: 600, color: "#ffffff" },
      { call: () => {
        place = null;
        lastPlace = null;
        cameraFocus = null;
        switchRegion("north", { x: door.x - 70, y: door.y + 40 });
      } },
      { wait: 600 },
      { camera: { x: door.x, y: door.y - 70 }, ms: 1200 },
      { wait: 500 },
      { sound: "blip", pitch: 220 }, { shake: 600 }, { wait: 700 },
      { sound: "blip", pitch: 180 }, { shake: 800 }, { flash: 500, color: "#d8f4ff" }, { wait: 600 },
      { say: [
        { text: "钟楼……在发光？！", face: "surprised" },
        { text: "停摆的钟楼里，好像藏着一台能穿越时间的机器……", face: "thinking" },
      ] },
      /* ① 打开钟楼：门后不是齿轮，是一台大电脑（scenes/tower-open） */
      { call: () => showCinema("scenes/tower-open") },
      { sound: "door" },
      { wait: 500 },
      { say: [
        { who: "smith", text: "钥匙我守了二十年……门后哪是齿轮，是一台大电脑！这一屏的数字是什么？", face: "surprised" },
        { text: "满屏都是数不清的数字……小克，你认识它们吗？", face: "thinking" },
        { who: "xiaoke", text: "我是小克，路米电脑里的 AI 助手！让我想想……我说不上来。可是看着它们，就像在看我自己。", face: "unsure" },
        { text: "钟楼深处还有一个黄铜表盘，刻着六个年份。第一格亮着：1843。", face: "thinking" },
        { who: "xiaoke", text: "1843……我、我也要去！", face: "surprised" },
      ] },
      /* ② 穿越白闪，落在雾夜的伦敦街头（scenes/london-1843） */
      { flash: 1200, color: "#ffffff" },
      { sound: "unlock" },
      { wait: 400 },
      { call: () => showCinema("scenes/london-1843", "1843 年 · 伦敦 · 雾夜") },
      { wait: 600 },
      { say: [
        { text: "煤气灯、马车、雾……我们真的到了 1843 年的伦敦。", face: "surprised" },
        { who: "xiaoke", text: "街上好安静。可我好像听见，有很多数字正排着队往前走。", face: "thinking" },
      ] },
      /* ③ 巴贝奇家的沙龙：差分机与爱达的注释（eras/london/room-salon） */
      { call: () => showCinema("eras/london/room-salon", "巴贝奇家的周六沙龙") },
      { wait: 500 },
      { say: [
        { who: "babbage", text: "欢迎。这台机器会算数——它只会做我告诉它做的事，一步也不会多。", face: "happy" },
        { who: "ada", text: "我在为分析机写注释。它不能自己创造任何东西，只能做我们知道怎么命令它做的事。", face: "thinking" },
        { who: "xiaoke", text: "它……是我的祖先吗？那我呢？", face: "unsure" },
        { text: "这就是我们来的原因。", face: "happy" },
      ] },
      /* ④ 字卡 + 预告 */
      { call: () => showChapterCard() },
      { wait: 1600 },
      { call: () => hideCinema() },
    ]);
    showDemoEnd();
  }
  function showDemoEnd() {
    let started = 0;
    try {
      started = Number(localStorage.getItem(DEMO_START)) || 0;
    } catch {}
    const minutes = started ? Math.max(1, Math.round((Date.now() - started) / 60000)) : null;
    let stars = {};
    try {
      stars = JSON.parse(localStorage.getItem("rea-workbench-case-stars") || "{}") || {};
    } catch {}
    const starCount = demo.cases.reduce((sum, id) => sum + (stars[id] || 0), 0);
    overlay.classList.add("demo-end");
    overlay.replaceChildren(
      h("div", { class: "demo-end-head" }, h("p", {}, "预告测试版 · 完"), h("h2", {}, "感谢试玩！")),
      h("div", { class: "demo-end-stats" },
        h("div", {}, h("b", {}, minutes ? `${minutes} 分钟` : "—"), h("small", {}, "用时")),
        h("div", {}, h("b", {}, `${starCount} / ${demo.cases.length * 3}`), h("small", {}, "破案星级")),
        h("div", {}, h("b", {}, `${achievements.count()} / ${ACHIEVEMENTS.length}`), h("small", {}, "成就")),
        h("div", {}, h("b", {}, "见习侦探"), h("small", {}, "获得徽章"))),
      h("div", { class: "demo-end-teaser" },
        h("h3", {}, "正式版预告 · 第一章 1843 年的伦敦"),
        h("p", {}, "帮爱达排好分析机的运算卡，找出她原稿里真正的那一处错。然后跟着时光机，一路走回今天。"),
        h("ol", { class: "demo-end-eras" }, ...PART_ONE.map((era) => h("li", {}, h("b", {}, era.title), h("small", {}, era.note)))),
        h("p", { class: "demo-end-more" }, "程序 · 机器能思考吗 · 规则与学习 · 回到 12:00")),
      h("div", { class: "demo-end-foot" },
        h("button", { class: "btn primary", type: "button", onclick: () => closeOverlay() }, "继续在比特镇逛逛"),
        h("button", { class: "btn", type: "button", onclick: () => {
          if (!window.confirm("要从头再玩一次预告测试版吗？")) return;
          quests.reset();
          try {
            localStorage.removeItem(DEMO_START);
          } catch {}
          closeOverlay();
          location.reload();
        } }, "从头再玩一次")),
    );
    overlay.hidden = false;
  }

  /* ----- quests: difficulty, the quest log, and the guide's story lines ----- */
  let questLines = []; // waiting to be said the next time the player is free (not in a window)
  const takeQuestLines = () => questLines.splice(0);
  function renderTracker() {
    if (!quests) return;
    const step = quests.current();
    const waiting = quests.waitingAt(quests.lines[0]);
    tracker.replaceChildren(icon("learn", { size: 14 }), h("span", {}, step ? step.goal : waiting ? "主线下一章制作中" : "全部完成！"));
    tracker.title = step ? `${step.line.title} · ${step.chapter.title}：${step.goal}（J 打开任务日志）` : "J 打开任务日志";
    renderClock();
  }
  quests?.onChange(({ step, finishedChapter, story }) => {
    questLines.push(...story);
    if (demo && finishedChapter?.id === "d-finale") demoEnding = true;
    achievements.note({ type: "step", id: step.id });
    if (finishedChapter) achievements.note({ type: "chapter", id: finishedChapter.id, difficulty: quests.difficulty });
    achievements.note({ type: "skills", count: skillCount() });
    const learned = skillsFrom(step.id);
    if (focus() === "knowledge") questLines.push(...learned.filter((skill) => skill.recap).map((skill) => ({ text: `【复盘卡 · ${skill.label}】${skill.recap}`, face: "normal" })));
    learned.forEach((skill, i) => setTimeout(() => toast(`学会了：${skill.label}`, skill.note), 300 + i * 900));
    if (learned.length || finishedChapter) sound.unlock();
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
    overlay.classList.remove("skilltree", "timemachine", "demo-end", "transfer-overlay");
  };

  /** Pick a difficulty; the first time, the story starts afterwards. */
  /**
   * Before the story: two questions. First what the player came for (story, balanced, knowledge: how
   * deep the story goes), then their background (none, a little, some: the knowledge level).
   */
  function chooseDifficulty(first = false) {
    if (first) dialogue.hidden = true; // the welcome starts after the questions
    const choices = (entries, chosen, pick) =>
      h("div", { class: "game-difficulties" },
        ...entries.map(([id, d]) =>
          h("button", { class: `game-difficulty ${chosen === id ? "chosen" : ""} ${d.recommended ? "recommended" : ""}`, type: "button", onclick: () => pick(id) },
            h("b", {}, d.label, d.recommended ? h("i", { class: "game-recommended" }, "推荐") : null, d.level ? h("small", { class: "game-level" }, ` · ${d.level}`) : null),
            h("small", {}, d.note))));
    const finish = () => {
      if (demo) {
        try {
          if (!localStorage.getItem(DEMO_START)) localStorage.setItem(DEMO_START, String(Date.now()));
        } catch {}
      }
      closeOverlay();
      if (first) {
        shownControls = false;
        goTown();
      } else renderLog();
    };
    const askBackground = () => {
      overlay.replaceChildren(
        h("div", { class: "game-panel-head" }, h("h2", {}, "第 2 步 · 你有计算机基础吗？"), !first ? h("button", { class: "btn small", type: "button", onclick: closeOverlay }, icon("close", { size: 14 }), "关闭") : null),
        h("p", { class: "game-panel-note" }, "这决定讲得多深、题目多难。随时可以在任务日志（J）里更换，已完成的进度不受影响。"),
        choices(Object.entries(DIFFICULTIES), quests.difficulty, (id) => {
          quests.setDifficulty(id);
          finish();
        }),
      );
      overlay.querySelector(".game-difficulty")?.focus({ preventScroll: true });
    };
    overlay.replaceChildren(
      h("div", { class: "game-panel-head" }, h("h2", {}, "第 1 步 · 你更想体验什么？"), !first ? h("button", { class: "btn small", type: "button", onclick: closeOverlay }, icon("close", { size: 14 }), "关闭") : null),
      h("p", { class: "game-panel-note" }, "这决定剧情铺得多深。不确定的话，选「平衡」。"),
      choices(Object.entries(FOCUSES), quests.focus || "balanced", (id) => {
        quests.setFocus(id);
        askBackground();
      }),
    );
    overlay.hidden = false;
    overlay.querySelector(".game-difficulty.recommended, .game-difficulty")?.focus({ preventScroll: true });
  }

  function renderLog() {
    const step = quests.current();
    const lineBlock = (line) => {
      const open = quests.unlocked(line);
      const now = quests.lineCurrent(line);
      const waiting = quests.waitingAt(line);
      const lock = line.unlock && quests.lines.find((l) => l.id === line.unlock.line)?.chapters.find((c) => c.id === line.unlock.chapter);
      return h("section", { class: `game-log-line ${open ? "" : "locked"}` },
        h("div", { class: "game-log-line-head" },
          h("b", {}, line.title),
          open && now && (step?.line.id === line.id ? h("small", { class: "game-log-tracking" }, "追踪中") : h("button", { class: "link-btn", type: "button", onclick: () => { quests.track(line.id); renderTracker(); drawTownIfFree(); renderLog(); } }, "追踪这条"))),
        h("p", { class: "game-panel-note" }, open ? line.subtitle : `🔒 完成「${lock?.title || "前面的章节"}」后解锁`),
        open && h("ol", { class: "game-log" },
          ...line.chapters.map((chapter) => {
            const done = quests.chapterDone(line, chapter);
            const current = now?.chapter === chapter;
            const making = chapter.ready === false;
            return h("li", { class: done ? "done" : current ? "now" : making ? "making" : "" }, h("span", { class: "game-log-mark", "aria-hidden": "true" }, done ? "✓" : current ? "▶" : "·"), chapter.title, (making || waiting === chapter) && h("small", {}, ` ${waiting === chapter ? quests.waitReason(chapter) : "制作中"}`));
          })));
    };
    overlay.replaceChildren(
      h("div", { class: "game-panel-head" }, h("h2", {}, "任务日志"), h("button", { class: "btn small", type: "button", onclick: closeOverlay }, icon("close", { size: 14 }), "关闭（J）")),
      h("p", { class: "game-panel-note" }, "偏好：", h("b", {}, FOCUSES[quests.focus]?.label || "平衡"), " · 基础：", h("b", {}, DIFFICULTIES[quests.difficulty] ? `${DIFFICULTIES[quests.difficulty].label}（${DIFFICULTIES[quests.difficulty].level}）` : "未选"), " ", h("button", { class: "link-btn", type: "button", onclick: () => chooseDifficulty(false) }, "更换")),
      step && h("div", { class: "game-log-now" }, h("small", {}, "当前任务"), h("b", {}, step.goal), h("span", {}, `${step.line.title} · ${step.chapter.title}`)),
      ...quests.lines.map(lineBlock),
      ...quests.badges().map((badge) => h("p", { class: "game-badge" }, `🏅 已获得徽章：${badge.label}`)),
      h("div", { class: "game-panel-foot" }, h("button", { class: "btn small", type: "button", onclick: () => {
        if (!window.confirm("要从头开始全部剧情吗？已完成的案子成绩会保留。")) return;
        quests.reset();
        closeOverlay();
        goTown();
      } }, "从头开始全部剧情")),
    );
  }
  /** A story step's mini-game in the panel; winning it completes the step (and the story goes on). */
  async function openMinigame(step) {
    target = null;
    keys.clear();
    dialogue.hidden = true;
    const closeup = CLOSEUPS[step.game];
    const door = closeup && spotData(closeup.spot)?.door;
    const game = createMinigame(step.game, {
      h,
      sound,
      difficulty: quests.difficulty || "normal",
      onWin: async ({ mistakes = 0 } = {}) => {
        closeOverlay();
        closeCloseup();
        cameraFocus = null;
        if (AFTER_GAME[step.game] && door && !room) await director.play(AFTER_GAME[step.game](door));
        quests.event("play", step.game);
        if (!mistakes) achievements.note({ type: "perfect", id: step.game });
      },
    });
    if (closeup && door && !room) {
      // Look at the spot, then show the game on the thing itself.
      // The close-up covers the lower half of the screen: keep the spot itself in the upper part.
      await director.play([{ camera: { x: door.x, y: door.y + 70 }, ms: 450 }]);
      cameraFocus = { x: door.x, y: door.y + 70 };
      followCamera();
      closeupEl.className = `game-closeup ${closeup.look}`;
      closeupEl.replaceChildren(
        h("div", { class: "game-closeup-head" }, h("b", {}, closeup.title), h("button", { class: "btn small", type: "button", onclick: () => {
          closeCloseup();
          director.play([{ camera: "player", ms: 400 }]);
        } }, "先不玩了")),
        game.el,
      );
      closeupEl.hidden = false;
      closeupEl.querySelector(".mg-input, button.mg-lamp:not([disabled]), button")?.focus({ preventScroll: true });
      return;
    }
    overlay.replaceChildren(
      h("div", { class: "game-panel-head" }, h("h2", {}, game.title), h("button", { class: "btn small", type: "button", onclick: closeOverlay }, icon("close", { size: 14 }), "先不玩了")),
      game.el,
    );
    overlay.hidden = false;
    overlay.querySelector("button:not([disabled])")?.focus({ preventScroll: true });
  }
  /** A short notice in the top middle (a skill learned, …); several stack up. */
  const toasts = h("div", { class: "game-toasts", role: "status", "aria-live": "polite" });
  shell.append(toasts);
  function toast(title, note = "", kind = "") {
    const el = h("div", { class: `game-toast ${kind}` }, h("b", {}, kind === "trophy" ? "★ " : "✦ ", title), note && h("small", {}, note));
    toasts.append(el);
    setTimeout(() => el.classList.add("leaving"), 3200);
    setTimeout(() => el.remove(), 3700);
  }

  /** 技能树 (K): the pixel RPG skill screen (game-skilltree.js). */
  function openSkills(tab = null) {
    if (!quests || windowOpen) return;
    // Already open: a different entry switches to its page, the same one closes.
    if (!overlay.hidden && overlay.querySelector(".st") && !tab) return closeOverlay();
    const whereOf = (stepId) => {
      for (const line of quests.lines) for (const chapter of line.chapters) for (const step of chapter.steps) if (step.id === stepId) return `${line.title} · ${chapter.title}：${step.goal}`;
      return "";
    };
    overlay.classList.add("skilltree");
    overlay.replaceChildren(renderSkillTree({
      h, stepDone: quests.stepDone, whereOf, onClose: closeOverlay,
      achievements: { list: ACHIEVEMENTS, got: achievements.got }, hasArt: has,
      drills: quests.drills, onDrill: startDrill, start: tab,
      playable: (caseId) => Boolean(cases().find((entry) => entry.id === caseId)?.game?.puzzle?.scene),
    }));
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.querySelector(".st-node.selected")?.focus({ preventScroll: true }));
  }
  function drawTownIfFree() {
    if (enabled && !windowOpen && stage.dataset.view === "town") drawTown();
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
    if (caseRoom) {
      caseRoom.session.close();
      caseRoom = null;
      const pendingDialogue=lineDone;lineDone=null;stopTyping();dialogue.hidden=true;pendingDialogue?.();
      sound.door();
    }
    if (place) sound.door();
    arrive();
    if (place) lastPlace = place;
    place = null;
    menu.hidden = true;
    if (lastPlace && regional() && regionOf(lastPlace)) region = regionOf(lastPlace);
    if (lastPlace && spotData(lastPlace)) Object.assign(player, { x: doorOf(lastPlace).x, y: doorOf(lastPlace).y + (regional() ? 4 : 10) });
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
    if (id === "noticeboard") return readNoticeBoard();
    const play = quests?.playAt(id);
    if (play) return openMinigame(play);
    if (ACTIONS[id]) return enter(id);
    if (id === "clocktower" && quests?.erasOpen().length) return openTimeMachine();
    // A story step may be waiting here; otherwise the place says what it is.
    if (spotData(id)?.soon || spotData(id)?.placeholder || spotData(id)?.label) {
      if (quests?.event("enter", id)) return;
      if (spotData(id).label) return say([{ text: spotData(id).label.line || `这里是${info(id).place}。现在没什么要帮忙的。`, face: "normal" }]);
      if (spotData(id).soon && regionData()?.era) return say([{ text: `「${info(id).place}」……现在进不去，以后再来看看吧。`, face: "thinking" }]);
      return say([{ text: spotData(id).placeholder?.line || `「${info(id).place}」还在装修，过段时间就开门了。到时候我带你来！`, face: "thinking" }]);
    }
    const practice=cases().find(c=>c.id===id && c.game?.practice);
    if(practice) return enterTransferPractice(practice);
    if (!inDemo(id)) return say([{ text: `「${info(id).place}」的委托要等正式版才能接。这次先帮委托板上的三位吧！`, face: "thinking" }]);
    // A puzzle case is played in the client's room itself.
    const puzzleCase = cases().find((c) => c.id === id && c.game?.puzzle);
    if (puzzleCase) return enterCaseRoom(puzzleCase);
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

  function enterTransferPractice(item) {
    const quest=PROLOGUE_QUESTS.find(q=>q.id===item.id);
    if(!quest || !['available','done'].includes(questStatus(quest)))return toast('先和委托人聊聊，并完成对应基础练习。');
    menu.hidden=true;dialogue.hidden=true;keys.clear();target=null;prompt.hidden=true;
    overlay.classList.add('transfer-overlay');overlay.hidden=false;
    const close=restart=>{closeOverlay();syncQuestTracker();if(restart)enterTransferPractice(item);};
    overlay.replaceChildren(mountTransfer({h,item,onClose:close,onComplete:result=>{
      const progress=loadProgress();
      const previous=progress.completed[item.id];
      progress.completed[item.id]=previous?.independent && !result.independent ? previous : result;
      progress.accepted=progress.accepted.filter(id=>id!==item.id);saveProgress(progress);syncQuestTracker();
      achievements.note({type:'side',done:PROLOGUE_QUESTS.filter(q=>q.tier==='side' && progress.completed[q.id]).length});
      toast('修复副本与证据已保存');
    }}));
  }

  /* ----- a puzzle case in the client's room (case-session.js does the case itself) ----- */
  const caseSessions = new Map(); // "case id" or "case id:drill:<drill id>" -> session, kept while out and back in
  let caseRoom = null; // { id, item, session } while inside
  const caseBusy = () => Boolean(caseRoom?.session.busy);
  const caseKey = (item, drill) => (drill ? `${item.id}:drill:${drill.id}` : item.id);
  /** 复勘: the same room, with the story hints taken away and its own record (docs/progression.md). */
  function startDrill(drill, skill) {
    const item = cases().find((entry) => entry.id === caseFor(skill.id));
    if (!item?.game?.puzzle?.scene) return toast("这一关还没做成能走进去的房间，复勘要等它上线。");
    closeOverlay();
    enterCaseRoom(item, drill);
  }
  function enterCaseRoom(item, drill = null) {
    closeWindow();
    arrive();
    sound.door();
    target = null;
    keys.clear();
    menu.hidden = true;
    lastPlace = item.id;
    place = null;
    const key = caseKey(item, drill);
    if (!caseSessions.has(key)) {
      caseSessions.set(key, createCaseSession({
        h, icon, item, layer: caseLayer, drill,
        ui: {
          difficulty: quests?.difficulty || "normal",
          tools: detectiveTools(),
          say: (texts) => {
            dialogue.classList.add("over-window");
            return sayAndWait(texts).then(() => dialogue.classList.remove("over-window"));
          },
          sound,
          toast: (text) => toast(text),
          has,
          portraits: () => art().portraits,
          navigate: navigateCaseThing,
          active: () => caseRoom?.id === item.id,
          onBusy: (busy) => {
            keys.clear();
            target = null;
            prompt.hidden = true;
            nearDoor = null;
            hud.classList.toggle("under-case", busy);
            // 进到现场里，追踪条让位给案件界面；出来再挂回去。
            if (busy) questTracker.hidden = true;
            else syncQuestTracker();
          },
          onSolved: (stars) => {
        const progress = markCompleted(loadProgress(), item.id);
        saveProgress(progress);
        syncQuestTracker(); // 结案了，左上角那条追踪就该收起来
        achievements.note({ type: "case", stars });
        if (!item.game?.puzzle?.confront) achievements.note({ type: "claim", kind: "insufficient" });
        const active = PROLOGUE_QUESTS;
        achievements.note({ type: "board", done: active.filter((quest) => quest.tier !== "side" && progress.completed[quest.id]).length });
        achievements.note({ type: "side", done: active.filter((quest) => quest.tier === "side" && progress.completed[quest.id]).length });
        return drill ? quests?.recordDrill(drill.id, stars) : quests?.event("solve", item.id);
      },
        },
      }));
    }
    caseRoom = { id: item.id, item, drill, session: caseSessions.get(key) };
    drawCaseRoom();
    caseRoom.session.arrive();
  }
  function drawCaseRoom(keepPlace = false) {
    water?.stop();
    worldEl = null;
    nearDoor = null;
    const { item, session } = caseRoom;
    const puzzle = item.game.puzzle;
    stage.dataset.view = "case";
    room = { ...ROOM_DEFAULT, ...puzzle.room, items: puzzle.scene.items };
    if (!keepPlace) Object.assign(player, { x: room.spawn.x, y: room.spawn.y, walking: false });
    target = null;
    const picture = puzzle.scene.art && has(puzzle.scene.art);
    // Calibrated rooms are the 16:9 backgrounds drawn on the same 320x180 grid: the anchors in the case
    // data are measured against the picture itself, so props, actors and collisions share one scale.
    const calibrated = Boolean(puzzle.scene.art && puzzle.scene.art.startsWith("case-room-"));
    const who = item.game.client;
    roomEl = h("div", { class: `game-room case-room${calibrated ? " calibrated-room" : ""}` },
      picture ? h("img", { class: "game-bg art", src: `/art/pixel/${puzzle.scene.art}.png`, alt: "" }) : h("div", { class: `game-bg drawn case-room-bg ${puzzle.scene.look || "dorm"}`, "aria-hidden": "true" }, h("span", { class: "window" }), h("span", { class: "bed" }), h("span", { class: "desk" }), h("span", { class: "shelf" }), h("span", { class: "rug" })),
      ...puzzle.scene.items.map((thing) => session.propEl(thing)),
      h("button", { type:'button',class: `case-npc ${who.portrait}`, style: `left:calc(${room.client.x}px * var(--px));top:calc(${room.client.y}px * var(--px));z-index:${room.client.y}`, 'aria-label':`和${who.name}说话`,onclick:()=>navigateCaseThing('client') }, has(`anim-${who.portrait}`) ? h("span", { class: `case-client-sheet ${who.portrait}`, 'aria-hidden':'true', style: `background-image:url(/art/pixel/anim-${who.portrait}${has(`anim-${who.portrait}-case`) ? "-case" : ""}.png)` }) : h("span", { class: "game-sprite drawn",'aria-hidden':'true' }, h("i", {}), h("b", {}), h("u", {})), h("small", {}, who.name)),
      h("span", { class: "case-door", style: `left:calc(${room.exit.x}px * var(--px));top:calc(${room.exit.y}px * var(--px))`, "aria-hidden": "true" }),
      (playerEl = has("anim-lumi") ? h("span", { class: "game-sprite player sheet indoor", style: `background-image:url(/art/pixel/${has("anim-lumi-unified") ? "anim-lumi-unified" : "anim-lumi-case"}.png)`, "aria-hidden": "true" }) : sprite("lumi", 0, "player indoor")));
    stage.replaceChildren(roomEl, h("div", { class: "game-place-sign" }, icon("scan", { size: 16 }), puzzle.scene.place), session.hud,session.guide);
    placePlayer();
    animate(0, 0, 0);
  }
  function navigateCaseThing(key) {
    if(!caseRoom||caseRoom.session.busy||!dialogue.hidden)return;
    const current=caseRoom;
    const thing=key.startsWith('item:')&&room.items.find(x=>x.id===key.slice(5));
    const point=key==='client'?room.client:key==='exit'?room.exit:thing?{x:thing.stand?.[0]??thing.at[0],y:thing.stand?.[1]??Math.max(room.top+4,thing.at[1]+4)}:null;
    if(!point)return;
    walkTo(point,()=>{
      if(caseRoom!==current||current.session.busy||!dialogue.hidden)return;
      nearDoor=key;usePrompt();
    });
  }
  const leaveCaseRoom = () => goTown();

  function enter(id) {
    closeWindow();
    arrive();
    sound.door();
    target = null;
    keys.clear();
    place = id;
    menu.hidden = true;
    drawRoom(id);
    quests?.event("enter", id);
    const story = takeQuestLines();
    if (demoEnding) {
      demoEnding = false;
      return say(story, null, () => playDemoEnding());
    }
    say([...story, { text: SCENES[id].line, face: "happy" }, { text: EXTRA_LINES[id], face: "thinking" }], () => roomMenu(id));
  }
  /* ----- 委托板与公告板：任务不是按章节发的，是自己接的（docs/quest-board.md） ----- */
  /* 进行中的委托：接了还没做完的，一直挂在左上角（像原神的任务追踪）。
     当面托付和世界遭遇的委托都不在板上，没有这条就会忘掉自己去哪儿。 */
  const questTracker = h("button", { class: "game-quest-track", type: "button" });
  questTracker.hidden = true;
  shell.append(questTracker);
  function activeQuests() {
    const progress = loadProgress();
    return PROLOGUE_QUESTS.filter((quest) => progress.accepted.includes(quest.id) && !progress.completed[quest.id]);
  }
  function syncQuestTracker() {
    const active = activeQuests();
    if (!active.length) {
      questTracker.hidden = true;
      return;
    }
    const quest = active[0];
    const region = regionOf(quest.caseId) || quest.at?.region;
    const where = region && REGIONS[region]?.name ? REGIONS[region].name : "镇上";
    questTracker.hidden = false;
    questTracker.title = `进行中的委托：${active.map((one) => one.title).join("、")}（点一下出发）`;
    questTracker.onclick = () => {
      const here = regionOf(quest.caseId);
      if (here && here !== currentRegionName()) switchRegion(here);
      return enterSpot(quest.caseId);
    };
    questTracker.replaceChildren(
      h("span", { class: "game-quest-dot", "aria-hidden": "true" }),
      h("b", {}, quest.title),
      h("small", {}, `${quest.giver} · ${where}`),
      // h() 会把 null 子节点当文本渲染，所以用展开而不是 ?: null
      ...(active.length > 1 ? [h("i", {}, `+${active.length - 1}`)] : []),
    );
  }
  /** 广场的公告板：做完的委托越多，贴出来的条子越多（quest-progress.js 的 noticesFor）。 */
  function readNoticeBoard() {
    const { progress, notices, fresh } = readNotices(loadProgress());
    if (fresh.length) saveProgress(progress);
    return say([
      { text: fresh.length ? "公告板上又贴了新条子：" : "公告板上的条子：", face: "normal" },
      ...(notices.length ? notices.map((notice) => ({ text: notice.text, face: "normal" })) : [{ text: "现在还没有新告示。去镇上和人聊聊吧。", face: "thinking" }]),
    ]);
  }

  /** 事务所的委托板：一块软木板。**不是所有委托都在板上**——委托人当面托付的、走到那儿撞上的，都不贴这儿。 */
  const BOARD_GROUPS = [
    { key: "accepted", title: "进行中", hint: "接了还没做完，点一下回去" },
    { key: "available", title: "现在能接", hint: "挑一份，直接去现场" },
    { key: "locked", title: "还差一点", hint: "先把前面的事做完" },
    { key: "undiscovered", title: "还没听说", hint: "去广场看公告板，或者和镇上的人聊聊" },
    { key: "done", title: "已结案", hint: "" },
  ];

  function openQuestBoard() {
    const progress = loadProgress();
    const player = playerFor(progress, PROLOGUE_QUESTS);
    // 板上只贴「委托人自己贴过来」的那几份（take: "board"）。
    const lines = boardLines(PROLOGUE_QUESTS.filter(onBoard), player);
    // 已接未完成的，不管从哪儿接的，都在板上留一张（当作追踪）。
    for (const quest of PROLOGUE_QUESTS) {
      if (!progress.accepted.includes(quest.id) || progress.completed[quest.id]) continue;
      if (lines.some((line) => line.id === quest.id)) continue;
      lines.unshift({ id: quest.id, title: quest.title, giver: quest.giver, status: "accepted", reason: "", teaches: "", gain: { score: 0 } });
    }
    const elsewhere = PROLOGUE_QUESTS.filter((quest) => !onBoard(quest) && !progress.completed[quest.id]).length;
    const picks = (line) => {
      menu.hidden = true;
      if (line.status === "available" || line.status === "accepted") return enterSpot(line.id);
      const why =
        line.status === "done"
          ? "这份委托已经结案了。"
          : line.status === "locked"
            ? `还接不了：${line.reason}`
            : "还没听说这件事。去广场的公告板看看，或者问问镇上的人。";
      return say([{ text: why, face: "thinking" }]);
    };
    /** 没听说的委托只留一张空白条：剧透标题，就没有「打听到」这件事了。 */
    const prettyReason = (reason) =>
      reason
        .replace(/^先完成 (.+)$/, (_, id) => `先做完「${PROLOGUE_QUESTS.find((q) => q.id === id)?.title ?? id}」`)
        .replace(/^(.+?) 要到 (L\d)$/, (_, id, lv) => `${KNOWLEDGE_POINTS[id]?.split("（")[0] ?? id} 得先到 ${lv}`);
    const note = (line) => {
      const unknown = line.status === "undiscovered";
      const giver = unknown ? "" : `${line.giver} 托的`;
      const bottom = unknown
        ? "还没听说"
        : line.status === "done"
          ? "已结案"
          : line.status === "locked"
            ? `还差：${prettyReason(line.reason)}`
            : line.status === "accepted"
              ? "进行中 · 回去接着查"
              : "按一下就出发";
      return h("button", { class: `quest-note ${line.status}`, type: "button", role: "menuitem", onclick: () => picks(line) },
        h("span", { class: "quest-pin", "aria-hidden": "true" }),
        h("b", {}, unknown ? "？" : line.title),
        h("small", {}, giver),
        h("span", { class: "quest-note-foot" }, bottom));
    };
    menu.hidden = false;
    menu.replaceChildren(
      h("div", { class: "quest-board" },
        h("div", { class: "quest-board-head" },
          h("b", {}, "委托板"),
          h("small", {}, elsewhere ? `这块板上只贴主动来找事务所的——还有 ${elsewhere} 件事，得在镇上遇到人、或者自己撞上。` : "任务不是按顺序发的，是自己挑的")),
        ...BOARD_GROUPS.map((group) => {
          const rows = lines.filter((line) => line.status === group.key);
          if (!rows.length) return null;
          return h("section", { class: `quest-group ${group.key}` },
            h("h4", {}, group.title, group.hint ? h("span", {}, group.hint) : null),
            h("div", { class: "quest-notes" }, ...rows.map(note)));
        }).filter(Boolean),
        h("button", { class: "game-choice", type: "button", role: "menuitem", onclick: () => (menu.hidden = true) }, h("span", { class: "game-cursor", "aria-hidden": "true" }, "▶"), "先把板子关上")),
    );
    menu.querySelector(".quest-note.available, .quest-note, button")?.focus({ preventScroll: true });
  }

  function roomMenu(id) {
    showMenu([
      ...(id === "home" ? [{ label: "委托板：看看现在能接什么", run: openQuestBoard }] : []),
      ...ACTIONS[id].filter((action) => !action.when || action.when()).map((action) => ({ label: action.label, run: () => openWindow(id, action) })),
      { label: "随便走走", run: () => (menu.hidden = true) },
      { label: "回小镇地图", run: goTown },
    ]);
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
      syncQuestTracker();
      if (quests && (!quests.difficulty || !quests.focus)) chooseDifficulty(true);
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
    // Hold Shift to run: big maps are fine to cross, as long as walking them is not a chore.
    if (key === "shift") {
      keys.add("shift");
      return;
    }
    // In a case room, the case's screens take their keys first (N: the notebook, Escape: close).
    if (caseRoom && dialogue.hidden && caseRoom.session.key(event)) {
      event.preventDefault();
      return;
    }
    if (caseBusy()) {
      if ((event.key === "Enter" || event.key === " ") && !dialogue.hidden && !event.target.closest?.("button,input")) {
        event.preventDefault();
        dialogue.click();
      }
      return;
    }
    if (KEY_DIRS[key] && !windowOpen && (stage.dataset.view === "town" || room) && overlay.hidden && mapPanel.hidden && closeupEl.hidden && !director.playing) {
      event.preventDefault();
      if (sittingOn) sittingOn = null; // 站起来才能走
      if (!keys.has(key)) startWalking();
      keys.add(key);
      return;
    }
    if (!closeupEl.hidden) {
      if (event.key === "Escape") {
        closeCloseup();
        director.play([{ camera: "player", ms: 400 }]);
      }
      return;
    }
    if (director.playing) {
      if ((event.key === "Enter" || event.key === " ") && !dialogue.hidden) {
        event.preventDefault();
        dialogue.click();
      }
      return;
    }
    if (!overlay.hidden) {
      if (event.key === "Escape" || (key === "j" && overlay.querySelector(".game-log")) || ((key === "k" || key === "r") && overlay.querySelector(".st"))) closeOverlay();
      return;
    }
    if (key === "r" && !windowOpen && quests) {
      event.preventDefault();
      openSkills("drills");
      return;
    }
    if (key === "k" && !windowOpen && quests) {
      event.preventDefault();
      openSkills();
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
    if ((key === "e" || event.key === "Enter" || event.key === " ") && (nearDoor || nearScenery) && !windowOpen && dialogue.hidden && !event.target.closest?.("button,a")) {
      event.preventDefault();
      usePrompt();
      return;
    }
    if (event.key === "Escape") {
      if (windowOpen) closeWindow();
      else if (place) goTown();
      else if (caseRoom) return;
    } else if ((event.key === "Enter" || event.key === " ") && !dialogue.hidden && (!windowOpen || dialogue.classList.contains("over-window")) && (event.target === document.body || event.target.closest?.(".game-window,.game-dialogue"))) {
      event.preventDefault();
      dialogue.click();
    }
  });

  return {
    sync,
    /** Whether lines can be spoken in the dialogue box now (the game is on). */
    canTalk: () => enabled,
    /** Speak lines in the dialogue box, above the game window if one is open; resolves when clicked through. */
    talk(texts) {
      dialogue.classList.add("over-window");
      return sayAndWait(texts).then(() => dialogue.classList.remove("over-window"));
    },
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
      if (caseRoom) drawCaseRoom(true);
      else if (place) drawRoom(place);
      else drawTown();
      if (!dialogue.hidden && lines.length) renderLine(lineIndex >= lines.length - 1 ? null : lineAfter);
    },
  };
}
