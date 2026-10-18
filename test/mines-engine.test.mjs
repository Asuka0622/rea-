import test from "node:test";
import assert from "node:assert/strict";
import {
  createMines,
  defaultMines,
  reveal,
  toggleFlag,
  minesSummary,
  around,
  cellAt,
  seeded,
  MINES_LIVES,
} from "../public/mines-engine.js";

// 六乘六的盘面，固定种子，测试看得到确定的结果。
const fixed = () => createMines(defaultMines(), 7);

test("the board places every risk once and fills the rest with safe items", () => {
  const board = fixed();
  const risks = board.cells.filter((c) => c.risk);
  assert.equal(risks.length, defaultMines().risks.length);
  assert.equal(board.riskCount, risks.length);
  assert.equal(board.cells.filter((c) => c.safe).length, board.size * board.size - risks.length);
  for (const cell of board.cells.filter((c) => !c.risk)) {
    assert.ok(cell.safe?.label, "a safe cell needs a label");
    assert.ok(cell.safe.note, "a safe cell needs a note explaining why it is fine");
  }
  for (const cell of risks) assert.ok(cell.risk.why, "a risk needs a reason it is dangerous");
});

test("the same seed lays out the same board, a different seed does not", () => {
  const a = createMines(defaultMines(), 42);
  const b = createMines(defaultMines(), 42);
  const c = createMines(defaultMines(), 43);
  const layout = (board) => board.cells.map((cell) => (cell.risk ? "R" : ".")).join("");
  assert.equal(layout(a), layout(b));
  assert.notEqual(layout(a), layout(c));
  assert.equal(seeded(9)(), seeded(9)(), "the generator is reusable per seed");
});

test("numbers count the risks in the eight neighbouring cells", () => {
  const board = fixed();
  for (const cell of board.cells) {
    const expected = around(board, cell.x, cell.y).filter((n) => n.risk).length;
    assert.equal(cell.around, expected);
  }
  // 一个有风险项旁边一定数字大于零；全盘的风险都算进了某个邻居。
  for (const risk of board.cells.filter((c) => c.risk)) {
    assert.ok(around(board, risk.x, risk.y).length > 0);
  }
});

test("opening a safe cell costs nothing and a zero flips its neighbours", () => {
  const board = fixed();
  const zero = board.cells.find((c) => !c.risk && c.around === 0);
  assert.ok(zero, "a 6x6 with 8 risks still has a zero cell");
  const { opened, hit } = reveal(board, zero.x, zero.y);
  assert.equal(hit, null);
  assert.equal(board.lives, MINES_LIVES);
  assert.ok(opened.length >= 1);
  assert.equal(cellAt(board, zero.x, zero.y).state, "open");
  // 连片展开出来的格子一定都是安全的。
  for (const cell of opened) assert.equal(cell.risk, null);
});

test("opening a risk costs a life, records why, and three of them end the run", () => {
  const board = fixed();
  const risks = board.cells.filter((c) => c.risk);
  const first = reveal(board, risks[0].x, risks[0].y);
  assert.equal(first.hit.id, risks[0].risk.id);
  assert.equal(board.lives, MINES_LIVES - 1);
  assert.match(board.notes.at(-1).text, /./);
  assert.equal(board.status, "playing");
  reveal(board, risks[1].x, risks[1].y);
  reveal(board, risks[2].x, risks[2].y);
  assert.equal(board.lives, 0);
  assert.equal(board.status, "lost");
  // 输掉以后不能再翻、也不能再插旗。
  const after = reveal(board, risks[3].x, risks[3].y);
  assert.equal(after.opened.length, 0);
  assert.equal(board.lives, 0);
});

test("flagging is reversible, counts flags, and flagging every risk wins", () => {
  const board = fixed();
  const risks = board.cells.filter((c) => c.risk);
  toggleFlag(board, risks[0].x, risks[0].y);
  assert.equal(risks[0].state, "flag");
  toggleFlag(board, risks[0].x, risks[0].y);
  assert.equal(risks[0].state, "hidden");
  for (const risk of risks) toggleFlag(board, risk.x, risk.y);
  assert.equal(board.status, "won");
  assert.equal(minesSummary(board).found, risks.length);
  assert.equal(toggleFlag(board, risks[0].x, risks[0].y).cell.state, "flag", "a won board ignores further flags");
});

test("flagging does not open a cell and opening clears nothing", () => {
  const board = fixed();
  const safe = board.cells.find((c) => !c.risk);
  toggleFlag(board, safe.x, safe.y);
  assert.equal(safe.state, "flag");
  assert.equal(reveal(board, safe.x, safe.y).opened.length, 0, "a flagged cell is not opened by a click");
  assert.equal(board.opened, 0);
});

test("the summary counts found, stepped and safe items honestly", () => {
  const board = fixed();
  const risks = board.cells.filter((c) => c.risk);
  const safe = board.cells.filter((c) => !c.risk);
  // A numbered safe cell avoids clearing the board before testing hits and flags.
  const numberedSafe = safe.find((c) => c.around > 0);
  assert.ok(numberedSafe);
  reveal(board, numberedSafe.x, numberedSafe.y);
  reveal(board, risks[0].x, risks[0].y);
  toggleFlag(board, risks[1].x, risks[1].y);
  // 连片展开会翻开一片安全格，挑一个还没翻开的来标（标安全项要记进 flaggedSafe）。
  const markable = safe.find((c) => c.state === "hidden");
  toggleFlag(board, markable.x, markable.y);
  const s = minesSummary(board);
  assert.equal(s.stepped, 1);
  assert.equal(s.found, 1);
  assert.equal(s.flaggedSafe, 1);
  assert.ok(s.safeOpened >= 1);
  assert.equal(s.riskCount, risks.length);
  assert.equal(s.status, "playing");
});

test("a custom lab can size the board and give its own items", () => {
  const board = createMines({ size: 5, safe: [{ id: "a", label: "普通项", note: "没毛病" }], risks: [{ id: "x", label: "危险项", why: "不该有" }] }, 3);
  assert.equal(board.size, 5);
  assert.equal(board.cells.length, 25);
  assert.equal(board.cells.filter((c) => c.risk).length, 1);
  assert.equal(board.cells.filter((c) => c.safe).length, 24);
});
