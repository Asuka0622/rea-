// 小游戏模块 (docs/minigame-genres.md): the case's sandbox step can be one of these instead of a plain lab.
// Each keeps the lab contract so case-session needs no changes: take { h, icon, lab, onMistake, onHint,
// onDone } and call onDone() when finished. Every mapping is chosen so the action in the game is the
// action in the job — see the genre doc for what each one stands for.
//
// 塔防 borrows from 保卫萝卜 / 明日方舟: one path, deployment slots along it, a deployment budget that
// regenerates, units you place and upgrade, waves of data collectors walking toward what you protect.
// The budget is the point: every control costs something, and the lamp still has to work.
//
// 节奏 borrows from 音游 (Cytus / Muse Dash / 太鼓): notes ride a lane toward a judgment line, hits are
// graded, combo and accuracy are shown, misses say what leaked out.

//
// 经营 borrows from Game Dev Story / Papers, Please: one proposal card per release, a ledger, a store
// review every few versions. The player builds 王奶奶 a clean flashlight; every permission in the
// manifest has to point at a feature the user can see, or the install dialog and the review punish it.
//
// 卡牌 borrows from 逆转裁判's cross-examination: the developer claims one thing at a time and the
// player presents the one evidence card that answers exactly that claim. Wrong cards say what they
// DO prove, so a miss is still a lesson in "evidence must match the claim".

const cls = (parts) => parts.filter(Boolean).join(" ");

// A mini-game's picture is optional: public/art/pixel/minigames/<id>.png replaces the room drawn in
// code. The list of what the studio has delivered arrives from /api/art after boot — later than the
// game mounts — so a game asks hasMiniArt() and re-paints itself when the answer lands.
let miniArt = null;
const miniArtWaiting = new Set();
if (typeof location !== "undefined") {
  const token = document.querySelector('meta[name="workbench-token"]')?.content;
  fetch("/api/art", { cache: "no-cache", headers: token ? { "X-Workbench-Token": token } : {} })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)
    .then((data) => {
      miniArt = new Set(data?.pixel || []);
      for (const paint of miniArtWaiting) paint();
      miniArtWaiting.clear();
    });
}
const hasMiniArt = (id) => Boolean(miniArt?.has(`minigames/${id}`));
const whenMiniArt = (paint) => (miniArt === null ? miniArtWaiting.add(paint) : paint());

/** A picture that appears the moment the studio delivers it; an empty <img> until then. */
function artImg(h, id, className) {
  const img = h("img", { class: className, alt: "", "aria-hidden": "true" });
  const sync = () => {
    const has = hasMiniArt(id);
    if (has) img.src = `/art/pixel/minigames/${id}.png`;
    else img.removeAttribute("src");
    img.classList.toggle("on", has);
  };
  sync();
  whenMiniArt(sync);
  return img;
}

/** The same for a background picture: the class turns the CSS background on. */
function artBg(el, id, className = "art") {
  const sync = () => el.classList.toggle(className, hasMiniArt(id));
  sync();
  whenMiniArt(sync);
  return el;
}

// A sprite sheet arrives with a JSON saying the frame size and which row is which animation.
// Loaded once, and only by a game that already has the sheet.
const sheets = new Map();
function loadSheet(id) {
  if (!sheets.has(id)) {
    sheets.set(id, fetch(`/art/pixel/minigames/${id}.json`, { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : null)).catch(() => null));
  }
  return sheets.get(id);
}
const sheetWhenReady = (id, then) => {
  const get = () => { if (hasMiniArt(id)) loadSheet(id).then(then); };
  get();
  whenMiniArt(get);
};

function head(h, icon, title, onHint) {
  return h("div", { class: "mini-head" }, h("b", {}, title),
    h("button", { class: "btn small", type: "button", onclick: () => onHint?.() }, icon("learn", { size: 14 }), "给个提示"));
}

