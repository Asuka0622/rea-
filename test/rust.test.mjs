import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {inspectRustProject} from '../lib/rust.mjs';
import {detectTarget} from '../lib/detect.mjs';

test('Rust scan reads actual crate/dependency declarations without executing project code',()=>{
  const target=fs.mkdtempSync(path.join(os.tmpdir(),'rea-rust-test-'));
  try {
    fs.mkdirSync(path.join(target,'crates','paint','src'),{recursive:true});
    fs.writeFileSync(path.join(target,'Cargo.toml'),'[workspace]\nmembers=["crates/*"]\n[workspace.dependencies]\nwgpu="24"\n# imaginary = "9"\n[workspace.metadata]\nnot_a_dependency="1"\n');
    fs.writeFileSync(path.join(target,'crates','paint','Cargo.toml'),'[package]\nname="paint"\n[dependencies]\nwgpu.workspace=true\n"egui"="0.30"\n[target.\'cfg(windows)\'.dependencies]\nwinit="0.30"\n[dev-dependencies]\nserde="1"\n[dependencies.image]\nversion="0.25"\n');
    fs.writeFileSync(path.join(target,'crates','paint','src','lib.rs'),'pub fn draw() {}');
    fs.writeFileSync(path.join(target,'build.rs'),'compile_error!("This project must never be built by the scanner");');
    fs.writeFileSync(path.join(target,'LICENSE-MIT'),'Test fixture only');
    assert.equal(detectTarget(target).kind,'rust');
    const {raw,report}=inspectRustProject(target);
    assert.deepEqual(raw.dependencies,['egui','image','serde','wgpu','winit']);
    assert.equal(report.facts.find(f=>f.label==='Cargo 模块').value,'1');
    assert.deepEqual(report.sections.find(s=>s.title==='代码入口').items,['crates/paint/src/lib.rs']);
    assert.deepEqual(report.sections.find(s=>s.title==='许可证文件').items,['LICENSE-MIT']);
    assert.ok(report.cautions.some(c=>c.includes('没有编译')));
  } finally {
    const resolved=fs.realpathSync(target);
    assert.ok(resolved.startsWith(fs.realpathSync(os.tmpdir())+path.sep));
    assert.ok(path.basename(resolved).startsWith('rea-rust-test-'));
    fs.rmSync(resolved,{recursive:true,force:true});
  }
});

test('Rust scan rejects non-project folders instead of manufacturing a report',()=>{
  assert.throws(()=>inspectRustProject(path.resolve('samples/notes-demo')),/没有找到 Cargo/);
});
