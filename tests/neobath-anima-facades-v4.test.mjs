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
await build({stdin:{contents:`export * from ${JSON.stringify(join(adapter,'model.js'))};export {ANIMA_GRIP_PROFILE,animaFacadeGeometry} from ${JSON.stringify(join(adapter,'facades.js'))};export * from ${JSON.stringify(join(adapter,'column.js'))};export {CABINET_FORMATS,cabinetProduct,topAvailable,animaCabinetDimensions} from ${JSON.stringify(join(adapter,'configuration.js'))};export {TOP_OPTIONS,topSelection} from ${JSON.stringify(join(adapter,'anima-data.js'))};export {makeCatalogueMirror,mirrorGeometry,mirrorSpec} from ${JSON.stringify(join(adapter,'mirrors.js'))};`,resolveDir:root,loader:'js'},outfile:join(dir,'model.mjs'),bundle:true,format:'esm',platform:'node',packages:'external',plugins:[{name:'anima-original-model-contract',setup(b){b.onResolve({filter:/^@studio-one-original\//},a=>({path:join(studio,a.path.slice('@studio-one-original/'.length))}));b.onResolve({filter:/^\./},a=>{const target=aliases.get(resolve(a.resolveDir,a.path));return target?{path:target}:undefined;});b.onLoad({filter:/studio-one[\\/]src[\\/]model\.js$/},a=>({contents:transformOriginalModel(readFileSync(a.path,'utf8')),loader:'js',resolveDir:dirname(a.path)}));}}]});
const M=await import(pathToFileURL(join(dir,'model.mjs')).href);
const C=JSON.parse(readFileSync(join(root,'functions/neobath-anima/catalogue.json')));
after(()=>rmSync(dir,{recursive:true,force:true}));
function visibleBounds(root){const b=new T.Box3();root.updateMatrixWorld(true);root.traverseVisible(o=>{if(o.isMesh){o.geometry.computeBoundingBox();b.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));}});return b;}
function dispose(root){const g=new Set(),m=new Set();root.traverse(o=>{if(o.isMesh){g.add(o.geometry);for(const mat of Array.isArray(o.material)?o.material:[o.material])m.add(mat);}});g.forEach(v=>v.dispose());m.forEach(v=>v.dispose());}
test('every Anima stock front has a real recessed grip with outward geometry and the correct opening edge',()=>{
  for(const p of C.products.filter(p=>p.category==='module')){
    const column=p.subtype==='column',f=column?null:M.CABINET_FORMATS.find(f=>f.productsByWidth[p.width]?.id===p.id);
    const asset=column?M.makeColumn({columnModel:p.facade.toLowerCase()+'-column'}):M.makeModel({width:p.width/100,format:f.id,includeMirror:false});
    assert.equal(asset.frontMeshes.length,column?2:p.drawers||p.doors,p.id);if(!column)assert.equal(!!asset.carcassTop,p.subtype==='base'||p.subtype==='wall',p.id+' catalogue carcass top');
    for(const [i,front]of asset.frontMeshes.entries()){
      const g=front.geometry,meta=g.userData.animaFacade;assert.equal(meta.section,'horizontal-recessed-grip',p.id);assert.equal(meta.ribelle,p.facade==='RIBELLE');
      assert.equal(front.userData.animaGripEdge,column?(i===0?'top':'bottom'):p.subtype==='wall'?'bottom':'top',p.id);
      assert.ok(meta.grip.height>.035&&meta.grip.recess>.014,p.id+' finger clearance');
      const positions=g.attributes.position,normals=g.attributes.normal,index=g.index.array,a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),n=new T.Vector3(),cross=new T.Vector3();
      for(let j=0;j<index.length;j+=3){a.fromBufferAttribute(positions,index[j]);b.fromBufferAttribute(positions,index[j+1]);c.fromBufferAttribute(positions,index[j+2]);cross.crossVectors(b.sub(a),c.sub(a));n.fromBufferAttribute(normals,index[j]);assert.ok(cross.lengthSq()>1e-24,p.id+' nondegenerate');assert.ok(cross.dot(n)>0,p.id+' front and side winding');}
    }
    dispose(asset.root);
  }
});
test('bare cabinet top is clickable without displaying a false slab, and targets the right inspector',()=>{
  const asset=M.makeModel({width:.8,format:'two',includeMirror:false}),proxy=asset.bareTopHitTarget;
  assert.equal(proxy.material.opacity,0);assert.equal(proxy.material.colorWrite,false);assert.equal(proxy.material.depthWrite,false);assert.equal(proxy.visible,true);assert.equal(proxy.userData.editTarget,'basin');
  asset.root.updateMatrixWorld(true);const ray=new T.Raycaster(new T.Vector3(0,2,0),new T.Vector3(0,-1,0));assert.ok(ray.intersectObject(proxy).length);
  assert.ok(asset.setTop('tpgea12-linear-top'));assert.equal(proxy.visible,false);assert.equal(asset.worktopRoot,asset.tops.root);assert.equal(asset.worktopRoot.userData.animaWorktopTarget,true);
  asset.setTop('bare');assert.equal(proxy.visible,true);dispose(asset.root);
});
test('depth and basin XY alter the actual slab, drilled hole, bowl, tap and drawer passage together',()=>{
  const id='tpgea12-b938-1-basin',asset=M.makeModel({width:1.2,format:'two',includeMirror:false,basinTop:id,topDepth:50,basinOffsetX:5,basinOffsetZ:-2});
  const meta=asset.tops.root.userData.animaTop,well=meta.wells[0];assert.ok(meta);assert.equal(meta.depth,.5);assert.ok(Math.abs(meta.zOffset-.019)<1e-10);
  assert.ok(Math.abs(well.x-.05)<1e-10);assert.ok(Math.abs(well.z-.019)<1e-10);assert.ok(Math.abs(meta.zOffset-meta.depth/2+.231)<1e-10,'rear edge remains fixed');
  asset.root.updateMatrixWorld(true);const ray=new T.Raycaster(new T.Vector3(well.x+.08,3,well.z),new T.Vector3(0,-1,0));assert.equal(ray.intersectObjects(asset.tops.surfaceMeshes,false).length,0);assert.ok(ray.intersectObjects(asset.tops.bowlMeshes,false).length);
  const passage=asset.drawers[0].getObjectByName('Passage_siphon_face');assert.ok(Math.abs(passage.position.x-well.x)<1e-10);assert.ok(Math.abs(passage.position.z-(.021+well.z-.020))<1e-10);assert.ok(Math.abs(asset.getTapPositions()[0].z-meta.tapHoles[0].z)<1e-10);
  const prior=asset.tops.root;assert.equal(asset.setTop(id,{basinOffsetX:100}),false);assert.equal(asset.tops.root,prior);assert.equal(asset.spec.basinOffsetX,5,'invalid changes preserve the valid model');
  dispose(asset.root);
});
test('manufacturer square OFFSET mirrors retain their rectangular silhouette',()=>{
  for(const id of ['offset80-mirror','offset100-mirror']){assert.equal(M.mirrorSpec({mirrorModel:id}).shape,'rect');const g=M.mirrorGeometry({mirrorModel:id}),p=g.attributes.position;assert.ok([...p.array].some((x,i)=>i%3===0&&Math.abs(x)>.35));g.dispose();}
});
