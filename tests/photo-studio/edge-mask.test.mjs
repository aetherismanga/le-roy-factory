import test from 'node:test';
import assert from 'node:assert/strict';
import {createMask,resampleMask} from '../../assets/js/lrf-photo-studio/mask.mjs';

test('preserves all pixels exactly at the same analysis resolution',()=>{
 const source=createMask(3,2,[0,128,255,255,0,90]);
 const cloned=resampleMask(source,3,2);
 assert.deepEqual([...cloned.data],[0,128,255,255,0,90]);
 cloned.data[1]=0;
 assert.equal(source.data[1],128);
});
test('softens an exported mask boundary without changing full coverage',()=>{
 const source=createMask(2,2,[255,0,0,0]);
 const resized=resampleMask(source,4,4);
 assert.equal(resized.data[0],255);
 assert.equal(resized.data[15],0);
 assert.ok(resized.data[5]>0&&resized.data[5]<255);
 assert.equal(resized.data[5],143);
});
test('single-pixel mask stays fully opaque after enlargement',()=>{
 const source=createMask(1,1,[255]);
 const resized=resampleMask(source,10,8);
 assert.equal(resized.data.length,80);
 assert.ok([...resized.data].every(v=>v===255));
});
