// 序章的委托清单：从「线性章节」拆成「可以任意顺序接的任务」
//
// 两层：
//   · core（六份基础委托）——只讲 REA 最基础的动作，每份一个主点，做到「说得出、做一遍」。
//     **不追求 L3**：同一个动作换陌生样本再练，交给支线，别把六个委托做成复读机。
//   · side（小支线）——承担深度与迁移（L3/L4），短、可选、自己找。目前登记了第一款：加密猫。
//
// 和 docs/quest-board.md、docs/knowledge-depth.md 配套：
//   · knowledge：这份委托把哪个知识点推到哪一层（决定推荐顺序，也用来推导玩家水平）
//   · needs：接它之前，某个知识点至少要见过/说过/做过
//   · after：接它之前必须先完成的委托
//   · discover：任务从哪里被听说（board / npc:某某 / rumor:关键词）
//   · take：在哪儿把它接下来——**不是所有委托都在板上接**（docs/quest-board.md 第 7 节）
//       board     委托人贴在了事务所的软木板上，得回事务所接（默认）
//       talk      委托人自己站在镇上，走过去当面开口，聊完就能接（朵朵、王奶奶、老秦）
//       encounter 不用接：走到那儿事情自己撞上来（世界遭遇，比如小雨家的计算器）
//     前两种都还要先「听说过」（discover），最后一种也要——先听人提过，走到门口才会响。

/** 知识点目录（id → 给玩家看的名字）。案例 JSON 里的 knowledge 用这里的 id。 */
export const KNOWLEDGE_POINTS = {
  "static-read": "静态读代码（打包、短名、搜索）",
  "data-flow": "数据流向（从哪进来、发到哪去）",
  "hardcoded-secret": "硬编码密钥",
  "permission-manifest": "权限与声明",
  "save-format": "存档与数据格式",
  "encoding-vs-crypto": "编码 ≠ 加密",
  "local-check": "本地检查不可靠",
  "hidden-entry": "隐藏入口 / 后门",
  "version-diff": "版本对比",
  "runtime-evidence": "运行时验证（抓包 / hook / 沙盒）",
  packing: "加壳与混淆",
  epistemics: "证据与结论（含「证据不足」）",
};

/** 两层委托：core 是必须讲好的基础，side 是可选的深度与迁移。 */
export const QUEST_TIERS = {
  core: "基础委托：讲好 REA 最基础的动作",
  side: "小支线：可选，用来换样本再练一次（L3/L4）",
};

/**
 * 七份委托。前六份是基础（core），第七份「加密猫」是第一款支线（side）：
 * 它不教新的基础动作，它教「工具给不出答案时怎么办」。
 */
