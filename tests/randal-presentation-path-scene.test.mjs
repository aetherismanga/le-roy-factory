import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createPathTracingScene} from '../shared/lrf-3d/randal-presentation-path-scene.js';
import {createSurface} from '../shared/lrf-3d/room.js';
import {applyTileColors} from '../shared/lrf-3d/tile-colors.js';
import {makeMirrorReflector} from '../shared/lrf-3d/mirror-reflection.js';
import {applyMirrorLighting} from '../shared/lrf-3d/mirror-lighting.js';

const close=(a,b,label)=>assert.ok(Math.abs(a-b)<1e-9,label);
function assertMatrix(actual,expected){for(let i=0;i<16;i++)close(actual.elements[i],expected.elements[i],'world matrix component '+i);}
function materials(object){return object.material?(Array.isArray(object.material)?object.material:[object.material]):[];}
function disposeSource(root){const geometries=new Set(),mats=new Set();root.traverse(o=>{if(o.isReflector)o.getRenderTarget().dispose();if(o.geometry)geometries.add(o.geometry);for(const m of materials(o))mats.add(m);});for(const g of geometries)g.dispose();for(const m of mats)m.dispose();}

for(const variant of ['studio-one','randal-general'])test(variant+': photoreal snapshot keeps actual furniture, visible basins and physical mirror shape',async()=>{
 const {buildPreview,mirrorGeometry}=await import('../'+variant+'/src/commerce/preview-model.js');
 const {draftProject,initialDraft}=await import('../'+variant+'/src/commerce/guided.js');
 const project=draftProject({...initialDraft(variant==='randal-general'?'aruba':undefined),column:true,mirror:'ilse',top:'sella'}),source=new T.Scene(),model=buildPreview(project);source.add(model.group);
 const mirror=model.items.find(i=>i.type==='mirror');applyMirrorLighting(mirror,false);
 const reflector=makeMirrorReflector(mirrorGeometry(mirror.settings,.009),{textureWidth:32,textureHeight:32});reflector.name='review_real_mirror';reflector.position.z=.009;mirror.asset.root.add(reflector);
 model.group.position.set(.31,.07,.42);model.group.rotation.y=.17;source.updateMatrixWorld(true);
 const sourceMeshes=[];source.traverseVisible(o=>{if(o.isMesh&&!o.isReflector&&!o.material?.isShaderMaterial)sourceMeshes.push(o);});sourceMeshes.forEach((o,index)=>o.name=(o.name||'mesh')+'__review_'+index);
 const snapshot=createPathTracingScene(source);
 try{
  snapshot.scene.updateMatrixWorld(true);
  const physical=snapshot.scene.getObjectByName(reflector.name);assert.ok(physical?.isMesh);assert.equal(!!physical.isReflector,false);assert.equal(physical.material.isMeshPhysicalMaterial,true);assert.equal(physical.material.metalness,1);assert.ok(physical.material.roughness<=.02);assertMatrix(physical.matrixWorld,reflector.matrixWorld);
  assert.notEqual(physical.geometry,reflector.geometry);assert.deepEqual(Array.from(physical.geometry.attributes.position.array),Array.from(reflector.geometry.attributes.position.array));assert.deepEqual(Array.from(physical.geometry.attributes.uv.array),Array.from(reflector.geometry.attributes.uv.array));
  for(const o of sourceMeshes){const match=snapshot.scene.getObjectByName(o.name);if(!o.name||!match)continue;assert.equal(match.geometry.attributes.position.count,o.geometry.attributes.position.count,o.name+' keeps its real geometry');}
  const hidden=model.items.find(i=>i.type==='cabinet').asset.root.getObjectByName('Vasque_encastree_tampa');assert.equal(hidden.visible,false);assert.equal(snapshot.scene.getObjectByName('Vasque_TAMPA_coque_3D'),undefined,'alternate hidden basin is not ray traced');
  let physicalLEDs=0;snapshot.scene.traverse(o=>{if(o.isMesh&&materials(o).some(m=>m.isMeshPhysicalMaterial&&m.emissiveIntensity>0&&m.emissive?.getHex()>0))physicalLEDs++;});assert.ok(physicalLEDs>0,'visible actual LED strips become physical emitters');
  const visibleMeshes=[];snapshot.scene.traverse(o=>{if(o.isMesh)visibleMeshes.push(o);});assert.equal(snapshot.stats.meshes,visibleMeshes.length);assert.equal(snapshot.stats.triangles,visibleMeshes.reduce((n,o)=>n+(o.geometry.index?.count||o.geometry.attributes.position.count)/3,0));assert.equal(snapshot.stats.mirrors,1);
 }finally{snapshot.dispose();disposeSource(source);}
});

