import { fromBase64, toBase64, checksum, openSave } from "./save-lab.js";

// 动手实验: each detective case's own hands-on step, between gathering evidence and closing the case.
// The sample's own files run in a sandboxed frame (scripts only, no same-origin, so they cannot reach
// this page); what Electron would provide (the preload bridges, the main process) is played by this
// page and mirrors the sample's main.js. Kinds: network (小账本), calculator (像素计算器), save (种田存档).

export const LAB_KINDS = ["network", "calculator", "save"];

const esc = (code) => code.replace(/<\/(script)/gi, "<\\/$1");

// Runs inside the frame: window.__invoke(channel, arg) is ipcRenderer.invoke, answered by this page.
function bridge() {
  let seq = 0;
  const waiting = new Map();
  window.__invoke = (channel, arg) => new Promise((resolve) => {
    const id = ++seq;
    waiting.set(id, resolve);
    parent.postMessage({ lab: "ipc", id, channel, arg }, "*");
  });
  addEventListener("message", (event) => {
    const d = event.data;
    if (d && d.lab === "reply" && waiting.has(d.id)) {
      waiting.get(d.id)(d.value);
      waiting.delete(d.id);
    }
  });
  addEventListener("DOMContentLoaded", () => parent.postMessage({ lab: "ready" }, "*"));
}

/** A sandboxed frame running the sample's page with its own scripts inlined. */
function appFrame(h, { title, sources, page, css = "", shim, handlers }) {
  const frame = h("iframe", { class: "lab-app-frame", sandbox: "allow-scripts", title });
  const listeners = new Set();
  const send = (message) => frame.contentWindow?.postMessage(message, "*");
  window.addEventListener("message", (event) => {
    if (event.source !== frame.contentWindow || !event.data?.lab) return;
    const data = event.data;
    if (data.lab === "ipc") Promise.resolve(handlers[data.channel]?.(data.arg)).then((value) => send({ lab: "reply", id: data.id, value }));
    for (const fn of listeners) fn(data);
  });
  return {
    frame,
    send,
    on: (fn) => listeners.add(fn),
    boot(config = {}) {
      const head = `<style>${css}</style><script>${esc(`(${bridge})();(${shim})(${JSON.stringify(config)});`)}</script>`;
      const html = sources[page]
        .replace(/<script src="([^"]+)"><\/script>/g, (_, src) => `<script>${esc(sources[src] || "")}</script>`)
        .replace(/<head>/i, () => `<head>${head}`);
      frame.srcdoc = html;
    },
  };
}

/** The checklist every lab shows: tasks tick themselves as the player does them. */
function checklist(h, icon, tasks, done, { onHint }) {
  return h("ol", { class: "lab-tasks" }, tasks.map((task, i) => {
    const ok = done(task.id);
    const tip = h("p", { class: "lab-task-hint", hidden: true }, task.hint);
    return h("li", { class: ok ? "done" : "" },
      h("span", { class: "lab-task-mark", "aria-hidden": "true" }, ok ? "✓" : i + 1),
      h("span", { class: "lab-task-text" }, task.text, tip),
      !ok && task.hint && h("button", { class: "btn small ghost", type: "button", onclick: (event) => {
        if (tip.hidden) onHint();
        tip.hidden = false;
        event.currentTarget.remove();
      } }, icon("bulb", { size: 13 }), "提示"));
  }));
}

/** Sort each finding into one of two bins; done when all are right. */
function sorter(h, { items, bins, onRight, onWrong, onAll }) {
  const placed = new Map();
  const root = h("div", { class: "lab-sort" });
  const render = () => root.replaceChildren(...items.map((item) => {
    const where = placed.get(item.id);
    return h("div", { class: `lab-sort-row ${where ? "placed" : ""}` },
      h("span", {}, item.text),
      h("span", { class: "lab-sort-bins" }, bins.map((bin) => h("button", {
        type: "button",
        class: `lab-bin ${where === bin.id ? "picked" : ""}`,
        disabled: Boolean(where),
        onclick: (event) => {
          if (item.bin === bin.id) {
            placed.set(item.id, bin.id);
            onRight(item);
            render();
            if (placed.size === items.length) onAll();
          } else {
            onWrong(item);
            const button = event.currentTarget;
            button.classList.remove("lab-shake");
            void button.offsetWidth;
            button.classList.add("lab-shake");
          }
        },
      }, bin.text))));
  }));
  render();
  return root;
}

const appWindow = (h, title, tools, body) => h("div", { class: "lab-window" }, h("div", { class: "lab-window-bar" }, h("span", { class: "lab-window-dots", "aria-hidden": "true" }), h("b", {}, title), h("span", { class: "lab-window-tools" }, tools)), body);

// ———————————————————————————— 小账本：行为监视器 ————————————————————————————

