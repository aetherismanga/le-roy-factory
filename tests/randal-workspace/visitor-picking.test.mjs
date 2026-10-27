import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {pickSelection} from '../../shared/lrf-3d/picking.js';
import {createVisitInteractions,visitOpeningTarget} from '../../shared/lrf-3d/visit-interactions.js';
import {makeModel as makeStudio} from '../../studio-one/src/model.js';
import {makeModel as makeGeneral} from '../../randal-general/src/model.js';
import {makeOpening} from '../../shared/lrf-3d/openings.js';
import {disposeObject} from '../../studio-one/src/composition.js';

for(const [name,make,type] of [
 ['Studio drawer',()=>makeStudio({includeMirror:false}),'cabinet'],
 ['General drawer',()=>makeGeneral({includeMirror:false}),'cabinet'],
 ['room door',()=>makeOpening('door',{width:83,height:204}),'door']
])test(name+': a visible hand does not absorb the next opening or closing tap',()=>{
 const scene=new T.Scene(),asset=make(),root=new T.Group();root.userData.itemId='target';root.add(asset.root);scene.add(root);
 const item={id:'target',type,root,asset,settings:{drawers:(asset.drawers||[]).map(()=>0),doorOpen:false}};
 const part=asset.drawers?.[0]||asset.door;let front;
 part.traverse(o=>{if(!front&&o.isMesh&&/Facade|Vantail/.test(o.name))front=o;});assert.ok(front);
 scene.updateMatrixWorld(true);
 const target=new T.Box3().setFromObject(front).getCenter(new T.Vector3()),camera=new T.PerspectiveCamera(50,1,.01,10);
 camera.position.copy(target).add(new T.Vector3(0,0,.5));camera.lookAt(target);
 const handRoot=new T.Group(),hand=new T.Mesh(new T.SphereGeometry(.055,12,8),new T.MeshBasicMaterial());
 hand.position.copy(camera.position).lerp(target,.35);handRoot.add(hand);scene.add(handRoot);
 try{
  assert.equal(pickSelection(scene,camera,new T.Vector2()).object,hand,'The hand really lies in the tap ray');
  handRoot.userData.skipPicking=true;
  const hit=pickSelection(scene,camera,new T.Vector2());
  assert.equal(hit.itemId,item.id);assert.equal(visitOpeningTarget(item,hit)?.kind,type==='door'?'door':'drawer');
  const controller=createVisitInteractions({getItems:()=>[item]});
  assert.equal(controller.tap(hit),true);assert.equal(type==='door'?item.settings.doorOpen:item.settings.drawers[0],type==='door'?true:1);
  assert.equal(controller.tap(pickSelection(scene,camera,new T.Vector2())),true);assert.equal(type==='door'?item.settings.doorOpen:item.settings.drawers[0],type==='door'?false:0);
 }finally{disposeObject(root);disposeObject(handRoot);}
});

test('skipPicking applies on a mesh as well as its draw group, without ignoring real occluders',()=>{
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(50,1,.01,10);camera.position.z=1;camera.lookAt(0,0,0);
 const front=new T.Mesh(new T.BoxGeometry(.2,.2,.05),new T.MeshBasicMaterial()),back=front.clone();front.position.z=.5;front.userData.skipPicking=true;back.userData={itemId:'behind'};scene.add(front,back);
 try{
  assert.equal(pickSelection(scene,camera,new T.Vector2()).itemId,'behind');
  front.userData.skipPicking=false;assert.equal(pickSelection(scene,camera,new T.Vector2()).object,front);
 }finally{disposeObject(scene);}
});
