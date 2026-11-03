import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {readFileSync} from 'node:fs';
import {parse} from 'acorn';
import {TOWEL_FINISHES,BRIDGE_SUPPORTS,furnitureAccessoryOptions,resolveFurnitureAccessories,furnitureAccessoryProposal,furnitureAccessoryPlacementError} from '../functions/neobath-anima/studio-adapter/furniture-accessories.js';
import {buildFurnitureAccessoryGeometry,updateFurnitureAccessoryGeometry} from '../functions/neobath-anima/studio-adapter/furniture-accessory-geometry.js';
import {renderFurnitureAccessoryControls} from '../functions/neobath-anima/studio-adapter/furniture-accessory-controls.js';
import {setupFurnitureAccessoryPicking} from '../functions/neobath-anima/studio-adapter/furniture-accessory-interaction.js';
import {transformFurnitureAccessoryAtelier,transformFurnitureAccessoryPreview} from '../functions/neobath-anima/studio-adapter/accessories-transform.mjs';
import {transformCommonStudioSource} from '../functions/neobath-anima/studio-adapter/studio-source-transform.mjs';
const base={format:'pura-base-two',width:100,finish:'rovere-alba',top:'bare',drawers:[0,0]},close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} ≠ ${b}`);
test('source SideBar finishes and Bridge variants retain documented dimensions without inventing tariff codes',()=>{
 assert.equal(TOWEL_FINISHES.length,3);assert.equal(BRIDGE_SUPPORTS.length,8);assert.deepEqual([...new Set(BRIDGE_SUPPORTS.map(p=>p.width))],[80,100,120,140]);
 for(const p of BRIDGE_SUPPORTS){assert.equal(p.depth,43.5);assert.equal(p.finish,'black-matte');assert.ok([15,35].includes(p.height));if(p.id==='bridge100-accessory'){assert.equal(p.ref,'BRIDGE100');assert.equal(p.pricePublicHT,262);}else{assert.equal(p.ref,null);assert.equal(p.pricePublicHT,null);}}
 assert.equal(resolveFurnitureAccessories({...base,towelSide:'left',towelFinish:'chrome'}).towel.pricePublicHT,115);assert.equal(resolveFurnitureAccessories({...base,towelSide:'right',towelFinish:'white-matte'}).towel.pricePublicHT,null);
 assert.equal(furnitureAccessoryOptions({...base,width:60}).supports.length,0);assert.equal(furnitureAccessoryOptions({...base,format:'pura-wall'}).towel,false);
 for(const patch of[{supportId:'bridge-80-15'},{supportFinish:'gold'},{towelSide:'top'},{towelSide:null},{supportId:null}])assert.throws(()=>resolveFurnitureAccessories({...base,...patch}));
});
test('an explicit Bridge choice adjusts only its floor height and removal restores the suspended pose',()=>{
 const placement={wall:2,u:175,height:42,offset:3,rotation:0},chosen=furnitureAccessoryProposal(base,{supportId:'bridge100-accessory'},placement);assert.equal(chosen.placement.height,35);assert.equal(chosen.settings.supportSuspendedHeight,42);assert.equal(chosen.placement.u,175);assert.equal(placement.height,42);
 const lower=furnitureAccessoryProposal(chosen.settings,{supportId:'bridge-100-15'},chosen.placement);assert.equal(lower.placement.height,15);assert.equal(lower.settings.supportSuspendedHeight,42);assert.equal(resolveFurnitureAccessories(lower.settings).clearanceBelow,.15);
 assert.equal(furnitureAccessoryPlacementError(lower.settings,lower.placement),'');assert.ok(furnitureAccessoryPlacementError(lower.settings,{...lower.placement,height:16}));assert.ok(furnitureAccessoryPlacementError(lower.settings,{}));
 const removed=furnitureAccessoryProposal(lower.settings,{supportId:''},lower.placement);assert.equal(removed.placement.height,42);assert.equal(removed.settings.supportSuspendedHeight,undefined);
});
test('SideBar sits on either side with exact source envelope; Bridge meets floor and cabinet without changing the cabinet',()=>{
 for(const side of['left','right']){const model=buildFurnitureAccessoryGeometry({...base,towelSide:side,towelFinish:'chrome',supportId:'bridge100-accessory'});try{model.root.updateMatrixWorld(true);const bar=new T.Box3().setFromObject(model.towelRoot),size=bar.getSize(new T.Vector3());close(size.x,.05);close(size.y,.025);close(size.z,.40);if(side==='left')close(bar.max.x,-.5);else close(bar.min.x,.5);const frame=new T.Box3().setFromObject(model.supportRoot),frameSize=frame.getSize(new T.Vector3());close(frameSize.x,1);close(frameSize.y,.35);close(frameSize.z,.435);close(frame.max.y,.30);close(frame.min.y,-.05);assert.ok(model.meshes.every(mesh=>mesh.userData.editTarget==='cabinet-accessories'));}finally{model.dispose();}}
 const asset={root:new T.Group()},a=updateFurnitureAccessoryGeometry(asset,{...base,towelSide:'left'});assert.equal(updateFurnitureAccessoryGeometry(asset,{...base,towelSide:'left'}),a);const b=updateFurnitureAccessoryGeometry(asset,{...base,towelSide:'right'});assert.notEqual(b,a);assert.equal(a.root.parent,null);assert.equal(asset.root.children.length,1);b.dispose();
});
test('the photographed SideBar has one rear attachment and a free capped rail on both cabinet sides',()=>{
 for(const side of['left','right']){
  const sign=side==='left'?-1:1,model=buildFurnitureAccessoryGeometry({...base,towelSide:side,towelFinish:'chrome'});
  try{
   model.root.updateMatrixWorld(true);
   const shoot=z=>new T.Raycaster(new T.Vector3(sign*(.5-.01),.30+.52-.055,z),new T.Vector3(sign,0,0)).intersectObject(model.towelRoot,true)[0];
   const rear=shoot(-.18),free=shoot(.17);
   assert.ok(rear&&free);assert.match(rear.object.name,/fixation_arriere/);assert.equal(free.object.name,'SideBar_barre_40cm');
   close(rear.distance,.01);assert.ok(free.distance>.05,'the front of the rail has no return to the cabinet');
   const box=new T.Box3().setFromObject(model.towelRoot),size=box.getSize(new T.Vector3());close(size.x,.05);close(size.y,.025);close(size.z,.40);
  }finally{model.dispose();}
 }
 for(const finish of TOWEL_FINISHES){const model=buildFurnitureAccessoryGeometry({...base,towelSide:'right',towelFinish:finish.id});try{for(const mesh of model.meshes){assert.equal(mesh.material.color.getHexString(),new T.Color(finish.hex).getHexString());assert.equal(mesh.material.metalness,finish.metalness);}}finally{model.dispose();}}
});
class E{constructor(doc,tag){this.ownerDocument=doc;this.tagName=tag;this.children=[];this.dataset={};this.style={};this.attributes={};}append(...items){this.children.push(...items);for(const child of items)if(child&&typeof child==='object')child.parentNode=this;}setAttribute(name,value){this.attributes[name]=value;}}
const all=node=>[node,...(node.children||[]).flatMap(child=>child&&typeof child==='object'?all(child):[])];
test('real accessory DOM offers only matching Bridge heights and applies side and source colour choices',()=>{
 const doc={createElement:tag=>new E(doc,tag),getElementById:()=>null};doc.head=new E(doc,'head');const parent=new E(doc,'div'),patches=[];renderFurnitureAccessoryControls(parent,{settings:{...base,towelSide:'left'},placement:{wall:0,u:125,height:41},onPatch:(settings,placement)=>patches.push({settings,placement})});
 const support=all(parent).find(node=>node.dataset.furnitureAccessoryControl==='support');assert.equal(support.children.length,3);support.value='bridge100-accessory';support.onchange();assert.equal(patches.at(-1).placement.height,35);assert.equal(patches.at(-1).settings.supportSuspendedHeight,41);
 const color=all(parent).find(node=>node.dataset.furnitureAccessoryFinish==='chrome');color.onclick();assert.equal(patches.at(-1).settings.towelFinish,'chrome');const right=all(parent).find(node=>node.dataset.furnitureAccessoryControl==='towel-side');right.value='right';right.onchange();assert.equal(patches.at(-1).settings.towelSide,'right');
});
test('all three source finishes remain visible before choosing a mounting side and the native photo identifies the product',()=>{
 const doc={createElement:tag=>new E(doc,tag),getElementById:()=>null};doc.head=new E(doc,'head');const parent=new E(doc,'div'),patches=[];
 renderFurnitureAccessoryControls(parent,{settings:{...base,towelSide:'none'},onPatch:settings=>patches.push(settings)});
 const choices=all(parent).filter(node=>node.dataset.furnitureAccessoryFinish);
 assert.deepEqual(choices.map(node=>node.dataset.furnitureAccessoryFinish),['black-matte','white-matte','chrome']);
 const photo=all(parent).find(node=>node.tagName==='img'&&node.className==='anima-towel-photo');assert.ok(photo);assert.match(photo.src,/product-photos\/sidebar\.webp$/);
 choices[2].onclick();assert.equal(patches.at(-1).towelFinish,'chrome');assert.equal(patches.at(-1).towelSide,'none');assert.equal(resolveFurnitureAccessories(patches.at(-1)).towel,null);
});
class Canvas{constructor(){this.listeners=new Map();this.capture=null;}addEventListener(name,handler){if(!this.listeners.has(name))this.listeners.set(name,[]);this.listeners.get(name).push(handler);}removeEventListener(name,handler){this.listeners.set(name,this.listeners.get(name).filter(fn=>fn!==handler));}setPointerCapture(id){this.capture=id;}hasPointerCapture(id){return this.capture===id;}releasePointerCapture(){this.capture=null;}fire(name,patch={}){const event={pointerId:1,button:0,clientX:10,clientY:10,timeStamp:0,...patch,preventDefault(){},stopImmediatePropagation(){this.stopped=true;}};for(const handler of this.listeners.get(name)||[]){handler(event);if(event.stopped)break;}return event;}}
test('accessory taps open colour choices and never move the furniture, including cancelled and multitouch gestures',()=>{
 const canvas=new Canvas(),controls={enabled:true},hit={itemId:'cabinet',editTarget:'cabinet-accessories',object:{userData:{animaAccessoriesTarget:true}}},events=[];let enabled=true;const controller=setupFurnitureAccessoryPicking({canvas,controls,enabled:()=>enabled,pick:()=>hit,onTap:()=>events.push('tap')});canvas.addEventListener('pointerdown',()=>events.push('cabinet-drag'));
 canvas.fire('pointerdown');canvas.fire('pointerup',{timeStamp:40});assert.deepEqual(events,['tap']);assert.equal(controls.enabled,true);
 canvas.fire('pointerdown');canvas.fire('pointermove',{clientX:60,timeStamp:20});canvas.fire('pointerup',{clientX:60,timeStamp:50});assert.deepEqual(events,['tap']);
 canvas.fire('pointerdown');canvas.fire('pointerdown',{pointerId:2});canvas.fire('pointerup',{pointerId:2});canvas.fire('pointerup');assert.deepEqual(events,['tap']);assert.equal(controls.enabled,true);
 canvas.fire('pointerdown');canvas.fire('lostpointercapture');assert.deepEqual(events,['tap']);enabled=false;canvas.fire('pointerdown');assert.deepEqual(events,['tap','cabinet-drag']);controller.dispose();
});
test('production transform binds accessories before furniture dragging and keeps original source immutable',()=>{
 const original=readFileSync('studio-one/src/app.js','utf8'),adapted=transformCommonStudioSource(original,'app.js'),source=transformFurnitureAccessoryAtelier(adapted);parse(source,{ecmaVersion:'latest',sourceType:'module'});assert.ok(source.indexOf('function setupPicking(){__animaMountFurnitureAccessoryPicking();')>=0);assert.match(source,/cabinet-accessories':'Accessoires du meuble'/);assert.match(source,/__animaFurnitureAccessoryGeometry\(item.asset,item.settings\)/);assert.equal(transformFurnitureAccessoryAtelier(source),source);assert.equal(readFileSync('studio-one/src/app.js','utf8'),original);
 const preview=transformFurnitureAccessoryPreview('item.asset.setTop(s.top,s);asset.setTop(s.top,s);');assert.match(preview,/__animaFurnitureAccessoryGeometry\(item.asset,s\)/);assert.match(preview,/__animaFurnitureAccessoryGeometry\(asset,s\)/);
});
