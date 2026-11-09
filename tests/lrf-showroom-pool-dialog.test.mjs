import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createShowroomVisit} from '../shared/lrf-3d/showroom-visit.js';
import {createShowroomLighting} from '../shared/lrf-3d/showroom-lighting.js';

class Node{
 constructor(tag,doc){this.tagName=tag.toUpperCase();this.ownerDocument=doc;this.children=[];this.attrs={};this.dataset={};this.events=new Map();this.style={};this.classList={toggle(){}};}
 setAttribute(name,value){this.attrs[name]=String(value);}
 append(...nodes){for(const node of nodes){node.parentNode=this;this.children.push(node);}}
 remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(node=>node!==this);this.parentNode=null;}
 addEventListener(type,handler){const list=this.events.get(type)||[];list.push(handler);this.events.set(type,list);}
 emit(type,extra={}){return Promise.all((this.events.get(type)||[]).map(fn=>fn({type,target:this,preventDefault(){},...extra})));}
 showModal(){this.open=true;}
 close(){this.open=false;}
 focus(){this.ownerDocument.activeElement=this;}
}
function all(root,predicate){const nodes=[];function visit(node){if(predicate(node))nodes.push(node);for(const child of node.children||[])visit(child);}visit(root);return nodes;}
function fixture(setPoolCollection){
 const prior=globalThis.document,doc={createElement:tag=>new Node(tag,doc),activeElement:null},stage=new Node('main',doc),focus=new Node('button',doc),overlays=[],calls=[];focus.focus();globalThis.document=doc;
 const manufacturer={id:'elios',name:'Elios',category:'Piscine',href:'https://leroyfactory.fr/univers.html',collections:[]},collection={id:'test-pool',name:'Piscine test',image:'https://leroyfactory.fr/preview.webp',hdImage:'https://leroyfactory.fr/native-hd.webp',href:'https://leroyfactory.fr/piscine.html'};
 const garden={selectedCollectionId:'beige',choices:[{id:'beige',label:'Beige pierre',manufacturer,collection,preview:'https://leroyfactory.fr/beige-native.webp'},{id:'blue',label:'Bleu profond',manufacturer,collection,preview:'https://leroyfactory.fr/blue-native.webp'}],async setPoolCollection(id){calls.push(id);const result=await (setPoolCollection?.(id)??true);if(result!==false)this.selectedCollectionId=id;return result;}};
 const visit=createShowroomVisit({stage,canvas:new Node('canvas',doc),camera:new T.PerspectiveCamera(),getItems:()=>[],onOverlay:value=>overlays.push(value)});
 return {visit,garden,stage,doc,focus,overlays,calls,restore(){visit.close();globalThis.document=prior;}};
}

test('pool choice uses its native preview and applies the selected finish before resuming the visit',async()=>{
 let finish;const f=fixture(()=>new Promise(resolve=>finish=resolve));
 try{
  assert.equal(f.visit.openPoolChooser({garden:f.garden}),true);assert.equal(f.visit.blocked,true);const dialog=f.stage.children[0],buttons=all(dialog,node=>node.className==='lrf-pool-apply');assert.equal(buttons.length,2);assert.equal(buttons[0].attrs['aria-pressed'],'true');
  assert.deepEqual(all(dialog,node=>node.tagName==='IMG').map(image=>image.src),f.garden.choices.map(choice=>choice.preview));
  const action=buttons[1].emit('click');assert.deepEqual(f.calls,['blue']);assert(buttons.every(button=>button.disabled));assert.equal(f.visit.blocked,true);finish(true);await action;
  assert.equal(f.garden.selectedCollectionId,'blue');assert.equal(f.visit.blocked,false);assert.equal(f.stage.children.length,0);assert.equal(f.doc.activeElement,f.focus);assert.deepEqual(f.overlays,[true,false]);
 }finally{f.restore();}
});

