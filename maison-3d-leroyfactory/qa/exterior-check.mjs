import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as T from 'three';
import {groundWithPoolHole,excludePoolTriangles} from '../src/exterior.js';
import {collisionWorld} from '../src/house-navigation.js';
import {STONE_SERIES,POOL_PRODUCTS,defaultExterior,validateExterior} from '../src/exterior-products.js';
import {createResidentActions} from '../src/resident-actions.js';
const pool={x:-.37,z:10.9},g=groundWithPoolHole(45,43,pool),p=g.attributes.position,idx=g.index;
let area=0;for(let k=0;k<idx.count;k+=3){const a=new T.Vector3().fromBufferAttribute(p,idx.getX(k)),b=new T.Vector3().fromBufferAttribute(p,idx.getX(k+1)),c=new T.Vector3().fromBufferAttribute(p,idx.getX(k+2));area+=b.clone().sub(a).cross(c.clone().sub(a)).length()/2;const middle=a.clone().add(b).add(c).divideScalar(3);assert.ok(Math.abs(middle.x-pool.x)>=4.05-.00001||Math.abs(middle.z-pool.z)>=2.05-.00001,'No terrain triangle crosses the excavated pool');}
assert.ok(Math.abs(area-(45*43-8.1*4.1))<.001);
const far=new T.PlaneGeometry(260,260,96,96).rotateX(-Math.PI/2),count=far.index.count;excludePoolTriangles(far,pool);assert.ok(far.index.count<count,'Distant terrain also leaves an opening');
const world=collisionWorld({colliders:[],doors:[],floors:[{walls:[]},{walls:[]}]},{obstacles:[{...pool,w:8.18,d:4.18,minY:-1.5,maxY:.25,floor:0,kind:'pool'}]});assert.equal(world.passable(pool.x,pool.z,.02),false);assert.equal(world.passable(pool.x+4.6,pool.z,.02),true);
assert.deepEqual(validateExterior(),defaultExterior());
for(const bad of [{wall:{series:'invented'}},{pool:{product:'studio-one'}},{pool:{level:2}},{pool:{grout:'red'}},{avatar:'unknown'}])assert.throws(()=>validateExterior(bad));
assert.equal(STONE_SERIES.length,3);assert.equal(STONE_SERIES.flatMap(s=>s.colors).length,9);assert.equal(POOL_PRODUCTS.length,6);
for(const url of [...STONE_SERIES.flatMap(s=>s.colors.map(c=>c.image)),...POOL_PRODUCTS.flatMap(p=>[p.image,...p.preview?[p.preview]:[]])])assert.ok(fs.statSync('.'+url).size>200,url);
for(const file of ['resident-v1.glb','resident-female-v2.glb']){const b=fs.readFileSync('assets/avatar/'+file);assert.equal(b.readUInt32LE(0),0x46546c67);const gltf=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());assert.equal(gltf.skins[0].joints.length,80);assert.ok(gltf.meshes.some(m=>m.weights?.length===4));}
for(const f of fs.readdirSync('assets/avatar').filter(f=>f.endsWith('.webp')))assert.ok(fs.statSync('assets/avatar/'+f).size>200,f+' must not be empty');
// A collision route can end 3 cm from its goal and stop another 6 cm away.
// Sitting must accept that legitimate arrival rather than leaving a pending
// action forever while the character's controller has already stopped.
const chair=new T.Group();chair.position.y=.02;
const controller={position:new T.Vector3(0,1.6,.94),ground:.02,airborne:false,pathLength:0,moving:false,active:true,stop(){},setActive(v){this.active=v;},setPose(p){this.position.copy(p);},walkTo(){return false;}};
const actions=createResidentActions({walk:controller,getHouse:()=>({arrangement:{items:new Map([['chair',{id:'chair',name:'Chair',kind:'chair',floor:0,root:chair,object:chair}]])}}),getGarden:()=>({seats:[]}),getFloor:()=>0,getWorld:()=>({groundAt:()=>.02,passable:()=>true,route:()=>[],radius:.18}),onStatus(){},onMoveSeat(){throw Error('This chair must not need moving.');}});
assert.equal(actions.sit('chair'),true);assert.equal(actions.tick(.1).seated,true);actions.tick(1);assert.equal(actions.state.transition,null);assert.equal(actions.stand(),true);actions.tick(1);assert.equal(actions.seated,false);assert.equal(controller.active,true);
console.log(JSON.stringify({result:'PASS',excavationArea:8.1*4.1,terrainClear:true,poolCollision:true,stoneSeries:3,stoneColors:9,poolProducts:6,riggedResidents:2,invalidChoicesRejected:true}));
