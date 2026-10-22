import assert from 'node:assert/strict';
import * as T from 'three';
import {makeModel} from '../src/model.js';
import {CATALOG as C} from '../src/commerce/catalog.js';
import {initialDraft,draftProject} from '../src/commerce/guided.js';
import {quoteProject} from '../src/commerce/pricing.js';
import {panelThickness,handleChoices,handleFinish,finishForHandle} from '../src/general-specs.js';
import {tiledPolygonGeometry} from '../src/room.js';
import {cabinetFormat} from '../src/configuration.js';
function model(id,width){const m=cabinetFormat(id);return makeModel({format:id,width:(width||m.widths[0])/100,includeMirror:false});}
function bounds(o){o.updateWorldMatrix(true,true);return new T.Box3().setFromObject(o);}
function dispose(a){const gs=new Set(),ms=new Set();a.root.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])ms.add(m);});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());}
for(const id of ['aruba-two','aruba-rainure-two']){
 const a=model(id,80);assert.equal(a.handles.length,2);assert.ok(a.handles.every(h=>h.name==='Poignee_ARUBA_courbe'&&h.geometry.type==='ExtrudeGeometry'));assert.equal(a.spec.panel,.019);
 const b=model(id,120);assert.equal(b.frontMeshes.length,4);assert.equal(b.handles.length,4);assert.ok(b.frontMeshes.every(f=>bounds(f).getSize(new T.Vector3()).x<.61));
 if(id==='aruba-rainure-two'){
  const f=a.frontMeshes[0],g=f.geometry;assert.equal(g.userData.pitch,.016);assert.equal(g.userData.thickness,.019);assert.equal(g.groups.length,2);
  // The slat is a surface in front of its own recessed groove, with correct
  // outward normals. A painted stripe could not pass this ray test.
  a.root.updateMatrixWorld(true);const y=f.position.y,ray=x=>new T.Raycaster(new T.Vector3(x,y,.6),new T.Vector3(0,0,-1)).intersectObject(f)[0];
  const raised=ray(.006),recessed=ray(0);assert.ok(raised.point.z-recessed.point.z>.003);assert.ok(raised.face.normal.z>.99);assert.equal(recessed.face.materialIndex,1);
 }
 dispose(a);dispose(b);
}
for(const m of C.models){const a=model(m.id);assert.equal(a.drawerMetal.color.getHexString(),'34383b');assert.equal(a.drawerMetal.metalness,.65);assert.equal(a.drawerMetal.roughness,.44);for(const drawer of a.drawers)drawer.traverse(o=>{if(/^(Fond_tiroir|Flanc_aluminium|Dos_tiroir|Contre_facade)/.test(o.name)){assert.equal(o.material,a.drawerMetal);assert.equal(o.material.map,null);}});assert.equal(a.spec.panel,panelThickness(m));for(const f of a.frontMeshes)assert.equal(f.geometry.userData.thickness||f.geometry.parameters.depth,panelThickness(m));
 if(m.drawers){let u=0,metalSides=0;a.drawers[0].traverse(o=>{if(o.name.startsWith('Passage_siphon'))u++;if(o.name==='Flanc_aluminium_8mm')metalSides++;});assert.ok(u>=3);assert.ok(metalSides>=2);}
 dispose(a);
}
const harmony=model('harmony-two');assert.equal(harmony.spec.panel,.016);assert.equal(harmony.handles.length,0);dispose(harmony);
const brunei=model('brunei-two',80),aruba=model('aruba-two',80),bRows=brunei.frontMeshes.map(bounds),aRows=aruba.frontMeshes.map(bounds);
assert.ok(bRows[0].min.y-bRows[1].max.y>.027);assert.ok(bRows[0].min.y-bRows[1].max.y>3*(aRows[0].min.y-aRows[1].max.y));assert.ok(bRows[0].max.x<.385);assert.equal(brunei.handles.length,0);assert.ok(brunei.cabinet.getObjectByName('Gorge_BRUNEI_reculée'));dispose(brunei);dispose(aruba);
for(const [left,right]of [['amat-two','amat-two-door'],['amat-three','amat-three-door']]){
 const a=model(left,100),b=model(right,100);assert.equal(a.doors.length,1);assert.equal(b.doors.length,1);assert.ok(bounds(a.doors[0]).max.x<0);assert.ok(bounds(b.doors[0]).min.x>0);assert.ok(bounds(a.frontMeshes[0]).getCenter(new T.Vector3()).x>0);assert.ok(bounds(b.frontMeshes[0]).getCenter(new T.Vector3()).x<0);a.setDoorProgress(1);b.setDoorProgress(1);assert.ok(a.doors[0].rotation.y<0);assert.ok(b.doors[0].rotation.y>0);dispose(a);dispose(b);
}
for(const [finish,handle,ref]of [['less--serenade-alba-tirador-blanco','white','14038'],['less--azul-acero-tirador-niquel','nickel','14039'],['less--gris-tortora-tirador-negro','black','14040']]){
 const m=cabinetFormat('less-door'),a=model(m.id);assert.equal(handleFinish(m,finish),handle);assert.equal(a.setMetalFinish(finish),handle);assert.equal(finishForHandle(m,m.finishes[0],handle),finish);const q=quoteProject(draftProject({...initialDraft('less'),finish}));assert.equal(q.rows[0].ref,ref);assert.equal(q.rows[0].publicTTC,32400);dispose(a);
}
for(const handle of ['aged-gold','aged-silver']){const m=cabinetFormat('brent-three'),finish=finishForHandle(m,m.finishes[0],handle),p=draftProject({...initialDraft('brent'),finish}),q=quoteProject(p);assert.equal(handleFinish(m,finish),handle);assert.ok(q.rows[0].ref.endsWith(handle==='aged-gold'?'ORO':'PLATA'));assert.equal(q.rows[0].publicTTC,93600);}
const boreal=model('boreal-two',79);assert.ok(boreal.handles.every(h=>h.name==='Poignee_BOREAL_profil_U'));assert.deepEqual(handleChoices(cabinetFormat('boreal-two')).map(c=>c.id),['black']);assert.equal(finishForHandle(cabinetFormat('boreal-two'),C.models.find(m=>m.collection==='boreal').finishes[0],'gold'),null);dispose(boreal);
console.log('Manufacturer geometry, recessed U drawers, AMAT handed variants, hardware colours and official references: PASS');

for(const layout of [{},{direction:'vertical',pattern:'offset',x:7,y:13},{width:.6,height:.6},{width:.3,height:.6,groutWidth:3}]){
 const g=tiledPolygonGeometry([[0,0],[3,0],[3,2.6],[0,2.6]],layout),p=g.attributes.position,n=g.attributes.normal;let area=0;
 for(let i=0;i<p.count;i+=3){const a=new T.Vector3().fromBufferAttribute(p,i),b=new T.Vector3().fromBufferAttribute(p,i+1),c=new T.Vector3().fromBufferAttribute(p,i+2);if(n.getZ(i)>.99)area+=b.sub(a).cross(c.sub(a)).length()/2;else{const xs=[a.x,b.x,c.x],ys=[a.y,b.y,c.y];assert.ok(Math.max(...xs)-Math.min(...xs)<1e-6||Math.max(...ys)-Math.min(...ys)<1e-6,'No internal diagonal tile extrusion');}}
 assert.ok(Math.abs(area-g.userData.cells.reduce((sum,c)=>sum+c.area,0))<1e-5);assert.equal(g.userData.faceCells.length,p.count/3);g.dispose();
}
console.log('Tiled surfaces: no internal diagonal caps; areas and tile picking preserved: PASS');