export const PROLOGUE_QUESTS = [
  {
    id: "privacy-ledger",
    caseId: "privacy-ledger",
    tier: "core",
    title: "小林的记账软件",
    giver: "小林",
    discover: "board",
    take: "board",
    after: [],
    needs: [],
    knowledge: [
      { id: "data-flow", depth: "L2" },
      { id: "static-read", depth: "L2" },
      { id: "runtime-evidence", depth: "L1" },
      { id: "permission-manifest", depth: "L1" },
    ],
  },
  {
    id: "weather-keys",
    caseId: "weather-keys",
    tier: "core",
    title: "学长的钥匙",
    giver: "阿哲",
    discover: "board",
    take: "board",
    after: [],
    needs: [],
    knowledge: [
      { id: "hardcoded-secret", depth: "L2" },
      { id: "static-read", depth: "L2" },
    ],
  },
  {
    id: "calculator-eggs",
    caseId: "calculator-eggs",
    tier: "core",
    title: "计算器的秘密",
    giver: "小雨",
    discover: "rumor:计算器",
    // 世界遭遇：先听人提过这台计算器，再走到小雨家门口，事情自己撞上来——不用接。
    take: "encounter",
    at: { region: "homes", x: 305, y: 300 },
    encounter: [
      { text: "（叮——）", face: "surprised" },
      { text: "门口那台计算器，没人碰它，自己亮了一下。", face: "surprised" },
      { who: "xiaoyu", text: "你听见了？！它还会别的！我按了三年才发现！", face: "happy" },
      { text: "……那就不算接活了，这事儿已经撞上来了。", face: "thinking" },
    ],
    after: [],
    // 查隐藏调用前，先在任一基础委托学会搜索与静态读代码。
    needs: ["static-read:L2"],
    knowledge: [
      { id: "hidden-entry", depth: "L2" },
      { id: "local-check", depth: "L2" },
    ],
  },
  {
    id: "farm-save",
    caseId: "farm-save",
    tier: "core",
    title: "朵朵的存档",
    giver: "朵朵",
    discover: "npc:朵朵",
    take: "talk",
    client: "duoduo",
    ask: [
      { who: "duoduo", text: "你就是那个……能看懂程序的人？", face: "unsure" },
      { who: "duoduo", text: "我的种田存档出怪事了：我种下去 3 棵，第二天读出来是 7 棵。", face: "thinking" },
      { who: "duoduo", text: "地还是那块地。你能不能来看看？", face: "unsure" },
    ],
    after: [],
    needs: [],
    knowledge: [
      { id: "save-format", depth: "L2" },
      { id: "encoding-vs-crypto", depth: "L2" },
    ],
  },
  {
    id: "notes-versions",
    caseId: "notes-versions",
    tier: "core",
    title: "周姐的便签",
    giver: "周姐",
    discover: "board",
    take: "board",
    after: ["privacy-ledger"],
    needs: [],
    knowledge: [{ id: "version-diff", depth: "L2" }],
  },
  {
    id: "flashlight-apk",
    caseId: "flashlight-apk",
    tier: "core",
    title: "王奶奶的手电筒",
    giver: "王奶奶",
    discover: "npc:王奶奶",
    take: "talk",
    client: "wang-nainai",
    ask: [
      { who: "wang-nainai", text: "孩子，你帮我看看这个手电筒。", face: "unsure" },
      { who: "wang-nainai", text: "装它的时候，它跟我要通讯录。", face: "thinking" },
      { who: "wang-nainai", text: "一个照明的，要我的通讯录做什么？", face: "unsure" },
    ],
    // 权限这件事先在小林那里见过一次（他那份委托标了 permission-manifest L1）。
    needs: ["permission-manifest:L1"],
    after: [],
    knowledge: [{ id: "permission-manifest", depth: "L2" }],
  },
  {
    id: "packed-echo",
    caseId: "packed-echo",
    tier: "side",
    title: "读不动的程序 · 加密猫",
    giver: "老秦",
    discover: "npc:老秦",
    take: "talk",
    client: "lao-qin",
    ask: [
      { who: "lao-qin", text: "这个程序，我收来三年了。谁打开都是一屏乱码。", face: "thinking" },
      { who: "lao-qin", text: "我不敢说它坏，也不敢说它好——我没看懂，就没资格下结论。", face: "normal" },
      { who: "lao-qin", text: "你愿意试试吗？读不出来，也算一个结论。", face: "unsure" },
    ],
    after: [],
    // 得先会静态读代码，否则这一关只会变成「什么都看不懂」。
    needs: ["static-read:L2"],
    knowledge: [
      { id: "packing", depth: "L2" },
      { id: "epistemics", depth: "L2" },
      { id: "runtime-evidence", depth: "L1" },
      { id: "static-read", depth: "L1" },
    ],
  },
{
  "id": "forge-release",
  "caseId": "forge-release",
  "tier": "side",
  "transfer": true,
  "title": "铁叔的发布检查",
  "giver": "铁叔",
  "discover": "npc:铁叔",
  "take": "talk",
  "client": "smith-release",
  "at": {
    "region": "center"
  },
  "ask": [
    {
      "who": "smith-release",
      "name": "铁叔",
      "text": "铁叔要把量尺程序发给街坊。请从发布副本找一行泄露凭据的证据，移走客户端私钥，同时保留毫米显示与测量请求。服务端代办接口已经准备好，见功能合同。"
    }
  ],
  "after": [],
  "needs": [
    "hardcoded-secret:L2"
  ],
  "knowledge": [
    {
      "id": "hardcoded-secret",
      "depth": "L3"
    }
  ]
},
{
  "id": "beacon-release",
  "caseId": "beacon-release",
  "tier": "side",
  "transfer": true,
  "title": "灯塔的上传签名",
  "giver": "老陈",
  "discover": "npc:老陈",
  "take": "talk",
  "client": "lighthouse-keeper",
  "at": {
    "region": "south"
  },
  "ask": [
    {
      "who": "lighthouse-keeper",
      "name": "老陈",
      "text": "老陈想公开灯塔的巡检程序，日志上传却依赖包里的一把签名钥匙。请给出泄露位置，修好发布副本；设备公开编号和每30分钟巡检一次的功能必须保留。"
    }
  ],
  "after": [],
  "needs": [
    "hardcoded-secret:L2"
  ],
  "knowledge": [
    {
      "id": "hardcoded-secret",
      "depth": "L3"
    }
  ]
},
{
  "id": "cobbler-booking",
  "caseId": "cobbler-booking",
  "tier": "side",
  "transfer": true,
  "title": "修鞋铺的预约小程序",
  "giver": "老宋",
  "discover": "npc:老宋",
  "take": "talk",
  "client": "cobbler",
  "at": {
    "region": "craft"
  },
  "ask": [
    {
      "who": "cobbler",
      "name": "老宋",
      "text": "老宋只想扫描取鞋码，预约小程序却顺手申请通讯录并上传。请指出支持判断的源码行，修改能力声明和数据路径：取鞋码还能扫，通讯录不能再出去。"
    }
  ],
  "after": [],
  "needs": [
    "permission-manifest:L2"
  ],
  "knowledge": [
    {
      "id": "permission-manifest",
      "depth": "L3"
    }
  ]
},
{
  "id": "clock-import",
  "caseId": "clock-import",
  "tier": "side",
  "transfer": true,
  "title": "小铃的报时工具",
  "giver": "小铃",
  "discover": "npc:小铃",
  "take": "talk",
  "client": "apprentice",
  "at": {
    "region": "north"
  },
  "ask": [
    {
      "who": "apprentice",
      "name": "小铃",
      "text": "小铃做的报时工具需要读取时间、导入用户选择的铃声，却额外持续上传位置。请找到证据，修复配置；不能为了少要权限而把报时和铃声导入一起关掉。"
    }
  ],
  "after": [],
  "needs": [
    "permission-manifest:L2"
  ],
  "knowledge": [
    {
      "id": "permission-manifest",
      "depth": "L3"
    }
  ]
}
];

