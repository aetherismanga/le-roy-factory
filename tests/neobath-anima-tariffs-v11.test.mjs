import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync,mkdirSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import * as T from 'three';
import {PRODUCT_BY_ID,TOP_PRODUCTS,BASIN_PRODUCTS,topSelection} from '../functions/neobath-anima/studio-adapter/anima-data.js';
import {publicPrice} from '../functions/neobath-anima/studio-adapter/commerce/catalog.js';
import {quoteProject} from '../functions/neobath-anima/studio-adapter/commerce/pricing.js';
import {atelierQuoteSummary} from '../functions/neobath-anima/studio-adapter/commerce/quote-summary.js';
import {transformAnimaQuoteDisplay} from '../functions/neobath-anima/studio-adapter/quote-display-transform.mjs';
import {standalonePlanSettings} from '../functions/neobath-anima/studio-adapter/standalone-worktop-data.js';
import {planFabricationOperations} from '../functions/neobath-anima/studio-adapter/fabrication-operations.js';

const worktop=settings=>({version:2,items:[{id:'top',type:'worktop',settings,placement:{wall:0,u:150,height:85}}]});

test('Anima linear rates follow the photographed tables on PDF70,71,73,74 and actual custom length exactly once',()=>{
 const rates={TPGEA12:[4.63,5.76],TPGEA120:[6.49,8.65],TXT12:[4.63,5.76],TXT120:[6.49,8.65],TGRS1A:[11.4],TGRS14A:[14.5],THPL1:[5.87],THPL6:[6.48],THPL12:[8],TFX1:[6.38],TFX6:[7.51],TFX12:[9.78]};
 for(const [ref,expected]of Object.entries(rates)){
  const product=TOP_PRODUCTS.find(p=>p.ref===ref);assert.ok(product,ref);assert.equal(product.unit,'cm');assert.deepEqual(product.prices.map(p=>p.price),expected);
  for(const [index,price]of expected.entries())assert.equal(publicPrice(product,product.prices[index].key,147.5),Math.round(price*147.5*120),ref+' at147.5cm publicTTC');
 }
 assert.equal(publicPrice(PRODUCT_BY_ID.get('tfx1-linear-top'),'invented',140),null,'an unknown price variant cannot be priced as the first one');
});

test('the Anima custom quote separates centimetres, the single or double basin supplement and each66HT deck drilling',()=>{
 const single=standalonePlanSettings({width:140},'tpgea12-linear-top','tpgea12-b938-1-basin'),singleQuote=quoteProject(worktop(single));
 assert.deepEqual(singleQuote.rows.map(row=>[row.ref,row.publicTTC]),[['TPGEA12',77784],['B938',67200],['MFR',7920]]);
 const double=standalonePlanSettings({width:180},'tpgea12-linear-top','tpgea12-b855-2-basin'),doubleQuote=quoteProject(worktop(double));
 assert.deepEqual(doubleQuote.rows.map(row=>[row.ref,row.publicTTC]),[['TPGEA12',100008],['B855',206520],['MFR',7920],['MFR',7920]]);
 assert.equal(doubleQuote.rows.filter(row=>row.ref==='B855').length,1,'PDF70 double supplement is a pair, never multiplied again');
 const ncs={...single,topPriceKey:'ncs-matte',basinPriceKey:'ncs-matte',basinColor:'ncs-matte',topSurfaceId:'geacril-ncs',topSurfaceNcs:'S 2010-G10Y'};
 assert.deepEqual(quoteProject(worktop(ncs)).rows.map(row=>[row.ref,row.publicTTC]),[['TPGEA12',96768],['B938',87720],['MFR',7920]]);
 const custom=quoteProject(worktop({...single,topDepth:60}));assert.equal(custom.publicTTC,null);assert.deepEqual(custom.missing.map(row=>row.ref),['TPGEA12']);assert.equal(custom.subtotal,75120);
});

