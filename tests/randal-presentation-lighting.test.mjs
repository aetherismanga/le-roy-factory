import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCatalogueMirror} from '../shared/lrf-3d/mirrors.js';
import {applyMirrorLighting} from '../shared/lrf-3d/mirror-lighting.js';
import {applyPresentationMirrorLighting} from '../shared/lrf-3d/randal-presentation-lighting.js';

const mirror=()=>{const settings={mirrorModel:'ilse',width:60,height:80,led:true};return {type:'mirror',settings,asset:makeCatalogueMirror(settings)};};
test('presentation LED strips are physical emitters and keep one material through toggles',()=>{
 const item=mirror();let material;
 try{
  const group=applyPresentationMirrorLighting(item),ring=item.asset.root.getObjectByName('Anneau_LED');
  ring.traverse(o=>{if(o.isMesh){assert(o.material.isMeshPhysicalMaterial);assert(o.material.emissiveIntensity>0);material=o.material;}});
  assert(group.getObjectByName('Halo_mural_LED').userData.presentationRasterOnly);
  assert(group.getObjectByName('Retro_eclairage').intensity<=3.2);
  item.settings.led=false;applyPresentationMirrorLighting(item);assert.equal(group.visible,false);assert.equal(ring.visible,false);
  item.settings.led=true;applyPresentationMirrorLighting(item);assert.equal(group.visible,true);ring.traverse(o=>{if(o.isMesh)assert.equal(o.material,material);});
 }finally{item.asset.root.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}
});
test('normal workshop LED recipe remains independent of the presentation',()=>{
 const ordinary=mirror(),presentation=mirror();
 try{
  const original=applyMirrorLighting(ordinary),before=original.getObjectByName('Halo_mural_LED').material.fragmentShader;
  const premium=applyPresentationMirrorLighting(presentation);assert.equal(original.getObjectByName('Halo_mural_LED').material.fragmentShader,before);
  assert(!original.getObjectByName('Halo_mural_LED').userData.presentationRasterOnly);
  assert.notEqual(premium.getObjectByName('Halo_mural_LED').material.fragmentShader,before);
  assert.equal(original.getObjectByName('Retro_eclairage').intensity,6);
 }finally{for(const item of [ordinary,presentation])item.asset.root.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}
});