/**
 * 塔防 · 权限 (王奶奶)：规则在 tower-engine.js，画面和操作在 tower-game.js。
 */
export { mountTower } from './tower-game.js';

/**
 * 节奏 · 定时上报 (小林)
 * 信标检测：一条轨道、请求长得都一样，靠节奏分出程序自动上传（F 拦截）和你点的同步（D 放行）。
 * 谱面默认用 rhythm-engine.js 的 makeBeaconChart；lab.rhythm.notes 有内容时用旧格式 makeChart。
 */
export { mountRhythm } from './rhythm-game.js';

/**
 * 管道 · 数据流向 (阿哲): route the secret into the server, not into the package you are about to ship.
 */
export { mountPipes } from './pipe-game.js';

/**
 * 经营 · 权限的代价 (王奶奶)：王奶奶一案的复刻练习——亲手做一个「奶奶牌手电筒」，从 1.0 发到 1.8，
 * 每版一张提案，每项权限都要对得上用户看得见的功能。规则在 manage-engine.js，画面在 manage-game.js。
 */
export { mountManage } from './manage-game.js';

/**
 * 卡牌 · 对质 (通用): the developer claims one thing at a time; the player presents the one evidence
 * card that answers exactly that claim, 逆转裁判 style. 出对牌 == 用对证据 — a wrong card says what it
 * does prove instead, so every miss still teaches "evidence must match the claim".
 * 数据：{ opponent, cards:[{id,label,note}], claims:[{text,answer,why}] }
 */
