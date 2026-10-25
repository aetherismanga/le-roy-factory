/**
 * Reproducible restore regression check using the existing real-controller QA
 * fixture. Geometry, project migration and material grouping are production
 * code. The DOM and renderer are doubles; the measured texture loader returns
 * synthetic THREE.Texture objects, with no image download/decoding or WebGL.
 * Frame callbacks are flushed explicitly by prepareActiveTextures()/batch.flush.
 * Times are informational only. Assertions cover preserved data and bounded
 * work, never timing thresholds. This does not measure a real browser or GPU.
 *
 * Current source (asserts the optimized work bounds):
 *   node qa/restore-performance-check.mjs
 * Reference source (compares counts; skips optimized-work assertions):
 *   node qa/restore-performance-check.mjs --source /tmp/lrf-studio-baseline-app.js
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,dirname} from 'node:path';

const studioRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const fixtureURL=new URL('./controls-check.mjs',import.meta.url);
const args=process.argv.slice(2),sourceIndex=args.indexOf('--source');
assert(args.every((arg,index)=>arg==='--source'||index===sourceIndex+1),'Only --source <app.js> is supported.');
assert(sourceIndex<0||args[sourceIndex+1],'--source requires an app.js path.');
const customSource=sourceIndex>=0,sourcePath=customSource?resolve(args[sourceIndex+1]):resolve(studioRoot,'src/app.js');
const originalCwd=process.cwd();
process.chdir(studioRoot);
try{
 const fixture=readFileSync(fixtureURL,'utf8');
 const marker="assert(vm.runInContext('restoreProject(collectProject())',context)";
 const boundary=fixture.indexOf(marker);assert(boundary>=0,'The controller fixture restore boundary changed; update this benchmark explicitly.');
 // Reuse its mature DOM double and its validated six-item/four-wall project,
 // stopping before its first restore assertion or report-file writes.
 let code=fixture.slice(0,boundary)
  .replace(/(^import\s+.*?\s+from\s+['"])(\.\.?\/[^'"]+)(['"];?)/gm,(_,before,specifier,after)=>before+new URL(specifier,fixtureURL).href+after)
  .replaceAll('import.meta.url',JSON.stringify(fixtureURL.href))
  .replace("readFileSync('dist/atelier.html'","readFileSync('src/atelier.html'")
  .replace("readFileSync('src/app.js'",'readFileSync('+JSON.stringify(sourcePath));
 code+=`\n
await Promise.allSettled(vm.runInContext('[...textureFlights.values()]',context));
context.loaderCalls=0;
context.loadQueuedTexture=()=>{context.loaderCalls++;return Promise.resolve(new T.Texture({width:1122,height:175}));};
const measured={};context.__restorePerfCounts=measured;
const tracked=['applyAllRoomMaterials','applySurfaceTileColors','renderComposition','refreshProfiles','refreshLayouts','refreshQuantities','refreshPlinths','refreshWorkingTextures','prepareActiveTextures','requestSurfaceAssets','requestFinishAssets','invalidate','fitCompositionLights','selectItem'];
for(const name of tracked)vm.runInContext('(()=>{const old='+name+';'+name+'=function(...args){__restorePerfCounts["'+name+'"]=(__restorePerfCounts["'+name+'"]||0)+1;return old(...args);};})()',context);
const oldTiles=context.applyTileColors;
context.applyTileColors=(...args)=>{measured.tileFacesVisited=(measured.tileFacesVisited||0)+(args[0].tiles.geometry.userData.sourceFaceCells||args[0].tiles.geometry.userData.faceCells||[]).length;return oldTiles(...args);};
const oldRoom=context.makeRoom;
context.makeRoom=(...args)=>{measured.makeRoom=(measured.makeRoom||0)+1;const room=oldRoom(...args),oldOpenings=room.setOpenings;room.setOpenings=(...items)=>{measured.setOpenings=(measured.setOpenings||0)+1;return oldOpenings.apply(room,items);};return room;};
const plain=value=>JSON.parse(JSON.stringify(value));
const definitionBefore=JSON.stringify(COLLECTIONS.Yosemite);
const optimized=${JSON.stringify(!customSource)},results=[];
function assertConserved(expected,actual){
 assert.deepEqual(actual.room,expected.room,'Room dimensions/partitions/niches must survive restore.');
 assert.equal(actual.items.length,expected.items.length,'All furniture and equipment must survive restore.');
 for(let index=0;index<expected.items.length;index++){
  const before=expected.items[index],after=actual.items[index];assert.equal(after.type,before.type);
  assert.deepEqual(after.placement,before.placement,'A restored element must retain its placement.');
  for(const key of ['format','width','height','depth','finish','top','topDrawer','basinColor','reference','tap','mirrorModel','doorOpen','drawers'])if(before.settings[key]!==undefined)assert.deepEqual(after.settings[key],before.settings[key],'Element setting '+key+' must survive restore.');
 }
 assert.equal(actual.floor.collection,expected.floor.collection);assert.equal(actual.floor.color,expected.floor.color);
 if(expected.floor.catalogueKey)assert.equal(actual.floor.catalogueKey,expected.floor.catalogueKey);
 for(let index=0;index<expected.walls.length;index++)for(const key of ['collection','color','format','catalogueKey','reference','finish'])if(expected.walls[index][key]!==undefined)assert.equal(actual.walls[index][key],expected.walls[index][key],'Wall '+index+' '+key+' must survive restore.');
}
for(const kind of ['standard','dense-cold-yosemite']){
 for(const key of Object.keys(measured))delete measured[key];context.loaderCalls=0;
 const input=structuredClone(savedProject);
 if(kind==='dense-cold-yosemite'){
  input.floor={collection:'Yosemite',color:'honey',format:'7.5x40.7'};
  input.walls=savedProject.walls.map(()=>({collection:'Yosemite',color:'honey',format:'7.5x40.7'}));
  input.layouts={floor:{width:.407,height:.075,shape:'chevron',pattern:'chevron'},walls:savedProject.walls.map(()=>({width:.407,height:.075,shape:'chevron',pattern:'chevron'}))};
 }
 context.restorePerfInput=input;
 const started=Date.now(),restored=vm.runInContext('restoreProject(restorePerfInput)',context),syncMs=Date.now()-started,syncCounts={...measured};
 assert.equal(typeof restored,'boolean','restoreProject must retain its synchronous boolean API.');
 assert.equal(restored,true,ids.get('placement-status').textContent);
 assertConserved(input,plain(vm.runInContext('collectProject()',context)));
 let transaction=null;try{transaction=plain(vm.runInContext('lastProjectRestore',context));}catch{}
 await vm.runInContext('prepareActiveTextures()',context);
 await Promise.allSettled(vm.runInContext('[...textureFlights.values()]',context));
 await new Promise(resolve=>setTimeout(resolve,0));
 try{vm.runInContext('sceneUpdates.flush()',context);}catch(error){if(optimized)throw error;}
 const totalMs=Date.now()-started,finalCounts={...measured};
 assertConserved(input,plain(vm.runInContext('collectProject()',context)));
 assert.equal(JSON.stringify(COLLECTIONS.Yosemite),definitionBefore,'Texture definitions, face counts and HD sources must remain unchanged.');
 if(optimized){
  assert(transaction,'Optimized source must expose restore transaction diagnostics.');
  for(const key of ['materials','composition','layouts','profiles','quantities','textures','quality','invalidate'])assert.equal(transaction.updates[key],1,'Restore must execute '+key+' exactly once synchronously.');
  assert.equal(syncCounts.setOpenings,1,'Candidate openings must be committed once.');
  assert.equal(syncCounts.applySurfaceTileColors,input.walls.length+1,'Each restored main surface must be applied once synchronously.');
  assert.equal(syncCounts.prepareActiveTextures,1,'Restore must launch one texture preparation.');
  assert(finalCounts.applySurfaceTileColors<=4*(input.walls.length+1),'Texture completion must not reapply the room once for every waiter.');
  assert(finalCounts.refreshPlinths<=6,'Texture completion must keep plinth refresh work bounded.');
 }
 results.push({kind,restored,items:input.items.length,walls:input.walls.length,syncMs,totalMs,loaderCalls:context.loaderCalls,syncCounts,finalCounts,transactionUpdates:transaction?.updates||null});
}
vm.runInContext('clearTimeout(toastTimer);clearTimeout(projectTimer);',context);
console.log('LRF_RESTORE_PERF_REPORT='+JSON.stringify({passed:true,source:${JSON.stringify(sourcePath)},optimizedWorkAssertions:optimized,limits:'Node CPU and DOM/renderer doubles; synthetic textures; no browser, image decoding, network or GPU benchmark. Times are informational only.',results}));process.exit(0);
`;
 const worker=spawnSync(process.execPath,['--input-type=module'],{cwd:studioRoot,input:code,encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024});
 if(worker.status!==0)throw Error(worker.stderr||worker.stdout||String(worker.error||'Restore benchmark worker failed.'));
 const line=worker.stdout.split('\n').find(value=>value.startsWith('LRF_RESTORE_PERF_REPORT='));
 assert(line,'Benchmark worker did not return its report.');
 console.log(JSON.stringify(JSON.parse(line.slice('LRF_RESTORE_PERF_REPORT='.length)),null,2));
}finally{process.chdir(originalCwd);}
