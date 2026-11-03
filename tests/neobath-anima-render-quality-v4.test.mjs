import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parse} from 'acorn';
import * as T from 'three';
import {FINISHES} from '../functions/neobath-anima/studio-adapter/finishes.js';
import {AdaptiveQuality,QUALITY_PROFILES,renderPixelRatio,profileSizes,AUTO_ECONOMY,MOBILE_ECONOMY} from '../functions/neobath-anima/studio-adapter/render-quality.js';
import {QUALITY_PROFILES as STUDIO_PROFILES} from '../shared/lrf-3d/performance.js';
import {transformCommonStudioSource} from '../functions/neobath-anima/studio-adapter/studio-source-transform.mjs';
import {applyPlanSurfaceUV,createTopSurfaceController} from '../functions/neobath-anima/studio-adapter/surface-materials.js';
import {MANUFACTURER_SURFACES} from '../functions/neobath-anima/studio-adapter/premium-materials.js';
import {topSelection} from '../functions/neobath-anima/studio-adapter/anima-data.js';
import {cropAnimaWoodFrontTexture} from '../functions/neobath-anima/studio-adapter/premium-rendering.mjs';

const source=transformCommonStudioSource(readFileSync(new URL('../studio-one/src/app.js',import.meta.url),'utf8'),'app.js');
const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});
const functions=new Map(ast.body.filter(n=>n.type==='FunctionDeclaration').map(n=>[n.id.name,source.slice(n.start,n.end)]));
const noop=()=>{};

test('Pura wood copies the exact native source inset without editing a shared original or resampling',()=>{
 const image={width:495,height:170,src:'manufacturer-rovere.webp'},original=new T.Texture(image),front=original.clone(),calls=[];
 const canvas={width:0,height:0,getContext:()=>({drawImage:(...args)=>calls.push(args)})};
 cropAnimaWoodFrontTexture(front,{canvasFactory:()=>canvas});
 assert.equal(original.image,image);assert.equal(front.image,canvas);assert.notEqual(front.source,original.source);
 assert.deepEqual(calls,[[image,0,8,495,162,0,0,495,162]]);assert.equal(canvas.width,495);assert.equal(canvas.height,162);
 assert.equal(front.userData.animaWoodCrop.resampled,false);
 const bump=front.clone();assert.equal(bump.image,canvas,'bump and diffuse must sample the same safe source region');
 cropAnimaWoodFrontTexture(front,{canvasFactory:()=>{throw Error('already cropped');}});front.dispose();bump.dispose();original.dispose();
});

test('actual atelier reuses the approved flat Alba sample without the old photographed Pura inset',async()=>{
 const copies=[],sources=[],finish=FINISHES.find(f=>f.id==='rovere-alba');
 const context={FINISHES,T,quality:{mode:'balanced',profile:{id:'balanced'}},finishTextures:{},renderer:{capabilities:{getMaxAnisotropy:()=>8}},
  document:{createElement:()=>({getContext:()=>({drawImage:(...args)=>copies.push(args)})})},tileAssetURL:url=>url,
  loadTexture:async url=>{const texture=new T.Texture({src:url,width:473,height:1024});sources.push(texture);return texture;},
  cacheTextures:(_key,load)=>load(),refreshFurnitureMaterials:noop,invalidate:noop};
 vm.createContext(context);vm.runInContext(functions.get('requestFinishAssets'),context);const tx=await context.requestFinishAssets(finish.id);
 assert.equal(copies.length,0);assert.equal(sources.length,1);assert.equal(tx.front.image.height,1024);assert.equal(tx.front.image,sources[0].image);
 assert.equal(tx.frontBump.image,tx.front.image);assert.equal(tx.ribelleFront.image,tx.front.image);assert.equal(tx.front.userData.animaWoodCrop,undefined);
 for(const texture of new Set([...Object.values(tx).filter(t=>t?.isTexture),...sources]))texture.dispose();
});

test('real atelier paints five uniform lacquers without photographed grooves or fabricated bump noise',()=>{
 const context={FINISHES,T,finishTextures:{},invalidate:noop};vm.createContext(context);vm.runInContext(functions.get('applyFurnitureMaterial'),context);
 assert.equal(FINISHES.filter(f=>f.textureMapped).length,1);
 for(const finish of FINISHES.filter(f=>!f.textureMapped)){
  // Even a stale cached photograph may not leak onto a uniform lacquer.
  const photograph=new T.Texture();context.finishTextures[finish.id]={map:photograph,front:photograph,bump:photograph,frontBump:photograph};
  const asset={spec:{facade:'RIBELLE'},wood:new T.MeshPhysicalMaterial(),frontWood:new T.MeshPhysicalMaterial(),setSurface:noop};
  context.applyFurnitureMaterial(asset,'cabinet',finish);
  for(const material of[asset.wood,asset.frontWood]){
   assert.equal(material.map,null);assert.equal(material.bumpMap,null);assert.equal(material.bumpScale,0);
   assert.equal(material.color.getHexString(),new T.Color(finish.hex).getHexString());assert.equal(material.roughness,finish.roughness);
   assert.equal(material.clearcoat,0);assert.equal(material.metalness,0);assert.equal(material.flatShading,false);material.dispose();
  }
  assert.equal(asset.furniturePlanTextures,null);photograph.dispose();
 }
});

