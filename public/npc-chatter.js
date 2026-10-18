// 会说话的 NPC：先说上话，再等美术
//
// 镇上这六位暂时是文字 + 占位小人（一个带名字的小圆点）。走过去就会说话，
// 第一次说完给一个成就；之后路过只留一句短的。
// 等 `docs/art/npcs.md` 第 2 节那六张精灵表到位，只要把 look 换成 sprite-<id>.png 就行。

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
