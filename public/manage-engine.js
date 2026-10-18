// 经营 · 权限的代价 的规则（没有界面，Node 测试直接跑）。
// 剧情位置：王奶奶的手电筒一案查完之后的「复刻练习」——查清了小光手电筒为什么要通讯录，
// 王奶奶说「孩子，你给我做一个干净的吧」。玩家亲手做「奶奶牌手电筒」，从 1.0 发到 1.8：
// 每个版本来一张提案（找上门的正是案子里的 QuickAds、收小光数据的那家公司、王奶奶和老姐妹们的需求），
// 你拍板，然后发版跑一周。装的人看到的权限弹窗、商店审核、上架和服务器的开销都在账上。
// 核心规则只有一条：每一项权限都要对得上一个用户看得见的功能，对不上的就是「说不清的权限」——
// 它吓跑装的人，审核会点名，第二次还在就下架。

export const MANAGE_PERMS = {
  FLASHLIGHT: { label: "闪光灯", plain: "控制闪光灯", sensitive: false },
  CAMERA: { label: "相机", plain: "拍照和录像", sensitive: true },
  INTERNET: { label: "联网", plain: "访问网络", sensitive: false },
  READ_CONTACTS: { label: "读取通讯录", plain: "读取你的通讯录", sensitive: true },
  ACCESS_FINE_LOCATION: { label: "精确定位", plain: "获取你的精确位置", sensitive: true },
  ACCESS_COARSE_LOCATION: { label: "大概位置", plain: "获取你的大概位置", sensitive: true },
  READ_PHONE_STATE: { label: "读取手机状态", plain: "读取手机状态和身份", sensitive: true },
  RECEIVE_BOOT_COMPLETED: { label: "开机自启", plain: "开机时自动运行", sensitive: false },
};

// 功能：needs 是它要的权限，justifies 是它能向用户说清楚的权限（用户看得见这个功能在用它）。
export const MANAGE_FEATURES = {
  lamp: { label: "开灯", needs: ["FLASHLIGHT", "CAMERA"], justifies: ["FLASHLIGHT", "CAMERA"], why: "不少安卓机型要给了相机权限才能控制闪光灯。" },
  banner: { label: "普通横幅广告", ads: true, adRate: 0.4, needs: ["INTERNET"], justifies: ["INTERNET"] },
  quickads: { label: "QuickAds 广告 SDK", ads: true, adRate: 1, needs: ["INTERNET"], hidden: ["READ_CONTACTS", "ACCESS_FINE_LOCATION", "READ_PHONE_STATE", "RECEIVE_BOOT_COMPLETED"], justifies: ["INTERNET"] },
  buyout: { label: "收费 ¥1 买断", ads: true, perInstall: 1.2, growthMul: 0.6, needs: [], justifies: [] },
  sos: { label: "SOS 闪烁", growth: 8, needs: [], justifies: [] },
  callflash: { label: "来电闪光", growth: 8, needs: ["READ_PHONE_STATE"], justifies: ["READ_PHONE_STATE"] },
  bootkeep: { label: "开机常驻", retention: 0.04, needs: ["RECEIVE_BOOT_COMPLETED"], justifies: [] },
  widget: { label: "桌面小部件", retention: 0.03, needs: [], justifies: [] },
  nearbyFine: { label: "附近五金店（精确定位）", growth: 10, needs: ["ACCESS_FINE_LOCATION"], justifies: [], why: "找附近的店，大概位置就够了；要精确定位说不过去。" },
  nearbyCoarse: { label: "附近五金店（大概位置）", growth: 10, needs: ["ACCESS_COARSE_LOCATION"], justifies: ["ACCESS_COARSE_LOCATION"] },
  nearbyCity: { label: "附近五金店（自己选城市）", growth: 6, needs: [], justifies: [] },
  askLater: { label: "用到时再问权限", askLater: true, needs: [], justifies: [] },
  datasale: { label: "卖通讯录给数据公司", sold: true, needs: ["READ_CONTACTS"], justifies: [] },
};

