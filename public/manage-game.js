// 经营 · 权限的代价：王奶奶一案的复刻练习——亲手做一个「奶奶牌手电筒」，从 1.0 发到 1.8。
// 规则在 manage-engine.js；这里只管画面和操作。美术素材交给美术组，现在是代码画的占位
// （需求见 docs/art/briefs/manage-grandma-flashlight.md）。
import { createManageRun, MANAGE_REVIEWS, MANAGE_PERMS } from "./manage-engine.js";
import { hasMiniArt, whenMiniArt, cls, miniHead } from "./mini-art.js";

if (typeof document !== "undefined" && !document.querySelector("link[data-manage-style]")) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/manage-game.css";
  link.dataset.manageStyle = "true";
  document.head.append(link);
}

const HINTS = [
  "清单里每一项权限，都要能指着一个用户看得见的功能说「是它要的」。说不清的那几项会标红。",
  "王奶奶装的时候会看到弹窗：说不清的敏感权限越多，看完就不装的人越多。",
  "广告 SDK 会把自己要的权限合并进你的清单。签之前可以用 REA 扫一下它。",
  "审核在 1.3、1.6、1.8 发版后。第一次挨警告还能改，第二次就下架。删一项权限，要它的功能也会停。",
  "找附近的店，大概位置就够了。来电闪光要知道电话来了，读手机状态在这里是说得清的。",
];

