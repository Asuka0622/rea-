import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {deflateSync} from 'node:zlib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../samples/game-mods');
const field = (key,label,value,min,max,step=1) => ({key,label,value,min,max,step});
const definitions = [
  {id:'training-sword',name:'训练剑 Mod',game:'Luanti / Minetest Game',description:'新增一把训练剑，调整伤害、攻击间隔和耐久。',lesson:'工具注册 → 战斗数值 → 合成配方',docs:'https://api.luanti.org/tool-capabilities/',fields:[field('damage','满蓄力伤害',6,1,30),field('interval','攻击间隔（秒）',1,0.2,3,0.1),field('uses','攻击耐久（次）',100,10,2000)],entry:'init.lua',install:'需要 Luanti 5.9+ 和 Minetest Game（含 default 模组）。解压到用户 mods/rea_training_sword，进入世界设置启用。用 /giveme rea_training_sword:sword 取得训练剑；需 giveme 权限。'},
  {id:'healing-food',name:'回血食物与配方 Mod',game:'Luanti / Minetest Game',description:'新增苹果点心，调整回血量和每次合成产量。',lesson:'物品注册 → 使用回调 → 配方产出',docs:'https://api.luanti.org/core-namespace-reference/',fields:[field('heal','单份回复生命',4,1,20),field('yield','合成产量（份）',1,1,8)],entry:'init.lua',install:'需要 Luanti 5.9+ 和 Minetest Game（含 default 模组）。解压到用户 mods/rea_healing_food 并启用。两个 default:apple 可无序合成点心；/giveme rea_healing_food:snack 可直接取得。启用伤害后测试回血。'},
  {id:'training-wall',name:'防御墙数值 Mod',game:'Mindustry',description:'新增防御墙，调整生命、护甲和铜建造成本。',lesson:'Mod 清单 → 建筑定义 → 贴图资源',docs:'https://mindustrygame.github.io/wiki/modding/1-modding/',fields:[field('health','建筑生命',400,100,4000),field('armor','护甲',2,0,20),field('copper','铜建造成本',6,1,100)],entry:'content/blocks/training-wall.json',install:'在 Mindustry 的 Mods 页面导入导出的 ZIP，重启游戏。在沙盒模式测试训练墙；研究树挂在 copper-wall 下。声明最低构建版本 146，仍需在你的安装版本内验证兼容性。'},
  {id:'battle-demo',name:'像素战斗 Demo',game:'原创网页游戏 / JavaScript',description:'试玩回合战斗，调整双方生命与攻击，再导出独立网页。',lesson:'游戏入口 → 状态循环 → 数值配置',docs:null,fields:[field('playerHp','玩家生命',40,10,200),field('playerAttack','玩家攻击',8,1,40),field('enemyHp','敌人生命',30,10,200),field('enemyAttack','敌人攻击',5,1,30)],entry:'index.html',install:'解压后直接打开 index.html。无需安装引擎，无网络依赖。每次攻击后敌人反击；一方生命归零则结束。balance.json 记录导出时的数值；再次调整请回工作台生成新版本。'},
];
export function modDefinition(id) {
  const item=definitions.find(item=>item.id===id);
  if (!item) throw new Error('没有这个游戏例子');
  return item;
}
export function validateModValues(id, input) {
  const item=modDefinition(id);
  if (input===undefined) return Object.fromEntries(item.fields.map(f=>[f.key,f.value]));
  if (!input || typeof input!=='object' || Array.isArray(input) || Object.keys(input).some(key=>!item.fields.some(f=>f.key===key))) throw new Error('数值配置格式不正确');
  return Object.fromEntries(item.fields.map(f=>{
    const value=input[f.key];
    if (typeof value!=='number' || !Number.isFinite(value) || value<f.min || value>f.max || Math.abs((value-f.min)/f.step-Math.round((value-f.min)/f.step))>1e-7) throw new Error(`${f.label} 需要在 ${f.min}～${f.max} 之间，步长 ${f.step}`);
    return [f.key,value];
  }));
}
const json = value=>JSON.stringify(value,null,2)+'\n';

