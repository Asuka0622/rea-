// 谁说了算（朵朵的种田日记出联网版）的规则（没有界面，Node 测试直接跑）。
// 玩家当开发者：每样数据放在玩家电脑上（本地，玩家说了算），还是放在服务器上（服务器说了算）。
// 然后「上线一周」：放本地、又会影响别人的数据，会被作弊玩家改爆；什么都塞给服务器，又慢又贵。
// 这就是改存档那一关的另一面——本地的校验只挡得住手滑，影响别人的东西要服务器来管。

// affects: 改了它会不会影响别的玩家（排行榜、交易、好友）。这是唯一的判断依据。
export const AUTHORITY_ITEMS = {
  gold: { label: "金币", affects: true, tag: "排行榜按它排", exploit: "有人把金币改成 99999999，排行榜第一名一夜之间换了人；朵朵的 230 金币掉到第 4000 名。", server: "金币由服务器记账：客户端只显示，改了本地文件也没用。" },
  harvest: { label: "今天的收成", affects: true, tag: "换成金币", exploit: "有人谎报「今天收了 5000 个南瓜」，换来的金币全是凭空变的。", server: "收成由服务器按种下的时间核对：种子要长 3 天，报 5000 个就对不上。" },
  rank: { label: "排行榜名次", affects: true, tag: "大家都看得到", exploit: "有人直接把自己的名次写成第 1，榜单上同时出现了七个第一名。", server: "名次由服务器统一排，谁也没法自己写。" },
  friends: { label: "好友列表", affects: true, tag: "对方也看得到", exploit: "有人在本地把自己加进了几百个人的好友列表，全镇都收到了他的拜访请求。", server: "加好友要双方在服务器上确认。" },
  volume: { label: "背景音乐音量", affects: false, tag: "只影响自己", local: "音量放在本地，调一下马上生效。", wasted: "每调一下音量都要连服务器：没网就调不了，玩家抱怨「调个音量都要转圈」。" },
  keys: { label: "按键设置", affects: false, tag: "只影响自己", local: "按键是每个人的习惯，放本地刚好。", wasted: "按键设置存在服务器上：换台电脑就得重新联网下载，服务器还要多付一份钱。" },
  backup: { label: "存档备份", affects: false, tag: "只影响自己", local: "备份留在本地：断网也能找回自己的进度。", wasted: "备份只放服务器：一断网，备份就拿不到了。" },
  language: { label: "界面语言", affects: false, tag: "只影响自己", local: "语言放本地，开机就是你习惯的样子。", wasted: "语言要从服务器读：网慢的时候，开游戏先看到一串乱码。" },
  price: { label: "交易价格", affects: true, tag: "买卖双方都认", exploit: "有人把自己摊位的价格改成「1 个南瓜换 1 万金币」，系统照单全收，买家的钱被划走了。", server: "成交价由服务器按双方的报价撮合，客户端改不了别人的账。" },
  quality: { label: "南瓜品质", affects: true, tag: "决定卖多少钱", exploit: "有人把普通南瓜全改成「金南瓜」拿去卖，市场上的金南瓜一夜多了一万个。", server: "品质在收获那一刻由服务器定下，之后只读。" },
  stickers: { label: "表情包收藏", affects: false, tag: "只影响自己", local: "收藏的表情放本地，翻得快。", wasted: "每翻一页表情都要请求服务器，聊天时卡得要命。" },
  effects: { label: "动画特效开关", affects: false, tag: "只影响自己", local: "老电脑关掉特效会流畅些，这是玩家自己的事。", wasted: "关个特效也要服务器批准，还多花一份服务器费用。" },
};

// 两轮：先上线排行榜和好友，再开交易市场（新加的数据要接着分）。
export const AUTHORITY_ROUNDS = [
  { id: "online", title: "联网版上线", items: ["gold", "volume", "harvest", "keys", "rank", "backup", "friends", "language"] },
  { id: "market", title: "交易市场开张", items: ["price", "stickers", "quality", "effects"] },
];

/** 难度：easy 在每样东西上标出「会不会影响别人」，hard 只给刚好够用的服务器名额。 */
export const AUTHORITY_LEVELS = {
  easy: { tags: true, wasteAllowed: 1, slots: null },
  normal: { tags: false, wasteAllowed: 1, slots: null },
  hard: { tags: false, wasteAllowed: 0, slots: "exact" },
};

/**
 * 上线一周：placement 是 { 数据 id: "local" | "server" }，前几轮已经分好的照旧生效。
 * 返回每样东西这一周发生了什么，以及有没有过关。
 */
export function simulateWeek(roundIndex, placement, level = "normal") {
  const rules = AUTHORITY_LEVELS[level] || AUTHORITY_LEVELS.normal;
  const ids = AUTHORITY_ROUNDS.slice(0, roundIndex + 1).flatMap((r) => r.items);
  const report = ids.map((id) => {
    const item = AUTHORITY_ITEMS[id];
    const where = placement[id];
    if (!where) return { id, label: item.label, result: "unset", text: "还没决定放哪儿。" };
    if (item.affects && where === "local") return { id, label: item.label, result: "exploited", text: item.exploit };
    if (!item.affects && where === "server") return { id, label: item.label, result: "wasted", text: item.wasted };
    return { id, label: item.label, result: "ok", text: where === "server" ? item.server : item.local };
  });
  const exploited = report.filter((r) => r.result === "exploited").length;
  const wasted = report.filter((r) => r.result === "wasted").length;
  const unset = report.filter((r) => r.result === "unset").length;
  return { report, exploited, wasted, unset, passed: !unset && exploited === 0 && wasted <= rules.wasteAllowed };
}

/** hard 难度下这一轮能放上服务器的名额：刚好等于真正要放的数量（含前几轮的）。 */
export function serverSlots(roundIndex) {
  return AUTHORITY_ROUNDS.slice(0, roundIndex + 1).flatMap((r) => r.items).filter((id) => AUTHORITY_ITEMS[id].affects).length;
}
