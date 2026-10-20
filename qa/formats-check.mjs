import assert from 'node:assert/strict';
import * as T from 'three';
import {makeModel} from '../src/model.js';
import {WIDTH_PRESETS,DRAWER_TRAVEL,validWidth,topAvailable} from '../src/configuration.js';
import {writeFileSync} from 'node:fs';
const samples=[40,41,49,50,59,60,70,75,80,90,100,119,120];
const close=(a,b,tolerance=.00001)=>assert(Math.abs(a-b)<tolerance,`${a} != ${b}`);
const geometries=new Set(),materials=new Set();
for(const cm of samples){
 const m=makeModel({width:cm/100});m.root.updateMatrixWorld(true);
 const b=new T.Box3().setFromObject(m.cabinet),size=b.getSize(new T.Vector3());close(size.x,cm/100);close(size.y,.54);close(size.z,.46,.001);
 for(const name of ['Joue_gauche_19mm','Joue_droite_19mm'])close(new T.Box3().setFromObject(m.root.getObjectByName(name)).getSize(new T.Vector3()).x,.019);
 const topSize=new T.Box3().setFromObject(m.tops.solid).getSize(new T.Vector3());close(topSize.x,cm/100);close(topSize.y,.02);close(topSize.z,.46);
 for(const kind of ['neris','torne']){const sz=new T.Box3().setFromObject(m.tops.vessels[kind].bowl).getSize(new T.Vector3());close(sz.x,kind==='neris'?.46:.37);}
 for(const mode of ['sella','tampa','plain','neris','torne'])assert.equal(m.setTop(mode),topAvailable(mode,cm));
 m.drawers.forEach((d,i)=>d.position.z=DRAWER_TRAVEL[i]);m.root.updateMatrixWorld(true);
 // Check actual visible vertices: every drawer remains framed in every preset.
 for(const [w,h] of [[1114,812],[390,490]])for(const pos of [[1.13,1.23,1.75],[0,1.03,2.13],[2.1,1.13,.04]]){
  const target=new T.Vector3(0,.94,0),camera=new T.PerspectiveCamera(42,w/h,.035,120);camera.position.fromArray(pos).sub(target).multiplyScalar(w/h<.95?1.55:1.38).add(target);camera.lookAt(target);camera.updateMatrixWorld();
  m.root.traverseVisible(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){const v=new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).project(camera);assert(Math.abs(v.x)<.99&&Math.abs(v.y)<.99,`Unframed ${cm}cm ${o.name}`);}});
 }
 m.root.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(v=>materials.add(v));}});
}
for(const g of geometries)g.dispose();for(const m of materials)m.dispose();
assert(DRAWER_TRAVEL[1]>DRAWER_TRAVEL[0]);for(const cm of [39,121,80.5,NaN])assert.equal(validWidth(cm),false);assert.throws(()=>makeModel({width:.805}));
const report={passed:true,at:new Date().toISOString(),widthsCm:samples,presetsCm:WIDTH_PRESETS,drawerTravelsMetres:DRAWER_TRAVEL,checks:['true cabinet and worktop widths','panel thickness remains19mm at every width','vessel sizes never stretched','compatible basin selection enforced','all visible geometry fits phone and desktop camera presets with drawers open']};writeFileSync('qa/formats-result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