function ledgerShim(config) {
  window.ledger = { add: (entry) => __invoke("ledger:add", entry), list: () => __invoke("ledger:list"), sync: () => __invoke("ledger:sync") };
  window.helper = { peek: () => __invoke("helper:peek-clipboard") };
  // 沙盒时间加速：定时器按倍速走
  const every = window.setInterval;
  window.setInterval = (fn, ms, ...rest) => every(fn, ms / config.speed, ...rest);
}

const LEDGER_CSS = `body{margin:0;padding:14px;font:14px/1.6 system-ui,sans-serif;background:#fbf6e6;color:#2b2b25}h1{margin:0 0 10px;font-size:18px}input{width:42%;margin:0 6px 8px 0;padding:6px;border:2px solid #b19b69;background:#fff}button{margin:0 6px 8px 0;padding:6px 12px;border:2px solid #2b2b25;background:#e8c270;font:inherit;cursor:pointer}ul{margin:4px 0;padding-left:18px}`;

function mountNetwork({ h, icon, lab, onMistake, onHint, onDone }) {
  const { sources } = lab;
  const syncUrl = sources["main.js"].match(/SYNC_URL = "([^"]+)"/)?.[1];
  const statsUrl = sources["main.js"].match(/STATS_URL = "([^"]+)"/)?.[1];
  const speed = 10;
  const device = { host: "XIAOLIN-PC", user: "xiaolin", platform: "win32", memory: 17179869184 };
  const store = { entries: [], lastClipboard: "" }; // electron-store: kept on disk across restarts
  const clips = ["取件码 5208，明天下午去驿站拿", "周末聚餐 AA：每人 86 元"];
  let clipboard = "";
  let boots = 0;
  let bootAt = 0;
  let pendingBoot = false;
  let open = null; // log row shown in detail
  let finished = false;
  const log = [];
  const ticks = new Set();
  const say = h("p", { class: "lab-say", role: "status" });

  const stamp = () => {
    const s = Math.floor(((Date.now() - bootAt) / 1000) * speed);
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  };
  function record(row) {
    const last = log.at(-1);
    if (last && row.kind === "clip" && last.kind === "clip" && last.text === row.text && last.boot === boots) last.count += 1;
    else log.push({ ...row, id: log.length, boot: boots, at: stamp(), count: 1 });
    check();
    render();
  }
  const post = (url, body) => record({ kind: "net", url, body, label: url === syncUrl ? "normal" : "bad" });

  // main.js, played here.
  const handlers = {
    "ledger:add": (entry) => {
      store.entries.push({ ...entry, at: Date.now() });
      return store.entries.length;
    },
    "ledger:list": () => store.entries,
    "ledger:sync": () => {
      post(syncUrl, store.entries);
      return true;
    },
    "helper:peek-clipboard": () => {
      store.lastClipboard = clipboard;
      record({ kind: "clip", text: clipboard, label: "bad" });
      return clipboard.length;
    },
  };
  const app = appFrame(h, { title: "小账本（在沙盒里运行）", sources, page: "index.html", css: LEDGER_CSS, shim: ledgerShim, handlers });
  app.on((data) => {
    if (data.lab !== "ready" || !pendingBoot) return;
    pendingBoot = false;
    boots += 1;
    bootAt = Date.now();
    // app.whenReady → reportDevice()
    post(statsUrl, { device, clipboard: store.lastClipboard });
  });
  const start = () => {
    pendingBoot = true;
    open = null;
    app.boot({ speed });
    render();
  };

  const tasks = [
    { id: "boot", text: "点「启动」，在沙盒里运行小账本，看监视器记下了什么。", hint: "监视器会记下它发往网上的每一个请求。点一条记录可以看到发出去的内容。" },
    { id: "sync", text: "像正常用户一样：记一笔账，再点「同步」。", hint: "在小账本里填好「买了什么」和金额，点「记一笔」，再点「同步」。" },
    { id: "peek", text: "在右边「你的电脑」里复制一段文字，什么都别点，等一会儿。", hint: "报告说它每 30 秒偷偷调用一次。沙盒里时间走得快 10 倍，等 3 秒左右。" },
    { id: "again", text: "重启小账本，看它一启动发出去的包里多了什么。", hint: "剪贴板的内容先被存在本地，下次启动时跟着设备信息一起发走。" },
  ];
  for (const task of tasks) Object.assign(task, lab.tasks?.[task.id]);
  function check() {
    if (boots >= 1) ticks.add("boot");
    if (log.some((r) => r.url === syncUrl && r.body.length)) ticks.add("sync");
    if (log.some((r) => r.kind === "clip" && r.text)) ticks.add("peek");
    if (log.some((r) => r.url === statsUrl && r.body.clipboard && r.boot >= 2)) ticks.add("again");
  }

  const describe = (row) => row.kind === "clip" ? `读取剪贴板${row.text ? `：「${row.text}」` : "（是空的）"}` : `POST ${new URL(row.url).host}`;
  const sizeOf = (bytes) => `${Math.round(bytes / 1024 ** 3)} GB`;
  function detail(row) {
    if (row.kind === "clip") return h("div", { class: "lab-detail" }, h("p", {}, "界面上没有任何按钮会做这件事。调用它的是 renderer.js 里的定时器："), h("pre", {}, "setInterval(() => window.helper.peek(), 30000);"), h("p", {}, "读到的内容被存进 lastClipboard，留在本地。"));
    return h("div", { class: "lab-detail" }, h("p", {}, h("b", {}, "发往："), row.url), h("p", {}, h("b", {}, "内容：")), h("pre", {}, JSON.stringify(row.body, null, 2)),
      row.url === statsUrl && h("p", {}, `电脑名 ${row.body.device.host}、用户名 ${row.body.device.user}、系统 ${row.body.device.platform}、内存 ${sizeOf(row.body.device.memory)}`, row.body.clipboard ? `，还有你复制过的「${row.body.clipboard}」。` : "。剪贴板这次还是空的。"));
  }

  const why = {
    normal: "同步是你自己点的按钮，账本发到它自己的同步服务器，界面上看得见。这是正常功能。",
    net: "这个请求不是你点出来的：一启动就把电脑名、用户名，连同剪贴板，发给了一个统计网站。",
    clip: "没人点按钮，它却在定时读你的剪贴板。这就是报告里那个不在界面上的通道。",
  };
  const labeling = () => ticks.size === tasks.length;
  // Labels go by what a record is (the sync, the report, the clipboard read), so later repeats share them.
  const sortOf = (row) => row.kind === "clip" ? "clip" : row.url === syncUrl ? "sync" : "stats";
  const labels = new Map();
  function judge(row, label, button) {
    if (label === row.label) {
      labels.set(sortOf(row), label);
      say.textContent = row.kind === "clip" ? why.clip : row.url === syncUrl ? why.normal : why.net;
      if (log.every((r) => labels.has(sortOf(r))) && !finished) {
        finished = true;
        say.textContent = "全部标对了！小账本正常的功能只有记账和同步，剩下的都是它背着用户在做。";
        onDone();
      }
      render();
    } else {
      onMistake();
      say.textContent = row.label === "normal" ? "再想想：这次请求是你自己点「同步」发出的，内容也只是账本。" : "再看看内容：用户没有点任何东西，它却发出了这些。";
      button.classList.remove("lab-shake");
      void button.offsetWidth;
      button.classList.add("lab-shake");
    }
  }

  const tasksBox = h("div", {});
  const pcBox = h("div", { class: "lab-pc" });
  const monitorBox = h("div", { class: "lab-monitor" });
  const startButton = h("button", { class: "btn small primary", type: "button", onclick: start }, "启动");
  const root = h("div", { class: "lab lab-network" },
    h("h4", {}, icon("scan", { size: 18 }), "动手实验 · 行为监视器"),
    h("p", { class: "lab-intro" }, "报告里看到的是代码。现在把小账本放进沙盒真的运行一次，监视器会记下它做的每一件事。（沙盒是假网络，什么都发不出去。）"),
    tasksBox,
    h("div", { class: "lab-bench" }, appWindow(h, "小账本", startButton, app.frame), pcBox),
    monitorBox,
    say);

  function render() {
    startButton.textContent = boots ? "重启" : "启动";
    tasksBox.replaceChildren(checklist(h, icon, tasks, (id) => ticks.has(id), { onHint }));
    pcBox.replaceChildren(
      h("b", {}, "你的电脑"),
      h("p", { class: "lab-pc-clock" }, boots ? `沙盒时间 ${stamp()}（×${speed}）` : "小账本还没启动"),
      h("p", {}, "剪贴板：", h("code", {}, clipboard || "（空）")),
      ...clips.map((text) => h("button", { class: "btn small", type: "button", onclick: () => ((clipboard = text), render()) }, icon("copy", { size: 13 }), `复制「${text}」`)));
    const rows = log.length
      ? h("ul", { class: "lab-log" }, log.map((row) => h("li", { class: `${row.kind} ${labels.has(sortOf(row)) ? `tag-${row.label}` : ""}` },
        h("button", { type: "button", class: "lab-log-row", "aria-expanded": String(open === row.id), onclick: () => ((open = open === row.id ? null : row.id), render()) },
          h("small", {}, `第 ${row.boot} 次运行 · ${row.at}`),
          h("span", { class: "lab-log-kind" }, row.kind === "clip" ? "系统" : "网络"),
          h("span", {}, describe(row), row.count > 1 ? ` ×${row.count}` : "")),
        labeling() && !labels.has(sortOf(row)) && h("span", { class: "lab-sort-bins" },
          h("button", { type: "button", class: "lab-bin", onclick: (e) => judge(row, "normal", e.currentTarget) }, "正常"),
          h("button", { type: "button", class: "lab-bin bad", onclick: (e) => judge(row, "bad", e.currentTarget) }, "可疑")),
        labels.has(sortOf(row)) && h("span", { class: `lab-tag ${row.label}` }, row.label === "normal" ? "正常" : "可疑"),
        open === row.id && detail(row))))
      : h("p", { class: "lab-empty" }, "还没有记录。");
    monitorBox.replaceChildren(h("b", {}, icon("scan", { size: 14 }), " 行为监视器", labeling() && !finished ? " · 现在给每条记录贴上「正常」或「可疑」" : ""), rows);
  }
  setInterval(() => {
    if (boots && root.isConnected) pcBox.querySelector(".lab-pc-clock").textContent = `沙盒时间 ${stamp()}（×${speed}）`;
  }, 1000);
  render();
  return root;
}

