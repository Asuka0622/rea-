import {test} from 'node:test';
import assert from 'node:assert/strict';
import {caseCatalog} from '../lib/cases.mjs';
import {DEMO_CASES,DEMO_QUEST,createQuests} from '../public/game-quests.js';
import {shippedLines,blanksOf,breaks,checkGroup} from '../public/case-puzzle.js';
import {emptyCaseState,restoreCaseState,caseSnapshot,caseObjective} from '../public/case-progress.js';
const demos=DEMO_CASES.map(id=>caseCatalog().find(item=>item.id===id));
test('all six prologue cases have their own explorable puzzle, optional prop and real lab',()=>{
  assert.equal(demos.length,6);
  for(const item of demos){const p=item.game.puzzle;assert.ok(p,item.id);assert.equal(p.board.length,3,item.id);assert.ok(p.scene.items.some(x=>!x.clue),item.id);assert.ok(p.scene.items.some(x=>x.id===p.terminal),item.id);assert.ok(p.labEvidence.length,item.id);assert.ok(item.game.lab.files.every(name=>item.game.lab.sources[name]),item.id);}
  for(const kind of ['network','save','calculator'])assert.ok(demos.some(item=>item.game.lab.kind===kind),kind);
});
test('each puzzle can restore real discoveries, verified deductions, experiments, and supported verdicts',()=>{
  for(const item of demos){
    const p=item.game.puzzle,state=emptyCaseState(item);
    for(const thing of p.scene.items)if(thing.clue)state.seen.add(thing.id);
    state.words=new Set(p.terms);state.chosen=p.board.map(group=>blanksOf(group.text));
    state.solved=new Set(p.board.map((group,i)=>{assert.ok(checkGroup(group,state.chosen[i]).ok);return i;}));
    state.phase='verify';let saved=restoreCaseState(item,caseSnapshot(item,state));assert.equal(saved.phase,'verify',item.id);assert.equal(caseObjective(item,saved).target,'item:'+p.terminal);
    state.evidence=p.labEvidence.map(e=>({...e}));state.phase='confront';
    const code=shippedLines(item.game.lab.sources).map(x=>({id:`${x.file}:${x.n}`,text:x.text.trim()}));
    for(const [i,claim] of p.confront.statements.entries())if(claim.accept){const proof=[...state.evidence,...code].find(e=>breaks(claim,e));assert.ok(proof,item.id+': '+claim.text);if(!state.evidence.some(e=>e.id===proof.id))state.evidence.push(proof);state.broken.add(i);}
    state.phase='done';saved=restoreCaseState(item,caseSnapshot(item,state));assert.equal(saved.phase,'done',item.id);assert.equal(caseObjective(item,saved).target,(p.legend||p.epilogue)?'client':'exit');
  }
});
test('the independent case completion events lead to the demo epilogue and detective badge',()=>{
  const q=createQuests([DEMO_QUEST],{key:'demo-expanded-puzzles-test'});
  const [a,b,c,d,e,f]=demos.map(item=>['solve',item.id]),home=['enter','home'];
  for(const [kind,id] of [home,a,b,c,home,d,e,home,f,home,['enter','clocktower']])assert.ok(q.event(kind,id),kind+' '+id);
  assert.equal(q.current(),null);assert.ok(q.badges().some(b=>b.id==='rea-detective'));
});
test('the farm scene uses the actual save character, day and gold instead of confusing them with the client or defaults',()=>{
  const farm=demos.find(x=>x.id==='farm-save');
  const packed=JSON.parse(Buffer.from(farm.game.lab.sources['saves/slot1.sav'],'base64').toString('utf8'));
  const state=JSON.parse(packed.body),text=farm.game.puzzle.scene.items.find(x=>x.id==='console').lines.map(x=>x.text).join(' ');
  assert.ok(text.includes(state.player));assert.ok(text.includes(String(state.day)));assert.ok(text.includes(String(state.gold)));
});

test('calculator accepts the actual local authorization assignment as evidence, but not an ordinary display change',()=>{
  const calculator=caseCatalog().find(item=>item.id==='calculator-eggs');
  const statement=calculator.game.puzzle.confront.statements.find(statement=>statement.text.includes('无害彩蛋'));
  const lines=shippedLines(calculator.game.lab.sources);
  const authorization=lines.find(line=>line.text.includes('license = { pro: true }'));
  assert.ok(authorization);
  assert.equal(breaks(statement,{text:authorization.text}),true);
  assert.equal(breaks(statement,{text:'screen.textContent = display;'}),false);
});