import test from 'node:test';
import assert from 'node:assert/strict';
import {nichePlacement} from '../../shared/lrf-3d/niche-placement-math.js';
import {validateNiches} from '../../shared/lrf-3d/niches.js';
const room={points:[[0,0],[450,0],[450,450],[0,450]],height:260};
test('All boundary walls accept the pointer location, not the selected-wall centre',()=>{
 for(let i=0;i<4;i++){
  const {niche,error}=nichePlacement(room,'boundary-'+i,125,140);
  assert.equal(error,'');assert.equal(niche.wallKey,'boundary-'+i);assert.equal(niche.u,125);assert.equal(niche.bottom,125);assert.equal(niche.width,60);assert.equal(niche.height,30);assert.equal(niche.depth,8);assert.equal(validateNiches({...room,niches:[niche]}),'');
 }
});
test('Clamp near edges without violating the existing 2cm rule',()=>{
 for(const [x,y] of [[0,0],[450,260],[-100,-100],[1000,1000]]){
  const {niche,error}=nichePlacement(room,'boundary-0',x,y);assert.equal(error,'');assert.equal(validateNiches({...room,niches:[niche]}),'');
 }
});
test('Narrow walls resize the initial niche, without making invalid dimensions',()=>{
 const small={...room,points:[[0,0],[20,0],[20,450],[0,450]]};
 const {niche,error}=nichePlacement(small,'boundary-0',10,100);assert.equal(error,'');assert.equal(niche.width,16);
});
test('Every partition face uses its actual thickness',()=>{
 for(const thickness of [8,12,20])for(const side of [0,1]){
  const config={...room,partitions:[{id:'test',a:[50,50],b:[250,50],height:120,thickness}]};
  const result=nichePlacement(config,'partition-test-'+side,100,80);assert.equal(result.error,'');assert.equal(result.niche.depth,Math.min(10,thickness-2));assert.equal(validateNiches({...config,niches:[result.niche]}),'');
 }
});
test('Reject overlap with doors, windows and tiled columns before modifying the project',()=>{
 const before=JSON.stringify(room);
 assert.match(nichePlacement(room,'boundary-0',125,140,{openings:[{left:1,right:2,bottom:0,top:2}]}).error,/porte ou une fenêtre/);
 assert.match(nichePlacement(room,'boundary-0',125,140,{zones:[{x:100,y:0,width:100,height:260}]}).error,/colonne/);
 assert.equal(JSON.stringify(room),before);
});
test('Reject overlap with an existing niche and keep all original data',()=>{
 const first=nichePlacement(room,'boundary-0',125,140,{id:'niche-original'}).niche;
 const config={...room,niches:[first]},before=JSON.stringify(config);
 assert.match(nichePlacement(config,'boundary-0',125,140).error,/entre les niches/);assert.equal(JSON.stringify(config),before);
});
test('Opposite faces cannot drill through the partition',()=>{
 const config={...room,partitions:[{id:'test',a:[50,50],b:[250,50],height:120,thickness:8}]};
 const first=nichePlacement(config,'partition-test-0',100,80,{id:'niche-first'}).niche;
 assert.match(nichePlacement({...config,niches:[first]},'partition-test-1',100,80).error,/opposées/);
});
test('Do not create a niche for a missing wall or non-finite coordinates',()=>{
 for(const [wall,x,y] of [['floor',100,100],['boundary-0',NaN,10],['boundary-0',10,Infinity]])assert(nichePlacement(room,wall,x,y).error);
});
test('Unsupported thin partitions are rejected before any project mutation',()=>{
 const config={...room,partitions:[{id:'thin',a:[50,50],b:[250,50],height:120,thickness:3}]},before=JSON.stringify(config);
 assert.match(nichePlacement(config,'partition-thin-0',100,80).error,/trop fine/);assert.equal(JSON.stringify(config),before);
});
