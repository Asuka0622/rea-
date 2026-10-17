// 技能树界面: the skill tree as a pixel-art RPG screen. Five pages, one per branch, chosen with pixel
// tabs. Each page is a talent tree on a dark tiled floor: pixel gems on a grid (game-skills.js `at`),
// joined by right-angled pixel paths from every skill to the ones it opens. Gems are drawn square by
// square as SVG so they stay crisp. States: lit (learned), next (every skill it needs is learned: can
// be learned now), locked (needs others first), making (not in the game yet). Selecting a gem shows a
// parchment card: what you learned, what it needs, or where in the story you learn it. The header has
// the player's level, title and a segmented XP bar (game-skills.js rank()).

import { branchesOfPart, PART, rank } from "./game-skills.js";
import { TIERS, drillsFor, ladderFor, skillMastery, caseFor } from "./game-drills.js";

const SVG = "http://www.w3.org/2000/svg";
const CELL_W = 128; // board grid, in screen pixels
const CELL_H = 100;
const GEM = 52;

const mix = (hex, other, amount) => {
  const a = parseInt(hex.slice(1), 16);
  const b = parseInt(other.slice(1), 16);
  const channel = (shift) => Math.round(((a >> shift) & 255) * (1 - amount) + ((b >> shift) & 255) * amount);
  return `#${((channel(16) << 16) | (channel(8) << 8) | channel(0)).toString(16).padStart(6, "0")}`;
};
const svgEl = (name, attrs = {}) => {
  const el = document.createElementNS(SVG, name);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
};

