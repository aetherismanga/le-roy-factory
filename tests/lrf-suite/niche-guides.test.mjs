import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeNicheGuide,disposeNicheGuide,withoutEditorGuides} from '../../shared/lrf-3d/niche-guides.js';
import {captureMirrorScene} from '../../shared/lrf-3d/mirror-reflection.js';

test('niche outlines use real depth-tested contrasting dashes, without blocking native picking',()=>{
 const guide=makeNicheGuide(.6,.3);
 assert(guide.userData.editorGuide);assert.equal(guide.children.length,2);
 for(const line of guide.children){
  assert(line.material.dashed);assert(line.material.depthTest);assert.equal(line.material.depthWrite,false);
  assert(line.material.dashSize>0&&line.material.gapSize>0);
  const hits=[];line.raycast(new T.Raycaster(),hits);assert.equal(hits.length,0);
 }
 assert.notEqual(guide.children[0].material.color.getHex(),guide.children[1].material.color.getHex());
 let disposed=0;guide.children[0].geometry.addEventListener('dispose',()=>disposed++);
 disposeNicheGuide(guide);assert.equal(disposed,1);
});

test('presentation renders exclude all editor guides and restore each prior visibility even on failure',()=>{
 const scene=new T.Scene(),visible=makeNicheGuide(.6,.3),hidden=makeNicheGuide(.3,.2);hidden.visible=false;scene.add(visible,hidden);
 assert.throws(()=>withoutEditorGuides(scene,()=>{assert.equal(visible.visible,false);assert.equal(hidden.visible,false);throw Error('encoder failure');}),/encoder failure/);
 assert.equal(visible.visible,true);assert.equal(hidden.visible,false);
 assert.equal(withoutEditorGuides(scene,()=>42),42);assert.equal(visible.visible,true);
 disposeNicheGuide(visible);disposeNicheGuide(hidden);
});

test('mirror captures exclude niche guides as well as commercial exports',()=>{
 const root=new T.Group(),guide=makeNicheGuide(.6,.3);root.add(guide);
 captureMirrorScene({room:{root,walls:[]}},()=>assert.equal(guide.visible,false));
 assert.equal(guide.visible,true);disposeNicheGuide(guide);
});
