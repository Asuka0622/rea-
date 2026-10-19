import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { caseObservation, recordCaseObservation, collectGraduationRecords, buildGraduationReport, loadGraduationReport, saveGraduationReport, graduationText, GRADUATION_KEY, OBSERVATIONS_KEY } from '../public/graduation-report.js';
import { createHabitRecorder, habitNotes, HABITS_KEY } from '../public/detective-habits.js';
const memory = () => {const map = new Map();return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)};};
const item = JSON.parse(fs.readFileSync(new URL('../samples/cases/privacy-ledger/workbench-case.json',import.meta.url)));
const observation = (changes={}) => ({id:'privacy-ledger',title:'小林',clues:6,clueTotal:6,extras:1,extraTotal:1,evidence:8,hints:0,mistakes:0,retries:0,verified:true,...changes});
test('completion captures actual distinct scene observations and proof, malformed evidence is harmless',()=>{
 const state={phase:'done',seen:new Set(item.game.puzzle.scene.items.map(x=>x.id)),evidence:[{id:'a'},{id:'a'},null,'b'],solved:new Set(item.game.puzzle.board.map((_,i)=>i))};
 const result=caseObservation(item,state,2);assert.equal(result.extras,1);assert.equal(result.clues,6);assert.equal(result.evidence,2);assert.equal(result.verified,true);assert.equal(result.stars,2);
 assert.equal(caseObservation(item,{...state,evidence:{},solved:[]}).verified,false);
});
test('completion observations survive content revision and ignore unrelated cases',()=>{
 const storage=memory();recordCaseObservation(item,{phase:'done',hints:4},1,storage);
 const revised=structuredClone(item);revised.game.client.name='新文案';
 const records=collectGraduationRecords([revised],storage);assert.equal(records.length,1);assert.equal(records[0].hints,4);assert.equal(records[0].stars,1);
 assert.equal(collectGraduationRecords([{...item,id:'other'}],storage).length,0);
});
test('old checkpoints remain usable but missing or corrupt data is left blank',()=>{
 const storage=memory();storage.setItem(`rea-case-checkpoint-v1:${item.id}`,JSON.stringify({version:1,phase:'done',seen:[],evidence:{}}));
 assert.equal(collectGraduationRecords([item],storage).length,1);
 storage.setItem(OBSERVATIONS_KEY,'{broken');storage.setItem(`rea-case-checkpoint-v1:${item.id}`,'null');
 const report=buildGraduationReport({records:collectGraduationRecords([item],storage)});assert.equal(report.facts.recorded,0);assert.match(report.scope,/不作负面评价/);assert.match(report.notes[0].text,/不能编出/);
});
test('investigation, hints and retries write distinct comments without penalizing help',()=>{
 assert.match(buildGraduationReport({records:[observation()]}).style,/窗台/);
 assert.match(buildGraduationReport({records:[observation({clues:1,extras:0})]}).style,/代码缝/);
 const help=buildGraduationReport({records:[observation({clues:3,extras:0,hints:4})]});assert.match(help.style,/借一盏灯/);assert.match(help.notes[1].text,/会提问也是办案本领/);
 assert.match(buildGraduationReport({records:[observation({mistakes:5,retries:1})]}).style,/弯路/);
 assert.equal(buildGraduationReport({records:[observation(),observation()]}).facts.recorded,1);
});
test('sealed report roundtrips and preview or malformed reports cannot masquerade as a real result',()=>{
 const storage=memory();const report=buildGraduationReport({records:[observation()]});saveGraduationReport(report,storage);assert.deepEqual(loadGraduationReport(storage),report);
 saveGraduationReport({...report,sample:true},storage);assert.equal(loadGraduationReport(storage),null);
 saveGraduationReport({...report,notes:[null]},storage);assert.equal(loadGraduationReport(storage),null);
 storage.setItem(GRADUATION_KEY,'{broken');assert.equal(loadGraduationReport(storage),null);
 assert.ok(graduationText(report).includes('\n'));assert.ok(!graduationText(report).includes('\\n'));
});
test('idle requires a continuous foreground stretch; menus/background never count',()=>{
 const tracker=createHabitRecorder(memory());
 for(let i=0;i<60;i++)tracker.step({dt:1,active:false});assert.equal(tracker.snapshot().activeSeconds,0);
 for(let i=0;i<44;i++)tracker.step({dt:1,active:true});assert.equal(habitNotes(tracker.snapshot()).length,0);
 tracker.step({dt:1,active:true});assert.equal(habitNotes(tracker.snapshot())[0].title,'发呆观察员');
 tracker.step({active:false});for(let i=0;i<10;i++)tracker.step({dt:1,active:true});assert.equal(tracker.snapshot().longestIdleSeconds,45);assert.equal(tracker.snapshot().idleBouts,1);
});
test('night owl uses actual night movement and ratio, no time skips or wall pushing',()=>{
 const tracker=createHabitRecorder(memory());
 for(let i=0;i<20;i++)tracker.step({dt:1,active:true,moving:true,period:'night'});
 assert.ok(habitNotes(tracker.snapshot()).some(x=>x.title==='比特镇夜猫子'));
 for(let i=0;i<25;i++)tracker.step({dt:1,active:true,moving:true,period:'day'});
 assert.ok(!habitNotes(tracker.snapshot()).some(x=>x.title==='比特镇夜猫子'));
 const stopped=createHabitRecorder(memory());for(let i=0;i<30;i++)stopped.step({dt:1,active:true,moving:false,sprinting:true,period:'night'});
 assert.equal(stopped.snapshot().sprintSeconds,0);assert.equal(stopped.snapshot().nightMoveSeconds,0);
});
test('time gaps, unknown weather, repeated regions and resets are handled honestly',()=>{
 const storage=memory(),tracker=createHabitRecorder(storage);
 tracker.step({dt:3600,active:true});assert.equal(tracker.snapshot().activeSeconds,0);
 for(let i=0;i<25;i++)tracker.step({dt:1,active:true,moving:true,sprinting:true,region:'center'});
 assert.equal(tracker.snapshot().regions.length,1);assert.equal(tracker.snapshot().rainMoveSeconds,0);
 tracker.flush();assert.equal(createHabitRecorder(storage).snapshot().moveSeconds,25);
 tracker.reset();assert.equal(JSON.parse(storage.getItem(HABITS_KEY)).activeSeconds,0);
});
test('fun habits are independent of qualification, visible in export, and absent history is not fabricated',()=>{
 const report=buildGraduationReport({records:[observation()],habits:{longestIdleSeconds:80,idleBouts:1,moveSeconds:30,nightMoveSeconds:25}});
 assert.equal(report.rank,'见习侦探');assert.equal(report.funNotes.length,2);assert.match(graduationText(report),/比特镇夜猫子/);
 assert.deepEqual(buildGraduationReport().funNotes,[]);
});
