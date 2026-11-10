import assert from 'node:assert/strict';
import * as T from 'three';
import {readFileSync} from 'node:fs';
import {INTEGRATED_BASINS,basinCenters} from '../src/integrated-basins.js';
import {basinLayouts,basinEntry,basinColors} from '../src/basins.js';
import {makeModel} from '../src/model.js';
import {initialDraft,draftProject,normalizeDraft} from '../src/commerce/guided.js';
import {quoteProject} from '../src/commerce/pricing.js';
import {CATALOG as C} from '../src/commerce/catalog.js';
const general=!!C.collections,form=general?'aruba-two':'two';
const dispose=a=>{const gs=new Set(),ms=new Set();a.root.traverse(o=>{if(o.geometry)gs.add(o.geometry);for(const m of o.material?Array.isArray(o.material)?o.material:[o.material]:[])ms.add(m);});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());};
const pdf=JSON.parse(readFileSync(new URL('./ceramic-pdf-prices.json',import.meta.url))).publicTTC;
let variants=0,physical=0;const refs=new Set();
for(const [top,colors]of Object.entries(INTEGRATED_BASINS))for(const [color,layouts]of Object.entries(colors))for(const [layout,widths]of Object.entries(layouts))for(const [width,r]of Object.entries(widths)){
 variants++;refs.add(r.ref);
 assert.equal(Number.isInteger(r.ttc),true);assert.equal(r.ttc,pdf[r.ref],r.ref+': independently extracted PDF public TTC');
 const format=general&&+width===140?'brent-three':form;
 if(!general&&+width>120)continue;
 if(!basinLayouts(top,+width,format,color).some(o=>o.layout===layout))continue;
 const a=makeModel({width:+width/100,format,basinLayout:layout,basinTop:top,includeMirror:false});a.setTop(top);a.root.updateMatrixWorld(true);
 const bowls=a.insets[top].children.filter(o=>o.name==='Vasque_'+top.toUpperCase()+'_coque_3D'),centers=basinCenters(layout,a.spec.width);
 assert.equal(bowls.length,layout==='double'?2:1);assert.deepEqual(bowls.map(o=>o.position.x),centers);assert.equal(a.insets[top].children.filter(o=>o.name==='Bonde_chromee').length,centers.length);assert.equal(a.faucets.filter(o=>o.visible).length,centers.length);
 const plate=a.insets[top].children[0];for(const x of centers){const down=new T.Raycaster(new T.Vector3(x,a.spec.bottom+a.spec.height+.6,.027),new T.Vector3(0,-1,0));assert.equal(down.intersectObject(plate).length,0,'Real bowl hole in ceramic plate');const tap=new T.Raycaster(new T.Vector3(x,a.spec.bottom+a.spec.height+.6,-.173),new T.Vector3(0,-1,0));assert.equal(tap.intersectObject(plate).length,0,'Tap hole aligned with basin');}
 const d={...(general?initialDraft('aruba'):initialDraft()),format,width:+width,top,basinColor:color,basinLayout:layout};if(general&&+width===140){const b=initialDraft('brent');Object.assign(d,{format:b.format,finish:b.finish,collection:b.collection,columnFinish:b.columnFinish});}
 const p=draftProject(d),q=quoteProject(p),row=q.rows.find(r=>r.name.startsWith('Vasque '));assert.equal(row.ref,r.ref);assert.equal(row.publicTTC,r.ttc);assert.equal(p.items[0].settings.basinLayout,layout);assert.equal(quoteProject(JSON.parse(JSON.stringify(p))).publicTTC,q.publicTTC);assert.equal(basinEntry(top,color,+width,format,layout).ref,r.ref);physical++;dispose(a);
}
assert.equal(variants,45);assert.equal(refs.size,34);assert.deepEqual(basinColors('tampa',140,general?'brent-three':form,'double').map(c=>c.id),['gloss','matte']);
assert.throws(()=>normalizeDraft({...initialDraft(),top:'sella',basinLayout:'double',width:80}));
assert.equal(quoteProject({items:[{id:'x',type:'cabinet',settings:{...initialDraft(),top:'sella',width:80,basinLayout:'double'}}]}).publicTTC,null,'No guessed price for invalid layout');
if(general){for(const id of ['amat-two','amat-three','amat-two-door','amat-three-door']){const a=makeModel({format:id,width:1});assert.ok(a.handles.length>=3);assert.ok(a.handles.every(h=>h.material===a.frontWood));a.frontWood.color.set('#194a36');assert.ok(a.handles.every(h=>h.material.color.getHexString()==='194a36'));dispose(a);}}
if(general){
 const a=makeModel({format:'less-door',width:.4,basinTop:'compact',includeMirror:false});a.root.updateMatrixWorld(true);
 assert.equal(a.getTop(),'compact');assert.ok(a.insets.compact.visible);assert.ok(!a.insets.sella.visible&&!a.insets.tampa.visible);
 const compact=a.insets.compact,plate=compact.children[0],bowl=compact.getObjectByName('Vasque_COMPACT_coque_3D');
 const bounds=new T.Box3().setFromObject(plate),size=bounds.getSize(new T.Vector3());assert.ok(size.x>.40&&size.x<.41&&size.z>.22&&size.z<.23,'LESS has its own shallow 40 × 22 cm ceramic top');
 assert.ok(bowl.position.x<0,'LESS bowl leaves a tap ledge on its right');
 const [tap]=a.getTapPlacements('compact');assert.ok(tap.x>.12&&tap.x<bounds.max.x);assert.ok(tap.z>bounds.min.z&&tap.z<bounds.max.z);assert.equal(tap.rotationY,-Math.PI/2,'Side tap points into the bowl');
 const ray=(x,z)=>new T.Raycaster(new T.Vector3(x,1.5,z),new T.Vector3(0,-1,0)).intersectObject(plate);
 assert.equal(ray(tap.x,tap.z).length,0,'LESS right-hand tap sits over its ceramic drilling');
 const center=bowl.getWorldPosition(new T.Vector3());assert.equal(ray(center.x,center.z).length,0,'LESS has a real offset bowl opening');assert.ok(ray(0,bounds.min.z+.015).length>0,'Back of the LESS top stays solid, without a central tap hole');
 const before=JSON.stringify(a.getTapPlacements('compact'));a.setTop('compact');assert.equal(JSON.stringify(a.getTapPlacements('compact')),before,'Reapplying the top keeps the side mounting');dispose(a);
 const b=makeModel({format:'aruba-two',width:.8,basinTop:'sella',includeMirror:false});assert.deepEqual(b.getTapPlacements('sella'),[{x:0,y:b.spec.bottom+b.spec.height+.024,z:-.173,rotationY:0}]);dispose(b);
}
console.log(JSON.stringify({result:'PASS',publicVariants:variants,distinctReferences:refs.size,physicalConfigurations:physical,checks:['Public prices match the independently extracted official table','real centred / left-offset / double ceramic shells','aligned apertures, drains and taps','layout persisted and independently quoted','unknown black 140 cm not offered',...(general?['AMAT handles share the actual furniture finish']:[])]}));
