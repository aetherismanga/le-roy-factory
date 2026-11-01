import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {packagingLookup,packagingOptions,formatsForKind,convertQuantity,normalisePackagingFormat} from '../assets/js/fenice-packaging.mjs';
const data=JSON.parse(readFileSync(new URL('../assets/data/fenice-packaging.json',import.meta.url),'utf8'));
const find=(collectionSlug,kind,format,extra={})=>packagingLookup(data,{collectionSlug,kind,format,...extra});
const known=(...args)=>{const x=find(...args);assert.equal(x.status,'known');return x.packaging;};

test('Heritage 58 m² rounds to 41 manufacturer boxes and keeps the original requested quantity',()=>{
 const p=known('heritage','tile','60x60');assert.equal(p.source.page,52);assert.equal(p.piecesPerBox,4);assert.equal(p.areaPerBox,1.44);
 const c=convertQuantity(p,58,'m²');assert.equal(c.status,'known');assert.equal(c.boxes,41);assert.equal(c.quantity,59.04);assert.equal(c.unit,'m²');assert.equal(c.pieces,164);assert.equal(c.requestedQuantity,58);assert.equal(c.excess,1.04);
});
test('Heritage skirtings use their own carton counts, never the 60x60 tile box',()=>{
 const short=convertQuantity(known('heritage','plinth','7.5x30'),58,'ml');assert.equal(short.boxes,33);assert.equal(short.quantity,59.4);assert.equal(short.pieces,198);
 const long=convertQuantity(known('heritage','plinth','7,5x60'),58,'ml');assert.equal(long.boxes,10);assert.equal(long.quantity,60);assert.equal(long.pieces,100);
 assert.deepEqual(new Set(formatsForKind(data,'heritage','plinth').map(normalisePackagingFormat)),new Set(['7.5x30','7.5x60']));
});
test('Wall Rock keeps declared 1.45 m² instead of replacing it by nominal tile geometry',()=>{
 const p=known('wall-rock','tile','40x60');assert.equal(p.areaPerBox,1.45);const c=convertQuantity(p,58,'m²');assert.equal(c.boxes,40);assert.equal(c.quantity,58);assert.equal(c.pieces,240);
});
test('Living Wall packaging differs from the other 20x60 wall collections',()=>{
 const p=known('living-wall','tile','20x60');assert.equal(p.piecesPerBox,12);assert.equal(p.areaPerBox,1.44);
 const c=convertQuantity(p,58,'m²');assert.equal(c.boxes,41);assert.equal(c.quantity,59.04);assert.equal(c.pieces,492);
 assert.equal(known('emotion','tile','20x60').areaPerBox,1.08);
});
test('Bianchi 30x90 requires an explicit standard/decor carton selection',()=>{
 const initial=find('bianchi','tile','30x90');assert.equal(initial.status,'ambiguous');
 const options=packagingOptions(data,'bianchi','tile','30x90');
 const standard=options.find(p=>p.variant==='standard');const decor=options.find(p=>p.variant==='decor');assert.ok(standard&&decor);
 const s=convertQuantity(known('bianchi','tile','30x90',{packagingId:standard.id}),58,'m²');assert.equal(s.boxes,43);assert.equal(s.quantity,58.05);assert.equal(s.pieces,215);
 const d=convertQuantity(known('bianchi','tile','30x90',{packagingId:decor.id}),58,'m²');assert.equal(d.boxes,54);assert.equal(d.quantity,58.32);assert.equal(d.pieces,216);
 assert.equal(find('heritage','tile','60x60',{packagingId:standard.id}).status,'unknown');
});
test('Statuario 80 cm skirting is rounded in linear metres per carton',()=>{
 const p=known('statuario','plinth','7.5x80');assert.equal(p.linearMetresPerBox,8);const c=convertQuantity(p,58,'ml');assert.equal(c.boxes,8);assert.equal(c.quantity,64);assert.equal(c.pieces,80);
});
test('exact decimal box boundaries do not add a spurious box',()=>{
 const p=known('heritage','tile','60x60');for(const boxes of [1,3,7,19,100])assert.equal(convertQuantity(p,boxes*1.44,'m²').boxes,boxes);
 assert.equal(convertQuantity(p,4.3200001,'m²').boxes,4);
 assert.equal(convertQuantity(p,Number.MIN_VALUE,'m²').boxes,1);
});
test('pieces, cartons and French decimal input are supported without fractional cartons',()=>{
 const p=known('heritage','tile','60x60');assert.equal(convertQuantity(p,5,'pièces').boxes,2);assert.equal(convertQuantity(p,3,'boîtes').quantity,4.32);assert.equal(convertQuantity(p,'4,32','m²').boxes,3);
 for(const value of [0,-1,'',NaN,Infinity,'10abc'])assert.equal(convertQuantity(p,value,'m²').status,'invalid');
 assert.equal(convertQuantity(p,2.5,'boîtes').status,'invalid');assert.equal(convertQuantity(p,1.5,'pièces').status,'invalid');assert.equal(convertQuantity(p,4,'ml').status,'unsupported');
});
test('unknown, composite and contradictory formats never receive an inferred carton size',()=>{
 assert.equal(find('not-a-collection','tile','60x60').status,'unknown');assert.equal(find('heritage','tile','30x30 + 5x5').status,'unknown');
 assert.equal(find('oykos-fossil','tile','30x60').status,'unknown');
 assert.equal(find('meco','tile','30x30').status,'unknown');assert.equal(find('steel-art','tile','60x60').status,'unknown');
 const p=known('heritage','tile','60x60');assert.equal(convertQuantity({...p,confirmationRequired:true},20,'m²').status,'unknown');
});
test('colour restrictions and different thickness cartons cannot silently borrow the first variant',()=>{
 const base=known('heritage','tile','60x60');
 const fixture={entries:[{...base,id:'thin',collectionSlug:'sample',thicknessMm:9,colors:['White'],areaPerBox:1.44},{...base,id:'thick',collectionSlug:'sample',thicknessMm:20,colors:['Black'],piecesPerBox:2,areaPerBox:.72}]};
 assert.equal(packagingLookup(fixture,{collectionSlug:'sample',kind:'tile',format:'60x60',color:'Grey'}).status,'unknown');
 assert.equal(packagingLookup(fixture,{collectionSlug:'sample',kind:'tile',format:'60x60'}).status,'ambiguous');
 const p=packagingLookup(fixture,{collectionSlug:'sample',kind:'tile',format:'60x60',color:'Black',thicknessMm:20});assert.equal(p.status,'known');assert.equal(p.packaging.id,'thick');
});
test('every published conditionnement has a manufacturer source and no tariff field',()=>{
 assert.equal(data.schema,'lrf-fenice-packaging');assert.equal(data.entries.length,new Set(data.entries.map(r=>r.id)).size);
 const walk=x=>{if(!x||typeof x!=='object')return;for(const [key,value]of Object.entries(x)){assert.doesNotMatch(key,/^(?:price|amount|proPrice|purchaseHT|tarifHT)$/i);walk(value);}};walk(data);
 for(const row of data.entries){assert.match(row.source.url,/^https:\/\/lafenicegc\.com\//);assert.ok(Number.isSafeInteger(row.source.page)&&row.source.page>0);assert.ok(Number.isSafeInteger(row.piecesPerBox)&&row.piecesPerBox>0);if(!row.confirmationRequired)assert.equal(convertQuantity(row,1,row.kind==='plinth'?'ml':'m²').status,'known',row.id);}
});
