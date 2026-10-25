import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as T from 'three';
import {COLLECTIONS,tileFormat,formatsForColor,normalizeLayout} from '../src/surface-catalog.js';
import {commercialProduct,commercialOptions} from '../src/surface-commerce.js';
import {resolveSurfaceTexture,finishForSurface} from '../src/surface-texture-selection.js';
import {createSurface} from '../src/room.js';
import {disposeObject} from '../src/composition.js';
import {applyTileColors} from '../src/tile-colors.js';
import {AdaptiveQuality} from '../src/performance.js';
import {createHDCapture,captureSize} from '../src/hd-capture.js';
import {collectNicheFinishes} from '../../shared/lrf-3d/niches.js';
import {selectedFormat} from '../src/surface-picker.js';
import {selectedCommercialSurface,surfaceFinishAppearance,applySurfaceTextureMapping,disposeSurfaceTextureClones} from '../../shared/lrf-3d/surface-appearance.js';

// These are the eight exact non-rectified R10 references in the reviewed
// commercial catalogue, not references inferred from an image colour.
for(const [colorId,references]of Object.entries({white:['00Y2C00','00Y2900'],honey:['00Y2C40','00Y2940'],amber:['00Y2C70','00Y2970'],natural:['00Y2C60','00Y2960']})){
 const definition=COLLECTIONS.Quercia.colors.find(color=>color.id===colorId),previous=definition.textureVariantsByReference;
 definition.textureVariantsByReference=Object.fromEntries(references.map((reference,index)=>[reference,{verified:true,format:index?'20.3x90.6':'24x120',textureRotation:0,textureVariants:Object.fromEntries(['fluid','balanced','max'].map(profile=>[profile,Array.from({length:reference==='00Y2C70'?13:15},(_,face)=>`https://texture-fixture.invalid/quercia/${reference}/${profile}/${face}.webp`)]))}]));
 try{
  for(const [index,format]of ['24x120','20.3x90.6'].entries()){
   const geometry=COLLECTIONS.Quercia.formats.find(item=>item.id===format),finish=finishForSurface('Quercia',colorId,geometry,{catalogueKey:'ELIOS|stale-previous-format'});
   for(const profile of ['fluid','balanced','max']){
    const selected=resolveSurfaceTexture('Quercia',colorId,profile,finish);
    assert(selected.mapped);assert.equal(selected.reference,references[index],`${colorId} ${format} defaults to the exact R10 reference`);assert.equal(selected.nativeFaceCount,references[index]==='00Y2C70'?13:15);assert.equal(selected.files.length,profile==='fluid'?4:profile==='balanced'?6:selected.nativeFaceCount);assert(selected.files.length<=40);
   }
   const outdoor=commercialOptions({collection:'Quercia',color:colorId,format}).find(product=>product.finish.startsWith('Outdoor'));
   assert(outdoor);assert(!resolveSurfaceTexture('Quercia',colorId,'max',{format,catalogueKey:outdoor.key}).mapped,'outdoor R11 never borrows its R10 neighbour');
  }
  assert(!resolveSurfaceTexture('Quercia',colorId,'max',{format:'23.4x119.5'}).mapped,'rectified dimensions require their own native reference');
 }finally{if(previous===undefined)delete definition.textureVariantsByReference;else definition.textureVariantsByReference=previous;}
}

