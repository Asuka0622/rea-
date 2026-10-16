import { SCENES } from "./scenes.js";
import { regionLinks, regionSpotAnchor, regionViewportRect, REGION_SIZE, REGIONS as REGION_LAYOUT } from "./game-regions.js";

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

/** Separate, roomy maps; their points are normalized to each 960x540 illustration. */
const REGIONS = [
  {
    id: "center", label: "小镇中心", file: "town-center", note: "图书馆、事务所、工具铺、驿站和诊所",
    places: [
      { type: "scene", id: "learn", spotKey: "learn" }, { type: "scene", id: "home", spotKey: "home" },
      { type: "scene", id: "engines", spotKey: "engines" }, { type: "scene", id: "clients", spotKey: "clients" },
      { type: "scene", id: "doctor", spotKey: "doctor" },
    ],
    actors: [
      { id: "librarian", scene: "learn", label: "书奶奶", x: 29, y: 38 },
      { id: "smith", scene: "engines", label: "铁叔", x: 84, y: 39 },
      { id: "postman", scene: "clients", label: "阿信", x: 18, y: 66 },
      { id: "doctor", scene: "doctor", label: "白医生", x: 85, y: 68 },
      { id: "archivist", room: "archive", label: "老秦", x: 36, y: 41, line: "真实故事里的文件版本、时间和来源，是核查过程的起点。" },
      { id: "kid", label: "放风筝的孩子", x: 48, y: 76, wander: true, phase: 1, line: "碰到复杂问题时，先拆成几件小事，一件件看清楚。" },
      { id: "vendor", label: "卖菜的大婶", x: 67, y: 77, wander: true, phase: 4, line: "新旧版本要分开放，别把不同来源的线索混在一只篮子里。" },
    ],
    animals: [
      { id: "cat", label: "橘猫", x: 55, y: 58, w: 18, h: 18, reactionRow: 2, line: "橘猫在长椅边摆了摆尾巴，又舒服地眯起眼睛。" },
      { id: "pigeon", label: "白鸽", x: 20, y: 48, w: 18, h: 15, reactionRow: 1, line: "白鸽停在驿站屋檐上，像是在等阿信送出下一封信。" },
    ],
  },
  {
    id: "homes", label: "居民区", file: "town-homes", note: "镇民住家和农场委托",
    places: [
      { type: "case", id: "privacy-ledger", spotKey: "privacy-ledger" }, { type: "case", id: "weather-keys", spotKey: "weather-keys" },
      { type: "case", id: "calculator-eggs", spotKey: "calculator-eggs" }, { type: "case", id: "farm-save", spotKey: "farm-save" },
      { type: "case", id: "flashlight-apk", spotKey: "flashlight-apk" }, { type: "case", id: "real-stories", spotKey: "real-stories" },
    ],
    actors: [
      { id: "jogger", label: "晨跑的姐姐", x: 49, y: 64, wander: true, phase: 2, line: "每天记下一点变化，过一阵再回看，就容易发现异常。" },
      { id: "kobayashi", label: "小林", x: 42, y: 38, line: "记账时我会先核对记录日期，再看每一项到底对应哪个版本。" },
      { id: "azhe", label: "阿哲", x: 78, y: 37, line: "分析程序时，先找清楚它从哪里读取设置，再追后面的流程。" },
      { id: "xiaoyu", label: "小雨", x: 25, y: 62, line: "我在旧版本里发现了小彩蛋；比较版本时记得把文件先备份好。" },
      { id: "duoduo", label: "朵朵", x: 84, y: 62, line: "动存档之前先做一份备份，再看每个文件记录的内容。" },
      { id: "grandma", label: "王奶奶", x: 50, y: 85, line: "手机亮得太快啦，能帮我看看它什么时候偷偷开了手电筒吗？" },
    ],
    animals: [
      { id: "dog", label: "柴犬", x: 62, y: 46, w: 20, h: 20, reactionRow: 1, line: "柴犬摇着尾巴跑过来，正等着小男孩带它去散步。" },
      { id: "chicken", label: "小鸡", x: 88, y: 57, w: 12, h: 12, reactionRow: 2, line: "小鸡低头啄了两下米，又抬头看看农场的主人。" },
    ],
  },
  {
    id: "craft", label: "工艺街", file: "town-craft", note: "美术工作室、游戏街机厅、木工坊和手办店",
    places: [
      { type: "interior", id: "studio", spotKey: "painter", title: "美术工作室", person: "彩姐", text: "彩姐把常用的创作工具分门别类地挂在墙上，等着带你认识数字创作。" },
      { type: "interior", id: "arcade", spotKey: "arcade", title: "游戏街机厅", person: "像素哥", text: "像素哥收藏了不少真实游戏 Mod，想看懂它们，可以从一个小改动开始。" },
      { type: "interior", id: "woodshop", spotKey: "woodshop", title: "木工坊", person: "阿木", text: "阿木喜欢先量尺寸、画草图，再把零件一步一步搭起来。" },
      { type: "tip", spotKey: "figures", title: "手办店", person: "缝缝", text: "缝缝会用手边的材料做角色模型；这里还有可选的模型 Mod 拓展。" },
    ],
    actors: [
      { id: "painter", room: "studio", label: "彩姐", x: 27, y: 39, line: "想做出自己的作品吗？先选一个顺手的创作工具，再从一张小画开始。" },
      { id: "gamer", room: "arcade", label: "像素哥", x: 85, y: 35, line: "研究 Mod 时，先确认原作版本和 Mod 版本，再逐项查看它改了什么。" },
      { id: "carpenter", room: "woodshop", label: "阿木", x: 40, y: 70, line: "做东西先量好尺寸、画草图，再按步骤把零件搭起来。" },
    ],
  },
  {
    id: "north", label: "北岸办公区", file: "town-north", note: "周姐的办公楼和版本侦探委托",
    places: [
      { type: "case-order", order: 5, spotKey: "office", fallback: { title: "周姐的办公楼", person: "周姐", text: "周姐把版本号、日期和便签整理在一起，教你循着变化找到线索。" } },
      { type: "tip", spotKey: "clocktower", title: "停摆的钟楼", person: "铁叔", text: "钟楼的门锁着，门上刻着一串 0 和 1。等铁叔回来，我们再想办法打开它。" },
    ],
    actors: [{ id: "clerk", room: "office", label: "周姐", x: 59, y: 42, line: "核对版本差异时，把时间、编号和对应记录放在一张表里。" }],
  },
  {
    id: "south", label: "南岸自然区", file: "town-south", note: "跨桥树林、钓鱼码头和野餐草坪",
    places: [
      { type: "tip", title: "钓鱼码头", person: "钓鱼的老人", text: "老人提醒你：调查时先记下证据从哪里来，再判断它能说明什么。", x: 73, y: 39 },
      { type: "tip", title: "野餐草坪", person: "放风筝的孩子", text: "孩子说，遇到复杂问题时先拆成几件小事，会更容易看清楚。", x: 18, y: 62 },
      { type: "tip", title: "林间小路", person: "街头吉他手", text: "吉他手哼着轻快的曲子：遇到不确定的地方，回到原始线索再核对一次。", x: 81, y: 72 },
    ],
    actors: [
      { id: "fisher", label: "钓鱼的老人", x: 62, y: 45, wander: true, phase: 3, line: "先记清线索从哪里来，再判断它能说明什么。" },
      { id: "musician", label: "街头吉他手", x: 51, y: 73, wander: true, phase: 5, line: "遇到不确定的地方，就回到原始线索再核对一次。" },
    ],
    animals: [
      { id: "duck", label: "鸭子", x: 92, y: 22, w: 22, h: 11, reactionRow: 1, line: "鸭子在河湾里慢悠悠地划水，带起一圈圈小波纹。" },
      { id: "butterfly", label: "蝴蝶", x: 39, y: 65, w: 14, h: 14, reactionRow: 2, line: "蝴蝶在花丛上轻轻扇动翅膀，绕着野餐垫飞了一圈。" },
    ],
  },
];