/** Pixels → an SVG of 1x1 squares (crispEdges): rows of palette keys, "." for transparent. */
function pixelArt(rows, palette, className) {
  const svg = svgEl("svg", { viewBox: `0 0 ${rows[0].length} ${rows.length}`, "shape-rendering": "crispEdges", class: className, "aria-hidden": "true" });
  rows.forEach((row, y) => [...row].forEach((key, x) => key !== "." && svg.append(svgEl("rect", { x, y, width: 1, height: 1, fill: palette[key] }))));
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
/** A 13x12 pixel trophy cup. */
const CUP_ROWS = ["..ooooooooo..", "ooolllllbbooo", "o.olllllbbo.o", "o.olllllbbo.o", ".ooolllbbooo.", "...olllbbo...", "....olbbo....", ".....obo.....", ".....obo.....", "....ooooo....", "...olllbbo...", "...ooooooo..."];
const cup = (got) => pixelArt(CUP_ROWS, got ? { o: "#1b120c", l: "#fff2a8", b: "#e0a03a" } : { o: "#1b120c", l: "#5d5750", b: "#4a4540" }, "st-cup");
const LOCK_ROWS = ["..ooo..", ".o...o.", ".o...o.", "ooooooo", "obbybbo", "obbybbo", "obbbbbo", "ooooooo"];
const lock = () => pixelArt(LOCK_ROWS, { o: "#1b120c", b: "#c9a36b", y: "#1b120c" }, "st-lock");

const STATUS = { lit: "已点亮", next: "可以学了", locked: "未解锁", making: "制作中" };
let lastBranch = null; // the page shown last time, while the game is open

/**
 * @param h          element helper
 * @param stepDone   (stepId) => boolean
 * @param whereOf    (stepId) => "主线 · 第一章 …：goal" or ""
 * @param onClose    () => void
 */
export function renderSkillTree({ h, stepDone, whereOf, onClose, achievements = null, hasArt = () => false, drills = {}, onDrill = null, playable = () => true }) {
  // 第一部只讲人工智能 (docs/series.md)：其它分支的数据留着，但不在本作的树上出现。
  const BRANCHES = branchesOfPart(PART);
  const states = new Map();
  for (const branch of BRANCHES) {
    const lit = (id) => states.get(id) === "lit";
    for (const skill of branch.skills) states.set(skill.id, skill.from && stepDone(skill.from) ? "lit" : null);
    for (const skill of branch.skills) {
      if (states.get(skill.id)) continue;
      states.set(skill.id, !skill.from ? "making" : (skill.needs || []).every(lit) ? "next" : "locked");
    }
  }
  const all = BRANCHES.flatMap((branch) => branch.skills.map((skill) => ({ skill, branch })));
  const litCount = all.filter(({ skill }) => states.get(skill.id) === "lit").length;
  const r = rank(litCount);
  const byId = new Map(all.map((entry) => [entry.skill.id, entry]));
  // A drawn icon (public/art/pixel/skills/<id>.png) replaces the character once it exists.
  const face = (skill, state) =>
    state === "locked" ? lock() : state === "making" ? h("span", { class: "st-glyph" }, "?") : hasArt(`skills/${skill.id}`) ? h("img", { class: "st-icon", src: `/art/pixel/skills/${skill.id}.png`, alt: "" }) : h("span", { class: "st-glyph" }, skill.glyph);

  /** The three drills of one skill, as buttons: the 副本 page and nothing else uses them. */
  function ladderEls(skill) {
    const lit = states.get(skill.id) === "lit";
    const ready = playable(caseFor(skill.id));
    return ladderFor(skill.id, { lit, stars: drills }).map((drill) => {
      const blocked = drill.state === "closed" || drill.state === "locked" || !ready;
      const note = !ready ? "这一关还没做成能走进去的房间" : drill.state === "closed" ? "先完成这一关的委托" : drill.state === "locked" ? drill.needs : drill.why;
      return h("button", {
        class: `st-drill ${drill.state}${ready ? "" : " unbuilt"}`,
        type: "button",
        disabled: blocked,
        title: note,
        onclick: () => onDrill?.(drill, skill),
      },
        h("span", { class: "st-drill-tier" }, TIERS[drill.tier - 1]),
        h("span", { class: "st-drill-title" }, drill.title),
        h("span", { class: "st-stars", "aria-label": `${drill.stars} 星` }, "★".repeat(drill.stars), "☆".repeat(3 - drill.stars)),
        h("small", {}, note));
    });
  }

  const card = h("aside", { class: "st-card", "aria-live": "polite" });
  function show({ skill, branch }) {
    board.querySelectorAll(".st-node.selected").forEach((el) => el.classList.remove("selected"));
    board.querySelector(`.st-node[data-skill="${skill.id}"]`)?.classList.add("selected");
    const state = states.get(skill.id);
    const where = skill.from ? whereOf(skill.from) : "";
    const needs = (skill.needs || []).map((id) => byId.get(id).skill);
    const opens = branch.skills.filter((other) => other.needs?.includes(skill.id));
    card.style.setProperty("--c", branch.color);
    card.replaceChildren(
      ...[
        h("div", { class: `st-card-gem ${state}` }, gem(state, branch.color), face(skill, state)),
        h("p", { class: "st-card-branch" }, `【${branch.title}】`),
        h("h3", {}, skill.label),
        h("p", { class: `st-card-status ${state}` }, `▶ ${STATUS[state]}`),
        h("p", { class: "st-card-note" }, skill.note),
        state === "lit" && skill.recap ? h("div", { class: "st-card-box" }, h("b", {}, "学到了"), h("p", {}, skill.recap)) : null,
        where && state !== "lit" ? h("div", { class: "st-card-box" }, h("b", {}, "在哪学"), h("p", {}, where)) : null,
        needs.length ? h("p", { class: "st-card-hint" }, "需要：", ...needs.map((need) => h("span", { class: `st-chip ${states.get(need.id)}` }, need.label))) : null,
        opens.length ? h("p", { class: "st-card-hint" }, "通往：", ...opens.map((next) => h("span", { class: `st-chip ${states.get(next.id)}` }, next.label))) : null,
        where && state === "lit" ? h("p", { class: "st-card-hint" }, `学自 ${where}`) : null,
        state === "making" ? h("p", { class: "st-card-hint" }, "这一格的课程还在制作中，敬请期待。") : null,
        drillsFor(skill.id).length ? h("p", { class: "st-card-hint" }, `这一格有 ${drillsFor(skill.id).length} 个进阶副本，在「副本」页挑战。`) : null,
      ].filter(Boolean),
    );
  }

  const board = h("div", { class: "st-board-wrap" });
  const tabs = h("div", { class: "st-tabs", role: "tablist" });
  /** The achievements page: every trophy, unlocked ones in gold; secret ones hidden until unlocked. */
  function trophies() {
    lastBranch = "achievements";
    tabs.querySelectorAll(".st-tab").forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.branch === "achievements")));
    const got = achievements.list.filter((a) => achievements.got(a.id));
    const date = (time) => new Date(time).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
    const showTrophy = (a) => {
      const when = achievements.got(a.id);
      const hidden = a.secret && !when;
      card.style.setProperty("--c", "#e0a03a");
      card.replaceChildren(
        ...[
          h("div", { class: "st-card-gem" }, cup(Boolean(when))),
          h("p", { class: "st-card-branch" }, "【成就】"),
          h("h3", {}, hidden ? "？？？" : a.title),
          h("p", { class: `st-card-status ${when ? "lit" : "locked"}` }, when ? `▶ ${date(when)} 解锁` : "▶ 还没解锁"),
          h("p", { class: "st-card-note" }, hidden ? "隐藏成就：做了某件特别的事就会解锁。" : a.note),
        ],
      );
      board.querySelectorAll(".st-trophy.selected").forEach((el) => el.classList.remove("selected"));
      board.querySelector(`.st-trophy[data-id="${a.id}"]`)?.classList.add("selected");
    };
    board.style.setProperty("--c", "#e0a03a");
    board.replaceChildren(
      h("p", { class: "st-motto" }, h("b", {}, `成就 ${got.length}/${achievements.list.length}`), "技能用的是正式的名字；做到了特别的事，会在这里拿到一个好玩的称号。"),
      h("div", { class: "st-trophies" },
        ...achievements.list.map((a) => {
          const when = achievements.got(a.id);
          const hidden = a.secret && !when;
          return h("button", { class: `st-trophy ${when ? "got" : ""}`, type: "button", "data-id": a.id, onclick: () => showTrophy(a), onfocus: () => showTrophy(a) },
            cup(Boolean(when)), h("b", {}, hidden ? "？？？" : a.title), h("small", {}, hidden ? "隐藏成就" : a.note));
        })),
    );
    showTrophy(got[got.length - 1] || achievements.list[0]);
  }

  /** Every skill in this part that has drills, with its ladder worked out. */
  function drillRows() {
    return BRANCHES.flatMap((branch) =>
      branch.skills
        .filter((skill) => drillsFor(skill.id).length)
        .map((skill) => {
          const lit = states.get(skill.id) === "lit";
          return { skill, branch, lit, mastery: skillMastery(skill.id, { lit, stars: drills }), ladder: ladderFor(skill.id, { lit, stars: drills }) };
        }));
  }

  /** 副本 page: the same knowledge points again, one step harder, kept apart from the tree itself. */
  function drillsPage() {
    lastBranch = "drills";
    tabs.querySelectorAll(".st-tab").forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.branch === "drills")));
    const rows = drillRows();
    const total = rows.reduce((all, row) => ({
      cleared: all.cleared + row.mastery.cleared,
      total: all.total + row.mastery.total,
      stars: all.stars + row.mastery.stars,
      max: all.max + row.mastery.max,
    }), { cleared: 0, total: 0, stars: 0, max: 0 });
    const showSkill = (row) => {
      const state = states.get(row.skill.id) || "locked";
      card.style.setProperty("--c", row.branch.color);
      card.replaceChildren(
        h("div", { class: `st-card-gem ${state}` }, gem(state, row.branch.color), face(row.skill, state)),
        h("p", { class: "st-card-branch" }, `【${row.branch.title} · 副本】`),
        h("h3", {}, row.skill.label),
        h("p", { class: "st-card-status" }, `▶ 通关 ${row.mastery.cleared}/${row.mastery.total} · ${row.mastery.stars}/${row.mastery.max} 星`),
        h("p", { class: "st-card-note" }, row.skill.note),
        ...ladderEls(row.skill),
      );
      board.querySelectorAll(".st-drill-row.selected").forEach((el) => el.classList.remove("selected"));
      board.querySelector(`.st-drill-row[data-skill="${row.skill.id}"]`)?.classList.add("selected");
    };
    board.style.setProperty("--c", "#a5512b");
    board.replaceChildren(
      h("p", { class: "st-motto" }, h("b", {}, `副本 ${total.cleared}/${total.total} 关`), `剧情关谁都能过；副本是同一个知识点再来一遍，一次比一次狠。已拿 ${total.stars}/${total.max} 星。`),
      h("div", { class: "st-drill-list" },
        ...BRANCHES.filter((branch) => rows.some((row) => row.branch === branch)).flatMap((branch) => [
          h("h4", { class: "st-drill-branch", style: `--c:${branch.color}` }, branch.title),
          ...rows.filter((row) => row.branch === branch).map((row) =>
            h("button", { class: "st-drill-row", type: "button", "data-skill": row.skill.id, onclick: () => showSkill(row), onfocus: () => showSkill(row) },
              h("b", {}, row.skill.label),
              h("span", { class: "st-drill-row-count" }, `${row.mastery.cleared}/${row.mastery.total}`),
              h("span", { class: "st-stars" }, `${row.mastery.stars}/${row.mastery.max}`)),
          ),
        ])),
    );
    const first = rows.find((row) => row.ladder.some((drill) => drill.state === "open")) || rows[0];
    if (first) showSkill(first);
    else card.replaceChildren(h("p", { class: "st-card-note" }, "还没有可以挑战的副本。"));
  }

  function page(branch) {
    lastBranch = branch.id;
    tabs.querySelectorAll(".st-tab").forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.branch === branch.id)));
    const rows = Math.max(...branch.skills.map((skill) => skill.at[1])) + 1;
    const width = CELL_W * 5;
    const height = CELL_H * rows;
    const center = (skill) => ({ x: skill.at[0] * CELL_W + CELL_W / 2, y: skill.at[1] * CELL_H + GEM / 2 + 8 });
    // Paths: down from the parent, across, down into the child; pixel-snapped to 4px.
    const snap = (v) => Math.round(v / 4) * 4;
    const lines = svgEl("svg", { class: "st-lines", width, height, viewBox: `0 0 ${width} ${height}`, "shape-rendering": "crispEdges", "aria-hidden": "true" });
    for (const skill of branch.skills) {
      for (const id of skill.needs || []) {
        const from = center(byId.get(id).skill);
        const to = center(skill);
        const mid = snap((from.y + GEM / 2 + to.y - GEM / 2) / 2);
        const parent = states.get(id);
        const kind = parent === "lit" && states.get(skill.id) === "lit" ? "lit" : parent === "lit" && states.get(skill.id) === "next" ? "next" : "dim";
        lines.append(svgEl("path", { d: `M${snap(from.x)} ${snap(from.y + GEM / 2)}V${mid}H${snap(to.x)}V${snap(to.y - GEM / 2)}`, class: `st-path ${kind}`, style: `--c:${branch.color}` }));
      }
    }
    const nodes = branch.skills.map((skill) => {
      const state = states.get(skill.id);
      const { x, y } = center(skill);
      return h("button", {
        class: `st-node ${state}`,
        type: "button",
        "data-skill": skill.id,
        style: `left:${x}px;top:${y - GEM / 2}px`,
        "aria-label": `${skill.label}：${STATUS[state]}`,
        onclick: () => show({ skill, branch }),
        onfocus: () => show({ skill, branch }),
      }, h("span", { class: "st-gem" }, gem(state, branch.color), face(skill, state)), h("span", { class: "st-node-label" }, skill.label));
    });
    const lit = branch.skills.filter((skill) => states.get(skill.id) === "lit").length;
    board.style.setProperty("--c", branch.color);
    board.replaceChildren(
      h("p", { class: "st-motto" }, h("b", {}, `${branch.title} ${lit}/${branch.skills.length}`), branch.motto),
      h("div", { class: "st-board", style: `width:${width}px;height:${height}px` }, lines, ...nodes),
    );
    const start = branch.skills.find((skill) => states.get(skill.id) === "next") || [...branch.skills].reverse().find((skill) => states.get(skill.id) === "lit") || branch.skills[0];
    show({ skill: start, branch });
  }
  for (const branch of BRANCHES) {
    const lit = branch.skills.filter((skill) => states.get(skill.id) === "lit").length;
    const ready = branch.skills.some((skill) => states.get(skill.id) === "next");
    tabs.append(
      h("button", { class: "st-tab", type: "button", role: "tab", "data-branch": branch.id, style: `--c:${branch.color}`, onclick: () => page(branch) },
        h("span", { class: "st-tab-mark", "aria-hidden": "true" }, branch.emblem),
        h("span", {}, branch.title),
        h("small", {}, `${lit}/${branch.skills.length}`),
        ready ? h("i", { class: "st-tab-new", title: "有可以学的技能" }, "!") : null),
    );
  }

  const drillTabRows = drillRows();
  if (drillTabRows.length) {
    const cleared = drillTabRows.reduce((n, row) => n + row.mastery.cleared, 0);
    const open = drillTabRows.some((row) => row.ladder.some((drill) => drill.state === "open"));
    tabs.append(
      h("button", { class: "st-tab dungeon", type: "button", role: "tab", "data-branch": "drills", style: "--c:#a5512b", onclick: () => drillsPage() },
        h("span", { class: "st-tab-mark", "aria-hidden": "true" }, "副"), h("span", {}, "副本"), h("small", {}, `${cleared}/${drillTabRows.reduce((n, row) => n + row.mastery.total, 0)}`),
        open ? h("i", { class: "st-tab-new", title: "有可以挑战的副本" }, "!") : null),
    );
  }

  if (achievements) {
    const count = achievements.list.filter((a) => achievements.got(a.id)).length;
    tabs.append(
      h("button", { class: "st-tab trophy", type: "button", role: "tab", "data-branch": "achievements", style: "--c:#e0a03a", onclick: () => trophies() },
        h("span", { class: "st-tab-mark", "aria-hidden": "true" }, "★"), h("span", {}, "成就"), h("small", {}, `${count}/${achievements.list.length}`)),
    );
  }

  const blocks = Array.from({ length: r.per }, (_, i) => h("i", { class: i < r.into ? "full" : "" }));
  const root = h("div", { class: "st" },
    h("header", { class: "st-head" },
      h("div", { class: "st-rank" },
        h("b", { class: "st-level" }, `Lv.${r.level}`),
        h("div", {},
          h("p", { class: "st-title" }, r.title),
          h("div", { class: "st-xp", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": String(r.per), "aria-valuenow": String(r.into), "aria-label": "升级进度" }, ...blocks),
          h("small", {}, `再点亮 ${r.per - r.into} 格升到 Lv.${r.level + 1}`))),
      h("p", { class: "st-count" }, "技能 ", h("b", {}, String(litCount)), ` / ${all.length}`),
      h("button", { class: "btn small", type: "button", onclick: onClose }, "关闭（K）")),
    tabs,
    h("p", { class: "st-scope" }, "本作只讲人工智能：安全是序章的侦探线，AI 是主线。电脑、网络、编程留给系列后面的部。"),
    h("div", { class: "st-body" }, board, card),
  );

  // Open on the page shown last time, else the branch with something to learn next.
  if (lastBranch === "drills" && drillTabRows.length) {
    drillsPage();
    return root;
  }
  if (lastBranch === "achievements" && achievements) {
    trophies();
    return root;
  }
  const first = BRANCHES.find((branch) => branch.id === lastBranch) || BRANCHES.find((branch) => branch.skills.some((skill) => states.get(skill.id) === "next")) || BRANCHES[0];
  page(first);
  return root;
}