function battleHtml(v) {
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>REA 像素战斗 Demo</title><style>body{margin:0;background:#111722;color:#e6ddc3;font:16px/1.7 system-ui;text-align:center;padding:22px;box-sizing:border-box}h1{font-size:24px;color:#d6aa57}main{max-width:620px;margin:auto}.arena{display:flex;justify-content:space-around;gap:20px;margin:24px 0}.fighter{font-weight:bold}.sprite{width:48px;height:56px;background:#d6aa57;margin:16px auto;box-shadow:inset 0 -20px #263e37;border:4px solid #e6ddc3}.enemy{background:#a95745;box-shadow:inset 0 -20px #4b302c}progress{width:100%;max-width:210px;accent-color:#d6aa57}button{border:2px solid #d6aa57;background:#263e37;color:#e6ddc3;padding:10px 18px;font:inherit;cursor:pointer;margin:5px}button:disabled{opacity:.5;cursor:default}button:focus-visible{outline:3px solid #e6ddc3}#log{min-height:54px}small{display:block}</style><main><h1>像素战斗 Demo</h1><p>每次攻击后，存活的敌人会反击。</p><div class="arena"><div class="fighter"><div class="sprite"></div>探索者<p id="player"></p><progress id="player-bar"></progress></div><div class="fighter"><div class="sprite enemy"></div>训练守卫<p id="enemy"></p><progress id="enemy-bar"></progress></div></div><p id="log" role="status" aria-live="polite"></p><button id="attack">攻击</button><button id="restart">重新开始</button><small>原创教学 Demo · 数值来源于本次导出的 balance.json</small></main><script>const balance=${JSON.stringify(v)};let player,enemy;const el=id=>document.getElementById(id);function draw(){el('player').textContent=player+' / '+balance.playerHp+' HP';el('enemy').textContent=enemy+' / '+balance.enemyHp+' HP';el('player-bar').max=balance.playerHp;el('player-bar').value=player;el('enemy-bar').max=balance.enemyHp;el('enemy-bar').value=enemy;el('attack').disabled=player<=0||enemy<=0;}function reset(){player=balance.playerHp;enemy=balance.enemyHp;el('log').textContent='轮到你了。';draw();}el('attack').onclick=()=>{if(player<=0||enemy<=0)return;enemy=Math.max(0,enemy-balance.playerAttack);if(enemy>0)player=Math.max(0,player-balance.enemyAttack);el('log').textContent=enemy===0?'胜利！训练守卫倒下了。':player===0?'探索者倒下了，调整数值后再试。':'你造成 '+balance.playerAttack+' 点伤害；敌人反击 '+balance.enemyAttack+' 点。';draw();};el('restart').onclick=reset;reset();</script></html>`;
}
export function buildModFiles(id,input) {
  const item=modDefinition(id),v=validateModValues(id,input);
  const files={};
  if(id==='training-sword') {
    files['mod.conf']='name = rea_training_sword\ndescription = REA training sword\ndepends = default\nmin_minetest_version = 5.9\n';
    files['init.lua']=`-- REA authored teaching mod; values are intentionally easy to inspect.\nlocal damage = ${v.damage}\nlocal interval = ${v.interval}\nlocal uses = ${v.uses}\ncore.register_tool("rea_training_sword:sword", {\n  description = "REA Training Sword",\n  inventory_image = "default_tool_steelsword.png",\n  tool_capabilities = {full_punch_interval = interval, max_drop_level = 0,\n    groupcaps = {}, damage_groups = {fleshy = damage}, punch_attack_uses = uses}\n})\ncore.register_craft({output = "rea_training_sword:sword", recipe = {\n  {"default:steel_ingot"}, {"default:steel_ingot"}, {"default:stick"}\n}})\n`;
  } else if(id==='healing-food') {
    files['mod.conf']='name = rea_healing_food\ndescription = REA healing food\ndepends = default\nmin_minetest_version = 5.9\n';
    files['init.lua']=`-- REA authored teaching mod.\nlocal heal = ${v.heal}\nlocal yield = ${v.yield}\ncore.register_craftitem("rea_healing_food:snack", {\n  description = "REA Apple Snack", inventory_image = "default_apple.png",\n  on_use = core.item_eat(heal)\n})\ncore.register_craft({type = "shapeless", output = "rea_healing_food:snack " .. yield,\n  recipe = {"default:apple", "default:apple"}\n})\n`;
  } else if(id==='training-wall') {
    files['mod.json']=json({name:'rea-training-wall',displayName:'REA Training Wall',author:'REA Workbench',description:'Authored numeric mod exercise',version:'1.0',minGameVersion:'146'});
    files[item.entry]=json({type:'Wall',name:'REA Training Wall',description:'Training wall for numeric balancing.',health:v.health,armor:v.armor,size:1,requirements:[`copper/${v.copper}`],category:'defense',research:'copper-wall'});
    files['sprites/blocks/training-wall.png']=wallSprite();
  } else {
    files['index.html']=battleHtml(v);
    files['balance.json']=json(v);
  }
  files['workbench-mod.json']=json({format:'rea-teaching-mod-v1',id});
  files['README.md']=`# ${item.name}\n\n工作台原创教学样本，非上游官方游戏 Demo。\n\n## 使用\n${item.install}\n\n## 数值\n${item.fields.map(f=>`- ${f.label}: ${v[f.key]}`).join('\n')}\n\n${item.docs?'API 依据：'+item.docs:'原创 JavaScript 回合战斗，MIT 许可。'}\n\nLuanti/Mindustry 模组仅校验文件结构与数值生成，未进行真实游戏内加载验证。请在游戏中测试平衡与兼容性。网页版已可直接试玩。\n`;
  files['LICENSE']='MIT License\n\nCopyright (c) 2026 REA Workbench contributors\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.\n';
  return {item,values:v,files};
}
export function gameModCatalog() {
  return definitions.map(item=>({...item,values:validateModValues(item.id),path:path.join(root,item.id),ready:fs.existsSync(path.join(root,item.id,'workbench-mod.json'))}));
}
export function writeModFiles(target,files) {
  for(const [name,data] of Object.entries(files)) {
    // Only internally authored relative paths are accepted, never a client-supplied path.
    if(path.isAbsolute(name)||name.split(/[\\/]/).includes('..')) throw new Error('无效的样本文件名');
    const dest=path.join(target,name);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,data);
  }
}
export function inspectModProject(target) {
  const read = name=>{
    const file=path.join(target,name),stat=fs.lstatSync(file);
    if(!stat.isFile()||stat.isSymbolicLink()||stat.size>1024*1024) throw new Error('样本文件缺失、过大或不是普通文件');
    return fs.readFileSync(file,'utf8');
  };
  const marker=JSON.parse(read('workbench-mod.json'));
  if(marker.format!=='rea-teaching-mod-v1') throw new Error('不是工作台教学 Mod 格式');
  const item=modDefinition(marker.id);
  const text=read(item.entry);
  let values;
  if(item.id==='training-wall') {const wall=JSON.parse(text);values={health:wall.health,armor:wall.armor,copper:Number(wall.requirements?.[0]?.split('/')[1])};}
  else if(item.id==='battle-demo') values=JSON.parse(read('balance.json'));
  else values=Object.fromEntries(item.fields.map(f=>[f.key,Number(text.match(new RegExp(`^local ${f.key} = ([0-9.]+)$`,'m'))?.[1])]));
  values=validateModValues(item.id,values);
  const files=Object.keys(buildModFiles(item.id,values).files).map(name=>({path:name,size:fs.lstatSync(path.join(target,name)).size}));
  const raw={scanner:'rea-workbench/inert-mod-scan',target,id:item.id,values,files,entry:item.entry,source:text};
  const report={title:'游戏 Mod 与数值结构',headline:`这是「${item.name}」，从实际样本读取了 ${item.fields.length} 个可调整数值。`,facts:[{label:'目标游戏',value:item.game},{label:'数值参数',value:String(item.fields.length)},{label:'入口',value:item.entry},{label:'样本文件',value:String(files.length)}],sections:[
    {title:'当前数值与教学默认值',explain:'当前值来自 Lua 常量、建筑 JSON 或 Demo 的 balance.json；默认值是本工作台的练习基准，不是游戏原版数据。',table:{columns:['参数','当前值','练习默认值','来源'],rows:item.fields.map(f=>[f.label,values[f.key],f.value,item.id==='battle-demo'?'balance.json':item.entry])}},
    {title:'Mod 文件组成',explain:'只读文件列表与入口，不执行 Lua、JavaScript 或游戏。',table:{columns:['路径','字节'],rows:files.map(f=>[f.path,f.size])}},
    {title:'制作与验证步骤',items:[item.lesson,item.install,'修改后先验证语法与结构，再进入目标游戏测试效果和版本兼容性。']},
    {title:'交给 AI 的制作任务',items:['解释这些数值如何影响玩法，并引用实际文件和字段。','为这个原创样本增加一个小功能，说明要修改哪些文件。','设计修改前后的测试场景，区分计算预览与游戏内实测。']}
  ],cautions:['这是工作台原创的 API 教学样本，不是完整游戏源码或上游官方 Demo。','报告来自本机静态读取；Luanti/Mindustry 的游戏内兼容性与效果尚未验证。'],nextSteps:[]};
  return {raw,report};
}

