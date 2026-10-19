import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {createNpcDialogue,matchesDialogue,timeBandOf,portraitCandidates,NPC_DIALOGUE_KEY} from "../public/npc-dialogue.js";
import {NPC_DIALOGUE_PROFILES as profiles} from "../public/npc-dialogue-data.js";
const storage=()=>({value:"",getItem(){return this.value},setItem(k,v){assert.equal(k,NPC_DIALOGUE_KEY);this.value=v}});
test("time bands cover midnight and unknown time stays unknown",()=>{
 assert.equal(timeBandOf(0),"night");assert.equal(timeBandOf(300),"dawn");assert.equal(timeBandOf(480),"morning");
 assert.equal(timeBandOf(720),"afternoon");assert.equal(timeBandOf(1020),"evening");assert.equal(timeBandOf(1260),"night");assert.equal(timeBandOf(null),null);
});
test("runtime dialogue data matches all 256 authored lines",()=>{
 const source=JSON.parse(fs.readFileSync(new URL("../docs/world/npc-life-dialogue-2026-10-18.json",import.meta.url)));
 assert.deepEqual(profiles,source.npcs.map(p=>({id:p.id,name:p.name,dialogues:p.dialogues})));
 assert.equal(new Set(profiles.flatMap(p=>p.dialogues.map(d=>d.id))).size,256);
});
test("rain, shelter, season and rain-cleared age are conjunctive facts",()=>{
 const lines=profiles[0].dialogues;
 const outside=lines.find(d=>d.id.endsWith(".rain-exposed")), covered=lines.find(d=>d.id.endsWith(".rain-sheltered"));
 assert.ok(matchesDialogue(outside,{weather:"rain",shelter:"exposed"}));
 assert.ok(!matchesDialogue(outside,{weather:"rain",shelter:"indoors"}));
 assert.ok(matchesDialogue(covered,{weather:"storm",shelter:"covered"}));
 const snow=lines.find(d=>d.id.endsWith(".snow"));
 assert.ok(!matchesDialogue(snow,{season:"winter",weather:"clear"}));
 assert.ok(!matchesDialogue(snow,{season:"summer",weather:"snow"}));
 const rain=lines.find(d=>d.id.endsWith(".rain-cleared"));
 assert.ok(matchesDialogue(rain,{weather:"clear",recentEvent:"rain-cleared",eventAgeMinutes:29}));
 assert.ok(!matchesDialogue(rain,{weather:"clear",recentEvent:"rain-cleared",eventAgeMinutes:31}));
 assert.ok(!matchesDialogue(rain,{weather:"clear",recentEvent:"rain-cleared",eventAgeMinutes:-1}));
});
test("unknown environment selects neutral lines and never invents weather",()=>{
 const engine=createNpcDialogue({profiles,storage:storage(),now:()=>10,cooldownMs:0,rng:()=>0});
 for(const p of profiles){const line=engine.select(p.id,{});assert.equal(line.kind,"idle");assert.equal(line.who,p.id);}
});
test("cooldown and six-line memory persist without touching task keys",()=>{
 const saved=storage();let stamp=100;
 const e=createNpcDialogue({profiles,storage:saved,now:()=>stamp,rng:()=>0});
 const first=e.select("baker",{minutes:600,season:"autumn"});
 assert.ok(first);assert.equal(e.select("baker",{minutes:600}),null);
 stamp+=6001;
 const reloaded=createNpcDialogue({profiles,storage:saved,now:()=>stamp,rng:()=>0});
 const second=reloaded.select("baker",{minutes:600,season:"autumn"});
 assert.notEqual(first.id,second.id);
 for(let i=0;i<15;i++){stamp+=6001;assert.ok(reloaded.select("baker",{minutes:600,season:"autumn"}));}
 assert.ok(JSON.parse(saved.value).baker.recent.length<=6);
});
test("private door replies cannot be chosen for a street conversation",()=>{
 const p=profiles.find(p=>p.id==="student"),school=p.dialogues.find(d=>d.id.endsWith(".morning"));
 assert.equal(school.channel,"door-response");
 assert.ok(!matchesDialogue(school,{minutes:600}));
 assert.ok(matchesDialogue(school,{minutes:600},"door-response"));
});
test("portrait aliases and unsure fallback refer to existing identities",()=>{
 assert.equal(portraitCandidates("wang-nainai","normal")[0],"grandma-normal");
 assert.equal(portraitCandidates("lao-qin","normal")[0],"archivist-normal");
 assert.deepEqual(portraitCandidates("smith-release","unsure"),["smith-unsure","smith-thinking","smith-normal"]);
});
test("broken or unwritable memory never blocks chatter, and neutral exhaustion recovers",()=>{
 const bad={getItem(){return "{"},setItem(){throw Error("full")}};
 const e=createNpcDialogue({profiles,storage:bad,rng:()=>0,now:()=>0,cooldownMs:0});
 const seen=[];for(let i=0;i<20;i++)seen.push(e.select("baker",{}).id);
 assert.ok(seen.every((id,i)=>!i||id!==seen[i-1]));
 assert.equal(e.select("unknown",{}),null);
});
