// 序章的委托清单：从「线性章节」拆成「可以任意顺序接的任务」
//
// 之前六份委托写在 game-quests.js 的 chapters 里，一章接一章，只能按顺序做。
// 这里把它们拆成独立的委托：每份自己带知识点目标、前置条件和发现方式，
// 由 public/quest-board.js 决定什么时候出现在板上。
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

/**
 * 七份委托。前六份是序章原有的，第七份是失败站（加密猫）。
 * `caseId` 指向 samples/cases/<id>/workbench-case.json。
 */
export const PROLOGUE_QUESTS = [
  {
    id: "privacy-ledger",
    caseId: "privacy-ledger",
    title: "小林的记账软件",
    giver: "小林",
    discover: "board",
    after: [],
    needs: [],
    knowledge: [
      { id: "static-read", depth: "L2" },
      { id: "data-flow", depth: "L3" },
      { id: "runtime-evidence", depth: "L3" },
      { id: "permission-manifest", depth: "L1" },
    ],
  },
  {
    id: "weather-keys",
    caseId: "weather-keys",
    title: "学长的钥匙",
    giver: "阿哲",
    discover: "board",
    after: [],
    needs: [],
    knowledge: [
      { id: "hardcoded-secret", depth: "L3" },
      { id: "static-read", depth: "L2" },
    ],
  },
  {
    id: "calculator-eggs",
    caseId: "calculator-eggs",
    title: "计算器的秘密",
    giver: "小雨",
    discover: "rumor:计算器",
    after: [],
    needs: [],
    knowledge: [
      { id: "hidden-entry", depth: "L3" },
      { id: "local-check", depth: "L2" },
    ],
  },
  {
    id: "farm-save",
    caseId: "farm-save",
    title: "朵朵的存档",
    giver: "朵朵",
    discover: "npc:朵朵",
    after: [],
    needs: [],
    knowledge: [
      { id: "save-format", depth: "L3" },
      { id: "encoding-vs-crypto", depth: "L3" },
    ],
  },
  {
    id: "notes-versions",
    caseId: "notes-versions",
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
    title: "王奶奶的手电筒",
    giver: "王奶奶",
    discover: "npc:王奶奶",
    // 权限这件事先在小林那里见过一次（他那份委托标了 permission-manifest L1）。
    needs: ["permission-manifest:L1"],
    after: [],
    knowledge: [{ id: "permission-manifest", depth: "L3" }],
  },
  {
    id: "packed-echo",
    caseId: "packed-echo",
    title: "读不动的程序 · 加密猫",
    giver: "老秦",
    discover: "npc:老秦",
    after: [],
    // 得先会静态读代码，否则这一关只会变成「什么都看不懂」。
    needs: ["static-read:L2"],
    knowledge: [
      { id: "packing", depth: "L3" },
      { id: "epistemics", depth: "L3" },
      { id: "runtime-evidence", depth: "L1" },
      { id: "static-read", depth: "L2" },
    ],
  },
];

/** 玩家当前的委托状态：已完成哪些、哪些来源见过。 */
export function freshPlayer() {
  return { discovered: [], completed: {} };
}

/**
 * 从「已完成」推导出玩家的知识点水平：做完一份委托，就拿到了它标注的那几层（取最高）。
 * 这是最小实现——真正的成长值之后由复勘与专家档补进来。
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

/** 哪些知识点还没在两份委托里到过 L3——覆盖缺口，给报告用，不用来卡流程。 */
export function coverageGaps(quests = PROLOGUE_QUESTS) {
  const reached = new Map();
  for (const quest of quests) {
    for (const entry of quest.knowledge || []) {
      if (entry.depth !== "L3") continue;
      const list = reached.get(entry.id) || [];
      list.push(quest.id);
      reached.set(entry.id, list);
    }
  }
  return Object.keys(KNOWLEDGE_POINTS)
    .filter((id) => (reached.get(id) || []).length < 2)
    .map((id) => ({ id, label: KNOWLEDGE_POINTS[id], quests: reached.get(id) || [] }));
}
