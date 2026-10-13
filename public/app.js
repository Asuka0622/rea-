import { GLOSSARY, LAYERS, LESSONS, ONBOARDING, TASKS, WEB_AIS } from "./content.js";
import { hydrateIcons, icon } from "./icons.js";
import {mountModelMods} from "./model-mods.js";
import {mountGameCases} from "./game-cases.js";
import { createAdventure } from "./adventure.js";
import { mountReplicate } from "./replicate.js";

const TOKEN = document.querySelector('meta[name="workbench-token"]').content;
const $ = (selector) => document.querySelector(selector);

/* ================= helpers ================= */

/** Build DOM safely: every string becomes a text node, never HTML. */
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null || value === false) continue;
    if (key.startsWith("on")) el.addEventListener(key.slice(2), value);
    else if (key === "class") el.className = value;
    else el.setAttribute(key, value === true ? "" : value);
  }
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

/** Children for replaceChildren(): flattened, with false/null/undefined dropped. */
function nodes(...children) {
  return children.flat(Infinity).filter((child) => child != null && child !== false);
}

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 3200);
}

async function api(path, { method = "GET", body, raw } = {}) {
  const response = await fetch(path, {
    method,
    headers: { "X-Workbench-Token": TOKEN, ...(raw ? {} : { "Content-Type": "application/json" }) },
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `请求失败：${response.status}`);
  return data;
}

/** POST and read a newline-delimited JSON stream, calling onEvent for each record. */
async function stream(path, body, onEvent, signal) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "X-Workbench-Token": TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || `请求失败：${response.status}`);
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let index;
    while ((index = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (line) onEvent(JSON.parse(line));
    }
  }
}

function dialog(title, content, actions) {
  const el = $("#dialog");
  $("#dialog-title").textContent = title;
  $("#dialog-content").replaceChildren(...nodes(content));
  const bar = $("#dialog-actions");
  bar.replaceChildren();
  return new Promise((resolve) => {
    for (const action of actions) {
      bar.append(h("button", { class: `btn ${action.primary ? "primary" : ""} ${action.danger ? "danger" : ""}`, value: action.value, onclick: () => resolve(action.value) }, action.label));
    }
    el.addEventListener("close", () => resolve(el.returnValue || null), { once: true });
    el.showModal();
  });
}

async function copy(text, message = "已复制") {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = h("textarea", { style: "position:fixed;opacity:0" }, text);
    document.body.append(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
  toast(message);
}

/** Per-viewer conveniences only; the page works without storage. */
const store = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      if (value == null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch {
      /* private window: ignore */
    }
  },
};

const tip = (text, kind = "tip") => h("div", { class: kind === "warn" ? "warn-tip" : "tip" }, icon(kind === "warn" ? "alert" : "bulb", { size: 17 }), h("span", {}, withTerms(text)));

/* ================= theme ================= */

const THEMES = [
  ["auto", "外观：跟随系统"],
  ["light", "外观：浅色"],
  ["dark", "外观：深色"],
];
const campThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
function refreshCampTheme() {
  document.documentElement.dataset.campTheme = document.documentElement.dataset.theme || (campThemeQuery.matches ? 'dark' : 'light');
}
campThemeQuery.addEventListener('change', refreshCampTheme);
function applyTheme(theme) {
  if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
  refreshCampTheme();
  store.set("rea-wb-theme", theme === "auto" ? null : theme);
  const button = $("#theme-toggle");
  const [, label] = THEMES.find(([id]) => id === theme);
  button.replaceChildren(icon(theme === "light" ? "sun" : theme === "dark" ? "moon" : "auto", { size: 18 }));
  button.title = label;
  button.setAttribute("aria-label", label);
}
$("#theme-toggle").addEventListener("click", () => {
  const now = document.documentElement.dataset.theme || "auto";
  const next = THEMES[(THEMES.findIndex(([id]) => id === now) + 1) % THEMES.length][0];
  applyTheme(next);
  toast(THEMES.find(([id]) => id === next)[1]);
});

/* ================= presentation ================= */
let presentation = store.get("rea-wb-presentation") === "simple" ? "simple" : "pixel";
const isSimple = () => presentation === "simple";
function applyPresentation(next, {announce=false}={}) {
  const typedPath = $("#task-path-input")?.value || "";
  presentation=next;
  document.documentElement.dataset.presentation=next;
  store.set("rea-wb-presentation",next);
  const button=$("#presentation-toggle");
  button.textContent=isSimple()?"切换到像素":"切换到简洁";
  button.setAttribute("aria-pressed",String(isSimple()));
  button.title=isSimple()?"当前：简洁模式":"当前：像素模式";
  adventure.refresh();
  if($("#task-path-input")) $("#task-path-input").value=typedPath;
  modelWorkshop.refresh();
  requestAnimationFrame(moveInk);
  if(announce) toast(isSimple()?"已切换到简洁模式":"已切换到像素模式");
}
$("#presentation-toggle").addEventListener("click",()=>applyPresentation(isSimple()?"pixel":"simple",{announce:true}));

/* ================= mode ================= */

let mode = store.get("rea-wb-mode") === "pro" ? "pro" : "beginner";
const isPro = () => mode === "pro";

function applyMode(next, { announce = false } = {}) {
  mode = next;
  store.set("rea-wb-mode", mode);
  document.body.className = `mode-${mode}`;
  for (const button of document.querySelectorAll(".mode-switch button")) button.setAttribute("aria-checked", String(button.dataset.mode === mode));
  $("#path-details").open = isPro();
  $("#clients-more").open = isPro();
  if (isPro() && currentTab === "learn") showTab("home");
  rerenderReports();
  loaders[currentTab]?.();
  updateSea();
  requestAnimationFrame(moveInk);
  adventure.refresh();
  modelWorkshop.refresh();
  replicate.refresh();
  // Professional mode has no task panel: always leave it something to act on.
  if (isPro() && $("#run").hidden && !adventure.busy) $("#home-start").hidden = false;
  if (announce) toast(isPro() ? "专业模式：显示全部细节和命令" : "新手模式：只显示重点，配有说明");
}
for (const button of document.querySelectorAll(".mode-switch button")) button.addEventListener("click", () => applyMode(button.dataset.mode, { announce: true }));

/* ================= exploration records ================= */
function updateSea() {} // The RPG map replaces the old WebGL ocean.
let dive = { done: new Set(), active: null, meters: 0 };
const layerOf = (command) => LAYERS.find((layer) => layer.commands.includes(command)) || LAYERS[2];
function renderGauge() {
  $("#gauge-depth").textContent = String(dive.done.size);
  $("#gauge-layers").replaceChildren(...LAYERS.map((layer) => h("li", {class:dive.done.has(layer.id)?"done":dive.active===layer.id?"active":""}, h("b", {}, layer.name),h("small", {},layer.question))));
}
function diveTo(layerId, arrived) {
  if (arrived) { dive.done.add(layerId); dive.active = null; }
  else dive.active = layerId;
  renderGauge();
}
for (const link of document.querySelectorAll("[data-goto]")) link.addEventListener("click", (event) => { event.preventDefault(); showTab(link.dataset.goto); });

/* ================= glossary ================= */