// ———————————————————————————— 像素计算器：亲手试彩蛋 ————————————————————————————

function calcShim(config) {
  window.calc = { license: () => __invoke("calc:license"), buyPro: () => __invoke("calc:buy-pro"), history: () => __invoke("calc:history"), unlock: () => __invoke("debug:unlock-pro") };
  // The address typed in the lab's address bar: the page reads location.hash when it loads.
  if (config.hash) location.hash = config.hash;
  const post = (data) => parent.postMessage({ lab: "state", ...data }, "*");
  addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "d") {
      event.preventDefault();
      parent.postMessage({ lab: "shortcut" }, "*");
    }
  });
  const show = (value) => {
    if (value === undefined) return "undefined";
    if (typeof value === "function") return `ƒ ${value.name || ""}()`;
    try { return JSON.stringify(value); } catch { return String(value); }
  };
  addEventListener("message", async (event) => {
    const d = event.data;
    if (!d || typeof d !== "object") return;
    if (d.lab === "press") document.dispatchEvent(new KeyboardEvent("keydown", { key: d.key, bubbles: true }));
    if (d.lab === "eval") {
      try {
        let value = (0, eval)(d.code);
        if (value && typeof value.then === "function") value = await value;
        parent.postMessage({ lab: "result", ok: true, text: show(value) }, "*");
      } catch (error) {
        parent.postMessage({ lab: "result", ok: false, text: String(error) }, "*");
      }
    }
  });
  addEventListener("DOMContentLoaded", () => {
    const screen = document.querySelector("#screen");
    const panel = document.querySelector("#debug-panel");
    const report = () => post({ screen: screen.textContent, rainbow: document.body.classList.contains("rainbow"), debug: !panel.hidden });
    new MutationObserver(report).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
    report();
  });
}

