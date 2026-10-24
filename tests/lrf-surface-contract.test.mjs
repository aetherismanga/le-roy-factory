import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {canonicalSurfaceIdentity,normalizeProjectSurfaceIdentities,commercialSurfaceProduct} from '../shared/lrf-3d/surface-identity.mjs';
import {COLLECTIONS as generalCollections} from '../randal-general/src/surface-catalog.js';
import {availableColors as generalColors} from '../randal-general/src/surface-picker.js';
import {resolveSurfaceTexture as generalTexture} from '../randal-general/src/surface-texture-selection.js';
import {applyTileColors as generalTileColors} from '../randal-general/src/tile-colors.js';
import {runTextureTask,textureQueueState} from '../shared/lrf-3d/texture-queue.mjs';
const products=JSON.parse(readFileSync(new URL('../shared/lrf-3d/commercial-surfaces.json',import.meta.url))).products;

test('the former missing colours share one usable catalogue without pretending limited samples are HD',()=>{
 for(const [name,count]of Object.entries({Slate:6,'Azuli Mood':11,Allure:9,Venere:6,COCO:2,Creta:8,Quercia:4,Corso:2,'Golden Stone':5}))assert.equal(generalColors(name).length,count,name);
 for(const name of ['Slate','Venere','COCO'])for(const color of generalColors(name))assert.equal(color.definitionLimited,true);
 const chalk=generalTexture('Azuli Mood','chalk','max');assert(chalk.files[0].endsWith('azuli-mood-chalk-native.jpg'));assert(!chalk.files[0].includes('-fluid.'));
 for(const color of ['fenix-blueberry','fenix-juniper','eden','safari']){assert(generalCollections.Allure.colors.find(item=>item.id===color).continuousDecor);assert.equal(generalTexture('Allure',color,'max').rotation,-90);}
});

test('Sedimenti selected/tumbled retain the exact SKU and finish after render-colour migration',()=>{
 const rows=products.filter(product=>product.collection==='Sedimenti'&&/selected|tumbled/.test(product.colorId));assert(rows.length>60);
 for(const row of rows){
  const identity=canonicalSurfaceIdentity(row,{products});
  assert.equal(identity.sourceColorId,row.colorId);assert.equal(identity.color,row.colorId.replace(/selected|tumbled/,''));assert.equal(identity.reference,row.reference);assert.equal(identity.finish,row.finish);assert.equal(identity.catalogueKey,row.key);assert.equal(identity.fidelity,'color-preview');
  assert.equal(commercialSurfaceProduct(identity,products).key,row.key);
 }
 const project=normalizeProjectSurfaceIdentities({floor:{collection:'Sedimenti',color:'greyselected',catalogueKey:'ELIOS|LF1314',format:'120x278'},layouts:{floor:{width:2.78,height:1.2}},walls:[]});
 assert.equal(project.floor.color,'grey');assert.equal(project.floor.catalogueKey,'ELIOS|LF1314');assert.equal(project.surfaceNotices.length,1);
 assert.throws(()=>normalizeProjectSurfaceIdentities({floor:{collection:'Sedimenti',color:'not-a-real-colour'},walls:[]}),/Aucun autre coloris/);
});

test('a SKU cannot silently borrow another colour, format or private price',()=>{
 const product=products.find(item=>item.collection==='Quercia'&&item.reference==='00Y2C00');assert(product);
 assert.throws(()=>canonicalSurfaceIdentity({...product,colorId:'honey'},{products}),/coloris ne correspond/);
 assert.throws(()=>canonicalSurfaceIdentity({...product,format:'60x60'},{products}),/format.*ne correspondent/);
 for(const item of products)assert(!Object.keys(item).some(key=>/^purchase/.test(key)||key==='publicPriceHT'));
});

test('the shared queue bounds real simultaneous tasks and recovers after rejection',async()=>{
 let active=0,peak=0;
 const jobs=Array.from({length:17},(_,index)=>runTextureTask(async()=>{active++;peak=Math.max(peak,active);try{await new Promise(resolve=>setTimeout(resolve,2));if(index===4)throw Error('network failure');return index;}finally{active--;}}));
 const results=await Promise.allSettled(jobs);assert.equal(peak,3);assert.equal(results.filter(result=>result.status==='rejected').length,1);assert.equal(textureQueueState().active,0);assert.equal(textureQueueState().pending,0);
});

test('both legacy 3D import paths resolve the same material implementation',async()=>{
 const canonical=new URL('../studio-one/src/',import.meta.url),studioRoot=existsSync(canonical)?canonical:new URL('../../studio/src/',import.meta.url);
 const studio=await import(new URL('surface-catalog.js',studioRoot));
 const studioPicker=await import(new URL('surface-picker.js',studioRoot));
 const studioTiles=await import(new URL('tile-colors.js',studioRoot));
 assert.equal(studio.COLLECTIONS,generalCollections);assert.equal(studioPicker.availableColors,generalColors);assert.equal(studioTiles.applyTileColors,generalTileColors);
});