export function mountManage({ h, icon, lab, onMistake = () => {}, onHint = () => {}, onDone = () => {} }) {
  const spec = lab.manage || {};
  let run = createManageRun(spec);
  let hintAt = 0;
  let scanned = new Set();

  const say = h("p", { class: "mini-say", role: "status" }, "王奶奶：「孩子，小光那个我不敢用了。你会写程序，给我做一个干净的吧。」");
  const bar = h("div", { class: "mini-mg-bar" });
  const officeId = lab.manageRoom || "mini-mg-office";
  const officeDrawn = [h("span", { class: "window" }), h("span", { class: "desk" }), h("span", { class: "plant" })];
  const office = h("div", { class: "mini-mg-office drawn" }, ...officeDrawn, bar);
  const paintOffice = () => {
    const has = hasMiniArt(officeId);
    if (has === Boolean(office.querySelector("img"))) return;
    office.className = cls(["mini-mg-office", !has && "drawn"]);
    office.replaceChildren(...(has ? [h("img", { class: "mini-mg-bg", src: `/art/pixel/minigames/${officeId}.png`, alt: "" })] : officeDrawn), bar);
  };
  paintOffice();
  whenMiniArt(paintOffice);

  const cardBox = h("div", { class: "mg2-card" });
  const manifestBox = h("div", { class: "mg2-manifest" });
  const dialogBox = h("div", { class: "mg2-dialog" });
  const adsBox = h("div", { class: "mg2-ads" });
  const log = h("div", { class: "mini-mg-log" });
  const ship = h("button", { class: "btn primary", type: "button", onclick: () => release() }, icon("scan", { size: 14 }), "发布");
  const restart = h("button", { class: "btn", type: "button", hidden: true, onclick: () => reset() }, "从 1.0 重新做");

  const featureName = (id) => run.feature(id)?.label || id;
  const nextReview = () => (spec.reviews || MANAGE_REVIEWS).find((v) => v >= run.state.version);

  function paintBar() {
    const s = run.state;
    const review = nextReview();
    bar.replaceChildren(
      h("span", { class: "mini-td-stat" }, `版本 1.${s.version}`),
      h("span", { class: "mini-td-stat" }, `现金 ¥${Math.round(s.cash)}`),
      h("span", { class: "mini-td-stat" }, `装的人 ${s.users}`),
      h("span", { class: cls(["mini-td-stat", review === s.version && "warn"]) }, review ? (review === s.version ? "这版发完审核" : `下次审核 1.${review}`) : "审核都过了"),
      ...(s.warned ? [h("span", { class: "mini-td-stat warn" }, "已挨过警告")] : []));
    const lamp = run.state.features.has("lamp");
    office.classList.toggle("dark", !lamp);
    office.classList.toggle("hot", run.unexplained().length > 0);
  }

  function paintCard() {
    const c = run.card();
    if (!c || run.state.status !== "playing") { cardBox.replaceChildren(); return; }
    const picked = run.state.picked?.optionId;
    cardBox.replaceChildren(
      h("small", { class: "mg2-from" }, `提案 · ${c.from}`),
      h("b", {}, c.title),
      h("p", {}, c.text),
      h("div", { class: "mg2-options" }, ...c.options.map((o) => {
        const sdk = o.ads && run.feature(o.ads);
        const seen = sdk?.hidden && scanned.has(o.ads);
        return h("div", { class: cls(["mg2-option", picked === o.id && "picked"]) },
          h("button", { class: "case-option", type: "button", onclick: () => pick(o) }, o.text),
          ...(o.scan && sdk?.hidden ? [seen
            ? h("p", { class: "mg2-scan" }, `REA 扫出来：除了联网，它还会往你的清单里合并 ${sdk.hidden.map((p) => MANAGE_PERMS[p]?.label || p).join("、")}，外加一个 TrackService 追踪服务。`)
            : h("button", { class: "btn small ghost", type: "button", onclick: () => { scanned.add(o.ads); run.scan(o.ads); say.textContent = "用 REA 扫了一遍这个 SDK 的包。"; paint(); } }, icon("scan", { size: 12 }), "用 REA 扫一下这个 SDK")] : []));
      })));
    ship.textContent = "";
    ship.append(icon("scan", { size: 14 }), `发布 1.${run.state.version}`);
    ship.disabled = !picked;
  }

  function pick(option) {
    run.choose(option.id);
    say.textContent = option.why || `就这么定：${option.text}。`;
    if (option.feature === "datasale" || [].concat(option.feature || []).includes("datasale")) onMistake();
    paint();
  }

  function paintManifest() {
    const rows = run.manifest();
    manifestBox.replaceChildren(
      h("b", {}, "权限清单 AndroidManifest"),
      ...rows.map((row) => h("div", { class: cls(["mg2-perm", row.explained ? "ok" : "bad"]) },
        h("span", { class: "mg2-perm-name" }, row.label, h("code", {}, row.id)),
        h("small", {}, row.from.length ? `给：${row.from.map(featureName).join("、")}` : "没有功能用它（先写上的）"),
        h("span", { class: "mg2-badge" }, row.explained ? "说得清" : "说不清"),
        run.state.status === "playing" ? h("button", { class: "btn small ghost", type: "button", onclick: () => remove(row) }, "删掉") : null)));
    const dialog = run.installDialog();
    dialogBox.replaceChildren(
      h("b", {}, "王奶奶装的时候看到的弹窗"),
      ...(dialog.rows.length ? dialog.rows.map((row) => h("p", { class: row.explained ? "" : "bad" }, `「奶奶牌手电筒」想要${row.plain}`)) : [h("p", {}, "（没有弹窗，装上就能用）")]),
      h("small", {}, `大约 ${Math.round((1 - dialog.conversion) * 100)}% 的人看完弹窗就不装了。`));
  }

  function remove(row) {
    const off = run.removePerm(row.id);
    if (off.includes("lamp")) {
      onMistake();
      say.textContent = `删了 ${row.label}，灯就不亮了：不少机型要相机权限才能控制闪光灯。这一项是说得清的。`;
    } else if (off.length) say.textContent = `删了 ${row.label}，${off.map(featureName).join("、")} 也跟着停了。`;
    else say.textContent = `删了 ${row.label}：本来就没有功能在用它。`;
    paint();
  }

  function paintAds() {
    const s = run.state;
    if (s.version <= 2 || s.status !== "playing") { adsBox.replaceChildren(); return; }
    const choices = [["", "不赚钱"], ["banner", "普通横幅广告"], ["quickads", "QuickAds SDK"], ["buyout", "¥1 买断"]];
    adsBox.replaceChildren(h("b", {}, "怎么赚钱（随时可换）"), h("div", { class: "lab-choices" }, ...choices.map(([id, label]) => h("button", {
      class: cls(["btn small", (s.ads || "") === id && "primary"]), type: "button",
      onclick: () => { run.setAds(id || null); say.textContent = id ? `改成 ${label}。` : "广告全撤了。"; paint(); },
    }, label))));
  }

  function release() {
    const res = run.release();
    if (!res) return;
    log.prepend(...res.lines.map((line) => h("div", {}, line)));
    if (res.review && !res.review.ok) onMistake();
    const s = run.state;
    if (s.status === "won") {
      const sc = run.score();
      say.textContent = `${"★".repeat(sc.stars)}${"☆".repeat(4 - sc.stars)} 王奶奶：「街坊们都在用你做的手电筒，要什么都说得清——这才叫手电筒。」`
        + (sc.exposed ? "（可卖过的通讯录，再也收不回来了。）" : sc.warned ? "（中间挨过一次警告：清单最好一开始就写干净。）" : "");
      onDone();
    } else if (s.status === "delisted") {
      say.textContent = "下架了。王奶奶：「孩子，你这个……怎么跟小光一样了？」";
    } else if (s.status === "broke") {
      say.textContent = "钱烧完了，上架费交不起。一个权限都不加也能赚钱：普通横幅广告、或者收 ¥1 买断。";
      onMistake();
    } else {
      const last = res.lines[res.lines.length - 1];
      say.textContent = res.review?.ok ? "审核通过。接着做下一版。" : res.review ? last : `1.${res.version} 发出去了。下一张提案来了。`;
    }
    paint();
  }

  function paint() {
    const over = run.state.status !== "playing";
    ship.hidden = over;
    restart.hidden = !over;
    paintBar();
    paintCard();
    paintManifest();
    paintAds();
  }

  function reset() {
    run = createManageRun(spec);
    scanned = new Set();
    log.replaceChildren();
    say.textContent = "重新来：王奶奶还在等那个干净的手电筒。";
    paint();
  }

  const root = h("div", { class: "mini mini-manage mg2" },
    miniHead(h, icon, lab.manageTitle || "权限的代价 · 奶奶牌手电筒", () => {
      onHint();
      say.textContent = `提示 ${hintAt + 1}/${HINTS.length}：${HINTS[hintAt]}`;
      hintAt = (hintAt + 1) % HINTS.length;
    }),
    office,
    h("div", { class: "mg2-desk" }, h("div", { class: "mg2-left" }, cardBox, adsBox, h("div", { class: "mini-controls" }, ship, restart)), h("div", { class: "mg2-right" }, manifestBox, dialogBox)),
    say, log);
  if (typeof location !== "undefined" && /[?&]debug/.test(location.search)) window.__mg = () => run;
  paint();
  return root;
}