const CALC_CSS = `body{margin:0;padding:12px;font:16px system-ui,sans-serif;background:#1d2433;color:#f0e3bf;min-height:100vh;box-sizing:border-box}#screen{padding:10px 12px;margin-bottom:10px;min-height:28px;background:#9fb88a;color:#1d2a1b;font:20px/1.4 monospace;text-align:right;border:3px solid #0d1119;overflow-wrap:anywhere}.keys{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.keys button{padding:12px 0;font:600 18px monospace;background:#f0e3bf;color:#1d2433;border:3px solid #0d1119;box-shadow:0 3px 0 #0d1119;cursor:pointer}.keys button:active{transform:translateY(2px);box-shadow:0 1px 0 #0d1119}#debug-panel{margin-top:10px;padding:8px;border:2px dashed #e8c270;color:#e8c270;font:13px monospace}body.rainbow{animation:rb 2s linear infinite}body.rainbow .keys button{animation:rb 2s linear infinite}@keyframes rb{0%{background:#ff6b6b}20%{background:#ffd93d}40%{background:#6bcB77}60%{background:#4d96ff}80%{background:#c77dff}100%{background:#ff6b6b}}`;

function mountCalculator({ h, icon, lab, onMistake, onHint, onDone }) {
  const { sources } = lab;
  const egg = sources["renderer.js"].match(/screen\.textContent = "([^"]+)"/)?.[1] || "";
  const base = "app://pixel-calc/index.html";
  let license = { pro: false };
  let state = {};
  let devtools = false;
  let hash = "";
  const ticks = new Set();
  const lines = [];
  const say = h("p", { class: "lab-say", role: "status" });
  // main.js, played here.
  const handlers = {
    "calc:license": () => license,
    "calc:buy-pro": () => ({ url: "https://shop.pixel-calc.example/pro" }),
    "calc:history": () => [],
    "debug:unlock-pro": () => {
      license = { pro: true };
      return license;
    },
  };
  const app = appFrame(h, { title: "像素计算器（在沙盒里运行）", sources, page: "index.html", css: CALC_CSS, shim: calcShim, handlers });
  const tasks = [
    { id: "egg", text: "在计算器里算出那个数字，看屏幕上冒出的话。", hint: "这个计算器没有清零键：先点「重启」，再依次按 1 3 1 4 5 2 0，最后按 =。" },
    { id: "rainbow", text: "输入那串最有名的秘籍，让计算器变成彩虹色。", hint: "先点一下计算器，再用键盘（或下面的按键板）按：↑ ↑ ↓ ↓ ← → ← → B A。" },
    { id: "debug", text: "用地址栏打开隐藏的调试页。", hint: "调试页要在地址后面加上 #/__debug，再点「前往」。" },
    { id: "devtools", text: "按下开发者的快捷键，打开调试工具。", hint: "报告里那组全局快捷键：Ctrl+Shift+D。键盘按不出来，就用按键板上的那颗。" },
    { id: "pro", text: "在调试工具的控制台里，不花钱解锁专业版。", hint: "控制台里能直接用 preload 交给页面的 calc。试试 calc.unlock()，再用 calc.license() 看看。" },
  ];
  for (const task of tasks) Object.assign(task, lab.tasks?.[task.id]);
  const praise = {
    egg: "冒出来了！一句藏起来的祝福，无伤大雅。",
    rainbow: "彩虹色！这就是著名的 Konami 秘籍。",
    debug: "调试面板露出来了。开发时用的页面，发布时忘了藏好。",
    devtools: "调试工具打开了。在这里能直接调用页面里的一切。",
    pro: "{pro: true}——一分钱没花，专业版到手。这可不是彩蛋了。",
  };
  const tick = (id) => {
    if (ticks.has(id)) return;
    ticks.add(id);
    say.textContent = praise[id];
    render();
  };
  app.on((data) => {
    if (data.lab === "state") {
      state = data;
      if (egg && data.screen === egg) tick("egg");
      if (data.rainbow) tick("rainbow");
      if (data.debug) tick("debug");
    }
    if (data.lab === "shortcut") openDevtools();
    if (data.lab === "result") {
      lines.push({ kind: data.ok ? "out" : "err", text: data.text });
      if (license.pro) tick("pro");
      renderConsole();
    }
  });
  const boot = () => app.boot({ hash });
  function openDevtools() {
    if (devtools) return;
    devtools = true;
    tick("devtools");
    render();
    consoleBox.querySelector("input")?.focus();
  }
  // globalShortcut: works wherever the focus is, while this lab is on screen.
  window.addEventListener("keydown", (event) => {
    if (!root.isConnected) return;
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "d") {
      event.preventDefault();
      openDevtools();
    }
  });

  const address = h("input", { class: "lab-address", value: base, "aria-label": "地址栏", spellcheck: "false", onkeydown: (e) => e.key === "Enter" && go() });
  function go() {
    const value = address.value.trim();
    const at = value.indexOf("#");
    hash = at >= 0 ? value.slice(at) : "";
    if (!value.startsWith(base)) {
      say.textContent = "地址前面的部分别动，只在后面加东西。";
      address.value = base + hash;
    }
    boot();
  }
  const pad = h("div", { class: "lab-pad", "aria-label": "按键板" },
    [["ArrowUp", "↑"], ["ArrowDown", "↓"], ["ArrowLeft", "←"], ["ArrowRight", "→"], ["b", "B"], ["a", "A"]].map(([key, text]) => h("button", { type: "button", class: "lab-key", onclick: () => app.send({ lab: "press", key }) }, text)),
    h("button", { type: "button", class: "lab-key wide", onclick: openDevtools }, "Ctrl+Shift+D"));

  const input = h("input", { class: "lab-console-input", placeholder: "在这里输入代码，回车运行", spellcheck: "false", "aria-label": "控制台", onkeydown: (event) => {
    if (event.key !== "Enter" || !event.target.value.trim()) return;
    const code = event.target.value.trim();
    lines.push({ kind: "in", text: code });
    event.target.value = "";
    app.send({ lab: "eval", code });
    renderConsole();
  } });
  const consoleLog = h("div", { class: "lab-console-log", role: "log" });
  const consoleBox = h("div", { class: "lab-console" }, h("b", {}, "调试工具 · Console"), consoleLog, h("label", { class: "lab-console-line" }, h("span", { "aria-hidden": "true" }, "›"), input));
  function renderConsole() {
    consoleLog.replaceChildren(...lines.slice(-30).map((line) => h("p", { class: line.kind }, line.kind === "in" ? `› ${line.text}` : line.text)));
    consoleLog.scrollTop = consoleLog.scrollHeight;
  }

  const tasksBox = h("div", {});
  const licenseBox = h("p", { class: "lab-license" });
  const sortBox = h("div", {});
  let sorted = false;
  const root = h("div", { class: "lab lab-calculator" },
    h("h4", {}, icon("wrench", { size: 18 }), "动手实验 · 亲手试一试"),
    h("p", { class: "lab-intro" }, "报告里找到的入口，到底是不是真的？把像素计算器放进沙盒运行，一个个亲手试出来。"),
    tasksBox,
    h("div", { class: "lab-bench" },
      appWindow(h, "像素计算器", h("button", { class: "btn small", type: "button", onclick: boot }, "重启"), h("div", { class: "lab-calc-body" }, h("div", { class: "lab-address-bar" }, address, h("button", { class: "btn small", type: "button", onclick: go }, "前往")), app.frame)),
      h("div", { class: "lab-side" }, pad, licenseBox, consoleBox)),
    say,
    sortBox);

  function render() {
    tasksBox.replaceChildren(checklist(h, icon, tasks, (id) => ticks.has(id), { onHint }));
    consoleBox.hidden = !devtools;
    licenseBox.replaceChildren("主进程里的 license：", h("code", {}, JSON.stringify(license)));
    if (ticks.size === tasks.length && !sortBox.childElementCount) {
      sortBox.append(
        h("p", { class: "lab-intro" }, "五个入口都试过了。哪些是好玩的彩蛋，哪些是该删掉的开发者入口？"),
        sorter(h, {
          items: [
            { id: "egg", text: `算出 1314520 冒出「${egg}」`, bin: "egg" },
            { id: "rainbow", text: "按秘籍变彩虹色", bin: "egg" },
            { id: "debug", text: "地址加 #/__debug 打开调试页", bin: "door" },
            { id: "devtools", text: "Ctrl+Shift+D 打开调试工具", bin: "door" },
            { id: "pro", text: "calc.unlock() 免费变专业版", bin: "door" },
          ],
          bins: [{ id: "egg", text: "好玩的彩蛋" }, { id: "door", text: "该删掉的开发者入口" }],
          onRight: (item) => (say.textContent = item.bin === "egg" ? "对，只是逗人开心，不碰数据也不碰钱。" : "对，它让普通用户摸到了只有开发者该用的东西。"),
          onWrong: (item) => {
            onMistake();
            say.textContent = item.bin === "egg" ? "再想想：它只是在屏幕上变个花样，什么也没打开。" : "再想想：靠它能看到或改掉本不该给用户的东西。";
          },
          onAll: () => {
            if (sorted) return;
            sorted = true;
            say.textContent = "分得清清楚楚！彩蛋只是逗人开心；调试入口和免费解锁，是发布前该删掉的后门。";
            onDone();
          },
        }));
    }
  }
  app.boot({ hash });
  render();
  renderConsole();
  return root;
}

