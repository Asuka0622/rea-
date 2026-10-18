// 小游戏的图（public/art/pixel/minigames/）：有图用图，没图用代码画的兜底。
// 美术交了哪些图，开机后才从 /api/art 拿到——比小游戏挂上来晚——所以问 hasMiniArt()，
// 拿到答案时再重画一次。（case-minigames.js 里有一份同样的，拆出来的小游戏用这一份。）

let miniArt = null;
const waiting = new Set();
if (typeof location !== "undefined" && typeof document !== "undefined") {
  const token = document.querySelector('meta[name="workbench-token"]')?.content;
  fetch("/api/art", { cache: "no-cache", headers: token ? { "X-Workbench-Token": token } : {} })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)
    .then((data) => {
      miniArt = new Set(data?.pixel || []);
      for (const paint of waiting) paint();
      waiting.clear();
    });
}

export const hasMiniArt = (id) => Boolean(miniArt?.has(`minigames/${id}`));
export const whenMiniArt = (paint) => (miniArt === null ? waiting.add(paint) : paint());

/** 一张图：美术交了就显示，没交就是空的 <img>。 */
export function artImg(h, id, className) {
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

// 精灵表带一个 JSON，写着帧大小和每一行是什么动作。只加载一次，而且只在美术交了这张表时才加载。
const sheets = new Map();
function loadSheet(id) {
  if (!sheets.has(id)) {
    sheets.set(id, fetch(`/art/pixel/minigames/${id}.json`, { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : null)).catch(() => null));
  }
  return sheets.get(id);
}
export function sheetWhenReady(id, then) {
  const get = () => { if (hasMiniArt(id)) loadSheet(id).then(then); };
  get();
  whenMiniArt(get);
}

export const cls = (parts) => parts.filter(Boolean).join(" ");

/** 小游戏标题栏：名字和「给个提示」。 */
export function miniHead(h, icon, title, onHint) {
  return h("div", { class: "mini-head" }, h("b", {}, title),
    h("button", { class: "btn small", type: "button", onclick: () => onHint?.() }, icon("learn", { size: 14 }), "给个提示"));
}
