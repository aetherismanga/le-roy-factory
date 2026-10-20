import assert from 'node:assert/strict';
import * as T from 'three';
import {makeModel,FINISHES,SPEC} from '../src/model.js';
import {readFileSync,writeFileSync,existsSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
const m=makeModel();m.root.updateMatrixWorld(true);
let meshes=0,triangles=0;
m.root.traverse(o=>{if(!o.isMesh)return;meshes++;const g=o.geometry;for(const [name,attr] of Object.entries(g.attributes))for(const v of attr.array)assert(Number.isFinite(v),o.name+' non-finite '+name);triangles+=(g.index?g.index.count:g.attributes.position.count)/3;});
assert.equal(m.drawers.length,2);assert.equal(FINISHES.length,8);assert.equal(new Set(FINISHES.map(f=>f.id)).size,8);assert.equal(SPEC.panel,.019);
const size=new T.Box3().setFromObject(m.cabinet).getSize(new T.Vector3());assert(Math.abs(size.x-.8)<.00001);assert(Math.abs(size.y-.54)<.00001);assert(Math.abs(size.z-.46)<.001);
for(const n of ['Joue_gauche_19mm','Joue_droite_19mm']){const box=new T.Box3().setFromObject(m.root.getObjectByName(n));assert(Math.abs(box.getSize(new T.Vector3()).x-.019)<.000001);}
for(const f of m.frontMeshes){const n=f.geometry.attributes.normal;let found=false;for(let i=0;i<n.count;i++)if(Math.abs(n.getX(i))<.001&&Math.abs(Math.abs(n.getY(i))-.707106)<.01&&Math.abs(Math.abs(n.getZ(i))-.707106)<.01)found=true;assert(found,'True 45-degree face required');}
// User correction: front lip stays high; the grip slopes down into the drawer.
for(const front of m.frontMeshes){const sample=z=>new T.Raycaster(new T.Vector3(0,1.2,z),new T.Vector3(0,-1,0)).intersectObject(front)[0].point.y;const rear=sample(.214),lip=sample(.227);assert(Math.abs((lip-rear)-.013)<.00001,'Every drawer grip falls 1:1 towards the back');const n=front.geometry.attributes.normal;assert(Array.from({length:n.count},(_,i)=>i).some(i=>Math.abs(n.getX(i))<.001&&n.getY(i)>.70&&n.getZ(i)<-.70),'45-degree face must face up and into the drawer');}
// Solid interiors, empty bowl and a real opening through the ceramic countertop.
const top=m.root.getObjectByName('Plan_vasque_ceramique_806x466'),bowl=m.root.getObjectByName('Vasque_SELLA_coque_3D');
const ray=new T.Raycaster(new T.Vector3(.12,1.1,.07),new T.Vector3(0,-1,0));assert.equal(ray.intersectObject(top).length,0,'Bowl opening must not be blocked by top');const hits=ray.intersectObject(bowl);assert(hits.length>0,'Bowl must have actual curved surface');assert(hits[0].point.y<.83,'Bowl must be recessed');
const tapRay=new T.Raycaster(new T.Vector3(0,1.1,-.173),new T.Vector3(0,-1,0));assert.equal(tapRay.intersectObject(top).length,0,'Tap opening at rear');
const solidRay=new T.Raycaster(new T.Vector3(.35,1.1,.19),new T.Vector3(0,-1,0));assert(solidRay.intersectObject(top).length>0,'Ceramic rim must be solid');
const firstBounds=new T.Box3().setFromObject(m.drawers[0]);const secondBounds=new T.Box3().setFromObject(m.drawers[1]);assert(firstBounds.min.y>secondBounds.max.y,'Drawers must not intersect vertically');
const before=m.drawers.map(d=>new T.Box3().setFromObject(d).min.z);m.drawers[0].position.z=.315;m.root.updateMatrixWorld(true);assert(Math.abs(new T.Box3().setFromObject(m.drawers[0]).min.z-before[0]-.315)<.000001);assert(Math.abs(new T.Box3().setFromObject(m.drawers[1]).min.z-before[1])<.000001);
const frame=m.root.getObjectByName('Cadre_metal_noir');assert(Math.abs(frame.geometry.parameters.radius*2+.008-.6)<.001);
// Project actual mesh vertices for each preset, including the narrow phone view.
for(const [w,h] of [[1114,812],[390,565],[768,640]])for(const p of [[1.13,1.23,1.75],[0,1.03,2.13],[2.1,1.13,.04]]){
 const target=new T.Vector3(0,.94,0),camera=new T.PerspectiveCamera(42,w/h,.035,120);
 camera.position.fromArray(p).sub(target).multiplyScalar(w/h<.95?1.55:1.38).add(target);camera.lookAt(target);camera.updateMatrixWorld();
 // Both open drawers must also stay within the initial frame.
 m.drawers.forEach(d=>d.position.z=.315);m.root.updateMatrixWorld(true);
 m.root.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){const v=new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).project(camera);assert(Math.abs(v.x)<.95&&Math.abs(v.y)<.95,'Camera preset must contain entire real model');}});
}
const js=readFileSync('src/app.js','utf8');assert(js.includes('new Reflector(geometry||new T.CircleGeometry'));assert(js.includes('reflect.apply(this,args)'));assert(js.includes('base.rgb * 0.96'));assert(!/https?:\/\//.test(js),'No runtime dependency on production or CDN');
const html=readFileSync('dist/index.html','utf8');for(const id of ['viewer','scene','finishes','reset','fullscreen','error','details'])assert(html.includes('id="'+id+'"'));assert.equal((html.match(/data-light=/g)||[]).length,3);assert.equal((html.match(/data-drawer=/g)||[]).length,3);
const files=['app.js','style.css','icon.svg',...FINISHES.filter(f=>f.texture).map(f=>'assets/'+f.texture),'assets/day.hdr','assets/studio.hdr'];const assets=files.map(file=>{assert(existsSync('dist/'+file));const bytes=readFileSync('dist/'+file);assert(bytes.length>0);return {file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};});
const report={at:new Date().toISOString(),passed:true,meshes,triangles,cabinetMetres:size.toArray(),panelMetres:SPEC.panel,drawerTravel:.315,finishes:FINISHES.map(f=>f.name),checks:['finite genuine mesh geometry','external dimensions and 19mm panels','45-degree front geometry with high front lip and recessed rear on both drawers','recessed ceramic bowl and open basin/tap holes','independent drawer movement','60cm mirror frame','camera projections at desktop/tablet/phone aspect ratios','live planar reflection implementation','all local runtime dependencies'],browserQA:'NOT_RUN: required control-browser skill unavailable in managed Sites environment',assets};writeFileSync('qa/geometry-result.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,assets:assets.length},null,2));
