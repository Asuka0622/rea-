import { test } from "node:test";
import assert from "node:assert/strict";
import { caseCatalog } from "../lib/cases.mjs";
import { LAB_KINDS } from "../public/case-labs.js";
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
