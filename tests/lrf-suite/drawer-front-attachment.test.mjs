import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeModel as makeStudio} from '../../studio-one/src/model.js';
import {makeModel as makeGeneral} from '../../randal-general/src/model.js';
import {CABINET_FORMATS as studioFormats,WIDTH_PRESETS,drawerTravel as studioTravel} from '../../studio-one/src/configuration.js';
import {CABINET_FORMATS as generalFormats,drawerTravel as generalTravel,defaultTop} from '../../randal-general/src/configuration.js';
import {disposeObject} from '../../studio-one/src/composition.js';

const box=object=>new T.Box3().setFromObject(object);
const close=(a,b,label)=>assert(Math.abs(a-b)<1e-6,`${label}: ${a} ≈ ${b}`);
function attachments(asset,travel){
 asset.root.updateMatrixWorld(true);
 const panels=asset.panels.map(box);
 let checked=0;
 for(const [drawerIndex,drawer]of asset.drawers.entries()){
  const fronts=asset.frontMeshes.filter(front=>front.parent===drawer),counters=drawer.children.filter(object=>object.name==='Contre_facade');
  assert.equal(counters.length,fronts.length,'Every front has one physical counter-front');
  for(const progress of [0,.5,1]){
   drawer.position.z=travel(drawerIndex,asset.drawers.length)*progress;asset.root.updateMatrixWorld(true);
   for(const front of fronts){
    const counter=counters.find(object=>Math.abs(object.position.x-front.position.x)<1e-6),fb=box(front),cb=box(counter),bayWidth=front.userData.joinery?.bayWidth||asset.spec.width;
    const sides=drawer.children.filter(object=>/^Flanc_(anthracite|aluminium)_8mm$/.test(object.name)&&Math.abs(object.position.x-front.position.x)<bayWidth/2-.01);
    assert.equal(sides.length,2,'Each drawer bay keeps two metal side panels');
    close(cb.max.z,fb.min.z,'The counter-front contacts the back of the wood in every opening state');
    for(const side of sides)close(box(side).max.z,fb.min.z,'Metal sides reach the wooden front');
    const interiors=drawer.children.filter(object=>object.name==='Interieur_tiroir'),floor=interiors.flatMap(group=>group.children).find(object=>object.name==='Fond_tiroir_8mm'&&Math.abs(object.position.x-front.position.x)<1e-6),floorBounds=box(floor);
    assert(floorBounds.max.z>cb.min.z+.001,'The floor enters the counter-front instead of leaving an open gap');assert(floorBounds.max.z<fb.min.z-.004,'The floor stays behind the wooden facade');
    const adjustments=drawer.children.filter(object=>object.name==='Reglage_facade'&&Math.abs(object.position.x-front.position.x)<bayWidth/2-.01);assert.equal(adjustments.length,2);
    for(const adjustment of adjustments)close(box(adjustment).max.z,cb.min.z,'Adjustment blocks join the metal counter-front behind the facade');
    checked++;
   }
   asset.panels.forEach((panel,index)=>assert(box(panel).equals(panels[index]),'Opening drawers leaves carcass panels fixed'));
  }
  drawer.position.z=0;asset.root.updateMatrixWorld(true);
 }
 return checked;
}

test('Studio One: every format retains attached fronts at all widths, including 19 mm inset fronts and open siphon/full drawers',()=>{
 let count=0;
 for(const form of studioFormats)for(const width of [40,...WIDTH_PRESETS])for(const facadeMode of ['overlay','inset']){
  const asset=makeStudio({format:form.id,width:width/100,facadeMode,basinTop:'plain',includeMirror:false});
  const originalFronts=asset.frontMeshes.map(front=>({position:front.position.clone(),geometry:front.geometry,material:front.material}));
  const fronts=asset.frontMeshes.map(box),left=box(asset.root.getObjectByName('Joue_gauche_19mm')),right=box(asset.root.getObjectByName('Joue_droite_19mm'));
  try{
   close(box(asset.cabinet).getSize(new T.Vector3()).z,.46,'Published cabinet depth is retained');
   if(facadeMode==='inset')for(const front of fronts){close(front.min.x-left.max.x,.002,'Left 2 mm inset running clearance');close(right.min.x-front.max.x,.002,'Right 2 mm inset running clearance');close(front.max.z,right.max.z,'Inset front and side edges remain flush');}
   for(const mode of ['siphon','full']){asset.setTopDrawer(mode);count+=attachments(asset,studioTravel);}
   asset.frontMeshes.forEach((front,index)=>{assert(front.position.equals(originalFronts[index].position));assert.equal(front.geometry,originalFronts[index].geometry);assert.equal(front.material,originalFronts[index].material);});
  }finally{disposeObject(asset.root);}
 }
 assert(count>500);
});

test('Catalogue General: every collection, width, bay and drawer format uses the same attached front construction',()=>{
 let count=0,collections=new Set();
 for(const form of generalFormats)for(const width of form.widths){
  const asset=makeGeneral({format:form.id,width:width/100,basinTop:defaultTop(form.id),includeMirror:false});collections.add(form.collection);
  try{
   const original=asset.frontMeshes.map(front=>({position:front.position.clone(),geometry:front.geometry}));
   for(const mode of ['siphon','full']){asset.setTopDrawer(mode);count+=attachments(asset,generalTravel);}
   asset.frontMeshes.forEach((front,index)=>{assert(front.position.equals(original[index].position));assert.equal(front.geometry,original[index].geometry);});
  }finally{disposeObject(asset.root);}
 }
 assert(collections.size>=10);assert(count>500);
});
