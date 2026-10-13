import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function modelModGuide(){return {...JSON.parse(fs.readFileSync(path.join(root,'docs/model-mods/guide.json'),'utf8')),localGuide:path.join(root,'docs/model-mods/README.md')};}
const skip=new Set(['.git','node_modules','.godot','.gradle']);
const modelExt=/\.(?:vb|ib|buf|fmt|dds|blend|obj|gltf|glb)$/i;
export function looksLikeModelMod(target){
  let seen=0,found=false;
  const walk=(dir,depth)=>{if(found||depth>3)return;for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(++seen>1500)return;if(entry.isSymbolicLink()||skip.has(entry.name))continue;const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file,depth+1);else if(entry.isFile()&&/\.ini$/i.test(entry.name)&&fs.statSync(file).size<=262144){const text=fs.readFileSync(file,'utf8');if(/^\s*\[TextureOverride[^\]]*\]/im.test(text)&&/^\s*hash\s*=\s*[0-9a-f]{8}\b/im.test(text))found=true;}if(found)return;}};
  try{walk(target,0);}catch{return false;}return found;
}
export function inspectModelMod(target){
  const files=[],configs=[],references=[],hashes=[];let bytesRead=0;
  const walk=(dir,depth=0)=>{if(depth>24)throw new Error('目录层级过深，请选择单个 Mod 文件夹');for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(entry.isSymbolicLink()||skip.has(entry.name))continue;const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file,depth+1);else if(entry.isFile()){if(files.length>=5000)throw new Error('目录超过 5,000 个文件，请选择较小的 Mod 文件夹');files.push({path:path.relative(target,file).replaceAll('\\','/'),size:fs.statSync(file).size});}}};walk(target);
  const canon=value=>process.platform==='win32'?value.toLowerCase():value;
  const members=new Set(files.map(file=>canon(file.path)));
  for(const file of files.filter(x=>/\.ini$/i.test(x.path))){if(file.size>1048576||bytesRead+file.size>4194304)throw new Error('INI 文本过大，请选择较小的 Mod 文件夹');bytesRead+=file.size;const text=fs.readFileSync(path.join(target,file.path),'utf8');let section='';const sections=[];
    text.split(/\r?\n/).forEach((line,index)=>{const header=line.match(/^\s*\[([^\]]+)\]/);if(header){section=header[1];sections.push(section);return;}if(/^\s*[;#]/.test(line))return;
      const hash=line.match(/^\s*hash\s*=\s*([0-9a-f]{8})\b/i);if(hash)hashes.push({config:file.path,line:index+1,section,hash:hash[1]});
      const match=line.match(/^\s*filename\s*=\s*(.+?)\s*$/i);if(!match)return;if(references.length>=1000)throw new Error('引用过多，请选择单个 Mod 文件夹');
      const value=match[1].replace(/\s+;.*$/,'').replace(/^(["'])(.*)\1$/,'$2').trim(),relative=value.replaceAll('\\','/');let status,resolved=null;
      if(/[$*?]/.test(value)){status='动态表达式（未解析）';}
      else if(path.win32.isAbsolute(value)||path.posix.isAbsolute(relative)){status='目录外引用（未读取）';}
      else{const destination=path.resolve(target,path.dirname(file.path),relative);const inside=path.relative(target,destination);if(inside==='..'||inside.startsWith('..'+path.sep)||path.isAbsolute(inside)){status='目录外引用（未读取）';}else{resolved=inside.replaceAll('\\','/');status=members.has(canon(resolved))?'已找到':'未找到（含跳过的链接）';}}
      references.push({config:file.path,line:index+1,section,filename:value,resolved,status});
    });configs.push({path:file.path,sections});
  }
  if(!configs.some(x=>x.sections.some(name=>/^TextureOverride/i.test(name))))throw new Error('未找到 TextureOverride 配置，请选择已解压的 3DMigoto / GIMI 模型 Mod 文件夹');
  const assets=files.filter(x=>modelExt.test(x.path)),missing=references.filter(x=>x.status.startsWith('未找到')),found=references.filter(x=>x.status==='已找到');
  const raw={scanner:'rea-workbench/inert-model-mod-scan',target,files,configs,references,hashes,assets,limitations:['Bounded static INI and file existence scan. No execution, external path reads, mesh decoding or game validation.']};
  const report={title:'人物模型 Mod · 文件与资源',headline:`找到 ${configs.length} 个 INI 和 ${assets.length} 个模型或贴图文件；${missing.length} 处静态引用未找到。`,facts:[{label:'INI 配置',value:String(configs.length)},{label:'模型 / 贴图文件',value:String(assets.length)},{label:'已找到的引用',value:String(found.length)},{label:'未找到的引用',value:String(missing.length)}],sections:[
    {title:'资源引用检查',explain:'相对于每个 INI 文件定位 filename。只检查选择目录内实际盘点的文件；不解析动态表达式、不跟随文件链接。',table:{columns:['INI : 行','资源段','filename','结果'],rows:references.length?references.slice(0,150).map(x=>[x.config+':'+x.line,x.section,x.filename,x.status]):[['未发现 filename','—','—','请阅读 INI 的资源绑定方式']]}},
    {title:'模型与贴图文件',explain:'仅盘点文件名与大小，尚未解码几何、权重或贴图。',table:{columns:['文件','字节数'],rows:assets.slice(0,150).map(x=>[x.path,x.size])}},
    {title:'覆盖配置与 hash',explain:'这些是配置中的声明。相同 hash 可能用于不同部件，不能单独据此判断冲突。',table:{columns:['INI : 行','配置段','hash'],rows:hashes.slice(0,150).map(x=>[x.config+':'+x.line,x.section,x.hash])}},
    {title:'接下来用哪些工具',items:['Blender：修改模型、UV 与权重；3DMigoto / GIMI Blender 插件：导入导出。','Krita 或其他图像编辑器：修改贴图；按需使用 texconv 转换 DDS。','工具与 MCP 来源见首页「人物模型 Mod」；Blender Lab 已有官方 MCP，需另行配置。']},
    {title:'交给 AI 的学习任务',items:['解释资源段和覆盖配置，引用文件与行号。先处理未找到的静态引用，区分动态表达式与目录外引用。','提出最小外观修改方案，列出网格分组、UV、权重、导出和测试步骤。']}
  ],cautions:['工作台补充的本地只读扫描，不执行 INI、脚本、加载器或游戏。','文件存在不代表骨骼适配、格式有效或游戏版本兼容。展示最多 150 行，每次扫描最多 5,000 文件、4 MiB INI。','原神官服使用第三方模型工具有封号风险；换外观不保证账号安全。'],nextSteps:[]};return {raw,report};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{console.log(JSON.stringify(inspectModelMod(path.resolve(process.argv[2]||'.')).raw,null,2));}catch(error){console.error(error.message);process.exitCode=1;}}
