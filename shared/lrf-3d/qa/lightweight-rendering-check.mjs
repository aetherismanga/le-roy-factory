import assert from 'node:assert/strict';
import {Scene,Mesh,BoxGeometry,MeshPhysicalMaterial,MeshStandardMaterial,MeshBasicMaterial,Texture,ShaderLib,ShaderChunk,REVISION} from 'three';
import {createLightweightMaterials} from '../lightweight-rendering.js';

assert.equal(REVISION,'180','Shader macros must be reviewed when Three changes');
const scene=new Scene(),geometry=new BoxGeometry(),map=new Texture(),bump=new Texture(),normal=new Texture();
const material=new MeshPhysicalMaterial({map,bumpMap:bump,normalMap:normal,clearcoat:.8,roughness:.17,metalness:.6});
let calls=0;const originalCompile=function(shader){assert.equal(this,material);calls++;shader.uniforms.existingHook={value:7};};
const originalKey=()=> 'existing-key';material.onBeforeCompile=originalCompile;material.customProgramCacheKey=originalKey;
const basic=new MeshBasicMaterial({map});scene.add(new Mesh(geometry,[material,basic]),new Mesh(geometry,material));
const policy=createLightweightMaterials(),before=material.version;
policy.apply(scene,true);
assert.equal(policy.diagnostics().materials,1,'Shared materials are wrapped once');
assert.equal(material.version,before+1);
assert.equal(basic.onBeforeCompile,MeshBasicMaterial.prototype.onBeforeCompile,'Unlit and reflector shaders remain untouched');
const wrapper=material.onBeforeCompile,key=material.customProgramCacheKey();
policy.apply(scene,true);assert.equal(material.onBeforeCompile,wrapper);assert.equal(material.version,before+1,'A scene refresh does not recompile unchanged materials');
assert.match(key,/existing-key\|lrf-lightweight-v1/);
const shader={vertexShader:ShaderLib.physical.vertexShader,fragmentShader:ShaderLib.physical.fragmentShader,uniforms:{}};
material.onBeforeCompile(shader,null);assert.equal(calls,1);assert.equal(shader.uniforms.existingHook.value,7);
for(const macro of ['USE_CLEARCOAT','USE_CLEARCOATMAP','USE_CLEARCOAT_NORMALMAP','USE_CLEARCOAT_ROUGHNESSMAP','USE_BUMPMAP']){
 assert(shader.vertexShader.includes('#undef '+macro+'\n'));
 assert(shader.fragmentShader.includes('#undef '+macro+'\n'));
 assert(Object.values(ShaderChunk).some(chunk=>chunk.includes(macro)),'Supported r180 macro: '+macro);
}
assert(!shader.fragmentShader.includes('#undef USE_MAP'),'Keep the colour texture');
assert(!shader.fragmentShader.includes('#undef USE_NORMALMAP'),'Keep geometric surface normals');
assert.equal(material.map,map);assert.equal(material.bumpMap,bump);assert.equal(material.normalMap,normal);assert.equal(material.clearcoat,.8);assert.equal(material.roughness,.17);assert.equal(material.metalness,.6);
// Editing while lightweight is active updates the canonical values directly.
material.bumpMap=null;material.clearcoat=.34;const replacementMap=new Texture();material.map=replacementMap;
const added=new MeshStandardMaterial({bumpMap:bump});scene.add(new Mesh(geometry,added));policy.apply(scene,true);assert.equal(policy.diagnostics().materials,2,'Newly added scene assets receive the same policy');
scene.remove(scene.children[0]);policy.apply(scene,false);
assert.equal(material.onBeforeCompile,originalCompile);assert.equal(material.customProgramCacheKey,originalKey);
assert.equal(material.bumpMap,null);assert.equal(material.map,replacementMap);assert.equal(material.clearcoat,.34,'HD restores hooks without rolling back edits');
assert.equal(added.onBeforeCompile,MeshStandardMaterial.prototype.onBeforeCompile);assert.equal(policy.diagnostics().materials,0);
policy.apply(scene,true);added.dispose();assert.equal(policy.diagnostics().materials,1,'Disposed materials are released from the controller');
const updatedHook=function(shader){shader.uniforms.newHook={value:11};};material.onBeforeCompile=updatedHook;policy.apply(scene,true);policy.restore();assert.equal(material.onBeforeCompile,updatedHook,'Preserve hooks installed after the initial material');
assert.equal(policy.diagnostics().materials,0);
for(const texture of [map,bump,normal,replacementMap])texture.dispose();geometry.dispose();material.dispose();basic.dispose();
console.log('Lightweight physical materials: canonical edits, shared arrays, shader hooks, disposal and exact HD restoration passed');
