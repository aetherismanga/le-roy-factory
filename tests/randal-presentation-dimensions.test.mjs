import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createPresentationDimensions,furnitureDimensionSpec,projectFurnitureDimensions} from '../shared/lrf-3d/randal-presentation-dimensions.js';
import {installVisualDOM} from './helpers/visual-choice-dom.mjs';

const dispose=group=>{const materials=new Set();group.traverse(o=>{o.geometry?.dispose();for(const material of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])materials.add(material);});for(const material of materials)material.dispose();};
const cameraFor=preview=>{const bounds=new T.Box3().setFromObject(preview.group),centre=bounds.getCenter(new T.Vector3()),camera=new T.PerspectiveCamera(36,1000/700,.05,100);camera.position.copy(centre).add(new T.Vector3(1,.4,4));camera.lookAt(centre);camera.updateMatrixWorld(true);return camera;};
const resolver=config=>item=>{if(item.type!=='cabinet')return item.asset.spec;const form=config.cabinetFormat(item.settings.format);return {...item.asset.spec,totalHeight:form.height,depth:form.depth||item.asset.spec.depth,base:form.base};};

for(const variant of ['studio-one','randal-general'])test(variant+': all real cabinet and column dimensions follow their own format, including legs and depth',async()=>{
 const {buildPreview}=await import('../'+variant+'/src/commerce/preview-model.js'),adapter=await import('../'+variant+'/src/commerce/guided.js'),{CATALOG:C}=await import('../'+variant+'/src/commerce/catalog.js'),config=await import('../'+variant+'/src/configuration.js'),specification=resolver(config);
 let seen=0;
 for(const model of C.models){
  const general=variant==='randal-general',draft=general?{...adapter.initialDraft(model.collection),format:model.id,width:model.widths[0],finish:model.finishes[0],top:config.defaultTop(model.id),column:!!C.columns.find(c=>c.collection===model.collection)}:{...adapter.initialDraft(),format:model.id,column:true};
  const preview=buildPreview(adapter.draftProject(draft));
  try{for(const item of preview.items){if(!['cabinet','column'].includes(item.type))continue;const spec=furnitureDimensionSpec(item,specification(item));assert(spec);assert.equal(spec.width,item.asset.spec.width);if(item.type==='cabinet'){const form=config.cabinetFormat(item.settings.format);assert.equal(spec.height,form.height);assert.equal(spec.depth,form.depth||.46);assert.equal(spec.base,form.base);}else{assert.equal(spec.height,item.asset.spec.height);assert.equal(spec.depth,item.asset.spec.depth);}seen++;}}
  finally{dispose(preview.group);}
 }
 assert(seen>=C.models.length);
 if(variant==='randal-general')for(const column of C.columns){
  const source=adapter.draftProject(adapter.initialDraft(column.collection));source.items=[{id:column.id,type:'column',settings:{columnModel:column.id,finish:column.finishes[0],hingeSide:'left'},placement:{wall:0,u:150,height:column.base}}];
  const preview=buildPreview(source);try{const dimensions=furnitureDimensionSpec(preview.items[0]);assert.equal(dimensions.width,column.width/100);assert.equal(dimensions.height,column.height/100);assert.equal(dimensions.depth,column.depth/100);assert.equal(dimensions.base,column.base/100);}finally{dispose(preview.group);}
 }
});

test('actual Studio three-drawer assembly measures 91 cm including its 10 cm feet',async()=>{
 const {buildPreview}=await import('../studio-one/src/commerce/preview-model.js'),adapter=await import('../studio-one/src/commerce/guided.js');const preview=buildPreview(adapter.draftProject({...adapter.initialDraft(),format:'three'}));
 try{const item=preview.items.find(i=>i.type==='cabinet'),dimensions=furnitureDimensionSpec(item);assert.equal(dimensions.height,.91);assert.equal(dimensions.base,0);assert.equal(item.asset.spec.height,.81);}
 finally{dispose(preview.group);}
});

