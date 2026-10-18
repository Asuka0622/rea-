// 节奏 · 防火墙值班（小林的小账本）。判定引擎是另一个会话写的（rhythm-engine.js 的 createRhythmRun）；
// 2026-10-19 小克把画面改成正式流程里的三轮值班：每轮一张谱面，轮与轮之间由 story() 插剧情对话，
// 第二轮起小克（AI 助手）在请求上标出它的建议——它只会看节奏，第三轮就开始说错。
// 美术需求见 docs/art/briefs/rhythm-beacon.md；现在全是代码画的占位。
import { makeChart, createRhythmRun, FIREWALL_ROUNDS, FIREWALL_LEVELS, makeFirewallRound, firewallPassed } from "./rhythm-engine.js";

if (typeof document !== "undefined" && !document.querySelector("link[data-rhythm-style]")) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/rhythm-game.css";
  link.dataset.rhythmStyle = "true";
  document.head.append(link);
}

const GRADE = { perfect: "PERFECT", great: "GREAT", good: "GOOD", wrong: "认错了", miss: "漏了", empty: "空按" };
const shortHost = (host) => host.replace(/\.example$/, "").replace(/^(api|collect)\./, "");

export function mountRhythm({ h, icon, lab, onMistake = () => {}, onHint = () => {}, onDone = () => {}, story = async () => {}, difficulty = "normal" }) {
  const level = FIREWALL_LEVELS[difficulty] || FIREWALL_LEVELS.normal;
  // 每轮的剧情台词在案例数据里（lab.firewall.rounds[i]：intro / pass / fail / tip），规则在引擎里。
  const legacy = lab.rhythm?.notes?.length;
  const rounds = legacy
    ? [{ id: "custom", title: "定时上报", chart: makeChart(lab.rhythm) }]
    : FIREWALL_ROUNDS.map((round, i) => ({ ...round, ...(lab.firewall?.rounds?.[i] || {}), chart: makeFirewallRound(round) }));
  let at = 0;
  let chart = rounds[0].chart;
  let run = createRhythmRun(chart, level.mode);
  let state = "ready"; // ready · playing · paused · between · done
  let origin = 0;
  let elapsed = 0;
  let raf = 0;
  let audio = null;
  let silent = false;
  let nextBeat = 0;
  let noteEls = [];

  const roundLabel = h("span", { class: "rh3-round" });
  const status = h("div", { class: "rh2-score" });
  const meter = h("progress", { max: 1, value: 0, "aria-label": "这一轮的进度" });
  const feedback = h("div", { class: "rh2-feedback", "aria-live": "off" }, "准备");
  const track = h("div", { class: "rh2-track one" }, h("span", {}, "小账本发出的请求 ↓"));
  const lanes = h("div", { class: "rh2-highway beacon", "aria-label": "收到的请求" }, track, h("div", { class: "rh2-judge-line" }), feedback);
  const xiaoke = h("div", { class: "rh3-xiaoke", hidden: true }, h("span", { class: "rh3-xiaoke-face", "aria-hidden": "true" }), h("p", {}, ""));
  const message = h("p", { class: "rh2-message", role: "status" });
  const start = h("button", { class: "btn primary", type: "button", onclick: () => begin() }, "开始");
  const pause = h("button", { class: "btn", type: "button", disabled: true, onclick: () => (state === "paused" ? resume() : hold()) }, "暂停");
  const speed = h("select", { "aria-label": "落速" }, ...[[2400, "慢"], [1800, "中"], [1500, "快"]].map(([v, t]) => h("option", { value: v, selected: v === level.approach }, t)));
  const offset = h("input", { type: "number", min: -150, max: 150, step: 10, value: 0, "aria-label": "时差校准（毫秒）" });
  const mute = h("button", { class: "btn small", type: "button", onclick: () => { silent = !silent; mute.textContent = silent ? "声音：关" : "声音：开"; if (silent) hush(); } }, "声音：开");
  const key = (kind, letter, label) => h("button", {
    type: "button", class: `rh2-key ${kind}`,
    onpointerdown: (e) => { if (e.pointerType === "mouse" && e.button !== 0) return; e.preventDefault(); press(kind); },
    onclick: (e) => { if (e.detail === 0) press(kind); },
  }, h("kbd", {}, letter), label);

  const root = h("section", { class: "mini mini-rhythm rh2 rh3", tabindex: 0, "aria-label": "防火墙值班" },
    h("header", { class: "rh2-head" },
      h("div", {}, h("h3", {}, "防火墙值班"), roundLabel),
      h("button", { class: "btn small", type: "button", onclick: () => tip() }, icon("bulb", { size: 13 }), "给个提示")),
    status, meter,
    h("div", { class: "rh3-stage" }, lanes, xiaoke),
    h("div", { class: "rh2-keys" }, key("sync", "D", "放行 · 是你点的"), key("upload", "F", "拦截 · 程序自己发的")),
    h("div", { class: "rh2-controls" }, start, pause,
      h("details", { class: "rh3-settings" }, h("summary", {}, "设置"), h("label", {}, "落速 ", speed), h("label", {}, "时差(ms) ", offset), mute)),
    message);

  /* ----- a round ----- */
  const say = (text) => { xiaoke.querySelector("p").textContent = text; };
  function load(i) {
    at = i;
    const round = rounds[i];
    chart = round.chart;
    run = createRhythmRun(chart, level.mode);
    for (const el of noteEls) el.remove();
    noteEls = run.notes.map((n) => {
      const el = h("div", { class: `rh2-note neutral${n.showHost ? " labelled" : ""}`, "aria-hidden": "true", hidden: true },
        n.showHost ? `→ ${shortHost(n.host)}` : "请求",
        ...(n.hint ? [h("small", { class: "rh3-hint" }, `小克：${n.hint === "upload" ? "拦" : "放"}`)] : []));
      lanes.append(el);
      return el;
    });
    roundLabel.textContent = rounds.length > 1 ? `第 ${i + 1} / ${rounds.length} 轮 · ${round.title}` : round.title;
    xiaoke.hidden = !round.xiaoke;
    say(round.xiaoke ? "我帮你盯着！每个请求上都标了我的判断。" : "");
    state = "ready";
    elapsed = 0;
    meter.value = 0;
    feedback.textContent = "准备";
    delete feedback.dataset.grade;
    start.disabled = false;
    start.textContent = i === 0 ? "开始值班" : `开始第 ${i + 1} 轮`;
    pause.disabled = true;
    pause.textContent = "暂停";
    message.textContent = round.tip || "请求落到白线时：你自己点的同步按 D 放行，程序自己定时发的按 F 拦截。";
    paint();
  }
  function paint() {
    const s = run.summary();
    status.replaceChildren(h("b", {}, `${String(s.combo).padStart(2, "0")} COMBO`), h("span", {}, `准确率 ${s.accuracy.toFixed(0)}%（过关 ${level.pass}%）`), h("span", {}, `漏 ${s.counts.miss} · 认错 ${s.counts.wrong + s.strays}`));
  }

  /* ----- sound: a metronome and a bass line, scheduled ahead on the audio clock ----- */
  const clock = () => (audio ? audio.currentTime * 1000 : performance.now());
  const now = () => (state === "playing" ? clock() - origin : elapsed);
  const voices = new Set();
  function hush() { for (const v of voices) { try { v.stop(); } catch {} } voices.clear(); }
  function tone(when, freq, length, volume, type = "sine") {
    if (!audio || silent) return;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(volume, when + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + length);
    osc.connect(gain).connect(audio.destination);
    osc.start(when);
    osc.stop(when + length + 0.02);
    voices.add(osc);
    osc.onended = () => voices.delete(osc);
  }
  function schedule() {
    if (!audio) return;
    const last = chart.notes.at(-1).at;
    while (nextBeat * chart.beat < now() + 120 && nextBeat * chart.beat <= last + chart.beat) {
      const when = (origin + nextBeat * chart.beat) / 1000;
      if (when >= audio.currentTime) {
        tone(when, nextBeat % 4 === 0 ? 880 : 440, 0.045, nextBeat % 4 === 0 ? 0.065 : 0.035, "triangle");
        if (nextBeat >= 4) {
          tone(when, [130.81, 164.81, 196, 146.83][Math.floor(nextBeat / 4) % 4], 0.21, 0.045);
          tone(when, nextBeat % 2 === 0 ? 65.4 : 98, 0.1, 0.04);
        }
      }
      nextBeat += 1;
    }
  }

  /* ----- playing ----- */
  async function begin() {
    if (state === "paused") return resume();
    if (state !== "ready") return;
    start.disabled = true;
    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (Context) {
        audio ||= new Context();
        await audio.resume();
      }
    } catch {
      message.textContent = "声音暂时放不出来，跟着白线也能玩。";
    }
    run = createRhythmRun(chart, level.mode);
    origin = clock();
    nextBeat = 0;
    state = "playing";
    start.textContent = "值班中";
    pause.disabled = false;
    root.focus({ preventScroll: true });
    raf = requestAnimationFrame(frame);
  }
  function hold() {
    if (state !== "playing") return;
    elapsed = now();
    state = "paused";
    cancelAnimationFrame(raf);
    hush();
    pause.textContent = "继续";
    feedback.textContent = "暂停";
  }
  function resume() {
    if (state !== "paused") return;
    origin = clock() - elapsed;
    nextBeat = Math.ceil(elapsed / chart.beat);
    state = "playing";
    pause.textContent = "暂停";
    root.focus({ preventScroll: true });
    raf = requestAnimationFrame(frame);
  }
  const shift = () => Math.max(-150, Math.min(150, Number(offset.value) || 0));
  function press(kind) {
    if (state !== "playing" || now() < chart.notes[0].at - 350) return;
    const t = now() - shift();
    for (const j of run.expire(t)) show(j);
    show(run.press(kind, t));
    paint();
  }
  function show(j) {
    feedback.dataset.grade = j.result;
    feedback.textContent = GRADE[j.result] + (j.error == null ? "" : ` · ${j.error < 0 ? "早" : "晚"} ${Math.abs(Math.round(j.error))}ms`);
    lanes.dataset.flash = j.kind;
    const note = run.notes.find((n) => n.id === j.id);
    if (j.result === "wrong") {
      feedback.textContent = j.kind === "sync" ? "认错了：这是程序定时发的" : "认错了：这是你自己点的同步";
      if (note?.hint && note.hint !== note.kind) say(note.kind === "upload" ? "咦……我说「放」的那个，其实发往 quiet-stats？" : "啊，我说「拦」的那个，是去 ledger-sync 的同步……");
    } else if (j.result === "miss") {
      feedback.textContent = j.kind === "upload" ? "漏了：这条上传发出去了" : "漏了：你的同步没放行";
    } else if (j.result !== "empty" && audio) tone(audio.currentTime, j.kind === "sync" ? 660 : 990, 0.06, 0.035);
  }
  function frame() {
    if (state !== "playing") return;
    if (!root.isConnected) return hold();
    const t = now();
    const judge = t - shift();
    const approach = Number(speed.value);
    for (const n of run.notes) {
      const el = noteEls[n.id];
      const y = 82 - ((n.at - judge) / approach) * 82;
      el.hidden = Boolean(n.result) || y < -5 || y > 100;
      el.style.transform = `translateY(-50%) translateY(${(lanes.clientHeight * y) / 100}px)`;
    }
    for (const j of run.expire(judge)) show(j);
    schedule();
    lanes.style.setProperty("--beat-opacity", String(Math.max(0, 0.12 - ((t % chart.beat) / chart.beat) * 0.12)));
    if (t < chart.notes[0].at - 220) feedback.textContent = String(Math.max(1, Math.ceil((chart.notes[0].at - t) / chart.beat)));
    meter.value = Math.min(1, t / (chart.notes.at(-1).at + run.windows[2]));
    paint();
    if (run.summary().done) return end();
    raf = requestAnimationFrame(frame);
  }

  /* ----- between rounds: the story talks, then the next round (or a retry) is ready ----- */
  async function end() {
    state = "between";
    hush();
    pause.disabled = true;
    for (const el of noteEls) el.hidden = true;
    const s = run.summary();
    const round = rounds[at];
    const passed = legacy ? s.passed : firewallPassed(run, difficulty);
    message.textContent = `这一轮：准确率 ${s.finalAccuracy.toFixed(0)}% · 最高连击 ${s.best} · 漏 ${s.counts.miss} · 认错 ${s.counts.wrong + s.strays}`;
    if (!passed) {
      onMistake();
      await story(round.fail || [{ text: `准确率要到 ${level.pass}% 才算守住。再来一次：先听节拍器，准点来的就是它。`, face: "thinking" }]);
      return load(at);
    }
    await story(round.pass || []);
    if (at + 1 >= rounds.length) {
      state = "done";
      start.disabled = true;
      start.textContent = "值班结束";
      message.textContent = "值班结束：时间规律和目的地，两个都要看——这就是安全分析里的「信标检测」。";
      return onDone();
    }
    await story(rounds[at + 1].intro || []);
    load(at + 1);
  }
  function tip() {
    onHint();
    message.textContent = rounds[at].showHost
      ? "上传加了抖动，听节奏靠不住了。看每个请求发往哪里：ledger-sync 是同步，quiet-stats 是它偷偷发的。小克的标签也别全信。"
      : "程序的上传像节拍器，每 4 拍准时一次（重拍那一下）。不在节拍上的，是你自己点的同步。";
  }

  function onKey(e) {
    if (!root.isConnected || e.repeat || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if ((k === "d" || k === "f") && state === "playing") {
      e.preventDefault();
      e.stopPropagation();
      press(k === "d" ? "sync" : "upload");
    }
    if (e.key === "Escape" && state === "playing") {
      e.preventDefault();
      e.stopPropagation();
      hold();
    }
  }
  // 合上电脑（游戏被摘下来）或切走页面就暂停；case-session 会留着这一关，重新打开电脑还能接着玩。
  const onHide = () => document.hidden && hold();
  document.addEventListener("keydown", onKey, true);
  document.addEventListener("visibilitychange", onHide);
  if (typeof location !== "undefined" && /[?&]debug/.test(location.search)) window.__rhythm = { run: () => run, round: () => at, state: () => state, press, end };
  load(0);
  return root;
}
