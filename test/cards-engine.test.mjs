import test from "node:test";
import assert from "node:assert/strict";
import { createCrossExam, LEDGER_STATEMENTS, LEDGER_EVIDENCE } from "../public/cards-engine.js";

test("cards: every false line can be refuted by a record that exists, and every record is used by some line", () => {
  const ids = new Set(LEDGER_EVIDENCE.map((e) => e.id));
  const lines = LEDGER_STATEMENTS.flatMap((s) => [s, ...(s.then ? [s.then] : [])]);
  const used = new Set();
  for (const s of lines) {
    if (s.truth) assert.ok(!s.refute, `${s.id} is true and has nothing to refute it`);
    else for (const id of s.refute) { assert.ok(ids.has(id), `${s.id} → ${id}`); used.add(id); }
  }
  for (const id of ids) if (!used.has(id)) assert.ok(["sync-click", "store"].includes(id), `${id} backs a true line`);
});

test("cards: a clean run refutes the false lines, rules the true ones, and keeps full trust", () => {
  const exam = createCrossExam();
  for (const s of [...exam.state.statements]) {
    if (s.truth) assert.equal(exam.affirm(s.id).ok, true);
    else assert.equal(exam.present(s.id, s.refute[0]).ok, true);
  }
  assert.equal(exam.state.status, "won");
  assert.equal(exam.state.trust, exam.state.trustMax);
  assert.equal(exam.report().filter((r) => r.verdict === "不实").length, 4);
});

test("cards: accusing a true line and letting a false one pass both cost trust", () => {
  const exam = createCrossExam();
  assert.equal(exam.present("sync", "boot-report").ok, false);
  assert.equal(exam.affirm("online").ok, false);
  assert.equal(exam.present("anon", "clip-timer").ok, false, "a record that does not answer this line");
  assert.equal(exam.state.trust, exam.state.trustMax - 3);
  assert.equal(exam.find("sync").status, "open", "a failed accusation leaves the line open");
});

test("cards: pressing the clipboard line makes him slip into a new claim that needs the report body", () => {
  const exam = createCrossExam();
  const res = exam.press("unrelated");
  assert.equal(res.replaced.id, "paste");
  assert.equal(exam.find("unrelated").status, "withdrawn");
  assert.equal(exam.present("paste", "clip-timer").ok, false, "reading the clipboard does not prove it is sent");
  assert.equal(exam.present("paste", "report-body").ok, true);
  assert.equal(exam.press("online").replaced, undefined, "pressing a plain line just adds detail");
});

test("cards: running out of trust loses, and nothing more can be played", () => {
  const exam = createCrossExam({ trust: 2 });
  exam.affirm("online");
  exam.affirm("anon");
  assert.equal(exam.state.status, "lost");
  assert.equal(exam.present("third", "two-hosts"), null);
});
