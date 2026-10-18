// 跑一遍全镇，报每张图的探索密度（建筑门 + 地图物件 + 彩蛋）
// 用法：node scripts/world-density.mjs
import { REGIONS, REGION_SIZE } from "../public/game-regions.js";
import { EASTER_EGGS } from "../public/easter-eggs.js";
import { densityReport, densityAdvice, crossSeconds, RECOMMENDED_SIZE, MIN_INTERACTIVES_PER_VIEW } from "../public/world-scale.js";

const eggsOf = (name) => EASTER_EGGS.filter((egg) => egg.region === name).map((egg) => ({ id: egg.id, x: egg.x, y: egg.y, kind: "egg" }));
const town = Object.entries(REGIONS).filter(([, region]) => !region.era);

console.log("分区密度（视野 640×360，建筑门 + 彩蛋都算可交互点）\n");
let hardOk = 0;
for (const [name, region] of town) {
  const report = densityReport(region, REGION_SIZE, eggsOf(name));
  const cross = crossSeconds(REGION_SIZE.w);
  if (report.meetsHard) hardOk += 1;
  console.log(
    `${name.padEnd(8)} 可交互 ${String(report.points).padStart(2)} · ${report.cells.length} 屏 · 空格 ${report.empty} · 底线 ${report.meetsHard ? "过" : "不过"} · 目标 ${report.meets ? "过" : "未达"} · 横穿 ${cross.walk}s（冲刺 ${cross.sprint}s）`,
  );
  console.log(`         ${densityAdvice(report)}`);
  if (report.worst?.ids?.length) console.log(`         最空的一屏：${report.worst.ids.join("、")}`);
}

console.log(`\n硬底线（每屏 ≥1）通过：${hardOk} / ${town.length} 个分区`);
console.log(`目标（每屏 ≥${MIN_INTERACTIVES_PER_VIEW}）是给功能区的；过渡区和野地先守住硬底线。`);
const now = crossSeconds(REGION_SIZE.w);
const next = crossSeconds(RECOMMENDED_SIZE.w);
console.log(`\n现在一张图 ${REGION_SIZE.w}×${REGION_SIZE.h}，横穿 ${now.walk}s（冲刺 ${now.sprint}s）`);
console.log(`推荐扩到 ${RECOMMENDED_SIZE.w}×${RECOMMENDED_SIZE.h}，横穿 ${next.walk}s（冲刺 ${next.sprint}s）`);
