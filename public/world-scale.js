// 世界尺度：地图多大、密度够不够、跑起来烦不烦
//
// 结论先写在这：**地图放大不贵**（镜头跟随早就有了，视野只有 640×360，960×540 的图本来就只能看到 2/3），
// 贵的是「放大之后每一屏都得有事可做」。所以这个文件只管两件事：
//   · 密度：按 640×360 的视野切格子，数每格里有多少可交互点；
//   · 脚步：基础速度、冲刺倍率、横穿一张图要多久。
//
// 纯函数，测试直接跑这里。

/** 实际能看到的视野（地图像素）。镜头跟着玩家走，一屏就这么大。 */
export const VIEW = { w: 640, h: 360 };

export const BASE_SPEED = 72; // 地图像素/秒
export const SPRINT_MULTIPLIER = 1.6;

/** 每一屏至少要有几个可交互点（目标）。低于这个数，玩家会觉得「走了半天什么都没有」。 */
export const MIN_INTERACTIVES_PER_VIEW = 2;

/** 硬底线：不许有整屏空着。低于这个数，那一屏必须补东西（彩蛋最便宜）。 */
export const HARD_FLOOR_PER_VIEW = 1;

/** 推荐的地图尺寸：1440×810（2.25 屏宽）。再大就得配冲刺，否则跑图烦。 */
export const RECOMMENDED_SIZE = { w: 1440, h: 810 };

export const sprintSpeed = (base = BASE_SPEED) => Math.round(base * SPRINT_MULTIPLIER);

/** 横穿一张图要多少秒（不冲刺 / 冲刺）。 */
export function crossSeconds(width, base = BASE_SPEED) {
  return {
    walk: Math.round(width / base),
    sprint: Math.round(width / sprintSpeed(base)),
  };
}

/**
 * 一个区域里所有「能碰的东西」：建筑门、NPC、可调查物、收集物。
 * `region.objects` 是给地图上的小东西用的（石头、海报、旧报纸），格式 { id, x, y, kind? }；
 * `extras` 是外面传进来的补充点（彩蛋就从这个口子进来）。
 */
export function interactivesOf(region = {}, extras = []) {
  const spots = Object.entries(region.spots || {}).map(([id, spot]) => ({
    id,
    x: spot.door?.x ?? spot.x ?? 0,
    y: spot.door?.y ?? spot.y ?? 0,
    kind: spot.soon || spot.placeholder ? "closed" : "place",
  }));
  const objects = (region.objects || []).map((object) => ({ ...object, kind: object.kind || "object" }));
  return [...spots, ...objects, ...extras];
}

/**
 * 按视野切格子数密度。返回每格的坐标、可交互点数和 id 列表，外加两个判定：
 *   meetsHard —— 没有整屏空着（硬底线）
 *   meets     —— 每屏都达到目标数
 */
export function densityReport(region = {}, size = { w: 960, h: 540 }, extras = []) {
  const points = interactivesOf(region, extras);
  const cols = Math.max(1, Math.ceil(size.w / VIEW.w));
  const rows = Math.max(1, Math.ceil(size.h / VIEW.h));
  const cells = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const box = { x: col * VIEW.w, y: row * VIEW.h, w: VIEW.w, h: VIEW.h };
      const inside = points.filter((point) => point.x >= box.x && point.x < box.x + box.w && point.y >= box.y && point.y < box.y + box.h);
      cells.push({ ...box, count: inside.length, ids: inside.map((point) => point.id) });
    }
  }
  const empty = cells.filter((cell) => cell.count === 0);
  const worst = cells.reduce((low, cell) => (cell.count < low.count ? cell : low), cells[0]);
  return {
    cells,
    points: points.length,
    empty: empty.length,
    worst,
    meetsHard: empty.length === 0 && worst.count >= HARD_FLOOR_PER_VIEW,
    meets: empty.length === 0 && worst.count >= MIN_INTERACTIVES_PER_VIEW,
  };
}

/** 给一句话建议：这张图该补什么。 */
export function densityAdvice(report) {
  if (report.meets) return "密度够了：每一屏都有东西可碰。";
  if (report.empty) return `有 ${report.empty} 屏是空的，先在这些位置放可调查物或收集物。`;
  return `还有 ${report.cells.filter((cell) => cell.count < MIN_INTERACTIVES_PER_VIEW).length} 屏不到 ${MIN_INTERACTIVES_PER_VIEW} 个，够用但还空。`;
}