test('a failed pool application preserves the current finish and leaves choices available for retry',async()=>{
 const f=fixture(()=>false);
 try{
  f.visit.openPoolChooser({garden:f.garden});const dialog=f.stage.children[0],buttons=all(dialog,node=>node.className==='lrf-pool-apply');await buttons[1].emit('click');
  assert.equal(f.garden.selectedCollectionId,'beige');assert.equal(f.visit.blocked,true);assert(buttons.every(button=>button.disabled===false));assert.match(all(dialog,node=>node.className==='lrf-pool-status')[0].textContent,/pas pu être chargé/);
  await dialog.emit('cancel');assert.equal(f.visit.blocked,false);assert.deepEqual(f.overlays,[true,false]);
 }finally{f.restore();}
});

test('secondary HD browsing never applies a finish and late prior work cannot close the new viewer',async()=>{
 let finish;const f=fixture(()=>new Promise(resolve=>finish=resolve));
 try{
  f.visit.openPoolChooser({garden:f.garden});let dialog=f.stage.children[0];await all(dialog,node=>node.className==='lrf-pool-hd')[1].emit('click');assert.deepEqual(f.calls,[]);assert.equal(f.visit.blocked,true);assert.equal(all(f.stage,node=>node.tagName==='IMG'&&node.src==='https://leroyfactory.fr/native-hd.webp').length,1);
  f.visit.close();f.visit.openPoolChooser({garden:f.garden});dialog=f.stage.children[0];const pending=all(dialog,node=>node.className==='lrf-pool-apply')[1].emit('click');f.visit.close();const choice=f.garden.choices[1];f.visit.openCollection(choice.manufacturer,choice.collection);const hd=f.stage.children[0];finish(true);await pending;assert.equal(f.stage.children[0],hd);assert.equal(f.visit.blocked,true);
 }finally{f.restore();}
});

test('garden daylight uses the connected region beyond the hall rectangle and restores after leaving',()=>{
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(),renderer={toneMappingExposure:1.2},lamp=new T.HemisphereLight();scene.add(lamp);const root=new T.Group();root.rotation.y=.71;root.position.set(12,0,-5);scene.add(root);root.updateMatrixWorld(true);
 const hall={root,dimensions:{width:28},navigableBounds:{minZ:-33.4},containsPoint:point=>point.x>=-14&&point.x<=35&&point.z>=-30&&point.z<=0,appearance:{exposure:.9,environmentIntensity:.6}},lighting=createShowroomLighting({scene,renderer,camera,getHall:()=>hall});
 camera.position.copy(root.localToWorld(new T.Vector3(31,1.58,-8)));assert.equal(lighting.update(),true);assert.equal(renderer.toneMappingExposure,.9);assert.equal(lamp.visible,false);
 camera.position.copy(root.localToWorld(new T.Vector3(36,1.58,-8)));assert.equal(lighting.update(),false);assert.equal(renderer.toneMappingExposure,1.2);assert.equal(lamp.visible,true);lighting.dispose();
});

test('garden animation receives hall-local coordinates and the seconds clock only for the reached space',()=>{
 const root=new T.Group();root.position.set(11,0,-7);root.rotation.y=.7;const hallRoot=new T.Group();hallRoot.position.set(.33,0,-3.54);root.add(hallRoot);root.updateMatrixWorld(true);const calls=[];
 const hall={root:hallRoot,animate(position,time){calls.push({position:position.clone(),time});return position.x>14;}};
 const item={id:'door',type:'door',root,asset:{interiorEnabled:true,visitInterior:{root,canWalk:()=>true,setOccupied(){},prepareNear(){},endVisit(){},setVisible(){},showroom:hall}},settings:{doorOpen:true}};
 const visit=createShowroomVisit({stage:{},canvas:{},camera:new T.PerspectiveCamera(),getItems:()=>[item]}),position=hallRoot.localToWorld(new T.Vector3(20,1.58,-8));
 assert.equal(visit.animate(position,4.25),false);visit.update(position);assert.equal(visit.animate(position,4.25),true);assert(calls[0].position.distanceTo(new T.Vector3(20,1.58,-8))<1e-10);assert.equal(calls[0].time,4.25);visit.exit();assert.equal(visit.animate(position,5),false);
});
