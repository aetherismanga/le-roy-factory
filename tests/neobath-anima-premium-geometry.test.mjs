import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,dirname,join} from 'node:path';
import {mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import * as T from 'three';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const adapter=join(root,'functions/neobath-anima/studio-adapter');
mkdirSync(join(root,'node_modules/.cache'),{recursive:true});
const dir=mkdtempSync(join(root,'node_modules/.cache/anima-premium-geometry-'));
await build({stdin:{contents:`export * from ${JSON.stringify(join(adapter,'tops.js'))};export {animaWellProfile} from ${JSON.stringify(join(adapter,'top-profiles.js'))};`,resolveDir:root,loader:'js'},outfile:join(dir,'tops.mjs'),bundle:true,format:'esm',platform:'node',packages:'external',plugins:[{name:'original-studio-top-shell',setup(b){b.onResolve({filter:/^@studio-one-original\//},a=>({path:join(root,'studio-one/src',a.path.slice('@studio-one-original/'.length))}));}}]});
const M=await import(pathToFileURL(join(dir,'tops.mjs')).href);
after(()=>rmSync(dir,{recursive:true,force:true}));
const materials={ceramic:new T.MeshStandardMaterial({color:0xffffff}),wood:new T.MeshStandardMaterial({color:0x987760}),chrome:new T.MeshStandardMaterial({metalness:1})};
after(()=>Object.values(materials).forEach(m=>m.dispose()));
function make(selection,options={}){const a=M.buildAnimaTop({selection,...materials,...options});a.root.updateMatrixWorld(true);return a;}
function ray(meshes,x,z){const ray=new T.Raycaster(new T.Vector3(x,3,z),new T.Vector3(0,-1,0));return ray.intersectObjects(meshes,false);}
function assertFiniteHealthy(mesh,label){
  const geometry=mesh.geometry,position=geometry.attributes.position,normal=geometry.attributes.normal;
  assert.ok([...position.array].every(Number.isFinite),label+' finite positions');
  assert.ok([...normal.array].every(Number.isFinite),label+' finite normals');
  for(let i=0;i<normal.count;i++)assert.ok(Math.abs(normal.getX(i)**2+normal.getY(i)**2+normal.getZ(i)**2-1)<.001,label+' unit normal');
  const index=geometry.index?.array||Array.from({length:position.count},(_,i)=>i),edges=new Map(),orientation=new Map();
  const key=i=>[position.getX(i),position.getY(i),position.getZ(i)].map(x=>Math.round(x*1e7)).join(',');
  const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();let volume=0;
  for(let i=0;i<index.length;i+=3){const indices=[index[i],index[i+1],index[i+2]],keys=indices.map(key);
    a.fromBufferAttribute(position,indices[0]);b.fromBufferAttribute(position,indices[1]);c.fromBufferAttribute(position,indices[2]);
    assert.ok(new T.Vector3().crossVectors(b.clone().sub(a),c.clone().sub(a)).lengthSq()>1e-24,label+' zero-area face');
    volume+=a.dot(new T.Vector3().crossVectors(b,c))/6;
    for(let j=0;j<3;j++){const x=keys[j],y=keys[(j+1)%3],k=x<y?x+'|'+y:y+'|'+x;edges.set(k,(edges.get(k)||0)+1);orientation.set(k,(orientation.get(k)||0)+(x<y?1:-1));}
  }
  assert.ok(volume>1e-9,label+' outward winding, signed volume '+volume);
  for(const [key,count] of edges){assert.equal(count,2,label+' closed manifold edge');assert.equal(orientation.get(key),0,label+' consistently oriented edge');}
}
function assertEnvelope(mesh,meta,label){
  const p=mesh.geometry.attributes.position,v=new T.Vector3();
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);assert.ok(Math.abs(v.x)<=meta.width/2+2e-6,label+' X '+v.x);assert.ok(Math.abs(v.z-meta.zOffset)<=meta.depth/2+2e-6,label+' Z '+v.z);}
}
function selections(){const result=[];
  for(const option of M.TOP_OPTIONS){if(option.id==='bare')continue;const p=option.product;
    const candidates=[...(p.compatibleWidths||[]),p.minCompositionWidth,p.minWidth,60,80,100,120,140,160,180,200,230,240].filter(Number.isFinite);
    let selected;
    for(const span of candidates){selected=M.topSelection(option.id,Math.min(60,span),'two','center',span);if(selected)break;}
    assert.ok(selected,'source reference selectable: '+option.id);
    result.push(selected);
    if(selected.basin&&selected.top.configurableWidth){
      for(const span of new Set([selected.topSpan,120,160]))for(const layout of ['left','center','right']){const s=M.topSelection(option.id,Math.min(60,span),'two',layout,span);if(s)result.push(s);}
      for(const topPlanId of p.compatibleTopIds||[]){const s=M.topSelection(option.id,60,'two','center',160,topPlanId);if(s)result.push(s);}
    }
  }return [...new Map(result.map(s=>[[s.mode,s.layout,s.top.id,s.topSpan].join('|'),s])).values()];
}
test('all 137 source plans and basin references have finite closed geometry inside the real plan envelope',t=>{
  const cases=selections();assert.equal(new Set(cases.map(s=>s.mode)).size,137);assert.ok(cases.length>400);t.diagnostic(cases.length+' valid source/plan/layout combinations checked');
  for(const selection of cases){const asset=make(selection),meta=asset.root.userData.animaTop,label=selection.mode+'/'+selection.layout;
    assert.ok(asset.surfaceMeshes.length,label+' deck');
    for(const mesh of [...asset.surfaceMeshes,...asset.bowlMeshes]){assertFiniteHealthy(mesh,label+'/'+mesh.name);assertEnvelope(mesh,meta,label);}
    for(const well of meta.wells){assert.ok(Math.abs(well.x)+well.width/2<=meta.width/2+.0001,label+' well footprint');
      const probeX=well.x+well.width*.15,probeZ=well.z;
      if(well.kind==='integrated'){assert.equal(ray(asset.surfaceMeshes,probeX,probeZ).length,0,label+' deck must be cut through above well');const hits=ray(asset.bowlMeshes,probeX,probeZ);assert.ok(hits.length,label+' inner bowl visible with front-sided material');assert.ok(hits[0].point.y<meta.topSurface-.006,label+' real recessed well');}
      else{const hits=ray(asset.bowlMeshes,probeX,probeZ);assert.ok(hits.length,label+' vessel visible');}
    }
    for(const tap of meta.tapHoles){assert.equal(ray(asset.surfaceMeshes,tap.x,tap.z).length,0,label+' faucet hole at documented X/Z');
      for(const well of meta.wells)assert.ok(Math.abs(tap.x-well.x)>well.width/2+tap.radius+.002||Math.abs(tap.z-well.z)>well.depth/2+tap.radius+.002,label+' faucet does not cut the basin shell');
    }
    // An untouched front corner stays opaque: bad contour winding must not erase the whole slab.
    const corner=ray(asset.surfaceMeshes,-meta.width/2+.012,meta.zOffset+meta.depth/2-.012);assert.ok(corner.length,label+' intact deck');assert.ok(Math.abs(corner[0].point.y-meta.topSurface)<.001,label+' deck top level');
    asset.dispose();
  }
});
test('Picasso DX/SX keeps a broad source-family well without clipping or a filled white top',()=>{
  for(const side of ['dx','sx']){const selection=M.topSelection('pic12146'+side+'-integrated-top',120,'two'),asset=make(selection,{cabinetDepth:.22}),meta=asset.root.userData.animaTop,well=meta.wells[0];
    assert.ok(well.width>.85,'wide Picasso basin');assert.ok(Math.abs(well.x)>.1&&Math.abs(well.x)<.15,'source-family offset is bounded');
    assert.ok(Math.abs(well.x)+well.width/2<meta.width/2-.02,'complete side lip');
    assert.equal(Math.sign(well.x),side==='dx'?1:-1);assert.ok(Math.abs(meta.zOffset+.12)<1e-12);
    assert.equal(ray(asset.surfaceMeshes,well.x+.15,well.z).length,0);assert.ok(ray(asset.bowlMeshes,well.x+.15,well.z).length);
    for(const mesh of [...asset.surfaceMeshes,...asset.bowlMeshes])assertEnvelope(mesh,meta,side);asset.dispose();
  }
});
test('source dimensions of custom basins are retained and impossible layouts are rejected explicitly',()=>{
  const selection=M.topSelection('basic70-fenix-basin',80,'two');
  // Find the source ID rather than assume material-specific naming.
  const source=selection||selections().find(s=>s.basin?.ref==='BASIC70');assert.ok(source);
  const a=make(source);assert.equal(a.root.userData.animaTop.wells[0].width,.7);a.dispose();
  assert.throws(()=>make({...source,positions:[source.topWidth/200-.1]}),/largeur fabricant/);
});
test('plan and bowl materials are independent and external material ownership is preserved',()=>{
  const plan=new T.MeshStandardMaterial({color:0x334455}),bowl=new T.MeshStandardMaterial({color:0x998877});let disposed=0;plan.addEventListener('dispose',()=>disposed++);bowl.addEventListener('dispose',()=>disposed++);
  const a=make(M.topSelection('pic12146-integrated-top',120,'two'),{planMaterial:plan,bowlMaterial:bowl});
  assert.equal(a.planMaterial,plan);assert.equal(a.bowlMaterial,bowl);assert.ok(a.surfaceMeshes.every(m=>m.material===plan&&m.userData.animaSurfaceRole==='deck'));assert.ok(a.bowlMeshes.every(m=>m.material===bowl&&m.userData.animaSurfaceRole==='bowl'));
  a.dispose();assert.equal(disposed,0);plan.dispose();bowl.dispose();
});

test('the three Eclisse /S variants are semi-recessed, with a real shell cutout and an explicit preview reconstruction',()=>{
  const refs=['eclisse116-s-semi-recessed-basin','eclisse115-s-semi-recessed-basin','eclisse114-s-semi-recessed-basin'];
  for(const id of refs){
    const selection=M.topSelection(id,80,'two'),asset=make(selection),meta=asset.root.userData.animaTop,bowl=asset.bowlMeshes[0],well=meta.wells[0],bounds=new T.Box3().setFromObject(bowl);
    assert.equal(well.kind,'semi-recessed');assert.ok(bounds.min.y<meta.topSurface-.08,id+' bowl is mounted below the slab');
    assert.ok(bounds.max.y>meta.topSurface+.02&&bounds.max.y<meta.topSurface+.03,id+' narrow rim remains visible');
    assert.ok(Math.abs(bounds.max.y-bounds.min.y-.12)<1e-6,id+' source exterior height retained');
    assert.ok(Math.abs(asset.previewBasinRise-.025)<1e-12);assert.ok(meta.reconstruction.approximate);assert.equal(meta.reconstruction.sourcePdfPage,75);assert.match(meta.reconstruction.note,/gabarit fabricant/);
    for(const dx of [-well.width*.2,well.width*.2]){assert.equal(ray(asset.surfaceMeshes,well.x+dx,well.z).length,0,id+' slab does not close the interior');const hits=ray(asset.bowlMeshes,well.x+dx,well.z);assert.ok(hits.length,id+' recessed inner wall remains visible');assert.ok(hits[0].point.y<meta.topSurface,id+' bowl floor below slab');}
    // Its cutout reaches the actual wall intersection, much farther than the waste hole.
    assert.equal(ray(asset.surfaceMeshes,well.x+well.width*.38,well.z).length,0,id+' full shell cutout');
    assertFiniteHealthy(bowl,id);assertEnvelope(bowl,meta,id);asset.dispose();
  }
});
