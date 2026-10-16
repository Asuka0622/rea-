import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ENV_OPTIONS, normalizeEnvironment, environmentArt, ROOM_WINDOWS, ROOM_LIGHTS } from '../public/game-environment.js';
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

test('room practical lights match known rooms and remain inside the artwork',()=>{
 assert.deepEqual(Object.keys(ROOM_LIGHTS).sort(),Object.keys(ROOM_WINDOWS).sort());
 for(const lights of Object.values(ROOM_LIGHTS))for(const [x,y,color]of lights){assert.ok(x>=0&&x<320&&y>=0&&y<180);assert.match(color,/^#[0-9a-f]{6}$/i);}
});
