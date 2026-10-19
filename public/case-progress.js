import {shippedLines,blanksOf,checkGroup,breaks} from './case-puzzle.js';

const revisions=new WeakMap();
export function caseRevision(item) {
  if(revisions.has(item)) return revisions.get(item);
  let hash=2166136261;
  for(const character of JSON.stringify(item.game))hash=Math.imul(hash^character.charCodeAt(0),16777619);
  const revision=(hash>>>0).toString(16);revisions.set(item,revision);return revision;
}
export function emptyCaseState(item) {
  return {phase:'look',told:false,seen:new Set(),clues:[],dict:[],words:new Set(),evidence:[],chosen:item.game.puzzle.board.map(group=>blanksOf(group.text).map(()=>'')),solved:new Set(),broken:new Set(),statement:0,mistakes:0,hints:0,spent:0,hearts:3,fails:0,history:[],termLog:[],page:'clues',labStage:0,epilogueDone:false};
}
const count=value=>Number.isInteger(value)?Math.max(0,Math.min(10000,value)):0;
export function caseSnapshot(item,state) {
  return {version:1,revision:caseRevision(item),told:state.told,phase:state.phase,seen:[...state.seen],words:[...state.words],evidence:state.evidence.map(e=>e.id),chosen:state.chosen,solved:[...state.solved],broken:[...state.broken],statement:state.statement,mistakes:count(state.mistakes),hints:count(state.hints),spent:count(state.spent),hearts:Number.isInteger(state.hearts)?Math.max(0,Math.min(3,state.hearts)):3,fails:count(state.fails),history:state.history.slice(-60).map(x=>String(x).slice(0,300)),page:state.page,labStage:count(state.labStage),epilogueDone:state.epilogueDone===true};
}
export function restoreCaseState(item,saved) {
  const state=emptyCaseState(item),puzzle=item.game.puzzle;
  if(!saved||saved.version!==1||saved.revision!==caseRevision(item))return state;
  const list=(value,limit=200)=>Array.isArray(value)?value.slice(0,limit):[];
  state.told=saved.told===true;
  for(const thing of puzzle.scene.items)if(list(saved.seen).includes(thing.id)){
    state.seen.add(thing.id);
    if(thing.clue&&!state.clues.some(c=>c.id===thing.clue.id)){
      state.clues.push(thing.clue);
      for(const entry of thing.clue.dict||[])if(!state.dict.some(d=>d.zh===entry.zh))state.dict.push(entry);
    }
  }
  for(const word of puzzle.terms)if(list(saved.words).includes(word))state.words.add(word);
  state.chosen=puzzle.board.map((group,g)=>blanksOf(group.text).map((_,i)=>state.words.has(saved.chosen?.[g]?.[i])?saved.chosen[g][i]:''));
  for(const [g,group] of puzzle.board.entries())if(list(saved.solved).includes(g)&&checkGroup(group,state.chosen[g]).ok)state.solved.add(g);
  const inferredLab=state.solved.size===puzzle.board.length&&['confront','done'].includes(saved.phase);
  const allowed=new Map(shippedLines(item.game.lab.sources).map(line=>[`${line.file}:${line.n}`,{id:`${line.file}:${line.n}`,text:line.text.trim(),where:`${line.file}:${line.n}`}]))
  if(inferredLab)for(const evidence of puzzle.labEvidence||[])allowed.set(evidence.id,{...evidence,where:puzzle.labSource||'沙盒抓包'});
  for(const id of new Set(list(saved.evidence)))if(allowed.has(id))state.evidence.push(allowed.get(id));
  const verified=inferredLab&&(puzzle.labEvidence||[]).every(e=>state.evidence.some(actual=>actual.id===e.id));
  if(state.solved.size===puzzle.board.length)state.phase=verified?(puzzle.confront?'confront':'done'):'verify';
  if(verified)for(const [i,statement] of (puzzle.confront?.statements||[]).entries())if(statement.accept&&list(saved.broken).includes(i)&&state.evidence.some(e=>breaks(statement,e)))state.broken.add(i);
  const falseCount=(puzzle.confront?.statements||[]).filter(s=>s.accept).length;
  if(state.phase==='confront'&&saved.phase==='done'&&falseCount>0&&state.broken.size===falseCount)state.phase='done';
  state.statement=Number.isInteger(saved.statement)?Math.max(0,Math.min((puzzle.confront?.statements?.length||1)-1,saved.statement)):0;
  state.mistakes=count(saved.mistakes);state.hints=count(saved.hints);
  state.spent=count(saved.spent);
  state.hearts=Number.isInteger(saved.hearts)?Math.max(0,Math.min(3,saved.hearts)):3;
  state.fails=count(saved.fails);
  state.history=list(saved.history,60).filter(x=>typeof x==='string').map(x=>x.slice(0,300));
  if(['clues','dict','evidence','board'].includes(saved.page))state.page=saved.page;
  state.epilogueDone=saved.epilogueDone===true&&state.phase==='done';
  // 多关沙盒做到第几关（只在还没做完沙盒时有用）。
  state.labStage=state.phase==='verify'?Math.min(count(saved.labStage),(item.game.lab.stages?.length||1)-1):0;
  return state;
}

export function caseObjective(item,state) {
  const puzzle=item.game.puzzle,clueProps=puzzle.scene.items.filter(x=>x.clue);
  const found=clueProps.filter(x=>state.seen.has(x.id)).length;
  const summaries={look:'现场与代码',verify:'动手验证',confront:'当面对质',done:'委托完成'};
  let text,action,target;
  if(state.phase==='done'){text='已经查清这个委托。可以回小镇继续探索。';action='回到门口';target='exit';}
  else if(state.phase==='confront'){text=`实验记录已收好，去找${item.game.client.name}，用证据回应说法。`;action=`找${item.game.client.name}`;target='client';}
  else if(state.phase==='verify'){text='推理已经成立，去电脑的沙盒里亲手验证。';action='去电脑验证';target=`item:${puzzle.terminal}`;}
  else if(found<clueProps.length){text=`调查现场：已找到 ${found} / ${clueProps.length} 条线索。点击物品会走过去调查。`;action='找下一条线索';target=`item:${clueProps.find(x=>!state.seen.has(x.id)).id}`;}
  else if(state.solved.size<puzzle.board.length){text=`线索已找齐。去电脑搜代码、收集名字，再在手账补全推理（${state.solved.size}/${puzzle.board.length}）。`;action='去电脑搜代码';target=`item:${puzzle.terminal}`;}
  return {stage:summaries[state.phase]||summaries.look,text,action,target,found,total:clueProps.length,steps:['调查现场','搜索代码','拼出推理','动手验证','出示证据']};
}
