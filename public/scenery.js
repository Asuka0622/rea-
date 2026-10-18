// 可交互的场景物件：能坐的长椅、能摸的井沿、能靠的码头
//
// 和彩蛋的区别：彩蛋是捡走一句就没了，场景是**可以反复用**的——
// 坐下来会真的把人放上去，站起来才能继续走。它不推进任何东西，纯粹让地图"能用"。
//
// 数据 + 纯函数；渲染和输入在 game-shell.js。

export const SCENERY = [
  { id: "bench-plaza", region: "center", x: 470, y: 250, kind: "sit", label: "广场边的长椅", lines: ["你坐下来。喷泉的声音比想象中大。", "路过的人好像都在赶时间。"] },
  { id: "fountain", region: "center", x: 486, y: 270, kind: "touch", label: "广场喷泉", lines: ["水是凉的。池底有一枚硬币，正面朝上。"] },
  { id: "bench-south", region: "south", x: 430, y: 300, kind: "sit", label: "河堤的长椅", lines: ["风从河面上过来，带着一点凉。", "对岸的灯塔白天不亮。"] },
  { id: "pier", region: "south", x: 520, y: 386, kind: "sit", label: "码头边", lines: ["你把脚垂在岸边。水草在动，鱼没上钩。"] },
  { id: "swing-craft", region: "craft", x: 500, y: 420, kind: "sit", label: "画室门口的木秋千", lines: ["秋千吱呀了一声，又停了。", "坐垫上有颜料的味道。"] },
  { id: "lamp-craft", region: "craft", x: 200, y: 200, kind: "touch", label: "手艺街的路灯", lines: ["灯罩里有只飞蛾，一直在转。"] },
  { id: "well", region: "homes", x: 770, y: 296, kind: "touch", label: "农场的水井", lines: ["井口有风，带着潮气。你喊了一声，回声多响了一下。"] },
  { id: "steps-north", region: "north", x: 700, y: 300, kind: "sit", label: "钟楼下的台阶", lines: ["台阶被磨得发亮。这里坐过很多人。", "抬头正好能看见停住的钟面。"] },
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
