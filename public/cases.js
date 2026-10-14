import { isCorrect, questionOptions } from "./case-quest.js";

// 案例馆: pick a case, analyse its sample, then investigate the report question by question.
// Beginners answer one question at a time with hints that jump to the right report section;
// professionals see the findings and explanations directly.
export function mountCases({ h, icon, api, toast, analyze, busy, showHome, getReports, getTarget, isPro, openReplicate }) {
  const library = document.querySelector("#case-library");
  const list = document.querySelector("#case-list");
  const quest = document.querySelector("#case-quest");
  let catalog = [];
  const progress = new Map(); // case id -> { index, picked: Set, feedback, solved: Set }

  const norm = (p) => String(p || "").replace(/[\\/]+$/, "").replace(/\\/g, "/").toLowerCase();
  const activeCase = () => catalog.find((c) => norm(c.path) === norm(getTarget()));
  const stateOf = (id) => {
    if (!progress.has(id)) progress.set(id, { index: 0, picked: new Set(), feedback: null, solved: new Set() });
    return progress.get(id);
  };

  function start(item) {
    if (busy()) return toast("探索进行中，请先停止当前探索");
    progress.delete(item.id);
    showHome();
    library.open = false;
    analyze(item.path);
  }

  function renderList() {
    list.replaceChildren(
      ...catalog.map((item) =>
        h(
          "article",
          { class: "case-card", role: "listitem" },
          h("div", { class: "case-card-head" }, h("span", { class: "case-no" }, String(item.order).padStart(2, "0")), h("h3", {}, item.title)),
          h("p", { class: "case-story" }, item.story),
          h("div", { class: "case-skills" }, item.skills.map((skill) => h("span", { class: "tag" }, skill))),
          h("button", { class: "btn primary", type: "button", onclick: () => start(item) }, icon("scan", { size: 16 }), "开始调查"),
        ),
      ),
    );
  }

  /** Open the report section a question relies on, and make it stand out for a moment. */
  function showSection(title) {
    const section = [...document.querySelectorAll("#reports details.section")].find((d) => d.querySelector("summary")?.textContent.startsWith(title));
    if (!section) return toast("报告里没有这个板块");
    let opened = false;
    for (let node = section; node; node = node.parentElement?.closest("details")) {
      opened ||= !node.open;
      node.open = true;
    }
    section.classList.remove("case-flash");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Sections grow open with a short height transition (style.css); scroll once they have their final size.
    setTimeout(() => {
      window.scrollTo({ top: window.scrollY + section.getBoundingClientRect().top - 24, behavior: reduced ? "auto" : "smooth" });
      section.classList.add("case-flash");
    }, opened && !reduced ? 380 : 0);
  }

  function conclusion(item) {
    const c = item.conclusion;
    return h(
      "div",
      { class: "case-conclusion" },
      h("h4", {}, icon("check", { size: 18 }), c.title),
      h("p", {}, c.summary),
      h("div", { class: "case-columns" },
        h("div", {}, h("b", {}, "这门技术在现实中能做什么"), h("ul", {}, c.realWorld.map((x) => h("li", {}, x)))),
        h("div", {}, h("b", {}, "怎么保护自己"), h("ul", {}, c.protect.map((x) => h("li", {}, x))))),
      h("div", { class: "case-actions" },
        c.practice && h("button", { class: "btn primary", type: "button", onclick: openReplicate }, icon("wrench", { size: 16 }), c.practice),
        h("button", { class: "btn", type: "button", onclick: () => open() }, icon("back", { size: 15 }), "回到案例馆")),
    );
  }

  function renderBeginner(item, reports) {
    const state = stateOf(item.id);
    const total = item.questions.length;
    const dots = h("ol", { class: "case-dots", "aria-label": "调查进度" }, item.questions.map((q, i) => h("li", { class: state.solved.has(q.id) ? "done" : i === state.index ? "active" : "" }, i + 1)));
    if (state.index >= total) return [dots, conclusion(item)];
    const question = item.questions[state.index];
    const { available, multi, options } = questionOptions(question, reports);
    if (!available) {
      return [dots, h("p", { class: "rep-note" }, `这道题需要报告里的「${question.section}」，但这次没有生成。可能分析没有完整成功，可以重新开始调查。`), h("button", { class: "btn", type: "button", onclick: () => ((state.index += 1), render()) }, "跳过这题")];
    }
    const solved = state.solved.has(question.id);
    const choose = (option) => {
      if (solved) return;
      if (multi) state.picked.has(option) ? state.picked.delete(option) : state.picked.add(option);
      else state.picked = new Set([option]);
      state.feedback = null;
      render();
    };
    const submit = () => {
      if (!state.picked.size) return toast("先选一个答案");
      if (isCorrect(question, reports, [...state.picked])) {
        state.solved.add(question.id);
        state.feedback = "right";
      } else state.feedback = "wrong";
      render();
    };
    const next = () => {
      state.index += 1;
      state.picked = new Set();
      state.feedback = null;
      render();
      quest.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    return [
      dots,
      h("p", { class: "case-q" }, h("b", {}, `线索 ${state.index + 1} / ${total}`), question.prompt),
      h("div", { class: "case-options", role: multi ? "group" : "radiogroup" },
        options.map((option) => h("button", { type: "button", class: `case-option ${state.picked.has(option) ? "picked" : ""}`, "aria-pressed": String(state.picked.has(option)), disabled: solved, onclick: () => choose(option) }, multi && h("span", { class: "box", "aria-hidden": "true" }), option))),
      state.feedback === "wrong" &&
        h("div", { class: "case-feedback wrong", role: "status" }, h("p", {}, "还不对，再看看报告。", question.hint), h("button", { class: "btn small", type: "button", onclick: () => showSection(question.section) }, icon("down", { size: 14 }), `带我去看「${question.section}」`)),
      state.feedback === "right" && h("div", { class: "case-feedback right", role: "status" }, h("p", {}, h("b", {}, "答对了！"), question.explain)),
      h("div", { class: "case-actions" },
        !solved && h("button", { class: "btn primary", type: "button", onclick: submit }, "确认答案"),
        !solved && question.section && h("button", { class: "btn ghost", type: "button", onclick: () => showSection(question.section) }, "去报告里找线索"),
        solved && h("button", { class: "btn primary", type: "button", onclick: next }, state.index + 1 < total ? "下一条线索" : "揭晓真相", icon("arrow", { size: 15 }))),
    ];
  }

  function renderPro(item, reports) {
    return [
      h("ol", { class: "case-pro" }, item.questions.map((question) => {
        const { correct, available } = questionOptions(question, reports);
        return h("li", {}, h("b", {}, question.prompt), h("p", {}, available ? `答案：${correct.join("、")}` : `报告缺少「${question.section}」`), h("p", { class: "rep-note" }, question.explain));
      })),
      conclusion(item),
    ];
  }

  function render() {
    const item = activeCase();
    const reports = getReports();
    if (!item || !reports.length) {
      quest.hidden = true;
      return;
    }
    quest.hidden = false;
    quest.replaceChildren(
      h("div", { class: "case-quest-head" }, h("p", { class: "case-kicker" }, "案例馆 · 调查任务"), h("h3", { id: "case-quest-title" }, item.title), !isPro() && h("p", {}, "报告已经到手。下面几条线索，都能在下方的报告里找到答案。")),
      ...(isPro() ? renderPro(item, reports) : renderBeginner(item, reports)).filter(Boolean),
    );
  }

  async function load() {
    try {
      catalog = (await api("/api/cases")).cases;
      renderList();
      render();
    } catch (error) {
      list.replaceChildren(h("p", { role: "alert" }, "案例读取失败：" + error.message));
    }
  }

  function open() {
    showHome();
    library.open = true;
    library.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  load();
  return { refresh: render, open };
}
