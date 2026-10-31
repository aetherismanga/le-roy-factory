import assert from 'node:assert/strict';
import * as T from 'three';
import {makeModel,FINISHES} from '../src/model.js';
import {CABINET_FORMATS,WIDTH_PRESETS,drawerTravel} from '../src/configuration.js';
import {disposeObject} from '../src/composition.js';
import {initialDraft,normalizeDraft,draftProject} from '../src/commerce/guided.js';
import {buildPreview,previewStructure,applyPreviewSettings} from '../src/commerce/preview-model.js';
import {encodeProject,decodeProject,ProjectJournal} from '../src/projects.js';
import {saveComposition,readStored,SAVED_KEY} from '../src/commerce/flow.js';

const close=(actual,expected,label)=>assert.ok(Math.abs(actual-expected)<1e-6,`${label}: ${actual} ≠ ${expected}`);
const bounds=object=>new T.Box3().setFromObject(object);
const widths=[40,...WIDTH_PRESETS],modes=['overlay','inset'];
let configurations=0,animatedDrawers=0;

// Exercise every format at both range limits and all offered width presets.
// Front-on rays verify the wood edges are actually visible, not hidden by fronts.
for(const form of CABINET_FORMATS)for(const widthCm of widths)for(const facadeMode of modes){
 const width=widthCm/100,model=makeModel({format:form.id,width,facadeMode,basinTop:'bare',includeMirror:false});
 model.root.updateMatrixWorld(true);
 assert.equal(model.facadeMode,facadeMode);assert.equal(model.drawers.length,form.drawers);
 const body=bounds(model.cabinet),sides=['Joue_gauche_19mm','Joue_droite_19mm'].map(name=>model.root.getObjectByName(name)),sideBounds=sides.map(bounds);
 close(body.getSize(new T.Vector3()).x,width,'Overall cabinet width');
 close(body.getSize(new T.Vector3()).y,form.height-(form.legHeight||0),'Body height');
 close(body.getSize(new T.Vector3()).z,.46,'Overall cabinet depth');
 for(const [i,side]of sides.entries()){
  close(sideBounds[i].getSize(new T.Vector3()).x,.019,'19 mm side panel');
  assert.equal(side.material,model.wood,'Exposed edges use the cabinet finish material');
 }
 close(sideBounds[0].min.x,-width/2,'Left outside edge');close(sideBounds[1].max.x,width/2,'Right outside edge');
 const firstFront=bounds(model.frontMeshes[0]),rayY=firstFront.getCenter(new T.Vector3()).y;
 for(const [i,side]of sides.entries()){
  const ray=new T.Raycaster(new T.Vector3(sideBounds[i].getCenter(new T.Vector3()).x,rayY,1),new T.Vector3(0,0,-1));
  const hit=ray.intersectObject(model.cabinet,true)[0];assert.ok(hit,'Cabinet is visible from the front');
  assert.equal(hit.object,facadeMode==='inset'?side:model.frontMeshes[0],facadeMode==='inset'?'Inset option exposes both 19 mm edges':'Legacy fronts cover the side edges');
 }
 for(const [i,front]of model.frontMeshes.entries()){
  const closed=bounds(front);
  if(facadeMode==='inset'){
   close(closed.min.x-sideBounds[0].max.x,.002,'Left running clearance');
   close(sideBounds[1].min.x-closed.max.x,.002,'Right running clearance');
   close(closed.max.z,sideBounds[0].max.z,'Front and exposed edge plane');
  }else close(closed.getSize(new T.Vector3()).x,width-.004,'Legacy overlay front width');
  const travel=drawerTravel(i,form.drawers),before=model.frontMeshes.map(bounds);
  model.drawers[i].position.z=travel;model.root.updateMatrixWorld(true);
  model.frontMeshes.forEach((other,j)=>close(bounds(other).min.z-before[j].min.z,i===j?travel:0,'Independent drawer motion'));
  sides.forEach((side,j)=>assert.ok(bounds(side).equals(sideBounds[j]),'Exposed sides remain fixed while drawers move'));
  model.drawers[i].position.z=0;model.root.updateMatrixWorld(true);animatedDrawers++;
 }
 disposeObject(model.root);configurations++;
}

