import { test } from "node:test";
import assert from "node:assert/strict";
import { lumiArt, loadLook, saveLook, LOOK_KEY } from "../public/lumi-look.js";
import { DEMO_QUEST, MAIN_QUEST, REA_QUEST } from "../public/game-quests.js";

const memory = (init = {}) => {
  const data = { ...init };
  return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
};

test("路米的样子：只认女生和男生，存取都容错", () => {
  const store = memory();
  assert.equal(loadLook(store), null);
  assert.equal(saveLook("m", store), true);
  assert.equal(loadLook(store), "m");
  assert.equal(saveLook("x", store), false);
  assert.equal(loadLook(memory({ [LOOK_KEY]: "robot" })), null);
  assert.equal(loadLook({ getItem: () => { throw new Error("blocked"); } }), null);
});

test("男版的图到一张用一张，没到的那张继续用女版", () => {
  const has = (name) => ["lumi-m-normal", "anim-lumi-m"].includes(name);
  assert.equal(lumiArt("lumi-normal", { look: "m", has }), "lumi-m-normal");
  assert.equal(lumiArt("lumi-happy", { look: "m", has }), "lumi-happy");
  assert.equal(lumiArt("anim-lumi", { look: "m", has }), "anim-lumi-m");
  assert.equal(lumiArt("anim-lumi-unified", { look: "m", has }), "anim-lumi-unified");
  assert.equal(lumiArt("lumi-normal", { look: "f", has }), "lumi-normal");
  assert.equal(lumiArt("lumi-normal", { look: null, has }), "lumi-normal");
  // 别人的名字里带不带 lumi 都不碰
  assert.equal(lumiArt("xiaoke-normal", { look: "m", has: () => true }), "xiaoke-normal");
  assert.equal(lumiArt("illumination", { look: "m", has: () => true }), "illumination");
});

test("玩家就是路米：路米的台词不再把玩家当成另一个助手", () => {
  const lines = [];
  const walk = (o) => {
    if (Array.isArray(o)) return o.forEach(walk);
    if (o && typeof o === "object") {
      if (typeof o.text === "string" && (!o.who || o.who === "lumi")) lines.push(o.text);
      Object.values(o).forEach(walk);
    }
  };
  walk([DEMO_QUEST, MAIN_QUEST, REA_QUEST]);
  assert.ok(lines.length > 40);
  for (const text of lines) assert.doesNotMatch(text, /当我的助手|我有东西要给你|是你的了|你已经会查了|你已经能看懂/, text);
  for (const chapter of [...DEMO_QUEST.chapters, ...REA_QUEST.chapters]) for (const step of chapter.steps) assert.doesNotMatch(step.goal, /找路米|向路米/, step.goal);
});

test("见习侦探徽章由铁叔捎来，他也先交代了钟楼钥匙（守夜后才能说「天一亮就去找铁叔」）", () => {
  const interlude = DEMO_QUEST.chapters.find((c) => c.id === "d-interlude");
  assert.equal(interlude.badge?.id, "rea-detective");
  const smith = interlude.done.filter((l) => l.who === "smith").map((l) => l.text).join("");
  assert.match(smith, /徽章/);
  assert.match(smith, /钥匙/);
  const prologue = DEMO_QUEST.chapters.find((c) => c.id === "d-prologue");
  assert.ok(prologue.steps[0].done.some((l) => l.who === "xiaoke"), "小克在序章登场");
});
