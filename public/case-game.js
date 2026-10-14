// 侦探模式: the report is the crime scene. Each clue asks the learner to click the right rows in the
// real report; found rows go into the evidence bag, and the case ends with presenting evidence for
// each claim. Pure functions (no DOM) so the rules can be unit-tested in Node.
import { findSection, firstCells } from "./case-quest.js";

/**
 * What a clue needs. { kind: "rows", section, required: string[] } when it is answered by clicking
 * report rows; { kind: "choice" } when it is a spoken choice. `available` is false when the report
 * lacks the section.
 */
export function clueTarget(question, reports) {
  const rowsOf = () => {
    const section = findSection(reports, question.section);
    return section ? firstCells(section) : null;
  };
  const matching = (rows, wanted) => rows.filter((row) => [].concat(wanted).some((w) => row.includes(w)));
  if (question.type === "choice" && !question.evidence) return { kind: "choice", available: true };
  const rows = rowsOf();
  if (!rows) return { kind: "rows", available: false, section: question.section, required: [] };
  let required;
  if (question.type === "count") required = rows;
  else if (question.type === "choice") required = matching(rows, question.evidence).slice(0, 1);
  else if (question.type === "pick-row") required = matching(rows, question.answer).slice(0, 1);
  else required = matching(rows, question.answer);
  return { kind: "rows", available: required.length > 0, section: question.section, required };
}

/**
 * Judge one click on a report row: "found" (new and needed), "again" (needed but already found),
 * "wrong-section" or "wrong-row".
 */
export function judgeClick(target, found, sectionTitle, cell) {
  if (sectionTitle !== target.section) return "wrong-section";
  if (!target.required.includes(cell)) return "wrong-row";
  return found.includes(cell) ? "again" : "found";
}

/** 3 stars for a clean run; mistakes and hints each cost a little. */
export function starsFor({ mistakes = 0, hints = 0 }) {
  const slips = mistakes + hints;
  return slips === 0 ? 3 : slips <= 3 ? 2 : 1;
}

/** Whether a piece of evidence (its row text) proves a verdict claim. */
export function provesClaim(claim, evidence) {
  return claim.accept.some((needle) => evidence.includes(needle));
}
