// 可交互的场景物件：能坐的长椅、能摸的井沿、喷泉
//
// 和彩蛋的区别：彩蛋是捡走一句就没了，场景是**可以反复用**的——
// 坐下来会真的把人放上去，站起来才能继续走。它不推进任何东西，纯粹让地图"能用"。
//
// 数据 + 纯函数；渲染和输入在 game-shell.js。

// 2026-10-19 对着现在运行的旧五区图核过：能坐的只放在图上真画了座位的地方（中心广场的四条长椅），坐标是座面中心。
// 河堤、码头、秋千、钟楼台阶四处在旧图上没有座位，坐上去就是坐在泥地上，先改成「看看」，标 later: "sit"：
// 九区新图同步进来后（town-v2-plan.json 里有码头长椅、共用长椅等），按新图的座位落点改回「坐」。
export const SCENERY = [
  { id: "bench-plaza", region: "center", x: 430, y: 238, kind: "sit", label: "广场边的长椅", lines: ["坐下来，喷泉的声音比想象中大。", "路过的人好像都在赶时间。"] },
  { id: "bench-plaza-2", region: "center", x: 534, y: 238, kind: "sit", label: "事务所门前的长椅", lines: ["从这儿正好能看见事务所的招牌。", "放大镜招牌被太阳晒得发白了。"] },
  { id: "bench-plaza-3", region: "center", x: 420, y: 339, kind: "sit", label: "南边的长椅", lines: ["鸽子在脚边绕了一圈，发现没有吃的，走了。"] },
  { id: "bench-plaza-4", region: "center", x: 543, y: 339, kind: "sit", label: "公告板旁的长椅", lines: ["公告板上的广告换了一张，还是那家「悄悄统计」。"] },
  { id: "fountain", region: "center", x: 486, y: 270, kind: "touch", label: "广场喷泉", lines: ["水是凉的。池底有一枚硬币，正面朝上。"] },
  { id: "bench-south", region: "south", x: 430, y: 300, kind: "touch", later: "sit", label: "河堤边", lines: ["风从河面上过来，带着一点凉。", "对岸的灯塔白天不亮。"] },
  { id: "pier", region: "south", x: 520, y: 386, kind: "touch", later: "sit", label: "岸边的草丛", lines: ["水草在动。有条小鱼停了一下，又游走了。"] },
  { id: "swing-craft", region: "craft", x: 500, y: 420, kind: "touch", later: "sit", label: "画室门口的花丛", lines: ["叶子上有几点颜料，像是谁甩笔时溅上的。"] },
  { id: "lamp-craft", region: "craft", x: 200, y: 200, kind: "touch", label: "手艺街的路灯", lines: ["灯罩里有只飞蛾，一直在转。"] },
  { id: "well", region: "homes", x: 770, y: 296, kind: "touch", label: "农场的水井", lines: ["井口有风，带着潮气。喊一声，回声多响了一下。"] },
  { id: "steps-north", region: "north", x: 700, y: 300, kind: "touch", later: "sit", label: "钟楼下", lines: ["抬头正好能看见停住的钟面。", "地上的石板被磨得发亮。这里站过很多人。"] },
];

export const sceneryInRegion = (region) => SCENERY.filter((prop) => prop.region === region);
export const sceneryById = (id) => SCENERY.find((prop) => prop.id === id) || null;

/** 坐下的提示语：坐着的时候按移动键会站起来。 */
export const promptFor = (prop) => (prop.kind === "sit" ? `坐下 · ${prop.label}` : `看看 · ${prop.label}`);

/**
 * 坐下/起来的小状态机。sitting 是当前坐着的物件 id 或 null。
 * 返回 { sitting, line, stoodUp }：line 是要说的那句话。
 */
export function sitDown(sitting, prop) {
  if (!prop) return { sitting, line: "", stoodUp: false };
  return { sitting: prop.id, line: prop.lines?.[0] || "", stoodUp: false };
}

export function standUp(sitting) {
  if (!sitting) return { sitting: null, line: "", stoodUp: false };
  return { sitting: null, line: "", stoodUp: true };
}
