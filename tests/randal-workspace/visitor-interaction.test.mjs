import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {makeModel} from '../../studio-one/src/model.js';
import {makeModel as makeGeneralModel} from '../../randal-general/src/model.js';
import {makeColumn} from '../../studio-one/src/column.js';
import {makeColumn as makeGeneralColumn} from '../../randal-general/src/column.js';
import {makeOpening} from '../../shared/lrf-3d/openings.js';
import {CABINET_FORMATS} from '../../randal-general/src/configuration.js';
import {createVisitorInteraction,resolveVisitorContact} from '../../shared/lrf-3d/visitor-interaction.js';

function item(asset,type='cabinet'){const root=asset.root;new T.Scene().add(root);return {id:'qa-'+type,type,asset,root,settings:{}};}
function clean(value){value.root.traverse(o=>{o.geometry?.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m?.dispose();});}
function actor(z=.56){
 const root=new T.Group();root.position.z=z;root.rotation.y=Math.PI;
 for(const [side,sign]of [['L',1],['R',-1]]){
  const shoulder=new T.Bone();shoulder.name='Bip01_'+side+'_UpperArm';shoulder.position.set(sign*.18,1.32,0);root.add(shoulder);
  const elbow=new T.Bone();elbow.name='Bip01_'+side+'_Forearm';elbow.position.set(0,-.31,0);shoulder.add(elbow);
  const hand=new T.Bone();hand.name='Bip01_'+side+'_Hand';hand.position.set(0,-.28,0);elbow.add(hand);
 }
 root.updateWorldMatrix(true,true);return root;
}
function setup(options={}){
 const root=actor(),position=new T.Vector3(0,1.55,.56);let active=true,heading=Math.PI,errors=0;
 const driver=createVisitorInteraction({getActorRoot:()=>root,getPosition:()=>position,getHeading:()=>heading,isActive:()=>active,onError:()=>errors++,...options});
 const it=item(makeModel({width:.8,includeMirror:false})),request=commit=>({item:it,target:{kind:'drawer',index:0},hit:{object:it.asset.frontMeshes[0]},commit});
 return {root,position,it,driver,request,setActive:v=>{active=v;},setHeading:v=>{heading=v;},get errors(){return errors;}};
}
function advance(driver,seconds){let pose;for(let i=0;i<Math.ceil(seconds/.01);i++)pose=driver.tick(.01);return pose;}

test('real Studio drawer grip stays attached after translation and a rotated wall placement',()=>{
 const it=item(makeModel({width:.8,includeMirror:false}));
 it.root.position.set(1.2,0,.4);it.root.rotation.y=Math.PI/2;it.root.updateWorldMatrix(true,true);
 const actorPosition=new T.Vector3(1.8,1.55,.4);
 const c=resolveVisitorContact({item:it,target:{kind:'drawer',index:0},hit:{object:it.asset.frontMeshes[0]},actorPosition});
 assert.equal(c.source,'edge');assert.equal(c.part,it.asset.drawers[0]);
 const before=c.sample(actorPosition),p=new T.Vector3(...before.target);
 assert.ok(p.y>.79&&p.y<.83,'Grip is on the actual upper edge, not the centre of the drawer');
 it.asset.drawers[0].position.z=.2;
 const after=c.sample(actorPosition);
 assert.ok(Math.abs(after.target[0]-before.target[0]-.2)<1e-6);assert.ok(Math.abs(after.target[2]-before.target[2])<1e-6);
 assert.ok(new T.Vector3(...after.normal).dot(actorPosition.clone().sub(new T.Vector3(...after.target)))>=0);
 clean(it);
});

test('real General hardware is used, with touch picking zones excluded',()=>{
 const format=CABINET_FORMATS.find(f=>f.collection==='brent'&&f.widths.includes(80));assert.ok(format);
 const it=item(makeGeneralModel({format:format.id,width:.8,includeMirror:false,basinTop:'none'}));
 const c=resolveVisitorContact({item:it,target:{kind:'drawer',index:0},actorPosition:[0,1.55,.56]});
 assert.equal(c.source,'handle');assert.match(c.node.name,/Poignee_BRENT_cintree/);
 assert.notEqual(c.node.name,'Zone_tactile_poignee');
 const a=c.sample();it.asset.drawers[0].position.z+=.17;const b=c.sample();assert.ok(Math.abs(b.target[2]-a.target[2]-.17*it.asset.cabinet.scale.z)<1e-6);
 clean(it);
});

