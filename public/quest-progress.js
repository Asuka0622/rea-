// 委托进度与发现：谁的任务已经被你「找到」了
//
// 任务不是自动出现在板上的：要先在公告板上看到告示、或者听人提起。
// 这份文件负责三件事：存取进度、把告示变成 discovery、把进度换算成 quest-board.js 认识的玩家状态。
// 纯逻辑 + 可注入的 storage，测试不需要浏览器。

import { PROLOGUE_QUESTS, knowledgeFromCompletion } from "./prologue-quests.js";

export const PROGRESS_KEY = "rea-quest-progress";

// 三种状态：discovered（听说过）→ accepted（接下了，还没做完）→ completed（结案）。
// accepted 是「追踪」用的：原神接了任务会一直挂在任务栏，这里也一样——
// 当面托付和世界遭遇的委托都不在板上，接了之后得有地方一直提醒你去哪儿。
export function emptyProgress() {
  return { discovered: [], accepted: [], completed: {} };
}

export function normalizeProgress(value) {
  const raw = value && typeof value === "object" ? value : {};
  const completed = raw.completed && typeof raw.completed === "object" ? { ...raw.completed } : {};
  return {
    discovered: Array.isArray(raw.discovered) ? [...new Set(raw.discovered.filter((id) => typeof id === "string"))] : [],
    // 已结案的不再算「进行中」：旧存档里可能留着，这里顺手清掉。
    accepted: (Array.isArray(raw.accepted) ? [...new Set(raw.accepted.filter((id) => typeof id === "string"))] : []).filter((id) => !completed[id]),
    completed,
  };
}

export function loadProgress(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(PROGRESS_KEY);
    return normalizeProgress(raw ? JSON.parse(raw) : null);
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(progress, storage = globalThis.localStorage) {
  try {
    storage?.setItem(PROGRESS_KEY, JSON.stringify(normalizeProgress(progress)));
    return true;
  } catch {
    return false;
  }
}

/** 公告板上的告示：做完的委托越多，越多人来贴条子。 */
export function noticesFor(progress = emptyProgress()) {
  const done = Object.keys(normalizeProgress(progress).completed).length;
  const notices = [
    { at: 0, discover: "rumor:计算器", text: "小雨的计算器好像藏了东西，她愿意让人去看看。" },
    { at: 1, discover: "npc:朵朵", text: "朵朵托人带话：她的种田存档出了怪事。" },
    { at: 2, discover: "npc:王奶奶", text: "王奶奶家的手电筒一装就要通讯录，她想不明白。" },
    { at: 3, discover: "npc:老秦", text: "档案馆的老秦收来一个读不动的程序，问谁愿意试试。" },
  ];
  return notices.filter((notice) => done >= notice.at).map(({ discover, text }) => ({ discover, text }));
}

/** 把公告板上的告示记成「已发现」，返回新进度与这次新增的来源。 */
export function readNotices(progress = emptyProgress()) {
  const current = normalizeProgress(progress);
  const notices = noticesFor(current);
  const fresh = notices.map((notice) => notice.discover).filter((id) => !current.discovered.includes(id));
  if (fresh.length) current.discovered = [...current.discovered, ...fresh];
  return { progress: current, notices, fresh };
}

export function markDiscovered(progress, ids = []) {
  const current = normalizeProgress(progress);
  const seen = new Set(current.discovered);
  for (const id of ids) {
    if (typeof id !== "string" || seen.has(id)) continue;
    seen.add(id);
    current.discovered.push(id);
  }
  return current;
}

/** 接下一份委托（当面托付、或者事情撞上来）。板上的不用记——点一下就出发了。 */
export function markAccepted(progress, questId) {
  const current = normalizeProgress(progress);
  if (questId && !current.accepted.includes(questId) && !current.completed[questId]) current.accepted.push(questId);
  return current;
}

export function markCompleted(progress, questId) {
  const current = normalizeProgress(progress);
  if (!questId) return current;
  current.completed[questId] = true;
  current.accepted = current.accepted.filter((id) => id !== questId); // 结案了就从追踪上撤下来
  return current;
}

/** 转成 quest-board.js 的玩家状态：已发现来源、已接委托、已完成委托、以及从中推导出的知识点等级。 */
export function playerFor(progress = emptyProgress(), quests = PROLOGUE_QUESTS) {
  const current = normalizeProgress(progress);
  return {
    discovered: current.discovered,
    accepted: current.accepted,
    completed: current.completed,
    knowledge: knowledgeFromCompletion(quests, current.completed),
  };
}
