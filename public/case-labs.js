import { createPermissionLab } from "./permission-lab.js";
import { cls } from "./mini-art.js";
import { mountRhythm, mountTower, mountPipes, mountManage, mountCards, mountMines } from "./case-minigames.js";
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
  // 沙盒时间：定时器照常按倍速走；「快进」时把登记过的定时任务都跑一次（就像时间真的过去了）。
  const every = window.setInterval;
  const timers = [];
  window.setInterval = (fn, ms, ...rest) => {
    timers.push(() => fn(...rest));
    return every(fn, ms / (config.speed || 1), ...rest);
  };
  addEventListener("message", (event) => {
    if (event.data?.lab === "ff") for (const run of timers) run();
  });
}

const LEDGER_CSS = `body{margin:0;padding:14px;font:14px/1.6 system-ui,sans-serif;background:#fbf6e6;color:#2b2b25}h1{margin:0 0 10px;font-size:18px}input{width:42%;margin:0 6px 8px 0;padding:6px;border:2px solid #b19b69;background:#fff}button{margin:0 6px 8px 0;padding:6px 12px;border:2px solid #2b2b25;background:#e8c270;font:inherit;cursor:pointer}ul{margin:4px 0;padding-left:18px}`;

/**
 * 行为监视器的四件「要证明的事」。玩家自己做实验，再从监视器里挑一条记录钉上去当证据；
 * 判断这条记录证不证明这件事的，就是下面这个函数（Node 测试也用它）。
 * ctx: { syncUrl, statsUrl, bait }：bait 是玩家放进剪贴板的诱饵（可以为空）。
 */
export const NETWORK_CLAIMS = [
  { id: "online", text: "没点同步，它也在联网", hint: "启动它，什么都别点，看监视器里有没有网络请求。" },
  { id: "peek", text: "它在偷看你的剪贴板", hint: "先复制点东西进剪贴板。读剪贴板的是一个定时任务，时间不会自己走快——试试「快进 30 秒」。" },
  { id: "exfil", text: "你复制的东西会被它发走", hint: "剪贴板被读走以后先存在本地。它什么时候会往外发东西？想想一启动时那个请求。用一个独一无二的「诱饵」更容易认出来。" },
  { id: "control", text: "对照：同步本身没问题，只发了账目", hint: "冤枉好人也不行。记一笔账，自己点「同步」，看看那个请求里装的是什么。" },
];

export function networkProves(claimId, row, ctx) {
  if (!row) return { ok: false, why: "先从监视器里挑一条记录。" };
  const isStats = row.kind === "net" && row.url === ctx.statsUrl;
  const isSync = row.kind === "net" && row.url === ctx.syncUrl;
  const sent = isStats ? row.body?.clipboard || "" : "";
  switch (claimId) {
    case "online":
      if (isStats) return { ok: true, why: "没人点任何按钮，它一启动就往统计服务器发了一个请求。" };
      if (isSync) return { ok: false, why: "这条是你自己点「同步」发的，证明不了「没点也联网」。" };
      return { ok: false, why: "这条不是网络请求。" };
    case "peek":
      if (row.kind === "clip" && row.text) return { ok: true, why: "界面上没有这个按钮，定时任务却把剪贴板读走了。" };
      if (row.kind === "clip") return { ok: false, why: "它确实去读了，可那时剪贴板是空的——先复制点东西，才证明它读到了。" };
      return { ok: false, why: "这条是网络请求，不是读剪贴板。" };
    case "exfil":
      if (isStats && sent) {
        const baited = ctx.bait && sent.includes(ctx.bait);
        return { ok: true, baited, why: baited ? `你的诱饵「${ctx.bait}」原样出现在发往统计服务器的请求里——铁证。` : "你复制过的文字出现在发往统计服务器的请求里。" };
      }
      if (isStats) return { ok: false, why: "这个请求里的 clipboard 还是空的。剪贴板是先被存下来的——它要到什么时候才会发出去？" };
      if (row.kind === "clip") return { ok: false, why: "这条只证明它读了剪贴板，还没证明发出去。" };
      return { ok: false, why: "同步请求里只有账目，没有剪贴板。" };
    case "control":
      if (isSync && Array.isArray(row.body) && row.body.length) return { ok: true, why: "同步是你自己点的，发往它自己的同步服务器，里面只有账目。这一项冤枉不了它。" };
      if (isSync) return { ok: false, why: "这次同步里一笔账都没有，看不出它发了什么。先记一笔再同步。" };
      return { ok: false, why: "对照要用你自己点「同步」发出的那条。" };
    default:
      return { ok: false, why: "" };
  }
}