test('screen projections follow furniture movement and camera resize while dimensions ignore opened drawers',async()=>{
 const {buildPreview}=await import('../studio-one/src/commerce/preview-model.js'),adapter=await import('../studio-one/src/commerce/guided.js'),preview=buildPreview(adapter.draftProject({...adapter.initialDraft(),column:true})),camera=cameraFor(preview),item=preview.items.find(i=>i.type==='cabinet');
 try{
  const before=projectFurnitureDimensions(item,camera,1000,700);assert.equal(before.length,3);assert.deepEqual(before.map(d=>d.label),['L 80 cm','H 54 cm','P 46 cm']);
  item.asset.drawers.forEach(d=>d.position.z=.315);assert.deepEqual(projectFurnitureDimensions(item,camera,1000,700),before,'opening is not furniture depth');
  item.wrapper.position.x+=.25;const moved=projectFurnitureDimensions(item,camera,1000,700);assert.notEqual(moved[0].line[0].x,before[0].line[0].x);assert.equal(moved[0].label,before[0].label);
  camera.aspect=390/320;camera.updateProjectionMatrix();for(const guide of projectFurnitureDimensions(item,camera,390,320)){assert(Number.isFinite(guide.text.x)&&Number.isFinite(guide.text.y));assert(guide.text.x>=0&&guide.text.x<=390);assert(guide.text.y>=0&&guide.text.y<=320);for(const point of guide.line)assert(Number.isFinite(point.x)&&Number.isFinite(point.y));}
  camera.lookAt(camera.position.clone().add(new T.Vector3(0,0,1)));camera.updateMatrixWorld(true);assert.deepEqual(projectFurnitureDimensions(item,camera,390,320),[]);
 }finally{dispose(preview.group);}
});

test('dimension SVG stays above the rendered image, never changes the scene and cleans its nodes',async()=>{
 const dom=installVisualDOM();dom.document.createElementNS=(_namespace,tag)=>dom.document.createElement(tag);
 const {buildPreview}=await import('../studio-one/src/commerce/preview-model.js'),adapter=await import('../studio-one/src/commerce/guided.js'),preview=buildPreview(adapter.draftProject({...adapter.initialDraft(),column:true})),camera=cameraFor(preview),scene=new T.Scene();scene.add(preview.group);
 const host=dom.document.createElement('div');host.clientWidth=1000;host.clientHeight=700;dom.document.body.append(host);let items=preview.items;
 const dimensions=createPresentationDimensions({host,camera,getItems:()=>items});
 try{
  dimensions.refresh();assert.equal(host.children.length,1);assert.equal(dimensions.element.tagName,'SVG');assert.equal(dimensions.element.style.pointerEvents,'none');assert.equal(dimensions.element.style.zIndex,'2');assert.equal(scene.children.length,1);assert.equal(dimensions.element.querySelectorAll('text').length,6);assert.match(dimensions.element.getAttribute('aria-label'),/largeur 80 cm, hauteur 54 cm, profondeur 46 cm/);
  const nodes=dimensions.element.children.slice();dimensions.refresh();assert.deepEqual(dimensions.element.children,nodes,'refresh reuses overlay nodes');
  dimensions.setVisible(false);assert.equal(dimensions.isVisible(),false);assert.equal(dimensions.element.style.display,'none');dimensions.setVisible(true);assert.equal(dimensions.element.style.display,'block');
  items=[];dimensions.refresh();assert.equal(dimensions.element.children.length,0);dimensions.dispose();dimensions.dispose();assert.equal(host.children.length,0);assert.equal(dimensions.isVisible(),false);assert.equal(scene.children.length,1);
 }finally{dimensions.dispose();dispose(preview.group);dom.restore();}
});

test('invalid or zero-size hosts and non-furniture parts never create invalid labels',()=>{
 assert.equal(furnitureDimensionSpec({type:'mirror',asset:{spec:{width:1,height:1,depth:1}}}),null);
 assert.equal(furnitureDimensionSpec({type:'cabinet',asset:{spec:{width:NaN,height:1,depth:1}}}),null);
 assert.deepEqual(projectFurnitureDimensions({type:'cabinet'},new T.PerspectiveCamera(),0,0),[]);
});
