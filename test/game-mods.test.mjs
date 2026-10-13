import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {buildModFiles,validateModValues,writeModFiles,inspectModProject,modZip,gameModCatalog} from '../lib/game-mods.mjs';
function temporary(run) {const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rea-mod-test-'));try{return run(dir);}finally{assert.ok(fs.realpathSync(dir).startsWith(fs.realpathSync(os.tmpdir())+path.sep));fs.rmSync(dir,{recursive:true,force:true});}}
test('rejects injected, unknown and out-of-range numeric mod values',()=>{
  for(const values of [{damage:'1; os.execute()'},{damage:Infinity,interval:1,uses:100},{damage:6,interval:0.25,uses:100},{damage:6,interval:1,uses:100,extra:1}])assert.throws(()=>validateModValues('training-sword',values));
  assert.throws(()=>buildModFiles('../../outside'));
  assert.equal(validateModValues('training-sword',{damage:12,interval:0.5,uses:200}).damage,12);
});
test('reads modified Lua source values rather than catalog defaults and does not execute code',()=>temporary(dir=>{
  writeModFiles(dir,buildModFiles('training-sword').files);
  const file=path.join(dir,'init.lua');fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace('local damage = 6','local damage = 17')+'\nerror("must not execute")\n');
  const {raw,report}=inspectModProject(dir);assert.equal(raw.values.damage,17);assert.equal(report.sections[0].table.rows[0][1],17);assert.equal(report.sections[0].table.rows[0][2],6);
}));
test('all four original examples have real entries and inspectable values',()=>temporary(dir=>{
  for(const item of gameModCatalog()) {const target=path.join(dir,item.id);const result=buildModFiles(item.id);writeModFiles(target,result.files);const {raw}=inspectModProject(target);assert.deepEqual(raw.values,result.values);assert.ok(raw.files.some(f=>f.path===item.entry));}
  const wall=buildModFiles('training-wall',{health:1200,armor:4,copper:12});assert.equal(JSON.parse(wall.files['content/blocks/training-wall.json']).health,1200);assert.match(wall.files['sprites/blocks/training-wall.png'].toString('latin1'),/Origin/);
}));
test('export ZIP opens with the independent platform ZIP reader and retains changed values',()=>temporary(dir=>{
  const zip=path.join(dir,'export.zip');fs.writeFileSync(zip,modZip(buildModFiles('healing-food',{heal:9,yield:3}).files));
  const result=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',"Add-Type -AssemblyName System.IO.Compression.FileSystem; $archive = [IO.Compression.ZipFile]::OpenRead($env:REA_TEST_ZIP); try { $entry=$archive.GetEntry('init.lua'); $reader=[IO.StreamReader]::new($entry.Open()); try { [Console]::Write($reader.ReadToEnd()) } finally {$reader.Dispose()} } finally {$archive.Dispose()}"],{env:{...process.env,REA_TEST_ZIP:zip},encoding:'utf8',windowsHide:true});
  assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/local heal = 9/);assert.match(result.stdout,/local yield = 3/);
}));
