import {test,before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {detectTarget} from '../lib/detect.mjs';
import {inspectUnityBundle,unityPython,unityReport} from '../lib/unity.mjs';
import {beginnerReading} from '../public/report-reading.js';
import {buildCandidates} from '../public/replicate-spec.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sample=path.join(root,'samples','unity','atlas_test.bundle');
const available=fs.existsSync(unityPython())&&fs.existsSync(sample);
let result;
before(async()=>{if(available)result=await inspectUnityBundle(sample);});

test('Unity detection depends on the file signature rather than the filename',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rea-unity-'));
  try{
    const bundle=path.join(dir,'renamed.bin');fs.writeFileSync(bundle,'UnityFS\0example');
    const fake=path.join(dir,'fake.bundle');fs.writeFileSync(fake,'plain text');
    assert.equal(detectTarget(bundle).kind,'unity');
    assert.notEqual(detectTarget(fake).kind,'unity');
  }finally{for(const name of ['renamed.bin','fake.bundle'])fs.unlinkSync(path.join(dir,name));fs.rmdirSync(dir);}
});

test('real upstream bundle keeps exact object IDs and serialized dimensions',{skip:!available},()=>{
  const {raw}=result;
  assert.equal(raw.source.sha256,'61ee5afb5f5c64f0a4f65f039d09b2509198363e713423289c895067ac215177');
  assert.deepEqual(raw.counts,{SpriteAtlas:1,Sprite:7,AssetBundle:1,Texture2D:1});
  assert.deepEqual(raw.unityVersions,['2018.4.11f1']);
  const width=raw.parameters.find(p=>p.type==='Texture2D'&&p.field==='m_Width');
  assert.equal(width.value,1024);
  assert.equal(width.pathId,'602278551932518654');
  assert.equal(raw.parameters.find(p=>p.type==='Texture2D'&&p.field==='m_Height').value,512);
  assert.ok(raw.objects.every(o=>typeof o.pathId==='string'));
  assert.equal(raw.warnings.length,0);
});

test('exported PNG and persisted evidence agree with the source fields',{skip:!available},()=>{
  const {raw}=result;
  assert.equal(raw.exports.length,1);
  const item=raw.exports[0];
  const image=fs.readFileSync(path.join(raw.outputDirectory,item.file));
  assert.equal(image.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(image.readUInt32BE(16),1024);
  assert.equal(image.readUInt32BE(20),512);
  assert.equal(crypto.createHash('sha256').update(image).digest('hex'),item.sha256);
  const persisted=JSON.parse(fs.readFileSync(raw.evidencePath,'utf8'));
  assert.deepEqual(persisted.parameters,raw.parameters);
  assert.deepEqual(persisted.exports,raw.exports);
  assert.ok(fs.readFileSync(raw.reportPath,'utf8').includes(item.sha256));
});

test('reports do not present resource parameters as recovered gameplay or code',{skip:!available},()=>{
  const before=JSON.stringify(result.raw);
  const report=unityReport(result.raw);
  const novice=beginnerReading(report,'inspect-unity-bundle');
  assert.match(novice.finding,/导出 1 张/);
  assert.match(novice.learn,/不等于生命值/);
  assert.ok(report.cautions.some(item=>item.includes('没有执行 IL2CPP')));
  const exercise=buildCandidates([report]);
  assert.equal(exercise.supported,false);
  assert.match(exercise.reason,/尚未读取游戏行为/);
  assert.equal(JSON.stringify(result.raw),before);
});

test('a corrupt bundle produces a failure rather than a fabricated success',{skip:!available},async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rea-unity-corrupt-'));
  const file=path.join(dir,'bad.bundle');
  try{fs.writeFileSync(file,'UnityFS\0invalid');await assert.rejects(inspectUnityBundle(file));}
  finally{fs.unlinkSync(file);fs.rmdirSync(dir);}
});
