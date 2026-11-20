import assert from 'node:assert/strict';
import * as T from 'three';
import {CABINET_FORMATS,cabinetWidthLabel,configurationWidths,pairedCabinet} from '../src/configuration.js';
import {initialDraft,updateDraft,draftProject} from '../src/commerce/guided.js';
import {purchaseQuote} from '../server/purchase.js';
import {quoteProject} from '../src/commerce/pricing.js';
import {orderText} from '../src/commerce/flow.js';
import {basinChoices,renderBasinPlacement} from '../src/basin-selector.js';
import {basinLayouts} from '../src/basins.js';
import {makeModel} from '../src/model.js';
import {decodeProject,encodeProject} from '../src/projects.js';
import {buildPreview} from '../src/commerce/preview-model.js';
import {Composition,itemDimensions,disposeObject} from '../src/composition.js';
import {makeRoom,DEFAULT_ROOM} from '../src/room.js';
import {bindPreviewBasinPicker} from '../../shared/lrf-3d/basin-preview-picking.js';
import {pickSelection} from '../src/picking.js';
import {adjoiningCabinets,joinBasinCabinets} from '../../shared/lrf-3d/paired-basin-placement.js';
import {topAvailable} from '../src/configuration.js';
import {solidPlan} from '../../shared/lrf-3d/solid-surface-catalog.js';
import {createPresentationProducts} from '../../shared/lrf-3d/randal-presentation-products.js';
import {CATALOG} from '../src/commerce/catalog.js';
import {normalizeDraft} from '../src/commerce/guided.js';

const near=(a,b)=>assert.ok(Math.abs(a-b)<.00005,a+' != '+b);
const pairs=CABINET_FORMATS.filter(m=>pairedCabinet(m,140));
assert.equal(pairs.length,6);
for(const m of [...pairs,...CABINET_FORMATS.filter(m=>m.widths.includes(140))]){
 let d=updateDraft(initialDraft(m.collection),{format:m.id,width:140});assert.ok(configurationWidths(m).includes(140));
 const paired=pairedCabinet(m,140),unit=paired?70:140;
 assert.equal(cabinetWidthLabel(m,140).includes('2 × 70'),paired);
 const choices=basinChoices(d);assert.deepEqual(choices.map(o=>o.id),['none','tampa','milo','fiona']);
 assert.equal(choices.find(o=>o.id==='tampa').image,'assets/tampa-double.webp');
 assert.doesNotMatch(choices.find(o=>o.id==='tampa').description,/noir/i);
 for(const [top,basinColor,ref,ttc] of [['tampa','gloss','6236',80760],['tampa','matte','13000',108240],['milo','matte','15012',40800],['fiona','matte','15026',43700]]){
  d=updateDraft(d,{top,basinColor});const project=decodeProject(encodeProject(draftProject(d))),q=quoteProject(project);
  assert.equal(q.rows.length,paired?3:2);assert.ok(q.rows.slice(0,-1).every(r=>r.ref===m.refs[unit][d.finish]&&r.publicTTC===m.bareTTC[unit]));
  assert.equal(q.rows.at(-1).ref,ref);assert.equal(q.rows.at(-1).publicTTC,ttc);assert.equal(q.publicTTC,m.bareTTC[unit]*(paired?2:1)+ttc);
  assert.ok(orderText(project).includes(ref));assert.equal(purchaseQuote(project).rows.at(-1).proHT,Math.round(ttc/2.4));
 }
 const model=makeModel({format:m.id,width:1.4,basinTop:'fiona',includeMirror:false});
 assert.deepEqual(model.getBasinCenters('fiona'),[-.35,.35]);assert.equal(model.faucets.filter(t=>t.visible).length,2);
 if(paired){
  const units=model.cabinet.children.filter(o=>o.name.startsWith('Caisson_700'));assert.deepEqual(units.map(o=>o.position.x),[-.35,.35]);
  for(const tier of model.drawers){assert.equal(tier.children.length,2);assert.deepEqual(tier.children.map(o=>o.position.x),[-.35,.35]);}
  if(m.legHeight)assert.equal(model.root.children.filter(o=>o.name==='Pied_RANDAL').length,8);
 }
 const plate=model.insets.fiona.children[0];model.root.updateMatrixWorld(true);
 const size=new T.Box3().setFromObject(plate).getSize(new T.Vector3());near(size.x,1.41);near(size.y,.015);near(size.z,.46);
 disposeObject(model.root);
}
assert.equal(configurationWidths(CABINET_FORMATS.find(m=>m.collection==='less')).includes(140),false);
const ranges=[['milo',70,'center','15002',24000],['milo',100,'offset-right','15007',29800],['fiona',120,'long','15024',39400],['hebe',70,'center','15028',39400],['aria',120,'double','15040',58600],['hebe-toallero',120,'double','15047',78200]];
for(const [top,width,basinLayout,ref,price] of ranges){
 const m=basinLayout==='long'?'luce':'harmony',d=updateDraft(initialDraft(m),{width,top,basinLayout});
 const p=draftProject(d),row=quoteProject(p).rows.at(-1);assert.equal(row.ref,ref);assert.equal(row.publicTTC,price);assert.equal(d.basinColor,'matte');
 const {asset}=buildPreview(p).items[0],plan=solidPlan(top,width,basinLayout);
 assert.ok(asset.insets[top].visible);assert.equal(asset.insets[top].children.filter(c=>c.name.startsWith('Cuve_')).length,basinLayout==='double'?2:1);
 near(itemDimensions('cabinet',p.items[0].settings).width,plan.width/100);
 if(top==='hebe-toallero')assert.ok(asset.root.getObjectByName('Prise_porte_serviette'));
 disposeObject(asset.root);
}
assert.ok(!basinLayouts('fiona',120,'harmony-two','matte').some(o=>o.layout==='long'));