// Small uncompressed ZIP writer: generated names only, UTF-8, CRC32 verified by tests.
function crc32(data) {let c=0xffffffff;for(const b of data){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
export function modZip(files) {
  const local=[],central=[];let offset=0;
  for(const [name,data] of Object.entries(files)) {
    const n=Buffer.from(name),b=Buffer.isBuffer(data)?data:Buffer.from(data),crc=crc32(b);
    const h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50);h.writeUInt16LE(20,4);h.writeUInt16LE(0x800,6);h.writeUInt16LE(33,12);h.writeUInt32LE(crc,14);h.writeUInt32LE(b.length,18);h.writeUInt32LE(b.length,22);h.writeUInt16LE(n.length,26);
    local.push(h,n,b);
    const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(0x800,8);c.writeUInt16LE(33,14);c.writeUInt32LE(crc,16);c.writeUInt32LE(b.length,20);c.writeUInt32LE(b.length,24);c.writeUInt16LE(n.length,28);c.writeUInt32LE(offset,42);central.push(c,n);offset+=h.length+n.length+b.length;
  }
  const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(local.length/3,8);end.writeUInt16LE(local.length/3,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
  return Buffer.concat([...local,directory,end]);
}
function wallSprite() {
  const rows=Buffer.alloc(32*(1+32*4));
  for(let y=0;y<32;y++)for(let x=0;x<32;x++) {const edge=x<3||y<3||x>28||y>28;const seam=x===15||y===15;const color=edge?[40,43,38]:seam?[97,97,79]:[214,170,87];const i=y*129+1+x*4;rows.set([...color,255],i);}
  const chunk=(name,data)=>{const n=Buffer.from(name),b=Buffer.alloc(data.length+12);b.writeUInt32BE(data.length);n.copy(b,4);data.copy(b,8);b.writeUInt32BE(crc32(Buffer.concat([n,data])),8+data.length);return b;};
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(32,0);ihdr.writeUInt32BE(32,4);ihdr[8]=8;ihdr[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('tEXt',Buffer.from('Origin\0Original procedural pixel sprite; lib/game-mods.mjs wallSprite(), REA Workbench, 2026-10-13')),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {console.log(json(inspectModProject(path.resolve(process.argv[2]||'.')).raw));} catch(error) {console.error(error.message);process.exitCode=1;}
}
