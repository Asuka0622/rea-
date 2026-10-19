import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createTimelapse, timelapseProves, TIMELAPSE_HOST } from "../public/timelapse-lab.js";

test("timelapse: the rules follow the 1.1 sample (10-minute captures, a flush at 23:58 to quiet-stats)", () => {
  const code = readFileSync(new URL("../samples/cases/notes-versions/v1.1/main.js", import.meta.url), "utf8");
  assert.match(code, /setInterval\(captureInsight, 600000\)/);
  assert.match(code, /getHours\(\) !== 23 \|\| now\.getMinutes\(\) !== 58/);
  assert.ok(code.includes(TIMELAPSE_HOST));
});

test("timelapse: 1.1 captures every 10 minutes, sends nothing in the daytime, and flushes the whole day at 23:58", () => {
  const t = createTimelapse();
  t.install("1.1");
  t.advance(9);
  assert.equal(t.state.captures, 0);
  t.advance(1);
  assert.equal(t.state.captures, 1);
  t.advance(13 * 60);
  assert.equal(t.state.sent, 0, "nothing goes out in the daytime");
  t.advance(109); // 22:10 → 23:59
  const net = t.state.log.find((r) => r.kind === "net");
  assert.equal(net.at, "23:58");
  assert.equal(net.images, 89);
  assert.equal(t.state.pending, 0);
  assert.ok(timelapseProves("batch", net).ok);
  assert.ok(timelapseProves("capture", t.state.log.find((r) => r.kind === "capture")).ok);
  assert.equal(timelapseProves("batch", t.state.log.find((r) => r.kind === "capture")).ok, false);
});

test("timelapse: export only fails on 1.1, and 1.0 is the quiet control", () => {
  const t = createTimelapse();
  t.install("1.0");
  const ok = t.act("export");
  t.advance(15 * 60);
  const quiet = t.state.log.find((r) => r.kind === "quiet");
  assert.ok(quiet && t.state.captures === 0 && t.state.sent === 0);
  assert.ok(timelapseProves("control", quiet).ok);
  assert.equal(timelapseProves("export", ok).ok, false, "the 1.0 export working is the control, not the proof");
  t.install("1.1");
  assert.ok(timelapseProves("export", t.act("export")).ok);
  assert.equal(createTimelapse().act("export"), null, "nothing happens before a version is installed");
});