// Projects created before this option retain the original overlay geometry.
const fresh=initialDraft();assert.equal(fresh.facadeMode,'overlay');
const legacyDraft={...fresh};delete legacyDraft.facadeMode;
assert.equal(normalizeDraft(legacyDraft).facadeMode,'overlay');
assert.throws(()=>normalizeDraft({...fresh,facadeMode:'unknown'}),/façade/i);
const legacyProject=draftProject(legacyDraft),explicitOverlay=draftProject({...fresh,facadeMode:'overlay'});
delete legacyProject.items[0].settings.facadeMode;
assert.equal(previewStructure(legacyProject),previewStructure(explicitOverlay),'Legacy projects reuse the overlay preview structure');
const legacyPreview=buildPreview(legacyProject);assert.equal(legacyPreview.items[0].asset.facadeMode,'overlay');disposeObject(legacyPreview.group);
const legacyModel=makeModel({includeMirror:false}),overlayModel=makeModel({facadeMode:'overlay',includeMirror:false});
for(let i=0;i<legacyModel.frontMeshes.length;i++)assert.deepEqual(legacyModel.frontMeshes[i].geometry.attributes.position.array,overlayModel.frontMeshes[i].geometry.attributes.position.array,'Default drawer geometry remains unchanged');
disposeObject(legacyModel.root);disposeObject(overlayModel.root);

// Run the guided draft through actual save, share and history paths.
for(const form of CABINET_FORMATS){
 const draft=normalizeDraft({...fresh,format:form.id,facadeMode:'inset',width:100}),project=draftProject(draft);
 assert.equal(project.items[0].settings.facadeMode,'inset');
 const data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value))};
 saveComposition(storage,project,{id:'inset-'+form.id,now:'2026-10-31T06:00:00Z'});
 const stored=readStored(storage,SAVED_KEY)[0].data,restored=decodeProject(encodeProject(stored));
 assert.deepEqual(restored,project,'Saving and sharing preserve the chosen facade and complete project');
 const journal=new ProjectJournal();journal.seed(legacyProject);journal.record(restored);
 assert.equal(journal.undo().items[0].settings.facadeMode,undefined);assert.equal(journal.redo().items[0].settings.facadeMode,'inset');
 const preview=buildPreview(restored);assert.equal(preview.items[0].asset.facadeMode,'inset');disposeObject(preview.group);
}

// A facade change rebuilds preview geometry; finish changes recolor both edges
// and fronts on the same real model, preserving the inset and drawer geometry.
const insetProject=draftProject({...fresh,facadeMode:'inset'});
assert.notEqual(previewStructure(insetProject),previewStructure(explicitOverlay),'Changing facade construction invalidates preview geometry');
for(const form of CABINET_FORMATS){
 const project=draftProject({...fresh,format:form.id,facadeMode:'inset'}),preview=buildPreview(project),asset=preview.items[0].asset,fronts=asset.frontMeshes.map(mesh=>mesh.geometry),sides=['Joue_gauche_19mm','Joue_droite_19mm'].map(name=>asset.root.getObjectByName(name));
 for(const finish of FINISHES){
  const updated=draftProject({...fresh,format:form.id,facadeMode:'inset',finish:finish.id});
  assert.equal(previewStructure(updated),previewStructure(project),'Finish-only changes keep the geometry');
  applyPreviewSettings(preview,updated);
  for(const material of [asset.frontWood,...sides.map(side=>side.material)])assert.equal(material.color.getHexString(),new T.Color(finish.hex).getHexString(),'Fronts and visible edges follow the selected finish');
  asset.frontMeshes.forEach((front,i)=>assert.equal(front.geometry,fronts[i],'Recoloring preserves inset mesh geometry'));
 }
 disposeObject(preview.group);
}
console.log(`PASS: inset facade, ${configurations} geometry configurations, ${animatedDrawers} independent drawer movements, all finishes, legacy defaults, guided/save/share/history roundtrips and preview rebuilds`);
