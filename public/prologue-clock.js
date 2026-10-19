// 两个钟（docs/story-prologue.md 第 1 节）：小镇的时间（导航栏）一直在走，一天天过去、早中晚夜轮换；
// 钟楼的钟单独停在 11:58，只有找回一个时代才往前走 20 秒。序章里时间推进：1 秒 = 1 游戏分钟，一天约 24 分钟。
// 需要特定时刻的剧情（守夜要在深夜）用 skipTo 跳过去，画面由外壳淡出淡入。

export const TOWER_STOP = 11 * 60 + 58; // 钟楼的钟面：看上去是 11:58，其实是某天夜里的 23:58 停的
export const DAY = 24 * 60;

/** 一天里的哪一段：画面用它调光（白天不调）。 */
export function daypart(minutes) {
  const m = ((minutes % DAY) + DAY) % DAY;
  if (m < 5 * 60) return "night";
  if (m < 7 * 60) return "dawn";
  if (m < 17 * 60) return "day";
  if (m < 19 * 60) return "dusk";
  return "night";
}

/**
 * 跳到某个时刻：今天还没到就跳到今天的那一刻，已经过了就跳到明天的那一刻。
 * nextDay: 强制跳到第二天（守夜之后「第二天清晨」）。
 */
export function skipTo(clock, minutes, { nextDay = false } = {}) {
  const day = nextDay || clock.minutes >= minutes ? clock.day + 1 : clock.day;
  return { day, minutes };
}

export const clockLabel = (minutes) => `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
