import {test} from "node:test";
import assert from "node:assert/strict";
import {nearestTalkNpc,NPC_TALK_RADIUS} from "../public/npc-interaction.js";
test("NPC interaction picks nearest within reach instead of array order",()=>{
 const far={id:"far",x:20,y:0},near={id:"near",x:5,y:0};
 assert.equal(nearestTalkNpc([far,near],{x:0,y:0}),near);
 assert.equal(nearestTalkNpc([far],{x:100,y:0}),null);
 assert.equal(nearestTalkNpc([{id:"edge",x:NPC_TALK_RADIUS,y:0}],{x:0,y:0}).id,"edge");
});
test("proximity selection alone is inert and repeatable",()=>{
 const npc=Object.freeze({id:"test",x:10,y:10});
 for(let i=0;i<4;i++)assert.equal(nearestTalkNpc([npc],{x:10,y:20}),npc);
 assert.equal(nearestTalkNpc([npc],{x:NaN,y:0}),null);
 assert.equal(nearestTalkNpc([],{x:0,y:0}),null);
});
