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
//   · discover：任务从哪里被找到（board / npc:某某 / rumor:关键词）

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
    after: [],
    needs: [],
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
];

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
