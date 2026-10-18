// 会说话的 NPC：先说上话，再等美术
//
// 镇上这六位暂时是文字 + 占位小人（一个带名字的小圆点）。走过去就会说话，
// 第一次说完给一个成就；之后路过只留一句短的。
// 等 `docs/art/npcs.md` 第 2 节那六张精灵表到位，只要把 look 换成 sprite-<id>.png 就行。
//
// 其中四位还承担「传闻」：聊过之后，对应委托才会出现在事务所的委托板上
// （discover 的值要写进 quest-progress 的 discovered，见 prologue-quests.js 的 discover 字段）。
// 这样任务不只从公告板上来，镇上随便聊两句也能接活。

export const NPC_TALKED_KEY = "rea-npc-talked";

export const CHATTER_NPCS = [
  {
    id: "pigeon-uncle",
    name: "老周",
    region: "center",
    x: 452,
    y: 300,
    look: "#9aa4b2",
    first: ["钟楼没停之前，镇上没人看表。", "现在人人都知道 11:58 了。"],
    after: "钟楼停了以后，鸽子倒是准时。",
    discover: "npc:王奶奶",
    hear: "对了，王奶奶昨天举着手电筒问我，装个照明怎么还要她的通讯录。你要是懂这个，去问问她。",
  },
  {
    id: "oncall",
    name: "阿康",
    region: "homes",
    x: 862,
    y: 300,
    look: "#6d7f9b",
    first: ["（手机响了）……这条我已经看了四百次。", "它每天都响，我就每天都按掉。"],
    after: "（手机又响了）别管它。",
    discover: "npc:朵朵",
    hear: "隔壁朵朵倒是真遇上事了：她的种田存档，读出来的数字跟种出来的地对不上，正到处找人看。",
  },
  {
    id: "paperboy",
    name: "小石头",
    region: "center",
    x: 300,
    y: 206,
    look: "#c1554a",
    first: ["今天的头版和昨天一样。", "我问过报社，他们说「明天就换」，说了三个月。"],
    after: "号外！还是昨天的号外！",
    discover: "rumor:计算器",
    hear: "要说新鲜事，倒有一桩：小雨那台计算器，按出来的数有点邪门，她自己好像还挺得意。",
  },
  {
    id: "lighthouse-keeper",
    name: "老陈",
    region: "south",
    x: 830,
    y: 300,
    look: "#7f8f7a",
    first: ["白天不亮灯。", "万一今晚要用呢。"],
    after: "灯擦过了。",
    discover: "npc:老秦",
    hear: "档案馆的老秦前两天收了个读不动的程序，谁打开都是一屏乱码。他说，得找个不怕看不懂的人。",
  },
  {
    id: "apprentice",
    name: "小铃",
    region: "north",
    x: 620,
    y: 340,
    look: "#b08ac1",
    first: ["误差 0.5 秒算不算准？", "师傅说算，我说不算。"],
    after: "我又调了一遍。",
  },
  {
    id: "cobbler",
    name: "老宋",
    region: "craft",
    x: 500,
    y: 300,
    look: "#a3765c",
    first: ["你这双鞋，走的是近路。", "鞋底比人诚实。"],
    after: "鞋跟磨偏了，改天给你钉钉。",
  },
];

export const npcsInRegion = (region) => CHATTER_NPCS.filter((npc) => npc.region === region);
export const npcById = (id) => CHATTER_NPCS.find((npc) => npc.id === id) || null;

export function loadTalked(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(NPC_TALKED_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function saveTalked(talked = [], storage = globalThis.localStorage) {
  try {
    storage?.setItem(NPC_TALKED_KEY, JSON.stringify([...new Set(talked)]));
    return true;
  } catch {
    return false;
  }
}

/** 第一次说话返回 true（用来发成就）。 */
export function markTalked(talked = [], id) {
  if (!npcById(id)) return { talked, first: false };
  if (talked.includes(id)) return { talked, first: false };
  return { talked: [...talked, id], first: true };
}
