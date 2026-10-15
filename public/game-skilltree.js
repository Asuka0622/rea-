// 技能树界面: the skill tree as a pixel-art RPG screen. Five lanes on a dark tiled floor, one per branch
// in its colour; each a path of pixel gems (drawn pixel by pixel as SVG squares, so they stay crisp at
// any size) joined by dotted pixel paths that light up once learned. Node states: lit (learned), next
// (can be learned now: the one after the last lit), locked (needs the one above first), making (not in
// the game yet). Selecting a node shows its card: what you learned, or where in the story you learn it.
// The header shows the player's level, title and a segmented XP bar (game-skills.js rank()).

import { SKILL_TREE, rank } from "./game-skills.js";

const SVG = "http://www.w3.org/2000/svg";

const mix = (hex, other, amount) => {
  const a = parseInt(hex.slice(1), 16);
  const b = parseInt(other.slice(1), 16);
  const channel = (shift) => Math.round(((a >> shift) & 255) * (1 - amount) + ((b >> shift) & 255) * amount);
  return `#${((channel(16) << 16) | (channel(8) << 8) | channel(0)).toString(16).padStart(6, "0")}`;
};

/** Pixels → an SVG of 1x1 squares (crispEdges): rows of palette keys, "." for transparent. */
function pixelArt(rows, palette, className) {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", `0 0 ${rows[0].length} ${rows.length}`);
  svg.setAttribute("shape-rendering", "crispEdges");
  svg.setAttribute("class", className);
  svg.setAttribute("aria-hidden", "true");
  rows.forEach((row, y) => {
    [...row].forEach((key, x) => {
      if (key === ".") return;
      const rect = document.createElementNS(SVG, "rect");
      rect.setAttribute("x", x);
      rect.setAttribute("y", y);
      rect.setAttribute("width", 1);
      rect.setAttribute("height", 1);
      rect.setAttribute("fill", palette[key]);
      svg.append(rect);
    });
  });
  return svg;
}

/** A 15x15 pixel diamond gem: outline, light upper-left, dark lower-right, a sparkle when lit. */
const GEM_ROWS = (() => {
  const rows = [];
  for (let y = 0; y < 15; y += 1) {
    let row = "";
    const half = 7 - Math.abs(y - 7);
    for (let x = 0; x < 15; x += 1) {
      if (x < 7 - half || x > 7 + half) row += ".";
      else if (x === 7 - half || x === 7 + half) row += "o";
      else if ((x === 5 && y === 4) || (x === 6 && y === 3) || (x === 4 && y === 5)) row += "s";
      else if (x + y < 12) row += "l";
      else if (x + y > 16) row += "d";
      else row += "b";
    }
    rows.push(row);
  }
  return rows;
})();
function gem(state, color) {
  const palettes = {
    lit: { o: "#1b120c", l: mix(color, "#ffffff", 0.4), b: color, d: mix(color, "#000000", 0.35), s: "#ffffff" },
    next: { o: color, l: mix(color, "#000000", 0.45), b: mix(color, "#000000", 0.6), d: mix(color, "#000000", 0.72), s: mix(color, "#000000", 0.45) },
    locked: { o: "#1b120c", l: "#6a625a", b: "#554e47", d: "#3d3732", s: "#6a625a" },
    making: { o: "#4a4038", l: "#2c2520", b: "#2c2520", d: "#2c2520", s: "#2c2520" },
  };
  return pixelArt(GEM_ROWS, palettes[state], "st-gem-art");
}
const LOCK = pixelArt(["..ooo..", ".o...o.", ".o...o.", "ooooooo", "obbybbo", "obbybbo", "obbbbbo", "ooooooo"], { o: "#1b120c", b: "#c9a36b", y: "#1b120c" }, "st-lock");

/**
 * @param h          element helper
 * @param stepDone   (stepId) => boolean
 * @param whereOf    (stepId) => "主线 · 第一章 …：goal" or ""
 * @param onClose    () => void
 */