const autoTerms = Object.entries(GLOSSARY)
  .filter(([, entry]) => entry.auto !== false)
  .map(([word]) => word)
  .sort((a, b) => b.length - a.length);
const termPattern = new RegExp(
  autoTerms
    .map((word) => {
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return /^[\x00-\x7f]+$/.test(word) ? `(?<![A-Za-z0-9._-])${escaped}(?![A-Za-z0-9_-])` : escaped;
    })
    .join("|"),
  "g",
);

/** Turn known words into tappable glossary terms (first occurrence of each, beginner mode only). */
function withTerms(text) {
  if (text == null) return [];
  const value = String(text);
  if (isPro()) return [value];
  const out = [];
  const seen = new Set();
  let last = 0;
  for (const match of value.matchAll(termPattern)) {
    if (seen.has(match[0])) continue;
    seen.add(match[0]);
    out.push(value.slice(last, match.index), h("button", { type: "button", class: "term", "data-term": match[0] }, match[0]));
    last = match.index + match[0].length;
  }
  out.push(value.slice(last));
  return out;
}

const pop = $("#term-pop");
document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-term]");
  if (!target) {
    pop.hidden = true;
    return;
  }
  event.preventDefault();
  const entry = GLOSSARY[target.dataset.term];
  if (!entry) return;
  pop.replaceChildren(h("b", {}, target.dataset.term), entry.text);
  pop.hidden = false;
  const rect = target.getBoundingClientRect();
  const width = Math.min(300, window.innerWidth - 24);
  pop.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`;
  const below = rect.bottom + 10;
  pop.style.top = `${below + pop.offsetHeight > window.innerHeight ? rect.top - pop.offsetHeight - 10 : below}px`;
});
window.addEventListener("scroll", () => (pop.hidden = true), { passive: true });

function renderGlossary(filter = "") {
  const query = filter.trim().toLowerCase();
  const entries = Object.entries(GLOSSARY).filter(([word, entry]) => !query || word.toLowerCase().includes(query) || entry.text.toLowerCase().includes(query));
  $("#glossary-list").replaceChildren(...(entries.length ? entries.flatMap(([word, entry]) => [h("dt", {}, word), h("dd", {}, entry.text)]) : [h("dd", {}, "没有找到这个词。可以把它和报告一起复制给 AI 问问。")]));
}
$("#open-glossary").addEventListener("click", () => {
  renderGlossary($("#glossary-search").value);
  $("#glossary").showModal();
});
$("#close-glossary").addEventListener("click", () => $("#glossary").close());
$("#glossary-search").addEventListener("input", (event) => renderGlossary(event.target.value));

/* ================= tabs ================= */

const loaders = {};
let currentTab = "home";
function moveInk() {
  const active = document.querySelector('.tabs button[aria-selected="true"]');
  const ink = $(".tab-ink");
  if (!active || !active.offsetWidth) return;
  ink.style.width = `${active.offsetWidth - 16}px`;
  ink.style.transform = `translateX(${active.offsetLeft + 8}px)`;
}
function showTab(name) {
  currentTab = name;
  for (const button of document.querySelectorAll(".tabs button")) button.setAttribute("aria-selected", String(button.dataset.tab === name));
  for (const panel of document.querySelectorAll(".panel")) panel.hidden = panel.id !== `tab-${name}`;
  pop.hidden = true;
  moveInk();
  window.scrollTo({ top: 0 });
  loaders[name]?.();
  updateSea();
}
for (const button of document.querySelectorAll(".tabs button")) button.addEventListener("click", () => showTab(button.dataset.tab));
window.addEventListener("resize", moveInk);
document.fonts?.ready.then(moveInk);

/* ================= onboarding ================= */

let slide = 0;
function renderSlide() {
  const data = ONBOARDING[slide];
  $("#ob-art").replaceChildren(icon(data.icon, { size: 34 }));
  $("#ob-step").textContent = `第 ${slide + 1} / ${ONBOARDING.length} 步`;
  $("#ob-title").textContent = data.title;
  const content = [];
  for (const line of data.body || []) content.push(h("p", {}, line));
  if (data.checks) content.push(h("ul", { class: "ob-checks" }, data.checks.map((line) => h("li", {}, icon("check", { size: 17 }), h("span", {}, line)))));
  if (data.note) content.push(tip(data.note, "warn"));
  if (data.steps) content.push(h("div", { class: "ob-steps" }, data.steps.map(([title, desc]) => h("div", { class: "ob-step" }, h("b", {}, title), h("small", {}, desc)))));
  if (data.choices) {
    const finish = (fn) => () => {
      $("#onboarding").close();
      fn();
    };
    const choice = (label, fn, primary) => h("button", { class: `btn ${primary ? "primary" : ""}`, onclick: finish(fn) }, h("span", {}, label), icon("arrow", { size: 17 }));
    content.push(
      h(
        "div",
        { class: "ob-choices" },
        choice("好的，先看一份示例报告", () => runSample(), true),
        choice("直接看我电脑上的某个软件", () => openTask("desktop")),
        choice("先看看新手教程", () => showTab("learn")),
        choice("我是专业用户，切换到专业模式", () => applyMode("pro", { announce: true })),
      ),
    );
  }
  $("#ob-content").replaceChildren(...content);
  $("#ob-dots").replaceChildren(...ONBOARDING.map((_, i) => h("span", { class: i === slide ? "on" : "" })));
  $("#ob-prev").hidden = slide === 0;
  $("#ob-next").hidden = Boolean(data.choices);
}
function openOnboarding() {
  slide = 0;
  renderSlide();
  $("#onboarding").showModal();
}
$("#ob-next").addEventListener("click", () => {
  slide = Math.min(slide + 1, ONBOARDING.length - 1);
  renderSlide();
});
$("#ob-prev").addEventListener("click", () => {
  slide = Math.max(slide - 1, 0);
  renderSlide();
});
$("#ob-skip").addEventListener("click", () => $("#onboarding").close());
$("#onboarding").addEventListener("close", () => store.set("rea-wb-onboarded", "1"));
$("#replay-onboarding").addEventListener("click", openOnboarding);

/* ================= home: tasks & guides ================= */

function renderTasks() {
  $("#tasks").replaceChildren(
    ...TASKS.filter((task) => task.id !== "sample").map((task) =>
      h("button", { class: "task", "data-task": task.id, "aria-pressed": "false", onclick: () => openTask(task.id) }, icon(task.icon, { size: 26 }), h("b", {}, task.title), h("span", { class: "desc" }, task.desc)),
    ),
  );
}
for (const button of document.querySelectorAll("[data-open-task]")) button.addEventListener("click", () => openTask(button.dataset.openTask));

function steps(list) {
  return h("ol", { class: "steps" }, list.map((item) => h("li", {}, withTerms(item))));
}

function closeGuide() {
  $("#guide").hidden = true;
  for (const card of document.querySelectorAll(".task")) card.setAttribute("aria-pressed", "false");
}

const guideTitle = (name, text) => h("h3", { class: "guide-title" }, icon(name, { size: 24 }), text);

async function openTask(id) {
  showTab("home");
  resetAnalyze();
  $("#home-start").hidden = false;
  for (const card of document.querySelectorAll(".task")) card.setAttribute("aria-pressed", String(card.dataset.task === id));
  if (id === "sample") return runSample();
  const guide = $("#guide");
  guide.hidden = false;
  const close = h("button", { class: "btn link", onclick: closeGuide }, "收起");

  if (id === "desktop") {
    const list = h("div", { class: "app-list" }, h("span", { class: "muted" }, "正在查找你电脑上的软件…"));
    guide.replaceChildren(
      guideTitle("monitor", "看看电脑上的软件"),
      h("p", {}, withTerms("下面是在你电脑上找到的、可以直接分析的软件（它们都是用 Electron 做的）。点一下名字就开始：")),
      list,
      h(
        "details",
        {},
        h("summary", {}, "列表里没有我想要的软件？"),
        steps(["在桌面上找到这个软件的图标", "鼠标右键点它，选「打开文件所在的位置」", "记住打开的这个文件夹", "点下面的「选择文件夹」，选中它"]),
        tip("不是所有软件都能分析得很详细：Electron 软件效果最好；普通 exe 程序需要安装 Ghidra 引擎才能看到内部代码。"),
      ),
      h("div", { class: "guide-actions" }, h("button", { class: "btn primary", onclick: () => pick("folder") }, icon("folder", { size: 17 }), "选择文件夹"), close),
    );
    try {
      const { apps } = await api("/api/installed-apps");
      list.replaceChildren(
        ...(apps.length
          ? apps.map((app) => h("button", { class: "chip", title: app.path, onclick: () => runAnalysis(app.path) }, icon("monitor", { size: 15 }), app.name))
          : [h("span", { class: "muted" }, "没有自动找到可以直接分析的软件，可以用下面的方法手动选择。")]),
      );
    } catch (error) {
      list.replaceChildren(h("span", { class: "muted" }, error.message));
    }
  } else if (id === "phone") {
    const engineTip = h("div");
    guide.replaceChildren(
      guideTitle("phone", "看看手机 App"),
      h("p", {}, withTerms("你需要先拿到 App 的安装包（APK 文件，文件名以 .apk 结尾）。常见的拿法：")),
      steps(["在电脑浏览器里打开 App 的官网，找「安卓下载」按钮，下载得到的就是 APK", "或者：在安卓模拟器（如 MuMu、雷电）里安装 App，再从模拟器里导出", "拿到后点下面的「选择 APK 文件」"]),
      engineTip,
      tip("苹果手机的 App 从 App Store 下载时是加密的，一般无法分析。", "warn"),
      h("div", { class: "guide-actions" }, h("button", { class: "btn primary", onclick: () => pick("file") }, icon("file", { size: 17 }), "选择 APK 文件"), close),
    );
    try {
      const engines = await api("/api/engines");
      const jadx = engines.find((e) => e.id === "jadx");
      engineTip.replaceChildren(
        jadx.ok
          ? tip("已安装 JADX，可以看到 App 的权限、页面和代码。")
          : h("div", { class: "tip" }, icon("bulb", { size: 17 }), h("span", {}, "现在能看到 APK 里有哪些文件。想看 App 申请了哪些权限、有哪些页面，先装一个免费的 JADX（约 40 MB）。 ", h("button", { class: "btn small", onclick: () => showTab("engines") }, "去安装"))),
      );
    } catch {
      /* the guide works without the engine hint */
    }
  } else if (id === "mine") {
    guide.replaceChildren(
      guideTitle("box", "检查我自己做的安装包"),
      h("p", {}, "发布软件之前，看看安装包里有没有不该带上的东西："),
      steps(["测试文件、示例数据、调试用的资源", "体积特别大、但其实用不到的文件", "代码里写死的测试服务器地址", "（Electron 软件）窗口安全设置是否打开"]),
      h("p", { class: "muted" }, "报告里的「最大的 10 个文件」「代码里出现的网络地址」「安全设置提醒」就是用来检查这些的。"),
      h("div", { class: "guide-actions" }, h("button", { class: "btn primary", onclick: () => pick("file") }, icon("file", { size: 17 }), "选择安装包文件"), h("button", { class: "btn", onclick: () => pick("folder") }, icon("folder", { size: 17 }), "选择软件文件夹"), close),
    );
  } else if (id === "ai") {
    guide.replaceChildren(
      guideTitle("spark", "让 AI 帮我分析"),
      h("p", {}, "有两种方式，选一种适合你的："),
      h(
        "div",
        { class: "cards" },
        h(
          "div",
          { class: "card recommended" },
          h("div", { class: "card-head" }, h("h3", {}, "网页版 AI"), h("span", { class: "tag rec" }, "最简单")),
          h("p", {}, "适合平时用豆包、Kimi、DeepSeek、通义千问的人。先在这里分析一个软件，然后点报告上方的「看不懂？让 AI 解释」，粘贴给 AI 就行。"),
          h("div", { class: "card-actions" }, h("button", { class: "btn primary", onclick: () => runSample() }, "先用示例试一下", icon("arrow", { size: 16 }))),
        ),
        h(
          "div",
          { class: "card" },
          h("div", { class: "card-head" }, h("h3", {}, "AI 编程工具")),
          h("p", {}, withTerms("适合用 Trae、Cursor、通义灵码等 AI 工具的人。接入后，直接对 AI 说「帮我分析某某软件」，它会自己调用 REA。")),
          h("div", { class: "card-actions" }, h("button", { class: "btn", onclick: () => showTab("clients") }, "去接入 AI 工具")),
        ),
      ),
      h("div", { class: "guide-actions" }, close),
    );
  }
  guide.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* ================= analysis ================= */

let current = null; // { target, kind, controller, reports, ran, events: Map(command -> step-done event) }

function factGrid(facts) {
  return h(
    "div",
    { class: "facts" },
    facts.map((fact) => h("div", { class: "fact" }, h("div", { class: "label" }, withTerms(fact.label)), h("div", { class: "value" }, fact.value ?? "—"), fact.hint && h("div", { class: "hint" }, fact.hint))),
  );
}

function renderSection(section, index) {
  const body = h(
    "div",
    { class: "section-body" },
    section.explain && h("p", { class: "explain" }, withTerms(section.explain)),
    section.items && h("ul", {}, section.items.map((item) => h("li", {}, item))),
    section.table &&
      h(
        "div",
        { class: "table-wrap" },
        h("table", {}, h("thead", {}, h("tr", {}, section.table.columns.map((c) => h("th", {}, c)))), h("tbody", {}, section.table.rows.map((row) => h("tr", {}, row.map((cell) => h("td", {}, cell ?? 0)))))),
      ),
  );
  const count = section.items?.length ?? section.table?.rows.length;
  return h("details", { class: "section", open: isPro() || index < 2 }, h("summary", {}, h("span", {}, section.title), count != null && h("span", { class: "count" }, count)), body);
}

/** The headline's first clause gets a highlighter stroke; it carries the conclusion. */
function headline(text) {
  const cut = text.indexOf("，");
  if (cut < 0 || isPro()) return h("p", { class: "headline" }, withTerms(text));
  return h("p", { class: "headline" }, h("span", { class: "hl" }, withTerms(text.slice(0, cut))), withTerms(text.slice(cut)));
}

function commandLine(command) {
  if (command === "inspect-model-mod") return `node lib/model-mods.mjs "${current.target}"`;
  if (command === "inspect-game-source") return `node lib/game-cases.mjs "${current.target}"`;
  if (command === "inspect-game-mod") return `node lib/game-mods.mjs "${current.target}"`;
  if (command === "inspect-rust-project") return `node lib/rust.mjs "${current.target}"`;
  const extra = command === "inspect-web-network-capture" ? " har" : "";
  return `rea ${command} "${current.target}"${extra} --format json`;
}

function setStatus(card, kind, text) {
  const status = card.querySelector(".status");
  status.className = `status ${kind}`;
  status.textContent = text;
}

function renderReport(card, event) {
  card.querySelector(".scanning")?.remove();
  const body = card.querySelector(".report-body") || card.appendChild(h("div", { class: "report-body" }));
  if (!event.ok) {
    setStatus(card, "bad", "没有成功");
    const error = event.error;
    body.replaceChildren(
      ...nodes(
        h(
          "div",
          { class: "error-box" },
          h("b", {}, error.title),
          h("p", {}, error.plain),
          error.engine && h("button", { class: "btn small primary", onclick: () => showTab("engines") }, "去安装引擎", icon("arrow", { size: 15 })),
          h("details", { open: isPro() }, h("summary", {}, "原始错误信息（可以复制给 AI 帮你看）"), h("pre", { class: "code" }, error.original)),
        ),
        isPro() && h("details", { class: "cli" }, h("summary", {}, "等价命令"), h("pre", { class: "code" }, commandLine(event.command))),
      ),
    );
    return;
  }
  setStatus(card, "ok", "完成");
  const report = event.report;
  card.querySelector("h3").textContent = report.title;
  const head = card.querySelector(".report-head");
  head.querySelector(".fingerprint")?.remove();
  head.querySelector(".layer-tag")?.remove();
  const layer = layerOf(event.command);
  head.insertBefore(h("span", { class: "layer-tag" }, `${layer.name} · ${layer.verb}`), head.querySelector(".status"));
  if (event.fingerprint) {
    head.insertBefore(
      h("button", { type: "button", class: "fingerprint mono term-inline", "data-term": "标本编号", title: `SHA-256 ${event.fingerprint}` }, `#${event.fingerprint.slice(0, 4)}·${event.fingerprint.slice(-4)}`),
      head.querySelector(".status"),
    );
  }
  const nextSteps = report.nextSteps.filter((step) => !current.ran.has(step.command));
  const rawPreview = h("pre", { class: "code" }, "加载中…");
  body.replaceChildren(
    ...nodes(
      headline(report.headline),
      factGrid(report.facts),
      h("div", {}, report.sections.map(renderSection)),
      report.cautions.length > 0 &&
        h("details", { class: "cautions", open: isPro() }, h("summary", {}, icon("alert", { size: 16 }), `需要知道的局限 · ${report.cautions.length} 条`), h("ul", {}, report.cautions.map((c) => h("li", {}, c)))),
      (nextSteps.length > 0 || isPro()) &&
        h(
          "div",
          { class: "next" },
          nextSteps.length > 0 && h("div", { class: "next-label" }, isPro() ? "后续命令" : [icon("down", { size: 15 }), "继续探索："]),
          nextSteps.map((step) =>
            h(
              "button",
              { class: "btn step", "data-command": step.command, onclick: () => runAnalysis(current.target, [step.command]) },
              h("span", {}, step.label, icon("arrow", { size: 15 })),
              h("small", {}, isPro() ? step.why : `${step.why} · 探索${layerOf(step.command).name}`),
            ),
          ),
          isPro() && h("a", { class: "btn small", href: `/api/raw?id=${event.rawId}`, onclick: (e) => downloadRaw(e, event.rawId) }, icon("download", { size: 15 }), "下载原始 JSON"),
        ),
      isPro() && h("details", { class: "cli" }, h("summary", {}, "等价命令"), h("pre", { class: "code" }, commandLine(event.command))),
      isPro() &&
        h(
          "details",
          {
            class: "cli",
            ontoggle: async (e) => {
              if (!e.target.open || rawPreview.dataset.loaded) return;
              rawPreview.dataset.loaded = "1";
              const response = await fetch(`/api/raw?id=${event.rawId}`, { headers: { "X-Workbench-Token": TOKEN } });
              const text = await response.text();
              rawPreview.textContent = text.length > 20000 ? `${text.slice(0, 20000)}\n…（共 ${(text.length / 1048576).toFixed(1)} MB，完整内容请下载）` : text;
            },
          },
          h("summary", {}, "原始 JSON 预览"),
          rawPreview,
        ),
    ),
  );
}

