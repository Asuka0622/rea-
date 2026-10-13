import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../samples/games');
const definitions=[
  {id:'terraria-examplemod',name:'泰拉瑞亚 · ExampleMod',author:'tModLoader',type:'官方示例 Mod',description:'学习武器伤害、击退、攻击间隔、弹射物和合成配方。',repo:'tModLoader/tModLoader',subdir:'ExampleMod',note:'这是上游开发分支的固定源码快照。游戏内编译时需选择与你的 tModLoader 版本对应的分支。',task:'从 ExampleSpear 的 SetDefaults 开始，解释伤害、击退和攻击间隔，再为一把新武器提出修改方案，并列出游戏内验证步骤。',files:[['Content/Items/Weapons/ExampleSpear.cs','武器属性与配方'],['Content/Projectiles/ExampleSpearProjectile.cs','矛的弹射物行为'],['ExampleMod.cs','Mod 主类'],['build.txt','构建清单']]},
  {id:'stardew-cjb',name:'星露谷物语 · CJB Cheats Menu',author:'CJBok',type:'实际发布的 Mod',description:'查看生命、体力、移动速度和配置菜单怎样连接到游戏逻辑。',repo:'CJBok/SDV-Mods',subdir:'CJBCheatsMenu',note:'源码项目依赖 Stardew Valley 与 SMAPI。安装包入口见上游 README；本地保存的是源码。',task:'追踪 ModConfig 的 InfiniteHealth、InfiniteStamina 和 MoveSpeed 如何被菜单和作弊功能读取，引用文件及行号，区分配置值与运行时修改。',files:[['ModEntry.cs','SMAPI 生命周期入口'],['Framework/Models/ModConfig.cs','数值与功能配置'],['Framework/Cheats/PlayerAndTools/InfiniteHealthCheat.cs','生命恢复实现'],['Framework/Cheats/PlayerAndTools/InfiniteStaminaCheat.cs','体力恢复实现'],['Framework/Cheats/PlayerAndTools/MoveSpeedCheat.cs','移动速度实现'],['manifest.json','SMAPI 清单']]},
  {id:'minecraft-fabric',name:'Minecraft · Fabric Example Mod',author:'FabricMC',type:'官方 Mod 模板',description:'从 Mod 清单、初始化入口和 Mixin 结构开始制作自己的 Mod。',repo:'FabricMC/fabric-example-mod',subdir:'',note:'这是最小模板，尚未实现武器或数值修改。先理解入口，再按对应 Minecraft 版本的 Fabric 文档添加功能。',task:'解释 fabric.mod.json 的 entrypoints 如何对应 ExampleMod.java，说明 Mixin 的用途，再设计一个新物品的最小实现和验证计划。',files:[['src/main/resources/fabric.mod.json','Mod 元数据与入口声明'],['src/main/java/com/example/ExampleMod.java','初始化入口'],['src/main/java/com/example/mixin/ExampleMixin.java','Mixin 示例'],['build.gradle','构建配置'],['gradle.properties','版本与依赖配置']]},
  {id:'godot-open-rpg',name:'Godot · Open RPG',author:'GDQuest',type:'开源 RPG Demo',description:'学习回合战斗、角色属性、地图、对话和场景组织。',repo:'gdquest-demos/godot-open-rpg',subdir:'',note:'上游标注为持续开发中的 Demo；该快照 README 要求 Godot 4.6.2。在编辑器中导入 project.godot。',task:'从 project.godot 的主场景出发，找到回合战斗与角色属性的脚本和资源，说明如何添加一个敌人，并给出修改生命或攻击数值的位置。',files:[['README.md','引擎版本、运行说明与素材署名'],['project.godot','项目与主场景配置'],['combat/battlers/wolf/wolf_stats.tres','狼的生命与攻击力'],['src/combat/actions/battler_action_attack.gd','攻击行动实现'],['src/field/map.gd','地图逻辑']]},
];
export function gameCaseDefinition(id){const item=definitions.find(x=>x.id===id);if(!item)throw new Error('没有这个真实案例');return item;}
export function gameCaseCatalog(){
  let sources=[];try{sources=JSON.parse(fs.readFileSync(path.join(root,'SOURCES.json'),'utf8'));}catch{}
  return definitions.map(item=>{const source=sources.find(x=>x.id===item.id);const target=path.join(root,item.id,item.subdir);return {...item,path:target,repository:'https://github.com/'+item.repo,commit:source?.commit||null,license:source?.license||null,bytes:source?.bytes||0,ready:!!source&&fs.existsSync(path.join(target,'workbench-source.json'))};});
}
function readMarker(target){const file=path.join(target,'workbench-source.json');if(fs.statSync(file).size>4096)throw new Error('案例元数据过大');const marker=JSON.parse(fs.readFileSync(file,'utf8'));if(marker.format!=='rea-upstream-game-v1')throw new Error('不是工作台真实案例源码');const item=gameCaseDefinition(marker.id);if(marker.repository!=='https://github.com/'+item.repo||!(/^[0-9a-f]{40}$/.test(marker.commit)))throw new Error('案例来源元数据不正确');return {marker,item};}
const skips=new Set(['.git','.godot','.gradle','node_modules','bin','obj','build']);
export function inspectGameSource(target){
  const {marker,item}=readMarker(target),files=[],clues=[],entries=[];let readBytes=0,truncated=false;
  const walk=(dir,depth=0)=>{if(depth>40)throw new Error('源码目录层级过深');for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(entry.isSymbolicLink()||skips.has(entry.name))continue;const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file,depth+1);else if(entry.isFile()){if(files.length>=20000)throw new Error('项目超过 20,000 个文件，请选择较小目录');files.push({path:path.relative(target,file).replaceAll('\\','/'),size:fs.statSync(file).size});}}};walk(target);
  const counts={};for(const file of files){const ext=path.extname(file.path)||'(无扩展名)';counts[ext]=(counts[ext]||0)+1;
    if(/(?:^|\/)(?:project\.godot|manifest\.json|fabric\.mod\.json|ModEntry\.cs|ExampleMod\.(?:cs|java)|build\.txt)$/.test(file.path))entries.push(file.path);
    if(!/\.(cs|java|gd|tres|tscn|json|godot)$/.test(file.path)||file.size>1048576)continue;if(readBytes+file.size>12*1048576){truncated=true;continue;}readBytes+=file.size;
    fs.readFileSync(path.join(target,file.path),'utf8').split(/\r?\n/).forEach((line,index)=>{if(clues.length>=70){truncated=true;return;}if(/^\s*(?:\/\/|#|\*)/.test(line))return;if(/(?:damage|knockBack|useTime|shootSpeed|GrowRadius|MoveSpeed|InfiniteHealth|InfiniteStamina|(?:max_)?health|stamina|attack|strength|speed)\b/i.test(line)&&/[=:]/.test(line))clues.push({path:file.path,line:index+1,text:line.trim().slice(0,180)});});
  }
  const guideFiles=item.files.map(([name,purpose])=>{const file=files.find(x=>x.path===name);return {path:name,purpose,present:!!file,lines:file&&file.size<=1048576?fs.readFileSync(path.join(target,name),'utf8').split(/\r?\n/).map((text,index)=>({line:index+1,text})).filter(x=>/base_max_health|base_attack|damage|knockBack|useTime|shootSpeed|GrowRadius|MoveSpeed|InfiniteHealth|InfiniteStamina|player\.health|player\.stamina|onInitialize|entrypoints|run\/main_scene|config\/features/.test(x.text)).slice(0,8):[]};});
  const raw={scanner:'rea-workbench/inert-game-source-scan',target,source:marker,files,counts,entries,clues,guideFiles,truncated,limitations:['Bounded static reading only; no compilation, execution, call-graph reconstruction or game compatibility validation.']};
  const report={title:item.name+' · 源码结构',headline:`读取了 ${item.author} 的真实源码，找到 ${files.length} 个文件。`,facts:[{label:'案例类型',value:item.type},{label:'作者 / 团队',value:item.author},{label:'固定版本',value:marker.commit.slice(0,12)},{label:'源码位置',value:target}],sections:[
    {title:'真实项目来源',items:[marker.repository,'固定提交：'+marker.commit,item.note]},
    {title:'从这些源码开始',explain:'只读本地文件；缺失项会明确标出。',table:{columns:['文件','阅读目的','状态'],rows:guideFiles.map(x=>[x.path,x.purpose,x.present?'已找到':'该版本未找到'])}},
    {title:'实际代码中的属性与数值线索',explain:'按文件顺序提取赋值和配置线索，包含条件及资源引用；不等于完整调用关系。',table:{columns:['文件 : 行','代码'],rows:clues.length?clues.map(x=>[x.path+':'+x.line,x.text]):[['未找到匹配线索','最小模板可能尚未实现数值功能。']]}},
    {title:'文件类型',table:{columns:['扩展名','文件数'],rows:Object.entries(counts).sort((a,b)=>b[1]-a[1])}},
    {title:'游戏与 Mod 入口',items:entries},
    {title:'交给 AI 的学习任务',items:[item.task,'先解释现有实现，再给出最小修改；保留作者与许可证，引用源码路径及行号。']}
  ],cautions:['源码未编译，也未在目标游戏或 Godot 编辑器中运行。','这是工作台补充的本地源码扫描；不代表上游使用了 REA 制作该项目。',...(truncated?['展示最多 70 条线索、读取最多 12 MiB 文本；仍可按学习入口继续阅读源码。']:[])],nextSteps:[]};return {raw,report};
}
export function gameCaseGuide(id){const entry=gameCaseCatalog().find(x=>x.id===gameCaseDefinition(id).id);if(!entry.ready)throw new Error('源码尚未就绪，请完成项目下载后重试');const {raw}=inspectGameSource(entry.path);return {item:entry,files:raw.guideFiles,clues:raw.clues.slice(0,12),entries:raw.entries};}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{console.log(JSON.stringify(inspectGameSource(path.resolve(process.argv[2]||'.')).raw,null,2));}catch(error){console.error(error.message);process.exitCode=1;}}
