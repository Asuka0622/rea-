import { test } from "node:test";
import assert from "node:assert/strict";
import { caseCatalog } from "../lib/cases.mjs";
import { LAB_KINDS, MOUNTABLE_KINDS } from "../public/case-labs.js";
import { DEMO_CASES } from "../public/game-quests.js";

test("every demo case has a hands-on lab that runs the sample's own files", () => {
  const catalog = caseCatalog();
  for (const id of DEMO_CASES) {
    const lab = catalog.find((c) => c.id === id)?.game?.lab;
    assert.ok(lab, `${id} has a lab`);
    assert.ok(LAB_KINDS.includes(lab.kind), `${id}: ${lab.kind}`);
    for (const file of lab.files) assert.ok(lab.sources[file]?.length, `${id}: ${file} is loaded`);
    assert.ok(lab.intro?.length && lab.done?.length, `${id} has lines around the lab`);
  }
});

test("each lab finds what it needs in the sample code", () => {
  const byKind = Object.fromEntries(caseCatalog().filter((c) => c.game?.lab).map((c) => [c.game.lab.kind, c.game.lab.sources]));
  // 小账本: both addresses, the hidden timer and the page the lab runs.
  assert.match(byKind.network["main.js"], /SYNC_URL = "https:\/\/[^"]+"/);
  assert.match(byKind.network["main.js"], /STATS_URL = "https:\/\/[^"]+"/);
  assert.match(byKind.network["renderer.js"], /setInterval\(\(\) => window\.helper\.peek\(\), 30000\)/);
  assert.match(byKind.network["index.html"], /<script src="renderer\.js"><\/script>/);
  // 像素计算器: the message, the secret keys, the debug hash and the unlock channel.
  assert.match(byKind.calculator["renderer.js"], /display === "1314520"/);
  assert.match(byKind.calculator["renderer.js"], /screen\.textContent = "[^"]+"/);
  assert.match(byKind.calculator["renderer.js"], /location\.hash === "#\/__debug"/);
  assert.match(byKind.calculator["main.js"], /"debug:unlock-pro"/);
  // 种田存档: the salt is one line of save.js, and the save is this format.
  assert.equal(byKind.save["save.js"].split("\n").filter((line) => /const SAVE_SALT\s*=\s*"[^"]+"/.test(line)).length, 1);
  const packed = JSON.parse(Buffer.from(byKind.save["saves/slot1.sav"], "base64").toString("utf8"));
  assert.equal(typeof packed.body, "string");
  assert.equal(typeof JSON.parse(packed.body).gold, "number");
});

test("catching the ledger in the act: each claim only accepts the record that really proves it", async () => {
  const { networkProves, NETWORK_CLAIMS } = await import("../public/case-labs.js");
  const ctx = { syncUrl: "https://api.ledger-sync.example/v1/sync", statsUrl: "https://collect.quiet-stats.example/v2/report", bait: "诱饵-AB12" };
  const startup = { kind: "net", url: ctx.statsUrl, body: { device: {}, clipboard: "" } };
  const later = { kind: "net", url: ctx.statsUrl, body: { device: {}, clipboard: "诱饵-AB12" } };
  const sync = { kind: "net", url: ctx.syncUrl, body: [{ note: "奶茶", amount: 18 }] };
  const emptySync = { kind: "net", url: ctx.syncUrl, body: [] };
  const peek = { kind: "clip", text: "诱饵-AB12" };
  const emptyPeek = { kind: "clip", text: "" };
  assert.deepEqual(NETWORK_CLAIMS.map((c) => c.id), ["online", "peek", "exfil", "control"]);
  assert.equal(networkProves("online", startup, ctx).ok, true);
  assert.equal(networkProves("online", sync, ctx).ok, false, "a sync the user pressed is not 'online without asking'");
  assert.equal(networkProves("peek", peek, ctx).ok, true);
  assert.equal(networkProves("peek", emptyPeek, ctx).ok, false, "reading an empty clipboard proves nothing was taken");
  assert.equal(networkProves("exfil", startup, ctx).ok, false, "the first startup report is still empty: the twist");
  assert.equal(networkProves("exfil", peek, ctx).ok, false, "reading is not sending");
  const caught = networkProves("exfil", later, ctx);
  assert.equal(caught.ok, true);
  assert.equal(caught.baited, true);
  assert.equal(networkProves("control", sync, ctx).ok, true);
  assert.equal(networkProves("control", emptySync, ctx).ok, false);
  assert.equal(networkProves("control", startup, ctx).ok, false);
});

test("pixel calculator: searching the shipped code backs each rumour, and only removing the backdoors passes", async () => {
  const { CALC_RUMORS, searchCalc, judgePatch } = await import("../public/case-labs.js");
  const { caseCatalog } = await import("../lib/cases.mjs");
  const sources = caseCatalog().find((c) => c.id === "calculator-eggs").game.lab.sources;
  // every rumour's line exists in the sample, and a plain search word finds it
  const words = { egg: "display", rainbow: "SECRET_KEYS", debug: "hash", devtools: "globalShortcut", pro: "unlock" };
  for (const r of CALC_RUMORS) {
    assert.ok(sources[r.file].split("\n").some((l) => r.needle.test(l)), `${r.id} is in ${r.file}`);
    assert.ok(searchCalc(sources, words[r.id]).found.some((f) => f.id === r.id), `searching ${words[r.id]} backs ${r.id}`);
  }
  assert.equal(searchCalc(sources, "彩蛋").hits.length, 0, "the shipped code has no Chinese comments to search");
  assert.equal(judgePatch(new Set(["debug", "devtools", "pro"])).ok, true);
  assert.deepEqual(judgePatch(new Set(["debug", "devtools"])).doorsLeft, ["pro"]);
  assert.deepEqual(judgePatch(new Set(["debug", "devtools", "pro", "egg"])).eggsLost, ["egg"]);
});

test("farm save editor: the game reads saves the way save.js does, and each developer question has one right answer", async () => {
  const { gameReadsSave, searchSaveCode, SAVE_DEFENSE } = await import("../public/case-labs.js");
  const { fromBase64, toBase64, checksum } = await import("../public/save-lab.js");
  const { caseCatalog } = await import("../lib/cases.mjs");
  const sources = caseCatalog().find((c) => c.id === "farm-save").game.lab.sources;
  const salt = sources["save.js"].match(/const SAVE_SALT\s*=\s*"([^"]+)"/)[1];
  const raw = sources["saves/slot1.sav"].trim();
  const original = await gameReadsSave(raw, salt);
  assert.equal(original.ok, true);
  const outer = JSON.parse(fromBase64(raw));
  const body = JSON.stringify({ ...JSON.parse(outer.body), gold: 9999 });
  const naive = await gameReadsSave(toBase64(JSON.stringify({ ...outer, body })), salt);
  assert.equal(naive.reason, "checksum", "changing gold without a new checksum is caught");
  const fixed = await gameReadsSave(toBase64(JSON.stringify({ ...outer, body, sum: await checksum(salt, body) })), salt);
  assert.equal(fixed.ok, true);
  assert.equal(fixed.state.gold, 9999);
  assert.equal((await gameReadsSave(JSON.stringify(outer), salt)).reason, "format", "a save that was not encoded back is not read");
  assert.ok(searchSaveCode(sources["save.js"], "SALT").some((hit) => hit.text.includes(salt)));
  assert.equal(searchSaveCode(sources["save.js"], "校验码").length, 0, "the shipped code has no Chinese comments");
  for (const q of SAVE_DEFENSE) assert.equal(q.options.filter((o) => o.ok).length, 1, q.id);
});