const WORLD_STATES = {
  season: { spring: "春", summer: "夏", autumn: "秋", winter: "冬" },
  weather: { clear: "晴", rain: "雨", snow: "雪" },
  time: { morning: "早晨", noon: "中午", sunset: "傍晚夕阳", night: "夜晚" },
};
const ROOM_SCENES = {
  studio: { place: "美术工作室", purpose: "数字创作", icon: "learn", speaker: "painter", line: "颜料、纸张和屏幕上的画布各有用处；选一件顺手的工具，从小作品开始。" },
  arcade: { place: "游戏街机厅", purpose: "游戏与 Mod", icon: "scan", speaker: "gamer", line: "先确认游戏和 Mod 的版本，再把改动逐项比对。" },
  woodshop: { place: "木工坊", purpose: "搭建练习", icon: "wrench", speaker: "carpenter", line: "动手之前先量尺寸、画草图，确认每个部件怎么连接。" },
  office: { place: "周姐的办公室", purpose: "版本侦探", icon: "scan", speaker: "clerk", line: "把版本号、日期和记录放在一起，变化就更容易看清。" },
  archive: { place: "小镇档案馆", purpose: "真实世界故事", icon: "learn", speaker: "archivist", line: "先确认记录的来源和时间，再判断材料能说明什么。" },
};
// Window rectangles are percentages of each 320x180 interior illustration. Weather overlays stay
// inside these panes so rain and snow never appear over indoor furniture.
const ROOM_WINDOWS = {
  home: [[0, 3, 20, 50], [88, 5, 12, 45]],
  learn: [[0, 4, 19, 52], [90, 4, 10, 45]],
  engines: [[0, 3, 20, 50]],
  clients: [[0, 3, 20, 50]],
  doctor: [[0, 3, 20, 55], [91, 3, 9, 52]],
  studio: [[8, 2, 28, 34]],
  arcade: [[76, 2, 20, 34]],
  woodshop: [[5, 2, 24, 34]],
  office: [[72, 2, 23, 36]],
  archive: [[0, 2, 26, 38]],
};
const WORLD_STATE_KEY = "rea-wb-world-state";

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

