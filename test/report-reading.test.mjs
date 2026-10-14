import { test } from 'node:test';
import assert from 'node:assert/strict';
import { beginnerReading } from '../public/report-reading.js';

test('names remain tentative evidence and unknown names do not invent functions', () => {
  const report={title:'JavaScript 应用分析',sections:[{title:'主进程提供的功能（IPC 通道）',table:{rows:[['notes:save'],['xyz:qwe']]}},{title:'暴露给界面的接口',items:['window.notes.save()']}]};
  const before=JSON.stringify(report);
  const reading=beginnerReading(report,'analyze-javascript-application');
  assert.equal(reading.clues[0].label,'可能是：保存 笔记');
  assert.equal(reading.clues[1].label,'暂时无法从名字判断用途');
  assert.match(reading.finding,/结合代码确认/);
  assert.match(reading.structure,/连接层/);
  assert.equal(JSON.stringify(report),before);
});
test('empty or unknown reports explain uncertainty instead of offering fictitious functionality', () => {
  const reading=beginnerReading({title:'JavaScript 应用分析',sections:[]});
  assert.equal(reading.clues.length,0);
  assert.match(reading.finding,/暂时不能判断/);
  assert.doesNotMatch(reading.structure,/连接层/);
  assert.match(beginnerReading().finding,/不能确定/);
});
test('asset and permission checks never claim runtime compatibility or actual permission use', () => {
  const reading=beginnerReading({facts:[{label:'未找到的引用',value:'0'}]},'inspect-model-mod');
  assert.match(reading.finding,/0 处/);
  assert.match(reading.finding,/不代表/);
  assert.match(reading.learn,/指南/);
  assert.match(beginnerReading({},'inspect-android-package').finding,/不等于实际使用/);
});
test('source reading guides show only found learning files and limit the initial list', () => {
  const reading=beginnerReading({sections:[{title:'从这些源码开始',table:{rows:[['missing.gd','缺失入口','该版本未找到'],...Array.from({length:8},(_,i)=>[`${i}.gd`,'学习入口','已找到'])]}}]},'inspect-game-source');
  assert.equal(reading.clues.length,5);
  assert.ok(reading.clues.every(item=>item.evidence!=='missing.gd'));
  assert.match(reading.finding,/没有运行/);
});
