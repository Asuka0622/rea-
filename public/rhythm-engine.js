export const RHYTHM_WINDOWS = { practice: [70,140,210], standard: [40,85,130] };
export function makeChart(spec = {}) {
 const bpm=Number.isFinite(spec.bpm)?Math.max(60,Math.min(180,spec.bpm)):104, beat=60000/bpm;
 const source=spec.notes?.length?spec.notes:Array.from({length:32},(_,i)=>({beat:i<8?i*1.5:12+(i-8),kind:[0,3,6].includes(i%8)?'sync':'upload'}));
 return {bpm,beat,notes:source.map((n,i)=>({id:i,kind:n.kind==='sync'?'sync':'upload',at:(Math.max(4,spec.lead||4)+Math.max(0,Number(n.beat)||0))*beat})).sort((a,b)=>a.at-b.at).map((n,id)=>({...n,id}))};
}
export function createRhythmRun(chart,mode='practice'){
 const windows=RHYTHM_WINDOWS[mode]||RHYTHM_WINDOWS.practice,notes=chart.notes.map(n=>({...n,result:null,error:null}));
 let combo=0,best=0,strays=0;
 const judge=(note,result,error=null)=>{if(note.result)return null;note.result=result;note.error=error;if(['perfect','great','good'].includes(result)){combo++;best=Math.max(best,combo);}else combo=0;return {...note};};
 return {notes,windows,
  press(kind,time){const n=notes.filter(n=>!n.result&&Math.abs(time-n.at)<=windows[2]).sort((a,b)=>Math.abs(time-a.at)-Math.abs(time-b.at))[0];if(!n){strays++;combo=0;return {result:'empty',kind};}const error=time-n.at;return judge(n,n.kind!==kind?'wrong':Math.abs(error)<=windows[0]?'perfect':Math.abs(error)<=windows[1]?'great':'good',error);},
  expire(time){return notes.filter(n=>!n.result&&time-n.at>windows[2]).map(n=>judge(n,'miss'));},
  summary(){const counts={perfect:0,great:0,good:0,wrong:0,miss:0};for(const n of notes)if(n.result)counts[n.result]++;const judged=Object.values(counts).reduce((a,b)=>a+b,0),earned=counts.perfect+counts.great*.8+counts.good*.5,accuracy=judged?100*earned/(judged+strays):100,finalAccuracy=100*earned/(notes.length+strays||1),done=judged===notes.length;return {counts,combo,best,strays,judged,total:notes.length,accuracy,finalAccuracy,done,passed:done&&finalAccuracy>=70&&['sync','upload'].every(k=>notes.some(n=>n.kind===k&&['perfect','great','good'].includes(n.result)))};}
 };
}

// 2026-10-18（小克）：「信标」谱面。上面的判定引擎是另一个会话写的，没动；这里只加一种谱面：
// 所有请求长得一样，玩家要靠规律认出哪些是程序自己发的——自动上传像节拍器一样每 4 拍一次，
// 用户点的同步没有规律。第三段上传加了随机抖动想混进人群，这时请求上会写出发往哪里，要改看目的地。
export const BEACON_SECTIONS = [
 {id:'steady',from:0,title:'听规律',text:'所有请求长得一样。自动上传像节拍器，每 4 拍准时来一次；你点的同步时有时无。放行（D）你自己的同步，拦截（F）程序偷偷发的。'},
 {id:'busy',from:24,title:'更密',text:'同样的规律，同步更多了。别慌，节拍器还是每 4 拍一次。'},
 {id:'jitter',from:48,title:'它学聪明了',text:'上传加了随机抖动，故意不准时——只听规律靠不住了。现在每个请求都写着发往哪里：看目的地。'}
];
export function makeBeaconChart(spec = {}) {
 const bpm=Number.isFinite(spec.bpm)?spec.bpm:104, beat=60000/bpm, lead=4;
 const sync='api.ledger-sync.example', stats='collect.quiet-stats.example';
 const uploads=[0,4,8,12,16,20, 24,28,32,36,40,44, 48.75,51.5,56.5,59.75,64.5,67.25];
 const syncs=[2.5,9.5,14,21.5, 26,30.5,33,38.5,41,46.5, 50,54,61.5,66];
 const sectionOf=b=>[...BEACON_SECTIONS].reverse().find(s=>b>=s.from).id;
 const raw=[...uploads.map(b=>({beat:b,kind:'upload',host:stats})),...syncs.map(b=>({beat:b,kind:'sync',host:sync}))]
  .map(n=>({...n,section:sectionOf(n.beat),showHost:sectionOf(n.beat)==='jitter'}));
 return {bpm,beat,beacon:true,sections:BEACON_SECTIONS.map(s=>({...s,at:(lead+s.from)*beat})),
  notes:raw.map(n=>({...n,at:(lead+n.beat)*beat})).sort((a,b)=>a.at-b.at).map((n,id)=>({...n,id}))};
}
/** 第一、二段里，自动上传之间的间隔是不是都一样（这就是能被认出来的规律）。 */
export function beaconIntervals(chart, section) {
 const at=chart.notes.filter(n=>n.kind==='upload'&&n.section===section).map(n=>n.at);
 return at.slice(1).map((t,i)=>Math.round(t-at[i]));
}

