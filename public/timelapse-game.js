// 延时实验（周姐的随手便签）：在沙盒里装 1.0 或 1.1，快进一天，从行为监视器里挑记录证明四件事。
// 规则在 timelapse-lab.js；画面沿用行为监视器（小林案）的样式。证明一件事时委托人说一句（lab.talk）。
import { createTimelapse, timelapseProves, TIMELAPSE_CLAIMS, clockText } from "./timelapse-lab.js";

export function mountTimelapse({ h, icon, lab, onMistake = () => {}, onHint = () => {}, onDone = () => {}, story = async () => {} }) {
  const sim = createTimelapse();
  const claims = TIMELAPSE_CLAIMS.map((c) => ({ ...c, ...lab.timelapseTasks?.[c.id] }));
  const proofs = new Map();
  let selected = claims[0].id;
  let finished = false;

  const say = h("p", { class: "lab-say", role: "status" }, "先装一个版本。两台都可以装，一次装一台：装上以后时钟从早上 9:00 开始走，快进多久你自己定。");
  const claimsBox = h("div", { class: "lab-claims" });
  const pcBox = h("div", { class: "lab-pc lab-tl-pc" });
  const monitorBox = h("div", { class: "lab-monitor" });

  const describe = (row) => (row.kind === "capture" ? `${row.text}${row.count > 1 ? ` ×${row.count}（到 ${row.to}，内存里攒着 ${row.pending} 张）` : `（内存里攒着 ${row.pending} 张）`}` : row.text);
  const kindLabel = { boot: "系统", capture: "截屏", net: "网络", quiet: "总结", note: "操作", export: "操作" };

  function install(version) {
    sim.install(version);
    say.textContent = version === "1.1" ? "装上了 1.1。什么都不点，先快进一会儿看看。" : "装上了 1.0（旧版本）。它是这次实验的对照。";
    render();
  }
  function advance(minutes, label) {
    if (!sim.state.version) {
      say.textContent = "还没装任何版本。";
      return;
    }
    const rows = sim.advance(minutes);
    say.textContent = `${label}：现在 ${clockText(sim.state.now)}。${rows.length ? `监视器里多了 ${rows.length} 条记录。` : "这段时间里，它什么都没做。"}`;
    if (sim.state.now >= 24 * 60) say.textContent += " 一天结束了：要再看一遍，就重新装一次。";
    render();
  }
  function act(what) {
    if (!sim.state.version) {
      say.textContent = "还没装任何版本。";
      return;
    }
    const row = sim.act(what);
    say.textContent = row.text;
    render();
  }

  async function pin(row) {
    if (finished || !selected) return;
    const claim = claims.find((c) => c.id === selected);
    const res = timelapseProves(selected, row);
    if (!res.ok) {
      onMistake();
      say.textContent = `这条证明不了「${claim.text}」：${res.why}`;
      return render();
    }
    proofs.set(claim.id, row);
    say.textContent = `证明了「${claim.text}」：${res.why}`;
    selected = claims.find((c) => !proofs.has(c.id))?.id || null;
    const done = proofs.size === claims.length;
    if (done) {
      finished = true;
      say.textContent = "四件事都证明了：1.1 每 10 分钟悄悄截一次屏，攒到半夜 23:58 一起送走，还删掉了导出；同样跑一天，1.0 什么都没发。";
    }
    render();
    await story(lab.talk?.[claim.id] || []);
    if (done) onDone();
  }

  function render() {
    claimsBox.replaceChildren(...claims.map((c, i) => {
      const proof = proofs.get(c.id);
      const tip = h("small", { class: "lab-claim-hint", hidden: true }, c.hint);
      return h("div", { class: `lab-claim ${proof ? "proved" : ""} ${selected === c.id ? "selected" : ""}` },
        h("button", { type: "button", class: "lab-claim-pick", disabled: Boolean(proof) || finished, onclick: () => {
          selected = selected === c.id ? null : c.id;
          say.textContent = selected ? `去监视器里点一条记录，钉给「${c.text}」。` : "";
          render();
        } }, h("span", { class: "lab-task-mark", "aria-hidden": "true" }, proof ? "✓" : i + 1), h("b", {}, c.text)),
        proof ? h("span", { class: "lab-claim-proof" }, `证据：${proof.version} · ${proof.at} · ${describe(proof)}`)
          : h("button", { class: "btn small ghost", type: "button", onclick: (e) => { onHint(); tip.hidden = false; e.currentTarget.remove(); } }, icon("bulb", { size: 13 }), "提示"),
        tip);
    }));
    const v = sim.state.version;
    pcBox.replaceChildren(
      h("b", {}, "沙盒里的电脑"),
      h("div", { class: "lab-choices" },
        h("button", { class: `btn small ${v === "1.0" ? "primary" : ""}`, type: "button", onclick: () => install("1.0") }, "装 1.0（旧版）"),
        h("button", { class: `btn small ${v === "1.1" ? "primary" : ""}`, type: "button", onclick: () => install("1.1") }, "装 1.1（新版）")),
      h("p", { class: "lab-pc-clock lab-tl-clock" }, v ? `随手便签 ${v} · 沙盒时间 ${clockText(sim.state.now)}` : "还没装"),
      h("div", { class: "lab-choices" },
        h("button", { class: "btn small", type: "button", onclick: () => act("note") }, "写一张便签"),
        h("button", { class: "btn small", type: "button", onclick: () => act("export") }, "导出为文本")),
      h("div", { class: "lab-choices" },
        h("button", { class: "btn small", type: "button", onclick: () => advance(1, "快进 1 分钟") }, "+1 分钟"),
        h("button", { class: "btn small", type: "button", onclick: () => advance(10, "快进 10 分钟") }, "+10 分钟"),
        h("button", { class: "btn small", type: "button", onclick: () => advance(60, "快进 1 小时") }, "+1 小时"),
        h("button", { class: "btn small", type: "button", onclick: () => advance(Math.max(0, 23 * 60 + 50 - sim.state.now), "快进到 23:50") }, "快进到 23:50")));
    const rows = sim.state.log.length
      ? h("ul", { class: "lab-log" }, sim.state.log.map((row) => {
        const usedFor = [...proofs].filter(([, r]) => r.id === row.id);
        return h("li", { class: `${row.kind === "net" ? "net" : row.kind === "capture" ? "clip" : ""} ${usedFor.length ? "pinned" : ""} ${selected ? "pickable" : ""}` },
          h("button", { type: "button", class: "lab-log-row", onclick: () => pin(row) },
            h("small", {}, `${row.version} · ${row.at}`),
            h("span", { class: "lab-log-kind" }, kindLabel[row.kind] || "记录"),
            h("span", {}, describe(row))),
          usedFor.length > 0 && h("span", { class: "lab-tag bad" }, "已作证"));
      }))
      : h("p", { class: "lab-empty" }, "还没有记录。先装一个版本。");
    monitorBox.replaceChildren(h("b", {}, icon("scan", { size: 14 }), " 行为监视器", selected ? ` · 点一条记录钉给「${claims.find((c) => c.id === selected)?.text}」` : ""), rows);
  }

  const root = h("div", { class: "lab lab-network lab-timelapse" },
    h("h4", {}, icon("scan", { size: 18 }), "动手实验 · 快进一天"),
    h("p", { class: "lab-intro" }, "下面四件事，每一件都要从监视器里挑一条记录当证据。装哪个版本、快进多久、什么时候点什么，你自己定。（沙盒里的网是假的，什么都发不出去。）"),
    claimsBox,
    h("div", { class: "lab-bench" }, pcBox),
    monitorBox,
    say);
  if (typeof location !== "undefined" && /[?&]debug/.test(location.search)) window.__timelapse = { sim, pin };
  render();
  return root;
}
