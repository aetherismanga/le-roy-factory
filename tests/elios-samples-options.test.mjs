import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {sampleTileMatches,sampleFacetValues,sampleChargesSummary,samplePrintDocument} from '../assets/js/elios-samples-options.mjs';
const require=createRequire(import.meta.url),C=require('../functions/elios-samples-core.cjs');
const {withSampleCharges,sampleChargesHTML,sampleChargesText,PRICING_VERSION}=require('../functions/elios-samples-options.cjs');
const product={key:'ELIOS|TEST001',reference:'TEST001',collection:'Test collection',color:'Cream',format:'60x120',finish:'3D Honed',packVerified:true,packArea:1.44,packPieces:2,vrac:true};
const catalogue={products:[product,{...product,key:'ELIOS|TEST002',reference:'TEST002',vrac:false}],merchandising:[{id:'kit',reference:'KIT-TEST',collection:'Test',description:'Example',valueUnitHT:40}]};
const rates={'ELIOS|TEST001':{purchaseHT:20}};
const quote=(quantity,pose=false)=>C.buildQuote([{type:'box',key:product.key,quantity}],catalogue,rates,0,pose);
const areaQuote=(area,pose)=>withSampleCharges({rows:[{type:'box',quantity:area,totalHT:area*10}],incomplete:false},pose);