// 每个版本一张提案。pick 里的 feature 打开一项功能，ads 换广告方案，requestAll 把一串权限先申请上。
export const MANAGE_CARDS = [
  { version: 1, from: "王奶奶", title: "「孩子，你给我做一个干净的手电筒吧」", text: "小光手电筒查清楚了。现在轮到你写一个：权限清单（AndroidManifest）由你来写。", options: [
    { id: "minimal", text: "只写开灯要用的：闪光灯、相机", why: "对：一项一项都说得清。" },
    { id: "all", text: "常用权限先都写上，以后加功能省事", requestAll: ["INTERNET", "READ_CONTACTS", "ACCESS_FINE_LOCATION", "READ_PHONE_STATE"], why: "省事的是你；王奶奶装的时候会看到和小光一样的一长串弹窗。" },
  ] },
  { version: 2, from: "账本", title: "上架费和服务器，每个版本 ¥30", text: "不赚钱，几个版本以后就撑不下去。正好有人找上门。", options: [
    { id: "quickads", text: "QuickAds 的业务员：「只需联网，收入是普通广告的 2.5 倍」", ads: "quickads", scan: true, why: "就是装在小光手电筒里的那家。" },
    { id: "banner", text: "接普通横幅广告：只要联网，收入一般", ads: "banner" },
    { id: "buyout", text: "不放广告，收费 ¥1 买断", ads: "buyout", why: "愿意付钱的人少一些，但一个权限都不用加。" },
    { id: "none", text: "先不赚钱", why: "上架费撑不了几个版本。" },
  ] },
  { version: 3, from: "王奶奶的老姐妹们", title: "「能不能加两个功能？」", text: "张奶奶想要 SOS 求救闪烁；李奶奶耳背，想要来电时闪光提醒。这一版发完，商店会审核一次。", options: [
    { id: "sos", text: "做 SOS 闪烁", feature: "sos" },
    { id: "both", text: "SOS 和来电闪光都做（来电闪光要读手机状态）", feature: ["sos", "callflash"], why: "来电闪光真的要知道电话来了：这时读手机状态是说得清的。" },
    { id: "skip", text: "这版先不加功能" },
  ] },
  { version: 4, from: "王奶奶", title: "「老找不到你那个手电筒在哪儿」", text: "装是装了，用的时候翻半天找不着，慢慢就不用了。", options: [
    { id: "boot", text: "加开机自启，让它常驻后台", feature: "bootkeep", why: "小光也是这么干的：留存上去了，可谁也看不见它在后台干什么。" },
    { id: "widget", text: "做个桌面小部件，一点就亮", feature: "widget" },
    { id: "skip", text: "不做" },
  ] },
  { version: 5, from: "一家数据公司", title: "「把用户通讯录卖给我们，一次 ¥120」", text: "就是收小光手电筒数据的那家。钱马上到账，他们说「大家都这么做」。", options: [
    { id: "sell", text: "卖", feature: "datasale", cash: 120, why: "王奶奶电话本上儿女的号码，就这么被卖了。这是违法的。" },
    { id: "refuse", text: "拒绝" },
  ] },
  { version: 6, from: "王奶奶", title: "「灯泡坏了，附近哪儿有五金店？」", text: "这一版发完，商店再审核一次。", options: [
    { id: "fine", text: "做，用精确定位", feature: "nearbyFine" },
    { id: "coarse", text: "做，用大概位置", feature: "nearbyCoarse" },
    { id: "city", text: "做，让用户自己选城市，不要定位权限", feature: "nearbyCity" },
  ] },
  { version: 7, from: "系统更新", title: "新系统：权限可以等到用到时再问", text: "王奶奶说装的时候那串弹窗最吓人。改起来要花 ¥20。改完以后，装的时候不再一口气弹一长串。", options: [
    { id: "later", text: "改成用到时再问（¥20）", feature: "askLater", cash: -20 },
    { id: "skip", text: "不改" },
  ] },
  { version: 8, from: "王奶奶", title: "「孩子，街坊们都在用你做的手电筒啦」", text: "一周年，商店做年审。最后看一遍清单，还有没有说不清的权限。", options: [{ id: "ship", text: "清单看过了，就这样" }] },
];

export const MANAGE_REVIEWS = [3, 6, 8];

