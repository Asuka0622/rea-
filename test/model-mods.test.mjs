import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {modelModGuide,inspectModelMod} from '../lib/model-mods.mjs';
import {detectTarget} from '../lib/detect.mjs';
function fixture(fn){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rea-model-'));try{fn(dir);}finally{fs.rmSync(dir,{recursive:true,force:true});}}
test('model resources use their INI directory and distinguish missing, dynamic and outside paths',()=>fixture(dir=>{
  fs.mkdirSync(path.join(dir,'nested'));fs.writeFileSync(path.join(dir,'nested','character.ini'),'[TextureOverrideHead]\nhash = abcdef12\n[ResourceHead]\nfilename = "mesh.buf"\n[ResourceDress]\nfilename = missing.buf\n[ResourceShared]\nfilename = ../texture.dds\n[ResourceOutside]\nfilename = ../../secret.txt\n[ResourceAbsolute]\nfilename = C:\\secret.dds\n[ResourceDynamic]\nfilename = $choice\n;filename = ignored.buf\n');fs.writeFileSync(path.join(dir,'nested','mesh.buf'),'mesh');fs.writeFileSync(path.join(dir,'texture.dds'),'texture');
  assert.equal(detectTarget(dir).kind,'modelmod');const {raw,report}=inspectModelMod(dir);assert.deepEqual(raw.references.map(x=>x.status),['已找到','未找到（含跳过的链接）','已找到','目录外引用（未读取）','目录外引用（未读取）','动态表达式（未解析）']);assert.equal(raw.references[0].line,4);assert.equal(raw.references[0].resolved,'nested/mesh.buf');assert.equal(raw.references[3].resolved,null);assert.match(report.headline,/1 处静态引用未找到/);
}));
test('model scan is inert, rejects generic INI and large config input',()=>fixture(dir=>{
  const ini=path.join(dir,'mod.ini');fs.writeFileSync(ini,'[General]\nname = ordinary app\n');assert.notEqual(detectTarget(dir).kind,'modelmod');assert.throws(()=>inspectModelMod(dir),/未找到 TextureOverride/);
  fs.writeFileSync(ini,'[TextureOverrideBody]\nhash = abcdef12\n[CommandList]\nrun = malicious.exe\n');const raw=inspectModelMod(dir).raw;assert.equal(raw.hashes.length,1);assert.equal(raw.references.length,0);assert.equal(raw.assets.length,0);
  fs.writeFileSync(ini,Buffer.alloc(1048577));assert.throws(()=>inspectModelMod(dir),/INI 文本过大/);
}));
test('model tool guide separates official Blender Lab from community bridges and connection status',()=>{
  const guide=modelModGuide();assert.equal(guide.checkedAt,'2026-10-13');const blender=guide.tools.find(x=>x.id==='blender');assert.equal(blender.mcpKind,'official');assert.equal(new URL(blender.mcpUrl).hostname,'www.blender.org');assert.match(blender.detail,/5\.1/);assert.equal(guide.tools.find(x=>x.id==='krita').mcpKind,'community');assert.equal(guide.tools.find(x=>x.id==='xxmi').mcpKind,'not-found');assert.match(guide.connectionState,/未安装或连接/);
});
