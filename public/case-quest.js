// Questions for 案例馆 investigations. Options come from the learner's actual report, so answering
// means reading the report. Pure functions (no DOM) so they can be unit-tested in Node.

function findSection(reports, title) {
  for (const report of reports || []) {
    const section = (report.sections || []).find((candidate) => candidate.title === title);
    if (section) return section;
  }
  return null;
}

const firstCells = (section) => [...new Set((section.table ? section.table.rows.map((row) => String(row[0] ?? "")) : (section.items || []).map(String)).filter(Boolean))];
const rowCount = (section) => (section.table ? section.table.rows.length : (section.items || []).length);

/**
 * { available, multi, options: string[], correct: string[] } for one question.
 * `available` is false when the report lacks the section the question relies on.
 */
export function questionOptions(question, reports) {
  if (question.type === "choice") return { available: true, multi: false, options: question.options, correct: [question.answer] };
  const section = findSection(reports, question.section);
  if (!section) return { available: false, multi: false, options: [], correct: [] };
  if (question.type === "count") {
    const n = rowCount(section);
    const numbers = [...new Set([Math.max(0, n - 1), n, n + 1, n + 2])].sort((a, b) => a - b);
    return { available: true, multi: false, options: numbers.map((x) => `${x} 处`), correct: [`${n} 处`] };
  }
  const options = firstCells(section).slice(0, 8);
  const wanted = [].concat(question.answer);
  const correct = options.filter((option) => wanted.some((answer) => option.includes(answer)));
  return { available: correct.length > 0, multi: question.type === "pick-rows", options, correct };
}

/** True when the picked options are exactly the correct ones. */
export function isCorrect(question, reports, picked) {
  const { correct } = questionOptions(question, reports);
  const chosen = new Set(picked);
  return correct.length > 0 && chosen.size === correct.length && correct.every((option) => chosen.has(option));
}
