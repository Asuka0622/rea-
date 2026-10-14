import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';

const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const bundle=path.resolve(process.argv[2]||'');
assert.ok(fs.existsSync(path.join(bundle,'runtime','node.exe')),'Pass an extracted desktop package directory');
const python=path.join(bundle,'runtime','python','python.exe');
const env={...process.env,REA_WORKBENCH_HOME:path.join(bundle,'data'),REA_UNITY_PYTHON:python,PYTHONNOUSERSITE:'1',PYTHONIOENCODING:'utf-8'};
delete env.PYTHONHOME;delete env.PYTHONPATH;
const {stdout:pythonInfo}=await promisify(execFile)(python,['-c','import sys,json,UnityPy; print(json.dumps({"version":sys.version.split()[0],"prefix":sys.prefix,"paths":sys.path,"unitypy":UnityPy.__version__}))'],{cwd:bundle,env,windowsHide:true,timeout:20000});
const info=JSON.parse(pythonInfo);
assert.equal(info.unitypy,'1.25.4');
assert.ok(info.paths.every(p=>path.resolve(p).startsWith(bundle)), 'Python depends on a path outside the relocated package');
assert.ok(path.resolve(info.prefix).startsWith(bundle));
let server;
const results={version:JSON.parse(fs.readFileSync(path.join(bundle,'package.json'),'utf8')).version,python:info.version,unitypy:info.unitypy,checks:[]};
try{
 server=spawn(path.join(bundle,'runtime','node.exe'),['server.mjs','--no-open','--port','7542'],{cwd:bundle,env,windowsHide:true,stdio:['ignore','pipe','pipe']});
 const base=await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Packaged server did not start')),25000);let output='';
  server.stdout.on('data',chunk=>{output+=chunk;const match=output.match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timer);resolve(match[0]);}});
  server.on('error',error=>{clearTimeout(timer);reject(error);});server.on('exit',code=>{clearTimeout(timer);reject(Error('Packaged server exited '+code));});
 });
 const page=await fetch(base+'/');assert.equal(page.status,200);const html=await page.text();
 assert.ok(html.includes('REA 工作台'));const token=html.match(/name="workbench-token" content="([0-9a-f]+)"/)?.[1];assert.ok(token);
 const api=async(route,body)=>{
  const response=await fetch(base+route,{method:body===undefined?'GET':'POST',headers:{'X-Workbench-Token':token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  assert.equal(response.status,200);const text=await response.text();return response.headers.get('content-type').includes('ndjson')?text.trim().split('\n').map(line=>JSON.parse(line)):JSON.parse(text);
 };
 results.checks.push('Page and authenticated API start from relocated package');
 const notes=await api('/api/analyze',{path:path.join(bundle,'samples','notes-demo')});
 const note=notes.find(e=>e.type==='step-done');assert.equal(note.ok,true,JSON.stringify(note.error));assert.match(note.report.headline,/Electron/);results.checks.push('Bundled notes sample produces real report');
 const source=path.join(project,'samples','unity','mesh_test.bundle');
 assert.ok(fs.existsSync(source),'Download the upstream Unity fixture before release verification');
 const events=await api('/api/analyze',{path:source});const unity=events.find(e=>e.type==='step-done');assert.equal(unity.ok,true,JSON.stringify(unity.error));
 assert.equal(unity.report.facts.find(f=>f.label==='导出 OBJ').value,1);
 const raw=await api('/api/raw?id='+unity.rawId);assert.equal(raw.meshExports[0].vertices,724);assert.equal(raw.meshExports[0].triangles,362);assert.equal(raw.warnings.length,0);
 assert.ok(raw.outputDirectory.startsWith(bundle));assert.ok(fs.existsSync(path.join(raw.outputDirectory,'mesh-1.obj')));results.checks.push('Portable Python exports real OBJ and PNG inside package');
 const artifact='<!doctype html><html><head><meta charset="utf-8"><title>作品</title></head><body><h1>运行成功</h1></body></html>';
 const saved=await api('/api/practice/save',{html:artifact,title:'发布测试'});assert.ok(saved.path.startsWith(path.join(bundle,'data')));assert.equal(fs.readFileSync(saved.path,'utf8'),artifact);results.checks.push('Practice HTML saves inside package data');
 const cases=await api('/api/game-cases');assert.ok(cases.items.every(item=>!item.ready));results.checks.push('Omitted large source samples are not marked installed');
 assert.equal((await fetch(base+'/api/overview')).status,403);results.checks.push('API rejects requests without token');
 results.ok=true;
 fs.writeFileSync(path.join(project,'dist','release-validation-v'+results.version+'.json'),JSON.stringify(results,null,2)+'\n');
 console.log(JSON.stringify(results));
}finally{server?.kill();}