// 2026-10-19（小克）：正式流程里的「防火墙值班」分三轮，每轮一张谱面。
// 小克（AI 助手）会在请求上标出它的建议：它只会看节奏——落在 4 拍网格上的就说「拦」，别的说「放」。
// 前两轮上传都准点，它全说对；第三轮上传加了抖动、同步碰巧落在网格上，它就开始说错，玩家要看目的地。
export const FIREWALL_ROUNDS = [
 {id:'steady',title:'听规律',bpm:92,uploads:[0,4,8,12,16,20,24,28],syncs:[2.5,9.5,14,21.5,26],showHost:false,xiaoke:false},
 {id:'busy',title:'更密',bpm:104,uploads:[0,4,8,12,16,20,24,28,32,36,40,44,48,52,56],syncs:[1.5,6,9.5,14,18.5,22,27,30.5,34,38.5,42,45.5,50,54.5],showHost:false,xiaoke:true},
 {id:'jitter',title:'它学聪明了',bpm:104,uploads:[0.75,3.5,8.5,11.75,16.5,19.25,25.5,27.75,32.5,35.25,40.75,43.5,48.25,51.5,56.75,59.25],syncs:[2,6,12,14.5,20,24,30,34,38.5,42,46,50.5,54,58],showHost:true,xiaoke:true},
];
/** 每档难度：判定窗口、落速、过关线。 */
export const FIREWALL_LEVELS = {
 easy:{mode:'practice',approach:2400,pass:60},
 normal:{mode:'practice',approach:1800,pass:70},
 hard:{mode:'standard',approach:1500,pass:75},
};
/** 小克只看节奏：离 4 拍网格不到 0.3 拍的，它就认定是定时上传。 */
export function xiaokeGuess(beat){const off=Math.abs(beat-Math.round(beat/4)*4);return off<0.3?'upload':'sync';}
export function makeFirewallRound(round){
 const beat=60000/round.bpm,lead=4,sync='api.ledger-sync.example',stats='collect.quiet-stats.example';
 const raw=[...round.uploads.map(b=>({beat:b,kind:'upload',host:stats})),...round.syncs.map(b=>({beat:b,kind:'sync',host:sync}))];
 return {bpm:round.bpm,beat,beacon:true,round:round.id,
  notes:raw.map(n=>({...n,at:(lead+n.beat)*beat,showHost:round.showHost,hint:round.xiaoke?xiaokeGuess(n.beat):null})).sort((a,b)=>a.at-b.at).map((n,id)=>({...n,id}))};
}
/** 一轮打完：准确率过线、两类都至少判对一次才算过。 */
export function firewallPassed(run,level='normal'){const pass=(FIREWALL_LEVELS[level]||FIREWALL_LEVELS.normal).pass,s=run.summary();return s.done&&s.finalAccuracy>=pass&&['sync','upload'].every(k=>run.notes.some(n=>n.kind===k&&['perfect','great','good'].includes(n.result)));}
