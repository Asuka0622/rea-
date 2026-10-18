import { test } from "node:test";
import assert from "node:assert/strict";
import {
  QUESTIONS,
  PASS_SCORE,
  DISTINCTION_SCORE,
  scoreQuestion,
  scoreReport,
  weakest,
  GRADUATION_CHECKLIST,
} from "../public/report-score.js";

const truth = [
  { key: "contacts", critical: true },
  { key: "location", critical: false },
];

test("a question scores 2 only when every critical item is picked and nothing false is", () => {
  assert.equal(scoreQuestion("capabilities", ["contacts"], truth).score, 2);
  assert.equal(scoreQuestion("capabilities", ["contacts", "location"], truth).score, 1, "a wrong pick that is not critical still costs a point");
  assert.equal(scoreQuestion("capabilities", ["contacts", "other"], truth).score, 1, "an unknown pick is a wrong pick");
  assert.equal(scoreQuestion("capabilities", ["other"], truth).score, 0);
  assert.equal(scoreQuestion("capabilities", [], truth).score, 0);
  assert.equal(scoreQuestion("capabilities", { picks: ["contacts"], none: false }, truth).score, 2);
});

test("a question with nothing to find is scored on saying so", () => {
  assert.equal(scoreQuestion("entry", { picks: [], none: true }, []).score, 2);
  assert.equal(scoreQuestion("entry", { picks: [], none: false }, []).score, 0, "leaving it blank is not an answer");
  assert.equal(scoreQuestion("entry", ["backdoor"], []).score, 0);
  assert.equal(scoreQuestion("entry", { picks: ["contacts"], none: true }, truth).score, 0, "saying none when there is something");
});

test("missing one critical item is a 1, with the gap named", () => {
  const two = [
    { key: "a", critical: true },
    { key: "b", critical: true },
  ];
  const result = scoreQuestion("destination", ["a"], two);
  assert.equal(result.score, 1);
  assert.match(result.reason, /b/);
});

test("the whole report passes at 8 and is a distinction at 9", () => {
  const answers = {};
  const sample = {};
  for (const question of QUESTIONS) {
    answers[question.id] = ["x"];
    sample[question.id] = [{ key: "x", critical: true }];
  }
  const report = scoreReport({ answers, sample });
  assert.equal(report.total, 10);
  assert.equal(report.verdict, "distinction");

  const partial = Object.fromEntries(QUESTIONS.map((q, i) => [q.id, i < 4 ? ["x"] : []]));
  const fourOfFive = scoreReport({ answers: partial, sample });
  assert.equal(fourOfFive.total, 8);
  assert.equal(fourOfFive.verdict, "pass");
  assert.equal(fourOfFive.passed, true);
});

test("a blank report fails when the sample actually has findings", () => {
  const sample = Object.fromEntries(QUESTIONS.map((q) => [q.id, [{ key: "x", critical: true }]]));
  const report = scoreReport({ answers: {}, sample });
  assert.equal(report.total, 0);
  assert.equal(report.verdict, "fail");
  assert.match(report.summary, /先补最空的那一问/);
});

test("weakest points at the question that lost the most", () => {
  const results = [
    { id: "capabilities", score: 2 },
    { id: "destination", score: 0 },
    { id: "secret", score: 1 },
  ];
  assert.equal(weakest(results), QUESTIONS.find((q) => q.id === "destination").label);
  assert.equal(weakest([]), "—");
});

test("the graduation checklist covers tools, drills, pitfalls and limits", () => {
  for (const group of ["tooling", "drills", "pitfalls", "limits"]) {
    assert.ok(Array.isArray(GRADUATION_CHECKLIST[group]));
    assert.ok(GRADUATION_CHECKLIST[group].length >= 2, group);
  }
  assert.ok(DISTINCTION_SCORE > PASS_SCORE);
});
