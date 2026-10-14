import {test,before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {inspectUnityBundle,unityPython,unityReport} from '../lib/unity.mjs';
import {beginnerReading} from '../public/report-reading.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(root,'samples','unity','mesh_test.bundle');
const golden=path.join(root,'samples','unity','mesh_expected.obj');
const ready=fs.existsSync(unityPython())&&fs.existsSync(source)&&fs.existsSync(golden);
let result;
before(async()=>{if(ready)result=await inspectUnityBundle(source);});

function obj(text){
  const data={v:[],vt:[],vn:[],f:[]};
  for(const line of text.split(/\r?\n/)){
    const [kind,...values]=line.trim().split(/\s+/);
    if(kind in data)data[kind].push(kind==='f'?values.map(v=>v.split('/').map(part=>part===''?null:Number(part))):values.map(Number));
  }
  return data;
}

test('OBJ validation covers absent channels, invalid geometry and export limits',{skip:!fs.existsSync(unityPython())},async()=>{
  await promisify(execFile)(unityPython(),[path.join(root,'test','unity_obj_test.py')],{windowsHide:true,timeout:20000});
});

test('real Mesh geometry matches upstream coordinates and faces without false normal references',{skip:!ready},()=>{
  const {raw}=result;
  assert.equal(raw.source.sha256,'a9f6e6bba7110cce647ef752d66655d13ce5850b013a60d80d4e8b08953e02ea');
  assert.equal(raw.meshExports.length,1);
  assert.equal(raw.warnings.length,0);
  const mesh=raw.meshExports[0];
  const data=obj(fs.readFileSync(path.join(raw.outputDirectory,mesh.file),'utf8'));
  const expected=obj(fs.readFileSync(golden,'utf8'));
  assert.deepEqual(data.v,expected.v);
  assert.deepEqual(data.vt,expected.vt);
  assert.deepEqual(data.f.map(f=>f.map(v=>v[0])),expected.f.map(f=>f.map(v=>v[0])));
  assert.equal(data.v.length,724);assert.equal(data.vt.length,724);assert.equal(data.f.length,362);assert.equal(data.vn.length,0);
  for(const face of data.f){
    assert.equal(face.length,3);
    for(const [position,uv,...normal] of face){assert.ok(position>=1&&position<=data.v.length);assert.ok(uv>=1&&uv<=data.vt.length);assert.equal(normal.length,0);}
  }
  assert.equal(mesh.pathId,'-9097144649164150351');
  assert.equal(raw.parameters.find(p=>p.type==='Mesh'&&p.field==='m_VertexData.m_VertexCount').value,mesh.vertices);
  assert.equal(raw.parameters.find(p=>p.field==='m_SubMeshes[0].indexCount').value,mesh.triangles*3);
});

test('OBJ evidence preserves hashes and states the limits of a planar mesh',{skip:!ready},()=>{
  const {raw,report}=result;const mesh=raw.meshExports[0];
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(raw.outputDirectory,mesh.file))).digest('hex'),mesh.sha256);
  assert.deepEqual(mesh.objBounds,{min:[-1937,0,0],max:[-0,2047,0]});
  assert.equal(mesh.normals,0);
  assert.ok(report.sections.find(s=>s.title==='已导出 OBJ 网格').table.rows[0].includes('-9097144649164150351'));
  assert.match(beginnerReading(report,'inspect-unity-bundle').finding,/1 个 OBJ/);
  assert.match(beginnerReading(report,'inspect-unity-bundle').learn,/不包含骨骼/);
  assert.ok(fs.readFileSync(raw.reportPath,'utf8').includes('724 顶点、362 三角形'));
  const historical=unityReport({...raw,meshExports:undefined});
  assert.equal(historical.facts.find(f=>f.label==='导出 OBJ').value,0);
});