export function renderSkillTree({ h, stepDone, whereOf, onClose }) {
  const states = new Map();
  for (const branch of SKILL_TREE) {
    let before = true; // the previous skill in this lane is lit (the first has nothing before it)
    for (const skill of branch.skills) {
      const lit = Boolean(skill.from && stepDone(skill.from));
      states.set(skill.id, lit ? "lit" : !skill.from ? "making" : before ? "next" : "locked");
      before = lit;
    }
  }
  const all = SKILL_TREE.flatMap((branch) => branch.skills.map((skill) => ({ skill, branch })));
  const lit = all.filter(({ skill }) => states.get(skill.id) === "lit").length;
  const r = rank(lit);

  const card = h("aside", { class: "st-card", "aria-live": "polite" });
  const STATUS = { lit: "已点亮", next: "可以学了", locked: "未解锁", making: "制作中" };
  const face = (skill, state) => (state === "locked" ? LOCK.cloneNode(true) : h("span", { class: "st-glyph" }, state === "making" ? "?" : skill.glyph));
  function show({ skill, branch }, button) {
    root.querySelectorAll(".st-node.selected").forEach((el) => el.classList.remove("selected"));
    button?.classList.add("selected");
    const state = states.get(skill.id);
    const index = branch.skills.indexOf(skill);
    const where = skill.from ? whereOf(skill.from) : "";
    card.style.setProperty("--c", branch.color);
    card.replaceChildren(
      ...[
        h("div", { class: `st-card-gem ${state}` }, gem(state, branch.color), face(skill, state)),
        h("p", { class: "st-card-branch" }, `【${branch.title}】第 ${index + 1} 格`),
        h("h3", {}, skill.label),
        h("p", { class: `st-card-status ${state}` }, `▶ ${STATUS[state]}`),
        h("p", { class: "st-card-note" }, skill.note),
        state === "lit" && skill.recap ? h("div", { class: "st-card-box" }, h("b", {}, "学到了"), h("p", {}, skill.recap)) : null,
        state === "locked" ? h("p", { class: "st-card-hint" }, `先点亮上一格「${branch.skills[index - 1].label}」。`) : null,
        where && state !== "lit" ? h("div", { class: "st-card-box" }, h("b", {}, "在哪学"), h("p", {}, where)) : null,
        where && state === "lit" ? h("p", { class: "st-card-hint" }, `学自 ${where}`) : null,
        state === "making" ? h("p", { class: "st-card-hint" }, "这一格所在的章节还在制作中，敬请期待。") : null,
      ].filter(Boolean),
    );
  }

  const lanes = SKILL_TREE.map((branch) => {
    const count = branch.skills.filter((skill) => states.get(skill.id) === "lit").length;
    return h("section", { class: "st-lane", style: `--c:${branch.color}` },
      h("h3", { class: "st-emblem" }, h("span", { class: "st-emblem-mark", "aria-hidden": "true" }, branch.emblem), h("span", {}, branch.title), h("small", {}, `${count}/${branch.skills.length}`)),
      h("ol", {},
        ...branch.skills.map((skill, i) => {
          const state = states.get(skill.id);
          const prev = i > 0 ? states.get(branch.skills[i - 1].id) : null;
          const path = i === 0 ? "" : prev === "lit" && state === "lit" ? "path-lit" : prev === "lit" && state === "next" ? "path-next" : "path-dim";
          const button = h("button", {
            class: `st-node ${state}`,
            type: "button",
            "data-skill": skill.id,
            "aria-label": `${skill.label}：${STATUS[state]}`,
            onclick: () => show({ skill, branch }, button),
            onfocus: () => show({ skill, branch }, button),
          }, h("span", { class: "st-gem" }, gem(state, branch.color), face(skill, state)), h("span", { class: "st-node-label" }, skill.label));
          return h("li", { class: path }, button);
        })));
  });

  const blocks = Array.from({ length: r.per }, (_, i) => h("i", { class: i < r.into ? "full" : "" }));
  const root = h("div", { class: "st" },
    h("header", { class: "st-head" },
      h("div", { class: "st-rank" },
        h("b", { class: "st-level" }, `Lv.${r.level}`),
        h("div", {},
          h("p", { class: "st-title" }, r.title),
          h("div", { class: "st-xp", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": String(r.per), "aria-valuenow": String(r.into), "aria-label": "升级进度" }, ...blocks),
          h("small", {}, `再点亮 ${r.per - r.into} 格升到 Lv.${r.level + 1}`))),
      h("p", { class: "st-count" }, "技能 ", h("b", {}, String(lit)), ` / ${all.length}`),
      h("button", { class: "btn small", type: "button", onclick: onClose }, "关闭（K）")),
    h("div", { class: "st-body" }, h("div", { class: "st-lanes" }, ...lanes), card),
  );

  // Start on the skill to learn next (or the last one learned).
  const first = all.find(({ skill }) => states.get(skill.id) === "next" && skill.from) || [...all].reverse().find(({ skill }) => states.get(skill.id) === "lit") || all[0];
  queueMicrotask(() => show(first, root.querySelector(`.st-node[data-skill="${first.skill.id}"]`)));
  return root;
}