function stepCard(command, label) {
  return h(
    "article",
    { class: "report", "data-step": command, "data-layer": layerOf(command).id },
    h("div", { class: "report-head" }, h("h3", {}, label), h("span", { class: "status warn" }, "扫描中")),
    h("div", { class: "scanning" }, h("div", { class: "scanbar" }), h("span", { class: "msg" }, "启动中…")),
  );
}

function rerenderReports() {
  if (!current) return;
  for (const [command, event] of current.events) {
    const card = $("#reports").querySelector(`[data-step="${CSS.escape(command)}"]`);
    if (card) renderReport(card, event);
  }
}

async function downloadRaw(event, id) {
  event.preventDefault();
  const response = await fetch(`/api/raw?id=${id}`, { headers: { "X-Workbench-Token": TOKEN } });
  if (!response.ok) return toast("结果已不存在");
  const url = URL.createObjectURL(await response.blob());
  h("a", { href: url, download: `rea-result-${id}.json` }).click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** REA progress messages are English; translate the common verbs and keep file names as-is. */
function progressZh(message) {
  return message
    .replace(/^Inventorying and parsing application artifacts/i, "正在清点软件里的文件")
    .replace(/^Reading inventoried JavaScript application sources/i, "正在读取代码")
    .replace(/^Parsing and projecting (\d+) application source files/i, "准备分析 $1 个代码文件")
    .replace(/^Parsing and projecting /i, "正在分析 ")
    .replace(/^Inventorying /i, "正在清点 ")
    .replace(/^Reading /i, "正在读取 ")
    .replace(/^Building /i, "正在整理 ")
    .replace(/^Analyzing /i, "正在分析 ");
}

function reportMarkdown() {
  const lines = [`我用 REA 逆向分析工具分析了这个软件：${current.target}`, `类型：${current.kind || "未知"}`, ""];
  for (const report of current.reports) {
    lines.push(`## ${report.title}`, report.headline);
    for (const fact of report.facts) lines.push(`- ${fact.label}：${fact.value}`);
    for (const section of report.sections) {
      lines.push(`### ${section.title}`);
      if (section.items) lines.push(...section.items.slice(0, 30).map((i) => `- ${i}`));
      if (section.table) lines.push(...section.table.rows.slice(0, 20).map((r) => `- ${r.join(" | ")}`));
    }
    lines.push("");
  }
  return lines.join("\n");
}

async function explainWithAi() {
  diveTo("abyss", true);
  const prompt = `${reportMarkdown()}\n请你扮演一位耐心的老师，用通俗易懂的中文给完全不懂编程的我解释：\n1. 这个软件大概是由哪些部分组成的？\n2. 它主要有哪些功能？用了什么技术？\n3. 有没有值得注意的地方（比如联网、读写文件）？\n请少用专业术语，必须用的话顺便解释一下。`;
  await copy(prompt, "已复制，去粘贴给 AI 吧");
  const paste = navigator.platform.startsWith("Mac") ? "⌘ + V" : "Ctrl + V";
  await dialog(
    "报告已经复制好了，接下来：",
    [
      h(
        "ol",
        { class: "steps" },
        h("li", {}, "点下面任意一个，打开你常用的 AI 网站"),
        h("li", {}, "在输入框里点一下，按 ", h("kbd", {}, paste), " 粘贴"),
        h("li", {}, "点发送，等 AI 用大白话给你解释"),
        h("li", {}, "还有疑问？接着问它，比如「这个软件会不会上传我的数据？」"),
      ),
      h("div", { class: "ai-links" }, WEB_AIS.map(([name, url]) => h("a", { class: "btn", href: url, target: "_blank", rel: "noreferrer" }, name))),
      h("p", { class: "muted" }, "粘贴后，报告内容会发送给那个 AI 网站。"),
    ],
    [{ label: "知道了", value: "ok", primary: true }],
  );
}

function runAnalysis(target, commands) {
  if (!target) return;
  if (adventure.busy) return toast("探索进行中，请先停止当前探索");
  if (commands && current && current.target === target) return executeAnalysis(target, commands);
  return executeAnalysis(target, commands);
}

async function executeAnalysis(target, commands) {
  if (!target) return;
  const isFollowUp = Boolean(commands && current && current.target === target);
  if (!isFollowUp) {
    current?.controller.abort();
    current = { target, controller: new AbortController(), reports: [], ran: new Set(), events: new Map() };
    $("#reports").replaceChildren();
    $("#seabed")?.remove();
    $("#hints").replaceChildren();
    $("#run-target").textContent = target;
    $("#run-kind-label").textContent = "正在识别";
    $("#run-kind").textContent = "…";
    $("#run-signature").hidden = true;
    $("#explain-ai").disabled = true;
    $("#copy-md").disabled = true;

    dive = { done: new Set(), active: "surface", meters: 0 };
    $("#gauge-depth").textContent = "0";
    renderGauge();

  } else {
    current.controller = new AbortController();
  }
  $("#home-start").hidden = true;
  $("#run").hidden = !isPro() && !isFollowUp;
  $("#cancel-run").hidden = false;
  if (!isFollowUp) window.scrollTo({ top: 0 });
  const cards = {};
  const session = current;
  const startingReports = current.reports.length;
  let completed = false;
  let failed = false;
  let lastError = null;
  $("#artcraft-demos").open = false;
  $("#game-mods").open = false;
  $("#model-mods").open = false;
  adventure.begin(target, isFollowUp);
  try {
    await stream(
      "/api/analyze",
      { path: target, commands },
      (event) => {
        if (current !== session) return;
        if (event.type === "detected") {
          adventure.progress("认出来了：" + event.label);
          adventure.detected();
          diveTo("surface", true);
          current.kind = event.label;
          $("#run-kind-label").textContent = event.isDirectory ? "识别结果 · 文件夹" : "识别结果";
          $("#run-kind").replaceChildren(...withTerms(event.label));
          if (event.signature) {
            const sig = $("#run-signature");
            sig.replaceChildren(h("span", { class: "muted" }, "文件头"), event.signature.hex, event.signature.ascii && h("b", {}, event.signature.ascii));
            sig.dataset.term = "文件头";
            sig.hidden = false;
          }
        } else if (event.type === "hint") {
          adventure.hint(event.message, event.engine);
          $("#hints").append(h("div", { class: "hint-box" }, icon("bulb", { size: 18 }), h("span", {}, event.message), h("button", { class: "btn small", onclick: () => showTab("engines") }, "去安装")));
        } else if (event.type === "step-start") {
          adventure.progress(event.label + "…");
          current.ran.add(event.command);
          for (const button of document.querySelectorAll(`#reports [data-command="${CSS.escape(event.command)}"]`)) button.remove();
          diveTo(layerOf(event.command).id, false);
          const card = stepCard(event.command, event.label);
          cards[event.command] = card;
          $("#reports").append(card);
          if (isFollowUp) card.scrollIntoView({ behavior: "smooth", block: "nearest" });
        } else if (event.type === "progress") {
          const msg = cards[event.command]?.querySelector(".msg");
          if (event.message) adventure.progress(progressZh(event.message));
          if (msg && event.message) msg.textContent = progressZh(event.message);
        } else if (event.type === "step-done") {
          if (!event.ok) (failed = true), (lastError = event.error);
          current.events.set(event.command, event);
          renderReport(cards[event.command], event);
          if (event.ok) diveTo(layerOf(event.command).id, true);
          else if (dive.active === layerOf(event.command).id) (dive.active = null), renderGauge();

          if (event.ok) {
            current.reports.push(event.report);
            $("#explain-ai").disabled = false;
            $("#copy-md").disabled = false;
          }
        } else if (event.type === "done") {
          completed = true;
          replicate.refresh();
          if (current.reports.length && !$("#seabed")) $("#reports").after(seabedPanel());
          renderGauge();
        } else if (event.type === "fatal") {
          failed = true;
          lastError = { title: "无法分析", plain: event.message };
          adventure.progress(event.message);
          $("#reports").append(h("div", { class: "error-box" }, h("b", {}, "无法分析"), h("p", {}, event.message)));
          $("#run-kind").textContent = "无法分析";
        }
      },
      current.controller.signal,
    );
  } catch (error) {
    if (error.name !== "AbortError") $("#reports").append(h("div", { class: "error-box" }, h("b", {}, "出错了"), h("p", {}, error.message)));
  }
  if (current !== session) return;
  for (const card of Object.values(cards)) {
    if (!card.querySelector('.scanning')) continue;
    card.querySelector('.scanning').remove();
    const cancelled = session.controller.signal.aborted;
    setStatus(card, cancelled ? 'plain' : 'bad', cancelled ? '已停止' : '未完成');
    card.append(h('div', { class: 'report-body' }, h('p', { class: 'muted' }, cancelled ? '这一步已停止，没有生成报告。重新选择目标后可以再试一次。' : '这一步没有完成。查看错误提示后可以重新探索。')));
  }
  $("#cancel-run").hidden = true;
  adventure.finish({ completed, cancelled: session.controller.signal.aborted, added: session.reports.length - startingReports, total: session.reports.length, error: lastError });
}

function resetAnalyze() {
  current?.controller.abort();
  current = null;
  $("#seabed")?.remove();
  $("#run").hidden = true;
  $("#home-start").hidden = false;
  adventure.reset();
  replicate.reset();
}

/** The last stop of every dive: hand the whole report to an AI. */
function seabedPanel() {
  return h(
    "div",
    { class: "seabed", id: "seabed" },
    h("div", {}, h("b", {}, isPro() ? "导出整份报告" : "让 AI 用大白话解读这份报告"), h("small", {}, isPro() ? "复制为 Markdown，交给任意 AI 或存档。" : "把上面所有发现整理好，一键复制给豆包、Kimi、DeepSeek。")),
    isPro()
      ? h("button", { class: "btn", onclick: () => current && copy(reportMarkdown()) }, icon("copy", { size: 16 }), "复制 Markdown")
      : h("div", { class: "seabed-actions" },
          h("button", { class: "btn primary", onclick: () => current && explainWithAi() }, icon("spark", { size: 16 }), "让 AI 用大白话解释"),
          h("button", { class: "btn", onclick: () => replicate.open() }, icon("wrench", { size: 16 }), "自己动手做一个")),
  );
}

function showDemos() {
  showTab("home");
  const library = $("#artcraft-demos");
  library.open = true;
  library.scrollIntoView({behavior:"smooth",block:"start"});
  library.querySelector("summary").focus({preventScroll:true});
}

async function loadDemos() {
  const list = $("#demo-list");
  try {
    const {demos} = await api("/api/demos");
    list.replaceChildren(...demos.map(demo => h("div", {class:"demo-row",role:"listitem"},
      // Name the open-source project itself; the commercial product is only a point of comparison.
      h("div", {class:"demo-description"}, h("h3", {}, demo.name), h("p", {}, demo.category + " · 开源替代，对标 " + demo.alternative),
        h("small", {}, demo.ready ? "本地源码已就绪 · 版本 " + demo.commit.slice(0,8) : "本地源码尚未准备好，请先从官方仓库获取")),
      h("div", {class:"demo-actions"},
        h("button", {class:"btn small",type:"button",disabled:!demo.ready,"aria-label":"分析 " + demo.name + " 源码",onclick:()=>{
          if (adventure.busy) return toast("探索进行中，请先停止当前探索");
          showTab("home");
          runAnalysis(demo.path);
        }}, icon("scan",{size:16}), "分析源码"),
        h("a", {href:demo.repository,target:"_blank",rel:"noopener noreferrer"}, "源码"),
        h("a", {href:demo.official,target:"_blank",rel:"noopener noreferrer"}, "官方体验 / 下载"))
    )));
  } catch(error) {
    list.replaceChildren(h("p", {class:"error-box",role:"alert"}, "演示目录暂时无法读取：" + error.message),h("button",{class:"btn small",type:"button",onclick:loadDemos},"重新加载"));
  }
}

async function runSample() {
  showTab("home");
  closeGuide();
  try {
    const { path } = await api("/api/sample");
    if (!isPro()) toast("出发！正在探索示例笔记软件");
    await runAnalysis(path);
  } catch (error) {
    toast(error.message);
  }
}

async function pick(kind) {
  toast(kind === "folder" ? "请在弹出的窗口中选择文件夹（它可能在其他窗口后面）" : "请在弹出的窗口中选择文件（它可能在其他窗口后面）");
  try {
    const { path } = await api("/api/pick", { method: "POST", body: { kind } });
    if (path) runAnalysis(path);
  } catch (error) {
    toast(error.message);
  }
}

async function uploadAndAnalyze(file) {
  toast(`正在读取 ${file.name}…`);
  try {
    const { path } = await api(`/api/upload?name=${encodeURIComponent(file.name)}`, { method: "POST", raw: file });
    runAnalysis(path);
  } catch (error) {
    toast(error.message);
  }
}

$("#pick-file").addEventListener("click", () => pick("file"));
$("#pick-folder").addEventListener("click", () => pick("folder"));
$("#path-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const command = isPro() ? $("#command-select").value : "";
  runAnalysis($("#path-input").value.trim().replace(/^"(.*)"$/, "$1"), command ? [command] : undefined);
});
$("#cancel-run").addEventListener("click", () => current?.controller.abort());
$("#new-run").addEventListener("click", resetAnalyze);
$("#explain-ai").addEventListener("click", () => current && explainWithAi());
$("#copy-md").addEventListener("click", () => current && copy(reportMarkdown()));