test('a detached Eclisse is billed by its Anima colour and its independent TVL/SUP options without any slab or drilling',()=>{
 for(const key of ['white-matte','fume-matte','bronze-matte']){
  const options=key==='white-matte'?{}:{basinBottom:'tvl',basinSupport:true};
  const q=quoteProject({items:[{id:'bowl',type:'basin-unit',settings:{basinProductId:'eclisse114-countertop-basin',basinPriceKey:key,...options}}]});
  assert.deepEqual(q.rows.map(row=>[row.ref,row.publicTTC]),key==='white-matte'?[['ECLISSE114',59040]]:[['ECLISSE114',64800],['TVL114',22560],['SUP114',12600]]);
  assert.ok(!q.rows.some(row=>/^TP|TFX|MFR/.test(row.ref)));assert.equal(q.missing.length,0);
 }
});

test('the live amount distinguishes a source-unpriced item from excluded equipment and keeps the valued subtotal visible',()=>{
 const q={publicTTC:null,subtotal:142500,missing:[{name:'Structure Bridge60 ×35',ref:'À confirmer'},{name:'Plan Fenix',ref:'TFX1'}],excluded:[{type:'attached-tap'},{type:'attached-tap'}]};
 const summary=atelierQuoteSummary(q);assert.match(summary.totalText,/1.?425,00/);assert.match(summary.totalText,/sous-total/);assert.match(summary.detailsText,/Sur devis : Structure Bridge60 ×35, TFX1/);assert.match(summary.detailsText,/2 équipements hors montant mobilier/);assert.ok(!summary.detailsText.includes('2 élément(s) sans tarif'));
 const source=readFileSync('studio-one/src/commerce/atelier.js','utf8'),adapted=transformAnimaQuoteDisplay(source,'commerce/atelier.js');
 assert.equal((adapted.match(/const summary=__animaQuoteSummary\(q\)/g)||[]).length,2,'identity changes and live project changes use the same explanation');
});

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),adapter=join(root,'functions/neobath-anima/studio-adapter');
mkdirSync(join(root,'node_modules/.cache'),{recursive:true});const dir=mkdtempSync(join(root,'node_modules/.cache/anima-tariffs-'));
await build({stdin:{contents:`export {buildAnimaTop} from ${JSON.stringify(join(adapter,'tops.js'))};`,resolveDir:root,loader:'js'},outfile:join(dir,'tops.mjs'),bundle:true,format:'esm',platform:'node',packages:'external',plugins:[{name:'anima-source-top',setup(b){b.onResolve({filter:/^@studio-one-original\//},a=>({path:join(root,'studio-one/src',a.path.slice('@studio-one-original/'.length))}));}}]});
const M=await import(pathToFileURL(join(dir,'tops.mjs')).href);after(()=>rmSync(dir,{recursive:true,force:true}));

test('the pure tariff operation count matches real rendered custom deckholes across every basin family',()=>{
 const ceramic=new T.MeshStandardMaterial(),wood=new T.MeshStandardMaterial(),chrome=new T.MeshStandardMaterial();let checked=0,basinLedge=0;
 try{for(const basin of BASIN_PRODUCTS){
  let selection;
  for(const planId of basin.compatibleTopIds||[])for(const length of[80,100,120,160,180,240]){const value=topSelection(basin.id,Math.min(60,length),'two','center',length,planId,length);if(value?.top.configurableWidth){selection=value;break;}if(selection)break;}
  if(!selection)continue;
  const asset=M.buildAnimaTop({selection,ceramic,wood,chrome}),meta=asset.root.userData.animaTop,actual=meta.tapHoles.filter(hole=>hole.mount!=='basin').length;
  const count=planFabricationOperations(selection).reduce((sum,operation)=>sum+operation.quantity,0);
  assert.equal(count,actual,basin.ref+' actual slab tap hole count');if(meta.tapMount==='basin'){basinLedge++;assert.equal(count,0,'the Eclisse rear ledge is part of the basin');}
  asset.dispose();checked++;
 }}finally{ceramic.dispose();wood.dispose();chrome.dispose();}
 assert.ok(checked>=55,'all sourcebasin families sampled, got'+checked);assert.equal(basinLedge,1);
 const fixed=topSelection('tk80-integrated-top',80,'two');assert.deepEqual(planFabricationOperations(fixed),[],'factory plan holes are not charged as custom fabrications');
});
