import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,writeFileSync} from 'node:fs';
import {CATALOG as C} from '../src/commerce/catalog.js';
import {quoteProject} from '../src/commerce/pricing.js';
import {initialDraft,draftProject} from '../src/commerce/guided.js';
import {purchaseQuote} from '../server/purchase.js';
const pdf=JSON.parse(readFileSync('reports/randal-pdf-prices.json'));
const context={window:{}};
vm.runInNewContext(readFileSync((process.env.STUDIO_ONE_SOURCE||'../site-audit')+'/assets/js/studio-one/catalog.js','utf8'),context);
const original=context.window.StudioOneCatalog,verified=new Map(),corrections=[];
const check=(ref,actual,expected,source)=>{assert.equal(actual,expected,ref);if(verified.has(ref))assert.equal(verified.get(ref).publicTTC,actual);verified.set(ref,{ref,publicTTC:actual,source});};
for(const [i,model] of C.models.entries())for(const [size,bucket] of C.sizes.entries())for(const finish of C.finishes){
 const old=original.models[i];
 check(model.base+' '+bucket.ref+'@'+finish.refCode,model.bareTTC[size],Math.round(old.sans[size]*240),'C1 25/09/2026, without top');
 check(model.top+' '+bucket.ref+'@'+finish.refCode,model.topTTC[size],Math.round(old.avec[size]*240),'C1 25/09/2026, matching top included');
}
for(const finish of C.finishes)check(C.column.ref+' '+finish.refCode,C.column.ttc,Math.round(original.column.price*240),'C1 column');
for(const colors of Object.values(C.inset))for(const sizes of Object.values(colors))for(const row of Object.values(sizes))check(row.ref,row.ttc,pdf.entries[row.ref]?.publicTTC,'RANDAL V04 p38');
for(const finish of C.vesselColors)for(const name of ['Neris','Torne'])check(finish[name],C.vesselTTC,pdf.entries[finish[name]]?.publicTTC,'RANDAL V04 p41');
for(const mirror of C.mirrors)for(const size of mirror.sizes)for(const ref of Object.values(size.refs||{ref:size.ref})){
 check(ref,size.ttc,pdf.entries[ref]?.publicTTC,'RANDAL V04 p36');
 corrections.push({ref,name:mirror.name,size:size.label,previousTTC:size.ttc*2,correctedTTC:size.ttc});
 assert.equal(purchaseQuote(draftProject({...initialDraft(),mirror:mirror.id,mirrorSize:mirror.sizes.indexOf(size),mirrorFinish:Object.keys(size.refs||{})[0]||'Noir'})).proHT,null);
}
const screenshot=draftProject({...initialDraft(),mirror:'capsule'}),quote=quoteProject(screenshot);
assert.deepEqual(quote.rows.map(r=>[r.ref,r.publicTTC]),[['13692 80@ROBLE',52800],['2171',16320],['12741',41640]]);
assert.equal(quote.publicTTC,110760);
assert.equal(quoteProject({items:[...screenshot.items,...screenshot.items.map(i=>({...i,id:i.id+'2'}))]}).publicTTC,221520);
assert.equal(quoteProject({items:[{id:'m',type:'mirror',settings:{mirrorModel:'capsule',width:46,height:90}}]}).publicTTC,null);
const report={passed:true,totalDistinctPublicReferences:verified.size,pdfVerifiedReferences:[...verified.values()].filter(r=>r.source.startsWith('RANDAL')).length,c1VerifiedReferences:[...verified.values()].filter(r=>r.source.startsWith('C1')).length,correctedMirrorReferences:corrections.length,corrections,verified:[...verified.values()],unknownPurchaseReferences:corrections.map(r=>r.ref),checks:['Independent PDF extraction rather than reproducing the legacy mirror calculation','All public references and C1 width bands checked','Matching top included once; no extra finish surcharge','Screenshot configuration totals 1107.60; multiple quantities sum correctly','Undocumented mirror purchase prices remain unavailable; no invented discount']};
writeFileSync('reports/verified-prices-check.json',JSON.stringify(report,null,2)+'\n');
console.log({...report,verified:undefined,corrections:undefined,unknownPurchaseReferences:undefined});
