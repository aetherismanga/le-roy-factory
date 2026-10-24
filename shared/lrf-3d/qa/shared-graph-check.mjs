import assert from 'node:assert/strict';
import {readFile,realpath} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,relative,sep} from 'node:path';
import {build} from 'esbuild';

// This check follows both real build graphs. Equal filenames alone do not
// establish that the shipped applications consume the same implementation.
const suiteRoot=fileURLToPath(new URL('../../../',import.meta.url));
const sharedRoot=await realpath(new URL('../',import.meta.url));
const studioSource=process.env.LRF_STUDIO_SOURCE?resolve(process.env.LRF_STUDIO_SOURCE):resolve(suiteRoot,'studio-one/src');
const generalSource=resolve(suiteRoot,'randal-general/src');
const modules=['performance.js','hd-capture.js','mirror-reflection.js','ultra-rendering.js','tile-layout.js','plinth-math.mjs','plinth-ui.mjs','surface-catalog.js','surface-picker.js','surface-quality.js','surface-texture-selection.js','tile-colors.js','quantities.js','openings.js','room-editor.js'];
for(const name of modules){
 const target=pathToFileURL(resolve(sharedRoot,name));
 const canonical=await import(target);
 for(const sourceRoot of [studioSource,generalSource]){
  const wrapper=resolve(sourceRoot,name),text=await readFile(wrapper,'utf8');
  assert.match(text,new RegExp(`export \\* from ['"]\\.\\./\\.\\./shared/lrf-3d/${name.replaceAll('.','\\.')}['"]`),'Explicit shared compatibility path: '+wrapper);
  const app=await import(pathToFileURL(wrapper));
  assert.deepEqual(Object.keys(app),Object.keys(canonical),'Shared export contract: '+wrapper);
  for(const key of Object.keys(canonical))assert.equal(app[key],canonical[key],'Single implementation identity: '+name+'/'+key);
 }
}

for(const sourceRoot of [studioSource,generalSource]){
 for(const name of ['room.js','renovation.js']){
  const text=await readFile(resolve(sourceRoot,name),'utf8');
  assert(text.includes('../../shared/lrf-3d/'+name),'Explicit shared interaction adapter: '+name);
  assert(!/pointerdown|createElement|function cutWall/.test(text),'Interaction implementation is not copied into '+name);
 }
}

const graphs=await Promise.all([studioSource,generalSource].map(sourceRoot=>build({
 absWorkingDir:suiteRoot,entryPoints:[resolve(sourceRoot,'app.js'),resolve(sourceRoot,'commerce/home.js')],
 bundle:true,splitting:true,format:'esm',target:['es2020'],write:false,outdir:resolve(suiteRoot,'.qa-shared-graph-output'),metafile:true,logLevel:'silent'
})));
const catalogueFiles=['manufacturer-surfaces.json','commercial-surfaces.json'];
const realInputs=new Set();
for(const graph of graphs){
 const inputs=await Promise.all(Object.keys(graph.metafile.inputs).map(path=>realpath(resolve(suiteRoot,path))));
 for(const input of inputs)realInputs.add(input);
 for(const name of catalogueFiles){
  const found=inputs.filter(path=>path.endsWith(sep+name));
  assert.deepEqual(found,[resolve(sharedRoot,name)],'Exactly one canonical '+name+' per application build');
 }
 for(const name of [...modules,'room.js','renovation.js']){
  assert(inputs.includes(resolve(sharedRoot,name)),'Application build reaches shared '+name);
 }
}

const manufacturer=JSON.parse(await readFile(resolve(sharedRoot,'manufacturer-surfaces.json'),'utf8'));
const commercial=JSON.parse(await readFile(resolve(sharedRoot,'commercial-surfaces.json'),'utf8'));
const contract=JSON.parse(await readFile(resolve(sharedRoot,'surface-contract.json'),'utf8'));
const contractModule=(await import(pathToFileURL(resolve(sharedRoot,'surface-contract.mjs')))).default;
assert.deepEqual(contractModule,contract,'Browser-compatible generated contract matches canonical JSON');
const privateKeys=new Set(['purchaseHT','purchasePaletteHT','totalPurchaseHT','unitPriceHT','proHT']);
function verifyPublic(value,path='catalogue'){
 if(!value||typeof value!=='object')return;
 for(const [key,item]of Object.entries(value)){
  assert(!privateKeys.has(key)||!Number.isFinite(item),'No numeric private purchase price in '+path+'/'+key);
  if(item&&typeof item==='object')verifyPublic(item,path+'/'+key);
 }
}
for(const [name,data]of Object.entries({manufacturer,commercial,contract}))verifyPublic(data,name);
console.log(JSON.stringify({passed:true,sharedModulesChecked:modules.length,canonicalCatalogueInputs:catalogueFiles,sharedGraphInputs:[...realInputs].filter(path=>path.startsWith(sharedRoot+sep)).map(path=>relative(suiteRoot,path)),contractCollections:Object.keys(contract.collections||{}).length,checks:['single implementation through source compatibility paths','both actual esbuild entry graphs use canonical catalogues','generated browser contract parity','no numeric purchase-price fields in public catalogue contracts']},null,2));
