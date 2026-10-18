// 排雷 · 权限扫描（版本侦探）。规则在 mines-engine.js（Node 里能跑，测试用它验），这里只管画面和操作。
//
// 借的是扫雷：一个「只更新了一句修复若干问题」的新版清单，多出来的条目混在格子里。点开看它是什么，
// 可疑的插旗；翻到危险的，就等于放行了它。数字是周围八格里有几个危险项——和扫雷一模一样。
// 数据：samples/cases/<id>/workbench-case.json 的 game.lab.mines（不提供就用 defaultMines()）。

import { createMines, reveal, toggleFlag, minesSummary, minesPlaying, defaultMines } from "./mines-engine.js";
import { miniHead } from "./mini-art.js";

const STYLE_ID = "mines-game-style";
function loadStyle() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
  const link = document.createElement("link");
  link.id = STYLE_ID;
  link.rel = "stylesheet";
  link.href = "/mines-game.css";
  document.head.append(link);
}

const DEFAULT_HINTS = [
  "数字是周围八格里有几个危险项。先看数字，再决定翻哪一格——和扫雷一样。",
  "觉得可疑就插旗（右键，或切到「标记」再点）。标对了才算找到，标错了不扣命，但会记在结算里。",
  "翻到危险项不等于结束，只是放行了一次、扣一条命。三条命用完才失败——但每踩一次，你就知道它要这个权限干什么了。",
  "注意那些「一个计算器用不上」的权限：通讯录、短信、后台定位。它们出现在清单里，本身就是结论。",
];

