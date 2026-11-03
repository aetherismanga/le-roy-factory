import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,dirname,join} from 'node:path';
import {mkdirSync,mkdtempSync,rmSync,readFileSync} from 'node:fs';
import * as T from 'three';
import {transformOriginalModel} from '../functions/neobath-anima/studio-adapter/model-transform.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),studio=join(root,'studio-one/src'),adapter=join(root,'functions/neobath-anima/studio-adapter');
mkdirSync(join(root,'node_modules/.cache'),{recursive:true});const dir=mkdtempSync(join(root,'node_modules/.cache/anima-v6-details-'));
const aliases=new Map(['model','configuration','finishes','tops','basins','column','mirrors'].map(n=>[join(studio,n+'.js'),join(adapter,n+'.js')]));
await build({stdin:{contents:`export * from ${JSON.stringify(join(adapter,'model.js'))};export * from ${JSON.stringify(join(adapter,'facades.js'))};export * from ${JSON.stringify(join(adapter,'vessel-profiles.js'))};`,resolveDir:root,loader:'js'},outfile:join(dir,'model.mjs'),bundle:true,format:'esm',platform:'node',packages:'external',plugins:[{name:'anima-v6-real-details',setup(b){b.onResolve({filter:/^@studio-one-original\//},a=>({path:join(studio,a.path.slice('@studio-one-original/'.length))}));b.onResolve({filter:/^\./},a=>{const target=aliases.get(resolve(a.resolveDir,a.path));return target?{path:target}:undefined;});b.onLoad({filter:/studio-one\/src\/model\.js$/},a=>({contents:transformOriginalModel(readFileSync(a.path,'utf8')),loader:'js',resolveDir:dirname(a.path)}));}}]});
const M=await import(pathToFileURL(join(dir,'model.mjs')).href);after(()=>rmSync(dir,{recursive:true,force:true}));
function dispose(root){const gs=new Set(),ms=new Set(),ts=new Set();root.traverse(node=>{if(node.isMesh){gs.add(node.geometry);for(const material of Array.isArray(node.material)?node.material:[node.material]){ms.add(material);for(const key of ['map','bumpMap'])if(material[key])ts.add(material[key]);}}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());ts.forEach(t=>t.dispose());}
const close=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-6,`${message}: ${a} / ${b}`);
const ray=(meshes,x,z)=>new T.Raycaster(new T.Vector3(x,3,z),new T.Vector3(0,-1,0)).intersectObjects(meshes,false);

test('Pura and Ribelle have the same drawer boxes, 25.6 cm stock fronts, and photographic grey textile interiors',()=>{
 const pure=M.makeModel({width:1.2,format:'two',includeMirror:false}),rib=M.makeModel({width:1.2,format:'ribelle-two',includeMirror:false});
 try{
  for(const asset of [pure,rib]){
   const m=asset.drawerMetal;assert.equal(m.metalness,0);assert.equal(m.roughness,.86);assert.equal(m.color.getHexString(),'b8b6af');assert.ok(m.bumpMap?.isDataTexture);assert.equal(m.userData.animaDrawerAppearance.sourcePdfPage,9);assert.equal(m.userData.animaDrawerAppearance.approximate,true);
   for(const front of asset.frontMeshes){close(front.geometry.boundingBox.max.y-front.geometry.boundingBox.min.y,.256,'published H52 cell front');assert.ok(front.geometry.userData.animaFacade.grip.curveSegments>=8,'actual rounded grip');}
   // A new offset sanitary passage must keep the same non-metallic material
   // and physical textile period after the inherited drawer is rebuilt.
   asset.setTop('tpgea12-b938-1-basin',{basinOffsetX:6,basinOffsetZ:-2});
   const passage=asset.drawers[0].getObjectByName('Passage_siphon_face');assert.equal(passage.material,m);assert.ok(passage.userData.animaDrawerAppearance);assert.ok(passage.geometry.attributes.uv.array.every(Number.isFinite));
   const runner=asset.cabinet.getObjectByName('Coulisse_fixe');assert.notEqual(runner.material,m);assert.equal(runner.material.metalness,1);
  }
  for(let i=0;i<2;i++){const a=pure.drawers[i].getObjectByName('Flanc_anthracite_8mm'),b=rib.drawers[i].getObjectByName('Flanc_anthracite_8mm');a.geometry.computeBoundingBox();b.geometry.computeBoundingBox();close(a.geometry.boundingBox.max.y-a.geometry.boundingBox.min.y,b.geometry.boundingBox.max.y-b.geometry.boundingBox.min.y,'same drawer box height');}
 }finally{dispose(pure.root);dispose(rib.root);}
});

test('Ribelle relief has sharp geometric lands, continuous smooth valleys and no invented machining precision',()=>{
 const g=M.animaFacadeGeometry(.8,.256,true),p=g.attributes.position,n=g.attributes.normal,meta=g.userData.animaFacade;
 try{assert.equal(meta.sourcePdfPage,9);assert.equal(meta.approximate,true);assert.ok(meta.ridgeFraction>.5);assert.ok(meta.pitch>=.0079&&meta.pitch<=.0081);assert.equal(meta.grip.approximate,true);let plateaus=0,valleys=0;for(let i=0;i<p.count;i+=2){if(p.getY(i)>-.12)break;if(Math.abs(p.getZ(i)-.0095)<1e-6){plateaus++;close(n.getX(i),0,'flat land normal');}else valleys++;}assert.ok(plateaus>valleys,'the visible raised land is broader than its valley');assert.ok(valleys>30);assert.ok([...n.array].every(Number.isFinite));}
 finally{g.dispose();}
});

test('Ribelle ends its ribs below a smooth horizontal grip band, as in the Anima detail photograph',()=>{
 const g=M.animaFacadeGeometry(.8,.256,true),p=g.attributes.position,n=g.attributes.normal,meta=g.userData.animaFacade,rows=new Map(),bodyTop=.128-meta.grip.height;
 try{assert.equal(meta.grip.smoothBand,true);for(let i=0;i<p.count;i++){const y=p.getY(i),z=p.getZ(i);if(y<=bodyTop+meta.grip.lip+.00001||y>=.128-.00001||z<=-.00949||Math.abs(n.getX(i))>.01)continue;const key=y.toFixed(7);if(!rows.has(key))rows.set(key,[]);rows.get(key).push(z);}assert.ok(rows.size>=7);for(const values of rows.values())assert.ok(Math.max(...values)-Math.min(...values)<1e-6,'grip profile remains constant over every rib and valley');}
 finally{g.dispose();}
});

test('the documented Eclisse 114/S has a drilled rear ledge, visible inset cup and accurate tap mounting metadata',()=>{
 const asset=M.makeModel({width:.8,format:'two',includeMirror:false,basinTop:'eclisse114-s-semi-recessed-basin',basinBottom:'tvl',basinColor:'bronze-matte',basinPriceKey:'bronze-matte'});
 try{
  asset.root.updateMatrixWorld(true);const top=asset.tops.root.userData.animaTop,well=top.wells[0],hole=top.tapHoles[0],bowl=asset.tops.bowlMeshes[0];
  assert.equal(hole.mount,'basin');assert.equal(hole.wellIndex,0);close(hole.surfaceY,top.topSurface+.025,'ledge mounting surface');assert.equal(well.power,4.5);assert.ok(well.openingCenterZ>well.z);assert.equal(well.reconstruction.designSourcePdf,'DNA');assert.equal(well.reconstruction.designSourcePdfPage,42);assert.equal(well.reconstruction.sourceComposition,'012');assert.equal(well.reconstruction.approximate,true);
  assert.equal(top.reference,'TPGEA12');assert.equal(top.basinStyle.family,'eclisse');assert.equal(top.basinStyle.drain,'round-chrome');assert.ok(asset.tops.root.getObjectByName('Couvercle_bonde'));assert.equal(asset.tops.root.getObjectByName('Bonde_rectangulaire_assortie'),undefined,'the Geacril support does not replace the Eclisse waste fitting');
  assert.equal(ray([bowl],hole.x,hole.z).length,0,'tap passage goes through the real basin shell');assert.equal(ray(asset.tops.surfaceMeshes,hole.x,hole.z).length,0,'the plan has no hidden filled layer');
  const ledge=ray([bowl],hole.x+.07,hole.z);assert.ok(ledge.length);close(ledge[0].point.y,hole.surfaceY,'actual rear ledge height');
  const cup=ray([bowl],well.x+.08,well.openingCenterZ);assert.ok(cup.length);assert.ok(cup[0].point.y<top.topSurface-.02,'inset bowl floor remains visibly below the plan');
  const profile=M.animaVesselProfile({ref:'ECLISSE114',width:54,depth:34,height:12});assert.equal(profile.tap,null,'no undocumented ledge transferred to another reference');
  for(const ref of ['ECLISSE115/S','ECLISSE116/S'])assert.equal(M.animaVesselProfile({ref,width:42,depth:42,height:12}).tap,null);
 }finally{dispose(asset.root);}
});
