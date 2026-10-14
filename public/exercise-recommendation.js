import { buildCandidates } from './replicate-spec.js';

// A small first exercise is offered only when a concrete notes-related channel exists.
// The source meaning is tentative; the exercise goal describes our own new implementation.
export function recommendExercise(reports) {
  const candidates = buildCandidates(reports);
  if (!candidates.supported) return null;
  const options = candidates.groups.flatMap(group => group.options);
  const rules = [
    {verb:'保存',title:'保存一条笔记',goal:'做一个网页笔记小工具：输入一条笔记，点击保存；关闭再打开后，笔记仍然在。',expectation:'输入文字 → 点击保存 → 关闭再打开，确认文字还在。'},
    {verb:'列出',title:'显示笔记列表',goal:'做一个网页小工具：用几条自己写的示例笔记，显示一个清晰的笔记列表。',expectation:'准备几条自己的示例笔记，打开网页，确认每条都能显示。'},
    {verb:'导出',title:'导出一条笔记',goal:'做一个网页小工具：输入一条笔记，点击导出，下载为能打开阅读的文本文件。',expectation:'输入文字 → 导出文件 → 打开文件，确认内容一致。'},
  ];
  for (const rule of rules) {
    const option = options.find(item => item.kind === '通道' && item.meaning?.includes(rule.verb) && item.meaning.includes('笔记'));
    if (option) return {...rule,source:{section:option.section,label:option.label},reason:'根据报告里的名称线索选择练习方向，原功能的具体行为仍需结合代码确认。'};
  }
  return null;
}

// Candidate IDs depend on report order: resolve the source again at click time.
export function resolveExercise(reports, recommendation) {
  if (!recommendation?.source) return null;
  return buildCandidates(reports).groups.flatMap(group => group.options)
    .find(option => option.section === recommendation.source.section && option.label === recommendation.source.label) || null;
}
