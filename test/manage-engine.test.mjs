import test from "node:test";
import assert from "node:assert/strict";
import { createManageRun } from "../public/manage-engine.js";

// 按一份计划把八个版本发完；fix(run) 在每版发布前可以动清单。
function play(plan, fix = () => {}) {
  const run = createManageRun();
  for (const option of plan) {
    if (run.state.status !== "playing") break;
    run.choose(option);
    fix(run);
    run.release();
  }
  return run;
}

test("manage: a clean flashlight with plain ads survives every review with full stars", () => {
  const run = play(["minimal", "banner", "both", "widget", "refuse", "coarse", "later", "ship"]);
  assert.equal(run.state.status, "won");
  assert.equal(run.score().stars, 4);
  assert.equal(run.unexplained().length, 0);
});

test("manage: taking every offer gets the app delisted, and earning nothing goes broke", () => {
  assert.equal(play(["all", "quickads", "both", "boot", "sell", "fine", "skip", "ship"]).state.status, "delisted");
  assert.equal(play(["minimal", "none", "sos", "widget", "refuse", "city", "skip", "ship"]).state.status, "broke");
});

test("manage: QuickAds merges its hidden permissions into the manifest; scanning shows them first", () => {
  const run = createManageRun();
  run.choose("minimal");
  run.release();
  assert.deepEqual(run.scan("quickads").sort(), ["ACCESS_FINE_LOCATION", "INTERNET", "READ_CONTACTS", "READ_PHONE_STATE", "RECEIVE_BOOT_COMPLETED"]);
  run.choose("quickads");
  const bad = run.unexplained().map((row) => row.id).sort();
  assert.deepEqual(bad, ["ACCESS_FINE_LOCATION", "READ_CONTACTS", "READ_PHONE_STATE", "RECEIVE_BOOT_COMPLETED"], "only INTERNET is explained by the ads");
});

test("manage: keeping QuickAds past a warning gets delisted; dropping it after the warning still wins", () => {
  assert.equal(play(["minimal", "quickads", "sos", "widget", "refuse", "coarse", "skip", "ship"]).state.status, "delisted");
  const fixed = play(["minimal", "quickads", "sos", "widget", "refuse", "coarse", "skip", "ship"], (run) => {
    if (run.state.version === 4) {
      assert.deepEqual(run.removePerm("READ_CONTACTS"), ["quickads"], "removing an SDK permission stops the SDK");
      run.setAds("banner");
    }
  });
  assert.equal(fixed.state.status, "won");
  assert.equal(fixed.state.warned, true);
});

test("manage: a permission is fine when a visible feature uses it — phone state for call-flash, coarse location for nearby shops", () => {
  const run = createManageRun();
  run.choose("minimal");
  run.release();
  run.choose("banner");
  run.release();
  run.choose("both");
  assert.ok(run.manifest().find((row) => row.id === "READ_PHONE_STATE").explained);
  const fine = createManageRun({ cards: [{ version: 1, options: [{ id: "f", feature: "nearbyFine" }, { id: "c", feature: "nearbyCoarse" }] }] });
  fine.choose("f");
  assert.deepEqual(fine.unexplained().map((row) => row.id), ["ACCESS_FINE_LOCATION"]);
  fine.choose("c");
  assert.deepEqual(fine.unexplained(), [], "changing the pick undoes the previous one");
});

test("manage: removing the camera turns the lamp off — on many phones the flash needs it", () => {
  const run = createManageRun();
  run.choose("minimal");
  assert.deepEqual(run.removePerm("CAMERA"), ["lamp"]);
  const week = run.release();
  assert.equal(week.growth, 0);
  assert.equal(week.income, 0);
});

test("manage: selling contacts is exposed on release", () => {
  const run = play(["minimal", "banner", "sos", "widget", "sell", "coarse", "later", "ship"]);
  assert.equal(run.state.exposed, true);
  assert.ok(run.score().stars < 4);
});
