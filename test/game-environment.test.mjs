import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ENV_OPTIONS, normalizeEnvironment, environmentArt, ROOM_WINDOWS } from '../public/game-environment.js';
const base=new URL('../public/art/pixel/',import.meta.url);
const has=name=>fs.existsSync(new URL(`${name}.png`,base));
test('all 48 environment states resolve existing seasonal map and room art',()=>{
 const scenes=['center','homes','craft','north','south'].map(x=>`regions/town-${x}`).concat(Object.keys(ROOM_WINDOWS).map(x=>`room-${x}`));
 for(const season of Object.keys(ENV_OPTIONS.season)) for(const time of Object.keys(ENV_OPTIONS.time)) for(const weather of Object.keys(ENV_OPTIONS.weather)) {
  const state=normalizeEnvironment({season,time,weather});
  for(const scene of scenes) assert.ok(has(environmentArt(scene,state,has)),`${scene}: ${season}/${time}/${weather}`);
 }
});
test('invalid persisted settings fall back and missing variants never produce missing URLs',()=>{
 assert.deepEqual(normalizeEnvironment(null),{season:'autumn',time:'noon',weather:'clear'});
 assert.equal(environmentArt('eras/china/bianjing',{season:'winter'},()=>false),'eras/china/bianjing');
});
test('window masks stay within room bounds',()=>{
 for(const rects of Object.values(ROOM_WINDOWS))for(const [x,y,w,h]of rects)assert.ok(x>=0&&y>=0&&x+w<=320&&y+h<=180);
});
