import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {AQUAHOME_BATHROOM_ADDITIONS,AQUAHOME_BATHROOM_PENDING} from '../../shared/lrf-3d/aquahome-bathroom-catalog.js';

const sourceURL=new URL('../../assets/data/aquahome-products.json',import.meta.url);
const sourceBytes=readFileSync(sourceURL);
const source=JSON.parse(sourceBytes);
const provenance=JSON.parse(readFileSync(new URL('../../shared/lrf-3d/aquahome-bathroom-catalog.provenance.json',import.meta.url)));
const activeUses=new Set(['basin-wall','basin-floor','bidet','shower-mixer','shower-concealed','shower-kit']);
const all=[...AQUAHOME_BATHROOM_ADDITIONS,...AQUAHOME_BATHROOM_PENDING];

test('every additional or pending bathroom identity has one unambiguous public source and exact catalogue provenance',()=>{
 assert.equal(provenance.sourceSHA256,createHash('sha256').update(sourceBytes).digest('hex'));
 assert.equal(provenance.sourceVersion,source.version);
 assert.equal(provenance.sourcePageCount,source.pageCount);
 assert.equal(all.length,116);
 assert.equal(new Set(all.map(p=>p.reference)).size,all.length);
 assert.equal(provenance.products.length,all.length);
 for(const product of all){
  const matches=source.products.filter(row=>row.reference===product.reference);
  assert.equal(matches.length,1,product.reference+' has exactly one public identity');
  const original=matches[0];
  assert(!original.priceAmbiguous,product.reference+' has no ambiguous source reference');
  for(const field of ['reference','sourceName','finish','page'])assert.equal(product[field],original[field],product.reference+'/'+field);
  const evidence=provenance.products.find(row=>row.reference===product.reference);
  assert(evidence,product.reference+' has provenance');
  assert.deepEqual(evidence.hotspot,original.hotspot);
  assert.equal(evidence.sourceCollection,original.collection);
  if(evidence.normalization){
   assert.equal(evidence.normalization.field,'collection');
   assert.equal(evidence.normalization.source,original.collection);
   assert.equal(product.collection,evidence.normalization.display);
  }else assert.equal(product.collection,original.collection);
  assert.equal(product.modelKey,product.collection+' | '+product.sourceName);
  assert(!Object.keys(product).some(key=>/price|TTC|HT|purchase/i.test(key)),product.reference+' contains no commercial fields');
 }
 assert(!all.some(product=>product.reference==='12759112601'),'ambiguous kitchen reference is excluded');
});

test('only the six supported bathroom families are active, pending products stay outside the selection',()=>{
 assert.equal(AQUAHOME_BATHROOM_ADDITIONS.length,85);
 assert.equal(AQUAHOME_BATHROOM_PENDING.length,31);
 const counts={};
 for(const product of AQUAHOME_BATHROOM_ADDITIONS){
  assert(activeUses.has(product.use));
  assert.notEqual(product.sourceName,'TEMPORIZADO MURAL 1 AGUA');
  assert.equal(provenance.products.find(row=>row.reference===product.reference).configurable,true);
  counts[product.use]=(counts[product.use]||0)+1;
 }
 assert.deepEqual(counts,{'bidet':20,'basin-wall':13,'shower-concealed':16,'shower-mixer':28,'basin-floor':6,'shower-kit':2});
 const ready=new Set(AQUAHOME_BATHROOM_ADDITIONS.map(product=>product.reference));
 for(const product of AQUAHOME_BATHROOM_PENDING){
  assert(!ready.has(product.reference));
  assert.equal(provenance.products.find(row=>row.reference===product.reference).configurable,false);
 }
 assert.equal(provenance.configurableCount,85);
 assert.equal(provenance.pendingCount,31);
});

test('Sprinter bidet and shower references remain distinct from Munich',()=>{
 for(const reference of ['12041112701','12043112701'])assert.equal(AQUAHOME_BATHROOM_ADDITIONS.find(row=>row.reference===reference).collection,'Sprinter');
 for(const reference of ['10341112701','10343112701'])assert.equal(AQUAHOME_BATHROOM_ADDITIONS.find(row=>row.reference===reference).collection,'Munich');
});