export function mountCards({ h, icon, lab, onMistake = () => {}, onHint = () => {}, onDone = () => {} }) {
  const spec = lab.cards || {
    opponent: "开发者",
    cards: [
      { id: "capture", label: "抓包记录", note: "你没点任何东西，它每 30 秒上传一次" },
      { id: "timer", label: "代码：setInterval(…, 30000)", note: "每 30 秒干一次活的，只有定时器" },
      { id: "sdk", label: "安装包里的 SDK 名单", note: "上传的收件人是广告 SDK 的地址" },
      { id: "terms", label: "用户协议第 14 条", note: "写着「可能收集信息」" },
      { id: "changelog", label: "更新日志", note: "只写了「修复闪退」" },
      { id: "lamp", label: "手电筒 APK 的权限清单", note: "另一个案子的证据，和本案无关" },
    ],
    claims: [
      { text: "我从不收集。你不点同步，它就不会上传。", answer: "capture", why: "抓包记录：你一下都没点，它每 30 秒自己传一次。" },
      { text: "就算有，那也是一次性的统计，不会自己定时跑。", answer: "timer", why: "代码里的 setInterval(30000)：会自己定时跑的，只有定时器。" },
      { text: "数据发到我们自己的服务器，没给过别人。", answer: "sdk", why: "收件地址在 SDK 名单里，是广告公司的，不是开发者的。" },
      { text: "用户都同意了，协议里写得明明白白。", answer: "terms", why: "第 14 条写的是「可能收集」，没说定时——还藏在 9 页长文里。" },
    ],
  };
  const cards = spec.cards || [];
  const claims = spec.claims || [];
  let idx = 0;
  let wrong = 0;

  // The room: the studio's picture (public/art/pixel/minigames/<id>.png) once it is delivered, a
  // bench and a desk drawn in CSS until then. The claim hangs over it the way a witness stand does
  // in 逆转裁判 — one speaker, one line at a time, nothing else competing for the eye.
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

  const verdict = h("p", { class: "mini-cd-verdict" }, "");
  const count = h("span", { class: "mini-count" });
  const intro = `${spec.opponent || "对方"}一句句说，你出对应的那张证据牌。对质不是吵架：让每一句话都对上一件证据。`;
  const say = h("p", { class: "mini-say", role: "status" }, intro);
  const restart = h("button", { class: "btn", type: "button", onclick: () => reset() }, "重新对质");
  let flashTimer = 0;
  const flashStage = (kind) => {
    stage.classList.remove("hit", "miss");
    void stage.offsetWidth; // restart the animation even when the last one is still running
    stage.classList.add(kind);
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => stage.classList.remove("hit", "miss"), 560);
  };
  const paint = () => {
    bubble.replaceChildren(h("b", {}, `${spec.opponent || "对方"}：`), ` ${claims[idx]?.text || "……（他不说话了）"}`);
    count.textContent = `已驳回 ${idx}/${claims.length} · 打错 ${wrong}`;
  };
  const reset = () => {
    idx = 0;
    wrong = 0;
    verdict.className = "mini-cd-verdict";
    verdict.textContent = "";
    say.textContent = intro;
    paint();
  };
  const play = (card) => {
    const claim = claims[idx];
    if (!claim || !card) return;
    if (card.id === claim.answer) {
      idx += 1;
      flashStage("hit");
      verdict.className = "mini-cd-verdict refute";
      verdict.textContent = `【等一下！】${claim.why || "这句话被证据驳倒了。"}`;
      if (idx >= claims.length) {
        say.textContent = wrong
          ? `全部驳回，打错 ${wrong} 次——每张牌只说明一件事，出牌前先听清对面在主张什么。`
          : "一张没错。证据和主张一一对应，这就是证据链。";
        onDone();
      } else {
        say.textContent = "驳倒了。他换了种说法，下一句。";
      }
    } else {
      wrong += 1;
      flashStage("miss");
      onMistake();
      verdict.className = "mini-cd-verdict";
      verdict.textContent = `${card.label}——这张牌说明不了这句：它${card.note || "讲的是另一件事"}。`;
      say.textContent = "证据要对着主张出：先听清这句话在主张什么，再挑牌。";
    }
    paint();
  };
  // Hovering a card says what it proves, so the player can study the evidence before committing.
  // In 逆转裁判 you read the file first and decide later; the same beat, kept out of the card itself
  // so the card stays a picture and a name.
  const peekIdle = "把光标停在一张牌上看它说明什么；出牌前先听清对面在主张什么。";
  const peek = h("p", { class: "mini-cd-peek" }, peekIdle);
  const showNote = (card) => (peek.textContent = card.note ? `${card.label}——${card.note}` : card.label);
  const cardEls = cards.map((card) => h("button", {
    class: "mini-cd-card", type: "button", onclick: () => play(card),
    onmouseenter: () => showNote(card), onfocus: () => showNote(card),
    onmouseleave: () => (peek.textContent = peekIdle), onblur: () => (peek.textContent = peekIdle),
  }, h("span", { class: "mini-cd-card-art", "aria-hidden": "true" }),
    h("b", {}, card.label), ...(card.note ? [h("small", {}, card.note)] : [])));
  // The studio's frame turns each card into a 3:2 evidence card: the picture in the window, the name
  // on the plate below it. Without it the cards stay plain text buttons.
  const paintCards = () => {
    const framed = hasMiniArt("mini-cd-card-frame");
    for (const [i, card] of cards.entries()) {
      const box = cardEls[i].querySelector(".mini-cd-card-art");
      const pic = hasMiniArt(`mini-cd-art-${card.id}`);
      cardEls[i].classList.toggle("art", framed);
      if (pic && !box.firstChild) {
        box.append(h("img", { src: `/art/pixel/minigames/mini-cd-art-${card.id}.png`, alt: "" }));
      } else if (!pic && box.firstChild) {
        box.replaceChildren();
      }
    }
  };
  paintCards();
  whenMiniArt(paintCards);
  paint();
  return h("div", { class: "mini mini-cards" }, head(h, icon, lab.cardsTitle || "当面对质", onHint),
    stage, verdict, h("div", { class: "mini-cd-cards" }, ...cardEls), peek,
    h("div", { class: "mini-controls" }, count, restart), say);
}
