import { mountLab } from "./case-labs.js";
import { canStamp } from "./case-tension.js";

// 解谜委托 (a case with `game.puzzle`): no list of questions. The player looks around the client's
// room for clues, searches the unpacked code with their own words (the shipped code has no developer
// comments, so they have to think in the code's English names), collects names into the notebook,
// fills the deduction board (a group only stamps when all of it is right), proves it in the lab, and
// finally takes apart the app's own claims by presenting evidence.
//
// Phases: investigate → lab → confront → done. Everything lives in one element that re-renders its
// own parts, so typing and the lab's running app are never thrown away by a re-render.

const MAX_RESULTS = 6;

/** The code as shipped: whole-line comments removed (kept as blank so line numbers stay true). */
export function shippedLines(sources) {
  const out = [];
  for (const [file, text] of Object.entries(sources)) {
    if (!/\.(js|html|json)$/.test(file)) continue; // config files ship inside the package too
    text.split("\n").forEach((line, i) => {
      if (!line.trim() || /^\s*(\/\/|<!--)/.test(line)) return;
      out.push({ file, n: i + 1, text: line, all: text.split("\n") });
    });
  }
  return out;
}

/** Lines matching a query (case-insensitive, all words must appear), and whether there were too many. */
export function searchCode(lines, query) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return { hits: [], more: 0 };
  const hits = lines.filter((line) => words.every((w) => line.text.toLowerCase().includes(w)));
  return { hits: hits.slice(0, MAX_RESULTS), more: Math.max(0, hits.length - MAX_RESULTS) };
}

/** Split a line into plain text and the collectable names in it (longest names first). */
export function termsIn(text, terms) {
  const sorted = [...terms].sort((a, b) => b.length - a.length);
  const parts = [];
  let i = 0;
  let plain = "";
  while (i < text.length) {
    const word = sorted.find((t) => text.startsWith(t, i) && !/[\w$]/.test(text[i - 1] || "") && !/[\w$]/.test(text[i + t.length] || ""));
    if (word) {
      if (plain) parts.push(plain);
      plain = "";
      parts.push({ term: word });
      i += word.length;
    } else plain += text[i++];
  }
  if (plain) parts.push(plain);
  return parts;
}

/** A board group's blanks: { ok, wrong } given the chosen words. */
export function checkGroup(group, chosen) {
  const blanks = blanksOf(group.text);
  const wrong = blanks.filter((answer, i) => chosen[i] !== answer).length;
  return { ok: wrong === 0, wrong };
}
export const blanksOf = (text) => [...text.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);

/** Whether a piece of evidence breaks a statement. */
export const breaks = (statement, evidence) => Boolean(statement.accept?.some((a) => evidence.text.includes(a)));

export function starsForPuzzle({ mistakes = 0, hints = 0 }) {
  const slips = mistakes + hints;
  return slips <= 2 ? 3 : slips <= 6 ? 2 : 1;
}

