import assert from 'node:assert/strict';
import {Texture,MeshPhysicalMaterial,SRGBColorSpace,NoColorSpace,Vector2} from 'three';
import {surfaceFinishAppearance,texturePhysicalCrop,applySurfaceTextureMapping,selectedCommercialSurface} from '../surface-appearance.js';
import {surfacePreviewNote} from '../surface-picker.js';
const honed=surfaceFinishAppearance({collection:'Dynasty',finish:'3D Honed'}),matt=surfaceFinishAppearance({collection:'Stone Icon',finish:'Matt'}),grip=surfaceFinishAppearance({collection:'Stone Icon',finish:'Tumbled Grip · R11 C'});
assert(honed.roughness<matt.roughness&&matt.roughness<grip.roughness);assert.equal(grip.clearcoat,0);assert.equal(surfaceFinishAppearance({collection:'Stone Icon',finish:'R9 · Rectifié',roughness:.76}).roughness,.76,'Slip rating cannot be converted into an undocumented satin finish');
assert.equal(surfaceFinishAppearance({collection:'Creta',finish:'',roughness:.82}).roughness,.82,'Existing unlabelled materials keep their reviewed appearance');
const products=[{key:'a',reference:'ref-a',finish:'Matt'},{key:'b',reference:'ref-b',finish:'3D Honed'}];
assert.equal(selectedCommercialSurface({catalogueKey:'b'},products).reference,'ref-b');assert.equal(selectedCommercialSurface({reference:'ref-b'},products).key,'b');
const choice={texturePhysicalSize:[1.48,.234],textureProvenance:{kind:'ai-reconstruction',facesPerColor:8},faces:Array(8).fill('face.webp')};
assert.equal(surfacePreviewNote(choice),'Reconstitution visuelle · 8 tampons par couleur · teinte indicative.');assert(surfacePreviewNote({previewReviewed:true,definitionLimited:true}).includes('Échantillon du catalogue fabricant'));
let materialClones=0;
for(const [width,height]of [[1.195,.234],[1.48,.234],[.957,.234],[.407,.075]])for(const direction of ['horizontal','vertical'])for(let face=0;face<8;face++){
 const source=new Texture({width:1122,height:175}),bump=new Texture({width:1122,height:175});source.colorSpace=SRGBColorSpace;bump.colorSpace=NoColorSpace;source.anisotropy=8;const original={repeat:source.repeat.toArray(),offset:source.offset.toArray(),rotation:source.rotation},material=new MeshPhysicalMaterial(),crop=texturePhysicalCrop(choice,{width,height,direction});
 const sourceDisposed=[];source.addEventListener('dispose',()=>sourceDisposed.push('map'));bump.addEventListener('dispose',()=>sourceDisposed.push('bump'));
 applySurfaceTextureMapping(material,{map:source,bumpMap:bump,choice,layout:{width,height,direction}});
 assert.equal(material.map.image,source.image);assert.equal(material.bumpMap.image,bump.image);assert.equal(material.map.colorSpace,SRGBColorSpace);assert.equal(material.bumpMap.colorSpace,NoColorSpace);assert.equal(material.map.anisotropy,8);
 assert.deepEqual(source.repeat.toArray(),original.repeat);assert.deepEqual(source.offset.toArray(),original.offset);assert.equal(source.rotation,original.rotation);
 assert(Math.abs(crop.repeat[0]-width/1.48)<1e-12);assert(Math.abs(crop.repeat[1]-height/.234)<1e-12);
 if(width!==1.48){assert.notEqual(material.map,source);assert.notEqual(material.bumpMap,bump);assert.deepEqual(material.map.repeat.toArray(),crop.repeat);assert.deepEqual(material.bumpMap.repeat.toArray(),crop.repeat);assert.deepEqual(material.map.offset.toArray(),crop.offset);materialClones+=2;
  let disposed=0;material.map.addEventListener('dispose',()=>disposed++);material.bumpMap.addEventListener('dispose',()=>disposed++);
  applySurfaceTextureMapping(material,{map:source,bumpMap:bump,choice,layout:{width:1.48,height:.234,direction}});assert.equal(disposed,2,'Changing format releases the earlier local crop');assert.equal(material.map,source);assert.equal(material.bumpMap,bump);
 }
 material.dispose();assert.deepEqual(sourceDisposed,[],'A material never disposes the shared source textures');source.dispose();bump.dispose();
}
// A crop is also released when a surface, zone or room disposes the material.
const material=new MeshPhysicalMaterial(),map=new Texture({width:1122,height:175}),bump=new Texture({width:1122,height:175});applySurfaceTextureMapping(material,{map,bumpMap:bump,choice,layout:{width:.957,height:.234}});let disposed=0;material.map.addEventListener('dispose',()=>disposed++);material.bumpMap.addEventListener('dispose',()=>disposed++);material.dispose();assert.equal(disposed,2);assert.equal(material.lrfTileMapClone,undefined);assert.equal(material.lrfTileBumpClone,undefined);
// Legacy tall samples still rotate on a material-local clone without changing source.
const tall=new Texture({width:100,height:800}),legacy=new MeshPhysicalMaterial();applySurfaceTextureMapping(legacy,{map:tall,layout:{width:1.2,height:.6}});assert.equal(tall.rotation,0);assert.equal(legacy.map.rotation,Math.PI/2);legacy.dispose();
assert.equal(texturePhysicalCrop(choice,{width:1.6,height:.234}),null,'A source cannot be cropped beyond its physical dimensions');
console.log(JSON.stringify({passed:true,checks:['exact finish/reference resolution','indicative satin/matt/grip response without inferring finish from R rating','honest reconstructed and catalogue-preview notices','four physical formats × two directions × eight faces','shared source textures preserved; cropped map and bump disposed on replacement and material disposal','legacy portrait source rotation preserved'],materialClones},null,2));