test('real atelier keeps separate sharp source wood faces and skips all uniform photographic downloads',async()=>{
 const calls=[],textures=[];const context={FINISHES,T,quality:{mode:'auto',profile:{id:'fluid'}},finishTextures:{},
  renderer:{capabilities:{getMaxAnisotropy:()=>16}},tileAssetURL:url=>url,
  loadTexture:async(url,profile)=>{calls.push({url,profile});const texture=new T.Texture({src:url,width:32,height:32});textures.push(texture);return texture;},
  cacheTextures:(_key,load)=>load(),refreshFurnitureMaterials:noop,invalidate:noop};
 vm.createContext(context);vm.runInContext(functions.get('requestFinishAssets'),context);
 for(const finish of FINISHES.filter(f=>!f.textureMapped))assert.equal(await context.requestFinishAssets(finish.id),null);
 assert.equal(calls.length,0);
 const wood=FINISHES.find(f=>f.textureMapped),tx=await context.requestFinishAssets(wood.id);
 assert.equal(calls.length,1);assert.ok(calls.every(call=>call.profile==='balanced'),'auto economises optical effects without downsampling the grain to the manual minimum');
 assert.equal(tx.front.image.src,wood.frontTexture);assert.equal(tx.ribelleFront.image.src,wood.ribelleFrontTexture);
 assert.notEqual(tx.front,tx.ribelleFront);assert.equal(tx.frontBump.image,tx.front.image);assert.equal(tx.ribelleFrontBump.image,tx.ribelleFront.image);
 for(const value of Object.values(tx).filter(t=>t?.isTexture)){assert.equal(value.minFilter,T.LinearMipmapLinearFilter);assert.equal(value.magFilter,T.LinearFilter);assert.equal(value.anisotropy,16);value.dispose();}
 for(const texture of textures)texture.dispose();
});

test('Anima auto retains readable pixels and anisotropy while manual minimum and full HD stay intact',()=>{
 assert.equal(QUALITY_PROFILES[0],STUDIO_PROFILES[0]);assert.equal(QUALITY_PROFILES[2],STUDIO_PROFILES[2]);
 for(const mobile of[false,true]){
  const q=new AdaptiveQuality({mobile});assert.ok(q.profile.anisotropy>=8);
  const size=mobile?[390,600]:[1440,900];assert.ok(renderPixelRatio(q.profile,...size,1)>=1.3);
  for(let now=0;now<5000;now+=50)q.sample(now);
  assert.equal(q.level,2);assert.equal(q.profile,mobile?MOBILE_ECONOMY:AUTO_ECONOMY);
  assert.ok(renderPixelRatio(q.profile,...size,1)>=1);assert.equal(q.profile.anisotropy,8);assert.ok(profileSizes(q.profile,mobile).shadow>=512);
  q.setMode('fluid');assert.equal(q.profile,STUDIO_PROFILES[2]);assert.equal(q.profile.pixels,500000);assert.equal(q.profile.shadow,0);
  q.setMode('max');assert.equal(q.profile,STUDIO_PROFILES[0]);assert.equal(q.profile.pixels,8300000);
 }
 assert.match(source,/from '@anima-adapter\/render-quality.js'/,'actual app imports the isolated policy');
});

test('custom tops keep one fixed-density local field across nested meshes and every enlarged length',()=>{
 const material=new T.MeshPhysicalMaterial(),root=new T.Group(),nested=new T.Group();material.userData.animaSurface={source:{runtimeSize:[1500,1000]}};root.add(nested);nested.rotation.y=.21;
 const mesh=new T.Mesh(new T.BoxGeometry(1.2,.012,.465),material);nested.add(mesh);mesh.rotation.y=-.21;
 for(const width of[1.2,1.5,2.4,3.1]){
  mesh.geometry.dispose();mesh.geometry=new T.BoxGeometry(width,.012,.465);root.userData.animaTop={width,depth:.465,zOffset:0};
  applyPlanSurfaceUV(root,material);const uv=mesh.geometry.attributes.uv;
  assert.ok([...uv.array].every(Number.isFinite));
  const uRange=Math.max(...Array.from({length:uv.count},(_,i)=>uv.getX(i)))-Math.min(...Array.from({length:uv.count},(_,i)=>uv.getX(i)));
  assert.ok(Math.abs(uRange-(width+.024)/1.2)<1e-6,'longer plans reveal more of a fixed-scale pattern, including the two unfolded end thicknesses');
  const before=uv.array.slice();root.position.set(.7,.3,-.4);root.rotation.y+=.3;applyPlanSurfaceUV(root,material);
  assert.ok(mesh.geometry.attributes.uv.array.every((value,i)=>Math.abs(value-before[i])<1e-6),'texture moves with the plan when it is dragged or snaps');
  assert.equal(root.userData.animaSurfaceUV.mode,'fixed-metric-face-unfold');
 }
 mesh.geometry.dispose();material.dispose();
});

test('real plan material uses fixed-density charts and mirrored finite-image extension instead of stretched edge pixels',async()=>{
 const wood=new T.MeshPhysicalMaterial(),ceramic=new T.MeshPhysicalMaterial();
 const loader={async loadAsync(url){return new T.Texture({src:url,width:64,height:64});}};
 const controller=createTopSurfaceController({wood,ceramic,textureLoader:loader}),surface=MANUFACTURER_SURFACES.find(s=>s.family==='hpl'&&s.texture);
 controller.apply({topSurfaceId:surface.id},topSelection('thpl1-linear-top',120,'two'));await controller.ready();
 const texture=controller.material.map;assert.equal(texture.image.src,surface.texture);assert.equal(texture.wrapS,T.MirroredRepeatWrapping);assert.equal(texture.wrapT,T.MirroredRepeatWrapping);
 assert.deepEqual(texture.repeat.toArray(),[1,1]);assert.equal(texture.userData.animaMapping,'fixed-metric-face-unfold');controller.dispose();wood.dispose();ceramic.dispose();
});
