// 谁说了算：朵朵的种田日记出联网版，玩家当开发者，把每样数据分到「本地」或「服务器」，然后上线一周看结果。
// 规则在 authority-engine.js；轮与轮之间的剧情在案例数据里（lab.authority.rounds[i]：intro / pass / fail）。
// 美术需求见 docs/art/briefs/farm-authority.md；现在是代码画的占位。
import { AUTHORITY_ITEMS, AUTHORITY_ROUNDS, AUTHORITY_LEVELS, simulateWeek, serverSlots } from "./authority-engine.js";
import { cls, miniHead } from "./mini-art.js";

if (typeof document !== "undefined" && !document.querySelector("link[data-authority-style]")) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/authority-game.css";
  link.dataset.authorityStyle = "true";
  document.head.append(link);
}

const HINTS = [
  "只问一个问题：改了它，会不会影响别的玩家？会，就交给服务器；只影响自己，就留在本地。",
  "放服务器不是越多越好：每样都要联网、要花服务器的钱。只影响自己的东西放上去，玩家会嫌卡。",
  "排行榜、交易、好友：这些都牵扯到别人。金币和收成会变成排行榜上的数字，也牵扯到别人。",
];

export function mountAuthority({ h, icon, lab, onMistake = () => {}, onHint = () => {}, onDone = () => {}, story = async () => {}, difficulty = "normal" }) {
  const level = AUTHORITY_LEVELS[difficulty] || AUTHORITY_LEVELS.normal;
  const rounds = AUTHORITY_ROUNDS.map((round, i) => ({ ...round, ...(lab.authority?.rounds?.[i] || {}) }));
  const placement = {};
  let at = 0;
  let busy = false;
  let finished = false;
  let hintAt = 0;

  const roundLabel = h("span", { class: "au-round" });
  const say = h("p", { class: "mini-say", role: "status" });
  const pool = h("div", { class: "au-pool" });
  const local = h("div", { class: "au-col local" });
  const server = h("div", { class: "au-col server" });
  const slots = h("span", { class: "au-slots" });
  const report = h("div", { class: "au-report", hidden: true });
  const launch = h("button", { class: "btn primary", type: "button", onclick: () => week() }, icon("arrow", { size: 14 }), "上线一周看看");

  const current = () => rounds[at].items;
  const usedSlots = () => Object.values(placement).filter((v) => v === "server").length;
  function place(id, where) {
    if (busy) return;
    if (where === "server" && level.slots && placement[id] !== "server" && usedSlots() >= serverSlots(at)) {
      say.textContent = `服务器名额只有 ${serverSlots(at)} 个：先想清楚哪些真的非放不可。`;
      return;
    }
    if (where) placement[id] = where;
    else delete placement[id];
    report.hidden = true;
    paint();
  }
  function card(id) {
    const item = AUTHORITY_ITEMS[id];
    const where = placement[id];
    const locked = finished || !current().includes(id);
    return h("div", { class: cls(["au-card", where, locked && "locked"]) },
      h("b", {}, item.label),
      ...(level.tags ? [h("small", { class: cls(["au-tag", item.affects && "others"]) }, item.tag)] : []),
      ...(locked ? [] : [h("div", { class: "au-moves" },
        ...(where !== "local" ? [h("button", { class: "btn small", type: "button", onclick: () => place(id, "local") }, "放本地")] : []),
        ...(where !== "server" ? [h("button", { class: "btn small", type: "button", onclick: () => place(id, "server") }, "放服务器")] : []),
        ...(where ? [h("button", { class: "btn small ghost", type: "button", onclick: () => place(id, null) }, "撤回")] : []))]));
  }
  function paint() {
    const seen = rounds.slice(0, at + 1).flatMap((r) => r.items);
    pool.replaceChildren(...current().filter((id) => !placement[id]).map(card));
    pool.hidden = !pool.childElementCount;
    local.replaceChildren(h("b", {}, "本地 · 玩家电脑上"), h("small", {}, "玩家说了算：快、断网也能用，但谁都能改"), ...seen.filter((id) => placement[id] === "local").map(card));
    server.replaceChildren(h("b", {}, "服务器 · 服务器说了算"), h("small", {}, "改不了，但每样都要联网、要花钱"), ...seen.filter((id) => placement[id] === "server").map(card));
    slots.textContent = level.slots ? `服务器名额 ${usedSlots()} / ${serverSlots(at)}` : "";
    launch.disabled = busy || current().some((id) => !placement[id]);
    roundLabel.textContent = `第 ${at + 1} / ${rounds.length} 周 · ${rounds[at].title}`;
  }

  async function week() {
    if (busy) return;
    busy = true;
    paint();
    const res = simulateWeek(at, placement, difficulty);
    const mark = { ok: "✓", exploited: "✗ 被改爆", wasted: "⚠ 白花钱", unset: "？" };
    report.hidden = false;
    report.replaceChildren(h("b", {}, `上线一周：被改爆 ${res.exploited} 样 · 白花钱 ${res.wasted} 样`),
      ...res.report.filter((r) => r.result !== "ok" || current().includes(r.id)).map((r) => h("p", { class: r.result }, h("span", {}, mark[r.result]), h("strong", {}, r.label), " ", r.text)));
    const round = rounds[at];
    if (!res.passed) {
      onMistake();
      say.textContent = res.exploited ? "有人钻了空子。看看被改爆的那几样：改了它，影响的是谁？" : "没人作弊，可玩家都在抱怨卡：只影响自己的东西，用不着服务器。";
      await story(round.fail || []);
      busy = false;
      return paint();
    }
    say.textContent = res.wasted ? "这一周平安过去了，只是有一样东西白占了服务器。" : "这一周平平安安：改不了的放服务器，只关自己的留本地。";
    await story(round.pass || []);
    if (at + 1 >= rounds.length) {
      say.textContent = "两周都撑过去了。判断标准只有一个：改了它，会不会影响别人。";
      finished = true;
      launch.hidden = true;
      paint();
      return onDone();
    }
    await story(rounds[at + 1].intro || []);
    at += 1;
    busy = false;
    report.hidden = true;
    say.textContent = "交易市场开张了：新加的几样也要分。前一周分好的照旧。";
    paint();
  }

  const root = h("div", { class: "mini au" },
    miniHead(h, icon, "谁说了算 · 种田日记联网版", () => {
      onHint();
      say.textContent = `提示 ${hintAt + 1}/${HINTS.length}：${HINTS[hintAt]}`;
      hintAt = (hintAt + 1) % HINTS.length;
    }),
    h("p", { class: "au-lead" }, roundLabel, slots),
    pool,
    h("div", { class: "au-board" }, local, server),
    h("div", { class: "mini-controls" }, launch),
    report, say);
  say.textContent = "把下面每样数据分到本地或服务器。分完了点「上线一周看看」。";
  if (typeof location !== "undefined" && /[?&]debug/.test(location.search)) window.__authority = { placement, week, place, round: () => at };
  paint();
  return root;
}
