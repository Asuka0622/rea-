import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// A bounded, inert scan of manifests and source filenames. This is not a TOML resolver
// or a Rust compiler: conditional dependencies and workspace inheritance stay unresolved.
export function inspectRustProject(target) {
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
      if (entry.isSymbolicLink() || ['.git','target','node_modules'].includes(entry.name)) continue;
      const file = path.join(dir,entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile()) {
        if (files.length >= 20000) throw new Error('项目超过 20,000 个文件，请选择较小的源码目录');
        files.push({path:path.relative(target,file).replaceAll('\\','/'),size:fs.statSync(file).size});
      }
    }
  };
  walk(target);
  const manifests = files.filter(file=>path.basename(file.path)==='Cargo.toml').map(file=>{
    if (file.size > 1048576) throw new Error('Cargo.toml 太大，请检查目标文件');
    const text = fs.readFileSync(path.join(target,file.path),'utf8');
    let section = '';
    let name = null;
    const dependencies = new Set();
    for (const line of text.split(/\r?\n/)) {
      const table = line.match(/^\s*\[([^\]]+)\]\s*(?:#.*)?$/);
      if (table) {
        section = table[1];
        const depTable = section.match(/(?:^|\.)((?:dev-|build-)?dependencies)\.([\w-]+)$/);
        if (depTable) dependencies.add(depTable[2]);
        continue;
      }
      if (section === 'package') name ||= line.match(/^\s*name\s*=\s*["']([^"']+)["']/)?.[1];
      if (/(?:^|\.)(?:dev-|build-)?dependencies$/.test(section)) {
        const dep = line.match(/^\s*(?:["']([\w-]+)["']|([\w-]+))\s*=/);
        if (dep) dependencies.add(dep[1]||dep[2]);
      }
    }
    return {path:file.path,name:name||'工作区清单',dependencies:[...dependencies].sort()};
  });
  if (!manifests.length) throw new Error('没有找到 Cargo.toml');
  const dependencies = [...new Set(manifests.flatMap(file=>file.dependencies))].sort();
  const crates = manifests.filter(file=>file.name!=='工作区清单');
  const rustFiles = files.filter(file=>file.path.endsWith('.rs'));
  const hints = [['egui','界面组件'],['eframe','桌面界面框架'],['wgpu','GPU 图形接口'],['vello','矢量绘制'],['winit','窗口与输入'],['image','图像读写'],['serde','数据序列化'],['tokio','异步运行时']].filter(([key])=>dependencies.includes(key));
  const licenses = files.filter(file=>/^LICENSE(?:[.-]|$)/i.test(path.basename(file.path)));
  const raw = {scanner:'rea-workbench/inert-cargo-scan',target,files,manifests,dependencies,limitations:['Manifest declaration scan only; no build, execution or dependency resolution.']};
  const report = {
    title:'Rust 源码结构',
    headline:`这是一个 Rust 源码项目，找到 ${crates.length} 个 Cargo 模块和 ${rustFiles.length} 个 Rust 文件。`,
    facts:[{label:'技术栈',value:'Rust / Cargo'},{label:'Cargo 模块',value:String(crates.length)},{label:'Rust 源文件',value:String(rustFiles.length)},{label:'文件总量',value:String(files.length)}],
    sections:[
      {title:'模块与源码位置',explain:'根据本地 Cargo.toml 的包名整理；路径可交给 AI 进一步阅读。',table:{columns:['模块','清单路径','声明依赖数'],rows:crates.slice(0,150).map(file=>[file.name,file.path,file.dependencies.length])}},
      {title:'界面、图形与基础库线索',explain:'只列清单中实际声明的库；声明不代表所有功能都已实现。',table:{columns:['库','常见用途'],rows:hints.length?hints:[['未匹配到常见库','请阅读下方依赖清单']]}},
      {title:'依赖清单',explain:'包含正常、开发与构建依赖；保留清单中的名字，未解析别名、条件或版本继承。',items:dependencies},
      {title:'代码入口',explain:'这些是目录中实际存在的入口文件，适合从这里开始阅读。',items:rustFiles.filter(file=>/(^|\/)src\/(main|lib)\.rs$/.test(file.path)).slice(0,150).map(file=>file.path)},
      {title:'许可证文件',explain:'源码样本保留上游许可证，具体条款请阅读对应文件。',items:licenses.map(file=>file.path)},
      {title:'交给 AI 的学习任务',items:['按模块解释职责，并引用具体源码路径作为依据。','选一个小功能，说明界面、数据模型与命令如何协作。','区分源码中已经实现的内容、推测和需要运行验证的内容。']},
    ],
    cautions:['这份报告来自工作台本地静态扫描，没有编译或运行源码。','Cargo 清单按声明提取，未进行完整 TOML 解析或依赖求解；并非调用关系或完整业务架构。'],
    nextSteps:[],
  };
  return {raw,report};
}

// Useful as a real CLI equivalent for the professional report, without requiring REA.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(inspectRustProject(path.resolve(process.argv[2]||'.')).raw,null,2)); }
  catch(error) { console.error(error.message); process.exitCode=1; }
}
