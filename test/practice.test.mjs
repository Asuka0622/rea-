import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {practiceHtml,extractHtml,previewDocument,MAX_PRACTICE_BYTES} from '../public/practice-html.js';
import {savePractice,practiceFile} from '../lib/practice.mjs';
const html='<!doctype html><html lang="zh"><body><h1>我的笔记</h1><script>window.example=1</script></body></html>';
test('extracts HTML from a mixed AI answer while excluding explanations and other code blocks',()=>{
  const answer='说明\n```css\nbody {color:blue}\n```\n```html\n'+html+'\n```\n打开文件即可';
  assert.equal(practiceHtml(answer),html);
  assert.equal(extractHtml('说明\n'+html+'\n结束'),html);
  assert.equal(extractHtml('```javascript\nconst a="<html>";\n```'),'');
});
test('plain text, partial snippets and oversized UTF-8 input produce useful validation errors',()=>{
  for(const value of ['', '你好', '<button>保存</button>', '```html\n不是代码\n```']) assert.throws(()=>practiceHtml(value),/完整网页代码/);
  assert.throws(()=>practiceHtml('中'.repeat(Math.ceil(MAX_PRACTICE_BYTES/3))),/2 MB/);
});
test('preview restrictions precede supplied markup, while the saved source remains intact',()=>{
  const preview=previewDocument(html);
  assert.ok(preview.startsWith('<meta http-equiv="Content-Security-Policy"'));
  assert.match(preview,/connect-src 'none'/);
  assert.match(preview,/form-action 'none'/);
  assert.ok(preview.endsWith(html));
});
test('saving uses unique files, extracts code, and keeps open/reveal targets within the practice folder',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rea-practice-test-'));
  const previous=process.env.REA_WORKBENCH_HOME;process.env.REA_WORKBENCH_HOME=dir;
  try {
    const a=savePractice('```html\n'+html+'\n```','../我的笔记');
    const b=savePractice(html,'../我的笔记');
    assert.notEqual(a.path,b.path);
    assert.equal(fs.readFileSync(a.path,'utf8'),html);
    assert.equal(practiceFile(a.path),a.path);
    assert.throws(()=>practiceFile(path.join(dir,'outside.html')),/找不到/);
    assert.throws(()=>practiceFile(path.join(a.folder,'..','practice-sibling','wrong.html')),/找不到/);
    assert.throws(()=>savePractice('这是说明','测试'),/完整网页代码/);
  }finally{
    if(previous===undefined)delete process.env.REA_WORKBENCH_HOME;else process.env.REA_WORKBENCH_HOME=previous;
    fs.rmSync(dir,{recursive:true,force:true});
  }
});
