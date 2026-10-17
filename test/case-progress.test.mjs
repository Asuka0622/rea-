import {test} from 'node:test';
import assert from 'node:assert/strict';
import {caseCatalog} from '../lib/cases.mjs';
import {shippedLines,blanksOf,breaks} from '../public/case-puzzle.js';
import {caseSnapshot,restoreCaseState,emptyCaseState,caseObjective} from '../public/case-progress.js';
const item=caseCatalog().find(x=>x.id==='privacy-ledger');

test('a checkpoint restores inspected clues, collected names, and actual source evidence',()=>{
  const state=emptyCaseState(item),things=item.game.puzzle.scene.items.filter(x=>x.clue);
  state.told=true;state.seen.add(things[0].id);state.words.add(item.game.puzzle.terms[0]);
  const actual=shippedLines(item.game.lab.sources)[0];state.evidence.push({id:`${actual.file}:${actual.n}`,text:'do not trust stored text'});
  state.history=['find clipboard'];
  const restored=restoreCaseState(item,JSON.parse(JSON.stringify(caseSnapshot(item,state))));
  assert.equal(restored.told,true);assert.equal(restored.clues[0].id,things[0].clue.id);
  assert.equal(restored.words.size,1);assert.equal(restored.evidence[0].text,actual.text.trim());
  assert.deepEqual(restored.history,['find clipboard']);assert.equal(restored.phase,'look');
});
test('changed case content invalidates its old checkpoint',()=>{
  const state=emptyCaseState(item);state.seen.add('laptop');
  const changed=structuredClone(item);changed.game.puzzle.title+=' revised';
  assert.equal(restoreCaseState(changed,caseSnapshot(item,state)).seen.size,0);
});
test('malformed or out-of-case progress cannot skip the deduction or add fabricated evidence',()=>{
  const saved={...caseSnapshot(item,emptyCaseState(item)),phase:'done',seen:['missing'],words:['invented'],solved:[0,1,2],chosen:[['invented']],evidence:['unknown:99'],broken:[0,1],history:42,mistakes:-3};
  const state=restoreCaseState(item,saved);
  assert.equal(state.phase,'look');assert.equal(state.seen.size,0);assert.equal(state.words.size,0);assert.equal(state.evidence.length,0);assert.equal(state.solved.size,0);assert.equal(state.mistakes,0);
});
function deduced(){
  const state=emptyCaseState(item);state.words=new Set(item.game.puzzle.terms);state.chosen=item.game.puzzle.board.map(g=>blanksOf(g.text));state.solved=new Set(state.chosen.map((_,i)=>i));return state;
}
test('completed deductions restore to verification until the real lab evidence was collected',()=>{
  const state=deduced();state.phase='confront';
  assert.equal(restoreCaseState(item,caseSnapshot(item,state)).phase,'verify');
  state.evidence=item.game.puzzle.labEvidence.map(e=>({...e}));
  assert.equal(restoreCaseState(item,caseSnapshot(item,state)).phase,'confront');
});
test('a closed case restores only when every false claim has supporting evidence',()=>{
  const state=deduced(),puzzle=item.game.puzzle;state.phase='done';state.evidence=puzzle.labEvidence.map(e=>({...e}));
  const code=shippedLines(item.game.lab.sources).map(x=>({id:`${x.file}:${x.n}`,text:x.text.trim()}));
  for(const [i,statement] of puzzle.confront.statements.entries())if(statement.accept){state.broken.add(i);const evidence=code.find(e=>breaks(statement,e));if(evidence&&!state.evidence.some(e=>e.id===evidence.id))state.evidence.push(evidence);}
  assert.equal(restoreCaseState(item,caseSnapshot(item,state)).phase,'done');
  state.evidence=[];
  assert.notEqual(restoreCaseState(item,caseSnapshot(item,state)).phase,'done');
});
test('the next target counts evidence props, keeps the optional cat optional, and changes at each phase',()=>{
  const state=emptyCaseState(item),props=item.game.puzzle.scene.items.filter(x=>x.clue);
  assert.equal(caseObjective(item,state).total,props.length);
  for(const thing of props)state.seen.add(thing.id);
  assert.equal(caseObjective(item,state).target,`item:${item.game.puzzle.terminal}`);
  state.phase='verify';assert.match(caseObjective(item,state).action,/验证/);
  state.phase='confront';assert.equal(caseObjective(item,state).target,'client');
  state.phase='done';assert.equal(caseObjective(item,state).target,'exit');
});
