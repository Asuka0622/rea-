// Contextual NPC chatter only. Never grants quests, knowledge or achievements.
export const NPC_DIALOGUE_KEY = "rea-npc-dialogue-v1";
export const PORTRAIT_ALIASES = { "wang-nainai": "grandma", "lao-qin": "archivist", "smith-release": "smith" };
export function portraitCandidates(who, face="normal") {
  const id=PORTRAIT_ALIASES[who] || who;
  return [...new Set([id+"-"+face, ...(face==="unsure"?[id+"-thinking"]:[]), id+"-normal"])];
}
export function timeBandOf(minutes) {
  if (!Number.isFinite(minutes)) return null;
  const m=((minutes%1440)+1440)%1440;
  return m<300||m>=1260?"night":m<480?"dawn":m<720?"morning":m<1020?"afternoon":"evening";
}
export function matchesDialogue(line, context={}, channel="talk") {
  if (line.channel!==channel) return false;
  const actual={...context,timeBand:timeBandOf(context.minutes)};
  return Object.entries(line.when||{}).every(([key,want])=>{
    if(key==="withinGameMinutes") return Number.isFinite(actual.eventAgeMinutes)&&actual.eventAgeMinutes>=0&&actual.eventAgeMinutes<=want;
    const value=actual[key];
    if(value===undefined||value===null) return false;
    return Array.isArray(want)?want.includes(value):want===value;
  });
}
function roll(items, weight, rng) {
  const total=items.reduce((n,item)=>n+weight(item),0);
  let r=Math.min(.999999,Math.max(0,Number(rng())||0))*total;
  for(const item of items){r-=weight(item);if(r<0)return item;}
  return items.at(-1);
}
export function createNpcDialogue({profiles=[],storage=globalThis.localStorage,rng=Math.random,now=Date.now,cooldownMs=6000}={}) {
  const byId=new Map(profiles.map(p=>[p.id,p]));
  let memory={};
  try {
    const raw=JSON.parse(storage?.getItem(NPC_DIALOGUE_KEY)||"{}");
    if(raw&&typeof raw==="object"&&!Array.isArray(raw))memory=raw;
  } catch {}
  const weights={weather:50,time:30,season:15,idle:5};
  function select(id,context={}, {channel="talk"}={}) {
    const profile=byId.get(id);if(!profile)return null;
    const old=memory[id];
    const recent=Array.isArray(old?.recent)?old.recent.filter(x=>typeof x==="string").slice(-6):[];
    const stamp=now();
    if(Number.isFinite(old?.lastAt)&&stamp>=old.lastAt&&stamp-old.lastAt<cooldownMs)return null;
    let pool=profile.dialogues.filter(d=>matchesDialogue(d,context,channel));
    if(!pool.length)return null;
    let fresh=pool.filter(d=>!recent.includes(d.id));
    if(!fresh.length){
      // Exhausted context: neutral fallback releases the oldest neutral, not a wrong-weather line.
      const neutral=pool.filter(d=>d.kind==="idle");
      if(!neutral.length)return null;
      fresh=[neutral.find(d=>!recent.includes(d.id))||neutral.reduce((a,b)=>recent.indexOf(a.id)<=recent.indexOf(b.id)?a:b)];
    }
    const kinds=[...new Set(fresh.map(d=>d.kind))];
    const kind=roll(kinds,k=>weights[k]||1,rng);
    const chosen=roll(fresh.filter(d=>d.kind===kind),d=>d.weight||1,rng);
    memory[id]={recent:[...recent.filter(x=>x!==chosen.id),chosen.id].slice(-6),lastAt:stamp};
    try {storage?.setItem(NPC_DIALOGUE_KEY,JSON.stringify(memory));}catch{}
    return {...chosen,who:id,name:profile.name,face:kind==="weather"?"thinking":kind==="season"?"happy":"normal"};
  }
  return {select};
}
