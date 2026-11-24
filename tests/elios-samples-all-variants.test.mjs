import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {sampleTileMatches,sampleFacetValues,sampleVariantValue} from '../assets/js/elios-samples-options.mjs';
const require=createRequire(import.meta.url),C=require('../functions/elios-samples-core.cjs');
const catalogue=JSON.parse(readFileSync(new URL('../assets/data/elios-samples.json',import.meta.url)));
test('browser and server use the same exact V9 SKU mapping and accept one or two labeled pieces',()=>{
 const mapping=JSON.parse(readFileSync(new URL('../tools/elios-samples-v9/rubiera.json',import.meta.url)));
 const eligible=catalogue.products.filter(p=>p.vrac);
 const reviewed=Object.values(mapping.rows).flatMap(row=>[...row.fonds,...row.decors]).sort();
 assert.deepEqual(eligible.map(p=>p.reference).sort(),reviewed);
 assert(eligible.length>350);
 for(const product of eligible){
  assert.equal(product.sampleOffer,'offered');
  assert(sampleTileMatches(product,{mode:'vrac',collection:product.collection,format:product.format,color:product.color,finish:product.finish,slip:sampleVariantValue(product,'slip'),thickness:sampleVariantValue(product,'thickness')}));
  for(const quantity of [1,2]){
   const line=C.buildQuote([{type:'vrac',key:product.key,quantity}],catalogue).rows[0];
   assert.equal(line.reference,product.reference);assert.equal(line.quantity,quantity);assert.equal(line.label,true);
  }
 }
 assert.deepEqual(JSON.parse(readFileSync(new URL('../functions/elios-samples-catalogue.json',import.meta.url))),catalogue);
});
test('Brooklyn separates R10, thin R11 and 20 mm R11 in their real colours',()=>{
 const select=filters=>catalogue.products.filter(p=>sampleTileMatches(p,{mode:'box',collection:'Brooklyn',...filters}));
 assert.equal(select({format:'100x100',slip:'R10',thickness:'8,5 mm'}).length,7);
 assert.deepEqual(select({format:'100x100',slip:'R11',thickness:'20 mm'}).map(p=>p.reference).sort(),['00K1210','00K1240','00K1250','00K1260','00K1280','00K1290']);
 assert.deepEqual(select({format:'100x100',slip:'R11',thickness:'8,5 mm'}).map(p=>p.reference).sort(),['00K1X41','00K1X61']);
 assert.equal(select({format:'60x60',slip:'R11'}).length,0);
 assert.deepEqual(sampleFacetValues(catalogue.products,{mode:'box',collection:'Brooklyn',format:'100x100',slip:'R11',thickness:'20 mm'},'slip'),['R10','R11']);
});
test('Shell authorizes only the three verified R11 colours at 60x60 and excludes the other dimensions',()=>{
 const filters={mode:'vrac',collection:'Shell',format:'60x60',slip:'R11'};
 const select=extra=>catalogue.products.filter(p=>sampleTileMatches(p,{...filters,...extra}));
 assert.deepEqual(select({thickness:'8,5 mm'}).map(p=>p.color),['Ivory Light','Beige Light','Grey Light']);
 assert.equal(select({slip:'R10'}).length,6);
 assert.equal(select({thickness:'10 mm'}).length,0);
 assert.equal(select({format:'60x120',slip:''}).length,0);
});
test('Creta decor, Mysterium and Stone Icon keep their exact finish and thickness',()=>{
 const select=(collection,format)=>catalogue.products.filter(p=>p.vrac&&p.collection===collection&&p.format===format);
 assert.deepEqual(select('Creta','60x120').map(p=>p.reference).sort(),['03V6AD0','03V6AD1','03V6AD4','03V6AD5','03V6ADC','03V6ADF']);
 assert.deepEqual(select('Creta','60x60').map(p=>p.color).sort(),['Avena','Biscotto','Caramello','Ginepro','Malto','Matcha','Pepe','Zucchero']);
 assert.equal(catalogue.rules.find(rule=>rule.row===10).references,6);
 assert(select('Creta','60x120').every(p=>p.sampleV9.category==='decors'&&p.finish.startsWith('R9')));
 assert.equal(select('Mysterium','60x120').length,6);
 assert(select('Mysterium','60x120').every(p=>sampleVariantValue(p,'thickness')==='8,5 mm'));
 assert.deepEqual(['60x60','60x120','60x90'].map(format=>select('Stone Icon',format).map(p=>sampleVariantValue(p,'slip'))),[['R10','R10','R10'],['R9','R9','R9'],['R10','R10','R10']]);
 assert(select('Stone Icon','60x90').every(p=>p.finish.startsWith('Tumbled')));
 assert(!catalogue.products.some(p=>p.vrac&&p.collection==='Terraforma'));
});
test('an excluded SKU cannot be requested by the piece and remains orderable by whole boxes',()=>{
 const p=catalogue.products.find(p=>p.reference==='00K1280');
 assert.equal(p.vrac,false);
 assert.throws(()=>C.buildQuote([{type:'vrac',key:p.key,quantity:1,sampleOffer:'offered',factoryApproved:true}],catalogue),/programme V9/);
 const line=C.buildQuote([{type:'box',key:p.key,quantity:1e-10}],catalogue).rows[0];
 assert.equal(line.boxes,1);assert.equal(line.quantity,p.packArea);
});
test('Cersaie panels have exact IDs and the duplicated manufacturer code cannot be ordered',()=>{
 const panels=catalogue.merchandising.filter(p=>['ESTI14','ESTI15'].includes(p.reference));
 assert.equal(panels.length,2);assert(panels.every(p=>p.description.includes('Terraforma')&&p.dimensions==='100 × 200 cm'));
 assert.equal(catalogue.cersaieSupplement.pages,22);
 const original=readFileSync(new URL('../'+catalogue.cersaieSupplement.path,import.meta.url));
 const source=catalogue.sources.find(s=>s.file==='Elios_Merchandising_2026 news nov .pdf');
 assert.equal(createHash('sha256').update(original).digest('hex'),source.sha256);
 for(const page of ['echantillons-elios.html','merchandising-usines.html']){
  const html=readFileSync(new URL('../'+page,import.meta.url),'utf8');
  assert.equal(html.split(catalogue.cersaieSupplement.path).length,2);
 }
 assert.throws(()=>C.buildQuote([{type:'merchandising',key:'ESTI06',quantity:1}],catalogue),/confirmer/);
 assert.equal(new Set(catalogue.merchandising.map(p=>p.id)).size,catalogue.merchandising.length);
});
