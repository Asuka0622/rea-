// 委托板：不按顺序的接任务
//
// 剧情不再是「第一关→第二关」，而是玩家自己在事务所的委托板上接、在路上打听出来。
// 这带来一个必须解决的问题：**顺序自由时，每一份委托都得自己站得住**——
// 不能假设玩家做过上一关，否则接任务的自由就成了卡关的自由。
//
// 所以前置条件只有两种，都不用「等级」：
//   · after：必须先做过某件事（某个委托、某个动作）
//   · knowledge：某个知识点至少到过哪一层（L1 见过 / L2 说得出 / L3 做得出 / L4 判得准）
// 发现方式（discover）决定任务怎么出现在板上：board（一开始就贴在本子上）、
// npc（和某人聊过）、rumor（听到传闻）、object（看过某样东西）。
//
// 这个文件只有规则、没有界面：委托板界面、镇上的 NPC、存档都读这里的判定。

export const LEVELS = ["L1", "L2", "L3", "L4"];
export const levelRank = (level) => {
  const index = LEVELS.indexOf(String(level || "").toUpperCase());
  return index < 0 ? 0 : index + 1;
};

/** "data-flow:L2" → { id, level } */
export function parseNeed(need) {
  const text = String(need ?? "").trim();
  if (!text) return null;
  const cut = text.lastIndexOf(":");
  if (cut < 0) return { id: text, level: "L1" };
  const level = text.slice(cut + 1).toUpperCase();
  return { id: text.slice(0, cut), level: LEVELS.includes(level) ? level : "L1" };
}

const asSet = (value) => (value instanceof Set ? value : new Set(Array.isArray(value) ? value : []));

/** 一份委托的规格（数据里可以只写你会用到的那几项）。 */
export function normalizeQuest(quest = {}) {
  return {
    id: String(quest.id || ""),
    title: quest.title || quest.id || "",
    giver: quest.giver || "",
    discover: quest.discover || "board",
    needs: Array.isArray(quest.needs) ? quest.needs : [],
    after: Array.isArray(quest.after) ? quest.after : [],
    knowledge: Array.isArray(quest.knowledge) ? quest.knowledge : [],
    repeatable: quest.repeatable === true,
    replayOf: quest.replayOf || null,
  };
}

/**
 * 玩家状态：
 *   discovered: 见到的任务来源（"rumor:x" / "npc:小雨"）
 *   completed:  { questId: true } 或 { questId: { depth: 3 } }
 *   knowledge:  { "data-flow": "L2" }
 */
export function normalizePlayer(player = {}) {
  return {
    discovered: asSet(player.discovered),
    completed: player.completed || {},
    knowledge: player.knowledge || {},
  };
}

const knowledgeLevel = (player, id) => player.knowledge?.[id] ?? "";

/** 一个来源是否已经见过：discover 写 "rumor:x" 时，玩家必须见过 "rumor:x"，写 "board" 视为天生可见。 */
export function sourceSeen(quest, playerState = {}) {
  const player = normalizePlayer(playerState);
  const source = String(quest?.discover || "board");
  if (source === "board") return true;
  return player.discovered.has(source) || player.discovered.has(source.split(":")[0]);
}

/** 委托当前的状态与原因。 */
export function questState(input, playerState = {}) {
  const quest = normalizeQuest(input);
  const player = normalizePlayer(playerState);

  if (player.completed[quest.id] && !quest.repeatable) {
    return { id: quest.id, quest, status: "done", reasons: [], missing: [] };
  }
  if (!sourceSeen(quest, player)) {
    return { id: quest.id, quest, status: "undiscovered", reasons: [`还没找到委托来源（${quest.discover}）`], missing: [] };
  }

  const missing = [];
  for (const id of quest.after) if (!player.completed[id]) missing.push(`先完成 ${id}`);
  for (const need of quest.needs) {
    const parsed = parseNeed(need);
    if (!parsed) continue;
    if (levelRank(knowledgeLevel(player, parsed.id)) < levelRank(parsed.level)) missing.push(`${parsed.id} 要到 ${parsed.level}`);
  }

  return missing.length
    ? { id: quest.id, quest, status: "locked", reasons: missing, missing }
    : { id: quest.id, quest, status: "available", reasons: [], missing: [] };
}

/**
 * 板上现在能接的任务。越接近「正好比现有水平高一层」的排越前——这就是顺序自由时的引导。
 */
export function availableQuests(quests = [], playerState = {}) {
  const player = normalizePlayer(playerState);
  return quests
    .map((quest) => questState(quest, player))
    .filter((state) => state.status === "available")
    .map((state) => ({ ...state, gain: knowledgeGain(state.quest, player) }))
    .sort((a, b) => b.gain.score - a.gain.score || a.id.localeCompare(b.id));
}

/**
 * 一份委托能把玩家的知识点往前推多少：只差一层的算满分（脚手架刚好），差两层算半分，已到顶层算 0。
 */
export function knowledgeGain(input, playerState = {}) {
  const quest = normalizeQuest(input);
  const player = normalizePlayer(playerState);
  let score = 0;
  const items = [];
  for (const entry of quest.knowledge) {
    const id = typeof entry === "string" ? entry : entry.id;
    const target = typeof entry === "string" ? "L3" : entry.depth || "L3";
    const current = levelRank(knowledgeLevel(player, id));
    const step = levelRank(target) - current;
    if (step <= 0) continue;
    score += step === 1 ? 2 : 1;
    items.push({ id, from: LEVELS[current - 1] || "", to: target });
  }
  return { score, items };
}

/** 推荐接下来接什么：只有可接的才推荐，最多三个。 */
export function recommendQuests(quests = [], playerState = {}, limit = 3) {
  return availableQuests(quests, playerState).slice(0, Math.max(0, limit));
}

/** 复勘的任务：可以重做，但跟着它复勘的那一份走。 */
export function replayableQuests(quests = [], playerState = {}) {
  const player = normalizePlayer(playerState);
  return quests
    .map((quest) => normalizeQuest(quest))
    .filter((quest) => {
      if (!quest.repeatable) return false;
      const source = quest.replayOf || quest.id;
      return Boolean(player.completed[source]) || quest.after.every((id) => player.completed[id]);
    });
}

const STATUS_ORDER = { available: 0, locked: 1, undiscovered: 2, done: 3 };

/**
 * 委托板上的一行（界面直接用）。可接的排前面，同样可接的按「刚好高一层」排。
 * label 是给玩家看的整行文字；reason 是接不了时的原因。
 */
export function boardLines(quests = [], playerState = {}) {
  return quests
    .map((input) => {
      const quest = normalizeQuest(input);
      const state = questState(quest, playerState);
      const gain = knowledgeGain(quest, playerState);
      const teaches = (quest.knowledge || []).map((entry) => `${entry.id}:${entry.depth}`).join(" · ");
      return {
        id: quest.id,
        title: quest.title,
        giver: quest.giver,
        status: state.status,
        reason: state.reasons[0] || "",
        teaches,
        gain,
        label:
          state.status === "available"
            ? `${quest.title} · ${quest.giver}`
            : state.status === "locked"
              ? `${quest.title} · 还差：${state.reasons[0]}`
              : state.status === "undiscovered"
                ? `${quest.title} · 还没听说`
                : `${quest.title} · 已完成`,
      };
    })
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.gain.score - a.gain.score || a.id.localeCompare(b.id));
}
