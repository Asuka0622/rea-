import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {npcSpriteAsset,npcSpriteLayout,npcSpriteAnimation} from "../public/npc-sprite-assets.js";
import {CHATTER_NPCS} from "../public/npc-chatter.js";
const root=new URL("../",import.meta.url);
const exists=id=>fs.existsSync(new URL("public/art/pixel/"+id+".png",root));
const meta=id=>JSON.parse(fs.readFileSync(new URL("public/art/pixel/"+id+".json",root)));
test("delivered client sprites replace circles through real asset aliases",()=>{
 for(const [id,asset] of [["duoduo","anim-duoduo"],["wang-nainai","anim-grandma"],["smith-release","anim-smith"]]){
  assert.equal(npcSpriteAsset({id},exists),asset);
  assert.ok(npcSpriteLayout(meta(asset)));
 }
 assert.equal(npcSpriteAsset({id:"lao-qin"},()=>false),null);
});
test("dedicated NPC sprite wins over a legacy alias",()=>{
 assert.equal(npcSpriteAsset({id:"duoduo"},id=>id==="sprite-duoduo"||id==="anim-duoduo"),"sprite-duoduo");
});
test("every available town NPC sheet has valid idle and talking fallback within its grid",()=>{
 for(const npc of CHATTER_NPCS){
  const id=npcSpriteAsset(npc,exists);if(!id)continue;
  const json=meta(id),layout=npcSpriteLayout(json);
  assert.ok(layout,id);
  for(const talking of [false,true]){const action=npcSpriteAnimation(json,talking);assert.ok(action,id);assert.ok(action.row<layout.rows&&action.frames<=layout.columns);}
 }
 assert.equal(npcSpriteAnimation(meta("anim-grandma"),true).row,0,"do not invent a fifth talk row in a two-row sheet");
 assert.equal(npcSpriteAnimation(meta("anim-duoduo"),true).row,0,"hugging a cushion is not a talk animation");
 assert.equal(npcSpriteLayout(meta("anim-smith")).columns,4);
 assert.equal(npcSpriteAnimation({frame:[64,96],sheet:[4,2],animations:{idle:{row:4,frames:2}}},false),null);
});
test("all authored case-room investigation items use delivered image props",()=>{
 const cases=new URL("samples/cases/",root);
 for(const name of fs.readdirSync(cases)){
  const path=new URL(name+"/workbench-case.json",cases);
  if(!fs.existsSync(path))continue;
  const item=JSON.parse(fs.readFileSync(path));
  for(const thing of item.game?.puzzle?.scene?.items||[]){
   assert.ok(exists("case-props/"+(thing.art||thing.id)),name+":"+thing.id);
  }
 }
});


test("weather props are explicitly visible and assigned their dedicated images",()=>{
 const item=JSON.parse(fs.readFileSync(new URL("samples/cases/weather-keys/workbench-case.json",root)));
 for(const thing of item.game.puzzle.scene.items){
  assert.equal(thing.hidden,false,thing.id+" must not be hidden as if baked into the empty room");
  assert.equal(thing.art,"weather-keys-"+thing.id);
 }
});