// Small pixel props for the stand-in room (the art request asks for a real room picture).
const PROPS = {
  laptop: '<rect x="2" y="2" width="28" height="18" fill="#2a3346"/><rect x="4" y="4" width="24" height="14" fill="#9fd3c7"/><rect x="6" y="6" width="10" height="2" fill="#2a3346"/><rect x="6" y="10" width="6" height="3" fill="#e8c270"/><rect x="14" y="10" width="6" height="3" fill="#e8c270"/><rect x="22" y="10" width="4" height="3" fill="#e8c270"/><rect x="0" y="20" width="32" height="4" fill="#5b6a8a"/>',
  phone: '<rect x="9" y="1" width="14" height="24" fill="#1d2433"/><rect x="11" y="4" width="10" height="16" fill="#f0e3bf"/><rect x="12" y="6" width="8" height="3" fill="#e46a5d"/><rect x="12" y="11" width="6" height="1" fill="#5b6a8a"/><rect x="12" y="13" width="7" height="1" fill="#5b6a8a"/>',
  chat: '<rect x="3" y="3" width="26" height="18" fill="#fbf6e6" stroke="#2a3346"/><rect x="6" y="6" width="14" height="4" fill="#7fb069"/><rect x="12" y="13" width="14" height="4" fill="#9fd3c7"/><rect x="6" y="21" width="4" height="3" fill="#fbf6e6"/>',
  router: '<rect x="2" y="12" width="28" height="10" fill="#2a3346"/><rect x="6" y="2" width="2" height="10" fill="#2a3346"/><rect x="24" y="2" width="2" height="10" fill="#2a3346"/><rect x="6" y="16" width="3" height="2" fill="#7fb069"/><rect x="12" y="16" width="3" height="2" fill="#e8c270"/><rect x="18" y="16" width="3" height="2" fill="#7fb069"/>',
  paper: '<rect x="6" y="2" width="20" height="24" fill="#fbf6e6" stroke="#b19b69"/><rect x="9" y="6" width="14" height="2" fill="#5b6a8a"/><rect x="9" y="11" width="12" height="1" fill="#b19b69"/><rect x="9" y="14" width="13" height="1" fill="#b19b69"/><rect x="9" y="17" width="10" height="1" fill="#b19b69"/><rect x="9" y="20" width="12" height="1" fill="#b19b69"/>',
  clock: '<rect x="6" y="2" width="20" height="22" fill="#2a3346"/><rect x="8" y="4" width="16" height="18" fill="#fbf6e6"/><rect x="15" y="6" width="2" height="7" fill="#2a3346"/><rect x="15" y="12" width="6" height="2" fill="#e46a5d"/>',
  cat: '<rect x="6" y="12" width="20" height="10" fill="#e8a25a"/><rect x="20" y="6" width="9" height="9" fill="#e8a25a"/><rect x="20" y="4" width="2" height="3" fill="#e8a25a"/><rect x="27" y="4" width="2" height="3" fill="#e8a25a"/><rect x="22" y="9" width="1" height="1" fill="#2a3346"/><rect x="26" y="9" width="1" height="1" fill="#2a3346"/><rect x="2" y="10" width="4" height="2" fill="#e8a25a"/>',
};
const prop = (look) => {
  const box = document.createElement("span");
  box.className = "pz-prop";
  box.innerHTML = `<svg viewBox="0 0 32 28" width="64" height="56" shape-rendering="crispEdges" aria-hidden="true">${PROPS[look] || PROPS.paper}</svg>`;
  return box;
};

/**
 * talk: { can(), say(lines) } as in case-detective; line(who, text, face) makes a dialogue line for the
 * client ("client") or 路米. Calls onMistake / onHint as the player slips, onDone() when the case is closed.
 */
