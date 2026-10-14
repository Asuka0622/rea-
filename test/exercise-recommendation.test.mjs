import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recommendExercise,resolveExercise } from '../public/exercise-recommendation.js';
const report=rows=>({title:'JavaScript 应用分析',sections:[{title:'主进程提供的功能（IPC 通道）',table:{rows:rows.map(name=>[name,'请求后回复结果'])}}]});
test('recommends a small save exercise from existing evidence instead of report order',()=>{
  const result=recommendExercise([report(['notes:list','notes:export','notes:save'])]);
  assert.equal(result.source.label,'notes:save');
  assert.equal(result.title,'保存一条笔记');
  assert.match(result.goal,/关闭再打开/);
  assert.match(result.reason,/仍需/);
});
test('unknown functions, names without a notes clue and asset checks do not get invented exercises',()=>{
  for(const reports of [[],[report(['xyz:qwe','files:save'])],[{title:'人物模型 Mod · 文件与资源',sections:[]}],[report(['payment:save'])]]) assert.equal(recommendExercise(reports),null);
});
test('click-time resolution survives changed IDs but refuses removed evidence',()=>{
  const recommendation=recommendExercise([report(['notes:save'])]);
  const changed=[report(['notes:list','notes:save'])];
  assert.equal(resolveExercise(changed,recommendation).id,'f1');
  assert.equal(resolveExercise([report(['notes:list'])],recommendation),null);
});
test('list or export exercises use only present notes channels',()=>{
  assert.equal(recommendExercise([report(['notes:list'])]).title,'显示笔记列表');
  assert.equal(recommendExercise([report(['notes:export'])]).source.label,'notes:export');
});
