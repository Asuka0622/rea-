import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PROGRESS_KEY,
  emptyProgress,
  normalizeProgress,
  loadProgress,
  saveProgress,
  noticesFor,
  readNotices,
  markDiscovered,
  markAccepted,
  markCompleted,
  playerFor,
} from "../public/quest-progress.js";
import { boardLines } from "../public/quest-board.js";
import { PROLOGUE_QUESTS } from "../public/prologue-quests.js";

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = String(value);
    },
    data,
  };
}

test("progress round-trips through storage and survives junk", () => {
  const storage = fakeStorage();
  assert.deepEqual(loadProgress(storage), emptyProgress());

  const saved = saveProgress({ discovered: ["board"], completed: { "privacy-ledger": true } }, storage);
  assert.equal(saved, true);
  assert.deepEqual(loadProgress(storage), { discovered: ["board"], accepted: [], completed: { "privacy-ledger": true } });

  storage.data[PROGRESS_KEY] = "{oops";
  assert.deepEqual(loadProgress(storage), emptyProgress());

  assert.deepEqual(normalizeProgress({ discovered: ["a", "a", 3], completed: null }), { discovered: ["a"], accepted: [], completed: {} });
});

test("a commission taken in town stays on the tracker until it is closed", () => {
  const taken = markAccepted(markDiscovered(emptyProgress(), ["npc:朵朵"]), "farm-save");
  assert.deepEqual(taken.accepted, ["farm-save"]);
  assert.deepEqual(markAccepted(taken, "farm-save").accepted, ["farm-save"], "taking it twice does not stack");

  // 结案之后，追踪该自己收起来（旧存档里残留的 accepted 也要被清掉）。
  const closed = markCompleted(taken, "farm-save");
  assert.deepEqual(closed.accepted, []);
  assert.deepEqual(normalizeProgress({ accepted: ["farm-save"], completed: { "farm-save": true } }).accepted, []);
});

test("the notice board fills up as commissions get closed", () => {
  assert.deepEqual(noticesFor(emptyProgress()).map((n) => n.discover), ["rumor:计算器"]);
  const one = noticesFor({ completed: { "privacy-ledger": true } });
  assert.deepEqual(one.map((n) => n.discover), ["rumor:计算器", "npc:朵朵"]);
  const four = noticesFor({ completed: { a: true, b: true, c: true, d: true } });
  assert.equal(four.length, 4);
  assert.ok(four.every((n) => n.text && n.discover));
});

test("reading the board discovers each source once", () => {
  const first = readNotices(emptyProgress());
  assert.deepEqual(first.fresh, ["rumor:计算器"]);
  assert.ok(first.progress.discovered.includes("rumor:计算器"));

  const again = readNotices(first.progress);
  assert.deepEqual(again.fresh, []);
  assert.equal(again.progress.discovered.length, 1);
});

test("marking a discovery or a completion returns a new progress object", () => {
  const before = emptyProgress();
  const after = markDiscovered(before, ["npc:老秦", "npc:老秦"]);
  assert.deepEqual(after.discovered, ["npc:老秦"]);
  assert.deepEqual(before.discovered, [], "the old object is untouched");

  const done = markCompleted(after, "packed-echo");
  assert.deepEqual(done.completed, { "packed-echo": true });
});

test("the player state handed to the board carries the derived knowledge levels", () => {
  const player = playerFor({ completed: { "privacy-ledger": true } });
  assert.equal(player.knowledge["data-flow"], "L2");
  assert.equal(player.knowledge["permission-manifest"], "L1");
  assert.deepEqual(playerFor(emptyProgress()).knowledge, {});
});

test("board lines put what can be taken first and say what is missing", () => {
  const player = playerFor(emptyProgress());
  const lines = boardLines(PROLOGUE_QUESTS, player);
  const statuses = lines.map((line) => line.status);
  const firstLocked = statuses.indexOf("locked");
  const firstAvailable = statuses.indexOf("available");
  assert.ok(firstAvailable >= 0);
  assert.ok(firstLocked === -1 || firstAvailable < firstLocked, "available comes before locked");

  const available = lines.filter((line) => line.status === "available").map((line) => line.id).sort();
  assert.deepEqual(available, ["privacy-ledger", "weather-keys"]);

  const locked = lines.find((line) => line.status === "locked");
  assert.match(locked.label, /还差：/);
  assert.ok(locked.reason);

  const undiscovered = lines.find((line) => line.status === "undiscovered");
  assert.match(undiscovered.label, /还没听说/);
});