const drop = $("#drop");
drop.addEventListener("dragover", (event) => {
  event.preventDefault();
  drop.classList.add("over");
});
drop.addEventListener("dragleave", () => drop.classList.remove("over"));
drop.addEventListener("drop", (event) => {
  event.preventDefault();
  drop.classList.remove("over");
  const entry = event.dataTransfer.items?.[0]?.webkitGetAsEntry?.();
  if (entry?.isDirectory) return toast("文件夹不能拖进来，请点「选择文件夹」");
  const file = event.dataTransfer.files[0];
  if (file) uploadAndAnalyze(file);
});

async function loadCommands() {
  try {
    const { commands } = await api("/api/commands");
    $("#command-select").append(...commands.map((c) => h("option", { value: c.command }, `${c.command} · ${c.label}`)));
  } catch {
    /* auto mode still works */
  }
}

/* ================= lessons ================= */

function renderLessons() {
  $("#lessons").replaceChildren(
    ...LESSONS.map((lesson, index) => {
      const blocks = [];
      let faq = null;
      for (const block of lesson.blocks) {
        if (block.q) {
          if (!faq) blocks.push((faq = h("dl", { class: "faq" })));
          faq.append(h("dt", {}, block.q), h("dd", {}, block.a));
          continue;
        }
        faq = null;
        if (typeof block === "string") blocks.push(h("p", {}, withTerms(block)));
        else if (block.steps) blocks.push(steps(block.steps));
        else if (block.tip) blocks.push(tip(block.tip));
        else if (block.warn) blocks.push(tip(block.warn, "warn"));
      }
      if (lesson.action) blocks.push(h("div", { class: "guide-actions" }, h("button", { class: "btn primary", onclick: () => openTask(lesson.action.task) }, lesson.action.label, icon("arrow", { size: 16 }))));
      return h(
        "details",
        { class: "lesson", open: index === 0 },
        h("summary", {}, h("span", { class: "num" }, `第 ${String(index + 1).padStart(2, "0")} 课`), icon(lesson.icon, { size: 22 }), h("span", { class: "lesson-title" }, lesson.title)),
        h("div", { class: "lesson-body" }, blocks),
      );
    }),
  );
}
loaders.learn = renderLessons;