test('tax sums ordered box square metres once, after packaging, without the exhibition reduction',()=>{
 const q=quote(5);assert.equal(q.pricingVersion,PRICING_VERSION);assert.equal(q.rows[0].quantity,5.76);assert.equal(q.tilesSubtotalHT,57.6);assert.deepEqual(q.energyTax,{area:5.76,rateHT:0.7,amountHT:4.03});assert.equal(q.totalHT,61.63);assert.equal(q.installation.amountHT,0);
 const mixed=withSampleCharges({rows:[{type:'box',quantity:5.4,totalHT:54},{type:'box',quantity:5.94,totalHT:59.4},{type:'box',quantity:12.96,totalHT:129.6},{type:'box',quantity:11.52,totalHT:115.2},{type:'vrac',quantity:2,totalHT:0},{type:'merchandising',quantity:3,totalHT:0}],incomplete:false},false);
 assert.equal(mixed.boxArea,35.82);assert.equal(mixed.energyTax.amountHT,25.07);assert.equal(mixed.totalHT,383.27);
});
test('installation follows the requested threshold, including exactly 8 square metres',()=>{
 for(const [surface,expected,mode]of [[0,0,'forfait'],[0.01,160,'forfait'],[7.99,160,'forfait'],[8,160,'forfait'],[8.01,128.16,'surface'],[10,160,'surface'],[35.82,573.12,'surface']]){const q=areaQuote(surface,true);assert.equal(q.installation.amountHT,expected);assert.equal(q.installation.mode,mode);assert.equal(q.installation.requested,surface>0);}
 assert.equal(quote(5,true).subtotalHT,221.63);assert.equal(quote(5,true).supplierTotalHT,61.63);assert.equal(quote(5,false).subtotalHT,61.63);
 for(const value of ['true',1,{},null])assert.throws(()=>withSampleCharges({rows:[],incomplete:false},value));
});
test('eligible vrac permits 1 or 2 pieces, has no tax or installation, rejects other quantities and references',()=>{
 for(const quantity of [1,2]){const q=C.buildQuote([{type:'vrac',key:product.key,quantity}],catalogue,{},0,true);assert.equal(q.rows[0].quantity,quantity);assert.equal(q.rows[0].label,true);assert.equal(q.energyTax.amountHT,0);assert.equal(q.installation.requested,false);assert.equal(q.totalHT,0);}
 for(const quantity of [0,3,-1,1.5,NaN,Infinity])assert.throws(()=>C.buildQuote([{type:'vrac',key:product.key,quantity}],catalogue));
 assert.throws(()=>C.buildQuote([{type:'vrac',key:'ELIOS|TEST002',quantity:2}],catalogue));
});
test('merchandising remains outside payable taxes and installation',()=>{
 const q=C.buildQuote([{type:'merchandising',key:'kit',quantity:2}],catalogue,{},0,true);assert.equal(q.totalHT,0);assert.equal(q.merchandisingValueHT,80);assert.equal(q.energyTax.area,0);assert.equal(q.installation.amountHT,0);
});
test('unknown tile costs keep the quote incomplete without suppressing known tax',()=>{
 const q=C.buildQuote([{type:'box',key:product.key,quantity:5}],catalogue,{},0,true);assert.equal(q.totalHT,null);assert.equal(q.incomplete,true);assert.equal(q.energyTax.amountHT,4.03);assert.equal(q.subtotalHT,164.03);
});
test('forged amounts are ignored and changing installation invalidates the prepared-request fingerprint',()=>{
 const q=C.buildQuote([{type:'box',key:product.key,quantity:5,energyTax:{amountHT:0},installation:{amountHT:0},totalHT:0}],catalogue,rates,0,true);assert.equal(q.subtotalHT,221.63);
 const payload={items:[{type:'box',key:product.key,quantity:5}],contact:{name:'Test'}},account={owner:'client:synthetic'};
 assert.notEqual(C.requestFingerprint(payload,account),C.requestFingerprint({...payload,installationRequested:true},account));assert.equal(C.requestFingerprint(payload,account),C.requestFingerprint({...payload,installationRequested:false},account));
});
test('colour, finish, collection and size filters are combined against eligible exact variants',()=>{
 const rows=[product,{...product,key:'two',format:'30x30',color:'Burgundy',finish:'R10'},{...product,key:'three',color:'Cream',finish:'R10',vrac:false},{...product,key:'legacy',legacy:true}];
 const filters={mode:'box',collection:'Test collection',format:'60x120',color:'Cream',finish:'3D Honed'};
 assert.deepEqual(rows.filter(p=>sampleTileMatches(p,filters)).map(p=>p.key),[product.key]);
 assert.deepEqual(sampleFacetValues(rows,filters,'finish'),['3D Honed','R10']);assert.deepEqual(sampleFacetValues(rows,{...filters,mode:'vrac'},'finish'),['3D Honed']);
 assert(!sampleTileMatches(product,{...filters,query:'not present'}));assert(!sampleTileMatches(product,{...filters,color:'Burgundy'}));assert.deepEqual(sampleFacetValues(rows,filters,'not-a-field'),[]);
});
test('screen, plain-text mail, HTML mail and print use identical surcharge and installation amounts',()=>{
 const q=quote(5,true),html=sampleChargesHTML(q),text=sampleChargesText(q),summary=sampleChargesSummary(q);
 for(const value of [html,text,summary]){assert.match(value,/Taxe énergétique/);assert.match(value,/4,03/);assert.match(value,/160,00/);assert.match(value,/221,63/);assert.match(value,/LE ROY FACTORY/);assert.match(value,/Hors fournitures/);assert.match(value,/support prêt à carreler/);}
 const mail=C.mailHTML({reference:'TEST',title:'Test',account:{societe:'Test'},contact:{name:'Test',email:'test@example.invalid',address:'Address'},quote:q});
 assert.match(mail,/Taxe énergétique/);assert.match(mail,/Je veux la pose/);assert.match(C.mailText({reference:'TEST',account:{societe:'Test'},contact:{name:'Test'},quote:q}),/160,00/);
});
test('print includes quantities, finishes and current contact data but escapes markup and rejects invalid visual URLs',()=>{
 const html=samplePrintDocument({customer:{societe:'<script>alert(1)</script>'},details:{name:'<img src=x onerror=alert(1)>',email:'client@example.invalid',address:'Example address'},quote:quote(5,true),visual:'javascript:alert(1)',title:'Test <b>recap</b>'});
 assert(!html.includes('<script>'));assert(!html.includes('<img src=x'));assert(!html.includes('javascript:'));assert.match(html,/&lt;script&gt;/);assert.match(html,/Example address/);assert.match(html,/3D Honed/);assert.match(html,/TEST001/);assert.match(html,/221,63/);
});
test('the page exposes all requested controls and both quote and prepare carry installation choice',()=>{
 const html=readFileSync(new URL('../echantillons-elios.html',import.meta.url),'utf8'),source=readFileSync(new URL('../assets/js/elios-samples.js',import.meta.url),'utf8'),api=readFileSync(new URL('../functions/elios-samples.js',import.meta.url),'utf8');
 for(const id of ['es-color','es-finish','es-print','es-installation-request'])assert(html.includes('id="'+id+'"'));
 assert.match(html,/Je veux la pose/);assert.match(html,/8 m² inclus/);assert.match(source,/installationRequested:state\.installationRequested===true/g);assert.match(source,/result\.quote\?\.pricingVersion!==PRICING_VERSION/);assert.match(api,/body\.installationRequested\?\?false/);
});
