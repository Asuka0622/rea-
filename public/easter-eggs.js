// 彩蛋：地图上、房间里、NPC 嘴边的小东西
//
// 目的有两个：一是让「自由探索」有回报（走到角落里有东西可碰），二是给世界观留伏笔
// （钟楼停在 11:58 这件事，可以提前用彩蛋埋好几次，而不是只在主线里说）。
//
// 彩蛋不进任务系统、不算知识点、不卡流程：看见就捡，捡到记一笔。
// 纯数据 + 纯函数，渲染在 game-shell.js，测试只跑这里。

export const EGG_STORAGE_KEY = "rea-eggs";

/**
 * 一张地图上的彩蛋。坐标是地图像素（960×540 内）。
 * kind 只影响文案：object（东西）/ note（字）/ place（地点）。
 */
export const EASTER_EGGS = [
  { id: "fountain-coin", region: "center", x: 486, y: 292, kind: "object", title: "喷泉底的硬币", text: "正面朝上。有人许过一个关于「让时间倒回去」的愿。" },
  { id: "board-back", region: "center", x: 596, y: 262, kind: "note", title: "公告板背面", text: "铅笔写的四个字：11:58 不是中午。字迹被雨水泡过。" },
  { id: "office-door", region: "center", x: 487, y: 196, kind: "object", title: "事务所门把手", text: "把手上刻着一个很小的 R，边缘被摸得发亮。" },
  { id: "lost-cat", region: "homes", x: 342, y: 178, kind: "note", title: "单元门口的寻猫启事", text: "「橘猫，尾巴尖有一撮白。走失于 11:58。」你抬头，窗台上正好有一只。" },
  { id: "three-marbles", region: "homes", x: 300, y: 300, kind: "object", title: "门口的三颗弹珠", text: "摆成一条直线。像是谁在等谁，等得无聊了。" },
  { id: "well-echo", region: "homes", x: 770, y: 320, kind: "place", title: "农场的水井", text: "你往井里喊了一声，回声比你多响了一下。" },
  { id: "old-resistor", region: "craft", x: 330, y: 182, kind: "object", title: "一盒旧电阻", text: "标签上写着「1% 误差」。铁叔说，剩下的 99% 全靠人。" },
  { id: "blank-page", region: "craft", x: 786, y: 410, kind: "note", title: "空白打印页", text: "背面有一行铅笔字：今天也没人来。落款是一个没写完的签名。" },
  { id: "clock-shadow", region: "north", x: 736, y: 276, kind: "place", title: "钟楼的影子", text: "影子落在地上，指针一样指向 11:58。太阳动了，影子没动。" },
  { id: "binary-stone", region: "north", x: 586, y: 300, kind: "object", title: "刻着数字的石头", text: "01001000 01001001 —— 按 ASCII 读，是 HI。刻得很浅，像是不想被人发现。" },
  { id: "reed-whistle", region: "south", x: 430, y: 124, kind: "place", title: "芦苇丛", text: "折一根芦苇就能吹响。声音很轻，河对岸应该听不见。" },
  { id: "boat-name", region: "south", x: 500, y: 404, kind: "object", title: "旧船的船头", text: "船头写着「比特号」，字被水泡花了。缆绳还是新的。" },
  // 下面这些是为了「每一屏都有东西可碰」（docs/world-scale.md 的密度底线）补的。
  { id: "lucky-cat", region: "center", x: 700, y: 330, kind: "object", title: "工具铺后巷的招财猫", text: "举的是左手。铁叔说举左手的招财猫招的是客人，举右手的招的是钱——这只同时举了两只。" },
  { id: "post-stamp", region: "center", x: 240, y: 430, kind: "object", title: "驿站门口的邮戳台", text: "木头被压出一个凹坑。最早的那枚邮戳，年份已经磨平了。" },
  { id: "old-scale", region: "center", x: 760, y: 450, kind: "object", title: "诊所的旧体重秤", text: "指针停在 11:58——不是坏，是秤砣被人卸了。" },
  { id: "shoe-cabinet", region: "homes", x: 180, y: 460, kind: "object", title: "楼道里的旧鞋柜", text: "最下面那双小鞋，鞋底还是干净的。" },
  { id: "bench-archive", region: "homes", x: 860, y: 470, kind: "object", title: "档案馆外的长椅", text: "椅背上刻着两个人的名字，中间划了一道。" },
  { id: "paint-lid", region: "craft", x: 860, y: 300, kind: "object", title: "窗台上的颜料盖", text: "干掉的蓝色，边缘留着一圈指纹。" },
  { id: "wood-shavings", region: "craft", x: 120, y: 470, kind: "object", title: "木工坊门口的刨花", text: "卷成一圈一圈，像一句没说完的话。" },
  { id: "north-signpost", region: "north", x: 300, y: 470, kind: "object", title: "北坡路口的路牌", text: "指向钟楼的那一根被人摸得发亮，别的都蒙着灰。" },
  { id: "tower-nail", region: "north", x: 800, y: 480, kind: "object", title: "钟楼下的告示钉", text: "钉子上挂过很多张纸，纸都没了，钉子还在。" },
  { id: "old-rod", region: "south", x: 800, y: 200, kind: "object", title: "河堤上的旧钓竿", text: "线还垂在水里，浮标不动。线的主人大概已经回家吃饭了。" },
  { id: "lighthouse", region: "south", x: 820, y: 460, kind: "place", title: "对岸的灯塔", text: "白天不亮。可你盯着它看久了，会觉得它也在看你。" },
];

export const eggsInRegion = (region) => EASTER_EGGS.filter((egg) => egg.region === region);
export const eggById = (id) => EASTER_EGGS.find((egg) => egg.id === id) || null;

/** 已捡到的彩蛋（localStorage 里存 id 数组）。 */
export function loadFound(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(EGG_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function saveFound(found = [], storage = globalThis.localStorage) {
  try {
    storage?.setItem(EGG_STORAGE_KEY, JSON.stringify([...new Set(found)]));
    return true;
  } catch {
    return false;
  }
}

/** 捡到一个：返回新的已捡清单（同一个不重复）。 */
export function collect(found = [], id) {
  if (!id || !eggById(id)) return [...new Set(found)];
  return [...new Set([...found, id])];
}

/** 某个分区还剩几个没捡 —— 事务所的收集册用它。 */
export function remainingIn(region, found = []) {
  return eggsInRegion(region).filter((egg) => !found.includes(egg.id)).length;
}
