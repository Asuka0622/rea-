// 卡牌 · 当面对质：小账本一案，拿沙盒里抓到的记录核对客服发来的《隐私说明》。
// 规则在 cards-engine.js；这里只管画面和操作。美术素材交给美术组，现在是代码画的占位
// （需求见 docs/art/briefs/cards-privacy-statement.md）。
import { createCrossExam } from "./cards-engine.js";
import { hasMiniArt, whenMiniArt, cls, miniHead } from "./mini-art.js";

if (typeof document !== "undefined" && !document.querySelector("link[data-cards-style]")) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/cards-game.css";
  link.dataset.cardsStyle = "true";
  document.head.append(link);
}

const HINTS = [
  "先挑一句话，再决定：追问它、出示一件证据驳倒它，或者判它属实。",
  "说明里有真话。拿证据去指控一句真话，和放过一句假话一样扣信任。",
  "证据卡只写原始记录。出牌前想清楚：这条记录到底说明了什么？",
  "有些话追问一下，对方会说漏嘴、换一种说法。新的说法也要核对。",
  "「匿名」和「认得出你是谁」是两回事：看看上报里到底带了什么。",
];

export function mountCards({ h, icon, lab, onMistake = () => {}, onHint = () => {}, onDone = () => {} }) {
  const spec = lab.cards?.statements ? lab.cards : {};
  const opponent = spec.opponent || "小账本客服";
  let exam = createCrossExam(spec);
  let focus = exam.open()[0]?.id;
  let hintAt = 0;

  const roomId = lab.cardsRoom || "mini-cd-room";
  const drawn = [h("span", { class: "window" }), h("span", { class: "bench" }), h("span", { class: "desk" }), h("span", { class: "stand" })];
  const bubble = h("div", { class: "mini-cd-claim" });
  const stage = h("div", { class: "mini-cd-stage drawn" }, ...drawn, bubble);
  const paintRoom = () => {
    const has = hasMiniArt(roomId);
    if (has === Boolean(stage.querySelector("img"))) return;
    stage.className = cls(["mini-cd-stage", !has && "drawn"]);
    stage.replaceChildren(...(has ? [h("img", { class: "mini-cd-bg", src: `/art/pixel/minigames/${roomId}.png`, alt: "" })] : drawn), bubble);
  };
  paintRoom();
  whenMiniArt(paintRoom);
  let flashTimer = 0;
  const flash = (kind) => {
    stage.classList.remove("hit", "miss");
    void stage.offsetWidth;
    stage.classList.add(kind);
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => stage.classList.remove("hit", "miss"), 560);
  };

  const testimony = h("ol", { class: "cd2-testimony" });
  const verdict = h("p", { class: "mini-cd-verdict" }, "");
  const trust = h("span", { class: "cd2-trust" });
  const say = h("p", { class: "mini-say", role: "status" }, "小林：「我去问了小账本的客服，他们发来一份《隐私说明》，说得可好听了。你拿抓到的记录给我核对一下？」");
  const pressBtn = h("button", { class: "btn small", type: "button", onclick: () => doPress() }, "追问");
  const affirmBtn = h("button", { class: "btn small", type: "button", onclick: () => doAffirm() }, "判它属实");
  const reportBox = h("div", { class: "cd2-report", hidden: true });
  const restart = h("button", { class: "btn", type: "button", hidden: true, onclick: () => reset() }, "重新核对");

  const statusText = { open: "待核对", refuted: "不实", true: "属实", withdrawn: "收回了" };
  function paintTestimony() {
    testimony.replaceChildren(...exam.state.statements.map((s) => h("li", {
      class: cls(["cd2-line", s.status, s.id === focus && "focus"]),
      onclick: () => { if (s.status === "open") { focus = s.id; paint(); } },
    }, h("span", {}, s.text), h("small", { class: "cd2-tag" }, statusText[s.status]))));
  }

  function paint() {
    const s = exam.find(focus);
    bubble.replaceChildren(h("b", {}, `${opponent}：`), ` ${s && s.status === "open" ? s.text : "……"}`);
    paintTestimony();
    const over = exam.state.status !== "playing";
    trust.textContent = `小林的信任 ${"●".repeat(Math.max(0, exam.state.trust))}${"○".repeat(exam.state.trustMax - Math.max(0, exam.state.trust))}`;
    pressBtn.disabled = over || !s || s.status !== "open";
    affirmBtn.disabled = pressBtn.disabled;
    restart.hidden = !over;
    for (const el of cardEls) el.disabled = over;
  }

  const nextOpen = () => {
    if (exam.find(focus)?.status !== "open") focus = exam.open()[0]?.id;
  };

  function after(res, good) {
    flash(good ? "hit" : "miss");
    if (!good) onMistake();
    nextOpen();
    if (exam.state.status === "won") finish();
    else if (exam.state.status === "lost") {
      say.textContent = "小林：「你是不是有点疑神疑鬼了？……我还是先装上试试吧。」信任用完了：重新核对一遍。";
    }
    paint();
  }

  function doPress() {
    const res = exam.press(focus);
    if (!res) return;
    verdict.className = "mini-cd-verdict";
    if (res.replaced) {
      verdict.textContent = `【追问】${opponent}：「${res.line}」——他换了一种说法。`;
      focus = res.replaced.id;
      say.textContent = "说漏嘴了。旧说法收回，新说法也要核对。";
    } else {
      verdict.textContent = `【追问】${opponent}：「${res.line}」`;
      say.textContent = "追问不扣分。听完再决定：出示证据，还是判它属实。";
    }
    paint();
  }

  function doAffirm() {
    const res = exam.affirm(focus);
    if (!res) return;
    verdict.className = cls(["mini-cd-verdict", res.ok && "refute"]);
    verdict.textContent = res.ok ? `【属实】${res.why}` : res.why;
    say.textContent = res.ok ? "公道。不是每句话都有问题，冤枉真话也是错。" : "小林：「啊？那这句也是骗人的？」";
    after(res, res.ok);
  }

  function doPresent(card) {
    const res = exam.present(focus, card.id);
    if (!res) return;
    verdict.className = cls(["mini-cd-verdict", res.ok && "refute"]);
    verdict.textContent = res.ok ? `【异议！】${res.why}` : `${res.why}（它记的是：${res.record}）`;
    say.textContent = res.ok ? "驳倒了。下一句。" : "先想清楚这条记录说明了什么，再对着这句话出示。";
    after(res, res.ok);
  }

  function finish() {
    const rows = exam.report();
    reportBox.hidden = false;
    reportBox.replaceChildren(h("b", {}, "给小林的体检报告：隐私说明 vs 实际行为"),
      h("table", {}, h("tbody", {}, ...rows.map((r) => h("tr", { class: r.verdict === "属实" ? "ok" : "bad" },
        h("td", {}, r.text), h("td", {}, r.verdict), h("td", {}, r.by || "记录相符"))))));
    say.textContent = (exam.state.mistakes ? `核对完了，扣了 ${exam.state.mistakes} 次信任。` : "一次都没冤枉、一次都没放过。")
      + `小林：「说明里 ${rows.filter((r) => r.verdict === "不实").length} 句对不上……天哪，我差点就装了。还好先让你查了一遍。」`;
    onDone();
  }

  // 证据卡：标题 + 原始记录。悬停/聚焦时在下面放大显示整条记录。
  const peekIdle = "先在上面挑一句话，再点一张证据出示。把光标停在证据上可以看整条记录。";
  const peek = h("p", { class: "mini-cd-peek" }, peekIdle);
  const cardEls = exam.evidence.map((card) => h("button", {
    class: "mini-cd-card cd2-card", type: "button", onclick: () => doPresent(card),
    onmouseenter: () => (peek.textContent = `${card.label}：${card.record}`), onfocus: () => (peek.textContent = `${card.label}：${card.record}`),
    onmouseleave: () => (peek.textContent = peekIdle), onblur: () => (peek.textContent = peekIdle),
  }, h("span", { class: "mini-cd-card-art", "aria-hidden": "true" }), h("b", {}, card.label), h("small", {}, card.record)));
  const paintCards = () => {
    const framed = hasMiniArt("mini-cd-card-frame");
    for (const [i, card] of exam.evidence.entries()) {
      const box = cardEls[i].querySelector(".mini-cd-card-art");
      const pic = hasMiniArt(`mini-cd-art-${card.id}`);
      // 证据的原始记录要一直看得见：这张证据有了自己的卡面图才套框，没有就照旧显示文字。
      cardEls[i].classList.toggle("art", framed && pic);
      if (pic && !box.firstChild) box.append(h("img", { src: `/art/pixel/minigames/mini-cd-art-${card.id}.png`, alt: "" }));
      else if (!pic && box.firstChild) box.replaceChildren();
    }
  };
  paintCards();
  whenMiniArt(paintCards);

  function reset() {
    exam = createCrossExam(spec);
    focus = exam.open()[0]?.id;
    verdict.className = "mini-cd-verdict";
    verdict.textContent = "";
    reportBox.hidden = true;
    say.textContent = "重新核对一遍：先听清每句话在说什么。";
    paint();
  }

  const root = h("div", { class: "mini mini-cards cd2" },
    miniHead(h, icon, lab.cardsTitle || "当面对质 · 隐私说明", () => {
      onHint();
      say.textContent = `提示 ${hintAt + 1}/${HINTS.length}：${HINTS[hintAt]}`;
      hintAt = (hintAt + 1) % HINTS.length;
    }),
    stage,
    h("div", { class: "cd2-doc" }, h("b", {}, `《小账本隐私说明》 · ${opponent}发来的`), testimony),
    h("div", { class: "mini-controls" }, pressBtn, affirmBtn, h("span", { class: "cd2-or" }, "或者点一张证据出示"), trust),
    verdict,
    h("div", { class: "mini-cd-cards" }, ...cardEls), peek,
    reportBox,
    h("div", { class: "mini-controls" }, restart), say);
  if (typeof location !== "undefined" && /[?&]debug/.test(location.search)) window.__cd = () => exam;
  paint();
  return root;
}
