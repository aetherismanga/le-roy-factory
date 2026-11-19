import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {extractPriceColumns,readSaxsoNetPrices} from '../assets/js/saxso-net-prices.mjs';
const catalogue=JSON.parse(readFileSync(new URL('../assets/data/saxso-catalogue.json',import.meta.url)));
const index=JSON.parse(readFileSync(new URL('../assets/data/saxso-net-index.json',import.meta.url)));
const pages=[18,15,20].map(count=>Array.from({length:count},(_,i)=>({str:(100+i)+',25',transform:[1,0,0,1,491,700-i*20]})).reverse());
test('price extraction uses only the rightmost column in visual row order and refuses incomplete sources',()=>{
 const source=pages.map(p=>[...p,{str:'99,99',transform:[1,0,0,1,400,750]}]);
 const values=extractPriceColumns(source);
 assert.deepEqual(values.map(p=>p.length),[18,15,20]);
 assert.equal(values[0][0],100.25);assert.equal(values[2][19],119.25);
 assert.throws(()=>extractPriceColumns(source.slice(0,2)));
 assert.throws(()=>extractPriceColumns([source[0].slice(1),...source.slice(1)]));
});
test('private source authorization and document identity are required before a price is returned',async()=>{
 let extracted=false;
 await assert.rejects(readSaxsoNetPrices(index,{requestBlob:async()=>{throw Error('Forbidden');},extractText:async()=>{extracted=true;return pages;}}),/Forbidden/);
 assert.equal(extracted,false);
 await assert.rejects(readSaxsoNetPrices(index,{requestBlob:async()=>new Blob(['changed document']),extractText:async()=>{extracted=true;return pages;}}),/grille SAXSO a changé/);
 assert.equal(extracted,false);
 const blob=new Blob(['synthetic PDF for integration']),hash=createHash('sha256').update(Buffer.from(await blob.arrayBuffer())).digest('hex');
 const result=await readSaxsoNetPrices({...index,documentSha256:hash},{requestBlob:async()=>blob,extractText:async()=>pages});
 assert.equal(result.rows.length,53);assert.equal(result.byVariant.size,27);
 for(const row of result.rows)for(const id of row.variantIds){assert.equal(result.byVariant.get(id),row);assert.equal(row.amount,100.25+row.index);}
});
test('only exact format, finish and unit matches receive prices; the public index contains no amounts',()=>{
 const variants=new Map(catalogue.collections.flatMap(c=>c.variants.map(v=>[v.id,v])));
 const ids=index.rows.flatMap(row=>row.variantIds);assert.equal(new Set(ids).size,27);
 for(const row of index.rows){
  assert.deepEqual(Object.keys(row).sort(),['index','label','page','unit','variantIds']);
  for(const id of row.variantIds){assert.ok(variants.has(id));assert.equal(variants.get(id).unit,row.unit);}
 }
 assert.equal(variants.size-ids.length,698);
 assert.ok(!ids.includes('saxso-35-734-428-sakkara-grey-sabbiato-spazzolato-40x60-sp-2-cm'),'a different finish is not priced');
 assert.ok(!ids.includes('saxso-124-679-471-cg001-quarzite-mista-muretto-15x60-sp-1-5-3-cm'),'15x60 must not receive the price for 15x55');
 assert.ok(!ids.includes('saxso-21-719-444-luserna-losette-opus-incertum-sp-2-5-4-5-cm'),'different thickness and tonne unit must not receive a per m² price');
});
