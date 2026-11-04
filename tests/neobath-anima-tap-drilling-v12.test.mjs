import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import * as T from 'three';
import {transformOriginalModel} from '../functions/neobath-anima/studio-adapter/model-transform.mjs';
import {topSelection} from '../functions/neobath-anima/studio-adapter/anima-data.js';
import {normalizeTapDrilling,planTapContext} from '../functions/neobath-anima/studio-adapter/tap-drilling.js';
import {standalonePlanSettings,standaloneSelection} from '../functions/neobath-anima/studio-adapter/standalone-worktop-data.js';
import {quoteProject} from '../functions/neobath-anima/studio-adapter/commerce/pricing.js';
const root=resolve('.'),studio=join(root,'studio-one/src'),adapter=join(root,'functions/neobath-anima/studio-adapter');
mkdirSync(join(root,'node_modules/.cache'),{recursive:true});const dir=mkdtempSync(join(root,'node_modules/.cache/anima-drilling-v12-'));
const aliases=new Map(['configuration','finishes','tops','basins','column','mirrors'].map(name=>[join(studio,name+'.js'),join(adapter,name+'.js')]));
await build({stdin:{contents:`export * from ${JSON.stringify(join(adapter,'model.js'))};export {buildAnimaTop} from ${JSON.stringify(join(adapter,'tops.js'))};export {makeStandaloneWorktop} from ${JSON.stringify(join(adapter,'standalone-worktop.js'))};`,resolveDir:root,loader:'js'},outfile:join(dir,'geometry.mjs'),bundle:true,format:'esm',platform:'node',packages:'external',plugins:[{name:'anima-drilling-factories',setup(b){b.onResolve({filter:/^@studio-one-original\//},a=>({path:join(studio,a.path.slice('@studio-one-original/'.length))}));b.onResolve({filter:/^\./},a=>{const target=aliases.get(resolve(a.resolveDir,a.path));return target?{path:target}:undefined;});b.onLoad({filter:/studio-one\/src\/model\.js$/},a=>({contents:transformOriginalModel(readFileSync(a.path,'utf8')),loader:'js',resolveDir:dirname(a.path)}));}}]});
const M=await import(pathToFileURL(join(dir,'geometry.mjs')).href);after(()=>rmSync(dir,{recursive:true,force:true}));
const materials={ceramic:new T.MeshStandardMaterial({color:'#fff'}),wood:new T.MeshStandardMaterial(),chrome:new T.MeshStandardMaterial()};after(()=>Object.values(materials).forEach(material=>material.dispose()));
const make=selection=>{const a=M.buildAnimaTop({selection,...materials,surfaceY:0});a.root.updateWorldMatrix(true,true);return a;};
const ray=(meshes,x,z)=>new T.Raycaster(new T.Vector3(x,3,z),new T.Vector3(0,-1,0)).intersectObjects(meshes,false);
const select=(id,width,flags={},plan='tfx1-linear-top')=>topSelection(id,width,'worktop','center',width,plan,width,{standalone:true,...flags});
const quote=settings=>quoteProject({version:2,items:[{id:'worktop',type:'worktop',settings,placement:{wall:0,u:150,height:85}}]});
const mfr=q=>q.rows.filter(row=>row.ref==='MFR');
function dispose(root){const geometries=new Set(),materials=new Set();root.traverse(n=>{if(n.isMesh){geometries.add(n.geometry);for(const m of Array.isArray(n.material)?n.material:[n.material])materials.add(m);}});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}

test('custom wall installation closes the real slab tap passage and preserves bowl, drain and siphon',()=>{
 for(const id of ['vasca-a50','eclisse116-countertop-basin','eclisse116-s-semi-recessed-basin']){
  const initial=make(select(id,100)),wall=make(select(id,100,{tapWallIds:['wall-1']}));
  try{
   const before=initial.root.userData.animaTop,after=wall.root.userData.animaTop,hole=before.tapHoles[0];assert.ok(hole,id+' starts with a deck hole');
   assert.equal(ray(initial.surfaceMeshes,hole.x,hole.z).length,0,id+' actual tap opening');assert.ok(ray(wall.surfaceMeshes,hole.x,hole.z).length,id+' former tap hole is now solid');
   assert.equal(after.tapHoles.length,0);assert.equal(after.tapHolesPhysical.length,0);assert.equal(after.factoryPreDrilled,false);assert.equal(after.tapMount,'wall');
   assert.deepEqual(after.wells,before.wells);assert.deepEqual(after.plumbing,before.plumbing);
   const well=after.wells[0],probeX=well.x+well.width*.15;assert.ok(ray(wall.bowlMeshes,probeX,well.z).length,id+' real bowl shell remains');
   if(well.kind!=='countertop')assert.equal(ray(wall.surfaceMeshes,probeX,well.z).length,0,id+' basin cutout remains open');
  }finally{initial.dispose();wall.dispose();}
 }
});

test('a mixed double basin closes only its wall-fed drilling and bills only the remaining deck drilling',()=>{
 const base=standalonePlanSettings({width:180},'tpgea12-linear-top','tpgea12-b855-2-basin'),before=make(standaloneSelection(base)),mixedSettings={...base,tapWallIds:['wall-left',null]},mixed=make(standaloneSelection(mixedSettings));
 try{
  const first=before.root.userData.animaTop,meta=mixed.root.userData.animaTop;assert.equal(first.tapHoles.length,2);assert.equal(meta.tapHoles.length,1);assert.equal(meta.tapHoles[0].wellIndex,1);assert.equal(meta.tapMount,'mixed');
  assert.ok(ray(mixed.surfaceMeshes,first.tapHoles[0].x,first.tapHoles[0].z).length,'left hole is filled');assert.equal(ray(mixed.surfaceMeshes,first.tapHoles[1].x,first.tapHoles[1].z).length,0,'right hole remains');assert.deepEqual(meta.wells,first.wells);
  assert.equal(mfr(quote(base)).length,2);assert.equal(mfr(quote(mixedSettings)).length,1);assert.equal(mfr(quote(mixedSettings))[0].publicTTC,7920);
  const none={...base,tapMode:'none'},closed=make(standaloneSelection(none));try{assert.equal(closed.root.userData.animaTop.tapHoles.length,0);for(const hole of first.tapHoles)assert.ok(ray(closed.surfaceMeshes,hole.x,hole.z).length);assert.equal(mfr(quote(none)).length,0);}finally{closed.dispose();}
 }finally{before.dispose();mixed.dispose();}
});

test('existing factory and basin-ledge drillings remain physical source constraints when the deck mixer is suppressed',()=>{
 const fixed=make(topSelection('tk100-integrated-top',100,'worktop','center',100,undefined,100,{tapWallIds:['wall-1']}));
 try{const meta=fixed.root.userData.animaTop;assert.equal(meta.tapHoles.length,0);assert.equal(meta.retainedFactoryTapHoles.length,1);assert.equal(meta.factoryPreDrilled,true);const hole=meta.tapHolesPhysical[0];assert.equal(ray(fixed.surfaceMeshes,hole.x,hole.z).length,0,'factory hole cannot be unmanufactured');}finally{fixed.dispose();}
 const ledge=make(select('eclisse114-s-semi-recessed-basin',100,{tapWallIds:['wall-1']}));
 try{const meta=ledge.root.userData.animaTop,hole=meta.tapHolesPhysical[0];assert.equal(meta.tapHoles.length,0);assert.equal(meta.retainedFactoryTapHoles.length,1);assert.equal(hole.mount,'basin');assert.equal(ray(ledge.bowlMeshes,hole.x,hole.z).length,0,'published drilled ledge remains');assert.equal(mfr(quote({...standalonePlanSettings({width:100},'tfx1-linear-top','eclisse114-s-semi-recessed-basin'),tapWallIds:['wall-1']})).length,0);}finally{ledge.dispose();}
});

test('cabinet drilling changes rebuild and release the previous slab; refinishing preserves the active wall installation',()=>{
 const id='vasca-a50',s={topPlanId:'tfx1-linear-top',topSpan:100,topLength:100,basinColor:'fenix',basinPriceKey:'fenix'},asset=M.makeModel({width:1,format:'two',includeMirror:false,basinTop:id,...s});
 try{
  const original=asset.tops.root,deck=asset.tops.surfaceMeshes[0],hole=asset.getTapPositions()[0];let released=0;deck.geometry.addEventListener('dispose',()=>released++);
  assert.equal(asset.setTop(id,{...s,tapWallIds:['wall-1']}),true);assert.notEqual(asset.tops.root,original);assert.ok(released>0);assert.equal(asset.getTapPositions().length,0);asset.root.updateWorldMatrix(true,true);assert.ok(ray(asset.tops.surfaceMeshes,hole.x,hole.z).length);
  const current=asset.tops.root;assert.equal(asset.setTop(id,{...s,tapWallIds:['wall-1'],topSurfaceId:'fenix-blu-shaba'}),true);assert.equal(asset.tops.root,current);assert.equal(asset.getTapPositions().length,0);
  assert.equal(asset.setTop(id,{...s,tapWallIds:[]}),true);assert.equal(asset.getTapPositions().length,1);assert.equal(asset.tops.root.userData.animaTop.tapMode,'auto');
 }finally{dispose(asset.root);}
});

test('independent worktop drilling cache follows wall removal and preserves transformed placement on recolouring',()=>{
 const s=standalonePlanSettings({width:100},'tfx1-linear-top','eclisse116-countertop-basin'),asset=M.makeStandaloneWorktop(s);asset.root.position.set(.7,.82,-.3);asset.root.rotation.y=.4;
 try{
  const old=asset.tops.root;assert.equal(asset.getTapPositions().length,1);assert.equal(asset.setSettings({tapWallIds:['wall-1']}),true);assert.notEqual(asset.tops.root,old);assert.equal(asset.getTapPositions().length,0);const wallRoot=asset.tops.root;
  assert.equal(asset.setSettings({basinColor:'fume-matte',basinPriceKey:'fume-matte'}),true);assert.equal(asset.tops.root,wallRoot);assert.deepEqual(asset.root.position.toArray(),[.7,.82,-.3]);assert.equal(asset.root.rotation.y,.4);
  assert.equal(asset.setSettings({tapWallIds:[],tapMode:'auto'}),true);assert.equal(asset.getTapPositions().length,1);
 }finally{asset.dispose();}
});

test('pure drilling context keeps actual depth and per-well poses for prospective compatibility without Three.js',()=>{
 const selection=select('vasca-a50',120,{topDepth:80,basinOffsetZ:-16.9,tapWallIds:['mural']}),context=planTapContext(selection,{surfaceY:.82,cabinetDepth:.46});
 assert.equal(context.top.depth,.8);assert.equal(context.top.topSurface,.83);assert.equal(context.top.wells.length,1);assert.equal(context.top.wells[0].wellIndex,0);assert.equal(context.candidateHoles.length,1);assert.equal(context.holes.length,0);assert.equal(context.physicalHoles.length,0);
 assert.throws(()=>normalizeTapDrilling({tapMode:'guess'}));assert.throws(()=>normalizeTapDrilling({tapWallIds:['one','two','three']}));assert.equal(select('vasca-a50',100,{tapWallIds:[42]}),null);
});
