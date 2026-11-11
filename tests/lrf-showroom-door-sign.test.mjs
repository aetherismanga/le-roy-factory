import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {makeShowroomDoorSign,SHOWROOM_DOOR_LOGO} from '../shared/lrf-3d/showroom-door-sign.js';
import {makeDoorInterior} from '../shared/lrf-3d/door-interior.js';
import {disposeObject} from '../studio-one/src/composition.js';

test('the physical door plaque keeps the official square logo above the Showrooms caption',()=>{
 assert.equal(SHOWROOM_DOOR_LOGO,'assets/showroom/lrf-logo.png');
 for(const app of ['studio-one','randal-general'])assert.match(readFileSync(new URL('../'+app+'/build.mjs',import.meta.url),'utf8'),/copyFileSync\('\.\.\/assets\/img\/logo03lrf\.png','dist\/assets\/showroom\/lrf-logo\.png'\)/,'Both builds copy the unchanged official artwork');
 for(const width of [.60,.73,1.4]){
  const sign=makeShowroomDoorSign({width});
  try{
   const {root}=sign,plate=root.getObjectByName('Plaque_porte_Showrooms'),logo=root.getObjectByName('Logo_officiel_LRF_porte'),label=root.getObjectByName('Inscription_Showrooms');
   assert.equal(root.userData.officialLogo,SHOWROOM_DOOR_LOGO);assert.equal(root.userData.label,'Showrooms');assert.equal(root.position.x,width/2);
   assert.equal(logo.geometry.parameters.width,logo.geometry.parameters.height,'The round official logo keeps its square image proportions');
   root.updateMatrixWorld(true);const bounds=object=>new T.Box3().setFromObject(object),plaque=bounds(plate),image=bounds(logo),caption=bounds(label);
   assert(image.min.y>caption.max.y,'The caption sits physically below the logo');assert(image.min.x>=plaque.min.x&&image.max.x<=plaque.max.x&&image.min.y>=plaque.min.y&&image.max.y<=plaque.max.y,'The complete square logo fits within the plaque face');assert(image.min.z>plaque.max.z,'The artwork sits in front of the plaque rather than inside it');assert(plaque.min.x>=0&&plaque.max.x<=width,'The plaque stays within the leaf width');
   assert(plaque.max.y<2.08&&plaque.min.y>1,'The sign remains inside the inner door height');
   assert(Math.abs(image.getSize(new T.Vector3()).x-.272)<1e-6);assert.equal(logo.material.map,null);assert.equal(logo.visible,false,'Constructing the plaque does not allocate its bitmap');
  }finally{disposeObject(sign.root);}
 }
});

test('the plaque is fixed to the inner door leaf, follows its opening and keeps the showroom lazy',()=>{
 const hall=makeDoorInterior();
 try{
  const leaf=hall.root.getObjectByName('Porte_vers_exposition'),sign=hall.root.getObjectByName('Enseigne_LRF_Showrooms'),logo=sign.getObjectByName('Logo_officiel_LRF_porte');
  assert.equal(sign.parent,leaf);assert.equal(sign.userData.showroomAction.kind,'inner-door');assert.equal(hall.showroom,null);hall.setVisible(true);assert.equal(hall.showroom,null,'Revealing the vestibule and plaque allocates no exhibition');
  hall.root.updateMatrixWorld(true);const before=logo.getWorldPosition(new T.Vector3());
  hall.setInnerOpen(true);const after=logo.getWorldPosition(new T.Vector3());assert(before.distanceTo(after)>.4,'The physical plaque swings with the leaf');assert.equal(sign.parent,leaf);assert.equal(leaf.rotation.y,Math.PI/2);assert(hall.showroom);
  hall.setInnerOpen(false);assert(logo.getWorldPosition(new T.Vector3()).distanceTo(before)<1e-8,'Closing returns the same sign to its original pose');
 }finally{disposeObject(hall.root);}
});

test('revealing the logo loads once, preserves image proportions and releases its owned texture',async()=>{
 let requests=0,ready=0,disposed=0,signal;const texture=new T.Texture({width:512,height:512});texture.addEventListener('dispose',()=>disposed++);
 const sign=makeShowroomDoorSign({loadTexture:async(url,options)=>{requests++;assert.equal(url,SHOWROOM_DOOR_LOGO);assert.equal(options.maxDimension,512);signal=options.signal;return texture;},onReady:()=>ready++});
 const logo=sign.root.getObjectByName('Logo_officiel_LRF_porte');assert.equal(requests,0);
 assert.equal(await sign.prepare(),true);assert.equal(await sign.prepare(),true);assert.equal(requests,1);assert.equal(ready,1);assert.equal(logo.material.map,texture);assert.equal(logo.visible,true);assert.equal(texture.colorSpace,T.SRGBColorSpace);assert.equal(texture.minFilter,T.LinearMipmapLinearFilter);
 disposeObject(sign.root);assert.equal(signal.aborted,true);assert.equal(disposed,1);assert.equal(await sign.prepare(),false);assert.equal(requests,1);
});

test('destroying a pending plaque cancels its request and disposes a late logo without waking the view',async()=>{
 let resolveTexture,signal,ready=0,disposed=0;const texture=new T.Texture();texture.addEventListener('dispose',()=>disposed++);
 const pending=new Promise(resolve=>resolveTexture=resolve),sign=makeShowroomDoorSign({loadTexture:(_url,options)=>{signal=options.signal;return pending;},onReady:()=>ready++});
 const task=sign.prepare();disposeObject(sign.root);assert.equal(signal.aborted,true);resolveTexture(texture);
 assert.equal(await task,false);assert.equal(disposed,1);assert.equal(ready,0);assert.equal(sign.root.getObjectByName('Logo_officiel_LRF_porte').material.map,null);assert.equal(await sign.prepare(),false);
});