function mountNetwork({ h, icon, lab, onMistake, onHint, onDone, story = async () => {} }) {
  const { sources } = lab;
  const syncUrl = sources["main.js"].match(/SYNC_URL = "([^"]+)"/)?.[1];
  const statsUrl = sources["main.js"].match(/STATS_URL = "([^"]+)"/)?.[1];
  // 时间按真实的走（30 秒才读一次剪贴板）；想快点看到定时任务，玩家得自己去点「快进」。
  const speed = 1;
  const device = { host: "XIAOLIN-PC", user: "xiaolin", platform: "win32", memory: 17179869184 };
  const store = { entries: [], lastClipboard: "" }; // electron-store：存在硬盘上，重启也在
  const samples = ["取件码 5208，明天下午去驿站拿", "周末聚餐 AA：每人 86 元"];
  let clipboard = "";
  let bait = "";
  let boots = 0;
  let clock = 0; // 沙盒里过了多少秒（这一次运行）
  let pendingBoot = false;
  let open = null;
  let finished = false;
  let selected = null; // 选中的「要证明的事」，接下来点的记录钉给它
  const log = [];
  const proofs = new Map(); // claim id -> row
  const claims = NETWORK_CLAIMS.map((c) => ({ ...c, ...lab.tasks?.[c.id] }));
  const say = h("p", { class: "lab-say", role: "status" });

  const stamp = () => `${String(Math.floor(clock / 60)).padStart(2, "0")}:${String(Math.floor(clock % 60)).padStart(2, "0")}`;
  function record(row) {
    const last = log.at(-1);
    if (last && row.kind === "clip" && last.kind === "clip" && last.text === row.text && last.boot === boots) last.count += 1;
    else log.push({ ...row, id: log.length, boot: boots, at: stamp(), count: 1 });
    render();
  }
  const post = (url, body) => record({ kind: "net", url, body: JSON.parse(JSON.stringify(body)) });

  // main.js，在这里扮演。
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
      record({ kind: "clip", text: clipboard });
      return clipboard.length;
    },
  };
  const app = appFrame(h, { title: "小账本（在沙盒里运行）", sources, page: "index.html", css: LEDGER_CSS, shim: ledgerShim, handlers });
  app.on((data) => {
    if (data.lab !== "ready" || !pendingBoot) return;
    pendingBoot = false;
    boots += 1;
    clock = 0;
    // app.whenReady → reportDevice()
    post(statsUrl, { device, clipboard: store.lastClipboard });
  });
  const start = () => {
    pendingBoot = true;
    open = null;
    app.boot({ speed });
    render();
  };
  const fastForward = () => {
    if (!boots) {
      say.textContent = "小账本还没启动，快进也没有东西会发生。";
      return;
    }
    clock += 30;
    app.send({ lab: "ff" });
    render();
  };
  const copy = (text) => {
    clipboard = text;
    say.textContent = `剪贴板里现在是「${text}」。`;
    render();
  };
  const makeBait = () => {
    bait = `诱饵-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    copy(bait);
    say.textContent = `做了一个诱饵「${bait}」放进剪贴板：它独一无二，之后在哪个请求里出现，就证明数据流到了哪里。`;
  };

  async function pin(row) {
    if (finished) return;
    if (!selected) {
      open = open === row.id ? null : row.id;
      render();
      return;
    }
    const claim = claims.find((c) => c.id === selected);
    const res = networkProves(selected, row, { syncUrl, statsUrl, bait });
    if (res.ok) {
      proofs.set(selected, row);
      say.textContent = `证明了「${claim.text}」：${res.why}`;
      selected = claims.find((c) => !proofs.has(c.id))?.id || null;
      const done = proofs.size === claims.length;
      if (done) {
        finished = true;
        selected = null;
        say.textContent = "四件事都证明了：小账本正常的功能只有记账和同步，读剪贴板、开机上报、把你复制的东西发走，全是背着用户做的。";
      }
      render();
      // 每证明一件，委托人在旁边说一句（lab.talk[事的 id]，在案例数据里）。
      await story(lab.talk?.[claim.id] || []);
      if (done) onDone();
      return;
    } else {
      onMistake();
      say.textContent = `这条证明不了「${claim.text}」：${res.why}`;
    }
    render();
  }

  const describe = (row) => row.kind === "clip" ? `读取剪贴板${row.text ? `：「${row.text}」` : "（是空的）"}` : `POST ${new URL(row.url).host}`;
  const sizeOf = (bytes) => `${Math.round(bytes / 1024 ** 3)} GB`;
  function detail(row) {
    if (row.kind === "clip") return h("div", { class: "lab-detail" }, h("p", {}, "界面上没有任何按钮会做这件事。调用它的是 renderer.js 里的定时器："), h("pre", {}, "setInterval(() => window.helper.peek(), 30000);"), h("p", {}, "读到的内容被存进 lastClipboard，留在本地。"));
    return h("div", { class: "lab-detail" }, h("p", {}, h("b", {}, "发往："), row.url), h("p", {}, h("b", {}, "内容：")), h("pre", {}, JSON.stringify(row.body, null, 2)),
      row.url === statsUrl && h("p", {}, `电脑名 ${row.body.device.host}、用户名 ${row.body.device.user}、系统 ${row.body.device.platform}、内存 ${sizeOf(row.body.device.memory)}`, row.body.clipboard ? `，还有剪贴板里的「${row.body.clipboard}」。` : "。剪贴板这次是空的。"));
  }

  const claimsBox = h("div", { class: "lab-claims" });
  const pcBox = h("div", { class: "lab-pc" });
  const monitorBox = h("div", { class: "lab-monitor" });
  const startButton = h("button", { class: "btn small primary", type: "button", onclick: start }, "启动");
  const baitInput = h("input", { class: "lab-bait-input", type: "text", placeholder: "自己输入要复制的文字", "aria-label": "要复制到剪贴板的文字" });
  const root = h("div", { class: "lab lab-network" },
    h("h4", {}, icon("scan", { size: 18 }), "动手实验 · 抓现行"),
    h("p", { class: "lab-intro" }, "下面四件事，每一件都要拿监视器里的一条记录当证据。怎么做实验你自己定：启动、记账、复制、快进、重启都行。（沙盒是假网络，什么都发不出去。）"),
    claimsBox,
    h("div", { class: "lab-bench" }, appWindow(h, "小账本", startButton, app.frame), pcBox),
    monitorBox,
    say);

  function render() {
    startButton.textContent = boots ? "重启" : "启动";
    claimsBox.replaceChildren(...claims.map((c, i) => {
      const proof = proofs.get(c.id);
      const tip = h("small", { class: "lab-claim-hint", hidden: true }, c.hint);
      return h("div", { class: `lab-claim ${proof ? "proved" : ""} ${selected === c.id ? "selected" : ""}` },
        h("button", { type: "button", class: "lab-claim-pick", disabled: Boolean(proof) || finished, onclick: () => {
          selected = selected === c.id ? null : c.id;
          say.textContent = selected ? `去监视器里点一条记录，钉给「${c.text}」。` : "";
          render();
        } }, h("span", { class: "lab-task-mark", "aria-hidden": "true" }, proof ? "✓" : i + 1), h("b", {}, c.text)),
        proof ? h("span", { class: "lab-claim-proof" }, `证据：第 ${proof.boot} 次运行 ${proof.at} · ${describe(proof)}`)
          : h("button", { class: "btn small ghost", type: "button", onclick: (e) => { onHint(); tip.hidden = false; e.currentTarget.remove(); } }, icon("bulb", { size: 13 }), "提示"),
        tip);
    }));
    pcBox.replaceChildren(
      h("b", {}, "你的电脑"),
      h("p", { class: "lab-pc-clock" }, boots ? `第 ${boots} 次运行 · 沙盒时间 ${stamp()}` : "小账本还没启动"),
      h("button", { class: "btn small", type: "button", onclick: fastForward }, "快进 30 秒"),
      h("p", {}, "剪贴板：", h("code", {}, clipboard || "（空）")),
      h("div", { class: "lab-bait" }, baitInput, h("button", { class: "btn small", type: "button", onclick: () => baitInput.value.trim() && copy(baitInput.value.trim()) }, icon("copy", { size: 13 }), "复制")),
      h("button", { class: "btn small primary", type: "button", onclick: makeBait }, "生成一个诱饵"),
      ...samples.map((text) => h("button", { class: "btn small ghost", type: "button", onclick: () => copy(text) }, icon("copy", { size: 13 }), `复制「${text}」`)));
    const rows = log.length
      ? h("ul", { class: "lab-log" }, log.map((row) => {
        const usedFor = [...proofs].filter(([, r]) => r.id === row.id).map(([id]) => claims.find((c) => c.id === id)?.text);
        return h("li", { class: `${row.kind} ${usedFor.length ? "pinned" : ""} ${selected ? "pickable" : ""}` },
          h("button", { type: "button", class: "lab-log-row", "aria-expanded": String(open === row.id), onclick: () => pin(row) },
            h("small", {}, `第 ${row.boot} 次运行 · ${row.at}`),
            h("span", { class: "lab-log-kind" }, row.kind === "clip" ? "系统" : "网络"),
            h("span", {}, describe(row), row.count > 1 ? ` ×${row.count}` : "")),
          usedFor.length > 0 && h("span", { class: "lab-tag bad" }, "已作证"),
          !selected && h("button", { type: "button", class: "lab-log-more", onclick: () => ((open = open === row.id ? null : row.id), render()) }, open === row.id ? "收起" : "看内容"),
          open === row.id && detail(row));
      }))
      : h("p", { class: "lab-empty" }, "还没有记录。启动小账本试试。");
    monitorBox.replaceChildren(h("b", {}, icon("scan", { size: 14 }), " 行为监视器", selected ? ` · 点一条记录钉给「${claims.find((c) => c.id === selected)?.text}」` : ""), rows);
  }
  render();
  return root;
}

// ———————————————————————————— 像素计算器：亲手试彩蛋 ————————————————————————————

function calcShim(config) {
  window.calc = { license: () => __invoke("calc:license"), buyPro: () => __invoke("calc:buy-pro"), history: () => __invoke("calc:history"), unlock: () => __invoke("debug:unlock-pro") };
  // 修复版删掉了 preload 里的 unlock：页面上再也拿不到这个函数。
  if (config.noUnlock) delete window.calc.unlock;
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

/**
 * 像素计算器：网上的五条传言。每条先在代码里找到（needle 匹配到的那一行），再在沙盒里亲手试出来；
 * 最后以开发者的身份决定删哪几个——删掉的就是后门（door），留着的是彩蛋（egg）。
 */
export const CALC_RUMORS = [
  { id: "egg", kind: "egg", rumor: "听说在计算器里算出某个特别的数字，屏幕上会冒出一句话。", search: "试试搜 display：看看按「=」的时候它在比较什么。", needle: /display === "(\d+)"/, file: "renderer.js", found: (m) => `算出 ${m[1]} 再按「=」` },
  { id: "rainbow", kind: "egg", rumor: "有人说按一串神秘的按键，计算器会变成彩虹色。", search: "试试搜 KEYS 或 key：找一串按键的名单。", needle: /SECRET_KEYS = \[/, file: "renderer.js", found: () => "依次按 ↑ ↑ ↓ ↓ ← → ← → B A" },
  { id: "debug", kind: "door", rumor: "地址后面加点什么，就能打开一个隐藏页面。", search: "试试搜 hash：页面加载时看了地址的哪一部分。", needle: /location\.hash === "([^"]+)"/, file: "renderer.js", found: (m) => `地址后面加上 ${m[1]}` },
  { id: "devtools", kind: "door", rumor: "开发者留了一个快捷键，能打开调试工具。", search: "试试搜 Shortcut：主进程注册了哪个全局快捷键。", needle: /globalShortcut\.register\("([^"]+)"/, file: "main.js", found: (m) => `按 ${m[1].replace("CommandOrControl", "Ctrl")}` },
  { id: "pro", kind: "door", rumor: "不用花钱也能打开专业版？", search: "试试搜 unlock：有没有一个不收钱的解锁通道。", needle: /debug:unlock-pro/, file: "main.js", found: () => "调试工具的控制台里执行 calc.unlock()" },
];

/** 在发布出去的代码里（去掉开发者注释）搜一个词，最多 6 行；顺便看看哪条传言被这次搜索证实了。 */
export function searchCalc(sources, query) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return { hits: [], found: [] };
  const hits = [];
  for (const file of ["renderer.js", "main.js", "preload.js"]) {
    const lines = (sources[file] || "").split("\n");
    lines.forEach((text, i) => {
      if (/^\s*\/\//.test(text) || !text.trim()) return;
      if (words.every((w) => text.toLowerCase().includes(w))) hits.push({ file, n: i + 1, text: text.trim() });
    });
  }
  const shown = hits.slice(0, 6);
  const found = CALC_RUMORS.filter((r) => shown.some((hit) => hit.file === r.file && r.needle.test(hit.text)));
  return { hits: shown, more: Math.max(0, hits.length - 6), found };
}

/** 删掉这些入口以后，代码里还剩什么：彩蛋留没留、后门关没关。 */
export function judgePatch(removed) {
  const doorsLeft = CALC_RUMORS.filter((r) => r.kind === "door" && !removed.has(r.id)).map((r) => r.id);
  const eggsLost = CALC_RUMORS.filter((r) => r.kind === "egg" && removed.has(r.id)).map((r) => r.id);
  return { ok: !doorsLeft.length && !eggsLost.length, doorsLeft, eggsLost };
}

/** 把删除落到真代码上：渲染进程的三处改字符串，主进程和 preload 的两处由沙盒里扮演的主进程关掉。 */
function patchRenderer(source, removed) {
  let out = source;
  if (removed.has("egg")) out = out.replace(/display === "\d+"/, "false");
  if (removed.has("rainbow")) out = out.replace('document.body.classList.add("rainbow");', "");
  if (removed.has("debug")) out = out.replace(/location\.hash === "[^"]+"/, "false");
  return out;
}

function mountCalculator({ h, icon, lab, onMistake, onHint, onDone }) {
  const sources0 = lab.sources;
  const base = "app://pixel-calc/index.html";
  const eggText = sources0["renderer.js"].match(/screen\.textContent = "([^"]+)"/)?.[1] || "";
  const rumors = CALC_RUMORS.map((r) => {
    const file = sources0[r.file] || "";
    const line = file.split("\n").find((l) => r.needle.test(l)) || "";
    const m = line.match(r.needle);
    return { ...r, line: line.trim(), detail: m ? r.found(m) : "", ...lab.tasks?.[r.id] };
  });
  let license = { pro: false };
  let devtools = false;
  let hash = "";
  let phase = "hunt"; // hunt（找和试）· fix（删哪几个）· done
  const found = new Set();
  const tried = new Set();
  const removed = new Set();
  let patched = null; // 修过以后的状态：{ removed }
  const lines = [];
  const say = h("p", { class: "lab-say", role: "status" }, "先挑一条传言，到代码里找证据，再在沙盒里亲手试出来。");

  // main.js，在这里扮演；修过以后，删掉的两个入口就不存在了。
  const handlers = {
    "calc:license": () => license,
    "calc:buy-pro": () => ({ url: "https://shop.pixel-calc.example/pro" }),
    "calc:history": () => [],
    "debug:unlock-pro": () => {
      if (patched?.removed.has("pro")) return { error: "没有这个通道" };
      license = { pro: true };
      return license;
    },
  };
  let sources = sources0;
  let app = null;
  const frameBox = h("div", { class: "lab-calc-frame" });
  function makeApp() {
    app = appFrame(h, { title: "像素计算器（在沙盒里运行）", sources, page: "index.html", css: CALC_CSS, shim: calcShim, handlers });
    app.on(onFrame);
    frameBox.replaceChildren(app.frame);
  }
  const praise = {
    egg: "冒出来了！一句藏起来的祝福，无伤大雅。",
    rainbow: "彩虹色！这就是著名的 Konami 秘籍。",
    debug: "调试面板露出来了。开发时用的页面，发布时忘了藏好。",
    devtools: "调试工具打开了。在这里能直接调用页面里的一切。",
    pro: "{pro: true}——一分钱没花，专业版到手。这可不是彩蛋了。",
  };
  const tryIt = (id) => {
    if (phase !== "hunt" || tried.has(id)) return;
    tried.add(id);
    say.textContent = found.has(id) ? praise[id] : `${praise[id]}（这条传言你还没在代码里找到依据，去搜一搜。）`;
    if (tried.size === rumors.length && found.size === rumors.length) toFix();
    render();
  };
  function onFrame(data) {
    if (data.lab === "state") {
      if (eggText && data.screen === eggText) tryIt("egg");
      if (data.rainbow) tryIt("rainbow");
      if (data.debug) tryIt("debug");
    }
    if (data.lab === "shortcut") openDevtools();
    if (data.lab === "result") {
      lines.push({ kind: data.ok ? "out" : "err", text: data.text });
      if (license.pro) tryIt("pro");
      renderConsole();
    }
  }
  const boot = () => app.boot({ hash, noUnlock: Boolean(patched?.removed.has("pro")) });
  function openDevtools() {
    if (patched?.removed.has("devtools")) {
      say.textContent = "按了 Ctrl+Shift+D，什么都没发生——快捷键已经删掉了。";
      return;
    }
    if (devtools) return;
    devtools = true;
    tryIt("devtools");
    render();
    consoleBox.querySelector("input")?.focus();
  }
  window.addEventListener("keydown", (event) => {
    if (!root.isConnected) return;
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "d") {
      event.preventDefault();
      openDevtools();
    }
  });

  /* ----- 找：在发布出去的代码里搜 ----- */
  const searchInput = h("input", { class: "lab-address", placeholder: "在代码里搜一个词，比如 display", spellcheck: "false", "aria-label": "搜索代码", onkeydown: (e) => e.key === "Enter" && search() });
  const results = h("div", { class: "lab-calc-hits" });
  function search() {
    const q = searchInput.value.trim();
    if (!q) return;
    const res = searchCalc(sources0, q);
    const fresh = res.found.filter((r) => !found.has(r.id)).map((r) => rumors.find((x) => x.id === r.id));
    for (const r of fresh) found.add(r.id);
    results.replaceChildren(...(res.hits.length ? res.hits.map((hit) => {
      const r = rumors.find((x) => x.file === hit.file && x.needle.test(hit.text));
      return h("p", { class: r ? "hit rumor" : "hit" }, h("small", {}, `${hit.file}:${hit.n}`), h("code", {}, hit.text), r ? h("em", {}, `← 传言「${r.rumor.slice(0, 12)}…」的依据：${r.detail}`) : null);
    }) : [h("p", { class: "miss" }, /[一-鿿]/.test(q) ? "没找到。代码里的名字都是英文的。" : "没找到，换个词试试。")]),
    ...(res.more ? [h("p", { class: "miss" }, `还有 ${res.more} 行，多写一个词缩小范围。`)] : []));
    if (fresh.length) say.textContent = `找到了！${fresh.map((r) => r.detail).join("；")}。去沙盒里亲手试试。`;
    if (tried.size === rumors.length && found.size === rumors.length) toFix();
    render();
  }

  /* ----- 试：沙盒、地址栏、按键板、控制台 ----- */
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
  const pad = h("div", { class: "lab-pad", "aria-label": "按键板" });
  function paintPad() {
    pad.replaceChildren(
      ...(found.has("rainbow") ? [["ArrowUp", "↑"], ["ArrowDown", "↓"], ["ArrowLeft", "←"], ["ArrowRight", "→"], ["b", "B"], ["a", "A"]].map(([key, text]) => h("button", { type: "button", class: "lab-key", onclick: () => app.send({ lab: "press", key }) }, text)) : [h("small", {}, "（在代码里找到按键名单后，这里会出现按键板；也可以点一下计算器直接用键盘）")]),
      found.has("devtools") ? h("button", { type: "button", class: "lab-key wide", onclick: openDevtools }, "Ctrl+Shift+D") : null);
  }
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

  /* ----- 修：以开发者的身份决定删哪几个 ----- */
  const fixBox = h("div", { class: "lab-calc-fix", hidden: true });
  function toFix() {
    if (phase !== "hunt") return;
    phase = "fix";
    say.textContent = "五条传言都是真的。现在你是开发者：哪几处该在发布前删掉？彩蛋可以留着逗人开心。";
  }
  function applyPatch() {
    const verdict = judgePatch(removed);
    if (!verdict.ok) {
      onMistake();
      const lost = verdict.eggsLost.map((id) => rumors.find((r) => r.id === id).rumor.slice(0, 10));
      say.textContent = verdict.doorsLeft.length
        ? `还有 ${verdict.doorsLeft.length} 处后门没删：普通用户还能摸到只有开发者该用的东西。`
        : `你把彩蛋也删了（${lost.join("、")}…）。它们只是在屏幕上变个花样，不碰数据也不碰钱——小雨会伤心的。`;
      return;
    }
    patched = { removed: new Set(removed) };
    sources = { ...sources0, "renderer.js": patchRenderer(sources0["renderer.js"], removed) };
    license = { pro: false };
    devtools = false;
    hash = "";
    address.value = base;
    lines.length = 0;
    makeApp();
    boot();
    phase = "done";
    say.textContent = "修好了，新版本已经在沙盒里重新跑起来：再按 Ctrl+Shift+D、加 #/__debug、调 calc.unlock() 都没用了，算出那个数字和按秘籍还是会有惊喜。彩蛋留着，后门关上。";
    onDone();
    render();
  }

  const rumorBox = h("div", { class: "lab-claims" });
  const licenseBox = h("p", { class: "lab-license" });
  const root = h("div", { class: "lab lab-calculator" },
    h("h4", {}, icon("wrench", { size: 18 }), "动手实验 · 传言是真的吗"),
    h("p", { class: "lab-intro" }, "网上流传着五条关于像素计算器的传言。每一条都先在代码里找到依据，再在沙盒里亲手试出来；最后以开发者的身份，决定发布前删掉哪些。"),
    rumorBox,
    h("div", { class: "lab-calc-search" }, h("b", {}, "在代码里搜（发布版，没有开发者注释）"), h("div", { class: "lab-address-bar" }, searchInput, h("button", { class: "btn small", type: "button", onclick: search }, "搜索")), results),
    h("div", { class: "lab-bench" },
      appWindow(h, "像素计算器", h("button", { class: "btn small", type: "button", onclick: () => boot() }, "重启"), h("div", { class: "lab-calc-body" }, h("div", { class: "lab-address-bar" }, address, h("button", { class: "btn small", type: "button", onclick: go }, "前往")), frameBox)),
      h("div", { class: "lab-side" }, pad, licenseBox, consoleBox)),
    fixBox,
    say);

  function render() {
    rumorBox.replaceChildren(...rumors.map((r, i) => {
      const tip = h("small", { class: "lab-claim-hint", hidden: true }, r.search);
      const state = tried.has(r.id) && found.has(r.id) ? "proved" : "";
      return h("div", { class: `lab-claim ${state}` },
        h("div", { class: "lab-claim-pick" }, h("span", { class: "lab-task-mark", "aria-hidden": "true" }, state ? "✓" : i + 1), h("b", {}, r.rumor)),
        h("span", { class: "lab-claim-proof" }, `${found.has(r.id) ? `代码：${r.detail}` : "代码：还没找到"} · ${tried.has(r.id) ? "试过了，是真的" : "还没试"}`),
        !state && h("button", { class: "btn small ghost", type: "button", onclick: (e) => { onHint(); tip.hidden = false; e.currentTarget.remove(); } }, icon("bulb", { size: 13 }), "提示"),
        tip);
    }));
    paintPad();
    consoleBox.hidden = !devtools;
    licenseBox.replaceChildren("主进程里的 license：", h("code", {}, JSON.stringify(license)));
    fixBox.hidden = phase === "hunt";
    if (phase !== "hunt") {
      fixBox.replaceChildren(
        h("b", {}, phase === "done" ? "已发布的修复版" : "发布前的修复：每一处选「删除」或「保留」"),
        ...rumors.map((r) => h("div", { class: `lab-calc-patch ${removed.has(r.id) ? "removed" : ""}` },
          h("small", {}, r.file), h("code", {}, r.line),
          h("span", { class: "lab-sort-bins" },
            h("button", { type: "button", class: `lab-bin ${!removed.has(r.id) ? "picked" : ""}`, disabled: phase === "done", onclick: () => { removed.delete(r.id); render(); } }, "保留"),
            h("button", { type: "button", class: `lab-bin bad ${removed.has(r.id) ? "picked" : ""}`, disabled: phase === "done", onclick: () => { removed.add(r.id); render(); } }, "删除")))),
        phase === "fix" && h("button", { class: "btn primary", type: "button", onclick: applyPatch }, "修好了，重新发布并复查"));
    }
  }
  makeApp();
  boot();
  render();
  renderConsole();
  return root;
}

// ———————————————————————————— 种田存档：亲手改存档 ————————————————————————————

/**
 * 游戏读档时做的事（照着 samples/cases/farm-save/save.js 的 decodeSave）：
 * Base64 还原 → 拆出 { body, sum } → 用盐重算校验码比对 → 读出进度。每一步失败都如实说出来。
 */
export async function gameReadsSave(text, salt) {
  let outer;
  try {
    outer = JSON.parse(fromBase64(String(text)));
  } catch {
    return { ok: false, reason: "format", why: "游戏读不懂这个文件：存档要先整个用 Base64 编码回去才认。" };
  }
  if (typeof outer?.body !== "string" || typeof outer?.sum !== "string") return { ok: false, reason: "format", why: "格式不对：外面一层要有 body（进度）和 sum（校验码）。" };
  if ((await checksum(salt, outer.body)) !== outer.sum) return { ok: false, reason: "checksum", why: "校验码对不上——游戏弹出「存档被修改过，已重新开始」。" };
  let state;
  try {
    state = JSON.parse(outer.body);
  } catch {
    return { ok: false, reason: "format", why: "校验码对上了，可 body 里的进度不是合法的 JSON。" };
  }
  return { ok: true, state, why: "读档成功。" };
}

/** 发布出去的 save.js 里搜一个词（去掉开发者注释），最多 6 行。 */
export function searchSaveCode(code, query) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return code.split("\n").map((text, i) => ({ n: i + 1, text })).filter(({ text }) => text.trim() && !/^\s*\/\//.test(text) && words.every((w) => text.toLowerCase().includes(w))).slice(0, 6);
}

/** 开发者的两道选择：单机和联网，该不该防、怎么防。 */
export const SAVE_DEFENSE = [
  {
    id: "offline",
    scene: "「种田日记」是单机游戏，玩家改的是自己电脑上的存档。作为开发者，你会怎么做？",
    options: [
      { id: "hide", text: "把盐藏得更深，或者给存档加密", ok: false, why: "钥匙还是在游戏自己的代码里，看懂代码的人照样能解开。藏得再深也只是多费点时间。" },
      { id: "relax", text: "不用大费周章：玩家改的是自己的游戏", ok: true, why: "对。单机游戏里玩家给自己加金币，不影响任何人。校验码挡挡手滑改坏的就够了。" },
      { id: "server", text: "每次存档都传到服务器校验", ok: false, why: "能做，但单机游戏为这个去建服务器、要求联网，代价比收益大多了。" },
    ],
  },
  {
    id: "online",
    scene: "如果游戏加了联网排行榜，金币还能和别人交易呢？",
    options: [
      { id: "hide", text: "把盐藏得更深，或者给存档加密", ok: false, why: "只要校验是在玩家电脑上做的，就挡不住看懂代码的人。" },
      { id: "relax", text: "还是不用防", ok: false, why: "这回改金币会挤掉别人的排名、换走别人的东西，影响的是其他玩家。" },
      { id: "server", text: "金币记在服务器上，服务器说了算", ok: true, why: "对。重要的数据不能只在本地检查：放在服务器上，客户端只负责显示。" },
    ],
  },
];

function mountSave({ h, icon, lab, onMistake, onHint, onDone }) {
  const { sources } = lab;
  const code = sources["save.js"];
  const gameSalt = code.match(/const SAVE_SALT\s*=\s*"([^"]+)"/)?.[1] || "";
  const raw = sources["saves/slot1.sav"].trim();
  const target = 9999;
  let loads = 0;
  let phase = "edit"; // edit · defend · done
  let answered = {};
  const hints = [
    "存档是一长串字母和数字：先试试「Base64 还原」。",
    "还原后外面一层是 { v, body, sum }。body 里的 gold 就是金币；sum 是校验码。",
    "改完直接编码回去，游戏会发现校验码对不上。它是怎么算的？去代码里搜 checksum。",
    "校验码 = SHA-256( 盐 + body ) 的前 16 位。盐写在代码里：搜 SALT。",
  ];
  let hintAt = 0;

  const say = h("p", { class: "lab-say", role: "status" }, `朵朵：「帮我把金币改成 ${target} 吧！」下面是她的存档文件，工具随便用，顺序你自己定。`);
  const file = h("textarea", { class: "lab-save-file", spellcheck: "false", "aria-label": "存档文件内容", rows: 7 });
  file.value = raw;
  const farm = h("div", { class: "lab-farm" }, h("b", {}, "种田日记 · 读档"), h("p", {}, "还没读档。"));

  const setFile = (text, note) => {
    file.value = text;
    if (note) say.textContent = note;
  };
  function decode() {
    try {
      const text = fromBase64(file.value.trim());
      if (!/^[\x09\x0a\x0d\x20-\x7e -￿]*$/.test(text) || !text.trim()) throw new Error();
      setFile(text, "还原出来了：Base64 只是换一种写法，谁都能还原，它不是加密。");
    } catch {
      say.textContent = "这段内容不是 Base64（也许已经还原过了？）。";
    }
  }
  function encode() {
    setFile(toBase64(file.value), "编码回去了：存档文件又变成了一串字母。");
  }

  // 校验码计算器：盐 + body → SHA-256 的前 16 位，可以直接写进当前内容的 sum。
  const saltInput = h("input", { class: "lab-save-salt", type: "text", spellcheck: "false", placeholder: "盐（在代码里找）", "aria-label": "盐" });
  const sumOut = h("code", { class: "lab-save-sum" }, "——");
  async function calcSum() {
    let body;
    try {
      body = JSON.parse(file.value).body;
    } catch {
      say.textContent = "计算器要从当前内容里取 body：先把存档还原成 { v, body, sum } 的样子。";
      return null;
    }
    if (typeof body !== "string") {
      say.textContent = "当前内容里没有 body。";
      return null;
    }
    const sum = await checksum(saltInput.value, body);
    sumOut.textContent = sum;
    return sum;
  }
  async function writeSum() {
    const sum = await calcSum();
    if (!sum) return;
    const outer = JSON.parse(file.value);
    outer.sum = sum;
    setFile(JSON.stringify(outer), `把新算的校验码 ${sum} 写进了 sum。`);
  }

  async function load() {
    loads += 1;
    const res = await gameReadsSave(file.value.trim(), gameSalt);
    if (!res.ok) {
      // 第一次被游戏抓到是发现规则的一步，不算错；之后每次失败才算。
      if (loads > 1) onMistake();
      farm.className = "lab-farm bad";
      farm.replaceChildren(h("b", {}, "种田日记 · 读档"), h("p", {}, res.reason === "checksum" ? "「存档被修改过，已重新开始」 新农夫 · 第 1 天 · 金币 50" : "读档失败"));
      say.textContent = res.why;
      return;
    }
    farm.className = "lab-farm ok";
    farm.replaceChildren(h("b", {}, "种田日记 · 读档"), h("p", {}, `${res.state.player} · 第 ${res.state.day} 天 · 金币 ${res.state.gold}`));
    if (res.state.gold === target && phase === "edit") {
      phase = "defend";
      say.textContent = `读档成功，金币 ${target}！看懂了代码，就能做出游戏认可的存档。最后换你当开发者想一想。`;
      render();
    } else if (phase === "edit") {
      say.textContent = `游戏认了这个存档，金币是 ${res.state.gold}。朵朵想要的是 ${target}。`;
    }
  }

  // 代码搜索（save.js，去掉开发者注释）
  const searchInput = h("input", { class: "lab-address", placeholder: "在 save.js 里搜一个词，比如 checksum", spellcheck: "false", "aria-label": "搜索代码", onkeydown: (e) => e.key === "Enter" && search() });
  const hitsBox = h("div", { class: "lab-calc-hits" });
  function search() {
    const q = searchInput.value.trim();
    if (!q) return;
    const hits = searchSaveCode(code, q);
    hitsBox.replaceChildren(...(hits.length ? hits.map((hit) => h("p", { class: /SAVE_SALT\s*=|createHash/.test(hit.text) ? "hit rumor" : "hit" }, h("small", {}, `save.js:${hit.n}`), h("code", {}, hit.text.trim())))
      : [h("p", { class: "miss" }, /[一-鿿]/.test(q) ? "没找到。代码里的名字都是英文的。" : "没找到，换个词试试。")]));
  }

  const defendBox = h("div", { class: "lab-calc-fix", hidden: true });
  function renderDefend() {
    defendBox.hidden = phase === "edit";
    if (phase === "edit") return;
    defendBox.replaceChildren(h("b", {}, "换你当开发者"), ...SAVE_DEFENSE.map((q) => h("div", { class: "lab-save-q" },
      h("p", {}, q.scene),
      h("div", { class: "lab-choices" }, q.options.map((o) => h("button", {
        type: "button",
        class: `case-option ${answered[q.id] === o.id ? "picked" : ""}`,
        disabled: Boolean(answered[q.id]) && SAVE_DEFENSE.find((x) => x.id === q.id).options.find((x) => x.id === answered[q.id])?.ok,
        onclick: () => {
          answered[q.id] = o.id;
          say.textContent = o.why;
          if (!o.ok) onMistake();
          if (SAVE_DEFENSE.every((x) => x.options.find((y) => y.id === answered[x.id])?.ok) && phase !== "done") {
            phase = "done";
            say.textContent = "就是这样：本地的校验只挡得住手滑，挡不住看懂代码的人。单机随它去，联网的重要数据放服务器。";
            onDone();
          }
          renderDefend();
        },
      }, o.text))))));
  }

  const root = h("div", { class: "lab lab-save" },
    h("h4", {}, icon("wrench", { size: 18 }), "动手实验 · 存档编辑器"),
    h("p", { class: "lab-intro" }, `目标：让游戏读档以后，金币是 ${target}。工具都在这里，怎么做你自己决定；做不出来可以点「给个提示」。`),
    h("div", { class: "lab-save-bench" },
      h("div", { class: "lab-save-main" },
        h("b", {}, "存档文件 saves/slot1.sav"), file,
        h("div", { class: "lab-choices" },
          h("button", { class: "btn small", type: "button", onclick: decode }, "Base64 还原"),
          h("button", { class: "btn small", type: "button", onclick: encode }, "Base64 编码"),
          h("button", { class: "btn small ghost", type: "button", onclick: () => setFile(raw, "换回了朵朵原来的存档。") }, "换回原存档"),
          h("button", { class: "btn small primary", type: "button", onclick: load }, "让游戏读档")),
        farm),
      h("div", { class: "lab-side" },
        h("b", {}, "校验码计算器"),
        h("small", {}, "SHA-256( 盐 + 当前内容里的 body ) 的前 16 位"),
        saltInput,
        h("div", { class: "lab-choices" },
          h("button", { class: "btn small", type: "button", onclick: calcSum }, "算一下"),
          h("button", { class: "btn small", type: "button", onclick: writeSum }, "算好写进 sum")),
        sumOut,
        h("button", { class: "btn small ghost", type: "button", onclick: () => { onHint(); say.textContent = `提示 ${hintAt + 1}/${hints.length}：${hints[hintAt]}`; hintAt = Math.min(hintAt + 1, hints.length - 1); } }, icon("bulb", { size: 13 }), "给个提示"))),
    h("div", { class: "lab-calc-search" }, h("b", {}, "在游戏代码 save.js 里搜（发布版，没有开发者注释）"), h("div", { class: "lab-address-bar" }, searchInput, h("button", { class: "btn small", type: "button", onclick: search }, "搜索")), hitsBox),
    defendBox,
    say);
  function render() {
    renderDefend();
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
/**
 * 开灯用得上吗（王奶奶）：在沙盒里拿掉几项权限，按一下开灯，看灯亮不亮、监视器记下了什么。
 * 每条判断都要有实验撑腰；一次拿掉好几项省实验，灯不亮就得拆开排查（规则在 permission-lab.js）。
 */
function mountPermissions({ h, icon, lab, onMistake = () => {}, onHint = () => {}, onDone = () => {} }) {
  const exp = createPermissionLab(lab.permissions || []);
  const total = exp.perms.length;
  const hints = [
    "先别判：勾「拿掉」几项，按一下开灯，看灯亮不亮。",
    "拿掉它灯还亮，就说明开灯用不上它。可以一次拿掉好几项，一次实验就能排除一串。",
    "灯不亮了？说明拿掉的里面有开灯要用的。把它们分开，一项一项再试——这叫控制变量。",
    "「开机自启」按开灯是看不出来的：重启一次手机试试。",
  ];
  let hintAt = 0;
  const say = h("p", { class: "lab-say", role: "status" }, "王奶奶想知道：「拒绝它，灯还亮不亮？」别猜，在沙盒里试：勾掉几项权限，按一下开灯。");
  const count = h("b", { class: "lab-count" });
  const lamp = h("span", { class: "lab-pl-lamp", "aria-hidden": "true" });
  const monitor = h("div", { class: "lab-pl-log" });
  const list = h("div", { class: "lab-perms lab-pl" });

  function paint() {
    count.textContent = `判好 ${exp.state.verdicts.size}/${total} · 实验 ${exp.state.runs.length} 次`;
    list.replaceChildren(...exp.perms.map((p) => {
      const verdict = exp.state.verdicts.get(p.id);
      const judged = verdict !== undefined;
      const denied = exp.state.denied.has(p.id);
      return h("div", { class: cls(["lab-perm", judged && "done", denied && "denied"]), "data-perm": p.id },
        h("label", { class: "lab-pl-toggle" }, h("input", { type: "checkbox", checked: denied, onchange: () => { exp.toggle(p.id); paint(); } }), "拿掉"),
        h("span", { class: "lab-perm-name" }, p.label, exp.state.seenUse.has(p.id) && p.use ? h("small", {}, `它拿去：${p.use}`) : null),
        judged
          ? h("span", { class: cls(["lab-pl-verdict", verdict ? "need" : "free"]) }, verdict ? "开灯要用" : "开灯用不上")
          : h("span", { class: "lab-pl-picks" },
            h("button", { class: "lab-perm-pick", type: "button", onclick: () => judge(p, true) }, "开灯要用"),
            h("button", { class: "lab-perm-pick", type: "button", onclick: () => judge(p, false) }, "开灯用不上")));
    }));
  }

  function run(kind) {
    const r = exp.run(kind);
    if (kind === "tap") lamp.className = cls(["lab-pl-lamp", r.lit ? "on" : "off"]);
    const what = r.denied.length ? `拿掉 ${r.denied.map((id) => exp.find(id).label).join("、")}` : "什么都没拿掉";
    monitor.prepend(h("div", { class: cls(["lab-pl-run", r.lit === false && "fail"]) },
      h("b", {}, `#${r.n} ${kind === "tap" ? "按一下开灯" : "重启手机"} · ${what}`), ...r.lines.map((line) => h("p", {}, line))));
    say.textContent = kind === "reboot" ? "重启完了：看监视器，开机时谁自己醒了。"
      : r.lit ? (r.denied.length ? `灯亮了：拿掉的这 ${r.denied.length} 项，开灯一个都用不上。` : "灯亮了。这是对照：什么都不拿掉时的样子。")
        : "灯不亮了：拿掉的里面有开灯要用的。把它们分开再试。";
    paint();
  }

  function judge(p, need) {
    const res = exp.judge(p.id, need);
    if (!res) return;
    if (res.ok) {
      say.textContent = `${p.label}：${res.why || "判对了。"}（证据：实验 #${res.proof.n}）`;
      if (exp.state.done) {
        const needed = exp.perms.filter((x) => x.need).length;
        say.textContent = `七个里头，只有 ${needed} 个是真的在开灯。用了 ${exp.tapRuns()} 次开灯实验${exp.tapRuns() <= 4 ? "，控制变量用得漂亮" : ""}。王奶奶：「那剩下的，我点拒绝就好了。」`;
        onDone();
      }
    } else {
      if (!res.noProof) onMistake();
      say.textContent = res.why;
    }
    paint();
  }

  paint();
  return h("div", { class: "lab lab-permissions" },
    h("div", { class: "lab-head" }, h("b", {}, lab.permTitle || lab.sampleTitle || "开灯用得上吗"), count,
      h("button", { class: "btn small ghost", type: "button", onclick: () => { onHint(); say.textContent = `提示 ${hintAt + 1}/${hints.length}：${hints[hintAt]}`; hintAt = (hintAt + 1) % hints.length; } }, icon("bulb", { size: 13 }), "给个提示")),
    h("p", { class: "lab-lamp" }, icon("scan", { size: 14 }), lab.lampLabel || "这个 App 只有一件事：按一下，灯亮。"),
    h("div", { class: "lab-pl-phone" }, lamp,
      h("button", { class: "btn primary", type: "button", onclick: () => run("tap") }, "按一下开灯"),
      h("button", { class: "btn", type: "button", onclick: () => run("reboot") }, "重启手机"),
      h("small", {}, "沙盒里的「王奶奶的手机」：拿掉的权限，App 这次就拿不到。")),
    list, say, h("b", { class: "lab-pl-title" }, "行为监视器"), monitor);
}