const color=COLLECTIONS.Creta.colors.find(c=>c.id==='zucchero'),original=color.textureVariantsByReference;
const finish={collection:'Creta',color:'zucchero',format:'60x120'},product=commercialProduct(finish);
assert.equal(product.reference,'03V6A00');finish.catalogueKey=product.key;
const urls=profile=>[0,1].map(face=>`https://texture-fixture.invalid/${profile}/${face}.webp`);
const mapping={verified:true,format:'60x120',textureRotation:0,textureVariants:Object.fromEntries(['fluid','balanced','max'].map(profile=>[profile,urls(profile)]))};
color.textureVariantsByReference={[product.reference]:mapping};
try{
 const rectangle=resolveSurfaceTexture('Creta','zucchero','fluid',finish),square=resolveSurfaceTexture('Creta','zucchero','fluid',{format:'60x60'});
 assert(rectangle.mapped);assert(!square.mapped);assert.notEqual(rectangle.sourceKey,square.sourceKey);
 assert.deepEqual(rectangle.files,urls('fluid'));assert(!square.files.some(url=>url.includes('texture-fixture')),'square tiles retain their previous source');
 const otherFinish=commercialOptions(finish).find(p=>p.reference!==product.reference);
 assert(otherFinish,'the real catalogue contains another finish of this format');
 assert(!resolveSurfaceTexture('Creta','zucchero','fluid',{...finish,catalogueKey:otherFinish.key}).mapped,'another commercial reference does not borrow the R9 face');
 const view=resolveSurfaceTexture('Corso','beige','fluid',{format:'60x90'});
 assert(!view.mapped);const viewColor=COLLECTIONS.Corso.colors.find(c=>c.id==='beige');assert.deepEqual(view.files,viewColor.faces?.length?viewColor.faces:[viewColor.file]);
 assert.equal(finishForSurface('Creta','zucchero',{width:.6,height:.6},finish).format,'60x60','actual layout wins over stale saved format');
 assert(!resolveSurfaceTexture('Creta','zucchero','fluid',{...finish,texturePattern:'opus'}).mapped,'multiformat components cannot share one rectangular native reference');
 const unknownSize=finishForSurface('Creta','zucchero',{width:.73,height:.73},finish);assert.equal(unknownSize.format,'');assert(!resolveSurfaceTexture('Creta','zucchero','fluid',unknownSize).mapped,'unknown geometry cannot reuse a stale mapped format');

 const floor=createSurface([[0,0],[3,0],[3,3],[0,3]],'Reference floor'),wall=createSurface([[0,0],[3,0],[3,2.6],[0,2.6]],'Legacy square wall');
 floor.setLayout({width:1.2,height:.6});wall.setLayout({width:.6,height:.6});
 const roomScene={floor,walls:[wall]},floorDesign={...finish,zones:[]},wallFinishes=[{collection:'Creta',color:'zucchero',format:'60x60'}];
 const quality=new AdaptiveQuality();quality.setMode('fluid');const loaded=[],disposed=[];
 const source=readFileSync('src/app.js','utf8'),code=source.slice(source.indexOf('function disposeTextureSet('),source.indexOf('function applyApronMaterial('));
 const context=vm.createContext({T,AbortController,COLLECTIONS,tileFormat,formatsForColor,normalizeLayout,collectNicheFinishes,roomConfig:{niches:[]},commercialProduct,commercialOptions,selectedFormat,selectedCommercialSurface,surfaceFinishAppearance,applySurfaceTextureMapping,disposeSurfaceTextureClones,resolveSurfaceTexture,finishForSurface,quality,
  textureCache:new Map(),textureFlights:new Map(),surfaceTextures:{floor:{},wall:{}},finishTextures:{},textureRefresh:Promise.resolve(),captureBusy:false,
  roomScene,floorDesign,wallFinishes,composition:{items:[]},state:{ready:true,floorCollection:'Creta',floor:'zucchero',wallCollection:'Creta',wall:'zucchero'},FINISHES:[],selectedWall:0,
  paintTexture:null,tileAssetURL:file=>file,refreshFurnitureMaterials(){},refreshLayouts(){},refreshSurfacePickerHosts(){},refreshInspector(){},invalidate(){},placementStatus(){},
  async loadTexture(url,profile){loaded.push({url,profile});const texture=new T.Texture({width:profile==='max'?4096:profile==='balanced'?1024:256,height:profile==='max'?2048:profile==='balanced'?512:128});texture.userData.quality={url,profile};texture.addEventListener('dispose',()=>disposed.push(url));return texture;},
 });
 vm.runInContext(code,context);
 context.applyAllRoomMaterials=()=>{context.updateSurfaceMaterial(floor,'Creta','zucchero',null,0,floorDesign);context.updateSurfaceMaterial(wall,'Creta','zucchero',null,0,wallFinishes[0]);};
 await context.prepareActiveTextures();
 assert.equal(floor.material.map.userData.quality.url,urls('fluid')[0]);assert(!wall.material.map.userData.quality.url.includes('texture-fixture'));
 assert.equal(context.textureCache.size,2,'one colour can simultaneously use native rectangle and legacy square sources');
 const variantMaterials=[];applyTileColors(floor,finish,(id,variant)=>{variantMaterials.push(variant);return new T.MeshPhysicalMaterial();});
 assert(variantMaterials.includes(1),'real tile grouping visits the second native face despite the legacy single-face definition');

 let rendered=0,size=new T.Vector2(1280,720),ratio=1;
 Object.assign(context,{createHDCapture,captureSize,lastCapture:null,sceneRevision:0,running:false,scene:{},ultraPipeline:null,controls:{enabled:true},document:{body:{inert:false}},camera:{aspect:16/9,updateProjectionMatrix(){}},stage:{clientWidth:1280,clientHeight:720},canvas:{toDataURL:()=> 'data:image/png;base64,fixture'},applyQuality(){},
  renderer:{capabilities:{maxTextureSize:4096,maxRenderbufferSize:4096},shadowMap:{needsUpdate:false},getSize:v=>v.copy(size),getPixelRatio:()=>ratio,setPixelRatio:value=>ratio=value,setSize:(w,h)=>size.set(w,h),compileAsync:async()=>{},render(){rendered++;assert.equal(quality.profile.id,'max');assert.equal(floor.material.map.userData.quality.url,urls('max')[0]);assert.equal(wall.material.map.userData.quality.profile,'max');}},
 });
 vm.runInContext(source.slice(source.indexOf('const captureHD=createHDCapture('),source.indexOf('async function exportImage('))+'\nglobalThis.fixtureCapture=captureHD;',context);
 assert.equal(await context.fixtureCapture(),'data:image/png;base64,fixture');assert.equal(rendered,1);
 assert.equal(quality.profile.id,'fluid');assert.equal(floor.material.map.userData.quality.url,urls('fluid')[0]);assert.equal(context.captureBusy,false);assert.equal(context.controls.enabled,true);assert.equal(context.document.body.inert,false);assert.equal(context.textureCache.size,2);
 delete mapping.textureVariants.max;
 await assert.rejects(context.fixtureCapture(),/visuel matière/,'missing native HD fails instead of using the old colour swatch');
 assert.equal(quality.profile.id,'fluid');assert.equal(floor.material.map.userData.quality.url,urls('fluid')[0]);assert.equal(context.captureBusy,false);mapping.textureVariants.max=urls('max');

 const formatLine=source.split('\n').find(line=>line.startsWith('function setTileFormat('));vm.runInContext(formatLine,context);
 assert(context.setTileFormat('floor','60x60'));await context.textureRefresh;
 assert.equal(floor.material.map,wall.material.map,'format change reloads the correct legacy square source');assert.equal(context.textureCache.size,1,'inactive mapped rectangle cache is released');
 assert(context.setTileFormat('floor','60x120'));await context.textureRefresh;
 assert.equal(floor.material.map.userData.quality.url,urls('fluid')[0]);assert.equal(context.textureCache.size,2);assert(loaded.some(item=>item.url===urls('max')[1]));assert(disposed.some(url=>url===urls('max')[0]));
 // A mobile user can select manual max for editing, then capture every native
 // face, without retaining that larger set after capture restores the scene.
 quality.setMobile(true);quality.setMode('max');
 mapping.textureVariants.max=Array.from({length:15},(_,face)=>`https://texture-fixture.invalid/max/${face}.webp`);
 // All reviewed profiles describe these same fifteen manufacturer faces.
 for(const profile of ['fluid','balanced'])mapping.textureVariants[profile]=Array.from({length:15},(_,face)=>`https://texture-fixture.invalid/${profile}/${face}.webp`);
 await context.prepareActiveTextures();
 let rectangleTextures=()=>context.surfaceTextures.wall[resolveSurfaceTexture('Creta','zucchero','max',finish).sourceKey];
 assert.equal(rectangleTextures().faces.length,8,'mobile manual max remains within eight native faces');
 const beforeMobileCapture=loaded.length;
 await context.fixtureCapture();
 assert.equal(rectangleTextures().faces.length,8,'capture restores the original eight-face working set');
 assert(loaded.slice(beforeMobileCapture).some(entry=>entry.url.endsWith('/max/14.webp')),'HD capture really loads native face fifteen');
 assert.equal(context.quality.textureExporting,false);

 // Exercise the real app orchestration with a cancellable decode in flight.
 // The mock delays image completion; it does not replace any selection logic.
 let cancelled=0,created=0;
 context.loadTexture=(url,profile,{signal}={})=>new Promise((resolve,reject)=>{
  const cancel=()=>{clearTimeout(timer);cancelled++;reject(Object.assign(Error('superseded'),{name:'AbortError'}));};
  const timer=setTimeout(()=>{signal?.removeEventListener('abort',cancel);created++;const texture=new T.Texture({width:256,height:52});texture.userData.quality={url,profile};texture.addEventListener('dispose',()=>disposed.push(url));resolve(texture);},8);
  signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();
 });
 quality.setMode('fluid');floor.setLayout({width:1.2,height:.24});
 context.applyAllRoomMaterials=()=>{context.updateSurfaceMaterial(floor,context.state.floorCollection,context.state.floor,null,0,context.floorDesign);context.updateSurfaceMaterial(wall,'Creta','zucchero',null,0,wallFinishes[0]);};
 const choices=[];
 for(const id of ['white','honey','amber','natural']){
  context.state.floorCollection='Quercia';context.state.floor=id;context.floorDesign={collection:'Quercia',color:id,format:'24x120'};
  choices.push(context.prepareActiveTextures());
 }
 await Promise.all(choices);
 assert(cancelled>=3,'intermediate colours abort their running decode');
 const activeQuercia=Object.values(context.surfaceTextures.Quercia);
 assert.equal(activeQuercia.length,1);assert.equal(activeQuercia[0].id,'natural');assert.equal(activeQuercia[0].faces.length,4);
 assert.equal(context.textureFlights.size,0);assert(created<=6,'intermediate colours do not finish their full face sets');
 disposeObject(floor.group);disposeObject(wall.group);
 console.log('Studio texture references: real format/reference isolation, other manufacturers, native face variation, format reload/cache release and HD success/failure restoration, mobile8→15→8 capture and rapid-choice cancellation passed.');
}finally{if(original===undefined)delete color.textureVariantsByReference;else color.textureVariantsByReference=original;}