test('snapshot preserves four distinct manufacturer tile faces and all continuous decor UVs',()=>{
 const source=new T.Scene(),stone=createSurface([[0,0],[3.6,0],[3.6,2.4],[0,2.4]],'review_stone'),allure=createSurface([[0,0],[3.6,0],[3.6,2.4],[0,2.4]],'review_allure');
 const textures=Array.from({length:4},(_,n)=>{const t=new T.Texture({width:8,height:8});t.name='manufacturer-face-'+n;t.rotation=.25;t.repeat.set(.5,1);t.offset.set(.25,0);return t;});
 stone.setLayout({width:.9,height:.6,pattern:'straight',groutWidth:2});stone.material.map=textures[0];stone.material.userData.lrfTextureFaceCount=4;applyTileColors(stone,{collection:'Stone Icon',color:'leccese',format:'60x90'},(_color,index)=>new T.MeshPhysicalMaterial({map:textures[index]}));stone.tiles.name='review_stone_tiles';
 allure.setLayout({width:1.2,height:.6,pattern:'straight',groutWidth:2,x:-23,y:17});applyTileColors(allure,{collection:'Allure',color:'eden',format:'60x120'},()=>allure.material);allure.tiles.name='review_allure_tiles';source.add(stone.group,allure.group);
 const originalUV=Array.from(allure.tiles.geometry.attributes.uv.array),snapshot=createPathTracingScene(source);
 try{const copied=snapshot.scene.getObjectByName(stone.tiles.name);assert.deepEqual(copied.geometry.groups,stone.tiles.geometry.groups);assert.deepEqual(Array.from(copied.geometry.index.array),Array.from(stone.tiles.geometry.index.array));assert.equal(copied.material.length,4);assert.deepEqual(copied.material.map(m=>m.map),stone.tiles.material.map(m=>m.map));assert.equal(new Set(copied.material.map(m=>m.map)).size,4);for(const t of textures){assert.equal(t.rotation,.25);assert.deepEqual(t.repeat.toArray(),[.5,1]);assert.deepEqual(t.offset.toArray(),[.25,0]);}assert.deepEqual(Array.from(snapshot.scene.getObjectByName(allure.tiles.name).geometry.attributes.uv.array),originalUV);assert.deepEqual(Array.from(allure.tiles.geometry.attributes.uv.array),originalUV);}
 finally{snapshot.dispose();disposeSource(source);textures.forEach(t=>t.dispose());}
});

test('hidden ancestor meshes and lights, shader halos and editor guides are absent from the photo',()=>{
 const source=new T.Scene(),hidden=new T.Group();hidden.visible=false;source.add(hidden);const hiddenMesh=new T.Mesh(new T.BoxGeometry(),new T.MeshPhysicalMaterial());hiddenMesh.name='hidden_mesh';hidden.add(hiddenMesh);const hiddenLight=new T.RectAreaLight();hiddenLight.name='hidden_light';hidden.add(hiddenLight);
 const halo=new T.Mesh(new T.PlaneGeometry(),new T.ShaderMaterial());halo.name='Halo_mural_LED';source.add(halo);const helper=new T.BoxHelper(new T.Mesh(new T.BoxGeometry(),new T.MeshBasicMaterial()));helper.name='editor_box';source.add(helper);const lamp=new T.RectAreaLight('#fff',3,1,2);lamp.position.set(2,3,4);lamp.rotation.y=.3;lamp.name='real_light';source.add(lamp);source.updateMatrixWorld(true);
 const snapshot=createPathTracingScene(source);try{for(const name of ['hidden_mesh','hidden_light','Halo_mural_LED','editor_box'])assert.equal(snapshot.scene.getObjectByName(name),undefined,name);const copied=snapshot.scene.getObjectByName(lamp.name);assert.ok(copied.isRectAreaLight);assertMatrix(copied.matrixWorld,lamp.matrixWorld);assert.equal(copied.intensity,3);assert.equal(copied.width,1);assert.equal(copied.height,2);}finally{snapshot.dispose();disposeSource(source);}
});

test('snapshot owns its geometry and materials while renderer textures stay untouched after repeated disposal',()=>{
 const source=new T.Scene(),texture=new T.Texture({width:8,height:8}),geometry=new T.BoxGeometry(),material=new T.MeshPhysicalMaterial({map:texture}),mesh=new T.Mesh(geometry,material);mesh.name='owned_copy';source.add(mesh);let originalGeometryDisposals=0,originalMaterialDisposals=0,textureDisposals=0;geometry.addEventListener('dispose',()=>originalGeometryDisposals++);material.addEventListener('dispose',()=>originalMaterialDisposals++);texture.addEventListener('dispose',()=>textureDisposals++);
 const snapshot=createPathTracingScene(source),copy=snapshot.scene.getObjectByName(mesh.name);assert.notEqual(copy.geometry,geometry);assert.notEqual(copy.material,material);assert.equal(copy.material.map,texture);let copiedGeometryDisposals=0,copiedMaterialDisposals=0;copy.geometry.addEventListener('dispose',()=>copiedGeometryDisposals++);copy.material.addEventListener('dispose',()=>copiedMaterialDisposals++);
 snapshot.dispose();snapshot.dispose();assert.equal(copiedGeometryDisposals,1);assert.equal(copiedMaterialDisposals,1);assert.equal(originalGeometryDisposals,0);assert.equal(originalMaterialDisposals,0);assert.equal(textureDisposals,0);assert.equal(source.children[0],mesh);assert.equal(mesh.visible,true);assert.equal(mesh.material.map,texture);disposeSource(source);texture.dispose();
});
