import test from 'node:test';
import assert from 'node:assert/strict';
import data from '../../shared/lrf-3d/commercial-surfaces.json' with {type:'json'};
import {commercialSurfaceProduct} from '../../shared/lrf-3d/surface-identity.mjs';
import {createSurface} from '../../shared/lrf-3d/room.js';
import {coloredQuantityRows} from '../../shared/lrf-3d/tile-colors.js';
import * as studio from '../../studio-one/src/surface-commerce.js';
import * as general from '../../randal-general/src/surface-commerce.js';
import {loadSurfacePurchasePrices} from '../../studio-one/src/private-surface-prices.js';

const product=reference=>data.products.find(product=>product.reference===reference);
const base=product('04S6A21'),franceseR10=product('04S6A22'),franceseR9=product('04S6A32');
const wallFinish={collection:'Stone Icon',color:'campaspero',format:'60x120',catalogueKey:base.key,reference:base.reference,finish:base.finish};

test('a colour override retains R10 B and never falls back to another finish or reference',()=>{
 const override={...wallFinish,color:'francese'};
 // Distinct public fixture prices prove which reference supplies a price;
 // these numbers are synthetic and contain no manufacturer purchase data.
 const fixtures=[{...base,priceTTC:17},{...franceseR9,priceTTC:19},{...franceseR10,priceTTC:23}];
 assert.equal(commercialSurfaceProduct(override,fixtures).reference,'04S6A22');
 assert.equal(commercialSurfaceProduct(override,fixtures).priceTTC,23);
 assert.equal(commercialSurfaceProduct({...override,finish:undefined},fixtures).reference,'04S6A22','Older rows recover the finish from their source SKU');
 assert.equal(commercialSurfaceProduct(override,fixtures.filter(product=>product!==fixtures[2])),null,'An absent R10 B reference cannot become R9');
 assert.equal(commercialSurfaceProduct({...override,finish:'Unavailable finish'},fixtures),null);
 assert.equal(commercialSurfaceProduct({...override,catalogueKey:'missing',reference:'missing',finish:undefined},fixtures),null);
});

test('both quote adapters keep the overridden colour reference, finish and matching price through measured quantity rows',async()=>{
 const surface=createSurface([[0,0],[2.4,0],[2.4,1.2],[0,1.2]],'Quote audit');
 surface.setLayout({width:1.2,height:.6});
 const key=surface.tiles.geometry.userData.cells[0].key,rows=coloredQuantityRows(surface,{...wallFinish,tiles:{[key]:'francese'}},surface.layout,10,'Mur');
 const changed=rows.find(row=>row.color==='francese');
 assert.equal(changed.finish,wallFinish.finish);assert.equal(changed.reference,wallFinish.reference,'The inherited reference is retained until commercial resolution');
 const previousFetch=globalThis.fetch,previousIdentity=globalThis.LRF_VERIFIED_IDENTITY;
 // In-memory authenticated-response fixture; no network or actual price access.
 globalThis.LRF_VERIFIED_IDENTITY={isAdmin:true};
 const prices={[franceseR9.key]:{purchaseHT:19},[franceseR10.key]:{purchaseHT:23}};
 globalThis.fetch=async()=>({ok:true,json:async()=>({success:true,variant:'studio-one',products:prices})});
 try{
  await loadSurfacePurchasePrices();await general.loadPurchasePrices();
  for(const adapter of [studio,general]){
   const quoted=adapter.enrichQuantity(changed,changed);
   assert.equal(quoted.reference,'04S6A22');assert.equal(quoted.catalogueKey,franceseR10.key);assert.equal(quoted.finish,wallFinish.finish);
   assert.equal(quoted.purchaseHT,23);assert.equal(quoted.totalPurchaseHT,Math.round(quoted.orderArea*23*100)/100);
   const unknown=adapter.enrichQuantity({...changed,purchaseHT:19},{...changed,finish:'Unavailable finish'});
   assert.equal(unknown.reference,undefined);assert.equal(unknown.catalogueKey,undefined);assert.equal(unknown.purchaseHT,undefined);assert.equal(unknown.totalPurchaseHT,null);
   assert.equal(unknown.finish,'Unavailable finish');
  }
 }finally{globalThis.fetch=previousFetch;globalThis.LRF_VERIFIED_IDENTITY=previousIdentity;general.clearPurchasePrices();}
});
