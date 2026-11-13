import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {parse} from 'acorn';
import * as T from 'three';
import {FINISHES,STUDIO_ONE_ALBA_APPEARANCE} from '../functions/neobath-anima/studio-adapter/finishes.js';
import {FINISHES as STUDIO_FINISHES} from '../studio-one/src/finishes.js';
import {transformCommonStudioSource} from '../functions/neobath-anima/studio-adapter/studio-source-transform.mjs';
import {setAnimaFurnitureTextures} from '../functions/neobath-anima/studio-adapter/premium-rendering.mjs';
const root=new URL('../',import.meta.url),wood=FINISHES.find(f=>f.id==='rovere-alba'),approved=STUDIO_FINISHES.find(f=>f.id==='ALBA'),noop=()=>{};
const app=transformCommonStudioSource(readFileSync(new URL('studio-one/src/app.js',root),'utf8'),'app.js'),preview=transformCommonStudioSource(readFileSync(new URL('studio-one/src/commerce/live-preview.js',root),'utf8'),'commerce/live-preview.js');
function nodes(ast){const out=[];function walk(n){if(!n||typeof n!=='object')return;if(typeof n.type==='string')out.push(n);for(const value of Object.values(n))if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')walk(value);}walk(ast);return out;}
const appNodes=nodes(parse(app,{ecmaVersion:'latest',sourceType:'module'})),previewNodes=nodes(parse(preview,{ecmaVersion:'latest',sourceType:'module'}));
function declaration(source,tree,name){const n=tree.find(n=>n.type==='FunctionDeclaration'&&n.id?.name===name);assert.ok(n,name);return source.slice(n.start,n.end);}
const renderer={capabilities:{getMaxAnisotropy:()=>16}},dimensions=url=>url.includes('alba-max')?[945,2048]:url.includes('alba-fluid')?[118,256]:[473,1024];
function texture(url){const [width,height]=dimensions(url),map=new T.Texture({src:url,width,height});map.colorSpace=T.SRGBColorSpace;return map;}
function disposeMaps(tx){for(const t of new Set(Object.values(tx||{}).filter(t=>t?.isTexture)))t.dispose();}
function asset(facade='PURA'){return {spec:{facade},root:new T.Group(),wood:new T.MeshPhysicalMaterial(),frontWood:new T.MeshPhysicalMaterial(),setSurface:noop,prepareSurface:async()=>{}};}

test('requested Alba replacement preserves the Anima commercial identity and exactly reuses the approved flat Studio One assets',()=>{
 assert.equal(wood.id,'rovere-alba');assert.equal(wood.name,'Rovere Alba');assert.equal(wood.refCode,'rovere-alba');
 for(const key of ['hex','roughness','frontRotation'])assert.equal(wood[key],approved[key],key);
 assert.deepEqual(wood.textureRepeat,approved.textureRepeat);assert.deepEqual(wood.frontRepeat,approved.frontRepeat);
 for(const profile of ['fluid','balanced','max'])assert.equal(wood.textureVariants[profile],'https://studio-one-beta-test-v2.vercel.app/assets/'+approved.textureVariants[profile]);
 assert.equal(wood.frontTexture,wood.texture);assert.equal(wood.ribelleFrontTexture,wood.texture);assert.equal(wood.sharedWoodTexture,true);assert.equal(wood.manufacturerSample,false);assert.equal(wood.source.requestedVisualReplacement,true);assert.equal(wood.source.calibratedNeobathSample,false);
 const native=readFileSync(new URL('studio-one/dist/assets/'+approved.textureVariants.max,root));assert.equal(createHash('sha256').update(native).digest('hex'),STUDIO_ONE_ALBA_APPEARANCE.maxSha256);assert.deepEqual(STUDIO_ONE_ALBA_APPEARANCE.maxNativeSize,[945,2048]);
 assert.equal(wood.clearcoat,.13);assert.equal(wood.clearcoatRoughness,.35);assert.equal(wood.bumpScale,.00045);assert.equal(wood.textureWrap,'repeat');assert.equal(wood.woodCrop,null);
 assert.equal(FINISHES.filter(f=>!f.textureMapped).length,5);for(const f of FINISHES.filter(f=>!f.textureMapped)){assert.equal(f.clearcoat,0);assert.equal(f.bumpScale,0);}
});

test('actual atelier loads one flat image at each quality, keeps MAX native, and never crops or recolours the approved sample',async()=>{
 for(const [profile,mode,effective]of [['max','max','max'],['balanced','balanced','balanced'],['fluid','fluid','balanced'],['fluid','auto','balanced']]){
  const calls=[],context={T,FINISHES,renderer,quality:{mode,profile:{id:profile}},finishTextures:{},tileAssetURL:x=>x,loadTexture:async(url,quality)=>{calls.push({url,quality});return texture(url);},cacheTextures:(_key,load)=>load(),refreshFurnitureMaterials:noop,invalidate:noop,document:{createElement(){throw Error('The flat ALBA sample must not be drawn, cropped or resampled.');}}};
  vm.createContext(context);vm.runInContext(declaration(app,appNodes,'requestFinishAssets'),context);const tx=await context.requestFinishAssets(wood.id);
  assert.equal(calls.length,1);assert.equal(calls[0].url,wood.textureVariants[effective]);assert.equal(calls[0].quality,effective);
  for(const m of ['front','ribelleFront']){assert.equal(tx[m].image,tx.map.image);assert.notEqual(tx[m],tx.map);assert.equal(tx[m].userData.animaWoodCrop,undefined);assert.equal(tx[m].colorSpace,T.SRGBColorSpace);assert.equal(tx[m].wrapS,T.RepeatWrapping);assert.equal(tx[m].anisotropy,16);}
  assert.equal(tx.front.rotation,Math.PI/2);assert.deepEqual(tx.front.repeat.toArray(),wood.frontRepeat);
  assert.equal(tx.ribelleFront.rotation,0);assert.deepEqual(tx.ribelleFront.repeat.toArray(),wood.textureRepeat);
  assert.equal(tx.frontBump.image,tx.map.image);assert.equal(tx.frontBump.rotation,tx.front.rotation);assert.equal(tx.ribelleFrontBump.rotation,0);assert.deepEqual(tx.ribelleFrontBump.repeat.toArray(),wood.textureRepeat);
  if(profile==='max')assert.equal(tx.map.image.height,2048);disposeMaps(tx);
 }
});

test('Pura drawers keep horizontal grain while Ribelle and columns keep vertical grain without tinting or mutating shared textures',async()=>{
 const context={T,FINISHES,renderer,quality:{mode:'max',profile:{id:'max'}},finishTextures:{},tileAssetURL:x=>x,loadTexture:async url=>texture(url),cacheTextures:(_key,load)=>load(),refreshFurnitureMaterials:noop,invalidate:noop};vm.createContext(context);vm.runInContext(declaration(app,appNodes,'requestFinishAssets')+'\n'+declaration(app,appNodes,'applyFurnitureMaterial'),context);const tx=await context.requestFinishAssets(wood.id),before=Object.fromEntries(['map','front','ribelleFront'].map(k=>[k,{rotation:tx[k].rotation,repeat:tx[k].repeat.toArray()}]));
 for(const [type,facade,expected]of [['cabinet','PURA','front'],['cabinet','RIBELLE','ribelleFront'],['column','PURA','ribelleFront'],['column','RIBELLE','ribelleFront']]){
  for(const paint of [(a)=>context.applyFurnitureMaterial(a,type,wood),(a)=>setAnimaFurnitureTextures(a,type,wood,tx,renderer)]){
   const a=asset(facade);paint(a);assert.equal(a.wood.map,tx.map);assert.equal(a.frontWood.map,tx[expected]);assert.equal(a.frontWood.bumpMap,tx[expected+'Bump']);
   for(const m of [a.wood,a.frontWood]){assert.equal(m.color.getHexString(),'ffffff');assert.equal(m.roughness,.46);assert.equal(m.clearcoat,.13);assert.equal(m.clearcoatRoughness,.35);assert.equal(m.bumpScale,.00045);assert.equal(m.metalness,0);m.dispose();}
  }
 }
 for(const [key,saved]of Object.entries(before)){assert.equal(tx[key].rotation,saved.rotation);assert.deepEqual(tx[key].repeat.toArray(),saved.repeat);}disposeMaps(tx);
});

function previewContext(profile='balanced',premium=null){
 const calls=[],FakeThree={...T,TextureLoader:class{async loadAsync(url){calls.push(url);return texture(url);}}};
 const context={disposed:false,dimensions:null,presentation:null,premium,preparePresentationFinish:noop,options:{},T:FakeThree,FINISHES,renderer,workingProfile:()=>profile,__animaAsset:x=>x,textures:new Map(),revision:0,lastProject:null,lastConfiguration:'',lastStructure:'',lastShape:'',current:null,innerWidth:1440,geometryBuilds:0,scene:new T.Scene(),disposeCurrent:noop,previewItems:p=>p.items,previewStructure:p=>JSON.stringify(p.items.map(i=>[i.id,i.type,i.settings])),applyPreviewSettings:noop,fit:noop,invalidate:noop,controls:{enabled:true},sun:{shadow:{map:null,mapSize:new T.Vector2(),needsUpdate:false}},buildPreview(project){const group=new T.Group(),items=project.items.map(i=>({...i,asset:asset(i.settings.format?.includes('ribelle')?'RIBELLE':'PURA')}));for(const i of items)group.add(i.asset.root);return {group,items};}};
 vm.createContext(context);vm.runInContext(declaration(preview,previewNodes,'texture')+'\n'+declaration(preview,previewNodes,'update'),context);return {context,calls};
}
const project={room:{points:[[0,0],[300,0],[300,300],[0,300]]},items:[['pura','cabinet','pura-base-two'],['ribelle','cabinet','ribelle-base-two'],['column-pura','column','pura-column'],['column-ribelle','column','ribelle-column']].map(([id,type,format])=>({id,type,settings:{format,finish:'rovere-alba',width:80},placement:{wall:0,u:100,height:30}}))};
function checkPainted(items,profile){for(const item of items){const vertical=item.type==='column'||item.asset.spec.facade==='RIBELLE';assert.equal(item.asset.wood.map.image.src,wood.textureVariants[profile]);assert.equal(item.asset.frontWood.map.image.src,wood.textureVariants[profile]);assert.equal(item.asset.frontWood.map.rotation,vertical?0:Math.PI/2,item.id);assert.deepEqual(item.asset.frontWood.map.repeat.toArray(),vertical?wood.textureRepeat:wood.frontRepeat,item.id);assert.equal(item.asset.frontWood.bumpMap.image,item.asset.frontWood.map.image);assert.equal(item.asset.frontWood.color.getHexString(),'ffffff');assert.equal(item.asset.frontWood.roughness,.46);assert.equal(item.asset.frontWood.clearcoat,.13);}}
async function disposePreview(context){for(const pending of context.textures.values())disposeMaps(await pending);for(const item of context.current?.items||[]){item.asset.wood.dispose();item.asset.frontWood.dispose();}}

test('premium Anima preview loads both grain orientations without introducing bump maps or duplicate downloads',async()=>{
 const {context,calls}=previewContext('max',{});let prepared=0;context.preparePresentationFinish=()=>prepared++;
 const tx=await context.texture(wood.id);
 assert.equal(calls.length,1);assert.equal(calls[0],wood.textureVariants.max);assert.equal(prepared,1);
 assert.equal(tx.front.image,tx.map.image);assert.equal(tx.ribelleFront.image,tx.map.image);
 assert.equal(tx.front.rotation,Math.PI/2);assert.equal(tx.ribelleFront.rotation,0);
 assert.deepEqual(tx.front.repeat.toArray(),wood.frontRepeat);assert.deepEqual(tx.ribelleFront.repeat.toArray(),wood.textureRepeat);
 for(const key of ['bump','frontBump','ribelleFrontBump'])assert.equal(tx[key],null,key);
 await disposePreview(context);
});

test('a closed Anima preview does not start texture loading or replace the current scene',async()=>{
 const {context,calls}=previewContext();context.disposed=true;
 assert.equal(await context.update(project),false);assert.equal(calls.length,0);assert.equal(context.current,null);
});

test('the actual live preview, column thumbnail paint and HD preparation use the same flat sample and per-model orientation',async()=>{
 const {context,calls}=previewContext();await context.update(project);assert.equal(calls.length,1);checkPainted(context.current.items,'balanced');
 const renderNode=previewNodes.find(n=>n.type==='FunctionDeclaration'&&n.id?.name==='renderThumbnail'),loop=previewNodes.find(n=>n.type==='ForOfStatement'&&n.start>renderNode.start&&n.end<renderNode.end&&preview.slice(n.right.start,n.right.end)==='candidate.items');assert.ok(loop);
 context.candidate=context.buildPreview({...project,items:project.items.filter(i=>i.type==='column')});vm.runInContext('async function paintActualColumnThumbnail(){'+preview.slice(loop.start,loop.end)+'}',context);await context.paintActualColumnThumbnail();checkPainted(context.candidate.items,'balanced');assert.equal(calls.length,1);
 const prepare=previewNodes.find(n=>n.type==='Property'&&n.method&&n.key.name==='prepare');assert.ok(prepare);vm.runInContext('async function prepareActualHD(previous)'+preview.slice(prepare.value.body.start,prepare.value.body.end),context);await context.prepareActualHD({reflections:[]});assert.equal(calls.length,2);assert.equal(calls[1],wood.textureVariants.max);checkPainted(context.current.items,'max');await disposePreview(context);
});