/** 一关故意失败的实验：程序在沙盒里跑不起来，什么都没抓到。失败本身是证据。 */
function mountPacked({ h, icon, lab, onDone = () => {} }) {
  let recorded = false;
  const log = [
    "rea:~$ sandbox run bundle.js",
    "> 加载 48 KB 的 bundle …",
    "> [!] 检测到调试器（ptrace 探测成功）",
    "> 进程退出，退出码 0x80070005",
    "> 网络记录：0 条",
  ].join("\n");
  const button = h("button", { class: "btn primary", type: "button", onclick: () => {
    if (recorded) return;
    recorded = true;
    button.disabled = true;
    button.textContent = "已记下";
    onDone();
  } }, "记下这次失败");
  return h("div", { class: "mini mini-packed" },
    h("h4", {}, lab.packedTitle || lab.sampleTitle || "沙盒实验"),
    h("p", { class: "lab-lamp" }, icon("scan", { size: 14 }), "把样本放进沙盒跑一遍，看它到底做了什么。"),
    h("pre", { class: "pz-code" }, log),
    h("p", { class: "lab-note" }, lab.failNote || "它没给我们任何结果。不是因为它干净，而是因为它跑不起来。"),
    h("div", { class: "case-actions" }, button));
}

const MOUNTS = { network: mountNetwork, calculator: mountCalculator, save: mountSave, secrets: mountSecrets, permissions: mountPermissions,
  rhythm: mountRhythm, tower: mountTower, pipes: mountPipes, manage: mountManage, cards: mountCards, mines: mountMines, packed: mountPacked };