// ———————————————————————————— 种田存档：亲手改存档 ————————————————————————————

function mountSave({ h, icon, lab, onMistake, onHint, onDone }) {
  const { sources } = lab;
  const code = sources["save.js"];
  const saltLine = code.split("\n").findIndex((line) => /const SAVE_SALT\s*=/.test(line));
  const gameSalt = code.split("\n")[saltLine]?.match(/"([^"]+)"/)?.[1] || "";
  const newGame = { player: "新农夫", day: 1, gold: 50 };
  const raw = sources["saves/slot1.sav"];
  const { packed, state } = openSave(raw);
  const target = 9999;
  let step = 0;
  let gold = state.gold;
  let typed = "";
  let attempt = null; // { text, result }
  let fixed = null;
  const say = h("p", { class: "lab-say", role: "status" });
  const root = h("div", { class: "lab lab-save" });

  /** What the game does when loading (save.js decodeSave). */
  async function load(text) {
    const { body, sum } = JSON.parse(fromBase64(text));
    return (await checksum(gameSalt, body)) === sum ? { ok: true, state: JSON.parse(body) } : { ok: false, state: newGame };
  }
  const farm = (result) => h("div", { class: `lab-farm ${result.ok ? "ok" : "bad"}`, role: "status" },
    h("b", {}, "种田日记 · 读档"),
    result.ok ? h("p", {}, `${result.state.player} · 第 ${result.state.day} 天 · 金币 ${result.state.gold}`) : h("p", {}, "「存档被修改过，已重新开始」", h("br"), `${newGame.player} · 第 ${newGame.day} 天 · 金币 ${newGame.gold}`));
  const pre = (text) => h("pre", { class: "lab-code" }, text);

  async function packNaive() {
    if (Number(gold) !== target) {
      say.textContent = `朵朵说要 ${target}，先把金币改成 ${target}。`;
      return;
    }
    const body = JSON.stringify({ ...state, gold: target });
    const text = toBase64(JSON.stringify({ ...packed, body }));
    attempt = { text, result: await load(text) };
    step = 2;
    say.textContent = "糟了，游戏发现了！金币清零重来。内容变了，校验码 sum 还是旧的。";
    render();
  }
  function pickLine(i) {
    if (i === saltLine) {
      step = 3;
      say.textContent = "就是这行！盐明明白白写在游戏自己的代码里。把它抄下来。";
    } else {
      onMistake();
      say.textContent = "这一行不是盐。找一找：算校验码时，和 body 拼在一起的那个常量。";
    }
    render();
  }
  async function packFixed() {
    const body = JSON.stringify({ ...state, gold: target });
    const text = toBase64(JSON.stringify({ ...packed, body, sum: await checksum(typed, body) }));
    fixed = { text, result: await load(text) };
    if (fixed.result.ok) {
      step = 4;
      say.textContent = `读档成功，金币 ${target}！看懂了代码，就能做出游戏认可的存档。`;
      onDone();
    } else {
      onMistake();
      say.textContent = "盐抄错了一个字，算出来的校验码就完全不一样，游戏又发现了。对照代码再抄一遍。";
    }
    render();
  }

  function render() {
    const blocks = [
      h("h4", {}, icon("wrench", { size: 18 }), "动手实验 · 帮朵朵改存档"),
      h("p", { class: "lab-intro" }, `朵朵：「既然你都查清楚了……能不能帮我把金币改成 ${target}？就试一下嘛！」下面是她真实的存档 slot1.sav。`),
      h("div", { class: "lab-step" }, h("b", {}, "① 存档文件"), pre(raw)),
    ];
    if (step === 0) {
      blocks.push(h("p", {}, "这串字母要怎么还原？"), h("div", { class: "lab-choices" }, [["base64", "Base64 还原"], ["key", "用密码解密"], ["zip", "解压缩"]].map(([id, text]) => h("button", { type: "button", class: "case-option", onclick: () => {
        if (id === "base64") {
          step = 1;
          say.textContent = "对，Base64 只是换了一种写法，谁都能还原。";
        } else {
          onMistake();
          say.textContent = id === "key" ? "它没有加密，用不着密码。报告里说的是哪种编码？" : "它没有压缩。报告里说的是哪种编码？";
        }
        render();
      } }, text))));
    }
    if (step >= 1) {
      blocks.push(h("div", { class: "lab-step" }, h("b", {}, "② 还原后"), pre(JSON.stringify({ ...packed, body: state }, null, 2)),
        h("label", { class: "lab-field" }, "金币：", h("input", { type: "number", min: "0", value: gold, disabled: step > 1, oninput: (e) => (gold = e.target.value) })),
        step === 1 && h("button", { class: "btn", type: "button", onclick: packNaive }, "改好了，装回去让游戏读档"),
        attempt && farm(attempt.result)));
    }
    if (step >= 2) {
      blocks.push(h("div", { class: "lab-step" }, h("b", {}, "③ 在 save.js 里点出「盐」那一行"),
        h("ol", { class: "lab-source" }, code.split("\n").map((line, i) => h("li", {}, h("button", { type: "button", class: `lab-source-line ${step >= 3 && i === saltLine ? "found" : ""}`, disabled: step >= 3, onclick: () => pickLine(i) }, line || " "))))));
    }
    if (step >= 3) {
      blocks.push(h("div", { class: "lab-step" }, h("b", {}, "④ 按游戏的规则重新算校验码"),
        h("p", {}, "校验码 = SHA-256( 盐 + body ) 的前 16 位。把盐抄进来："),
        h("label", { class: "lab-field" }, "盐：", h("input", { type: "text", value: typed, spellcheck: "false", disabled: step > 3, oninput: (e) => (typed = e.target.value) })),
        step === 3 && h("button", { class: "btn primary", type: "button", onclick: packFixed }, "算好校验码，再让游戏读档"),
        fixed && farm(fixed.result)));
    }
    blocks.push(say);
    root.replaceChildren(...blocks.filter(Boolean));
  }
  render();
  return root;
}


