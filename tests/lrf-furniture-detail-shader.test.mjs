import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Mesh,BoxGeometry,MeshPhysicalMaterial,Texture} from 'three';
import {createLightweightMaterials} from '../shared/lrf-3d/lightweight-rendering.js';
test('office editing keeps furniture grain, source colour and pre-existing rib normals while simplifying background optics',()=>{
 const scene=new Scene(),geometry=new BoxGeometry(),map=new Texture(),bump=new Texture();
 const hero=new MeshPhysicalMaterial({map,bumpMap:bump,roughness:.46,clearcoat:.4});hero.userData.lrfFurnitureDetail=true;const normalHook=shader=>{shader.vertexShader+='\n// native rib normals';};hero.onBeforeCompile=normalHook;
 const background=new MeshPhysicalMaterial({map,bumpMap:bump,clearcoat:.4});scene.add(new Mesh(geometry,hero),new Mesh(geometry,background));const policy=createLightweightMaterials();policy.apply(scene,true);
 const shaders=[hero,background].map(material=>{const shader={vertexShader:'source',fragmentShader:'source'};material.onBeforeCompile(shader);return shader;});
 assert.ok(!shaders[0].fragmentShader.includes('#undef USE_BUMPMAP'));assert.ok(shaders[1].fragmentShader.includes('#undef USE_BUMPMAP'));assert.ok(shaders[0].vertexShader.includes('// native rib normals'));
 for(const shader of shaders){assert.ok(shader.fragmentShader.includes('#undef USE_CLEARCOAT'));assert.ok(!shader.fragmentShader.includes('#undef USE_MAP'));}
 assert.equal(hero.map,map);assert.equal(hero.bumpMap,bump);assert.equal(hero.roughness,.46);policy.restore();assert.equal(hero.onBeforeCompile,normalHook);assert.equal(hero.clearcoat,.4);
 geometry.dispose();hero.dispose();background.dispose();map.dispose();bump.dispose();
});
