// 委托的压力层：行动点与心证。
//
// 之前的委托没有代价——调查不限次、搜索不限次、对质错了就重来，所以解谜没有张力。
// 现在每一份委托有行动点预算（调查/搜索/问路米都要花），对质有三条心证（出示错证据扣一条）。
// 预算用完不会卡住玩家，超支的部分直接计入星级；心证扣光则本次当庭失败，可以重来但记一次失误。
//
// 这个文件只有规则、没有界面：case-session.js 负责呈现，测试直接跑这里的函数。

export const BASE_BUDGET = { easy: 20, normal: 15, hard: 11 };
export const HEARTS = 3;
export const HINT_COST = 2;
export const ACTION_COST = 1;

/** 侦探工具：按已结案的委托数解锁，解锁后对之后每一份委托生效。 */
export const TOOLS = [
  { id: "magnifier", name: "放大镜", desc: "每份委托多 3 个行动点", clears: 1 },
  { id: "notepad", name: "速记本", desc: "问路米只花 1 个行动点", clears: 2 },
  { id: "alias", name: "终端别名", desc: "终端里可以直接用中文查代码", clears: 3 },
];

/** 已结案委托数 → 能用的工具。 */
export function unlockedTools({ clears = 0 } = {}) {
  return TOOLS.filter((tool) => clears >= tool.clears).map((tool) => tool.id);
}

/** 星级表（case id → 最好成绩）→ 结案数与最好成绩。 */
export function progressFromStars(stars = {}) {
  const list = Object.values(stars || {}).map((value) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.min(3, n)) : 0;
  });
  return {
    clears: list.filter((n) => n > 0).length,
    best: list.reduce((a, b) => Math.max(a, b), 0),
  };
}

export function createTension({ difficulty = "normal", tools = [], spent = 0, hearts = HEARTS, fails = 0 } = {}) {
  const budget = (BASE_BUDGET[difficulty] ?? BASE_BUDGET.normal) + (tools.includes("magnifier") ? 3 : 0);
  return {
    difficulty,
    tools: [...tools],
    budget,
    spent: Math.max(0, Number(spent) || 0),
    hearts: Number.isInteger(hearts) ? Math.max(0, Math.min(HEARTS, hearts)) : HEARTS,
    fails: Math.max(0, Number(fails) || 0),
  };
}

export const overBudget = (tension) => Math.max(0, tension.spent - tension.budget);
export const left = (tension) => Math.max(0, tension.budget - tension.spent);
export const actionCost = () => ACTION_COST;
export const hintCost = (tension) => (tension.tools.includes("notepad") ? 1 : HINT_COST);

/**
 * Spend action points. Never refuses: going past the budget is a star penalty, not a dead end
 * (a player who cannot search any more would be stuck with no way forward).
 */
export function spend(tension, cost = ACTION_COST) {
  const before = overBudget(tension);
  tension.spent = Math.max(0, tension.spent + Math.max(0, Number(cost) || 0));
  const after = overBudget(tension);
  return { spent: tension.spent, left: left(tension), over: after, wentOver: after > before };
}

/** A wrong piece of evidence costs one heart. Returns the hearts left. */
export function loseHeart(tension) {
  tension.hearts = Math.max(0, tension.hearts - 1);
  return tension.hearts;
}

/** After a lost confrontation: one heart back, the attempt stays on the record. */
export function retryConfront(tension) {
  tension.hearts = 1;
  tension.fails += 1;
  return tension;
}

/** Slips that cost stars: mistakes, asking 路米, and every point spent past the budget. */
export function slips(tension, { mistakes = 0, hints = 0 } = {}) {
  return Math.max(0, Number(mistakes) || 0) + Math.max(0, Number(hints) || 0) + overBudget(tension);
}

export function tensionStars(tension, { mistakes = 0, hints = 0 } = {}) {
  const total = slips(tension, { mistakes, hints });
  const raw = total <= 2 ? 3 : total <= 6 ? 2 : 1;
  return Math.max(1, raw - (tension.fails ? 1 : 0));
}

/**
 * 证据阈值：一条推理要盖章，手里得有足够证据。
 * A group with `need` cannot be stamped before that many pieces of evidence are in the notebook —
 * including the group that concludes 「证据不足」: even "I cannot tell" needs evidence.
 */
export function canStamp(group, evidenceCount) {
  const need = Number.isFinite(group?.need) ? Math.max(0, Math.trunc(group.need)) : 0;
  const have = Math.max(0, Number(evidenceCount) || 0);
  return { ok: have >= need, need, have };
}

/**
 * 终端别名：玩家只记得中文时，借手账里的小词典换成代码里的名字。
 * Only active when the `alias` tool is unlocked; ASCII queries pass through untouched.
 */
export function expandAlias(query, dict = [], tools = []) {
  const text = String(query ?? "").trim();
  if (!text || !tools.includes("alias")) return { query: text, expanded: false };
  if (/[A-Za-z]/.test(text)) return { query: text, expanded: false };
  const entry = (dict || []).find((item) => item && item.zh && item.code && text.includes(item.zh));
  if (!entry) return { query: text, expanded: false };
  const code = String(entry.code).split(/[\s、/,，]+/).filter(Boolean)[0];
  if (!code) return { query: text, expanded: false };
  return { query: text.replace(entry.zh, code), expanded: true, from: entry.zh, to: code };
}