test('actual left and right room door handles follow their rotating leaves',()=>{
 for(const side of ['left','right']){
  const it=item(makeOpening('door',{hingeSide:side}),'door'),actorPosition=new T.Vector3(0,1.55,.12);
  const c=resolveVisitorContact({item:it,target:{kind:'door'},actorPosition});assert.ok(c);assert.match(c.node.name,/Bequille/);
  const a=c.sample(actorPosition);it.asset.setOpenProgress(.5);const b=c.sample(actorPosition);
  assert.ok(new T.Vector3(...a.target).distanceTo(new T.Vector3(...b.target))>.25);
  assert.ok(new T.Vector3(...a.normal).dot(actorPosition.clone().sub(new T.Vector3(...a.target)))>=0);
  assert.ok(Math.abs(new T.Vector3(...a.normal).angleTo(new T.Vector3(...b.normal))-Math.PI/4)<1e-6,'Grip side rotates with the leaf without flipping toward the camera');
  clean(it);
 }
});

test('General multi-leaf column proxies resolve the actual clicked leaf; mirror has no contact',()=>{
 const it=item(makeGeneralColumn(),'column');assert.equal(it.asset.door.isObject3D,undefined);assert.ok(it.asset.doors.length>1);
 const leaf=it.asset.doors[1],front=leaf.children.find(o=>o.name.startsWith('Facade'));
 const c=resolveVisitorContact({item:it,target:{kind:'door'},hit:{object:front},actorPosition:[0,1.55,.4]});assert.equal(c.part,leaf);
 const a=c.sample();it.asset.door.rotation.y=-.6;const b=c.sample();assert.ok(new T.Vector3(...a.target).distanceTo(new T.Vector3(...b.target))>.1);
 it.asset.setHingeSide('right');const d=resolveVisitorContact({item:it,target:{kind:'door',index:1},actorPosition:[0,1.55,.4]});assert.equal(d.part,leaf);
 const mirror=item({root:new T.Group()},'mirror');assert.equal(resolveVisitorContact({item:mirror,target:{kind:'door'}}),null);
 clean(it);clean(mirror);
});

test('reach, contact commit, handle following and release form one finite action',()=>{
 const s=setup();let commits=0;
 assert.equal(s.driver.start(s.request(()=>commits++)),true);
 const reach=advance(s.driver,.15);assert.equal(commits,0);assert.equal(reach.phase,'reach');assert.ok(reach.weight>.4&&reach.weight<.6);
 const follow=advance(s.driver,.17);assert.equal(commits,1);assert.equal(follow.phase,'follow');assert.equal(follow.grip,1);
 const before=follow.target[2];s.it.asset.drawers[0].position.z=.16;const after=s.driver.tick(.01);assert.ok(Math.abs(after.target[2]-before-.16)<1e-6);
 advance(s.driver,1.3);assert.equal(s.driver.active,false);assert.equal(commits,1);assert.equal(s.driver.diagnostics().lastReason,'complete');
 clean(s.it);
});

test('unreachable or missing targets fall back without a long arm or deferred callback',()=>{
 const s=setup();let commits=0;s.position.z=3;s.root.position.z=3;
 assert.equal(s.driver.start(s.request(()=>commits++)),false);assert.equal(s.driver.diagnostics().lastReason,'out-of-reach');
 advance(s.driver,2);assert.equal(commits,0);
 const c=item(makeColumn(),'column');assert.equal(s.driver.start({item:c,target:{kind:'door'},commit:()=>commits++}),false);
 clean(s.it);clean(c);
});

test('the real 1.65 m Jérôme rig can grasp a continuous upper drawer grip at the collision clearance',async()=>{
 const bytes=fs.readFileSync(new URL('../../shared/avatar/jerome-v1/resident.glb',import.meta.url));
 const {scene:root}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 root.updateWorldMatrix(true,true);const box=new T.Box3().setFromObject(root);
 root.scale.setScalar(1.65/box.getSize(new T.Vector3()).y);root.position.y=-box.min.y*root.scale.x;
 const pivot=new T.Group();pivot.position.z=.55;pivot.rotation.y=Math.PI;pivot.add(root);pivot.updateWorldMatrix(true,true);
 const driver=createVisitorInteraction({getActorRoot:()=>root,getPosition:()=>new T.Vector3(0,1.55,.55),getHeading:()=>Math.PI});
 const studio=item(makeModel({width:.8,includeMirror:false})),general=item(makeGeneralModel({width:.8,includeMirror:false,basinTop:'none'}));
 for(const it of [studio,general]){
  let commits=0;assert.equal(driver.start({item:it,target:{kind:'drawer',index:0},commit:()=>commits++}),true,'Grip in front of a real shoulder is within the real arm reach');
  const pose=driver.tick(.01);assert.ok(Math.abs(pose.target[0])<.13,'A reachable interior grip keeps the hand inside the portrait view');
  advance(driver,.31);assert.equal(commits,1);driver.cancel();
 }
 driver.dispose();clean(studio);clean(general);clean({root});
});

