import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayRecord, gameRecordLines, playDuration } from '../public/graduation-game-record.js';
import { achievementSnapshot } from '../public/game-achievements.js';
import { buildGraduationReport, graduationText, saveGraduationReport, loadGraduationReport } from '../public/graduation-report.js';
const memory=()=>{const values=new Map();return{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};};
test('play time counts foreground reading and menus, never background or suspended time',()=>{
 const storage=memory(),play=createPlayRecord(storage);play.step(30,false);play.step(30,true);assert.equal(play.snapshot().seconds,0);
 for(let i=0;i<70;i++)play.step(1,true);play.flush();assert.equal(createPlayRecord(storage).snapshot().seconds,70);assert.equal(playDuration(70),'1 分钟');assert.equal(playDuration(3660),'1 小时 1 分钟');
 play.reset();assert.equal(play.snapshot().seconds,0);
});
test('only witnessed known worlds are recorded, snapshots cannot alter live data',()=>{
 const play=createPlayRecord(memory());play.visitWorld('future-ai');assert.deepEqual(play.snapshot().worlds,[]);play.visitWorld('london-1843');play.visitWorld('london-1843');const saved=play.snapshot();saved.worlds.push('bit-town');assert.deepEqual(play.snapshot().worlds,['london-1843']);
});
test('achievement snapshot includes actual unlocks only, including unlocked secrets',()=>{
 const data=achievementSnapshot({got:{'first-day':123,'shh':456,'invented':789},regions:['center','center','north']});assert.deepEqual(data.achievements.map(x=>x.id),['first-day','shh']);assert.deepEqual(data.regions,['center','north']);data.regions.push('craft');assert.deepEqual(achievementSnapshot({}).regions,[]);
});
test('signed report and text retain achievement names, worlds, stars, skills and time',()=>{
 const gameRecord={recorded:true,playSeconds:180,worlds:['bit-town','london-1843'],regions:['中心广场'],stars:15,starMax:18,completedCases:6,totalCases:6,achievements:[{id:'first-day',title:'初来乍到'}],achievementTotal:66,skills:['编码与加密'],badges:[{id:'rea-detective',title:'见习侦探'}]};
 const report=buildGraduationReport({gameRecord}),storage=memory();saveGraduationReport(report,storage);assert.deepEqual(loadGraduationReport(storage).gameRecord,report.gameRecord);
 for(const text of ['3 分钟','初来乍到','1843年伦敦 · 剧情引入','15 / 18 星','编码与加密'])assert.ok(graduationText(report).includes(text),text);
});
test('legacy report migration leaves unrecorded totals blank, never fills them from later saves',()=>{
 const report=buildGraduationReport();report.copyVersion=3;delete report.gameRecord;const storage=memory();saveGraduationReport(report,storage);const upgraded=loadGraduationReport(storage);const lines=gameRecordLines(upgraded.gameRecord);assert.equal(upgraded.gameRecord.playSeconds,null);assert.equal(upgraded.gameRecord.recorded,false);assert.ok(lines.some(x=>x[1]==='旧报告未记录'));
});
