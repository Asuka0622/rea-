import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createPermissionLab } from "../public/permission-lab.js";

const rows = JSON.parse(readFileSync(new URL("../samples/cases/flashlight-apk/workbench-case.json", import.meta.url), "utf8")).game.lab.permissions;
const extras = ["internet", "contacts", "location", "phone-state", "boot"];

test("permission lab: the lamp lights exactly when flashlight and camera are both kept", () => {
  const lab = createPermissionLab(rows);
  assert.equal(lab.run().lit, true);
  extras.forEach(lab.toggle);
  assert.equal(lab.run().lit, true);
  lab.toggle("camera");
  assert.equal(lab.run().lit, false);
});

test("permission lab: no verdict without an experiment, and a verdict against the evidence is a mistake", () => {
  const lab = createPermissionLab(rows);
  const blind = lab.judge("contacts", false);
  assert.equal(blind.ok, false);
  assert.equal(blind.noProof, true);
  assert.equal(lab.state.mistakes, 0, "being right without proof is not a mistake, just not enough");
  lab.toggle("contacts");
  lab.run();
  assert.equal(lab.judge("contacts", true).ok, false);
  assert.equal(lab.state.mistakes, 1);
  assert.equal(lab.judge("contacts", false).ok, true);
});

test("permission lab: a dark lamp only blames a permission once the others removed with it are cleared", () => {
  const lab = createPermissionLab(rows);
  ["camera", ...extras].forEach(lab.toggle);
  const dark = lab.run();
  assert.equal(dark.lit, false);
  assert.equal(lab.judge("camera", true).noProof, true, "six were removed: it could be any of them");
  lab.toggle("camera");
  lab.run();
  assert.equal(lab.judge("camera", true).ok, true, "the other five lit the lamp, so the dark run was the camera");
});

test("permission lab: four experiments are enough for all seven, and the reboot shows what boot is for", () => {
  const lab = createPermissionLab(rows);
  extras.forEach(lab.toggle);
  lab.run();
  extras.forEach(lab.toggle);
  lab.toggle("camera");
  lab.run();
  lab.toggle("camera");
  lab.toggle("flashlight");
  lab.run();
  for (const id of extras) assert.equal(lab.judge(id, false).ok, true, id);
  assert.equal(lab.judge("camera", true).ok, true);
  assert.equal(lab.judge("flashlight", true).ok, true);
  assert.equal(lab.state.done, true);
  assert.equal(lab.tapRuns(), 3);
  assert.equal(lab.state.seenUse.has("boot"), false);
  lab.toggle("flashlight");
  const boot = lab.run("reboot");
  assert.match(boot.lines.join(""), /BootReceiver/);
  assert.equal(lab.state.seenUse.has("boot"), true);
});
