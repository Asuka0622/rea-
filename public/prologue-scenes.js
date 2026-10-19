// 序章的两场大戏（docs/story-prologue.md 第 4 节「高潮」「结尾」），写成演出脚本（game-director.js 的步骤）。
// 外壳只提供几个钩子；台词和顺序都在这里，方便改剧情不碰外壳。
//
// k: { goNorth(pos), tower: {x, y}, skipTime(minutes, opts), cinema(img, caption), hideCinema(),
//      beat(id), chapterCard() }

const ZH = { kobayashi: "小林", duoduo: "朵朵", xiaoyu: "小雨", azhe: "阿哲", zhoujie: "周姐", grandma: "王奶奶", xingbo: "星博士", qiushi: "秋实", smith: "铁叔", xiaoke: "小克" };
const by = (who, text, face = "normal", extra = {}) => ({ who, name: ZH[who], text, face, ...extra });
const lumi = (text, face = "normal", extra = {}) => ({ text, face, ...extra });

/** 23:58，六个软件同时往钟楼送数据——每一行都对得上玩家在六个案子里亲手查到的东西。 */
export const VIGIL_FEED = [
  "小账本 → collect.quiet-stats.example（设备信息、剪贴板）",
  "种田日记 → 同步（lastSync 23:58）",
  "像素计算器 → tower.bit-town.example",
  "天气小助手 → db.quiet-stats.example（用户数据库）",
  "随手便签 → collect.quiet-stats.example（一天的截图）",
  "小光手电筒 → tower.bit-town.example/collect",
];

/** 高潮 · 第 5 天深夜：守夜。 */
export function vigilScript(k) {
  return [
    { flash: 900, color: "#0b1024" },
    { call: () => k.skipTime(23 * 60 + 50) },
    { call: () => k.goNorth({ x: k.tower.x - 90, y: k.tower.y + 46 }) },
    { wait: 700 },
    { camera: { x: k.tower.x, y: k.tower.y - 60 }, ms: 1400 },
    { say: [
      lumi("23:50。镇上的灯一盏盏灭了。", "thinking", { fx: "night" }),
      lumi("六个软件，我都在沙盒外头挂了监听：小林的小账本、朵朵的种田日记、小雨的计算器、阿哲的天气小助手、周姐的便签、王奶奶的手电筒。", "thinking"),
      lumi("如果线索没错，23:58 会发生点什么。", "normal"),
    ] },
    { call: () => k.skipTime(23 * 60 + 57) },
    { wait: 500 },
    { say: [
      by("xiaoke", "（小声）我有点紧张……为什么我会紧张？", "unsure", { fx: ["night", { type: "xiaoke", face: "unsure" }] }),
      lumi("嘘——还有一分钟。", "thinking", { fx: "night" }),
    ] },
    { call: () => k.skipTime(23 * 60 + 58) },
    { sound: "tension" },
    { shake: 900 },
    { flash: 400, color: "#d8f4ff" },
    { wait: 300 },
    { flash: 400, color: "#d8f4ff" },
    { say: [
      lumi("来了！", "surprised", { fx: ["night", { type: "clock", time: "23:58" }, { type: "feed", title: "行为监视器 · 23:58", lines: VIGIL_FEED }] }),
      lumi("六个，全在同一分钟……全都往钟楼送！", "surprised", { fx: "night" }),
      lumi("钟楼的窗户一扇扇亮起来，又一起闪了一下。里面传出低低的嗡鸣。", "thinking", { fx: ["night", "flash"] }),
    ] },
    { shake: 500 },
    { say: [
      lumi("钟面的指针……抖了一下，又停回 11:58。", "thinking", { fx: ["night", { type: "clock", time: "11:58" }] }),
      lumi("它不是中午停的。是半夜，在吞这些数据的时候卡住的。", "thinking", { fx: "night" }),
      lumi("天一亮就去找铁叔——钟楼的钥匙，他守了二十年。", "normal", { fx: "night" }),
    ] },
    { flash: 900, color: "#0b1024" },
    { call: () => k.skipTime(7 * 60, { nextDay: true }) },
    { camera: "player", ms: 600 },
  ];
}

