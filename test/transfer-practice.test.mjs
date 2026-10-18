import {test} from 'node:test';
import assert from 'node:assert/strict';
import {caseCatalog} from '../lib/cases.mjs';
import {reviewTransfer,transferResult} from '../public/transfer-practice.js';
import {PROLOGUE_QUESTS,knowledgeFromCompletion,coverageGaps} from '../public/prologue-quests.js';
import {questState} from '../public/quest-board.js';
const cases=caseCatalog().filter(x=>x.game?.practice);
function solution(item){
 const lab=item.game.lab,contract=JSON.parse(lab.sources['contract.json']),draft=JSON.parse(lab.sources['client.json']);
 for(const [path,value] of Object.entries(contract.required)){
   const keys=path.split('.'),last=keys.pop();let at=draft;for(const key of keys)at=at[key]||(at[key]={});at[last]=value;
 }
 for(const path of contract.remove||[]){const keys=path.split('.'),last=keys.pop();let at=draft;for(const key of keys)at=at?.[key];if(at)delete at[last];}
 if(contract.permissions){draft.permissions=contract.permissions;draft.flows=contract.flows;}
 const evidence=lab.sources['client.json'].split('\n').findIndex(x=>x.includes(contract.evidenceNeedle))+1;
 return {draft,evidence};
}
test('four transfer stories use real distinct sample files and unchanged core prerequisites',()=>{
 assert.equal(cases.length,4);
 assert.equal(new Set(cases.map(x=>x.game.lab.sources['client.json'])).size,4);
 for(const item of cases){
   const q=PROLOGUE_QUESTS.find(q=>q.id===item.id);assert.equal(q.tier,'side');assert.equal(q.transfer,true);
   assert.equal(q.after.length,0,'the two transfer stories do not require a specific order');
   assert.equal(questState(q,{discovered:[q.discover],knowledge:{}}).status,'locked');
   const point=q.knowledge[0].id;assert.equal(questState(q,{discovered:[q.discover],knowledge:{[point]:'L2'}}).status,'available');
 }
});
test('original risky configurations fail; a repaired artifact plus the real source evidence passes',()=>{
 for(const item of cases){const lab=item.game.lab,{draft,evidence}=solution(item);
   assert.equal(reviewTransfer(lab,lab.sources['client.json'],evidence).ok,false,item.id);
   assert.equal(reviewTransfer(lab,JSON.stringify(draft),evidence).ok,true,item.id);
   assert.equal(reviewTransfer(lab,JSON.stringify(draft),1).ok,false,'an unrelated source line is not proof');
   assert.equal(reviewTransfer(lab,JSON.stringify(draft),null).ok,false);
 }
});
test('secrets cannot be masked or moved to another client field, and public features must survive',()=>{
 for(const item of cases.filter(x=>x.id.includes('release'))){const lab=item.game.lab,{draft,evidence}=solution(item);
   const original=JSON.parse(lab.sources['client.json']);draft.extra=JSON.stringify(original);assert.equal(reviewTransfer(lab,JSON.stringify(draft),evidence).ok,false);
   delete draft.extra;draft.app='';assert.equal(reviewTransfer(lab,JSON.stringify(draft),evidence).ok,false);
 }
 const item=cases.find(x=>x.id==='beacon-release'),{draft,evidence}=solution(item);draft.device.publicId='';
 assert.equal(reviewTransfer(item.game.lab,JSON.stringify(draft),evidence).ok,false,'a public identifier is not a secret to delete');
});
test('deny-all, declaration-only, and extra exfiltration paths cannot pass permission review',()=>{
 for(const item of cases.filter(x=>!x.id.includes('release'))){const lab=item.game.lab,{draft,evidence}=solution(item);
   draft.permissions=[];assert.equal(reviewTransfer(lab,JSON.stringify(draft),evidence).ok,false);
   const again=solution(item).draft;again.flows=JSON.parse(lab.sources['client.json']).flows;assert.equal(reviewTransfer(lab,JSON.stringify(again),evidence).ok,false);
 }
});
test('junk, non-object and oversized editor input fails without running it',()=>{
 const lab=cases[0].game.lab;for(const input of ['null','[]','{','globalThis.evil=true',' '.repeat(65537)])assert.equal(reviewTransfer(lab,input,1).ok,false);
 assert.equal(transferResult(lab,'{}',1),null);
});
test('hint use is recorded, and L3 requires two different independently completed stories in either order',()=>{
 for(const point of ['hardcoded-secret','permission-manifest']){
   const pair=PROLOGUE_QUESTS.filter(q=>q.transfer&&q.knowledge.some(e=>e.id===point));assert.equal(pair.length,2);
   for(const ids of [pair,pair.toReversed()]){
     const done={[ids[0].id]:{independent:true}};
     assert.equal(knowledgeFromCompletion(PROLOGUE_QUESTS,done)[point],'L2');
     done[ids[1].id]={independent:false,hints:1};assert.equal(knowledgeFromCompletion(PROLOGUE_QUESTS,done)[point],'L2');
     done[ids[1].id]={independent:true};assert.equal(knowledgeFromCompletion(PROLOGUE_QUESTS,done)[point],'L3');
   }
 }
 const item=cases[0],{draft,evidence}=solution(item);
 assert.equal(transferResult(item.game.lab,JSON.stringify(draft),evidence,1).independent,false);
 assert.equal(transferResult(item.game.lab,JSON.stringify(draft),evidence,0).independent,true);
 assert.ok(!coverageGaps().some(x=>['hardcoded-secret','permission-manifest'].includes(x.id)));
});

test('permission flow key order is irrelevant, but duplicate paths cannot replace a needed feature',()=>{
 const item=cases.find(x=>x.id==='clock-import'),{draft,evidence}=solution(item);
 draft.flows=draft.flows.map(f=>({to:f.to,from:f.from}));
 assert.equal(reviewTransfer(item.game.lab,JSON.stringify(draft),evidence).ok,true);
 draft.flows=[draft.flows[0],draft.flows[0]];
 assert.equal(reviewTransfer(item.game.lab,JSON.stringify(draft),evidence).ok,false);
 const deep='{"x":'.repeat(30)+'{}'+'}'.repeat(30);
 assert.equal(reviewTransfer(item.game.lab,deep,evidence).ok,false);
});
