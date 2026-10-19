import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { PHOTO_FACES, DETECTIVE_PHOTO_KEY, validPhoto, loadDetectivePhoto, saveDetectivePhoto } from '../public/detective-id.js';
import { buildGraduationReport, saveGraduationReport, loadGraduationReport, graduationText } from '../public/graduation-report.js';
const memory = () => { const values = new Map(); return { getItem:key=>values.get(key)??null, setItem:(key,value)=>values.set(key,value) }; };
const photo = { version:1, face:'happy', takenAt:'2026-10-19T00:00:00.000Z' };
test('every selectable expression is delivered art; arbitrary paths and malformed photos are rejected',()=>{
 for(const face of PHOTO_FACES) assert.ok(existsSync(new URL(`../public/art/faces/lumi-${face.id}.webp`,import.meta.url)));
 for(const value of [null,{}, {...photo,face:'../../other'},{...photo,takenAt:'not-a-date'},{...photo,version:2}])assert.equal(validPhoto(value),null);
 assert.deepEqual(validPhoto({...photo,src:'https://example.com'}),photo);
});
test('confirmed photo persists and corrupt storage does not invent a selection',()=>{
 const storage=memory();assert.equal(loadDetectivePhoto(storage),null);assert.equal(saveDetectivePhoto(photo,storage),true);assert.deepEqual(loadDetectivePhoto(storage),photo);
 assert.equal(saveDetectivePhoto({...photo,face:'other'},storage),false);assert.deepEqual(loadDetectivePhoto(storage),photo);
 storage.setItem(DETECTIVE_PHOTO_KEY,'{broken');assert.equal(loadDetectivePhoto(storage),null);
 assert.equal(saveDetectivePhoto(photo,{setItem(){throw Error('blocked');}}),false);
});
test('sealed report preserves the chosen photo and export names its expression',()=>{
 const storage=memory(),report=buildGraduationReport({photo});saveGraduationReport(report,storage);
 assert.deepEqual(loadGraduationReport(storage).photo,photo);assert.match(graduationText(report),/证件照表情：开心/);
 assert.equal(buildGraduationReport().photo,null);
});
test('old signed reports can acquire the confirmed profile photo without losing date or behavior',()=>{
 const storage=memory();saveDetectivePhoto(photo,storage);
 const report=buildGraduationReport({habits:{longestIdleSeconds:80},now:'2026-10-18T12:00:00.000Z'});report.copyVersion=2;delete report.photo;saveGraduationReport(report,storage);
 const upgraded=loadGraduationReport(storage);assert.deepEqual(upgraded.photo,photo);assert.equal(upgraded.issuedAt,report.issuedAt);assert.equal(upgraded.habits.longestIdleSeconds,80);assert.equal(upgraded.subject,'路米');
});