/* ================= engines ================= */

const NEEDS = {
  desktop: { ids: [], answer: "不用装任何引擎。直接回首页，点「看看电脑上的软件」就行。" },
  android: { ids: ["java", "jadx", "apktool"], answer: "推荐装 JADX 和 Apktool。它们都要用到 Java；你的电脑如果已经有了，会显示「已检测到」。下面已经帮你标出来了。" },
  native: { ids: ["java", "ghidra"], answer: "需要 Ghidra（约 450 MB，需要 Java）。装好后能看到程序的内部代码，读起来有一定门槛，可以配合「让 AI 解释」使用。" },
  phone: { ids: ["adb"], answer: "需要 ADB。另外手机要打开「开发者选项 → USB 调试」，再用数据线连电脑。" },
};
let highlightedNeed = null;
for (const chip of document.querySelectorAll("[data-need]")) {
  chip.addEventListener("click", () => {
    highlightedNeed = chip.dataset.need;
    for (const other of document.querySelectorAll("[data-need]")) other.setAttribute("aria-pressed", String(other === chip));
    const answer = $("#advisor-answer");
    answer.textContent = NEEDS[highlightedNeed].answer;
    answer.hidden = false;
    loadEngines();
  });
}

function engineCard(engine, byId) {
  const recommended = !isPro() && highlightedNeed && NEEDS[highlightedNeed].ids.includes(engine.id);
  const state = engine.ok ? ["ok", engine.source === "detected" ? "已检测到" : "已装好"] : engine.partial ? ["warn", "部分可用"] : engine.value ? ["bad", "有问题"] : ["plain", "没装"];
  const missing = engine.requires.filter((id) => !byId[id]?.ok && !byId[id]?.partial).map((id) => byId[id]?.name || id);
  const bar = h("div", { class: "bar", hidden: true }, h("div"));
  const progressText = h("div", { class: "detail muted" });
  const input = h("input", { value: engine.value || "", placeholder: engine.kind === "url" ? "http://127.0.0.1:端口" : engine.kind === "dir" ? "安装目录" : "程序文件", "aria-label": `${engine.name} 位置` });
  const install = async (event) => {
    const button = event.currentTarget;
    const ok = await dialog(
      `安装 ${engine.name}`,
      [
        h("p", {}, `将从官方网站下载${engine.sizeHint ? `（${engine.sizeHint}）` : ""}，放在工作台自己的文件夹里，不会修改系统设置。`),
        h("p", { class: "muted mono-soft" }, engine.homepage),
        !isPro() && h("p", { class: "muted" }, "下载期间请不要关闭工作台的黑色窗口。"),
      ],
      [{ label: "取消", value: "" }, { label: "开始下载安装", value: "yes", primary: true }],
    );
    if (ok !== "yes") return;
    button.disabled = true;
    bar.hidden = false;
    try {
      await stream("/api/engines/install", { id: engine.id }, (e) => {
        if (e.type === "progress") {
          if (e.phase) progressText.textContent = e.phase;
          else if (e.total) {
            bar.firstChild.style.width = `${Math.round((e.received / e.total) * 100)}%`;
            progressText.textContent = `已下载 ${(e.received / 1048576).toFixed(1)} / ${(e.total / 1048576).toFixed(1)} MB`;
          }
        } else if (e.type === "done") toast(`${engine.name} 安装好了`);
        else if (e.type === "error") throw new Error(e.message);
      });
    } catch (error) {
      toast(error.message);
      progressText.textContent = error.message;
      button.disabled = false;
      return;
    }
    loadEngines();
  };
  return h(
    "div",
    { class: `card ${recommended ? "recommended" : ""}` },
    h("div", { class: "card-head" }, h("h3", {}, engine.name), h("span", { class: `status ${state[0]}` }, state[1])),
    h("p", {}, withTerms(engine.purpose)),
    h("div", { class: "tags" }, recommended && h("span", { class: "tag rec" }, engine.ok ? "需要它 · 已经有了" : "推荐你装"), engine.unlocks.map((u) => h("span", { class: "tag" }, u)), h("span", { class: "tag" }, engine.free ? "免费" : "需自购")),
    isPro() && h("div", { class: "detail mono muted" }, `${engine.env} = ${engine.value || "（未设置）"}`),
    engine.detail && (isPro() || !engine.ok) && h("div", { class: "detail muted" }, engine.detail),
    missing.length > 0 && !engine.ok && h("div", { class: "detail", style: "color:var(--warn)" }, `要先装：${missing.join("、")}`),
    bar,
    progressText,
    h(
      "div",
      { class: "card-actions" },
      engine.installable && !engine.ok && h("button", { class: "btn primary", onclick: install }, icon("download", { size: 16 }), "一键安装"),
      h("a", { class: "btn small ghost", href: engine.homepage, target: "_blank", rel: "noreferrer" }, "官网"),
      h(
        "details",
        { open: isPro() && !engine.installable },
        h("summary", {}, engine.installable ? "已经装过？手动指定位置" : "指定位置"),
        h(
          "form",
          {
            onsubmit: async (event) => {
              event.preventDefault();
              try {
                await api("/api/engines/value", { method: "POST", body: { id: engine.id, value: input.value } });
                toast("已保存");
                loadEngines();
              } catch (error) {
                toast(error.message);
              }
            },
          },
          input,
          h("button", { class: "btn small" }, "保存"),
        ),
      ),
    ),
  );
}

