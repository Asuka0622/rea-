// 路米的样子（玩家扮演路米，开场自己选）：女生是现有的美术；男生是女版的性转，美术组在画
// （docs/art/asset-requirements.md「男版路米」）。男版的图到一张用一张：文件名把 lumi 换成 lumi-m，
// 没到的那张继续用女版，不会出现空白。台词全部不分性别，所以换样子不用改剧情。
export const LOOK_KEY = "rea-lumi-look-v1";
export const LOOKS = [
  { id: "f", label: "女生", note: "薄荷青短发、发夹和耳机" },
  { id: "m", label: "男生", note: "同一个路米的男生版本" },
];

export function loadLook(storage = globalThis.localStorage) {
  try {
    const value = storage?.getItem(LOOK_KEY);
    return value === "f" || value === "m" ? value : null;
  } catch {
    return null;
  }
}
export function saveLook(look, storage = globalThis.localStorage) {
  if (look !== "f" && look !== "m") return false;
  try {
    storage?.setItem(LOOK_KEY, look);
    return true;
  } catch {
    return false;
  }
}

// 哪些图已经有了（外壳读到美术清单后告诉这里）；没登记时一律当没有，用女版。
let known = () => false;
export function knowArt(has) {
  known = typeof has === "function" ? has : () => false;
}

/**
 * 路米某张图该用的文件名：lumi-normal、anim-lumi、anim-lumi-unified、sprite-lumi……
 * 选了男生、并且男版那张（lumi-m-normal、anim-lumi-m……）已经有了，就换成男版。
 */
export function lumiArt(name, { look = loadLook(), has = known } = {}) {
  if (look !== "m" || !/(^|-)lumi(-|$)/.test(name)) return name;
  const male = name.replace(/(^|-)lumi(-|$)/, "$1lumi-m$2");
  return has(male) ? male : name;
}

/** 开场选样子：两张卡片，选完调用 onPick(look)。男版头像还没画好时显示占位。 */
export function mountLookPicker({ h, initial = null, onPick }) {
  const face = (look) => {
    const file = look === "m" ? lumiArt("lumi-normal", { look: "m" }) : "lumi-normal";
    return look === "m" && file === "lumi-normal"
      ? h("div", { class: "lumi-look-placeholder", "aria-hidden": "true" }, h("b", {}, "?"), h("small", {}, "男版形象绘制中"))
      : h("img", { src: `/art/faces/${file}.webp`, alt: "", width: 120, height: 120 });
  };
  return h("section", { class: "lumi-look", "aria-label": "选择路米的样子" },
    h("p", { class: "detective-photo-kicker" }, "序章 · 路米的样子"),
    h("h2", {}, "路米是……"),
    h("p", {}, "比特镇新开张的侦探事务所，主人叫路米。路米的样子由你来选，剧情和成绩都一样，以后在任务日志里还能换。"),
    h("div", { class: "lumi-look-choices", role: "group", "aria-label": "路米的样子" },
      ...LOOKS.map((look) =>
        h("button", { class: `lumi-look-card${initial === look.id ? " chosen" : ""}`, type: "button", "data-look": look.id, onclick: () => onPick(look.id) },
          face(look.id), h("b", {}, look.label), h("small", {}, look.note)))),
    h("p", { class: "lumi-look-note" }, "男生版本的立绘和小人还在画：画好之前，游戏里先用女生版本的图。"));
}
