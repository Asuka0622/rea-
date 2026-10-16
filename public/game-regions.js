// 地图分区: the town is five 960x540 maps (art by the other AI, public/art/pixel/regions/). Walking off
// a map's edge where a road leaves it takes you to the next one. Plain data, shared with
// scripts/build-walkmap.py (which reads building footprints from here to build collision and depth).
//
// spots: buildings, keyed by what they lead to: a place in SCENES (learn, home…), a case id (a client's
//   home), or a building that is not open yet (`soon`, with its own name). Footprint x, y, w, h in map
//   pixels (the roof's top 45% can be walked behind); `door` is where the player stands to go in.
//   `placeholder`: a place in the story whose picture is not drawn yet; the game draws a stand-in.
// exits: an edge zone (x, y, w, h); stepping into it moves to region `to`, arriving at `at`.
// obstacles: things the picture-based collision misses (fountain, signboards).
// open: ground the picture-based collision takes for trees (a road in deep shade); always walkable.

export const REGION_SIZE = { w: 960, h: 540 };

export const REGIONS = {
  center: {
    name: "中心广场",
    spawn: { x: 480, y: 345 },
    spots: {
      learn: { x: 130, y: 25, w: 180, h: 145, door: { x: 220, y: 190 } },
      home: { x: 428, y: 55, w: 118, h: 110, door: { x: 487, y: 180 } },
      engines: { x: 678, y: 70, w: 178, h: 110, door: { x: 740, y: 196 } },
      clients: { x: 140, y: 240, w: 122, h: 118, door: { x: 203, y: 370 } },
      doctor: { x: 718, y: 255, w: 138, h: 120, door: { x: 772, y: 386 } },
    },
    obstacles: [{ x: 445, y: 252, w: 76, h: 52 }],
    exits: [
      { x: 440, y: 0, w: 80, h: 10, to: "north", at: { x: 492, y: 500 } },
      { x: 0, y: 150, w: 10, h: 60, to: "homes", at: { x: 915, y: 236 } },
      { x: 950, y: 205, w: 10, h: 60, to: "craft", at: { x: 45, y: 288 } },
      { x: 440, y: 530, w: 80, h: 10, to: "south", at: { x: 430, y: 80 } },
    ],
  },
  homes: {
    name: "住宅区",
    spawn: { x: 915, y: 236 },
    spots: {
      "privacy-ledger": { x: 262, y: 38, w: 166, h: 122, door: { x: 342, y: 172 } },
      "weather-keys": { x: 615, y: 60, w: 140, h: 105, door: { x: 676, y: 176 } },
      "calculator-eggs": { x: 250, y: 183, w: 112, h: 97, door: { x: 305, y: 292 } },
      "farm-save": { x: 722, y: 185, w: 94, h: 95, door: { x: 770, y: 312 } },
      "flashlight-apk": { x: 340, y: 310, w: 130, h: 100, door: { x: 397, y: 422 } },
      "real-stories": { x: 672, y: 325, w: 166, h: 120, door: { x: 757, y: 482 } },
    },
    obstacles: [],
    exits: [{ x: 950, y: 205, w: 10, h: 60, to: "center", at: { x: 45, y: 185 } }],
  },
  craft: {
    name: "手艺街",
    spawn: { x: 45, y: 288 },
    spots: {
      painter: { x: 225, y: 30, w: 185, h: 140, door: { x: 330, y: 176 }, soon: { place: "彩姐的画室", purpose: "开源创作软件（即将开放）" } },
      arcade: { x: 680, y: 40, w: 160, h: 120, door: { x: 740, y: 176 }, soon: { place: "像素游戏厅", purpose: "游戏与 Mod 案例（即将开放）" } },
      woodshop: { x: 195, y: 280, w: 195, h: 130, door: { x: 300, y: 420 }, soon: { place: "阿木的木工坊", purpose: "自己动手做一个（即将开放）" } },
      figures: { x: 680, y: 250, w: 185, h: 145, door: { x: 785, y: 406 }, soon: { place: "缝缝的手办店", purpose: "人物模型 Mod（即将开放）" } },
    },
    obstacles: [],
    exits: [{ x: 0, y: 260, w: 10, h: 60, to: "center", at: { x: 915, y: 236 } }],
  },
  north: {
    name: "北区",
    spawn: { x: 492, y: 500 },
    spots: {
      office: { x: 405, y: 45, w: 220, h: 165, door: { x: 505, y: 236 }, soon: { place: "周姐的办公楼", purpose: "上班族的大楼（即将开放）" } },
      // Drawn as a stand-in until its picture is in the region map (docs/story.md 第 11 节).
      clocktower: { x: 712, y: 150, w: 48, h: 108, door: { x: 736, y: 270 }, kind: "tower", placeholder: { place: "钟楼", purpose: "停摆了", line: "钟楼的门锁着，门上刻着一串 0 和 1。等铁叔回来，我们再想办法打开它。" } },
    },
    obstacles: [{ x: 585, y: 270, w: 56, h: 24 }],
    open: [{ x: 445, y: 290, w: 95, h: 250 }], // the road south runs through deep shade
    exits: [{ x: 440, y: 530, w: 100, h: 10, to: "center", at: { x: 480, y: 80 } }],
  },
  /* ----- era maps: reached by the clock tower's time machine, not by roads (docs/concept.md) ----- */
  "era-china": {
    name: "汴京 · 约 1088 年",
    era: "china",
    image: "eras/china/bianjing", // a stand-in drawn by scripts/make-placeholder-era.py until the real map arrives
    leaves: ["#f6c6d4", "#ffffff", "#f2a9bf"], // peach petals in late spring
    spawn: { x: 480, y: 440 },
    spots: {
      teahouse: { x: 296, y: 398, w: 128, h: 76, door: { x: 360, y: 490 }, label: { place: "柳娘子的茶铺", purpose: "州桥边的茶铺" } },
      "tower-site": { x: 646, y: 52, w: 64, h: 176, door: { x: 678, y: 242 }, label: { place: "水运仪象台工地", purpose: "苏颂、韩公廉在这里造钟楼" } },
      mathhall: { x: 220, y: 128, w: 140, h: 88, door: { x: 290, y: 226 }, soon: { place: "算学斋", purpose: "完整版开放" } },
      bookshop: { x: 560, y: 398, w: 120, h: 76, door: { x: 620, y: 490 }, soon: { place: "书坊", purpose: "完整版开放" } },
    },
    obstacles: [],
    exits: [],
  },
  south: {
    name: "南岸",
    // The painted bridge planks are traversable; the water classifier marks their shadows as blocked.
    open: [{ x: 411, y: 0, w: 36, h: 210 }],
    spawn: { x: 430, y: 80 },
    spots: {},
    obstacles: [],
    exits: [{ x: 395, y: 0, w: 70, h: 10, to: "center", at: { x: 480, y: 500 } }],
  },
};

/** The regions of Bit Town (no era) or of one era. */
export const regionsOf = (era = undefined) => Object.keys(REGIONS).filter((name) => REGIONS[name].era === era);

/** Which region a spot (building or case home) is in. */
export function regionOf(id) {
  return Object.keys(REGIONS).find((name) => REGIONS[name].spots[id]) || null;
}

/** Road links rendered on the town's region maps. Coordinates are centers of each edge zone. */
export function regionLinks(regionId, availableRegions = {}) {
  const region = REGIONS[regionId];
  if (!region) return [];
  return region.exits.filter((exit) => availableRegions[exit.to]).map((exit) => ({
    ...exit,
    label: availableRegions[exit.to],
    x: (exit.x + exit.w / 2) / REGION_SIZE.w * 100,
    y: (exit.y + exit.h / 2) / REGION_SIZE.h * 100,
  }));
}
