import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {CATALOG as C} from '../src/commerce/catalog.js';
import {initialDraft,normalizeDraft,draftProject} from '../src/commerce/guided.js';
import {quoteProject,lineItems} from '../src/commerce/pricing.js';
import {makeModel} from '../src/model.js';
import {makeColumn} from '../src/column.js';
import {topAvailable,defaultTop,cabinetFormat} from '../src/configuration.js';
import {encodeProject,decodeProject} from '../src/projects.js';
import {buildPreview} from '../src/commerce/preview-model.js';
import {finishTextureURL} from '../src/finish-texture.js';
import {chipStyle} from '../src/commerce/appearance.js';
import {purchaseQuote,privateReference} from '../server/purchase.js';
let count=0;
for(const m of C.models)for(const width of m.widths)for(const finish of m.finishes){
 const d=normalizeDraft({...initialDraft(m.collection),format:m.id,width,finish,top:defaultTop(m.id)}),p=draftProject(d),q=quoteProject(p);
 assert.equal(q.missing.length,0,m.id+' '+width);assert.equal(q.rows[0].ref,m.refs[width][finish]);assert.equal(q.rows[0].publicTTC,m.bareTTC[width]);assert.deepEqual(decodeProject(encodeProject(p)),p);
 const a=makeModel({format:m.id,width:width/100,includeMirror:false});assert.equal(a.drawers.length,m.drawers);assert.equal(a.setTop(d.top),true);let meshes=0;a.root.traverse(o=>{if(o.isMesh){meshes++;assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite));}});assert.ok(meshes>0);const box=new T.Box3().setFromObject(a.root);assert.ok(box.getSize(new T.Vector3()).x>=width/100-.03);a.root.traverse(o=>{o.geometry?.dispose();});count++;
}
for(const col of C.columns)for(const finish of col.finishes){const i={id:'c',type:'column',settings:{columnModel:col.id,finish}},q=lineItems(i);assert.equal(q[0].publicTTC,col.ttc);assert.equal(q[0].ref,col.refs[finish]);const a=makeColumn(i.settings);a.setHingeSide('right');a.door.rotation.y=-.7;assert.ok(new T.Box3().setFromObject(a.root).getSize(new T.Vector3()).y>1);}
assert.equal(quoteProject(draftProject({...initialDraft('harmony'),width:60,top:'none'})).publicTTC,33840);
assert.equal(quoteProject(draftProject({...initialDraft('harmony'),width:60,top:'sella'})).publicTTC,47640);
assert.equal(lineItems({id:'m',type:'mirror',settings:{mirrorModel:'basic',width:60,height:80}})[0].publicTTC,7080);
assert.throws(()=>normalizeDraft({...initialDraft('harmony'),width:61}));assert.throws(()=>normalizeDraft({...initialDraft('luce'),finish:C.models[0].finishes[0]}));assert.equal(topAvailable('sella',80,'luce-single'),false);assert.equal(topAvailable('neris',40,'less-door'),false);
for(const c of C.collections){const preview=buildPreview(draftProject(initialDraft(c.id)));assert.ok(preview.items.length);}
console.log(JSON.stringify({collections:C.collections.length,models:C.models.length,columns:C.columns.length,cabinetCombinations:count,prices:'Public PDF TTC; no second VAT or Studio One coefficient',result:'PASS'}));

for(const color of ['matte','black']){const q=quoteProject(draftProject({...initialDraft('luce'),top:'tampa',basinColor:color,width:120}));assert.equal(q.rows[1].ref,'13044');assert.equal(q.rows[1].publicTTC,57000);}
assert.throws(()=>normalizeDraft({...initialDraft('brent'),top:'tampa',basinColor:'black',width:140}));

