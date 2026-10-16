import { clueTarget, judgeClick, starsFor, provesClaim } from "./case-game.js";
import { mountLab } from "./case-labs.js";
import { createPuzzle, starsForPuzzle } from "./case-puzzle.js";

// 侦探模式 (beginner mode, cases with a `game` block): a client asks for help, the guide reads out
// each clue, and the learner answers by clicking rows in the real report below. Found rows go into
// the evidence bag. A case with `game.lab` then has a hands-on step of its own (case-labs.js), and
// the case closes by presenting evidence for each of the client's doubts.

const STARS_KEY = "rea-workbench-case-stars";

export function savedStars() {
  try {
    return JSON.parse(localStorage.getItem(STARS_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function saveStars(id, stars) {
  try {
    const all = savedStars();
    all[id] = Math.max(all[id] || 0, stars);
    localStorage.setItem(STARS_KEY, JSON.stringify(all));
  } catch {}
}

export const starText = (n) => "★".repeat(n) + "☆".repeat(3 - n);

/**
 * talk: { can(), say(lines) } — in the game (beginner mode in the town), the client's request, the doubts,
 * objections and thanks are spoken in the game's dialogue box one line at a time (say resolves when the
 * player has clicked through); the panel keeps only what is played with. Elsewhere, bubbles as before.
 */
export function createDetective({ h, icon, toast, panel, showSection, rerender, extras, portraits = () => new Set(), onSolved = () => {}, talk = null }) {
  const talking = () => Boolean(talk?.can());
  // A client's line for the dialogue box: their portrait set, their name.
  const clientLine = (item, text, face = "normal") => ({ who: item.game.client.portrait, name: item.game.client.name, text: text.replace(/^[^：「]+：/, ""), face });
  const reportsEl = document.querySelector("#reports");
  const hud = h("div", { class: "case-hud", role: "region", "aria-label": "调查助手" });
  hud.hidden = true;
  document.body.append(hud);
  const games = new Map(); // case id -> game state
  let active = null; // { item, reports, game }
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const fresh = () => ({ phase: "brief", clue: 0, found: [], bag: [], mistakes: 0, hints: 0, claim: 0, presented: [], line: null, mood: "", solved: false });
  const gameOf = (id) => {
    if (!games.has(id)) games.set(id, fresh());
    return games.get(id);
  };

  /** A dialogue portrait (public/art/faces/<character>-<expression>.webp), or a drawn stand-in. */
  const avatar = (kind = "guide", expression) => {
    const client = String(kind).includes("client");
    const character = client ? active?.item.game.client.portrait : "lumi";
    const mood = expression || (/right/.test(kind) ? "happy" : /(wrong|hint)/.test(kind) ? (client ? "surprised" : "thinking") : "normal");
    const have = portraits();
    const name = character && [`${character}-${mood}`, `${character}-normal`].find((n) => have.has(n));
    if (name) return h("div", { class: "case-portrait", "aria-hidden": "true" }, h("img", { src: `/art/faces/${name}.webp`, alt: "", width: 160, height: 160 }));
    return h("div", { class: `guide-avatar ${client ? "client-avatar" : ""}`, "aria-hidden": "true" }, h("span", {}));
  };
  const bubble = (who, text, kind, expression) => h("div", { class: `case-say ${kind || ""}` }, avatar(kind, expression), h("div", { class: "case-say-text" }, h("b", {}, who), h("p", {}, text)));

  /** Rows of the report that belong to a section title, with their first-cell text. */
  function rowsIn(sectionTitle) {
    const section = [...reportsEl.querySelectorAll("details.section")].find((d) => d.querySelector("summary > span")?.textContent === sectionTitle);
    if (!section) return [];
    return [...section.querySelectorAll("tbody tr, .section-body > ul > li")].map((row) => ({ row, cell: (row.matches("tr") ? row.cells[0]?.textContent : row.textContent)?.trim() || "" }));
  }

  /** Keep stamped rows stamped after the report re-renders. */
  function restoreStamps(game) {
    for (const item of game.bag) for (const { row, cell } of rowsIn(item.section)) if (cell === item.text) row.classList.add("case-evidence");
  }

  function currentTarget() {
    const { item, reports, game } = active;
    const question = item.questions[game.clue];
    return question && { question, target: clueTarget(question, reports) };
  }

  function say(text, mood = "") {
    active.game.line = text;
    active.game.mood = mood;
    renderHud();
  }

  function flyToBag(fromRow) {
    if (reduced()) return;
    const bag = hud.querySelector(".case-hud-bag");
    if (!bag || !fromRow.getBoundingClientRect) return;
    const a = fromRow.getBoundingClientRect();
    const b = bag.getBoundingClientRect();
    const chip = h("div", { class: "case-fly", "aria-hidden": "true" }, "证据");
    chip.style.left = `${a.left + 16}px`;
    chip.style.top = `${a.top + a.height / 2 - 12}px`;
    document.body.append(chip);
    chip
      .animate([{ transform: "translate(0,0) scale(1)", opacity: 1 }, { transform: `translate(${b.left - a.left - 16}px, ${b.top - a.top - a.height / 2 + 12}px) scale(.6)`, opacity: 0.4 }], { duration: 650, easing: "cubic-bezier(.5,0,.3,1)" })
      .finished.then(() => chip.remove(), () => chip.remove());
  }

  /** Clicks on report rows while hunting. */
  reportsEl.addEventListener("click", (event) => {
    if (!active || active.game.phase !== "hunt" || active.game.solved) return;
    const row = event.target.closest("details.section tbody tr, details.section .section-body > ul > li");
    if (!row) return;
    const current = currentTarget();
    if (!current || current.target.kind !== "rows") return;
    const section = row.closest("details.section").querySelector("summary > span")?.textContent || "";
    const cell = (row.matches("tr") ? row.cells[0]?.textContent : row.textContent)?.trim() || "";
    const game = active.game;
    const verdict = judgeClick(current.target, game.found, section, cell);
    if (verdict === "found") {
      game.found.push(cell);
      if (!game.bag.some((b) => b.text === cell && b.section === section)) {
        game.bag.push({ text: cell, section });
        row.classList.add("case-evidence");
        flyToBag(row);
      }
      const left = current.target.required.length - game.found.length;
      if (left === 0) {
        game.solved = true;
        say(current.question.explain, "right");
      } else say(`找到了！收进证据袋。还差 ${left} 件。`, "right");
      rerender();
    } else if (verdict === "again") say("这一件已经找到了，看看别的。");
    else {
      game.mistakes += 1;
      say(verdict === "wrong-section" ? "这一块和问题没关系。想想问的是什么，换个板块找找。" : "不是这一行。仔细读读这个板块的其他行。", "wrong");
      row.classList.remove("case-miss");
      void row.offsetWidth;
      row.classList.add("case-miss");
    }
  });

  function hint() {
    const current = currentTarget();
    if (!current) return;
    active.game.hints += 1;
    say(current.question.hint, "hint");
    if (current.question.section) showSection(current.question.section);
  }

  function nextClue() {
    const game = active.game;
    game.clue += 1;
    game.found = [];
    game.solved = false;
    game.line = null;
    game.mood = "";
    if (game.clue >= active.item.questions.length) {
      game.phase = active.item.game.lab ? "lab" : "verdict";
      rerender();
      panel.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
      return;
    }
    rerender();
  }

  function answerChoice(option) {
    const { question } = currentTarget();
    if (option === question.answer) {
      active.game.solved = true;
      say(question.explain, "right");
    } else {
      active.game.mistakes += 1;
      say(`${question.hint}`, "wrong");
    }
    rerender();
  }

  function renderHud() {
    const hunting = active?.game.phase === "hunt";
    reportsEl.classList.toggle("case-hunting", Boolean(hunting && !active.game.solved && currentTarget()?.target.kind === "rows"));
    document.body.classList.toggle("case-hud-on", Boolean(hunting));
    if (!hunting) {
      hud.hidden = true;
      return;
    }
    const game = active.game;
    const current = currentTarget();
    if (!current) return;
    const { question, target } = current;
    const total = active.item.questions.length;
    const text = game.line || question.gamePrompt || question.prompt;
    const counter = target.kind === "rows" && target.required.length > 1 ? h("span", { class: "case-hud-count" }, `${game.found.length} / ${target.required.length}`) : null;
    hud.hidden = false;
    hud.className = `case-hud ${game.mood}`;
    hud.replaceChildren(
      avatar(`guide ${game.mood}`),
      h("div", { class: "case-hud-text", role: "status", "aria-live": "polite" }, h("b", {}, `路米 · 线索 ${game.clue + 1} / ${total}`), h("p", {}, text)),
      h("div", { class: "case-hud-actions" },
        counter,
        game.solved
          ? h("button", { class: "btn primary small", type: "button", onclick: nextClue }, game.clue + 1 < total ? "下一条线索" : "去结案", icon("arrow", { size: 14 }))
          : target.kind === "rows" && h("button", { class: "btn small", type: "button", onclick: hint }, icon("bulb", { size: 14 }), "提示"),
        h("button", { class: "btn small ghost case-hud-bag", type: "button", onclick: () => panel.scrollIntoView({ behavior: "smooth", block: "start" }) }, icon("box", { size: 14 }), `证据袋 ${game.bag.length}`)),
    );
  }

  function bagView(game, { selectable = false, onPick } = {}) {
    if (!game.bag.length) return h("p", { class: "case-bag-empty" }, "证据袋还是空的。在下面的报告里点中线索，证据就会收进来。");
    return h("ul", { class: `case-bag ${selectable ? "selectable" : ""}`, "aria-label": "证据袋" },
      game.bag.map((item) =>
        h("li", {},
          selectable
            ? h("button", { type: "button", class: "case-bag-item", onclick: () => onPick(item) }, h("small", {}, item.section), h("span", {}, item.text))
            : h("div", { class: "case-bag-item" }, h("small", {}, item.section), h("span", {}, item.text)))));
  }

  function startHunt(game) {
    game.phase = "hunt";
    const technical = reportsEl.querySelector("details.report-technical");
    if (technical) technical.open = true;
    rerender();
    setTimeout(() => {
      const target = reportsEl.querySelector("details.report-technical") || reportsEl;
      window.scrollTo({ top: window.scrollY + target.getBoundingClientRect().top - 16, behavior: reduced() ? "auto" : "smooth" });
    }, reduced() ? 0 : 380);
  }

  function renderBrief(item, game) {
    const client = item.game.client;
    if (talking()) {
      // The request is told in the dialogue box; then the hunt starts by itself.
      if (!game.briefTold) {
        game.briefTold = true;
        queueMicrotask(async () => {
          await talk.say([
            ...client.lines.map((line, i) => clientLine(item, line.text ?? line, line.face || (i === 0 ? "normal" : "thinking"))),
            { text: "报告已经拿到了，它就是我们的调查现场。我会一条条给你线索，你在报告里点出证据。少犯错、少用提示，评价就越高。", face: "happy" },
          ]);
          if (game.phase === "brief") startHunt(game);
        });
      }
      return [
        h("p", { class: "case-kicker" }, "案例馆 · 新委托"),
        h("h3", { id: "case-quest-title" }, item.title),
        h("p", { class: "case-hunt-tip" }, `委托人：${client.name}（${client.role}）`),
        h("div", { class: "case-actions" }, h("button", { class: "btn primary", type: "button", onclick: () => startHunt(game) }, icon("scan", { size: 16 }), "开始调查")),
      ];
    }
    return [
      h("p", { class: "case-kicker" }, "案例馆 · 新委托"),
      h("h3", { id: "case-quest-title" }, item.title),
      // A line is "text" or { text, face } so the story can pick each expression.
      ...client.lines.map((line, i) => bubble(`${client.name}（${client.role}）`, line.text ?? line, "client", line.face || (i === 0 ? "normal" : "thinking"))),
      bubble("路米", "报告已经拿到了，它就是我们的调查现场。我会一条条给你线索，你在报告里点出证据。少犯错、少用提示，评价就越高。"),
      h("div", { class: "case-actions" },
        h("button", { class: "btn primary", type: "button", onclick: () => startHunt(game) }, icon("scan", { size: 16 }), "接下委托，开始调查")),
    ];
  }

  function renderHunt(item, game) {
    const total = item.questions.length;
    const current = currentTarget();
    const choice = current?.target.kind === "choice" && !game.solved;
    return [
      h("p", { class: "case-kicker" }, `案例馆 · 调查中 · 线索 ${game.clue + 1} / ${total}`),
      h("h3", { id: "case-quest-title" }, item.title),
      h("ol", { class: "case-dots", "aria-label": "调查进度" }, item.questions.map((_, i) => h("li", { class: i < game.clue || (i === game.clue && game.solved) ? "done" : i === game.clue ? "active" : "" }, i + 1))),
      !talking() && bubble("路米", game.line || current?.question.gamePrompt || current?.question.prompt || "", game.mood),
      choice && h("div", { class: "case-options", role: "radiogroup" }, current.question.options.map((option) => h("button", { type: "button", class: "case-option", onclick: () => answerChoice(option) }, option))),
      !choice && !game.solved && h("p", { class: "case-hunt-tip" }, icon("down", { size: 14 }), "答案在下面的报告里：先打开相关的板块，再点中那一行。"),
      h("div", { class: "case-bag-head" }, h("b", {}, `证据袋（${game.bag.length}）`)),
      bagView(game),
    ];
  }

  function toVerdict(game) {
    game.phase = "verdict";
    rerender();
    panel.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
  }

  function renderLab(item, game) {
    const lab = item.game.lab;
    if (!game.labEl) {
      try {
        game.labEl = mountLab({ h, icon, lab, onMistake: () => (game.mistakes += 1), onHint: () => (game.hints += 1), onFinish: () => toVerdict(game), onDone: () => {
          if (talking() && lab.done?.length) talk.say(lab.done.map((line) => (line.who === "client" ? clientLine(item, line.text, line.face || "happy") : { text: line.text ?? line, face: line.face || "happy" })));
        } });
      } catch (error) {
        toast(`实验打不开：${error.message}`);
        queueMicrotask(() => toVerdict(game));
        return [];
      }
    }
    if (talking() && !game.labTold && lab.intro?.length) {
      game.labTold = true;
      queueMicrotask(() => talk.say(lab.intro.map((line) => (line.who === "client" ? clientLine(item, line.text, line.face || "normal") : { text: line.text ?? line, face: line.face || "normal" }))));
    }
    return [
      h("p", { class: "case-kicker" }, "案例馆 · 动手实验"),
      h("h3", { id: "case-quest-title" }, item.title),
      !talking() && lab.intro?.length && bubble("路米", lab.intro.filter((line) => line.who !== "client").map((line) => line.text ?? line).join("")),
      game.labEl,
    ];
  }

  function closedView(item, game, stars) {
    const verdict = item.game.verdict;
    if (game.phase !== "closed") {
      game.phase = "closed";
      game.stars = stars;
      saveStars(item.id, stars);
      onSolved(item.id);
      if (talking()) queueMicrotask(() => talk.say([clientLine(item, verdict.closing, "happy")]));
    }
    return [
      h("div", { class: "case-closed" },
        h("div", { class: "case-stamp", "aria-hidden": "true" }, "结案"),
        h("p", { class: "case-kicker" }, "案例馆 · 结案"),
        h("h3", { id: "case-quest-title" }, item.title),
        h("p", { class: "case-stars", "aria-label": `评价 ${game.stars} 星` }, starText(game.stars)),
        h("p", { class: "case-score" }, `犯错 ${game.mistakes} 次 · 用了 ${game.hints} 次提示`, game.stars < 3 ? " · 少犯错、少问路米可以拿满三星" : " · 完美破案！"),
        !talking() && bubble(item.game.client.name, verdict.closing.replace(/^[^：]+：/, ""), "client", "happy")),
      ...extras(item),
    ];
  }

  /** A puzzle case (case-puzzle.js): its own element runs the investigation; here only the brief and the close. */
  function renderPuzzle(item, game) {
    if (game.phase === "closed" || game.puzzle?.phase === "done") return closedView(item, game, game.stars ?? starsForPuzzle(game));
    const client = item.game.client;
    const brief = item.game.puzzle.brief || [];
    if (!game.puzzle) {
      game.puzzle = createPuzzle({
        h, icon, item, talk, toast,
        line: (who, text, face) => (who === "client" ? clientLine(item, text, face || "normal") : { text, face: face || "normal" }),
        onMistake: () => (game.mistakes += 1),
        onHint: () => (game.hints += 1),
        onDone: () => rerender(),
      });
      if (talking()) queueMicrotask(() => talk.say([...client.lines.map((l, i) => clientLine(item, l.text ?? l, l.face || (i === 0 ? "normal" : "thinking"))), ...brief.map((l) => ({ text: l.text ?? l, face: l.face || "normal" }))]));
    }
    return [
      h("h3", { id: "case-quest-title" }, item.title),
      talking() ? h("p", { class: "case-hunt-tip" }, `委托人：${client.name}（${client.role}）`) : [
        ...client.lines.map((l, i) => bubble(`${client.name}（${client.role}）`, l.text ?? l, "client", l.face || (i === 0 ? "normal" : "thinking"))),
        ...brief.map((l) => bubble("路米", l.text ?? l, "guide", l.face)),
      ],
      game.puzzle.el,
    ];
  }

  function renderVerdict(item, game) {
    const verdict = item.game.verdict;
    const claim = verdict.claims[game.claim];
    if (!claim) return closedView(item, game, starsFor(game));
    const pick = (evidence) => {
      if (provesClaim(claim, evidence.text)) {
        game.presented.push({ claim: claim.text, evidence: evidence.text });
        game.claim += 1;
        game.line = null;
        game.mood = "";
      } else {
        game.mistakes += 1;
        game.line = verdict.objection;
        game.mood = "wrong";
        if (talking()) talk.say([clientLine(item, verdict.objection, "surprised")]);
      }
      rerender();
    };
    if (talking()) {
      if (game.spokenClaim !== game.claim) {
        const first = game.spokenClaim === undefined;
        game.spokenClaim = game.claim;
        queueMicrotask(() => talk.say([...(first ? [{ text: verdict.intro, face: "normal" }] : [{ text: ["说得好！", "没错，就是这条证据！", "漂亮，一针见血！", "对，证据摆在这儿呢。"][game.claim % 4], face: "happy" }]), clientLine(item, claim.text, "thinking")]));
      }
      return [
        h("p", { class: "case-kicker" }, `案例馆 · 结案指认 · ${game.claim + 1} / ${verdict.claims.length}`),
        h("h3", { id: "case-quest-title" }, item.title),
        game.presented.length > 0 && h("ul", { class: "case-presented" }, game.presented.map((p) => h("li", {}, icon("check", { size: 14 }), h("span", {}, p.claim), h("b", {}, p.evidence)))),
        h("p", { class: "case-claim-now" }, h("small", {}, `${item.game.client.name}说：`), claim.text),
        h("p", { class: "case-hunt-tip" }, "从证据袋里挑一件证据，反驳这句话："),
        bagView(game, { selectable: true, onPick: pick }),
      ];
    }
    return [
      h("p", { class: "case-kicker" }, `案例馆 · 结案指认 · ${game.claim + 1} / ${verdict.claims.length}`),
      h("h3", { id: "case-quest-title" }, item.title),
      game.claim === 0 && !game.line && bubble("路米", verdict.intro),
      game.presented.length > 0 && h("ul", { class: "case-presented" }, game.presented.map((p) => h("li", {}, icon("check", { size: 14 }), h("span", {}, p.claim), h("b", {}, p.evidence)))),
      bubble(item.game.client.name, claim.text, "client", "thinking"),
      game.line && bubble(item.game.client.name, game.line.replace(/^[^：]+：/, ""), `client ${game.mood}`),
      h("p", { class: "case-hunt-tip" }, "从证据袋里挑一件证据，反驳这句话："),
      bagView(game, { selectable: true, onPick: pick }),
    ];
  }

  return {
    /** Panel content for a case in detective mode, and keep the HUD in sync. */
    render(item, reports) {
      const game = gameOf(item.id);
      active = { item, reports, game };
      restoreStamps(game);
      if (game.phase === "hunt") {
        const current = currentTarget();
        if (current && !current.target.available) {
          toast(`报告里没有「${current.question.section}」，这条线索先跳过`);
          game.solved = true;
        }
      }
      if (item.game.puzzle) {
        hud.hidden = true;
        document.body.classList.remove("case-hud-on");
        reportsEl.classList.remove("case-hunting");
        return renderPuzzle(item, game);
      }
      renderHud();
      if (game.phase === "brief") return renderBrief(item, game);
      if (game.phase === "hunt") return renderHunt(item, game);
      if (game.phase === "lab") return renderLab(item, game);
      return renderVerdict(item, game);
    },
    reset(id) {
      games.delete(id);
      reportsEl.querySelectorAll(".case-evidence").forEach((row) => row.classList.remove("case-evidence"));
    },
    hide() {
      active = null;
      hud.hidden = true;
      reportsEl.classList.remove("case-hunting");
      document.body.classList.remove("case-hud-on");
    },
  };
}