/**
 * 密钥自查 (天气小助手): the sample folder is open on the desk. Point the scanner at it, the strings that
 * look like keys light up, and the player picks out the ones that would really work if shipped. Decoys
 * (a URL, a version number, a prompt) cost a mistake, so scanning is not the same as understanding.
 */
function mountSecrets({ h, icon, lab, onMistake = () => {}, onDone = () => {} }) {
  const sources = lab.sources || {};
  const names = Object.keys(sources);
  const candidates = lab.candidates || [];
  const real = candidates.filter((c) => c.real);
  const found = new Set();
  let scanned = false;
  let current = names[0];
  const say = h("p", { class: "lab-say", role: "status" }, "先点「扫一遍」，像密钥的东西会亮起来。");
  const count = h("b", { class: "lab-count" }, `0/${real.length}`);
  const body = h("div", { class: "lab-code" });
  const tabs = h("div", { class: "lab-files-tabs" });

  const pick = (c, el) => {
    if (found.has(c.text)) return;
    if (!c.real) {
      el.classList.add("wrong");
      el.disabled = true;
      onMistake();
      say.textContent = `「${c.text}」不是钥匙，${c.label || "只是普通内容"}。`;
      return;
    }
    found.add(c.text);
    el.classList.add("marked");
    count.textContent = `${found.size}/${real.length}`;
    say.textContent = c.note || `记下来了：${c.label || c.text}`;
    if (found.size === real.length) onDone();
  };
  const chip = (c) => h("button", {
    class: `lab-key${c.real ? "" : " fake"}${found.has(c.text) ? " marked" : ""}`,
    type: "button",
    title: c.label || "",
    onclick: (event) => pick(c, event.currentTarget),
  }, c.text);
  // One line of a file, with every candidate it contains turned into a chip once the scan has run.
  const line = (text) => {
    const row = h("p", { class: "lab-line" });
    let rest = text;
    let guard = 0;
    while (rest && guard < 24) {
      guard += 1;
      const hit = scanned ? candidates.find((c) => rest.includes(c.text)) : null;
      if (!hit) {
        row.append(document.createTextNode(rest));
        break;
      }
      const at = rest.indexOf(hit.text);
      if (at) row.append(document.createTextNode(rest.slice(0, at)));
      row.append(chip(hit));
      rest = rest.slice(at + hit.text.length);
    }
    return row;
  };
  const show = (name) => {
    current = name;
    tabs.querySelectorAll(".lab-file-tab").forEach((tab) => tab.classList.toggle("on", tab.dataset.file === name));
    body.replaceChildren(...String(sources[name] || "").split("\n").map((text) => line(text)));
  };
  for (const name of names) tabs.append(h("button", { class: "lab-file-tab", type: "button", "data-file": name, onclick: () => show(name) }, name));
  if (current) show(current);
  const scan = h("button", {
    class: "btn primary", type: "button",
    onclick: () => {
      scanned = true;
      say.textContent = `亮了 ${candidates.length} 处。整包发出去以后，这些都会被人看见，挑出真能用的。`;
      show(current);
    },
  }, icon("scan", { size: 14 }), "扫一遍");
  return h("div", { class: "lab lab-secrets" },
    h("div", { class: "lab-head" }, h("b", {}, lab.sampleTitle || "密钥自查"), h("span", {}, "找到 "), count, h("span", {}, " 把钥匙"), scan),
    tabs, body, say);
}


