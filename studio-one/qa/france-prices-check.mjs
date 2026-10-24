import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CATALOG as C} from '../src/commerce/catalog.js';
import {lineItems,quoteProject} from '../src/commerce/pricing.js';
import {makeRoom,cloneRoom,validateRoom,DEFAULT_ROOM} from '../src/room.js';
import {plinthWalls} from '../src/plinths.js';
import {publicProjectData,surfacePurchaseAvailable,loadSurfacePurchasePrices,privateSurfacePrice} from '../src/private-surface-prices.js';
// Independently transcribed from the two official France PDFs, 22 October 2026.
const prices={two:[[492,515,584,605],[573,617,708,749]],three:[[660,713,799,833],[742,815,922,977]],'one-xl':[[441,466,534,554],[522,569,657,697]],'two-xl':[[541,566,642,665],[622,668,765,809]]};
let checks=0;for(const m of C.models)for(const [index,width]of [60,80,100,120].entries())for(const f of C.finishes)for(const [withPlan,top]of ['bare','plain'].entries()){
 const item={id:'one',type:'cabinet',settings:{format:m.id,finish:f.id,width,top}},row=lineItems(item)[0],expected=prices[m.id][withPlan][index];assert.equal(row.publicTTC,expected===null?null:expected*100);assert.equal(row.ref,(withPlan?m.top:m.base)+' '+width+'@'+f.refCode);checks++;
 if(m.id==='two-xl'&&withPlan===1&&width===100){assert.equal(row.publicTTC,76500);assert.equal(row.note,'');assert.equal(quoteProject({items:[item]}).publicTTC,76500);assert.equal(quoteProject({items:[item]}).missing.length,0);}
}
for(const f of C.finishes){assert.equal(lineItems({id:'col',type:'column',settings:{finish:f.id}})[0].publicTTC,41300);checks++;}
// The new cabinet tariff never changes the independently extracted mirror/basin public prices.
const pdf=JSON.parse(readFileSync('reports/randal-pdf-prices.json'));
for(const colors of Object.values(C.inset))for(const sizes of Object.values(colors))for(const row of Object.values(sizes))assert.equal(row.ttc,pdf.entries[row.ref]?.publicTTC,row.ref);
for(const mirror of C.mirrors)for(const size of mirror.sizes)for(const ref of Object.values(size.refs||{ref:size.ref}))assert.equal(size.ttc,pdf.entries[ref]?.publicTTC,ref);
const config={...cloneRoom(DEFAULT_ROOM),plinthExclusions:{'boundary-0':[[0,50],[100,160]]}},room=makeRoom(config,0);assert.deepEqual(cloneRoom(config).plinthExclusions,config.plinthExclusions);assert.deepEqual(plinthWalls(room).find(w=>w.key==='boundary-0').cuts.slice(-2),[[0,50],[100,160]]);room.dispose();assert(validateRoom({...config,plinthExclusions:{'boundary-0':[[30,-1]]}},0));
assert(!surfacePurchaseAvailable());await assert.rejects(loadSurfacePurchasePrices(),/administrateur/);assert.deepEqual(publicProjectData({room:config,plinths:{product:{reference:'p',purchaseHT:12}},purchaseHT:50}),{room:config,plinths:{product:{reference:'p'}}});
const catalog=JSON.parse(readFileSync(new URL('../../shared/lrf-3d/commercial-surfaces.json',import.meta.url)));assert(!Object.values(catalog).flat().some(p=>Object.keys(p).some(k=>/^purchase|publicPriceHT$/.test(k))));
const originalFetch=globalThis.fetch;try{globalThis.LRF_VERIFIED_IDENTITY={isAdmin:true};globalThis.fetch=async(url,options)=>{assert.equal(url,'/api/purchase-prices');assert.equal(options.credentials,'same-origin');return {ok:true,json:async()=>({success:true,variant:'studio-one',version:1,products:{sample:{purchaseHT:9}},plinths:{}})};};await loadSurfacePurchasePrices();assert.equal(privateSurfacePrice('products','sample').purchaseHT,9);globalThis.LRF_VERIFIED_IDENTITY={isAdmin:false};assert.deepEqual(privateSurfacePrice('products','sample'),{});}finally{globalThis.fetch=originalFetch;globalThis.LRF_VERIFIED_IDENTITY={isAdmin:false};}
console.log('PASS France tariff: '+checks+' furniture references; mirror/basin PDF prices preserved; 765 EUR confirmed by user, without pending-price note; plinth exclusions and private purchase access verified.');