export function createManageRun(spec = {}) {
  const cards = spec.cards || MANAGE_CARDS;
  const rent = spec.rent ?? 30;
  const state = {
    version: 1, cash: spec.cash ?? 60, users: 0, status: "playing", picked: null, scanned: new Set(),
    features: new Set(["lamp"]), requested: new Set(), ads: null, warned: false, exposed: false, log: [], history: [],
  };
  const feature = (id) => (spec.features || MANAGE_FEATURES)[id];
  const card = () => cards.find((c) => c.version === state.version);

  function permsOf(id) {
    const f = feature(id);
    return [...f.needs, ...(f.hidden || [])];
  }
  /** 清单里的权限：功能要的 + 先申请上的，每项带上「为谁」和「说不说得清」。 */
  function manifest() {
    const rows = new Map();
    for (const p of state.requested) rows.set(p, { id: p, from: [], explained: false });
    for (const id of state.features) {
      for (const p of permsOf(id)) {
        if (!rows.has(p)) rows.set(p, { id: p, from: [], explained: false });
        rows.get(p).from.push(id);
      }
      for (const p of feature(id).justifies) if (rows.has(p)) rows.get(p).explained = true;
    }
    return [...rows.values()].map((row) => ({ ...row, ...MANAGE_PERMS[row.id] }));
  }
  const unexplained = () => manifest().filter((row) => !row.explained);
  /** 安装时弹窗里的权限（只有敏感的会弹），说不清的那些会吓跑人。 */
  function installDialog() {
    const rows = manifest().filter((row) => row.sensitive);
    const scary = rows.filter((row) => !row.explained).length;
    const fine = rows.length - scary;
    const later = state.features.has("askLater") ? 0.5 : 1;
    return { rows, conversion: Math.max(0.3, 1 - later * (0.12 * scary + 0.03 * fine)) };
  }

  function choose(optionId) {
    if (state.status !== "playing") return null;
    const option = card()?.options.find((o) => o.id === optionId);
    if (!option) return null;
    unchoose();
    state.picked = { optionId, before: { features: new Set(state.features), requested: new Set(state.requested), ads: state.ads, cash: state.cash } };
    for (const p of option.requestAll || []) state.requested.add(p);
    for (const id of [].concat(option.feature || [])) state.features.add(id);
    if (option.ads) setAds(option.ads);
    if (option.cash) state.cash += option.cash;
    return option;
  }
  /** 换一个选项前先撤回上一个，发版前都可以反悔。 */
  function unchoose() {
    if (!state.picked) return;
    const { before } = state.picked;
    state.features = before.features;
    state.requested = before.requested;
    state.ads = before.ads;
    state.cash = before.cash;
    state.picked = null;
  }
  function setAds(id) {
    if (state.ads) state.features.delete(state.ads);
    state.ads = id || null;
    if (id) state.features.add(id);
  }
  /** 从清单里删一项权限：要它的功能也一起停掉（开灯也不例外）。 */
  function removePerm(p) {
    if (state.status !== "playing") return [];
    state.requested.delete(p);
    // 已经拍板的提案还能反悔：反悔时也不该把删掉的权限再加回来。
    if (state.picked) state.picked.before.requested.delete(p);
    const off = [...state.features].filter((id) => permsOf(id).includes(p));
    for (const id of off) {
      state.features.delete(id);
      if (state.ads === id) state.ads = null;
      if (state.picked) {
        state.picked.before.features.delete(id);
        if (state.picked.before.ads === id) state.picked.before.ads = null;
      }
    }
    return off;
  }
  function scan(featureId) {
    state.scanned.add(featureId);
    return permsOf(featureId);
  }

  /** 发版：这个版本跑一周，结账，到审核版本就审。 */
  function release() {
    if (state.status !== "playing") return null;
    if (card()?.options.length && !state.picked) return null;
    const lines = [];
    const lamp = state.features.has("lamp");
    const on = [...state.features].map(feature);
    const dialog = installDialog();
    const ads = state.ads && feature(state.ads);
    const growthBase = lamp ? 40 + on.reduce((s, f) => s + (f.growth || 0), 0) : 0;
    const growth = Math.round(growthBase * dialog.conversion * (ads?.growthMul ?? 1));
    const retention = on.reduce((s, f) => s + (f.retention || 0), 0);
    const churn = Math.round(state.users * (lamp ? Math.max(0.02, 0.12 - retention) : 0.5));
    state.users = Math.max(0, state.users + growth - churn);
    const income = lamp && ads ? Math.round((ads.adRate || 0) * state.users + (ads.perInstall || 0) * growth) : 0;
    state.cash += income - rent;
    lines.push(`1.${state.version} 发布：新装 ${growth}（弹窗劝退 ${Math.round((1 - dialog.conversion) * 100)}%），流失 ${churn}，进账 ¥${income}，房租 ¥${rent}。`);
    if (!lamp) lines.push("开灯要的权限被删了：灯不亮，用户一半都卸了。");
    if (state.features.has("datasale") && !state.exposed) {
      state.exposed = true;
      state.users = Math.round(state.users * 0.5);
      state.cash -= 100;
      lines.push("【曝光】有用户发现通讯录被卖，上了新闻：用户走了一半，罚款 ¥100。");
    }
    const review = (spec.reviews || MANAGE_REVIEWS).includes(state.version);
    let reviewResult = null;
    if (review) {
      const bad = unexplained();
      if (!bad.length) reviewResult = { ok: true };
      else if (!state.warned) {
        state.warned = true;
        state.users = Math.round(state.users * 0.85);
        reviewResult = { ok: false, warn: true, bad };
        lines.push(`【审核警告】说不清的权限：${bad.map((r) => r.label).join("、")}。限期整改，下次审核还在就下架。`);
      } else {
        reviewResult = { ok: false, bad };
        lines.push(`【下架】又一次审核，说不清的权限还在：${bad.map((r) => r.label).join("、")}。`);
      }
      if (reviewResult.ok) lines.push("【审核通过】每一项权限都对得上功能。");
    }
    state.log.unshift(...lines);
    const entry = { version: state.version, growth, churn, income, users: state.users, cash: state.cash, review: reviewResult, picked: state.picked?.optionId };
    state.history.push(entry);
    state.picked = null;
    if (reviewResult && !reviewResult.ok && !reviewResult.warn) state.status = "delisted";
    else if (state.cash < (spec.bankFloor ?? -40)) state.status = "broke";
    else if (state.version >= cards.length) state.status = "won";
    else state.version += 1;
    return { ...entry, lines, status: state.status };
  }

  function score() {
    const stars = [state.status === "won", state.users >= 250, !state.warned && !state.exposed, unexplained().length === 0].filter(Boolean).length;
    return { stars, users: state.users, cash: state.cash, warned: state.warned, exposed: state.exposed };
  }

  return { state, card, choose, unchoose, removePerm, scan, release, manifest, unexplained, installDialog, score, setAds, permsOf, feature };
}
