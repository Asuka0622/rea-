import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {gameCaseCatalog,gameCaseGuide,inspectGameSource} from '../lib/game-cases.mjs';
import {detectTarget} from '../lib/detect.mjs';
test('real catalog keeps actual Mod, official templates and RPG Demo distinct',()=>{
  const items=gameCaseCatalog();assert.equal(items.length,4);assert.equal(new Set(items.map(x=>x.repo)).size,4);assert.equal(items.find(x=>x.id==='minecraft-fabric').type,'官方 Mod 模板');assert.throws(()=>gameCaseGuide('../secret'),/没有这个真实案例/);
});
test('source scan reads changed local code with line numbers without executing it',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rea-game-source-'));try{
    fs.writeFileSync(path.join(dir,'workbench-source.json'),JSON.stringify({format:'rea-upstream-game-v1',id:'terraria-examplemod',repository:'https://github.com/tModLoader/tModLoader',commit:'a'.repeat(40)}));
    fs.writeFileSync(path.join(dir,'ExampleMod.cs'),'throw new Error("must not execute");\nItem.damage = 17;\n');fs.mkdirSync(path.join(dir,'bin'));fs.writeFileSync(path.join(dir,'bin','stale.cs'),'Item.damage = 999;');
    assert.equal(detectTarget(dir).kind,'gamesource');const {raw,report}=inspectGameSource(dir);assert.equal(raw.clues[0].line,2);assert.equal(raw.clues[0].text,'Item.damage = 17;');assert.equal(raw.files.length,2);assert.match(report.headline,/2 个文件/);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('downloaded guides identify existing upstream learning files',()=>{
  for(const item of gameCaseCatalog().filter(x=>x.ready)){const guide=gameCaseGuide(item.id);assert.ok(guide.files.every(x=>x.present),item.id);assert.ok(/^[a-f0-9]{40}$/.test(item.commit));}
});
test('Godot guide points to actual wolf stats, Fabric does not invent numeric features',()=>{
  const items=gameCaseCatalog();if(items.find(x=>x.id==='godot-open-rpg').ready){const guide=gameCaseGuide('godot-open-rpg');const stats=guide.files.find(x=>x.path.endsWith('wolf_stats.tres'));assert.ok(stats.lines.some(x=>x.text.includes('base_max_health = 100')));assert.ok(stats.lines.some(x=>x.text.includes('base_attack = 10')));}
  if(items.find(x=>x.id==='minecraft-fabric').ready){const raw=inspectGameSource(items.find(x=>x.id==='minecraft-fabric').path).raw;assert.equal(raw.clues.length,0);}
});
