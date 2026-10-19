export const PLAY_RECORD_KEY = 'rea-demo-play-record-v1';
const nonnegative = value => Number.isFinite(value) ? Math.max(0,Math.min(1e8,Math.floor(value))) : null;
const strings = value => [...new Set(Array.isArray(value) ? value.filter(x=>typeof x==='string').slice(0,200) : [])];
export function createPlayRecord(storage = globalThis.localStorage) {
  let raw;try {raw=JSON.parse(storage?.getItem(PLAY_RECORD_KEY)||'null');} catch {}
  let state = { version:1, seconds: raw?.version===1 ? nonnegative(raw.seconds)??0 : 0, worlds: raw?.version===1 ? strings(raw.worlds) : [] }, dirty=0;
  function flush(){if(!dirty)return;try{storage?.setItem(PLAY_RECORD_KEY,JSON.stringify(state));dirty=0;}catch{}}
  return {
    step(dt,active){if(!active||!Number.isFinite(dt)||dt<=0||dt>1)return;state.seconds+=dt;dirty+=dt;if(dirty>=10)flush();},
    visitWorld(id){if(!['bit-town','london-1843','china-1088'].includes(id)||state.worlds.includes(id))return;state.worlds.push(id);dirty+=1;flush();},
    snapshot:()=>({version:1,seconds:Math.floor(state.seconds),worlds:[...state.worlds]}),flush,
    reset(){state={version:1,seconds:0,worlds:[]};dirty=1;flush();},
  };
}
export function cleanGameRecord(raw={}) {
  const named = value => Array.isArray(value) ? value.filter(x=>x&&typeof x.id==='string'&&typeof x.title==='string').slice(0,200).map(x=>({id:x.id,title:x.title,...(Number.isFinite(x.unlockedAt)?{unlockedAt:x.unlockedAt}:{})})).filter((x,i,a)=>a.findIndex(y=>y.id===x.id)===i) : [];
  const result={ achievements:named(raw?.achievements), badges:named(raw?.badges), skills:strings(raw?.skills), regions:strings(raw?.regions), worlds:strings(raw?.worlds), recorded:raw?.recorded===true };
  for(const key of ['playSeconds','achievementTotal','stars','starMax','completedCases','totalCases'])result[key]=nonnegative(raw?.[key]);
  return result;
}
export function playDuration(seconds) {
  if(!Number.isFinite(seconds))return '未记录';
  if(seconds<60)return '不足 1 分钟';
  const minutes=Math.floor(seconds/60);
  return minutes>=60?`${Math.floor(minutes/60)} 小时 ${minutes%60} 分钟`:`${minutes} 分钟`;
}
export function gameRecordLines(value) {
  const data=cleanGameRecord(value);
  const worlds={'bit-town':'比特镇','london-1843':'1843年伦敦 · 剧情引入','china-1088':'约1088年汴京'};
  return [
    ['游玩时长',`${playDuration(data.playSeconds)}${data.playSeconds===null?'':'（前台累计）'}`],
    ['游玩世界',data.worlds.map(id=>worlds[id]||id).join('、')||'未记录'],
    ['探索地区',data.regions.join('、')||'未记录'],
    ['委托结案',data.completedCases===null?'未记录':`${data.completedCases} / ${data.totalCases??'—'} 份`],
    ['破案星级',data.stars===null?'未记录':`${data.stars} / ${data.starMax??'—'} 星`],
    ['解锁成就',data.recorded?`${data.achievements.length} / ${data.achievementTotal??'—'} 项`:'旧报告未记录'],
    ['学会的知识',data.recorded?`${data.skills.length} 项`:'旧报告未记录'],
    ['获得徽章',data.badges.map(b=>b.title).join('、')||(data.recorded?'暂无':'旧报告未记录')],
  ];
}
export function renderGameRecord(h,value) {
  const data=cleanGameRecord(value);
  return h('section',{class:'graduation-game-record','aria-label':'路米的游玩纪念'},h('h3',{},'这一程，留下了什么'),
    h('dl',{},...gameRecordLines(data).map(([label,text])=>h('div',{},h('dt',{},label),h('dd',{},text)))),
    h('p',{class:'graduation-record-scope'},'委托、成就、技能和探索为本机存档累计，记录截至报告签发；游玩时长只计功能接入后的前台游戏时间，包含读对白与操作菜单，后台不计。'),
    h('details',{},h('summary',{},'查看解锁的成就与知识'),
      h('h4',{},'已解锁成就'),...(data.achievements.length?[h('ul',{},...data.achievements.map(a=>h('li',{},a.title)))]:[h('p',{},data.recorded?'这份记录里还没有解锁成就。':'旧报告没有保存成就快照，未用当前进度回填。')]),
      h('h4',{},'学会的知识'),h('p',{},data.skills.join('、')||(data.recorded?'暂未记录到知识解锁。':'旧报告未记录。'))));
}