// Regression: shallow top drawers must never project their siphon cutout into
// either ceramic basin, and HARMONY fronts must retain straight upper edges.
for(const model of C.models)for(const width of model.widths){
 const asset=makeModel({format:model.id,width:width/100,includeMirror:false});asset.root.updateMatrixWorld(true);
 const shell=new T.Box3().setFromObject(asset.insets.sella.getObjectByName('Vasque_SELLA_coque_3D'));
 asset.cabinet.traverse(part=>{if(part.name.startsWith('Passage_siphon_')){
  const bounds=new T.Box3().setFromObject(part);assert.ok(bounds.max.y<=shell.min.y-.0099,model.id+' siphon above ceramic underside');assert.ok(bounds.getSize(new T.Vector3()).y>0);
 }});
 if(model.collection==='harmony')for(const front of asset.frontMeshes){
  assert.equal(front.name,'Facade_droite_16mm');
  const fb=new T.Box3().setFromObject(front);const ray=new T.Raycaster(new T.Vector3((fb.min.x+fb.max.x)/2,fb.max.y+.3,fb.min.z+.003),new T.Vector3(0,-1,0));
  const hits=ray.intersectObject(front);assert.ok(hits.length);assert.ok(Math.abs(hits[0].point.y-fb.max.y)<.001,'HARMONY rear upper edge must be level');
 }
 asset.root.traverse(o=>o.geometry?.dispose());
}
const harmony=makeColumn({columnModel:'harmony-column'});harmony.root.updateMatrixWorld(true);assert.equal(harmony.doors.length,2);
let handles=0;harmony.root.traverse(o=>{if(/Poignee|biseau|onglet/.test(o.name))handles++;});assert.equal(handles,0);
const closed=harmony.doors.map(p=>new T.Box3().setFromObject(p));assert.ok(closed[0].max.y<closed[1].min.y);assert.ok(Math.abs(closed[1].min.y-closed[0].max.y-.008)<.00001);
for(const side of ['left','right']){assert.equal(harmony.setHingeSide(side),true);const angle=side==='left'?-.7:.7;harmony.door.rotation.y=angle;for(const p of harmony.doors)assert.equal(p.rotation.y,angle);harmony.door.rotation.y=0;}
for(const finish of C.finishes.filter(f=>f.textureURL?.startsWith('https://storage.googleapis.com/'))){
 const url=new URL(finishTextureURL(finish)),original=new URL(finish.textureURL),parts=original.pathname.slice(1).split('/');assert.ok(url.pathname.startsWith('/download/storage/v1/b/'));assert.equal(decodeURIComponent(url.pathname.split('/o/')[1]),parts.slice(1).join('/'));assert.equal(url.searchParams.get('alt'),'media');
}
console.log('HARMONY straight fronts, two handle-free doors, basin clearance and CORS media URLs: PASS');

// Nogal Lincoln is a commercial identity: only its visual sample is substituted.
// Both cabinet and column retain their stored finish ID and official references.
const lincoln=C.finishes.find(f=>f.id==='luce--nogal-lincoln');
const valentina=C.finishes.find(f=>f.id==='aruba--nogal-valentina');
assert.equal(lincoln.name,'Nogal Lincoln');assert.equal(lincoln.collection,'luce');
for(const key of ['hex','texture','textureURL','textureVariants','swatch','frontRotation','textureRepeat','frontRepeat','manufacturerSample','source'])assert.deepEqual(lincoln[key],valentina[key],key);
assert.equal(lincoln.textureCrop,undefined);assert.equal(lincoln.materialSample,undefined);
assert.match(chipStyle(lincoln.id),/background-image:url\(\/assets\/finishes\/20261022\/nogal-swatch\.webp\)/);
assert.equal(finishTextureURL(lincoln),'/assets/finishes/20261022/nogal-balanced.webp');
for(const path of [...Object.values(lincoln.textureVariants),lincoln.swatch]){
 const local=readFileSync(new URL('../dist'+path,import.meta.url));
 const studio=readFileSync(new URL('../../studio-one/dist'+path,import.meta.url));
 assert.deepEqual(local,studio,'Reuse the existing manufacturer sample without a separate Lincoln asset');
}
assert.ok(readFileSync(new URL('../dist'+lincoln.textureVariants.max,import.meta.url)).length>100000,'HD capture must retain the full existing Nogal sample');
const luceDraft={...initialDraft('luce'),format:'luce-single',width:80,finish:lincoln.id,top:'tampa',basinColor:'gloss'};
const luceProject=draftProject(luceDraft),luceQuote=quoteProject(luceProject);
assert.equal(luceQuote.publicTTC,73560);assert.deepEqual(luceQuote.rows.map(r=>[r.ref,r.publicTTC]),[['11350',56520],['6228',17040]]);
assert.match(luceQuote.rows[0].detail,/Nogal Lincoln.*poignée Doré/);
assert.equal(purchaseQuote(luceProject).proHT,30650);
assert.equal(privateReference('LRF-00317',purchaseQuote(luceProject).proHT,true),'LRF-00317-306.50.00');
const luceWithMirror=draftProject({...luceDraft,mirror:'round',mirrorFinish:'Doré'});
assert.equal(quoteProject(luceWithMirror).publicTTC,93000);
assert.equal(privateReference('LRF-00317',purchaseQuote(luceWithMirror).proHT,true),'LRF-00317-387.50.00');
const luceWithColumn=draftProject({...luceDraft,column:true,columnModel:'luce-column',columnFinish:lincoln.id});
const reopened=decodeProject(encodeProject(luceWithColumn));
assert.deepEqual(reopened,luceWithColumn);assert.ok(reopened.items.every(i=>i.settings.finish===lincoln.id));
assert.equal(quoteProject(reopened).rows.at(-1).ref,'11352');
assert.equal(quoteProject(reopened).publicTTC,139200);
const lincolnPreview=buildPreview(reopened);
for(const item of lincolnPreview.items){assert.equal(item.settings.finish,lincoln.id);assert.equal(item.asset.wood.color.getHexString(),'77513d');assert.equal(item.asset.frontWood.color.getHexString(),'77513d');}
lincolnPreview.group.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();});
console.log('Nogal Lincoln: existing Valentina variants and swatch, HD source, stored identities, Luce references/public prices/LRF codes with and without mirror: PASS');