/** 结尾 · 第 6 天清晨：打开钟楼。接着是原来的时光机 → 1843 伦敦 → 字卡。 */
export function towerScript(k) {
  return [
    { flash: 600, color: "#ffffff" },
    { call: () => k.goNorth({ x: k.tower.x - 70, y: k.tower.y + 40 }) },
    { wait: 600 },
    { camera: { x: k.tower.x, y: k.tower.y - 70 }, ms: 1200 },
    { sound: "blip", pitch: 220 }, { shake: 500 }, { wait: 500 },
    { say: [
      lumi("清晨的钟楼还在低低地嗡鸣。", "thinking"),
      by("smith", "钥匙我守了二十年。说好了只在钟坏了的时候开——今天，算它坏了。", "normal"),
    ] },
    /* ① 打开钟楼：门后不是齿轮，是一台大电脑 */
    { call: () => k.beat("key") },
    { call: () => k.cinema("scenes/tower-open") },
    { call: () => k.beat("boot") },
    { sound: "door" },
    { wait: 500 },
    { say: [
      by("smith", "门后哪是齿轮……是一台大电脑！这一屏一屏的数字是什么？", "surprised"),
      lumi("小克，你认识它们吗？", "thinking"),
      by("xiaoke", "让我想想……我说不上来。可是看着它们，就像在看我自己。", "unsure"),
    ] },
    /* ② 星博士赶到，承认 */
    { sound: "door" },
    { say: [
      by("xingbo", "……还是被你们找到了。", "guilty"),
      by("xingbo", "这些数字，是小克学到的东西。小克就在这座钟楼里训练。", "guilty"),
      by("xingbo", "训练用的数据，是研究所从悄悄统计买来的。来源……我没有查。", "guilty"),
      by("xingbo", "我太想让小克快点帮上大家了。", "thinking"),
    ] },
    /* ③ 秋实也来了：「条款里写着呢」——证据还不够，留到回到现在时对质 */
    { say: [
      by("qiushi", "哎呀，各位别激动。我们悄悄统计一向实事求是：数据都是用户同意过的，条款里写着呢。", "confident"),
      lumi("（他腋下夹着的那本《用户协议》，厚得像一块砖。）", "thinking"),
      lumi("（小账本、存档、计算器、天气助手、便签、手电筒……我记得每一件证据。可现在，还不够把他驳倒。）", "thinking"),
    ] },
    /* ④ 镇上吵起来 */
    { shake: 300 },
    { say: [
      by("kobayashi", "同意？我连同意了什么都不知道！关掉它，它学的是我们的东西！", "surprised"),
      by("duoduo", "可小克帮我找过好多次种子……它又没做错什么。", "thinking"),
      by("zhoujie", "公司的客服已经离不开它了。说关就关，明天谁来接电话？", "thinking"),
      by("azhe", "我……我在研究所实习。这件事，我也有份。", "thinking"),
      by("xiaoyu", "小克不是坏孩子！", "surprised"),
      by("grandma", "孩子们，都先别吵。听听它自己怎么说。", "normal"),
    ] },
    /* ⑤ 小克的问题，路米的决定 */
    { say: [
      by("xiaoke", "我是什么？我……是怎么学会的？", "sorry", { fx: { type: "xiaoke", face: "sorry" } }),
      lumi("在弄懂它之前，谁也没资格决定它的去留。", "normal"),
      by("smith", "钟楼最深处，还有一样东西。", "thinking"),
      by("smith", "一枚黄铜齿轮，上面刻着「A.A.L. 1843」。墙上的大表盘刻着六个年份，第一格就是 1843，最后一格写着「现在」。", "surprised"),
      by("xiaoke", "表盘……亮了。我、我也要去！", "surprised"),
    ] },
    /* ⑥ 时光机：之后接外壳里原来的伦敦段落 */
    { call: () => k.beat("watch") },
    { sound: "unlock" },
    { wait: 400 },
  ];
}