test("chained labs: every stage of every case is a known lab, and its story lines are dialogue lines", () => {
  const speakers = new Set([undefined, "client", "xiaoke", "xingbo"]);
  const lines = (list, where) => {
    for (const l of list || []) {
      assert.equal(typeof l.text, "string", where);
      assert.ok(speakers.has(l.who), `${where}: ${l.who}`);
    }
  };
  for (const item of caseCatalog()) {
    for (const talk of Object.values(item.game?.lab?.talk || {})) lines(talk, `${item.id} talk`);
    for (const key of ["pipes", "tower"]) for (const talk of Object.values(item.game?.lab?.[key]?.talk || {})) lines(talk, `${item.id} ${key} talk`);
    for (const talk of Object.values(item.game?.lab?.manageTalk || {})) lines(talk, `${item.id} manage talk`);
    for (const [i, stage] of (item.game?.lab?.stages || []).entries()) {
      const where = `${item.id} stage ${i}`;
      assert.ok(MOUNTABLE_KINDS.includes(stage.kind), `${where}: ${stage.kind}`);
      assert.ok(stage.title, `${where} has a title for the progress bar`);
      lines(stage.intro, where);
      lines(stage.outro, where);
      for (const talk of Object.values(stage.talk || {})) lines(talk, `${where} talk`);
    }
  }
  const ledger = caseCatalog().find((c) => c.id === "privacy-ledger").game.lab;
  assert.deepEqual(ledger.stages.map((s) => s.kind), ["network", "rhythm"]);
  for (const round of ledger.firewall.rounds) for (const key of ["intro", "pass", "fail"]) lines(round[key], `firewall ${key}`);
});

test("puzzle cases: every confront answer can be found (a shipped code line or a sandbox evidence), and epilogues are well formed", async () => {
  const { shippedLines } = await import("../public/case-puzzle.js");
  const speakers = new Set([undefined, "client", "xiaoke", "xingbo"]);
  for (const item of caseCatalog()) {
    const puzzle = item.game?.puzzle;
    if (!puzzle?.scene) continue;
    const texts = [...shippedLines(item.game.lab.sources).map((l) => l.text), ...(puzzle.labEvidence || []).map((e) => e.text)];
    for (const statement of puzzle.confront?.statements || []) {
      for (const answer of statement.accept || []) assert.ok(texts.some((t) => t.includes(answer)), `${item.id}: 「${answer}」 cannot be found anywhere`);
    }
    for (const term of puzzle.terms) assert.ok(shippedLines(item.game.lab.sources).some((l) => l.text.includes(term)), `${item.id}: term ${term} is not in the code`);
    if (puzzle.epilogue) {
      for (const key of ["offer", "hook", "done"]) for (const l of puzzle.epilogue[key] || []) assert.ok(typeof l.text === "string" && speakers.has(l.who), `${item.id} epilogue ${key}`);
      for (const stage of puzzle.epilogue.stages) assert.ok(MOUNTABLE_KINDS.includes(stage.kind));
    }
  }
  const grandma = caseCatalog().find((c) => c.id === "flashlight-apk").game;
  assert.deepEqual(grandma.lab.stages.map((s) => s.kind), ["permissions", "tower"]);
  assert.equal(grandma.puzzle.epilogue.stages[0].kind, "manage");
});