test('a continuous grip prefers the actual tap while keeping the contact on its real moving hardware',()=>{
 const s=setup();let commits=0;
 try{
  const request=s.request(()=>commits++);request.hit.point=new T.Vector3(.075,.72,.22);
  assert.equal(s.driver.start(request),true);
  const first=s.driver.tick(.1);assert.ok(Math.abs(first.target[0]-.075)<1e-6,'The contact follows the tapped horizontal position, not the shoulder');
  s.it.asset.drawers[0].position.z=.16;const moved=s.driver.tick(.1);
  assert.ok(Math.abs(moved.target[0]-.075)<1e-6);assert.ok(Math.abs(moved.target[2]-first.target[2]-.16)<1e-6);
  assert.equal(commits,0);
 }finally{s.driver.dispose();clean(s.it);}
});

test('a replacement, movement, removed target or Ultra exit discards an uncommitted reach',()=>{
 for(const scenario of ['replace','move','remove','inactive','turn']){
  const s=setup();let first=0,second=0;assert.equal(s.driver.start(s.request(()=>first++)),true);advance(s.driver,.12);
  if(scenario==='replace')assert.equal(s.driver.start(s.request(()=>second++)),true);
  if(scenario==='move')s.position.x=.3;
  if(scenario==='remove')s.it.root.removeFromParent();
  if(scenario==='inactive')s.setActive(false);
  if(scenario==='turn')s.setHeading(0);
  advance(s.driver,2);assert.equal(first,0,scenario);assert.equal(second,scenario==='replace'?1:0,scenario);
  clean(s.it);
 }
});

test('an unreachable replacement also cancels the old request, and disposal/errors cannot fire twice',()=>{
 const s=setup();let commits=0;assert.equal(s.driver.start(s.request(()=>commits++)),true);advance(s.driver,.1);
 s.position.z=3;s.root.position.z=3;assert.equal(s.driver.start(s.request(()=>commits++)),false);advance(s.driver,2);assert.equal(commits,0);
 s.position.z=.56;s.root.position.z=.56;assert.equal(s.driver.start(s.request(()=>{commits++;throw Error('removed project');})),true);
 advance(s.driver,2);assert.equal(commits,1);assert.equal(s.errors,1);assert.equal(s.driver.active,false);
 assert.equal(s.driver.start(s.request(()=>commits++)),true);s.driver.dispose();advance(s.driver,2);assert.equal(commits,1);assert.equal(s.driver.start(s.request(()=>commits++)),false);
 clean(s.it);
});

test('a real hand contact sensor delays commit until the palm reaches the grip',()=>{
 let hand=new T.Vector3(0,0,0),commits=0;
 const s=setup({getHandContactPosition:()=>hand});assert.equal(s.driver.start(s.request(()=>commits++)),true);
 const waiting=advance(s.driver,.42);assert.equal(commits,0);assert.equal(waiting.waitingForContact,true);assert.equal(waiting.weight,1);assert.ok(waiting.grip<.2);
 hand=new T.Vector3(...waiting.target).add(new T.Vector3(.02,0,0));
 const follow=s.driver.tick(.01);assert.equal(commits,1);assert.equal(follow.phase,'follow');assert.equal(follow.grip,1);assert.ok(Math.abs(s.driver.diagnostics().contactDistance-.02)<1e-8);
 advance(s.driver,2);assert.equal(commits,1);clean(s.it);
});

test('contact waiting has a bounded fallback, and cancellation still discards the pending action',()=>{
 const s=setup({getHandContactPosition:()=>new T.Vector3(4,4,4)});let commits=0;
 assert.equal(s.driver.start(s.request(()=>commits++)),true);advance(s.driver,.8);
 assert.equal(commits,1);assert.equal(s.driver.active,false);assert.equal(s.driver.diagnostics().lastReason,'contact-fallback');assert.equal(s.driver.diagnostics().fallbacks,1);
 advance(s.driver,2);assert.equal(commits,1);
 assert.equal(s.driver.start(s.request(()=>commits++)),true);advance(s.driver,.4);assert.equal(s.driver.diagnostics().waitingForContact,true);
 s.setActive(false);advance(s.driver,2);assert.equal(commits,1);
 clean(s.it);
});