/** Every kind a case's lab (or one of its chained stages) can name. */
export const MOUNTABLE_KINDS = Object.keys(MOUNTS);

/**
 * The lab for a case's `game.lab` ({ kind, files, sources }): an element that calls onMistake / onHint
 * as the player slips, and onDone once when everything is done; then shows a button for onFinish.
 *
 * A case can chain several labs in `lab.stages` ([{ kind, title, intro, outro, ...that lab's data }]):
 * they run one after another on the same laptop, with story lines between them (story(lines) shows the
 * game's dialogue box over the case screen and resolves when it is clicked away). Each lab gets
 * story() too, to talk between its own rounds, and the player's difficulty (easy · normal · hard).
 * startAt / onStage(i) let the case resume a chain at the stage the player reached.
 */
export function mountLab({ h, icon, lab, onMistake = () => {}, onHint = () => {}, onDone = () => {}, onFinish, finishLabel = "去结案", story = async () => {}, difficulty = "normal", startAt = 0, onStage = () => {} }) {
  const stages = lab.stages?.length ? lab.stages : [{ kind: lab.kind }];
  for (const stage of stages) if (!MOUNTS[stage.kind]) throw new Error(`没有这种实验：${stage.kind}`);
  const footer = h("div", { class: "case-actions lab-finish", hidden: true }, h("button", { class: "btn primary", type: "button", onclick: () => onFinish?.() }, finishLabel, icon("arrow", { size: 14 })));
  const steps = h("ol", { class: "lab-stages", hidden: stages.length < 2, "aria-label": "实验进度" });
  const slot = h("div", { class: "lab-stage-slot" });
  const paintSteps = (at, done) => steps.replaceChildren(...stages.map((stage, i) => h("li", { class: i < at || done ? "done" : i === at ? "on" : "" }, stage.title || `实验 ${i + 1}`)));
  function mountStage(i) {
    const stage = stages[i];
    onStage(i);
    paintSteps(i, false);
    let finished = false;
    const stageDone = async () => {
      if (finished) return;
      finished = true;
      await story(stage.outro || []);
      if (i + 1 < stages.length) {
        await story(stages[i + 1].intro || []);
        return mountStage(i + 1);
      }
      paintSteps(stages.length, true);
      footer.hidden = false;
      onDone();
    };
    // ?debug: window.__labSkip() finishes the stage on screen, to test what comes after it.
    if (typeof location !== "undefined" && /[?&]debug/.test(location.search)) window.__labSkip = stageDone;
    slot.replaceChildren(MOUNTS[stage.kind]({ h, icon, lab: { ...lab, ...stage }, onMistake, onHint, story, difficulty, onDone: stageDone }));
  }
  const first = Math.max(0, Math.min(stages.length - 1, startAt | 0));
  mountStage(first);
  // The first stage's lead-in plays once the laptop is open (the element has to be on screen first).
  if (stages[first].intro?.length) setTimeout(() => story(stages[first].intro), 60);
  return h("div", { class: "lab-wrap" }, steps, slot, footer);
}