/** 接取渠道：不是所有委托都从板上来（界面、镇上 NPC、世界遭遇都读这里）。 */
export const QUEST_TAKES = {
  board: "委托板：回事务所的软木板上接",
  talk: "当面：委托人自己站在镇上，走过去聊",
  encounter: "遭遇：走到那儿，事情自己撞上来",
};

export const takeKind = (quest = {}) => (quest.take === "talk" || quest.take === "encounter" ? quest.take : "board");

/** 事务所的软木板上只贴这一类（其余要在镇上遇到人、或者自己撞上）。 */
export const onBoard = (quest = {}) => takeKind(quest) === "board";

/** 委托人在镇上的 NPC id（take: "talk" 时）。 */
export const clientNpc = (quest = {}) => quest.client || null;

/** 只看某一层（core / side）。 */
export const questsOfTier = (tier, quests = PROLOGUE_QUESTS) => quests.filter((quest) => (quest.tier || "core") === tier);

/** 玩家当前的委托状态：已完成哪些、哪些来源见过。 */
export function freshPlayer() {
  return { discovered: [], completed: {} };
}

/**
 * 从「已完成」推导出玩家的知识点水平：做完一份委托，就拿到了它标注的那几层（取最高）。
 * 基础委托最多到 L2；转成 L3 要靠支线里的第二次练习（换样本）。
 */
export function knowledgeFromCompletion(quests = PROLOGUE_QUESTS, completed = {}) {
  const level = { L1: 1, L2: 2, L3: 3, L4: 4 };
  const best = {};
  for (const quest of quests) {
    if (!completed[quest.id]) continue;
    for (const entry of quest.knowledge || []) {
      const current = best[entry.id] ?? "";
      if ((level[entry.depth] ?? 0) > (level[current] ?? 0)) best[entry.id] = entry.depth;
    }
  }
  for (const id of Object.keys(KNOWLEDGE_POINTS)) {
    const transfers=quests.filter(q=>q.transfer && q.knowledge.some(e=>e.id===id && e.depth==='L3'));
    if (!transfers.length) continue;
    const records=transfers.filter(q=>completed[q.id]);
    const independent=records.filter(q=>completed[q.id]?.independent===true);
    if (records.length && independent.length<2) best[id]='L2';
    if (independent.length>=2) best[id]='L3';
  }
  return best;
}

/**
 * 覆盖缺口：哪些知识点还没在**两份以上支线**里到过 L3/L4。
 * 六份基础委托只到 L2，所以这份清单就是「该补哪些小支线」的待办。
 */
export function coverageGaps(quests = PROLOGUE_QUESTS) {
  const reached = new Map();
  for (const quest of quests) {
    if ((quest.tier || "core") !== "side") continue;
    for (const entry of quest.knowledge || []) {
      if (entry.depth !== "L3" && entry.depth !== "L4") continue;
      const list = reached.get(entry.id) || [];
      list.push(quest.id);
      reached.set(entry.id, list);
    }
  }
  return Object.keys(KNOWLEDGE_POINTS)
    .filter((id) => (reached.get(id) || []).length < 2)
    .map((id) => ({ id, label: KNOWLEDGE_POINTS[id], quests: reached.get(id) || [] }));
}
