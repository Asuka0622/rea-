// 地图分区: the town is five 960x540 maps (art by the other AI, public/art/pixel/regions/). Walking off
// a map's edge where a road leaves it takes you to the next one. Plain data, shared with
// scripts/build-walkmap.py (which reads building footprints from here to build collision and depth).
//
// spots: buildings, keyed by what they lead to: a place in SCENES (learn, home…), a case id (a client's
//   home), or a building that is not open yet (`soon`, with its own name). Footprint x, y, w, h in map
//   pixels (the roof's top 45% can be walked behind); `door` is where the player stands to go in.
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
    },
    obstacles: [{ x: 585, y: 270, w: 56, h: 24 }],
    open: [{ x: 445, y: 290, w: 95, h: 250 }], // the road south runs through deep shade
    exits: [{ x: 440, y: 530, w: 100, h: 10, to: "center", at: { x: 480, y: 80 } }],
  },
  south: {
    name: "南岸",
    spawn: { x: 430, y: 80 },
    spots: {},
    obstacles: [],
    exits: [{ x: 395, y: 0, w: 70, h: 10, to: "center", at: { x: 480, y: 500 } }],
  },
};

/** Which region a spot (building or case home) is in. */
export function regionOf(id) {
  return Object.keys(REGIONS).find((name) => REGIONS[name].spots[id]) || null;
}
