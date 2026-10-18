import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createTowerRun, waveRoster, waveText, upgradeCost, refundOf } from "../public/tower-engine.js";

const spec = JSON.parse(fs.readFileSync(new URL("../samples/cases/flashlight-apk/workbench-case.json", import.meta.url), "utf8").replace(/^﻿/, "")).game.lab.tower;

/** 用一个打法玩完一局：plan(run, 下一波) 在每波开始前布防。 */
function play(plan) {
  const run = createTowerRun(spec);
  while (run.state.status !== "won" && run.state.status !== "lost") {
    plan(run, run.waves[run.state.wave + 1]);
    if (!run.startWave()) break;
    for (let t = 0; run.state.status === "running" && t < 180; t += 0.05) run.step(0.05);
  }
  return run.state;
}

const counter = (kind) => spec.units.find((u) => u.strong?.includes(kind) && !u.block)?.id;
/** 看预告布防：读的放最小权限，发的放沙盒，加急上传前面先放限速，伪装 SDK 前面先放审计；有钱就升级。 */
function smart(run, w) {
  if (!w) return;
  const roster = waveRoster(spec, w);
  for (const s of run.state.slots) {
    if (!s.unit) continue;
    const useful = roster.some((r) => s.guards.some((g) => g.lanes.includes(r.lane))
      && ((s.unit.strong || []).includes(r.kind) || (s.unit.slow && r.kind === "rush") || (s.unit.reveal && r.kind === "disguised") || s.unit.mask));
    if (!useful) run.sell(s.id);
  }
  for (const r of roster) {
    const pair = r.lane === "up" ? ["up", "up2"] : ["down", "down2"];
    if (r.kind === "rush") {
      run.place(pair[0], "throttle");
      run.place(pair[1], "sandbox");
    } else if (r.kind === "disguised") {
      if (!pair.some((p) => run.slotOf(p).unit?.id === "audit")) {
        run.sell(pair[0]);
        run.place(pair[0], "audit");
      }
      run.place(pair[1], "sandbox");
    } else if (!pair.some((p) => run.slotOf(p).unit?.id === counter(r.kind))) {
      run.place(run.slotOf(pair[1]).unit ? pair[0] : pair[1], counter(r.kind));
    }
  }
  for (let i = 0; i < 3; i += 1) for (const s of run.state.slots) if (s.unit?.strong) run.upgrade(s.id);
}

test("the level only falls to a player who reads the preview and adapts", () => {
  // 只在入口放一个就不管了
  assert.equal(play((run) => run.place("entry", "least-privilege")).status, "lost");
  // 不看预告，只把入口、出口放满再一直升级
  assert.equal(play((run) => {
    run.place("entry", "least-privilege");
    run.place("exit", "sandbox");
    run.upgrade("entry");
    run.upgrade("exit");
  }).status, "lost");
  // 看预告、跟着改布防的能守住
  const won = play(smart);
  assert.equal(won.status, "won");
  assert.ok(won.leaked.length <= 2, `smart leaked ${won.leaked.join(",")}`);
  // 再在出口放数据脱敏兜底，漏得更少
  const masked = play((run, w) => { smart(run, w); if (w && !run.slotOf("exit").unit) run.place("exit", "mask"); });
  assert.equal(masked.status, "won");
  assert.ok(masked.leaked.length <= won.leaked.length);
});

test("disguised SDKs cannot be hit until an audit reveals them", () => {
  const noAudit = play((run, w) => {
    if (!w) return;
    for (const r of waveRoster(spec, w)) {
      const pair = r.lane === "up" ? ["up", "up2"] : ["down", "down2"];
      if (!pair.some((p) => run.slotOf(p).unit)) run.place(pair[1], counter(r.kind) || "sandbox");
      run.place(pair[0], "sandbox");
    }
    for (const s of run.state.slots) if (s.unit) run.upgrade(s.id);
  });
  assert.equal(noAudit.status, "lost");
  assert.ok(noAudit.leaked.includes("disguised"));
});

test("every collector in the waves has a measure that counters it, and every measure is worth placing", () => {
  const kinds = new Set(spec.waves.flatMap((w) => waveRoster(spec, w).map((r) => r.kind)));
  for (const kind of kinds) {
    assert.ok(spec.kinds[kind]?.label && spec.kinds[kind]?.why, `${kind} is described`);
    assert.ok(spec.units.some((u) => u.strong?.includes(kind)), `${kind} has a counter`);
  }
  for (const id of ["least-privilege", "sandbox", "throttle", "firewall", "mask", "audit"]) assert.ok(spec.units.some((u) => u.id === id), id);
  assert.ok(spec.hints.length >= 5);
  assert.doesNotMatch(waveText(spec, spec.waves.at(-1)), /undefined|null/);
});

test("placing, upgrading and selling follow the budget", () => {
  const run = createTowerRun(spec);
  const lock = spec.units.find((u) => u.id === "least-privilege");
  assert.equal(run.place("entry", "least-privilege").ok, true);
  assert.equal(run.state.budget, spec.budget - lock.cost);
  assert.equal(run.place("entry", "sandbox").ok, false, "one measure per spot");
  const before = run.state.budget;
  const unit = run.slotOf("entry").unit;
  const cost = upgradeCost(unit);
  if (before >= cost) {
    run.upgrade("entry");
    assert.equal(run.state.budget, before - cost);
  }
  const refund = refundOf(run.slotOf("entry").unit);
  const b = run.state.budget;
  assert.equal(run.sell("entry").back, refund);
  assert.equal(run.state.budget, b + refund);
  assert.equal(run.slotOf("entry").unit, null);
  // 波与波之间不回预算
  const idle = run.state.budget;
  run.step(5);
  assert.equal(run.state.budget, idle);
});

test("a negative or zero time step changes nothing (the browser's first frame can be early)", () => {
  const run = createTowerRun(spec);
  run.place("up", "least-privilege");
  run.startWave();
  const before = run.state.enemies.map((e) => e.t);
  run.step(-0.004);
  run.step(0);
  assert.deepEqual(run.state.enemies.map((e) => e.t), before);
  run.step(0.05);
  assert.ok(run.state.enemies.every((e) => Number.isFinite(e.t)));
});