// Drive the actual select for both the family and implantation, including from a bare cabinet.
class Element{constructor(tag,doc){this.tag=tag;this.ownerDocument=doc;this.children=[];this.dataset={};}append(...c){this.children.push(...c);}setAttribute(){}}
const doc={createElement:t=>new Element(t,doc)},parent=doc.createElement('div');
let draft=updateDraft(initialDraft(),{width:140,top:'none'});
const select=()=>renderBasinPlacement(parent,draft,{onModel:top=>{draft=updateDraft(draft,{top});},onLayout:basinLayout=>{draft=updateDraft(draft,{basinLayout});}});
const dropdown=select();dropdown.value='top:milo';dropdown.onchange();assert.equal(draft.top,'milo');assert.equal(draft.basinLayout,'double');
const change=select();change.value='top:fiona';change.onchange();assert.equal(draft.top,'fiona');
assert.equal(quoteProject(draftProject(draft)).publicTTC,111860);
const preview=buildPreview(draftProject(draft)),cabinet=preview.items[0];
const scene=new T.Scene();scene.add(preview.group);let clicked=0;
for(const top of ['fiona','none']){
 cabinet.asset.setTop(top);scene.updateMatrixWorld(true);
 const point=cabinet.asset.root.localToWorld(new T.Vector3(.34,.83,.035));
 const camera=new T.PerspectiveCamera(40,1,.01,10);camera.position.copy(point).add(new T.Vector3(0,1.25,.10));camera.lookAt(point);camera.updateMatrixWorld();
 const hit=pickSelection(scene,camera,{x:0,y:0});assert.equal(hit?.itemId,cabinet.id);assert.equal(hit.editTarget,'basin');
 const canvas=new EventTarget();canvas.getBoundingClientRect=()=>({left:0,top:0,width:100,height:100});
 const release=bindPreviewBasinPicker(canvas,scene,camera,id=>{assert.equal(id,cabinet.id);clicked++;});
 const fire=(type,x)=>canvas.dispatchEvent(Object.assign(new Event(type),{pointerId:1,button:0,clientX:x,clientY:50}));
 fire('pointerdown',50);fire('pointerup',50);fire('pointerdown',50);fire('pointermove',75);fire('pointerup',75);release();
}
assert.equal(clicked,2);disposeObject(preview.group);
const products=createPresentationProducts({catalog:CATALOG,normalizeDraft,draftProject,initialDraft});
const source=draftProject(updateDraft(initialDraft(),{width:70})),id=source.items[0].id;
const resized=products.apply(source,{width:140},{itemId:id});const changed=products.apply(resized,{top:'milo'},{itemId:id});
assert.equal(quoteProject(changed).rows.at(-1).ref,'15012');assert.ok(products.fields(changed,{itemId:id,part:'basin'}).groups[0].fields[0].choices.find(c=>c.value==='fiona'&&!c.disabled));

// An adjacent pair from an older project can receive one plan without moving other equipment.
const room=makeRoom(DEFAULT_ROOM,0),composition=new Composition(room),settings=source.items[0].settings;
const create=(type,s)=>makeModel({format:s.format,width:s.width/100,basinTop:s.top,basinLayout:s.basinLayout,includeMirror:false});
const [left,right]=[90,160].map(u=>composition.add('cabinet',create('cabinet',settings),settings,{wall:0,u,height:28}).item);
assert.equal(adjoiningCabinets(composition,left)[0],right);
const joined=joinBasinCabinets(composition,left,right,{topAvailable,makeAsset:create,itemDimensions,dispose:disposeObject});
assert.equal(joined.item,left);assert.equal(left.settings.width,140);assert.equal(left.placement.u,125);assert.equal(composition.items.length,1);
assert.equal(quoteProject({items:composition.items}).rows.length,3);disposeObject(left.root);room.dispose();
console.log('PASS · guided/placement/3D tap, saved quote & order, real 2 × 70, native Brent, existing adjacent units, all five Solid Surface families');
