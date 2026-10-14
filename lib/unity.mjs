import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';

const execFileAsync=promisify(execFile);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const unityPython=()=>process.env.REA_UNITY_PYTHON||path.join(root,'data','tools','unitypy','venv',process.platform==='win32'?'Scripts/python.exe':'bin/python');

export function unityReport(raw){
  if(raw.format!=='rea-unity-evidence-v1')throw new Error('Unity 解析结果格式不正确');
  const count=Object.values(raw.counts).reduce((a,b)=>a+b,0);
  const meshes=raw.meshExports||[];
  return {
    title:'Unity 资源包 · 真实读取与导出',
    headline:`读取 ${count} 个资源对象，导出 ${raw.exports.length} 张贴图、${meshes.length} 个 OBJ 网格；记录 ${raw.parameters.length} 项资源参数。`,
    facts:[{label:'资源签名',value:raw.source.signature},{label:'Unity 版本',value:raw.unityVersions.join(' / ')},{label:'解析工具',value:`${raw.tool.name} ${raw.tool.version}`},{label:'导出贴图',value:raw.exports.length},{label:'导出 OBJ',value:meshes.length},{label:'资源参数',value:raw.parameters.length}],
    sections:[
      {title:'输入文件与证据',items:[raw.source.path,'SHA-256：'+raw.source.sha256,'机器可读证据：'+raw.evidencePath,'实测报告：'+raw.reportPath]},
      {title:'真实资源对象',table:{columns:['类型','读取数量'],rows:Object.entries(raw.counts)}},
      {title:'实际资源参数',explain:'值来自二进制资源对象。位置由资源文件、对象 ID 和字段组成；对象 ID 保留为字符串。这些值未验证游戏运行时行为。',table:{columns:['资源文件 / 对象 ID','类型 / 名称','字段','值'],rows:raw.parameters.map(p=>[p.assetFile+' / '+p.pathId,p.type+' / '+p.name,p.field,String(p.value)])}},
      {title:'已导出贴图',table:{columns:['输出文件','尺寸','SHA-256'],rows:raw.exports.map(e=>[path.join(raw.outputDirectory,e.file),`${e.width} × ${e.height}`,e.sha256])}},
      {title:'已导出 OBJ 网格',explain:'OBJ 仅包含网格位置及可用 UV/法线。X 轴取反并反转三角形顶点顺序；没有骨骼、动画、材质连接或场景对象变换。',table:{columns:['输出文件','顶点 / 三角形','UV / 法线','来源对象 ID','SHA-256'],rows:meshes.map(e=>[path.join(raw.outputDirectory,e.file),e.vertices+' / '+e.triangles,e.uvCoordinates+' / '+e.normals,e.pathId,e.sha256])}},
      ...(raw.warnings.length?[{title:'未完成项',items:raw.warnings.map(w=>`${w.type} / ${w.pathId}：${w.message}`)}]:[]),
    ],
    cautions:[...raw.limitations,...(raw.truncated?['对象超过 1000 个，本次只展示前 1000 个。']:[])],
    nextSteps:[],
  };
}

export async function inspectUnityBundle(target,{signal}={}){
  const python=unityPython();
  if(!fs.existsSync(python))throw new Error('UnityPy 环境尚未就绪。请按 docs/unity/README.md 安装到项目内，或设置 REA_UNITY_PYTHON。');
  const output=path.join(root,'exports','unity',crypto.randomUUID());
  fs.mkdirSync(path.dirname(output),{recursive:true});
  try{
    const {stdout}=await execFileAsync(python,[path.join(root,'scripts','inspect-unity.py'),'--input',target,'--output',output],{signal,timeout:120000,maxBuffer:4*1024*1024,windowsHide:true,env:{...process.env,PYTHONIOENCODING:'utf-8'}});
    const raw=JSON.parse(stdout);
    return {raw,report:{...unityReport(raw),execution:{pythonPath:python,scriptPath:path.join(root,'scripts','inspect-unity.py')}}};
  }catch(error){
    if(error.name==='AbortError'||signal?.aborted)throw new Error('Unity 读取已取消');
    let message=error.message;
    try{message=JSON.parse(error.stderr.trim()).error||message;}catch{}
    throw new Error(message.slice(0,600));
  }
}
