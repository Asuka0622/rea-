import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sharpArg=process.argv.indexOf('--sharp');
const sharp=createRequire(import.meta.url)(sharpArg>=0?process.argv[sharpArg+1]:'sharp');
const inbox=process.env.REA_ART_INBOX || 'C:/Users/Administrator/.codex/generated_images/01a13a14-2db6-7f32-aecd-353b0f8d6736';
const output=path.join(project,'public/art-review');
fs.mkdirSync(path.join(output,'previews'),{recursive:true});
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const rel=p=>path.relative(project,p).replaceAll('\\','/');
const walk=dir=>!fs.existsSync(dir)?[]:fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
function csv(text){let rows=[],row=[],word='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){word+='"';i++;}else quoted=!quoted;}else if(!quoted&&(c===','||c==='\n')){row.push(word.replace(/\r$/,''));word='';if(c==='\n'){rows.push(row);row=[];}}else word+=c;}if(word||row.length){row.push(word);rows.push(row);}const head=rows.shift()||[];return rows.filter(x=>x.length>1).map(x=>Object.fromEntries(head.map((h,i)=>[h,x[i]||''])));}
const deliveries=['docs/art/delivery-2026-10-17.csv','docs/art/delivery-2026-10-18.csv'].flatMap(p=>fs.existsSync(path.join(project,p))?csv(fs.readFileSync(path.join(project,p),'utf8')):[]);
const byTarget=new Map();for(const row of deliveries){const key=row.target_file.replaceAll('\\','/');byTarget.set(key,[...(byTarget.get(key)||[]),row]);}
const sourceText=[...walk(path.join(project,'public')).filter(p=>/\.(js|css|html)$/.test(p)&&!p.includes('art-review')), ...walk(path.join(project,'samples/cases')).filter(p=>p.endsWith('workbench-case.json'))].map(p=>fs.readFileSync(p,'utf8')).join('\n');
const imagePaths=[...walk(path.join(project,'public/art')),...walk(path.join(project,'docs/art'))].filter(p=>/\.(png|webp|jpe?g|gif)$/i.test(p)&&!p.includes('/acceptance/'));
const originals=walk(inbox).filter(p=>p.endsWith('.png')).sort((a,b)=>fs.statSync(a).mtimeMs-fs.statSync(b).mtimeMs);
const inputs=[...imagePaths.map(file=>({file,path:rel(file)})),...originals.map((file,index)=>({file,path:`inbox/${String(index).padStart(3,'0')}-${path.basename(file)}`}))];
const assets=[],seen=new Map(),failures=[];
function group(p){if(p.startsWith('inbox/'))return '原始收件';if(p.includes('/faces/')||p.includes('/portraits/')||p.includes('portrait')||p.includes('face-'))return '人物头像';if(/anim-|sprite-|walk-/.test(p))return '人物与动物动画';if(/regions|town-|london|bianjing/.test(p))return '地图与叠层';if(/room-|case-room/.test(p))return '房间场景';if(/case-props|props\//.test(p))return '调查道具';if(/mini|tower|rhythm|pipes|cards|manage/.test(p))return '小游戏';if(/\/ui\//.test(p))return '界面';return '其他插画与源图';}
function metadata(file,meta){
 const choices=[file.replace(/\.[^.]+$/,'.json')];
 let value=null,from='';for(const p of choices)if(fs.existsSync(p)){try{const x=JSON.parse(fs.readFileSync(p,'utf8'));if(x.animations&&x.sheet){value=x;from=rel(p);break;}}catch{}}
 if(!value && /anim-lumi-(case|unified)\.png$/.test(file))value={sheet:[4,5],frame:[meta.width/4,meta.height/5],animations:{idle:{row:0,frames:2},'walk-down':{row:1,frames:4},'walk-up':{row:2,frames:4},'walk-side':{row:3,frames:4},talk:{row:4,frames:2}}};
 if(!value && file.endsWith('anim-kobayashi-case.png'))value={sheet:[4,2],frame:[meta.width/4,meta.height/2],animations:{idle:{row:0,frames:2},'scratch-head':{row:1,frames:4}}};
 if(!value && file.endsWith('anim-lumi-6f-candidate.png'))value={sheet:[6,5],frame:[meta.width/6,meta.height/5],animations:{idle:{row:0,frames:2},'walk-down':{row:1,frames:6},'walk-up':{row:2,frames:6},'walk-side':{row:3,frames:6},talk:{row:4,frames:2}}};
 if(value && value.frame && value.sheet[0]===meta.width && value.sheet[1]===meta.height){
   value={...value,sheet:[meta.width/value.frame[0],meta.height/value.frame[1]],sheetConvention:'原JSON为整图像素尺寸，预览已转为行列数'};
 }
 return value?{...value,metadataSource:from||'已知布局（运行代码或交付规格）'}:null;
}
async function inspect(input){
 const {file}=input,p=input.path,buf=fs.readFileSync(file),sha=hash(buf),scope=p.startsWith('public/')?'运行目录':p.startsWith('inbox/')?'未认领收件':'源图与候选';
 const row={id:sha.slice(0,16)+'-'+assets.length,path:p,sha,bytes:buf.length,scope,group:group(p),checks:[],delivery:byTarget.get(p)||[]};
 try{
  const meta=await sharp(buf).metadata(),stats=await sharp(buf).stats();
  Object.assign(row,{width:meta.width,height:meta.height,format:meta.format,alpha:meta.hasAlpha&&stats.channels.at(-1)?.min<255});
  const add=(severity,text)=>row.checks.push({severity,text});
  const declared=row.delivery.find(r=>r.width&&r.height);
  if(declared && (Number(declared.width)!==meta.width||Number(declared.height)!==meta.height))add('error',`交付尺寸登记${declared.width}×${declared.height}，实际${meta.width}×${meta.height}`);
  if(scope==='运行目录' && (meta.width%2||meta.height%2))add('warning','奇数像素尺寸：按2倍密度放置时可能出现半格错位');
  if(scope==='运行目录'&&p.includes('/faces/')&&!((meta.width===320&&meta.height===320)||(meta.width===80&&meta.height===80)))add('error','头像既非主角320×320，也非最新NPC规范80×80');
  if(row.delivery.some(r=>/^(是|true)$/i.test(r.alpha))&&!row.alpha)add('error','交付声明透明，但图像没有实际透明像素');
  if(scope==='运行目录'&&p.includes('/portraits/'))add('info','旧立绘归档候选；运行目录存在不等于已被场景引用');
  const anim=metadata(file,meta);
  if(anim){
    row.animation=anim;
    const [cols,rows]=anim.sheet,[fw,fh]=anim.frame||[meta.width/cols,meta.height/rows];
    if(meta.width!==fw*cols||meta.height!==fh*rows||!Number.isInteger(fw)||!Number.isInteger(fh))add('error','动画帧尺寸、行列数与图像总尺寸不一致');
    else for(const [name,clip] of Object.entries(anim.animations)){
      if(clip.row<0||clip.row>=rows||clip.frames<1||clip.frames>cols){add('error',`${name}的帧索引越界`);continue;}
      if(Array.isArray(clip.ms)&&clip.ms.length!==clip.frames)add('error',`${name}帧数与时长列表不一致`);
      if(clip.ms && (Array.isArray(clip.ms)?clip.ms:[clip.ms]).some(t=>!Number.isFinite(t)||t<=0))add('error',`${name}有无效的帧时长`);
      const frames=[],feet=[];
      for(let col=0;col<clip.frames;col++){
        const frame=await sharp(buf).extract({left:col*fw,top:clip.row*fh,width:fw,height:fh}).ensureAlpha().raw().toBuffer();
        let count=0,bottom=-1;
        for(let y=0;y<fh;y++)for(let x=0;x<fw;x++)if(frame[(y*fw+x)*4+3]>24){count++;bottom=y;}
        if(!count)add('error',`${name}第${col+1}帧为空白，播放会消失`);else feet.push(bottom);
        frames.push(hash(frame));
      }
      clip.uniqueFrames=new Set(frames).size;
      if(name.startsWith('walk')&&clip.frames>=4&&clip.uniqueFrames<=2)add('warning',`${name}声明${clip.frames}帧，但只有${clip.uniqueFrames}张不同图，需复核是否重复拼帧`);
      if(feet.length){clip.baselineRange=Math.max(...feet)-Math.min(...feet);if(clip.baselineRange>fh*.06)add('warning',`${name}脚底位置波动${clip.baselineRange}px，需目视判断是否漂浮`);}
    }
  }else if(/\/(anim-|sprite-)/.test(p)&&scope==='运行目录')add('warning','动画/精灵文件没有可匹配的帧布局元数据，需核对运行映射');
  const short=p.replace(/^public\/art\/pixel\//,'').replace(/\.[^.]+$/,'');
  row.reference=scope==='运行目录'&&(sourceText.includes('/'+p.slice(7))||sourceText.includes('"'+short+'"')||sourceText.includes('`'+short+'`'))?'检索到代码或案例引用':'未静态证明引用（可能动态加载）';
  if(!seen.has(sha)){
    const preview=`previews/${sha.slice(0,24)}.webp`;
    await sharp(buf,{animated:false}).resize({width:640,height:480,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toFile(path.join(output,preview));
    seen.set(sha,preview);
  }
  row.preview=seen.get(sha);row.url=p.startsWith('public/')?'/'+p.slice(7):null;
  row.status=row.checks.some(x=>x.severity==='error')?'机检异常':row.checks.some(x=>x.severity==='warning')?'需复核':scope==='未认领收件'?'待认领':'待人工验收';
 }catch(error){row.status='无法读取';row.checks.push({severity:'error',text:error.message});failures.push(p);}
 assets.push(row);
}
// Sequential images limit memory while sheet-frame checks are in progress.
for(let index=0;index<inputs.length;index++){await inspect(inputs[index]);if(index%75===0)console.log(`Audited ${index+1}/${inputs.length}`);}
const missing=deliveries.filter(r=>r.target_file&&!fs.existsSync(path.join(project,r.target_file))).map(r=>({id:r.asset_id,path:r.target_file}));
const summary={date:'2026-10-18',total:assets.length,unique:seen.size,duplicates:assets.length-seen.size,missing,failures,statuses:Object.fromEntries([...new Set(assets.map(x=>x.status))].map(s=>[s,assets.filter(x=>x.status===s).length])),scopes:Object.fromEntries([...new Set(assets.map(x=>x.scope))].map(s=>[s,assets.filter(x=>x.scope===s).length]))};
const data={summary,assets};
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(data,null,2));
fs.mkdirSync(path.join(project,'docs/art/acceptance'),{recursive:true});
fs.writeFileSync(path.join(project,'docs/art/acceptance/inventory-2026-10-18.json'),JSON.stringify(data,null,2));
const quote=x=>'"'+String(x??'').replaceAll('"','""')+'"';
fs.writeFileSync(path.join(project,'docs/art/acceptance/inventory-2026-10-18.csv'),['path,group,scope,width,height,alpha,status,issues',...assets.map(a=>[a.path,a.group,a.scope,a.width,a.height,a.alpha,a.status,a.checks.map(c=>c.text).join('；')].map(quote).join(','))].join('\n')+'\n');
fs.writeFileSync(path.join(project,'docs/art/acceptance/technical-audit-2026-10-18.md'),`# 素材验收批次：2026-10-18\n\n扫描${summary.total}张图片，按字节去重后${summary.unique}张，重复副本${summary.duplicates}张。运行目录${summary.scopes['运行目录']}张；源图与候选${summary.scopes['源图与候选']}张；原始收件${summary.scopes['未认领收件']}张。\n\n本报告检查尺寸、真实透明度、交付登记、动画网格、空帧和精确重复帧。机检通过不等于画风、动作或场景布置已验收；动态引用不能仅凭字符串搜索确认。\n\n## 登记目标缺失\n\n${missing.map(x=>'- '+x.path).join('\n')||'无。'}\n\n## 需修正或复核的文件\n\n${assets.filter(a=>a.checks.some(c=>c.severity!=='info')).map(a=>'### '+a.path+'\n\n'+a.checks.map(c=>'- '+c.severity+'：'+c.text).join('\n')).join('\n\n')}\n`);
console.log(JSON.stringify(summary));