async function loadEngines() {
  const list = $("#engine-list");
  if (!list.children.length) list.replaceChildren(h("p", { class: "muted" }, "检测中…"));
  let engines;
  try {
    engines = await api("/api/engines");
  } catch (error) {
    list.replaceChildren(h("p", {}, error.message));
    return;
  }
  const byId = Object.fromEntries(engines.map((e) => [e.id, e]));
  list.replaceChildren(...engines.filter((e) => e.free).map((e) => engineCard(e, byId)));
  $("#engine-list-paid").replaceChildren(...engines.filter((e) => !e.free).map((e) => engineCard(e, byId)));
  $("#paid-engines").open = isPro();
  if (highlightedNeed && !isPro()) list.querySelector(".card.recommended")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
loaders.engines = loadEngines;

/* ================= clients ================= */

async function loadClients() {
  const boxes = ["#clients-detected", "#clients-extra", "#clients-native", "#clients-manual"].map($);
  boxes[0].replaceChildren(h("p", { class: "muted" }, "检测中…"));
  let data;
  try {
    data = await api("/api/clients");
  } catch (error) {
    boxes[0].replaceChildren(h("p", {}, error.message));
    return;
  }
  $("#compact").checked = data.compactSchemas;
  $("#profiles").replaceChildren(
    h("legend", {}, isPro() ? "工具配置" : "AI 能用哪些 REA 工具"),
    ...data.profiles.map((p) =>
      h("label", {}, h("input", { type: "radio", name: "profile", value: p.id, checked: p.id === data.toolProfile, onchange: () => chooseProfile(p.id) }), h("span", {}, h("b", {}, p.label), h("small", {}, p.description))),
    ),
  );

  const card = (client) => {
    const state = client.configured ? ["ok", "已接入"] : client.installed ? ["plain", "已安装"] : ["plain", "没找到"];
    return h(
      "div",
      { class: "card" },
      h("div", { class: "card-head" }, h("h3", {}, client.name), h("span", { class: `status ${state[0]}` }, state[1])),
      client.vendor && h("p", {}, client.vendor),
      isPro() && h("div", { class: "detail muted mono" }, client.configPath),
      h(
        "div",
        { class: "card-actions" },
        h("button", { class: `btn ${client.installed && !client.configured ? "primary" : ""}`, onclick: () => connect(client) }, client.configured ? "重新接入" : "一键接入"),
        client.mode === "workbench" && client.configured && h("button", { class: "btn ghost", onclick: () => disconnect(client) }, "断开"),
      ),
    );
  };
  const detected = [...data.extra, ...data.native].filter((c) => c.installed || c.configured);
  boxes[0].replaceChildren(...detected.map(card));
  $("#detected-note").textContent = detected.length ? "点「一键接入」，完成后重启那个 AI 工具即可。" : "没有在你的电脑上找到常见的 AI 编程工具。只用网页版 AI 的话，不需要这一页。";
  boxes[1].replaceChildren(...data.extra.filter((c) => !detected.includes(c)).map(card));
  boxes[2].replaceChildren(...data.native.filter((c) => !detected.includes(c)).map(card));
  boxes[3].replaceChildren(
    ...data.manual.map((client) =>
      h(
        "div",
        { class: "card" },
        h("div", { class: "card-head" }, h("h3", {}, client.name), h("span", { class: "status plain" }, client.vendor)),
        h("ol", { class: "steps-list" }, client.steps.map((s) => h("li", {}, s))),
        h(
          "div",
          { class: "card-actions" },
          h("button", { class: "btn primary", onclick: () => copy(data.snippet, "配置已复制，去 AI 工具里粘贴吧") }, icon("copy", { size: 16 }), "复制配置"),
          h("details", {}, h("summary", {}, "查看配置"), h("pre", { class: "snippet" }, data.snippet)),
        ),
      ),
    ),
  );
  $("#clients-more").open = isPro();
}
loaders.clients = loadClients;

async function chooseProfile(profile) {
  await api("/api/settings/tool-profile", { method: "POST", body: { profile } });
  toast("已保存。已接入的工具需要点「重新接入」才会更新");
  loadClients();
}

async function connect(client) {
  let preview;
  try {
    toast("正在准备…");
    preview = await api("/api/clients/preview", { method: "POST", body: { id: client.id } });
  } catch (error) {
    return toast(error.message);
  }
  const answer = await dialog(
    `接入 ${client.name}`,
    [
      h("p", {}, isPro() ? "将进行以下改动：" : "工作台会帮你改好下面这些设置。改之前会自动备份，随时可以断开。"),
      h("ul", {}, preview.actions.map((a) => h("li", {}, a.label, isPro() && h("div", { class: "mono muted" }, a.target)))),
      preview.replacing && h("p", { class: "muted" }, "里面已经有 REA 的设置，会更新成最新的。"),
      client.installed === false && tip(`没有在这台电脑上找到 ${client.name}。现在接入也可以，装好它之后会自动生效。`, "warn"),
      h("p", { class: "muted" }, "完成后，需要关掉并重新打开这个 AI 工具才会生效。"),
    ],
    [{ label: "取消", value: "" }, { label: "确认接入", value: "yes", primary: true }],
  );
  if (answer !== "yes") return;
  try {
    const result = await api("/api/clients/connect", { method: "POST", body: { id: client.id } });
    toast(result.backupPath && isPro() ? `已接入，原文件备份在 ${result.backupPath}` : "接入好了。重启这个 AI 工具后，对它说「用 REA 帮我分析……」试试");
  } catch (error) {
    toast(error.message);
  }
  loadClients();
}

async function disconnect(client) {
  const answer = await dialog(`断开 ${client.name}`, h("p", {}, "将从这个 AI 工具的设置里删掉 REA（会先备份），其他设置不变。"), [{ label: "取消", value: "" }, { label: "断开", value: "yes", danger: true }]);
  if (answer !== "yes") return;
  try {
    await api("/api/clients/disconnect", { method: "POST", body: { id: client.id } });
    toast("已断开");
  } catch (error) {
    toast(error.message);
  }
  loadClients();
}

$("#compact").addEventListener("change", async (event) => {
  await api("/api/settings/compact", { method: "POST", body: { enabled: event.target.checked } });
  toast("已保存。已接入的工具需要点「重新接入」才会更新");
});

/* ================= doctor ================= */

async function loadDoctor() {
  const list = $("#doctor-list");
  list.replaceChildren(h("p", { class: "muted" }, "检查中…"));
  try {
    const [overview, doctor] = await Promise.all([api("/api/overview"), api("/api/doctor")]);
    $("#overview").textContent = isPro() ? `REA ${overview.reaVersion} · Node.js ${overview.node} · ${overview.platform} · ${overview.workbenchHome}` : `REA ${overview.reaVersion} · 运行正常`;
    list.replaceChildren(
      ...doctor.checks.map((check) =>
        h(
          "div",
          { class: "card" },
          h("div", { class: "card-head" }, h("h3", {}, check.name), h("span", { class: `status ${check.ok ? "ok" : "plain"}` }, check.ok ? "正常" : isPro() ? "未就绪" : "没装（可选）")),
          check.detail && (isPro() || check.ok) && h("p", {}, check.detail),
          isPro() && !check.ok && check.remediation && h("p", { class: "mono" }, check.remediation),
        ),
      ),
      h("p", { class: "muted", style: "grid-column:1/-1;font-size:0.82rem;line-height:1.8" }, "Hopper、Ghidra、IDA 三个里装一个就够了，用来看普通程序的内部代码；都不装也不影响分析 Electron 软件、.NET 程序和安装包。「REA 技能说明」会在接入 REA 官方支持的 AI 工具时自动安装。"),
    );
  } catch (error) {
    list.replaceChildren(h("p", {}, error.message));
  }
}
loaders.doctor = loadDoctor;

$("#uninstall-all").addEventListener("click", async () => {
  const answer = await dialog("移除所有 REA 接入", h("p", {}, "会调用 REA 自带的卸载程序，从它管理的所有 AI 工具配置中删除 REA，并删除技能说明。确定吗？"), [{ label: "取消", value: "" }, { label: "移除", value: "yes", danger: true }]);
  if (answer !== "yes") return;
  try {
    await api("/api/uninstall-all", { method: "POST" });
    toast("已移除");
  } catch (error) {
    toast(error.message);
  }
});

/* ================= start ================= */

const adventure = createAdventure({
  sample: () => runSample(),
  demos: showDemos,
  gameMods: ()=>gameWorkshop.open(),
  modelMods: ()=>modelWorkshop.open(),
  pickFile: () => pick("file"),
  pickFolder: () => pick("folder"),
  analyzePath: (path) => runAnalysis(path),
  listApps: () => api("/api/installed-apps"),
  upload: (file) => uploadAndAnalyze(file),
  stop: () => current?.controller.abort(),
  explain: () => current && explainWithAi(),
  replicate: () => replicate.open(),
  learn: () => showTab("learn"),
  engines: () => showTab("engines"),
  restart: () => {
    resetAnalyze();
    window.scrollTo({ top: 0, behavior: "smooth" });
  },
  revealed: () => {
    $("#explain-ai").disabled = !current?.reports.length;
    $("#copy-md").disabled = !current?.reports.length;
  },
  isPro,
  isSimple,
  notice: toast,
});
const replicate = mountReplicate({ h, icon, toast, copy, isPro, getReports: () => current?.reports || [], getTarget: () => current?.target || "", webAis: WEB_AIS });
const gameWorkshop=mountGameCases({h,api,analyze:runAnalysis,busy:()=>adventure.busy,toast,showHome:()=>showTab("home")});
const modelWorkshop=mountModelMods({h,api,isPro,isSimple,analyze:runAnalysis,busy:()=>adventure.busy,toast,showHome:()=>showTab("home")});
hydrateIcons();
applyTheme(document.documentElement.dataset.theme || "auto");
renderTasks();
loadCommands();
loadDemos();
applyMode(mode);
applyPresentation(presentation);
// The map guides first-time users; the full guide is available on demand.
