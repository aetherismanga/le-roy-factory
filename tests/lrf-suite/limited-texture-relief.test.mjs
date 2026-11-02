import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {applySurfaceTextureMapping,disposeSurfaceTextureClones} from '../../shared/lrf-3d/surface-appearance.js';

test('limited catalogue photos retain their colour but never become coarse artificial height maps',()=>{
 const map=new T.Texture({width:222,height:222}),bump=map.clone(),material=new T.MeshPhysicalMaterial();
 const crop={texturePhysicalSize:[.6,.6]},layout={width:.3,height:.3};
 applySurfaceTextureMapping(material,{map,bumpMap:bump,choice:crop,layout});
 const oldBump=material.bumpMap;let disposed=false;oldBump.addEventListener('dispose',()=>disposed=true);
 applySurfaceTextureMapping(material,{map,bumpMap:bump,choice:{...crop,definitionLimited:true},layout});
 assert.equal(disposed,true);assert.equal(material.bumpMap,null);assert.equal(material.lrfTileBumpClone,undefined);
 assert.equal(material.map.image,map.image);assert.deepEqual(material.map.repeat.toArray(),[.5,.5]);
 applySurfaceTextureMapping(material,{map,bumpMap:bump,choice:{...crop,definitionLimited:false,reliefFromColor:false},layout});
 assert.equal(material.bumpMap,null,'A larger product photo is still not a measured height map');
 applySurfaceTextureMapping(material,{map,bumpMap:bump,choice:{...crop,definitionLimited:false},layout});
 assert.equal(material.bumpMap.image,bump.image,'A real native source retains the existing relief recipe');
 disposeSurfaceTextureClones(material);material.dispose();map.dispose();bump.dispose();
});
