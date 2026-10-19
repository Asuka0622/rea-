// Aggregate only controllable, foreground town play. No input log or coordinates are saved.
export const HABITS_KEY = 'rea-demo-habits-v1';
const seconds = value => Number.isFinite(value) ? Math.max(0, Math.min(1e7, value)) : 0;
const fields = ['activeSeconds','moveSeconds','nightMoveSeconds','dawnMoveSeconds','sprintSeconds','rainMoveSeconds','idleSeconds','longestIdleSeconds','idleBouts'];
export function cleanHabits(value = {}) {
  return { version: 1, ...Object.fromEntries(fields.map(key => [key, seconds(value?.[key])])), regions: [...new Set(Array.isArray(value?.regions) ? value.regions.filter(x => typeof x === 'string').slice(0,40) : [])] };
}
export function createHabitRecorder(storage = globalThis.localStorage) {
  let initial; try { initial = JSON.parse(storage?.getItem(HABITS_KEY) || 'null'); } catch {}
  let data = cleanHabits(initial?.version === 1 ? initial : {}), idle = 0, dirtySeconds = 0;
  const snapshot = () => cleanHabits(data);
  const flush = () => { if (!dirtySeconds) return; try { storage?.setItem(HABITS_KEY, JSON.stringify(data)); dirtySeconds = 0; } catch {} };
  return {
    snapshot, flush,
    reset() { data = cleanHabits(); idle = 0; dirtySeconds = 1; flush(); },
    step({ dt, active, moving = false, sprinting = false, period = null, region = null, weather = null }) {
      // A suspended tab or a delayed frame must never become hours of presumed idling.
      if (!active || !Number.isFinite(dt) || dt <= 0 || dt > 1) { idle = 0; return; }
      data.activeSeconds += dt; dirtySeconds += dt;
      if (region && !data.regions.includes(region)) data.regions.push(region);
      if (moving) {
        idle = 0; data.moveSeconds += dt;
        if (period === 'night') data.nightMoveSeconds += dt;
        if (period === 'dawn') data.dawnMoveSeconds += dt;
        if (sprinting) data.sprintSeconds += dt;
        if (['rain','rainy','storm'].includes(weather)) data.rainMoveSeconds += dt;
      } else {
        const before = idle; idle += dt;
        data.longestIdleSeconds = Math.max(data.longestIdleSeconds, idle);
        data.idleSeconds += Math.max(0, idle - 15) - Math.max(0, before - 15);
        if (before < 30 && idle >= 30) data.idleBouts += 1;
      }
      if (dirtySeconds >= 10) flush();
    },
  };
}
export function habitNotes(raw) {
  const data = cleanHabits(raw), result = [];
  if (data.longestIdleSeconds >= 45) result.push({ title: '发呆观察员', text: `你曾在小镇里连续站了 ${Math.floor(data.longestIdleSeconds)} 秒。小克在一旁等了一会儿，终于问：“路米，这片风景里也藏着线索吗？”也许你在思考案情，也许只是想歇一会儿。`, basis: `前台可操作时，连续静止至少45秒；菜单、对白、演出与后台不计。累计静止段 ${Math.floor(data.idleBouts)} 次。` });
  if (data.nightMoveSeconds >= 20 && data.nightMoveSeconds / Math.max(1,data.moveSeconds) >= .5) result.push({ title: '比特镇夜猫子', text: `有 ${Math.floor(data.nightMoveSeconds)} 秒，你在夜色里走动。镇上的灯比居民更常见到你的身影。小克批注：晚睡不一定有线索，但路灯真的很认识你。`, basis: '游戏内夜间实际移动至少20秒，且占已记录移动时间的一半以上；剧情跳时本身不计。' });
  if (data.dawnMoveSeconds >= 20 && data.dawnMoveSeconds / Math.max(1,data.moveSeconds) >= .5) result.push({ title: '赶在早餐前的侦探', text: '你常在晨光里走动。面包还没出炉，你已经开始让脚印替小镇签到。', basis: '游戏内黎明实际移动至少20秒，且占移动时间的一半以上。' });
  if (data.sprintSeconds >= 20 && data.sprintSeconds / Math.max(1,data.moveSeconds) >= .6) result.push({ title: '赶路小旋风', text: '你移动的时候常常在跑。委托人刚准备招手，风已经替你打完了招呼。', basis: '前台实际跑动至少20秒，且占移动时间六成以上；顶墙按键不算移动。' });
  if (data.regions.length >= 4) result.push({ title: '转角巡逻员', text: `你走过了 ${data.regions.length} 片街区。事务所的巡逻范围，已经快跟不上你的好奇心。`, basis: '前台自由探索中进入至少4个不同分区，同一分区重复经过不重复计数。' });
  if (data.rainMoveSeconds >= 15) result.push({ title: '雨中散步派', text: '雨落下来的时候，你仍在镇上走动。雨点负责敲屋檐，你负责给小镇添脚步声。', basis: '地图明确提供降雨状态时，在户外实际移动至少15秒；未知天气不作推断。' });
  return result.slice(0,3);
}
