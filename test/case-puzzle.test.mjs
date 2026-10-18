import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { caseCatalog } from "../lib/cases.mjs";
import { shippedLines, searchCode, termsIn, checkGroup, blanksOf, breaks } from "../public/case-puzzle.js";

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pixelDir = path.join(project, "public", "art", "pixel");
const puzzles = caseCatalog().filter((c) => c.game?.puzzle);

test("there is at least one puzzle case, and it has a lab", () => {
  assert.ok(puzzles.length);
  for (const item of puzzles) assert.ok(item.game.lab?.sources, item.id);
});

test("the shipped code has no developer comments", () => {
  for (const item of puzzles) for (const line of shippedLines(item.game.lab.sources)) assert.ok(!/^\s*\/\//.test(line.text), `${item.id}: ${line.text}`);
});

test("every collectable name is in the shipped code, and every board answer can be collected", () => {
  for (const item of puzzles) {
    const { terms, board } = item.game.puzzle;
    const code = shippedLines(item.game.lab.sources);
    const found = new Set(code.flatMap((line) => termsIn(line.text, terms).filter((p) => typeof p !== "string").map((p) => p.term)));
    for (const term of terms) assert.ok(found.has(term), `${item.id}: "${term}" can be clicked somewhere`);
    for (const group of board) {
      const answers = blanksOf(group.text);
      for (const answer of answers) assert.ok(terms.includes(answer), `${item.id}: answer ${answer} is a term`);
      assert.ok(checkGroup(group, answers).ok);
      assert.equal(checkGroup(group, answers.map(() => "x")).wrong, answers.length);
      assert.ok(group.hint && group.explain, `${item.id}: ${group.title} has a hint and an explanation`);
    }
  }
});

/** Names the notebook's dictionary can lead to, searching the way the terminal does (results show two
 *  lines either side, comments are skipped). Used to check that answers and evidence are reachable. */
function reachableFromDictionary(item) {
  const { terms, scene } = item.game.puzzle;
  const code = shippedLines(item.game.lab.sources);
  const queue = scene.items.flatMap((t) => t.clue?.dict || []).flatMap((d) => d.code.split(" / "));
  const searched = new Set();
  const reached = new Set();
  while (queue.length) {
    const word = queue.shift();
    if (searched.has(word)) continue;
    searched.add(word);
    for (const hit of searchCode(code, word).hits) {
      for (let n = hit.n - 2; n <= hit.n + 2; n += 1) {
        const text = hit.all[n - 1];
        if (!text || /^\s*(\/\/|<!--)/.test(text)) continue;
        for (const part of termsIn(text, terms)) if (typeof part !== "string" && !reached.has(part.term)) (reached.add(part.term), queue.push(part.term));
      }
    }
  }
  return reached;
}

test("starting from the dictionary, searching (results show two lines either side) reaches every board answer", () => {
  for (const item of puzzles) {
    const reached = reachableFromDictionary(item);
    for (const group of item.game.puzzle.board) for (const answer of blanksOf(group.text)) assert.ok(reached.has(answer), `${item.id}: ${answer} can be found by searching`);
  }
});

test("in the room, every prop and the client can be walked up to on its own", () => {
  for (const item of puzzles) {
    const { room, scene } = item.game.puzzle;
    const spots = [...scene.items.map((t) => ({ id: t.id, x: t.stand[0], y: t.stand[1] })), { id: "client", ...room.client }];
    for (const spot of spots) assert.ok(spot.y >= room.top && spot.y <= 178 && spot.x > 14 && spot.x < 306, `${item.id}: ${spot.id} stands on the floor`);
    for (const a of spots) for (const b of spots) if (a.id < b.id) assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 24, `${item.id}: ${a.id} and ${b.id} are too close`);
  }
});

test("every word in the little dictionary finds something in the code", () => {
  for (const item of puzzles) {
    const code = shippedLines(item.game.lab.sources);
    for (const thing of item.game.puzzle.scene.items) {
      for (const entry of thing.clue?.dict || []) for (const word of entry.code.split(" / ")) assert.ok(searchCode(code, word).hits.length, `${item.id}: ${word}`);
    }
  }
});

test("every false claim can be broken by a line of shipped code or the lab's evidence, and true ones by nothing", () => {
  for (const item of puzzles) {
    const { confront, labEvidence = [] } = item.game.puzzle;
    // Cases may end without a confrontation (the "not enough evidence" station): nothing to break.
    if (!confront) continue;
    const evidence = [...shippedLines(item.game.lab.sources).map((l) => ({ text: l.text.trim() })), ...labEvidence];
    const falseOnes = confront.statements.filter((s) => s.accept);
    assert.ok(falseOnes.length >= 2 && falseOnes.length < confront.statements.length, `${item.id}: some claims are true`);
    for (const statement of confront.statements) {
      assert.ok(statement.press?.length, `${item.id}: ${statement.text} can be pressed`);
      if (statement.accept) {
        assert.ok(evidence.some((e) => breaks(statement, e)), `${item.id}: ${statement.text}`);
        assert.ok(statement.broken?.length && statement.hint);
      } else assert.ok(!evidence.some((e) => breaks(statement, e)));
    }
  }
});

test("search: Chinese finds nothing in the shipped code; too many hits are cut", () => {
  const item = puzzles.find((c) => c.id === "privacy-ledger");
  const code = shippedLines(item.game.lab.sources);
  assert.equal(searchCode(code, "剪贴板").hits.length, 0);
  assert.ok(searchCode(code, "clipboard").hits.length > 0);
  assert.ok(searchCode(code, "e").more > 0);
  assert.deepEqual(termsIn('"helper:peek-clipboard"', ["peek", "helper:peek-clipboard", "clipboard"]), ['"', { term: "helper:peek-clipboard" }, '"']);
});

test("every case room points at artwork that is really in the project", () => {
  for (const item of puzzles) {
    const { scene } = item.game.puzzle;
    if (scene.art) assert.ok(fs.existsSync(path.join(pixelDir, `${scene.art}.png`)), `${item.id}: background ${scene.art} is missing`);
    for (const thing of scene.items) {
      const art = thing.art || thing.id;
      if (thing.art) assert.ok(fs.existsSync(path.join(pixelDir, "case-props", `${art}.png`)), `${item.id}: ${thing.id} wants case-props/${art}.png`);
    }
  }
});

test("every prop hangs on the canvas, and nobody has to stand inside the furniture", () => {
  for (const item of puzzles) {
    const { room, scene } = item.game.puzzle;
    const blocks = room.blocks || [];
    // The same test the shell walks with: half width 9, feet 5 above the block's bottom edge.
    // Props themselves may sit on a bed or a desk, which is what the blocks cover; people may not.
    const inside = (x, y) => blocks.some((b) => x + 9 > b.x && x - 9 < b.x + b.w && y > b.y && y - 5 < b.y + b.h);
    for (const thing of scene.items) {
      const [x, y] = thing.at;
      assert.ok(x > 0 && x < 320 && y > 0 && y < 180, `${item.id}: ${thing.id} is drawn at ${x},${y}`);
      assert.ok(!inside(thing.stand[0], thing.stand[1]), `${item.id}: ${thing.id}'s stand is inside furniture`);
    }
    assert.ok(!inside(room.client.x, room.client.y), `${item.id}: the client stands inside furniture`);
    assert.ok(!blocks.some((b) => room.exit.y > b.y && room.exit.y - 5 < b.y + b.h && room.exit.x + 9 > b.x && room.exit.x - 9 < b.x + b.w), `${item.id}: the door is behind furniture`);
  }
});
