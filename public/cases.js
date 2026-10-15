import { isCorrect, questionOptions } from "./case-quest.js";
import { mountSaveLab } from "./save-lab.js";
import { createDetective, savedStars, starText } from "./case-detective.js";
import { sceneBanner } from "./scenes.js";

// 案例馆: pick a case, analyse its sample, then investigate the report question by question.
// Beginners answer one question at a time with hints that jump to the right report section;
// professionals see the findings and explanations directly. A "stories" case is read, not analysed.
export function mountCases({ h, icon, api, toast, analyze, busy, showHome, showEngines, getReports, getTarget, isPro, openReplicate, onCatalog, onSolved = () => {} }) {
  const library = document.querySelector("#case-library");
  const list = document.querySelector("#case-list");
  const quest = document.querySelector("#case-quest");
  const storiesPanel = document.querySelector("#case-stories");
  let catalog = [];
  const progress = new Map(); // case id -> { index, picked: Set, feedback, solved: Set }
  const labs = new Map(); // case id -> lab element, kept so its progress survives re-renders
  let reading = null; // id of the stories case being read
  let portraits = new Set();
  let pixelArt = new Set();
  const detective = createDetective({ h, icon, toast, panel: quest, showSection, rerender: () => render(), extras: (item) => [lab(item), conclusion(item)].filter(Boolean), portraits: () => portraits, onSolved });

  const norm = (p) => String(p || "").replace(/[\\/]+$/, "").replace(/\\/g, "/").toLowerCase();
  const activeCase = () => catalog.find((c) => norm(c.path) === norm(getTarget()));
  const stateOf = (id) => {
    if (!progress.has(id)) progress.set(id, { index: 0, picked: new Set(), feedback: null, solved: new Set() });
    return progress.get(id);
  };

  const ENGINE_NAMES = { jadx: "JADX", java: "Java" };

  async function missingEngines(item) {
    if (!item.requires?.length) return [];
    const engines = await api("/api/engines");
    return item.requires.filter((id) => {
      const engine = engines.find((e) => e.id === id);
      return !(engine?.ok || engine?.partial);
    });
  }

  async function start(item) {
    if (item.type === "stories") {
      reading = item.id;
      onSolved(item.id);
      showHome();
      library.open = false;
      render();
      // The library above closes with a short height transition; scroll once it has settled.
      setTimeout(() => storiesPanel.scrollIntoView({ behavior: "smooth", block: "start" }), 380);
      return;
    }
    if (busy()) return toast("探索进行中，请先停止当前探索");
    let missing = [];
    try {
      missing = await missingEngines(item);
    } catch {}
    if (missing.length) {
      toast(`这个案例要先安装 ${missing.map((id) => ENGINE_NAMES[id] || id).join(" 和 ")}，正在带你去「工具铺」`);
      return showEngines?.();
    }
    reading = null;
    storiesPanel.hidden = true;
    progress.delete(item.id);
    labs.delete(item.id);
    detective.reset(item.id);
    showHome();
    library.open = false;
    analyze(item.path);
  }

  function renderList() {
    const stars = savedStars();
    list.replaceChildren(
      ...catalog.map((item) =>
        h(
          "article",
          { class: "case-card", role: "listitem" },
          h("div", { class: "case-card-head" }, h("span", { class: "case-no" }, String(item.order).padStart(2, "0")), h("h3", {}, item.title), stars[item.id] && h("span", { class: "case-card-stars", "aria-label": `最好成绩 ${stars[item.id]} 星` }, starText(stars[item.id]))),
          item.game && h("p", { class: "case-mode-tag" }, icon("spark", { size: 14 }), "侦探模式：在报告里亲手找证据"),
          h("p", { class: "case-story" }, item.story),
          h("div", { class: "case-skills" }, item.skills.map((skill) => h("span", { class: "tag" }, skill))),
          item.requires?.length && h("p", { class: "case-requires" }, icon("engines", { size: 15 }), `需要先安装分析引擎：${item.requires.map((id) => ENGINE_NAMES[id] || id).join(" + ")}`),
          item.type === "stories"
            ? h("button", { class: "btn primary", type: "button", onclick: () => start(item) }, icon("learn", { size: 16 }), "阅读故事")
            : h("button", { class: "btn primary", type: "button", onclick: () => start(item) }, icon("scan", { size: 16 }), "开始调查"),
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
    if (state.index >= total) {
      onSolved(item.id); // the conclusion is reached: the case counts as solved
      return [dots, lab(item), conclusion(item)];
    }
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
      lab(item),
      conclusion(item),
    ];
  }

  /** The case's own scene (e.g. the client's room) above its investigation. */
  function sceneOf(item) {
    const scene = item.scene;
    if (!scene) return null;
    return sceneBanner({ h, icon, id: `case-${item.id}`, place: scene.place, purpose: `案例 ${item.order}`, iconName: item.type === "stories" ? "learn" : "scan", art: `case-scene-${item.id}`, look: scene.look, sprites: [["lumi", "26%"], ...(scene.client ? [[scene.client, "70%"]] : [])], have: pixelArt, compact: true });
  }

  function lab(item) {
    if (item.lab?.type !== "save-editor") return null;
    if (!labs.has(item.id)) {
      try {
        labs.set(item.id, mountSaveLab({ h, icon, lab: item.lab }));
      } catch (error) {
        return h("p", { class: "rep-note" }, `存档实验室打不开：${error.message}`);
      }
    }
    return labs.get(item.id);
  }

  function renderStories(item) {
    const byId = new Map(catalog.map((c) => [c.id, c]));
    return [
      h("p", { class: "case-story-intro" }, item.story),
      h("div", { class: "case-stories" }, item.stories.map((story) => {
        const related = story.related && byId.get(story.related);
        return h("article", { class: "case-tale" },
          h("p", { class: "case-tale-when" }, story.when),
          h("h4", {}, story.title),
          h("p", {}, story.body),
          h("p", { class: "case-tale-lesson" }, icon("bulb", { size: 15 }), story.lesson),
          h("div", { class: "case-actions" },
            related && h("button", { class: "btn small", type: "button", onclick: () => start(related) }, icon("scan", { size: 14 }), `动手做：${related.title.split("：")[0]}`),
            story.link && h("a", { class: "btn small ghost", href: story.link, target: "_blank", rel: "noopener noreferrer" }, "看原文（英文）")));
      })),
      h("div", { class: "case-actions" }, h("button", { class: "btn", type: "button", onclick: () => ((reading = null), render(), open()) }, icon("back", { size: 15 }), "回到案例馆")),
    ];
  }

  function render() {
    const story = reading && catalog.find((c) => c.id === reading);
    storiesPanel.hidden = !story;
    if (story) {
      storiesPanel.replaceChildren(
        sceneOf(story) || "",
        h("div", { class: "case-quest-head" }, h("p", { class: "case-kicker" }, "案例馆 · 真实世界"), h("h3", { id: "case-stories-title" }, story.title)),
        ...renderStories(story).filter(Boolean),
      );
    }
    const item = activeCase();
    const reports = getReports();
    if (!item || !reports.length) {
      quest.hidden = true;
      detective.hide();
      return;
    }
    quest.hidden = false;
    if (item.game && !isPro()) {
      quest.replaceChildren(...[sceneOf(item), ...detective.render(item, reports)].filter(Boolean));
      renderList();
      return;
    }
    detective.hide();
    quest.replaceChildren(
      ...[sceneOf(item)].filter(Boolean),
      h("div", { class: "case-quest-head" }, h("p", { class: "case-kicker" }, "案例馆 · 调查任务"), h("h3", { id: "case-quest-title" }, item.title), !isPro() && h("p", {}, "报告已经到手。下面几条线索，都能在下方的报告里找到答案。")),
      ...(isPro() ? renderPro(item, reports) : renderBeginner(item, reports)).filter(Boolean),
    );
  }

  async function load() {
    try {
      const data = await api("/api/cases");
      catalog = data.cases;
      portraits = new Set(data.portraits || []);
      pixelArt = new Set(data.pixel || []);
      onCatalog?.();
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
  return {
    refresh: render,
    open,
    /** For the game shell: the case list, and starting a case from a client's door. */
    catalog: () => catalog,
    startById(id) {
      const item = catalog.find((c) => c.id === id);
      if (item) start(item);
    },
  };
}