export function mountMines({ h, icon, lab, onMistake = () => {}, onHint = () => {}, onDone = () => {} }) {
  loadStyle();
  const spec = lab.mines || defaultMines();
  let board = createMines(spec);
  let mode = "dig"; // dig | flag
  let hintIndex = 0;
  let awarded = false;

  // ?debug：控制台里能看这一局。
  if (typeof location !== "undefined" && new URLSearchParams(location.search).has("debug")) window.__mines = () => board;

  const say = h("p", { class: "mines-say", role: "status" },
    spec.brief || "更新说明只写了一句话。这份是新版的权限与依赖清单——多出来的东西混在里面。");
  const bar = h("div", { class: "mines-bar" });
  const grid = h("div", { class: "mines-grid", role: "grid", "aria-label": "权限与依赖清单" });
  const tools = h("div", { class: "mines-tools" });
  const result = h("section", { class: "mines-result", hidden: true, "aria-label": "本轮结果" });

  const digBtn = h("button", {
    class: "btn small", type: "button", "aria-pressed": "true",
    onclick: () => { mode = "dig"; paint(); },
  }, "检查");
  const flagBtn = h("button", {
    class: "btn small", type: "button", "aria-pressed": "false",
    onclick: () => { mode = "flag"; paint(); },
  }, "标记可疑");
  const restart = h("button", {
    class: "btn", type: "button",
    onclick: () => {
      board = createMines(spec, Math.floor(Math.random() * 100000));
      awarded = false;
      result.hidden = true;
      say.textContent = spec.brief || "新的一份清单，重新排一次。";
      paint();
    },
  }, "换一份清单");

  const root = h("section", { class: "mini mini-mines", "aria-label": "排雷 · 权限扫描" },
    miniHead(h, icon, lab.sampleTitle || "排雷 · 权限扫描", () => {
      onHint();
      const text = spec.hints?.[hintIndex % (spec.hints?.length || 1)] || DEFAULT_HINTS[hintIndex % DEFAULT_HINTS.length];
      hintIndex += 1;
      say.textContent = `提示：${text}`;
    }),
    bar, tools, grid, result, say,
    h("p", { class: "mines-legend" },
      "点格子检查，右键（或切到「标记」）插旗。数字 = 周围八格里有几个危险项。"),
  );

  function paint() {
    const s = minesSummary(board);
    bar.replaceChildren(
      h("span", { class: "mines-stat" }, `隐私 ${"●".repeat(Math.max(0, board.lives))}${"○".repeat(Math.max(0, 3 - board.lives))}`),
      h("span", { class: "mines-stat" }, `已找到 ${s.found}/${s.riskCount}`),
      h("span", { class: "mines-stat" }, `已检查 ${s.safeOpened}/${s.safeTotal}`),
    );
    digBtn.setAttribute("aria-pressed", String(mode === "dig"));
    flagBtn.setAttribute("aria-pressed", String(mode === "flag"));
    digBtn.classList.toggle("on", mode === "dig");
    flagBtn.classList.toggle("on", mode === "flag");
    tools.replaceChildren(digBtn, flagBtn,
      h("span", { class: "mines-mode" }, mode === "dig" ? "检查：翻开这一项" : "标记：先插旗"));

    grid.style.setProperty("--n", board.size);
    grid.replaceChildren(...board.cells.map((cell) => {
      const open = cell.state === "open";
      const flagged = cell.state === "flag";
      const label = open ? (cell.risk ? cell.risk.label : cell.safe?.label || "") : "";
      const cls = ["mines-cell",
        open && (cell.risk ? "risk" : "safe"),
        flagged && "flagged",
        open && !cell.risk && cell.around === 0 && "blank",
        open && !cell.risk && cell.around > 0 && `n${cell.around}`];
      const btn = h("button", {
        class: cls.filter(Boolean).join(" "), type: "button",
        "data-x": cell.x, "data-y": cell.y,
        title: open ? label : flagged ? "已标记可疑" : "未检查",
        "aria-label": open
          ? `${label}${cell.risk ? "（危险，已放行）" : ""}`
          : flagged ? "已标记可疑" : "未检查",
        onclick: () => act(cell.x, cell.y, "dig"),
        oncontextmenu: (e) => { e.preventDefault(); act(cell.x, cell.y, "flag"); },
      });
      if (flagged) btn.append(h("i", { class: "mines-flag", "aria-hidden": "true" }, "⚑"));
      else if (open) {
        // 翻开就看得到「这一条到底是什么」——名字是这一格的主体，数字只是角落的提示。
        btn.append(h("span", { class: "mines-name" }, label));
        if (cell.risk) btn.append(h("i", { class: "mines-boom", "aria-hidden": "true" }, "✖"));
        else if (cell.around > 0) btn.append(h("i", { class: "mines-num", "aria-hidden": "true" }, String(cell.around)));
      }
      return btn;
    }));
    if (board.status !== "playing") finish();
  }

  function act(x, y, kind) {
    if (!minesPlaying(board)) return;
    const useFlag = kind === "flag" || mode === "flag";
    if (useFlag) {
      const cell = board.cells[y * board.size + x];
      if (!cell || cell.state === "open") return;
      toggleFlag(board, x, y);
      paint();
      return;
    }
    const { hit, opened } = reveal(board, x, y);
    if (hit) {
      onMistake();
      say.textContent = `放行了「${hit.label}」：${hit.why}`;
    } else if (opened.length) {
      const first = opened[0];
      say.textContent = first?.safe
        ? `「${first.safe.label}」：${first.safe.note || "它本来就用得上这个。"}`
        : "这一片都干净，一次看完了。";
    }
    paint();
  }

  function finish() {
    const s = minesSummary(board);
    result.hidden = false;
    const won = s.status === "won";
    result.className = "mines-result " + (won ? "won" : "lost");
    result.replaceChildren(
      h("h4", {}, won ? "排完了：多出来的东西都标出来了" : "三条命用完了"),
      h("p", {}, `找到 ${s.found}/${s.riskCount} 个危险项 · 放行 ${s.stepped} 次 · 检查了 ${s.safeOpened} 项安全功能`),
      h("ul", {}, ...board.notes.slice(-3).map((n) => h("li", {}, `${n.label}：${n.text}`))),
      h("p", { class: "mines-lesson" },
        won
          ? "清单里多出来的每一条，都是一个「它没说自己要，但它要了」的入口。更新说明只写一句话，不代表只改了一句话。"
          : "每放行一次，你就知道它拿这个权限干什么了。真正的排查会先把可疑的标出来，再决定碰哪一格。"),
    );
    if (won && !awarded) {
      awarded = true;
      onDone();
    }
  }

  paint();
  return root;
}
