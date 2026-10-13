import { buildCandidates, buildPrompt, buildSpec, PLATFORMS, ROUTES } from "./replicate-spec.js";

// "自己动手做一个": a five-step exercise after the report. Beginners get one step at a time;
// professionals get every control and the spec on one screen.
const STEPS = ["选一个功能", "决定怎么做", "看说明书", "交给 AI 来做", "对照检查"];

export function mountReplicate({ h, icon, toast, copy, isPro, getReports, getTarget, webAis }) {
  const root = document.querySelector("#replicate");
  let state = null; // { step, choice, platform, route, goal, checks, signature }

  const signatureOf = () => `${getTarget() || ""}|${getReports().length}`;
  const fresh = () => ({ step: 0, choice: "whole", platform: "web", route: "web-ai", goal: "", checks: {}, signature: signatureOf() });
  const spec = () => buildSpec({ reports: getReports(), target: getTarget(), choice: state.choice, platform: state.platform, goal: state.goal });
  const prompt = () => buildPrompt({ spec: spec(), route: state.route, platform: state.platform });
  const go = (step) => {
    state.step = step;
    render();
    root.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  function radioList(name, options, value, onPick) {
    return h(
      "div",
      { class: "rep-options", role: "radiogroup" },
      options.map((option) =>
        h(
          "label",
          { class: "rep-option" },
          h("input", { type: "radio", name, value: option.id, checked: option.id === value, onchange: () => onPick(option.id) }),
          h("span", {}, h("b", {}, option.label), option.meaning && h("em", {}, option.meaning), option.level && h("em", {}, option.level), option.detail && h("small", {}, option.detail)),
        ),
      ),
    );
  }

  function featurePicker(candidates) {
    return candidates.groups.map((group) =>
      h("fieldset", { class: "rep-group" }, h("legend", {}, group.title, h("small", {}, group.hint)), radioList("rep-feature", group.options, state.choice, (id) => (state.choice = id))),
    );
  }

  function goalField() {
    return h(
      "label",
      { class: "rep-goal" },
      h("b", {}, "用一句话写下你想做的东西（可以不写）"),
      h("input", { value: state.goal, placeholder: "例如：一个能记待办、关掉再打开还在的小本子", oninput: (event) => (state.goal = event.target.value) }),
    );
  }

  function specView() {
    const text = spec();
    return h("pre", { class: "code rep-spec", tabindex: "0", "aria-label": "复刻说明书" }, text);
  }

  function handOff() {
    const web = state.route === "web-ai";
    const steps = web
      ? [
          "点下面的「复制给 AI」",
          "打开一个 AI 网站，在输入框里粘贴（Ctrl + V），发送",
          "AI 回答里会有一大段代码。点代码框右上角的「复制」",
          "在桌面上点右键 →「新建」→「文本文档」，打开它，粘贴代码",
          state.platform === "web" ? "点「文件 → 另存为」：文件名写「我的工具.html」，保存类型选「所有文件」，编码选「UTF-8」，保存" : "按 AI 的说明安装需要的软件、新建项目",
          state.platform === "web" ? "双击「我的工具.html」，它会在浏览器里打开" : "按 AI 的说明运行，看看效果",
          "哪里不对？把看到的现象或报错原样告诉 AI，让它改",
        ]
      : [
          "新建一个空文件夹，比如「我的复刻练习」",
          "用 Trae、Cursor 等 AI 编程工具打开这个文件夹",
          "点下面的「复制给 AI」，粘贴到 AI 对话框里发送",
          "AI 会先说方案，你确认后让它写代码",
          "让 AI 告诉你怎么运行，运行起来看看效果",
          "哪里不对，直接告诉 AI 现象，让它改",
        ];
    return [
      h("ol", { class: "steps" }, steps.map((text) => h("li", {}, text))),
      h(
        "div",
        { class: "rep-actions" },
        h("button", { class: "btn primary", type: "button", onclick: () => copy(prompt(), "已复制，去粘贴给 AI 吧") }, icon("copy", { size: 16 }), "复制给 AI"),
        web && webAis.map(([name, url]) => h("a", { class: "btn small", href: url, target: "_blank", rel: "noreferrer" }, name)),
      ),
      h("p", { class: "rep-note" }, "粘贴后，说明书的内容会发给那个 AI。说明书里只有功能描述，没有原软件的代码。"),
    ];
  }

  function checklist() {
    const items = spec()
      .split("\n")
      .filter((line) => line.startsWith("- [ ] "))
      .map((line) => line.slice(6));
    const done = items.filter((item) => state.checks[item]).length;
    return [
      h("ul", { class: "rep-checks" }, items.map((item) => h("li", {}, h("label", {}, h("input", { type: "checkbox", checked: !!state.checks[item], onchange: (event) => ((state.checks[item] = event.target.checked), render()) }), item)))),
      done === items.length
        ? h("p", { class: "rep-done", role: "status" }, icon("check", { size: 16 }), "全部完成！你已经用自己的代码做出了一个类似的功能。可以换一个功能再练一次。")
        : h("p", { class: "rep-note" }, `已完成 ${done} / ${items.length} 项。做不到的项目，把情况告诉 AI，让它帮你补上。`),
    ];
  }

  function nav(back, next, nextLabel = "下一步") {
    return h(
      "div",
      { class: "rep-nav" },
      back != null && h("button", { class: "btn", type: "button", onclick: () => go(back) }, icon("back", { size: 15 }), "上一步"),
      next != null && h("button", { class: "btn primary", type: "button", onclick: () => go(next) }, nextLabel, icon("arrow", { size: 15 })),
    );
  }

  function renderBeginner(candidates) {
    const progress = h("ol", { class: "rep-progress", "aria-label": "复刻练习进度" }, STEPS.map((title, index) => h("li", { class: index === state.step ? "active" : index < state.step ? "done" : "" }, h("span", {}, index + 1), title)));
    const pages = [
      () => [h("p", {}, "从报告里挑一个你想学着自己做的功能。第一次推荐选「做一个整体的简化版」。"), ...featurePicker(candidates), nav(null, 1)],
      () => [
        h("p", {}, "先选做成什么，再选怎么做。不确定就用默认的：网页小工具 + 网页版 AI。"),
        h("h4", {}, "做成什么"),
        radioList("rep-platform", PLATFORMS, state.platform, (id) => (state.platform = id)),
        h("h4", {}, "怎么做"),
        radioList("rep-route", ROUTES, state.route, (id) => (state.route = id)),
        goalField(),
        nav(0, 2, "生成说明书"),
      ],
      () => [
        h("p", {}, "这是给 AI 看的「复刻说明书」：只写这个功能做什么、怎么分工，不包含原软件的代码。你可以先读一遍，确认是你想要的。"),
        specView(),
        h("div", { class: "rep-actions" }, h("button", { class: "btn small", type: "button", onclick: () => copy(spec(), "说明书已复制") }, icon("copy", { size: 15 }), "只复制说明书")),
        nav(1, 3),
      ],
      () => [...handOff(), nav(2, 4, "我做好了，去检查")],
      () => [h("p", {}, "对照说明书，逐项确认你做出来的东西。"), ...checklist(), nav(3, null), h("button", { class: "btn ghost", type: "button", onclick: () => ((state = fresh()), go(0)) }, "换一个功能再练一次")],
    ];
    return [progress, h("div", { class: "rep-page", "aria-live": "polite" }, pages[state.step]())];
  }

  function renderPro(candidates) {
    const options = candidates.groups.flatMap((group) => group.options.map((option) => ({ ...option, group: group.title })));
    const select = (label, items, value, onPick) =>
      h("label", { class: "rep-field" }, h("b", {}, label), h("select", { onchange: (event) => (onPick(event.target.value), render()) }, items.map((item) => h("option", { value: item.id, selected: item.id === value }, item.group ? `${item.group} · ${item.label}` : item.label))));
    return [
      h("div", { class: "rep-pro-grid" }, select("功能", options, state.choice, (id) => (state.choice = id)), select("形式", PLATFORMS, state.platform, (id) => (state.platform = id)), select("路线", ROUTES, state.route, (id) => (state.route = id))),
      goalField(),
      specView(),
      h(
        "div",
        { class: "rep-actions" },
        h("button", { class: "btn primary", type: "button", onclick: () => copy(prompt(), "提示词已复制") }, icon("copy", { size: 15 }), "复制提示词"),
        h("button", { class: "btn", type: "button", onclick: () => copy(spec(), "说明书已复制") }, "复制说明书"),
        h("button", { class: "btn", type: "button", onclick: () => render() }, "按当前输入刷新"),
      ),
    ];
  }

  function render() {
    const reports = getReports();
    if (!reports.length) {
      root.hidden = true;
      return;
    }
    if (!state || state.signature !== signatureOf()) state = fresh();
    const candidates = buildCandidates(reports);
    root.hidden = false;
    root.replaceChildren(
      h("div", { class: "rep-head" }, h("h3", { id: "replicate-title" }, isPro() ? "复刻练习 · 功能说明书" : "自己动手做一个"), h("p", {}, isPro() ? "从报告生成净室式功能说明书与提示词。说明书只含功能与分工，不含原始代码。" : "看懂了它是怎么做的，接下来用你自己的代码做一个类似的。五步，跟着走就行。")),
      ...(candidates.supported ? (isPro() ? renderPro(candidates) : renderBeginner(candidates)) : [h("p", { class: "rep-note" }, candidates.reason)]),
    );
  }

  return {
    refresh: render,
    reset() {
      state = null;
      root.hidden = true;
      root.replaceChildren();
    },
    open() {
      render();
      if (!root.hidden) root.scrollIntoView({ behavior: "smooth", block: "start" });
    },
  };
}
