import test from "node:test";
import assert from "node:assert/strict";
import { caseCatalog } from "../lib/cases.mjs";
import { FX_TYPES } from "../public/story-fx.js";
import { DEMO_QUEST } from "../public/game-quests.js";

function* fxIn(node) {
  if (Array.isArray(node)) for (const v of node) yield* fxIn(v);
  else if (node && typeof node === "object") {
    if (node.fx) for (const f of [].concat(node.fx)) yield f;
    for (const v of Object.values(node)) yield* fxIn(v);
  }
}

test("story fx: every effect named in the story data is one the shell can play", () => {
  let count = 0;
  for (const source of [...caseCatalog().map((c) => c.game), DEMO_QUEST]) {
    for (const f of fxIn(source)) {
      const type = typeof f === "string" ? f : f.type;
      assert.ok(FX_TYPES.includes(type), `unknown fx: ${type}`);
      if (type === "clue") assert.ok(f.text, "a clue card says what the clue is");
      if (type === "wall") assert.ok(f.cards?.length >= 2 && f.cards.length <= 5);
      if (type === "clock") assert.match(f.time, /^\d{2}:\d{2}$/);
      count += 1;
    }
  }
  assert.ok(count >= 15, `only ${count} effects in the story`);
});

test("story fx: each of the six prologue cases leaves its main-plot clue as a clue card", () => {
  for (const id of ["privacy-ledger", "farm-save", "calculator-eggs", "weather-keys", "notes-versions", "flashlight-apk"]) {
    const game = caseCatalog().find((c) => c.id === id).game;
    assert.ok([...fxIn(game)].some((f) => f.type === "clue"), id);
  }
});
