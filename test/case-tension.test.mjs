import { test } from "node:test";
import assert from "node:assert/strict";
import { caseCatalog } from "../lib/cases.mjs";
import { emptyCaseState, caseSnapshot, restoreCaseState } from "../public/case-progress.js";
import {
  BASE_BUDGET,
  HEARTS,
  TOOLS,
  createTension,
  spend,
  left,
  overBudget,
  hintCost,
  loseHeart,
  retryConfront,
  slips,
  tensionStars,
  unlockedTools,
  progressFromStars,
  expandAlias,
  canStamp,
} from "../public/case-tension.js";

test("budget follows the difficulty and the magnifier tool", () => {
  assert.equal(createTension({ difficulty: "easy" }).budget, BASE_BUDGET.easy);
  assert.equal(createTension({ difficulty: "normal" }).budget, BASE_BUDGET.normal);
  assert.equal(createTension({ difficulty: "hard" }).budget, BASE_BUDGET.hard);
  assert.equal(createTension({ difficulty: "nonsense" }).budget, BASE_BUDGET.normal);
  assert.equal(createTension({ difficulty: "hard", tools: ["magnifier"] }).budget, BASE_BUDGET.hard + 3);
});

test("spending never blocks the player; going past the budget is counted instead", () => {
  const tension = createTension({ difficulty: "hard" });
  const budget = tension.budget;
  for (let i = 0; i < budget; i += 1) {
    const result = spend(tension);
    assert.equal(result.wentOver, false);
  }
  assert.equal(left(tension), 0);
  const over = spend(tension);
  assert.equal(over.wentOver, true);
  assert.equal(over.over, 1);
  assert.equal(overBudget(tension), 1);
  // Still spends: a stuck player would have no way forward.
  assert.equal(spend(tension, 2).over, 3);
});

test("asking 路米 is cheaper with the notepad tool", () => {
  assert.equal(hintCost(createTension({})), 2);
  assert.equal(hintCost(createTension({ tools: ["notepad"] })), 1);
});

test("hearts fall one per wrong piece of evidence, and a retry keeps the attempt on record", () => {
  const tension = createTension({});
  assert.equal(tension.hearts, HEARTS);
  assert.equal(loseHeart(tension), HEARTS - 1);
  assert.equal(loseHeart(tension), HEARTS - 2);
  assert.equal(loseHeart(tension), 0);
  assert.equal(loseHeart(tension), 0, "hearts never go below zero");
  retryConfront(tension);
  assert.equal(tension.hearts, 1);
  assert.equal(tension.fails, 1);
});

test("stars come from mistakes, hints and the budget overshoot", () => {
  const clean = createTension({});
  assert.equal(tensionStars(clean), 3);
  assert.equal(tensionStars(clean, { mistakes: 2 }), 3);
  assert.equal(tensionStars(clean, { mistakes: 3 }), 2);
  assert.equal(tensionStars(clean, { mistakes: 3, hints: 3 }), 2);
  assert.equal(tensionStars(clean, { mistakes: 4, hints: 3 }), 1);

  const overspent = createTension({ difficulty: "hard" });
  spend(overspent, overspent.budget + 4);
  assert.equal(slips(overspent), 4);
  assert.equal(tensionStars(overspent), 2);
});

test("a lost confrontation lowers the rating but never below one star", () => {
  const tension = createTension({});
  tension.fails = 1;
  assert.equal(tensionStars(tension, { mistakes: 0 }), 2);
  assert.equal(tensionStars(tension, { mistakes: 9, hints: 9 }), 1);
});

test("tools unlock as cases get closed", () => {
  assert.deepEqual(unlockedTools({ clears: 0 }), []);
  assert.deepEqual(unlockedTools({ clears: 1 }), [TOOLS[0].id]);
  assert.deepEqual(unlockedTools({ clears: 2 }), TOOLS.slice(0, 2).map((t) => t.id));
  assert.deepEqual(unlockedTools({ clears: 9 }), TOOLS.map((t) => t.id));
});

test("progress is read from the saved star table", () => {
  assert.deepEqual(progressFromStars({}), { clears: 0, best: 0 });
  assert.deepEqual(progressFromStars({ a: 3, b: 1, c: 0 }), { clears: 2, best: 3 });
  assert.deepEqual(progressFromStars({ a: "2", b: null }), { clears: 1, best: 2 });
});

test("the alias tool turns a Chinese word into the code name from the notebook", () => {
  const dict = [{ zh: "剪贴板", code: "clipboard readText" }];
  assert.deepEqual(expandAlias("剪贴板", dict, []), { query: "剪贴板", expanded: false });
  const hit = expandAlias("剪贴板", dict, ["alias"]);
  assert.equal(hit.expanded, true);
  assert.equal(hit.query, "clipboard");
  assert.equal(hit.to, "clipboard");
  // Anything already in code terms passes through untouched.
  assert.equal(expandAlias("clipboard", dict, ["alias"]).expanded, false);
  assert.equal(expandAlias("剪贴板", [], ["alias"]).expanded, false);
});

test("the action budget and hearts survive a save and reload", () => {
  const item = caseCatalog().find((c) => c.game?.puzzle);
  assert.ok(item, "a puzzle case exists");
  const state = emptyCaseState(item);
  state.spent = 7;
  state.hearts = 1;
  state.fails = 2;
  const restored = restoreCaseState(item, caseSnapshot(item, state));
  assert.equal(restored.spent, 7);
  assert.equal(restored.hearts, 1);
  assert.equal(restored.fails, 2);
});

test("a corrupted save cannot hand out extra hearts or a negative budget", () => {
  const item = caseCatalog().find((c) => c.game?.puzzle);
  const state = emptyCaseState(item);
  state.hearts = 99;
  state.spent = -5;
  const restored = restoreCaseState(item, caseSnapshot(item, state));
  assert.equal(restored.hearts, 3);
  assert.equal(restored.spent, 0);
});

test("a deduction with an evidence threshold cannot be stamped early", () => {
  const gated = { need: 3 };
  assert.equal(canStamp(gated, 0).ok, false);
  assert.equal(canStamp(gated, 2).ok, false);
  assert.equal(canStamp(gated, 2).need, 3);
  assert.equal(canStamp(gated, 3).ok, true);
  assert.equal(canStamp(gated, 9).ok, true);
  // No threshold means the old behaviour: anything goes.
  assert.equal(canStamp({}, 0).ok, true);
  assert.equal(canStamp({ need: -4 }, 0).ok, true, "a nonsense threshold cannot block the player");
  assert.equal(canStamp({ need: 2 }, "3").ok, true, "counts are coerced");
});