export function createGameShell({ h, icon, showTab, isPro, setMode, art, cases = () => [], startCase = () => {} }) {
  const root = document.documentElement;
  const main = document.querySelector("main");
  const mainHome = { parent: main.parentNode, next: main.nextSibling };
  let place = null; // null = on the town map
  let lines = [];
  let lineIndex = 0;
  let lineAfter = null;
  let windowOpen = false;
  let enabled = false;
  let regionId = "center";
  let mapPanel = null;
  let worldState = { season: "autumn", weather: "clear", time: "noon" };
  try {
    const saved = JSON.parse(localStorage.getItem(WORLD_STATE_KEY) || "null");
    if (saved && WORLD_STATES.season[saved.season] && WORLD_STATES.weather[saved.weather] && WORLD_STATES.time[saved.time]) worldState = saved;
  } catch {}

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
    h("button", { class: "btn small", type: "button", onclick: () => openMap() }, icon("compass", { size: 14 }), "区域地图（M）"),
    h("button", { class: "btn small", type: "button", onclick: () => { statePanel.hidden = !statePanel.hidden; } }, icon("sun", { size: 14 }), "季节与天气"),
    h("button", { class: "btn small", type: "button", onclick: () => document.querySelector("#open-glossary")?.click() }, icon("glossary", { size: 14 }), "小词典"),
    h("button", { class: "btn small", type: "button", onclick: () => document.querySelector("#theme-toggle")?.click() }, icon("sun", { size: 14 }), "界面主题"),
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

  const stateBadge = h("span", { class: "game-state-badge", "aria-live": "polite" });
  const stateSelect = (kind) => h("select", {
    value: worldState[kind],
    "aria-label": kind === "season" ? "季节" : kind === "weather" ? "天气" : "时段",
    onchange: (event) => setWorldState(kind, event.target.value),
  }, ...Object.entries(WORLD_STATES[kind]).map(([value, label]) => h("option", { value, selected: worldState[kind] === value }, label)));
  const statePanel = h("section", { class: "game-state-panel", role: "dialog", "aria-label": "季节、天气和时段" },
    h("div", { class: "game-state-head" }, h("b", {}, "小镇时令"), h("button", { class: "btn small", type: "button", onclick: () => { statePanel.hidden = true; } }, "收起")),
    h("label", {}, "季节", stateSelect("season")),
    h("label", {}, "天气", stateSelect("weather")),
    h("label", {}, "时段", stateSelect("time")),
    h("small", {}, "区域地图与室内会同步切换；雨雪显示在室外和窗外，室内灯光随时段变化。"),
  );
  statePanel.hidden = true;
  shell.append(stateBadge, statePanel);
  function updateStateBadge() {
    stateBadge.textContent = `${WORLD_STATES.season[worldState.season]} · ${WORLD_STATES.weather[worldState.weather]} · ${WORLD_STATES.time[worldState.time]}`;
  }
  function setWorldState(kind, value) {
    if (!WORLD_STATES[kind]?.[value]) return;
    worldState = { ...worldState, [kind]: value };
    try { localStorage.setItem(WORLD_STATE_KEY, JSON.stringify(worldState)); } catch {}
    shell.dataset.season = worldState.season;
    shell.dataset.weather = worldState.weather;
    shell.dataset.time = worldState.time;
    updateStateBadge();
    statePanel.querySelectorAll("select").forEach((select) => { if (select.getAttribute("aria-label") === (kind === "season" ? "季节" : kind === "weather" ? "天气" : "时段")) select.value = value; });
    refreshStateScene();
    if (mapPanel && !mapPanel.hidden) renderMapPanel();
  }
  setWorldState("season", worldState.season);
  setWorldState("weather", worldState.weather);
  setWorldState("time", worldState.time);

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
  window.addEventListener("resize", () => { fit(); if (stage.dataset.view === "region") drawRegion(regionId); });
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

  function regionImage(region) {
    const variant = `${region.file}-${worldState.season}-clear-noon`;
    return `/art/pixel/regions/${worldState.season === "autumn" ? `${region.file}.png` : `${variant}.png`}`;
  }
  const regionViewport = () => ({ w: stage.clientWidth || REGION_SIZE.w, h: stage.clientHeight || REGION_SIZE.h });
  const mapRect = (rect) => regionViewportRect(rect, regionViewport());
  function regionBuildingOverlay(regionId, spotKey, file) {
    const spot = REGION_LAYOUT[regionId]?.spots?.[spotKey];
    if (!spot) return null;
    const rect = mapRect({ x: spot.door.x - 40, y: spot.door.y - 150, w: 80, h: 150 });
    return rect && h("img", { class: "game-region-building", src: `/art/pixel/regions/${file}`, alt: "", "aria-hidden": "true", style: `left:${rect.x}%;top:${rect.y}%;width:${rect.w}%;height:${rect.h}%` });
  }
  function roomImage(id) {
    const variant = `room-${id}-${worldState.season}-clear-noon`;
    return `/art/pixel/${has(variant) ? `${variant}.png` : `room-${id}.png`}`;
  }
  const outsideAtmosphere = (region = "town") => h("div", { class: `game-atmosphere outside ${worldState.weather} region-${region}`, "aria-hidden": "true" }, h("span", { class: "game-outdoor-lights" }));

  function destinations(region) {
    const anchorDoor = (spot) => {
      const door = spot.spotKey ? regionSpotAnchor(region.id, spot.spotKey) : null;
      return door ? { ...spot, mapX: door.x, mapY: door.y, doorAnchored: true } : spot;
    };
    return region.places.flatMap((spot) => {
      if (spot.type === "scene") {
        if (!SCENES[spot.id]) return [];
        return [anchorDoor({ ...spot, title: SCENES[spot.id].place, subtitle: SCENES[spot.id].purpose })];
      }
      if (spot.type === "case") {
        const item = cases().find((candidate) => candidate.id === spot.id);
        return item ? [anchorDoor({ ...spot, title: item.scene?.place || item.title, subtitle: `委托 · 案例 ${item.order ?? ""}` })] : [];
      }
      if (spot.type === "case-order") {
        const item = cases().find((candidate) => candidate.order === spot.order || /版本/.test(candidate.title || ""));
        return [anchorDoor(item ? { ...spot, type: "case", id: item.id, title: item.scene?.place || item.title, subtitle: `委托 · 案例 ${item.order ?? ""}` } : { ...spot, title: spot.fallback.title, subtitle: spot.fallback.person })];
      }
      return [anchorDoor({ ...spot, subtitle: spot.person })];
    });
  }
  function activateDestination(spot) {
    if (spot.type === "scene") return enter(spot.id);
    if (spot.type === "interior") return enterInterior(spot.id);
    if (spot.type === "case") return enterSpot(spot.id);
    const person = spot.person || spot.fallback?.person || "镇民";
    const line = spot.text || spot.fallback?.text || "这位镇民正忙着手头的事。";
    say([{ text: `${person}：${line}`, face: "happy" }]);
  }
  function drawRegion(id = regionId) {
    const region = REGIONS.find((item) => item.id === id) || REGIONS[0];
    regionId = region.id;
    worldEl = null;
    spotCache = null;
    target = null;
    nearDoor = null;
    prompt.hidden = true;
    stage.dataset.view = "region";
    const places = destinations(region);
    const exits = regionLinks(region.id, Object.fromEntries(REGIONS.map(({ id, label }) => [id, label])));
    stage.replaceChildren(h("div", { class: "game-region-view" },
      h("img", { class: "game-bg", src: regionImage(region), alt: `${region.label}像素地图` }),
      ...(region.id === "north" ? [regionBuildingOverlay("north", "clocktower", "north-clocktower-stopped.png")] : []),
      outsideAtmosphere(region.id),
      h("div", { class: "game-region-title" }, region.label),
      ...exits.map((exit) => {
        const point = mapRect({ x: exit.x / 100 * REGION_SIZE.w, y: exit.y / 100 * REGION_SIZE.h, w: 0, h: 0 });
        const x = Math.max(8, Math.min(92, point?.x ?? exit.x));
        const y = Math.max(12, Math.min(88, point?.y ?? exit.y));
        return h("button", {
          class: "game-region-pin game-region-exit", type: "button",
          style: `left:${x}%;top:${y}%`,
          onclick: () => chooseRegion(exit.to),
          "aria-label": `沿道路前往${exit.label}`,
        }, h("span", { class: "game-region-pin-icon", "aria-hidden": "true" }, "↗"), h("span", { class: "game-region-pin-label" }, `去${exit.label}`));
      }),
      ...places.map((spot) => {
        const x = spot.mapX ?? spot.x / 100 * REGION_SIZE.w;
        const y = spot.mapY ?? spot.y / 100 * REGION_SIZE.h;
        const point = mapRect({ x, y, w: 0, h: 0 });
        return h("button", {
          class: `game-region-pin ${spot.doorAnchored ? "door-pin" : ""} ${spot.type === "case" ? "case" : spot.type === "tip" || spot.type === "case-order" ? "tip" : ""}`,
          type: "button", style: point ? `left:${point.x}%;top:${point.y}%` : `left:${spot.x}%;top:${spot.y}%`, onclick: () => activateDestination(spot),
          "aria-label": `${spot.title}${spot.subtitle ? `，${spot.subtitle}` : ""}`,
        }, h("span", { class: "game-region-pin-icon", "aria-hidden": "true" }, spot.type === "case" ? "!" : spot.type === "scene" ? "▼" : "✦"), h("span", { class: "game-region-pin-label" }, spot.title));
      }),
      ...(region.actors || []).filter((actor) => has(`anim-${actor.id}`)).map((actor) => {
        const point = mapRect({ x: actor.x / 100 * REGION_SIZE.w, y: actor.y / 100 * REGION_SIZE.h, w: 0, h: 0 });
        return h("button", {
          class: `game-region-actor ${actor.id} ${actor.wander ? "wandering" : ""}`, type: "button", style: `left:${point?.x ?? actor.x}%;top:${point?.y ?? actor.y}%;--wander:calc(8px * var(--px));animation-delay:-${actor.phase || 0}s,-${actor.phase || 0}s;background-image:url(/art/pixel/anim-${actor.id}.png)`,
          onclick: () => actor.scene
            ? enter(actor.scene, actor)
            : actor.room
              ? enterInterior(actor.room, actor)
              : say([{ text: actor.line, face: "happy", speaker: actor.id, speakerName: actor.label }]),
          "aria-label": actor.scene ? `${actor.label}在门口，点击进入${SCENES[actor.scene].place}` : actor.room ? `${actor.label}，点击进入${ROOM_SCENES[actor.room].place}` : `${actor.label}，点击听一条提示`,
        });
      }),
      ...(region.animals || []).filter((animal) => has(`animal-${animal.id}`)).map((animal) => {
        const point = mapRect({ x: animal.x / 100 * REGION_SIZE.w, y: animal.y / 100 * REGION_SIZE.h, w: 0, h: 0 });
        return h("button", {
          class: `game-region-animal ${animal.id}`, type: "button",
          style: `left:${point?.x ?? animal.x}%;top:${point?.y ?? animal.y}%;--animal-frame-w:${animal.w}px;--animal-frame-h:${animal.h}px;--animal-row:0;background-image:url(/art/pixel/animal-${animal.id}.png)`,
          onclick: (event) => {
            const button = event.currentTarget;
            button.style.setProperty("--animal-row", String(animal.reactionRow ?? 1));
            clearTimeout(button.animalReactionTimer);
            button.animalReactionTimer = window.setTimeout(() => button.style.setProperty("--animal-row", "0"), 1800);
            say([{ text: animal.line, face: "happy", speaker: animal.id, speakerName: animal.label, spriteType: "animal", spriteSize: [animal.w, animal.h] }]);
          },
          "aria-label": `${animal.label}，点击看动作并听提示`,
        });
      }),
      h("div", { class: "game-region-tools" },
        h("button", { class: "btn small", type: "button", onclick: goTown }, "回起始小镇"),
        h("button", { class: "btn small", type: "button", onclick: openMap }, "切换区域"),
        h("button", { class: "btn small", type: "button", onclick: () => drawRegion(REGIONS[(REGIONS.findIndex((item) => item.id === region.id) + REGIONS.length - 1) % REGIONS.length].id) }, "‹ 上一区域"),
        h("button", { class: "btn small", type: "button", onclick: () => drawRegion(REGIONS[(REGIONS.findIndex((item) => item.id === region.id) + 1) % REGIONS.length].id) }, "下一区域 ›"),
      ),
    ));
  }

  function refreshStateScene() {
    if (stage.dataset.view === "region") drawRegion(regionId);
    else if (stage.dataset.view === "town") drawTown();
    else if (place) drawRoom(place);
    if (!dialogue.hidden && lines.length) renderLine(lineIndex >= lines.length - 1 ? null : lineAfter);
  }

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
      outsideAtmosphere(),
      ...Object.entries(spots()).map(([id, spot]) => {
        const scene = info(id);
        return h(
          "button",
          { class: `game-building ${picture ? "over-art" : spot.kind || "office"} ${TOWN[id] ? "" : "case-home"}`, type: "button", style: `--bx:${spot.x};--by:${spot.y};--bw:${spot.w};--bh:${spot.h}`, onclick: () => walkTo(doorOf(id)), "aria-label": `走到${scene.place}（${scene.purpose}）` },
          !picture && h("span", { class: "roof", "aria-hidden": "true" }),
          !picture && h("span", { class: "wall", "aria-hidden": "true" }, h("span", { class: "door" })),
          h("span", { class: "game-label" }, scene.place, h("small", {}, scene.purpose)),
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
    const scene = SCENES[id] || ROOM_SCENES[id];
    const picture = has(`room-${id}`);
    const windows = picture ? (ROOM_WINDOWS[id] || []) : [[11, 16, 18, 22]];
    stage.dataset.view = id;
    stage.replaceChildren(
      h("div", { class: `game-room room-${id} season-${worldState.season} time-${worldState.time} weather-${worldState.weather}` },
        picture ? h("img", { class: "game-bg", src: roomImage(id), alt: "" }) : h("div", { class: `game-bg drawn room ${id}`, "aria-hidden": "true" }, h("span", { class: "window" }), h("span", { class: "shelf" }), h("span", { class: "desk" })),
        h("span", { class: "game-interior-light", "aria-hidden": "true" }),
        ...windows.map(([left, top, width, height]) => h("span", {
          class: "game-window-weather", "aria-hidden": "true",
          style: `left:${left}%;top:${top}%;width:${width}%;height:${height}%`,
        })),
        sprite("lumi", 110)),
      h("div", { class: "game-place-sign" }, icon(scene.icon, { size: 16 }), scene.place),
    );
  }

  /* ----- dialogue: click or press Enter/Space to continue; choices when the lines run out ----- */
  // A line is "text" or { text, face }: the face picks Lumi's expression for that line.
  const portrait = (face = "normal", speaker = null, spriteType = "character", spriteSize = [16, 32]) => {
    if (speaker && spriteType === "animal" && has(`animal-${speaker}`)) {
      const [width, height] = spriteSize;
      return h("div", { class: "case-portrait game-dialogue-pixel-portrait", "aria-hidden": "true" },
        h("span", { class: "game-dialogue-pixel-frame", style: `width:${width * 2}px;height:${height * 2}px;background-size:${width * 8}px ${height * 6}px;background-image:url(/art/pixel/animal-${speaker}.png)` }));
    }
    if (speaker && has(`anim-${speaker}`)) {
      const width = spriteSize[0] * 3;
      const height = spriteSize[1] * 3;
      return h("div", { class: "case-portrait game-dialogue-pixel-portrait", "aria-hidden": "true" },
        h("span", { class: "game-dialogue-pixel-frame", style: `width:${width}px;height:${height}px;background-size:${width * 6}px ${height * 5}px;background-image:url(/art/pixel/anim-${speaker}.png)` }));
    }
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
      portrait(line.face, line.speaker, line.spriteType, line.spriteSize),
      h("div", { class: "case-say-text" }, h("b", {}, line.speakerName || "路米"), h("p", {}, line.text), !last && h("span", { class: "game-more" }, "点击继续")),
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
    const name = player.walking
      ? (clips[`walk-${facing}`] ? `walk-${facing}` : "walk")
      : (!dialogue.hidden && clips.talk ? "talk" : "idle");
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
  mapPanel = h("div", { class: "game-map", role: "dialog", "aria-label": "小镇地图" });
  mapPanel.hidden = true;
  shell.append(mapPanel);
  function renderMapPanel() {
    mapPanel.replaceChildren(
      h("div", { class: "game-map-head" }, h("h2", {}, "小镇区域"), h("button", { class: "btn small", type: "button", onclick: closeMap }, icon("close", { size: 14 }), "关闭（M）")),
      h("p", { class: "game-region-intro" }, "小镇分成几个宽敞的区域，点一张地图就能过去。地图和室内会跟随当前季节、天气与时段。"),
      h("div", { class: "game-region-cards" }, ...REGIONS.map((region) => h("button", {
        class: `game-region-card ${region.id === regionId ? "active" : ""}`, type: "button", onclick: () => chooseRegion(region.id),
        "aria-pressed": String(region.id === regionId),
      }, h("img", { src: regionImage(region), alt: "" }), h("b", {}, region.label), h("small", {}, region.note)))),
    );
  }
  function openMap() {
    if (windowOpen) return;
    renderMapPanel();
    mapPanel.hidden = false;
    mapPanel.querySelector(".game-region-card.active")?.focus({ preventScroll: true });
  }
  function closeMap() {
    mapPanel.hidden = true;
  }
  function chooseRegion(id) {
    regionId = REGIONS.some((region) => region.id === id) ? id : "center";
    closeMap();
    place = null;
    lastPlace = null;
    drawRegion(regionId);
    const region = REGIONS.find((item) => item.id === regionId);
    say([{ text: `到了${region.label}。${region.note}。点地图上的标记就能去对应地点。`, face: "happy" }]);
  }

  /* ----- navigation ----- */
  function goTown() {
    closeWindow();
    if (place) lastPlace = place;
    place = null;
    menu.hidden = true;
    if (lastPlace && (TOWN[lastPlace] || CASE_HOUSES[lastPlace])) Object.assign(player, { x: doorOf(lastPlace).x, y: doorOf(lastPlace).y + 10 });
    movedSinceSpawn = 0;
    target = null;
    nearDoor = null;
    prompt.hidden = true;
    drawTown();
    say([
      { text: "这里是我们的小镇。按方向键或 WASD 走到门口，也可以打开区域地图去逛更远的街区。", face: "happy" },
      {
        text: touch
          ? "用左下角轮盘走路，走到门口点「进入」；点左上角「区域地图」可以去居民区、工艺街和南岸。第一次来的话，先去事务所看看。"
          : "用方向键或 WASD 走路，右键点地面也能寻路；按 M 或点左上角「区域地图」去居民区、工艺街和南岸。第一次来的话，先去事务所看看。",
        face: "normal",
      },
    ]);
  }

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

  function enter(id, speaker = null) {
    closeWindow();
    target = null;
    keys.clear();
    place = id;
    menu.hidden = true;
    drawRoom(id);
    say([
      { text: SCENES[id].line, face: "happy" },
      { text: speaker?.line || EXTRA_LINES[id], face: "thinking", speaker: speaker?.id, speakerName: speaker?.label },
    ], () =>
      showMenu([
        ...ACTIONS[id].filter((action) => !action.when || action.when()).map((action) => ({ label: action.label, run: () => openWindow(id, action) })),
        { label: "回小镇地图", run: goTown },
      ]),
    );
  }

  function enterInterior(id, speaker = null) {
    const scene = ROOM_SCENES[id];
    if (!scene) return;
    target = null;
    keys.clear();
    place = id;
    lastPlace = null;
    menu.hidden = true;
    const resident = speaker || REGIONS.flatMap((region) => region.actors || []).find((actor) => actor.id === scene.speaker);
    drawRoom(id);
    say([
      { text: scene.line, face: "happy" },
      { text: resident?.line || scene.line, face: "thinking", speaker: resident?.id, speakerName: resident?.label },
    ], () => showMenu([{ label: "回到区域地图", run: () => {
      place = null;
      menu.hidden = true;
      dialogue.hidden = true;
      drawRegion(regionId);
      const region = REGIONS.find((item) => item.id === regionId);
      say([{ text: `回到了${region.label}。`, face: "happy" }]);
    } }]));
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
      enterSpot(nearDoor);
      return;
    }
    if (event.key === "Escape") {
      if (!statePanel.hidden) statePanel.hidden = true;
      else if (windowOpen) closeWindow();
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
      if (stage.dataset.view === "region") drawRegion(regionId);
      else if (place) drawRoom(place);
      else drawTown();
      if (!dialogue.hidden && lines.length) renderLine(lineIndex >= lines.length - 1 ? null : lineAfter);
    },
  };
}