export function createPuzzle({ h, icon, item, talk, line, onMistake, onHint, onDone, toast = () => {} }) {
  const puzzle = item.game.puzzle;
  const lab = item.game.lab;
  const talking = () => Boolean(talk?.can());
  const speak = (lines) => (talking() ? talk.say(lines.map((l) => line(l.who, l.text ?? l, l.face))) : Promise.resolve());
  const code = shippedLines(lab.sources);
  const terms = puzzle.terms;

  const state = {
    phase: "investigate",
    tab: "room",
    seen: new Set(), // room items looked at
    clues: [], // { id, title, text }
    dict: [], // { zh, code }
    words: new Set(), // collected names
    evidence: [], // { id, text, where }
    chosen: puzzle.board.map((group) => blanksOf(group.text).map(() => "")),
    solved: new Set(), // board group indexes
    broken: new Set(), // statement indexes
    statement: 0,
    query: "",
    results: null,
    roomSay: "",
    boardSay: puzzle.board.map(() => ""),
    confrontSay: "",
  };

  const root = h("div", { class: "pz" });
  const say = (box, text, mood = "") => {
    box.textContent = text;
    box.className = `pz-say ${mood}`;
  };

  /* ----- notebook ----- */
  function addClue(clue) {
    if (!clue || state.clues.some((c) => c.id === clue.id)) return;
    state.clues.push(clue);
    for (const entry of clue.dict || []) if (!state.dict.some((d) => d.zh === entry.zh)) state.dict.push(entry);
  }
  function collect(term) {
    if (state.words.has(term)) return false;
    state.words.add(term);
    toast(`「${term}」记进了笔记`);
    return true;
  }
  function pin(hit) {
    const id = `${hit.file}:${hit.n}`;
    if (state.evidence.some((e) => e.id === id)) return;
    state.evidence.push({ id, text: hit.text.trim(), where: id });
    toast("这行代码记成了证据");
  }

  /* ----- views ----- */
  const tabs = [
    ["room", "现场", "home"],
    ["search", "代码搜索", "scan"],
    ["notes", "笔记", "file"],
    ["board", "推理板", "bulb"],
  ];
  const tabBar = h("div", { class: "pz-tabs", role: "tablist" });
  const body = h("div", { class: "pz-body" });
  const labBox = h("div", {});
  const confrontBox = h("div", {});

  function renderTabs() {
    tabBar.replaceChildren(...tabs.map(([id, text, ic]) => {
      const count = id === "notes" ? state.clues.length + state.words.size + state.evidence.length : id === "board" ? `${state.solved.size}/${puzzle.board.length}` : "";
      return h("button", { type: "button", role: "tab", class: `pz-tab ${state.tab === id ? "on" : ""}`, "aria-selected": String(state.tab === id), onclick: () => ((state.tab = id), render()) }, icon(ic, { size: 14 }), text, count !== "" && h("small", {}, String(count)));
    }), h("button", { type: "button", class: "btn small ghost pz-hint", onclick: hint }, icon("bulb", { size: 13 }), "问路米"));
  }

  const roomSay = h("p", { class: "pz-say", role: "status" });
  function roomView() {
    const scene = puzzle.scene;
    return [
      h("p", { class: "pz-lead" }, scene.lead),
      h("div", { class: "pz-room", style: scene.art ? `background-image:url(/art/pixel/${scene.art}.webp)` : null, "aria-label": scene.place },
        scene.items.map((thing) => h("button", {
          type: "button",
          class: `pz-thing ${state.seen.has(thing.id) ? "seen" : ""}`,
          style: `left:${(thing.at[0] / 320) * 100}%;top:${Math.max(0, (thing.at[1] / 180) * 100 - 16)}%`,
          "aria-label": thing.label,
          onclick: async () => {
            const first = !state.seen.has(thing.id);
            state.seen.add(thing.id);
            addClue(thing.clue);
            say(roomSay, (thing.lines || []).map((l) => l.text ?? l).join(" "));
            render();
            await speak(thing.lines || []);
            if (first && thing.clue) toast(`线索「${thing.clue.title}」记进了笔记`);
          },
        }, prop(thing.look), h("span", { class: "pz-thing-label" }, thing.label)))),
      roomSay,
    ];
  }

  const searchInput = h("input", { class: "pz-search-input", type: "search", placeholder: "输入要找的词，回车搜索", spellcheck: "false", "aria-label": "搜索代码", onkeydown: (e) => e.key === "Enter" && runSearch() });
  const searchSay = h("p", { class: "pz-say", role: "status" });
  function runSearch() {
    state.query = searchInput.value.trim();
    if (!state.query) return;
    state.results = searchCode(code, state.query);
    if (!state.results.hits.length) say(searchSay, /[一-鿿]/.test(state.query) ? "没找到。发布出来的代码里没有开发者写的中文注释，名字都是英文的。翻翻笔记里的小词典。" : "没找到。换个词试试，名字的一部分也行。", "wrong");
    else if (state.results.more) say(searchSay, `结果太多了（还有 ${state.results.more} 条没显示），加一个词缩小范围，比如「fetch URL」。`);
    else say(searchSay, "点代码里带下划线的名字，记进笔记；觉得这一行能当证据，就点「记成证据」。");
    renderBody();
  }
  function snippet(hit) {
    const around = [hit.n - 1, hit.n, hit.n + 1].filter((n) => n >= 1 && n <= hit.all.length);
    return h("li", { class: "pz-hit" },
      h("div", { class: "pz-hit-head" }, h("code", {}, `${hit.file} : ${hit.n}`),
        h("button", { type: "button", class: "btn small ghost", disabled: state.evidence.some((e) => e.id === `${hit.file}:${hit.n}`), onclick: () => (pin(hit), renderBody(), renderTabs()) }, icon("box", { size: 13 }), state.evidence.some((e) => e.id === `${hit.file}:${hit.n}`) ? "已记成证据" : "记成证据")),
      h("pre", { class: "pz-code" }, around.map((n) => {
        const text = hit.all[n - 1];
        const comment = /^\s*(\/\/|<!--)/.test(text);
        return h("span", { class: `pz-line ${n === hit.n ? "hit" : ""}` }, h("i", {}, String(n).padStart(3)), comment ? h("span", { class: "pz-stripped" }, "（这一行在发布版里被删掉了）") : termsIn(text, terms).map((part) => typeof part === "string" ? part : h("button", {
          type: "button",
          class: `pz-term ${state.words.has(part.term) ? "got" : ""}`,
          onclick: () => {
            if (collect(part.term)) (renderBody(), renderTabs());
          },
        }, part.term)), "\n");
      })));
  }
  function searchView() {
    searchInput.value = state.query;
    return [
      h("p", { class: "pz-lead" }, `这是「${puzzle.sampleName || item.title}」的原创教学代码。整行注释不参与搜索，请根据实际字段推理。`),
      h("div", { class: "pz-search" }, searchInput, h("button", { class: "btn small primary", type: "button", onclick: runSearch }, icon("scan", { size: 14 }), "搜索")),
      searchSay,
      state.results?.hits.length ? h("ol", { class: "pz-hits" }, state.results.hits.map(snippet)) : null,
    ];
  }

  function notesView() {
    const section = (title, items, empty) => h("section", { class: "pz-notes-part" }, h("b", {}, title), items.length ? items : h("p", { class: "pz-empty" }, empty));
    return [
      section("线索", state.clues.map((c) => h("div", { class: "pz-card" }, h("b", {}, c.title), h("p", {}, c.text))), "去现场看看，线索会记在这里。"),
      section("小词典 · 中文 → 代码里可能的名字", state.dict.map((d) => h("p", { class: "pz-dict" }, h("span", {}, d.zh), " → ", h("code", {}, d.code), d.note && h("small", {}, d.note))), "看过的线索会教你几个词。"),
      section("记下的名字", state.words.size ? [h("p", { class: "pz-words" }, [...state.words].map((w) => h("code", {}, w)))] : [], "在代码搜索里点带下划线的名字。"),
      section("证据", state.evidence.map((e) => h("div", { class: "pz-card evidence" }, h("small", {}, e.where), h("code", {}, e.text))), "在代码搜索里把关键的一行「记成证据」。"),
    ];
  }

  const boardSays = puzzle.board.map(() => h("p", { class: "pz-say", role: "status" }));
  function boardView() {
    const bank = [...state.words];
    return [
      h("p", { class: "pz-lead" }, "用笔记里记下的名字把句子补完整。一组全部填对才会盖章；不对的话，路米只会告诉你大概错了几处。"),
      ...puzzle.board.map((group, g) => {
        const done = state.solved.has(g);
        let blank = 0;
        const parts = group.text.split(/(\{[^}]+\})/).filter(Boolean).map((part) => {
          if (!/^\{/.test(part)) return part;
          const i = blank++;
          if (done) return h("b", { class: "pz-filled" }, state.chosen[g][i]);
          return h("select", { class: "pz-blank", "aria-label": `空格 ${i + 1}`, onchange: (e) => (state.chosen[g][i] = e.target.value) },
            h("option", { value: "" }, "＿＿＿"), bank.map((w) => h("option", { value: w, selected: state.chosen[g][i] === w }, w)));
        });
        return h("div", { class: `pz-group ${done ? "done" : ""}` },
          h("div", { class: "pz-group-head" }, h("b", {}, `${g + 1}. ${group.title}`), done && h("span", { class: "pz-stamp" }, "推理成立")),
          h("p", { class: "pz-sentence" }, parts),
          !done && h("button", { class: "btn small primary", type: "button", onclick: () => submit(g) }, "就是这样！"),
          boardSays[g]);
      }),
      bank.length < 4 && h("p", { class: "pz-empty" }, "记下的名字还太少。去代码搜索里多找找。"),
    ];
  }
  async function submit(g) {
    const group = puzzle.board[g];
    if (state.chosen[g].some((w) => !w)) return say(boardSays[g], "还有空没填。", "wrong");
    const { ok, wrong } = checkGroup(group, state.chosen[g]);
    if (!ok) {
      onMistake();
      return say(boardSays[g], wrong <= 2 ? "差一点：有一两处不对。" : "还不对，有好几处要再想想。", "wrong");
    }
    const gate = canStamp(group, state.evidence.length);
    if (!gate.ok) {
      onMistake();
      return say(boardSays[g], `这句话本身没错，可笔记里只有 ${gate.have} 件证据，要 ${gate.need} 件才能盖章。先把证据补够——连「证据不足」也要有证据。`, "wrong");
    }
    state.solved.add(g);
    say(boardSays[g], group.explain, "right");    render();
    await speak(group.done || []);
    if (state.solved.size === puzzle.board.length) {
      await speak(puzzle.toLab || []);
      state.phase = "lab";
      render();
      root.scrollIntoView({ block: "start" });
    }
  }

  /* ----- lab ----- */
  let labEl = null;
  function labView() {
    if (!labEl) {
      labEl = mountLab({ h, icon, lab: { ...lab, tasks: puzzle.labTasks || lab.tasks }, onMistake, onHint, finishLabel: "去对质", onDone: () => {
        for (const e of puzzle.labEvidence || []) if (!state.evidence.some((x) => x.id === e.id)) state.evidence.push({ ...e, where: "动手实验" });
        speak(lab.done || []);
      }, onFinish: async () => {
        if (!puzzle.confront) {
          // 没有对质的委托（例如「证据不足」的失败站）：实验做完就结案。
          state.phase = "done";
          render();
          onDone();
          return;
        }
        state.phase = "confront";
        state.tab = "notes";
        render();
        root.scrollIntoView({ block: "start" });
        await speak(puzzle.confront.intro || []);
      } });
    }
    return labEl;
  }

  /* ----- confront ----- */
  const confrontSay = h("p", { class: "pz-say", role: "status" });
  let picking = false;
  function confrontView() {
    const c = puzzle.confront;
    const now = c.statements[state.statement];
    return [
      h("p", { class: "pz-lead" }, c.lead),
      h("ol", { class: "pz-statements" }, c.statements.map((s, i) => h("li", {}, h("button", {
        type: "button",
        class: `pz-statement ${i === state.statement ? "on" : ""} ${state.broken.has(i) ? "broken" : ""}`,
        onclick: () => ((state.statement = i), (picking = false), say(confrontSay, ""), renderBody()),
      }, s.text)))),
      h("div", { class: "pz-confront-actions" },
        h("button", { class: "btn small", type: "button", disabled: state.broken.has(state.statement), onclick: press }, "追问"),
        h("button", { class: "btn small primary", type: "button", disabled: state.broken.has(state.statement), onclick: () => ((picking = !picking), renderBody()) }, icon("box", { size: 13 }), "出示证据")),
      picking && !state.broken.has(state.statement) && (state.evidence.length
        ? h("ul", { class: "pz-evidence-pick" }, state.evidence.map((e) => h("li", {}, h("button", { type: "button", class: "case-bag-item", onclick: () => present(now, e) }, h("small", {}, e.where), h("span", {}, e.text)))))
        : h("p", { class: "pz-empty" }, "还没有证据。回代码搜索里把关键的那行「记成证据」。")),
      confrontSay,
      h("p", { class: "pz-progress" }, `已经戳穿 ${state.broken.size} / ${c.statements.filter((s) => s.accept).length} 处`),
    ];
  }
  async function press() {
    const s = puzzle.confront.statements[state.statement];
    say(confrontSay, (s.press || []).map((l) => l.text ?? l).join(" "));
    await speak(s.press || []);
  }
  async function present(statement, evidence) {
    picking = false;
    if (statement.accept && breaks(statement, evidence)) {
      state.broken.add(state.statement);
      say(confrontSay, statement.broken.map((l) => l.text ?? l).join(" "), "right");
      renderBody();
      await speak([{ text: "异议！", face: "happy" }, ...statement.broken]);
      const left = puzzle.confront.statements.findIndex((s, i) => s.accept && !state.broken.has(i));
      if (left < 0) {
        state.phase = "done";
        render();
        onDone();
      } else {
        state.statement = left;
        renderBody();
      }
      return;
    }
    onMistake();
    const why = statement.accept ? "这件证据和这句话对不上。再想想，这句话哪里不对？" : "这一句……好像是真的？别处才有破绽。可以先「追问」看看。";
    say(confrontSay, why, "wrong");
    renderBody();
    await speak([{ who: "client", text: puzzle.confront.objection, face: "surprised" }]);
  }

  /* ----- hints ----- */
  async function hint() {
    onHint();
    let text;
    if (state.phase === "confront") text = puzzle.confront.statements[state.statement].hint || "先「追问」，听听这句话背后还有什么。";
    else if (state.seen.size < Math.min(3, puzzle.scene.items.length)) text = "先在现场多看看。房间里的东西会告诉你该找什么。";
    else if (state.words.size < 4) text = `去「代码搜索」，用小词典里的词搜一搜，比如「${state.dict[0]?.code.split(" ")[0] || "fetch"}」。`;
    else {
      const g = puzzle.board.findIndex((_, i) => !state.solved.has(i));
      text = g >= 0 ? puzzle.board[g].hint : "推理板都盖章了，去下一步吧。";
    }
    say(state.phase === "confront" ? confrontSay : state.tab === "search" ? searchSay : state.tab === "board" ? boardSays[Math.max(0, puzzle.board.findIndex((_, i) => !state.solved.has(i)))] : roomSay, text);
    await speak([{ text, face: "thinking" }]);
  }

  /* ----- layout ----- */
  function renderBody() {
    const views = { room: roomView, search: searchView, notes: notesView, board: boardView };
    body.replaceChildren(...[views[state.tab]()].flat().filter(Boolean));
    if (state.phase === "confront") confrontBox.replaceChildren(...confrontView().filter(Boolean));
  }
  function render() {
    renderTabs();
    const head = { investigate: "调查现场 · 搜代码 · 推理", lab: "动手实验 · 验证推理", confront: "对质 · 戳穿说法", done: "结案" }[state.phase];
    if (state.phase === "investigate") {
      renderBody();
      root.replaceChildren(h("p", { class: "case-kicker" }, `案例馆 · ${head}`), tabBar, body);
    } else if (state.phase === "lab") {
      root.replaceChildren(h("p", { class: "case-kicker" }, `案例馆 · ${head}`), labView());
    } else if (state.phase === "confront") {
      renderBody();
      root.replaceChildren(h("p", { class: "case-kicker" }, `案例馆 · ${head}`), confrontBox, h("p", { class: "pz-lead" }, "需要更多证据？笔记和代码搜索都还能用："), h("div", { class: "pz-side" }, tabBar, body));
    } else root.replaceChildren();
  }
  render();
  return {
    el: root,
    get phase() {
      return state.phase;
    },
    /** For the debug helper and tests. */
    state,
  };
}
