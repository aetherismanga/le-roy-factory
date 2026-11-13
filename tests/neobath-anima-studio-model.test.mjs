import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,dirname,join} from 'node:path';
import {mkdirSync,mkdtempSync,rmSync,readFileSync} from 'node:fs';
import * as T from 'three';
import {transformOriginalModel} from '../functions/neobath-anima/studio-adapter/model-transform.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),studio=join(root,'studio-one/src'),adapter=join(root,'functions/neobath-anima/studio-adapter');
mkdirSync(join(root,'node_modules/.cache'),{recursive:true});const dir=mkdtempSync(join(root,'node_modules/.cache/anima-studio-model-'));
const aliases=new Map(['model','configuration','finishes','tops','basins','column','mirrors'].map(n=>[join(studio,n+'.js'),join(adapter,n+'.js')]));
await build({stdin:{contents:`export * from ${JSON.stringify(join(adapter,'model.js'))};export * from ${JSON.stringify(join(adapter,'column.js'))};export {CABINET_FORMATS,cabinetProduct,topAvailable,animaCabinetDimensions,animaColumnDimensions} from ${JSON.stringify(join(adapter,'configuration.js'))};export {TOP_OPTIONS,topSelection} from ${JSON.stringify(join(adapter,'anima-data.js'))};export {makeCatalogueMirror,mirrorGeometry,mirrorSpec} from ${JSON.stringify(join(adapter,'mirrors.js'))};`,resolveDir:root,loader:'js'},outfile:join(dir,'model.mjs'),bundle:true,format:'esm',platform:'node',packages:'external',plugins:[{name:'anima-original-model-contract',setup(b){b.onResolve({filter:/^@studio-one-original\//},a=>({path:join(studio,a.path.slice('@studio-one-original/'.length))}));b.onResolve({filter:/^\./},a=>{const target=aliases.get(resolve(a.resolveDir,a.path));return target?{path:target}:undefined;});b.onLoad({filter:/studio-one[\\/]src[\\/]model\.js$/},a=>({contents:transformOriginalModel(readFileSync(a.path,'utf8')),loader:'js',resolveDir:dirname(a.path)}));}}]});
const M=await import(pathToFileURL(join(dir,'model.mjs')).href);
const C=JSON.parse(readFileSync(join(root,'functions/neobath-anima/catalogue.json')));
after(()=>rmSync(dir,{recursive:true,force:true}));
function visibleBounds(root){const b=new T.Box3();root.updateMatrixWorld(true);root.traverseVisible(o=>{if(o.isMesh){o.geometry.computeBoundingBox();b.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));}});return b;}
function dispose(root){const g=new Set(),m=new Set();root.traverse(o=>{if(o.isMesh){g.add(o.geometry);for(const mat of Array.isArray(o.material)?o.material:[o.material])m.add(mat);}});g.forEach(v=>v.dispose());m.forEach(v=>v.dispose());}
test('all 42 Anima modules adapt the genuine Studio One assembly to exact catalogue envelopes',()=>{
  for(const p of C.products.filter(p=>p.category==='module')){
    let asset;if(p.subtype==='column')asset=M.makeColumn({columnModel:p.facade.toLowerCase()+'-column'});
    else{const f=M.CABINET_FORMATS.find(f=>f.productsByWidth[p.width]?.id===p.id);assert.ok(f,p.id);asset=M.makeModel({width:p.width/100,format:f.id,basinTop:'bare',includeMirror:false});assert.equal(asset.spec.sourceProductId,p.id);assert.equal(asset.drawers.length,p.drawers||p.doors,p.id);}
    const bounds=visibleBounds(asset.root),size=bounds.getSize(new T.Vector3());
    assert.ok(Math.abs(size.x-p.width/100)<.001,p.id+' width '+size.x);
    assert.ok(Math.abs(size.y-p.height/100)<.001,p.id+' height '+size.y);
    assert.ok(Math.abs(size.z-p.depth/100)<.001,p.id+' depth '+size.z);
    assert.equal(asset.spec.reference||asset.spec.cabinetRef,p.ref,p.id);
    dispose(asset.root);
  }
});
test('Ribelle changes the real front relief while Pura retains a smooth profile and Studio One drawer interiors',()=>{
  const a=M.makeModel({width:.8,format:'two',includeMirror:false}),b=M.makeModel({width:.8,format:'ribelle-two',includeMirror:false});
  const depthValues=mesh=>new Set(Array.from(mesh.geometry.attributes.position.array).filter((_,i)=>i%3===2).map(v=>v.toFixed(5))).size;
  assert.ok(depthValues(a.frontMeshes[0])>=3,'Pura has a real recessed rectilinear grip');assert.equal(a.frontMeshes[0].geometry.userData.animaFacade.grip.profile,'rectilinear-channel-with-end-returns');assert.equal(a.frontMeshes[0].geometry.userData.animaFacade.section,'horizontal-recessed-grip');assert.ok(depthValues(b.frontMeshes[0])>depthValues(a.frontMeshes[0]),'Ribelle adds actual rib relief');
  assert.ok(a.drawers[0].getObjectByName('Interieur_tiroir'));assert.ok(a.cabinet.getObjectByName('Coulisse_fixe'));
  assert.ok(b.frontMeshes.every(o=>/Ribelle/.test(o.name)));
  dispose(a.root);dispose(b.root);
});
test('Studio One opening animation drives actual Anima doors and preserves reversible glass-shelf columns',()=>{
  const a=M.makeModel({width:.8,format:'pura-doors',includeMirror:false});
  a.drawers[0].position.z=.200;a.drawers[1].position.z=.315;
  assert.ok(a.doors[0].rotation.y<-.5);assert.ok(a.doors[1].rotation.y>.5);
  assert.equal(Math.abs(a.doors[0].rotation.y),Math.abs(a.doors[1].rotation.y));
  a.drawers[0].position.z=0;assert.equal(a.doors[0].rotation.y,0);
  const c=M.makeColumn({columnModel:'ribelle-column',hingeSide:'right'});assert.equal(c.shelves.length,4);assert.equal(c.getHingeSide(),'right');assert.equal(c.frontMeshes.length,2);
  dispose(a.root);dispose(c.root);
});

test('the stock demi-colonne has its PA4070 envelope, bottom grip, one shelf and reversible opening',()=>{
  for(const facade of ['pura','ribelle'])for(const hingeSide of ['left','right']){
    const settings={columnModel:facade+'-half-column',hingeSide},asset=M.makeColumn(settings),bounds=visibleBounds(asset.root),size=bounds.getSize(new T.Vector3());
    assert.ok(Math.abs(size.x-.40)<.001);assert.ok(Math.abs(size.y-.70)<.001);assert.ok(Math.abs(size.z-.22)<.001);
    assert.ok(Math.abs(bounds.min.y-1.10)<.001,'H70 starts at the wall-unit mounting height');
    assert.equal(asset.spec.reference,(facade==='pura'?'APUR':'ARIB')+'-PA4070');assert.equal(asset.spec.height,.70);
    assert.deepEqual(M.animaColumnDimensions(settings),{width:.4,height:.7,depth:.22,base:1.1});
    assert.equal(asset.frontMeshes.length,1);assert.equal(asset.frontMeshes[0].userData.animaGripEdge,'bottom');assert.equal(asset.shelves.length,1);
    assert.equal(asset.getHingeSide(),hingeSide);assert.equal(asset.frontMeshes[0].geometry.userData.animaFacade.ribelle,facade==='ribelle');
    const shelfBox=new T.Box3().setFromObject(asset.shelves[0]);assert.ok(Math.abs(shelfBox.getSize(new T.Vector3()).y-.006)<.0001,'glass keeps a real 6mm thickness');
    const closedFront=new T.Box3().setFromObject(asset.frontMeshes[0]);asset.door.rotation.y=-Math.PI*.55*asset.getHingeSign();asset.root.updateMatrixWorld(true);const openFront=new T.Box3().setFromObject(asset.frontMeshes[0]);assert.ok(openFront.max.z>closedFront.max.z+.2,'the single stock door swings outwards');
    dispose(asset.root);
  }
});
test('every compatible source basin/plan replaces the Randal sanitary models with its own reference and healthy geometry',()=>{
  const asset=M.makeModel({width:.8,format:'two',includeMirror:false});let count=0;
  for(const option of M.TOP_OPTIONS){if(!M.topAvailable(option.id,80,'two'))continue;assert.ok(asset.setTop(option.id),option.id);const s=M.topSelection(option.id,80,'two');assert.equal(asset.spec.basinRef,s?.reference||null,option.id);asset.tops.root.traverse(o=>{if(o.isMesh){assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite),option.id);assert.ok(!/Sella|Tampa|Neris|Torne/i.test(o.name),option.id);}});count++;}
  assert.ok(count>30);dispose(asset.root);
});
test('Anima finishes and mirror references retain commercial identity with the requested approved Alba appearance',()=>{
  assert.equal(M.FINISHES.length,6);assert.ok(M.FINISHES.filter(f=>f.id!=='rovere-alba').every(f=>f.texture.startsWith('https://leroyfactory.fr/assets/img/neobath-anima-2026/')));
  const wood=M.FINISHES.find(f=>f.id==='rovere-alba');assert.equal(wood.frontRotation,Math.PI/2);assert.equal(wood.texture,wood.frontTexture);assert.ok(wood.texture.includes('/finishes/20261022/alba-balanced.webp'));assert.equal(wood.source.requestedVisualReplacement,true);
  for(const p of C.products.filter(p=>p.category==='mirror')){const settings={mirrorModel:p.id},s=M.mirrorSpec(settings);assert.equal(s.reference,p.ref);assert.equal(s.width,p.width/100);assert.equal(s.height,p.height/100);const g=M.mirrorGeometry(settings);g.computeBoundingBox();const size=g.boundingBox.getSize(new T.Vector3());assert.ok(Math.abs(size.x-s.width)<.001);assert.ok(Math.abs(size.y-s.height)<.001);g.dispose();}
});
test('changing Neobath basins updates the original Studio One siphon floor and complete drawer option',()=>{
  const asset=M.makeModel({width:1.2,format:'two',includeMirror:false});
  assert.ok(asset.setTop('tk120dv-integrated-top'));
  const cutouts=()=>asset.drawers[0].getObjectByName('Interieur_tiroir').children.filter(o=>o.name==='Passage_siphon_face').map(o=>o.position.x);
  assert.deepEqual(cutouts(),asset.getBasinCenters());assert.equal(cutouts().length,2);
  assert.equal(asset.setTopDrawer('full'),'siphon');
  assert.ok(asset.setTop('tpc120-cover'));assert.equal(asset.setTopDrawer('full'),'full');assert.equal(asset.getTopDrawer(),'full');assert.equal(cutouts().length,0);
  assert.ok(asset.setTop('pic12146dx-integrated-top'));assert.equal(asset.getTopDrawer(),'siphon');assert.deepEqual(cutouts(),asset.getBasinCenters());assert.equal(cutouts().length,1);
  dispose(asset.root);
});
test('a continuous source top spans real stock modules without widening the cabinet or moving its sink away from its drawer cutout',()=>{
  const settings={width:100,format:'two',top:'to140sx-integrated-top',topSpan:140,topOffset:20};
  assert.equal(M.topAvailable(settings.top,100,'two',140),true);
  const asset=M.makeModel({...settings,width:1,basinTop:settings.top,includeMirror:false});
  assert.equal(asset.spec.width,1);assert.equal(asset.spec.topWidth,140.5);assert.equal(asset.tops.root.position.x,.2);assert.equal(M.animaCabinetDimensions(settings).width,1);
  const cutouts=asset.drawers[0].getObjectByName('Interieur_tiroir').children.filter(o=>o.name==='Passage_siphon_face').map(o=>o.position.x);
  assert.deepEqual(cutouts,asset.getBasinCenters());assert.ok(Math.abs(cutouts[0])<.4);assert.equal(asset.faucet.position.x,cutouts[0]);
  dispose(asset.root);
});
test('the source Studio One model retains its original format and reference',async()=>{
  const original=await import('../studio-one/src/model.js');const asset=original.makeModel({width:.8,format:'two',includeMirror:false});
  assert.equal(asset.spec.height,.54);assert.equal(asset.spec.cabinetRef,'13692');assert.equal(asset.spec.depth,.46);dispose(asset.root);
});