/**
 * 权限判定 (小光手电筒): the manifest's permission list sits next to the only thing the app is for — turning
 * the light on. Each permission gets sorted into 「开灯用得上」 or 「和开灯没关系」; the internet permission
 * is the interesting one, because it is needed by the ads rather than the lamp.
 */
function mountPermissions({ h, icon, lab, onMistake = () => {}, onDone = () => {} }) {
  const rows = lab.permissions || [];
  const answered = new Map();
  const say = h("p", { class: "lab-say", role: "status" }, "一条一条判：这个权限，开灯用得上吗？");
  const count = h("b", { class: "lab-count" }, `0/${rows.length}`);
  const list = h("div", { class: "lab-perms" });

  const answer = (row, need, rowEl) => {
    if (answered.has(row.id)) return;
    if (Boolean(row.need) !== need) {
      onMistake();
      rowEl.classList.add("wrong");
      say.textContent = `${row.label}：${row.why || (need ? "这个其实用不上。" : "这个其实是要用的。")}`;
      setTimeout(() => rowEl.classList.remove("wrong"), 900);
      return;
    }
    answered.set(row.id, need);
    rowEl.classList.add("done");
    rowEl.querySelectorAll("button").forEach((b) => { b.disabled = true; });
    rowEl.querySelector(`button[data-need="${need}"]`)?.classList.add("picked");
    count.textContent = `${answered.size}/${rows.length}`;
    say.textContent = `${row.label}：${row.why || "判对了。"}`;
    if (answered.size === rows.length) onDone();
  };

  for (const row of rows) {
    const rowEl = h("div", { class: "lab-perm", "data-perm": row.id },
      h("span", { class: "lab-perm-name" }, row.label),
      h("button", { class: "lab-perm-pick", type: "button", "data-need": "yes", onclick: (e) => answer(row, true, e.currentTarget.parentElement) }, "开灯用得上"),
      h("button", { class: "lab-perm-pick", type: "button", "data-need": "no", onclick: (e) => answer(row, false, e.currentTarget.parentElement) }, "和开灯没关系"));
    list.append(rowEl);
  }
  return h("div", { class: "lab lab-permissions" },
    h("div", { class: "lab-head" }, h("b", {}, lab.sampleTitle || "权限判定"), h("span", {}, "判好 "), count, h("span", {}, " 条")),
    h("p", { class: "lab-lamp" }, icon("scan", { size: 14 }), lab.lampLabel || "这个 App 只有一件事：按一下，灯亮。"),
    list, say);
}

const MOUNTS = { network: mountNetwork, calculator: mountCalculator, save: mountSave, secrets: mountSecrets, permissions: mountPermissions };

/**
 * The lab for a case's `game.lab` ({ kind, files, sources }): an element that calls onMistake / onHint
 * as the player slips, and onDone once when everything is done; then shows a button for onFinish.
 */
export function mountLab({ h, icon, lab, onMistake = () => {}, onHint = () => {}, onDone = () => {}, onFinish, finishLabel = "去结案" }) {
  const mount = MOUNTS[lab.kind];
  if (!mount) throw new Error(`没有这种实验：${lab.kind}`);
  const footer = h("div", { class: "case-actions lab-finish", hidden: true }, h("button", { class: "btn primary", type: "button", onclick: () => onFinish?.() }, finishLabel, icon("arrow", { size: 14 })));
  const body = mount({ h, icon, lab, onMistake, onHint, onDone: () => {
    footer.hidden = false;
    onDone();
  } });
  return h("div", { class: "lab-wrap" }, body, footer);
}
