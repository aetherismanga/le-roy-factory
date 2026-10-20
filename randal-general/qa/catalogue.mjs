import assert from 'node:assert/strict';
import * as T from 'three';
import {CATALOG as C} from '../src/commerce/catalog.js';
import {initialDraft,normalizeDraft,draftProject} from '../src/commerce/guided.js';
import {quoteProject,lineItems} from '../src/commerce/pricing.js';
import {makeModel} from '../src/model.js';
import {makeColumn} from '../src/column.js';
import {topAvailable,defaultTop,cabinetFormat} from '../src/configuration.js';
import {encodeProject,decodeProject} from '../src/projects.js';
import {buildPreview} from '../src/commerce/preview-model.js';
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
