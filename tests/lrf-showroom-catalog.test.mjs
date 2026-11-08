import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {SHOWROOM_MANUFACTURERS,SHOWROOM_COLLECTIONS,showroomAssetURL,showroomManufacturer} from '../shared/lrf-3d/showroom-catalog.js';

test('the hall covers every current LRF partner and retains the large public selections',()=>{
 const ids=['elios-ceramica','view-ceramica','la-fenice','life-ceramica','reviglass','biopietra','petracers','pecchioli-firenze','bulbo','randal-pro','neobath','koibath','aquahome','reitano-rubinetterie','uptrend','opal','bilt'];
 assert.deepEqual(SHOWROOM_MANUFACTURERS.map(manufacturer=>manufacturer.id),ids);
 assert.equal(showroomManufacturer('biopietra').collections.length,160);
 assert.equal(showroomManufacturer('bulbo').collections.length,99);
 assert.equal(showroomManufacturer('pecchioli-firenze').collections.length,149);
 assert.ok(showroomManufacturer('petracers').collections.some(collection=>collection.id==='petracer-bain-cuore-di-roccia-console'));
 assert.ok(showroomManufacturer('elios-ceramica').collections.some(collection=>collection.id==='elios-segmento'));
 assert.equal(new Set(SHOWROOM_COLLECTIONS.map(collection=>collection.id)).size,SHOWROOM_COLLECTIONS.length);
});

test('every exhibition photograph, preview and LRF destination exists in the published source',()=>{
 const root=new URL('..',import.meta.url);
 const paths=new Set(execFileSync('git',['ls-tree','-r','--name-only','HEAD'],{cwd:root,encoding:'utf8',maxBuffer:16_000_000}).trim().split('\n'));
 for(const collection of SHOWROOM_COLLECTIONS){
  assert.ok(collection.name&&collection.image&&collection.href,collection.id);
  for(const key of ['image','preview','href']){
   const url=new URL(collection[key]);
   assert.equal(url.protocol,'https:',collection.id+' '+key);
   if(url.hostname==='leroyfactory.fr')assert.ok(paths.has(decodeURIComponent(url.pathname.slice(1))),collection.id+' '+url.pathname);
  }
 }
 assert.equal(showroomAssetURL('javascript:alert(1)'), '');
 assert.equal(showroomAssetURL('data:image/png;base64,x'), '');
});

test('native catalogue links use parameters their existing readers actually support',()=>{
 for(const collection of showroomManufacturer('randal-pro').collections)assert.equal(new URL(collection.href).searchParams.get('collection'),collection.name);
 for(const collection of showroomManufacturer('koibath').collections)assert.equal(new URL(collection.href).searchParams.get('collection'),collection.name);
 for(const collection of showroomManufacturer('aquahome').collections)assert.match(new URL(collection.href).searchParams.get('ref'),/^\d+$/);
 for(const collection of showroomManufacturer('reitano-rubinetterie').collections)assert.match(new URL(collection.href).hash,/^#page=\d+$/);
 const furniture=SHOWROOM_COLLECTIONS.find(collection=>collection.id==='petracer-bain-cuore-di-roccia-console');
 assert.equal(new URL(furniture.href).searchParams.get('category'),'meubles');
});

test('the visual hall index has no commercial or customer fields and labels catalogue-only panels',()=>{
 function inspect(value){
  if(!value||typeof value!=='object')return;
  for(const [key,child] of Object.entries(value)){
   assert.doesNotMatch(key,/price|prix|tariff|tarif|purchase|achat|discount|remise|margin|marge|customer|client|token|email/i);
   inspect(child);
  }
 }
 inspect(SHOWROOM_MANUFACTURERS);
 assert.ok(Object.isFrozen(SHOWROOM_MANUFACTURERS));
 assert.ok(Object.isFrozen(SHOWROOM_MANUFACTURERS[0].collections));
 assert.equal(showroomManufacturer('life-ceramica').collections[0].imageKind,'catalogue');
 assert.equal(showroomManufacturer('life-ceramica').collections[0].name,'Catalogue Life Cerámica');
 assert.equal(showroomManufacturer('unknown'),null);
});
