import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeOpening} from '../../shared/lrf-3d/openings.js';
import {applyArchitecturalGlass} from '../../shared/lrf-3d/ultra-rendering.js';
import {disposeObject} from '../../studio-one/src/composition.js';

test('quality toggles restore the native window and other glazing recipes across shared-material traversals',()=>{
 const scene=new T.Scene(),window=makeOpening('window',{windowType:'casement'}),panes=[];window.root.traverse(o=>{if(o.material?.userData?.architecturalGlass)panes.push(o);});scene.add(window.root);
 assert.equal(panes.length,4);const windowGlass=panes[0].material;assert.equal(windowGlass.transmission,.86);assert(panes.every(pane=>pane.material===windowGlass));
 const other=new T.MeshPhysicalMaterial({transmission:.63,opacity:.78,transparent:true});other.userData.architecturalGlass=true;
 const opaque=new T.MeshPhysicalMaterial({transmission:0,opacity:.12,transparent:true});opaque.userData.architecturalGlass=true;
 const unrelated=new T.MeshPhysicalMaterial({transmission:.91,opacity:.68,transparent:true});
 const geometry=new T.BoxGeometry(1,1,.01);scene.add(new T.Mesh(geometry,[other,other]),new T.Mesh(geometry,other),new T.Mesh(geometry,opaque),new T.Mesh(geometry,unrelated));
 try{
  const native=[{material:windowGlass,transmission:.86,opacity:1},{material:other,transmission:.63,opacity:.78},{material:opaque,transmission:0,opacity:.12}];
  applyArchitecturalGlass(scene,false);assert.equal(other.transmission,.63);assert.equal(other.opacity,.78,'Standard mode must leave an untouched material recipe intact');
  for(let cycle=0;cycle<5;cycle++){
   const versions=native.map(entry=>entry.material.version);
   applyArchitecturalGlass(scene,true);
   for(const [index,entry]of native.entries()){assert.equal(entry.material.transmission,0);assert.equal(entry.material.opacity,.25);assert(entry.material.version>versions[index],'The temporary recipe updates the material shader');}
   const lightVersions=native.map(entry=>entry.material.version);
   applyArchitecturalGlass(scene,true);
   for(const [index,entry]of native.entries())assert.equal(entry.material.version,lightVersions[index],'Repeated Light passes must not save their own temporary recipe');
   applyArchitecturalGlass(scene,false);
   for(const [index,entry]of native.entries()){assert.equal(entry.material.transmission,entry.transmission);assert.equal(entry.material.opacity,entry.opacity);assert(entry.material.version>lightVersions[index]);}
   applyArchitecturalGlass(scene,false);
   for(const [index,entry]of native.entries())assert(entry.material.version>lightVersions[index]);
   assert.equal(unrelated.transmission,.91);assert.equal(unrelated.opacity,.68);
  }
  // A new manufacturer recipe applied while in Standard becomes the native
  // values for the next Light session, rather than being frozen forever.
  other.transmission=.72;other.opacity=.84;applyArchitecturalGlass(scene,true);applyArchitecturalGlass(scene,false);assert.equal(other.transmission,.72);assert.equal(other.opacity,.84);
 }finally{disposeObject(scene);}
});
