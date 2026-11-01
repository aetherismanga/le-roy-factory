import assert from 'node:assert/strict';
import * as T from 'three';
import {readFileSync,writeFileSync} from 'node:fs';
import {CABINET_FORMATS,drawerTravel} from '../src/configuration.js';
import {makeModel} from '../src/model.js';
import {makeFixture,setBathData,fixtureError,BATH_LENGTHS,TRAY_COLORS,SCREEN_WIDTHS} from '../src/fixtures.js';
import {makeEquipment} from '../src/equipment.js';
import {AQUAHOME,makeTap,tapsFor} from '../src/taps.js';
import {makeRoom,DEFAULT_ROOM,tiledPolygonGeometry} from '../src/room.js';
import {Composition,disposeObject,boundsOnWall} from '../src/composition.js';
import {ProjectJournal,encodeProject,decodeProject,validateProject} from '../src/projects.js';
const close=(a,b)=>assert(Math.abs(a-b)<1e-5,`${a} vs ${b}`);
let meshCount=0,triangles=0;
function finite(root){root.updateMatrixWorld(true);root.traverse(o=>{if(!o.isMesh)return;meshCount++;const p=o.geometry.attributes.position;assert(p?.count>0);assert(Array.from(p.array).every(Number.isFinite));triangles+=(o.geometry.index?.count??p.count)/3;});}
for(const f of CABINET_FORMATS)for(const width of [.6,.8,1.2]){const m=makeModel({format:f.id,width,includeMirror:false});assert.equal(m.drawers.length,f.drawers);close(m.spec.height,f.height-(f.legHeight||0));close(m.spec.totalHeight,f.height);assert.equal(m.spec.cabinetRef,f.reference);finite(m.root);for(let i=0;i<f.drawers;i++)m.drawers[i].position.z=drawerTravel(i,f.drawers);if(f.drawers>1)assert(m.drawers.at(-1).position.z>m.drawers[0].position.z);disposeObject(m.root);}
setBathData(JSON.parse(readFileSync('dist/assets/bathroom/baths.json','utf8')));
for(const kind of ['round','rect','island'])for(const width of BATH_LENGTHS){const asset=makeFixture('bath',{kind,width,depth:75,apron:'tile'});finite(asset.root);const body=asset.root.children[0],b=new T.Box3().setFromObject(body),size=b.getSize(new T.Vector3());close(size.x,width/100);close(size.z,.75);const z=(b.min.z+b.max.z)/2;const hit=x=>new T.Raycaster(new T.Vector3(x,2,z),new T.Vector3(0,-1,0)).intersectObject(body,true)[0]?.point.y;const center=hit(0),rim=Math.max(...[-.48,-.46,.46,.48].map(v=>hit(v*width/100)||0));assert(Number.isFinite(center));assert(rim-center>.07,'Imported tub must have a real recessed bowl');disposeObject(asset.root);}
for(const trayColor of TRAY_COLORS.map(c=>c.id)){const a=makeFixture('shower',{width:160,depth:90,trayColor,screen:'fixed'});finite(a.root);let glass=0;a.root.traverse(o=>{if(o.material?.userData.architecturalGlass)glass++;});assert.equal(glass,0,'Tray has no coupled screen');close(new T.Box3().setFromObject(a.root).getSize(new T.Vector3()).y,.035);disposeObject(a.root);}
for(const screen of ['fixed','return'])for(const width of SCREEN_WIDTHS){const a=makeEquipment('screen',{width,screen,metal:'Noir mat'});finite(a.root);let glass=0;a.root.traverse(o=>{if(o.material?.userData.architecturalGlass){glass++;assert.equal(o.castShadow,false);}});assert.equal(glass,screen==='return'?2:1);disposeObject(a.root);}
// Physical acceptance envelopes in metres. A wall plate is deliberately shallow
// and a bidet mixer is shorter than a countertop tap; neither is a 10cm-tall
// column. These broad, independent limits detect unit/axis errors and missing
// major parts without claiming certified manufacturer CAD dimensions.
const tapEnvelopes={
 'basin':[[.035,.22],[.10,.23],[.09,.25]],
 'basin-xl':[[.035,.22],[.20,.38],[.10,.30]],
 'bidet':[[.035,.22],[.07,.18],[.09,.23]],
 'basin-wall':[[.12,.32],[.04,.15],[.14,.30]],
 'basin-floor':[[.10,.25],[.85,1.35],[.15,.45]],
 'bath':[[.20,.55],[.25,.65],[.15,.50]],
 'shower-mixer':[[.15,.40],[.04,.18],[.05,.22]],
 'island':[[.10,.40],[.75,1.40],[.15,.45]],
 'shower':[[.20,.50],[1.10,1.80],[.20,.60]],
 'shower-concealed':[[.25,.60],[1.10,1.80],[.20,.60]],
 'shower-kit':[[.20,.50],[.80,1.60],[.08,.35]]
};
const tapComponents={
 'basin':[['Embase'],['Corps','Pied_evase'],['Bec','Bec_col_de_cygne'],['Mousseur']],
 'basin-xl':[['Embase'],['Corps'],['Bec'],['Mousseur']],
 'bidet':[['Embase'],['Corps','Pied_evase'],['Rotule_mousseur_bidet'],['Mousseur']],
 'basin-wall':[['Rosace_murale','Platine_murale'],['Mitigeur_lavabo'],['Bec'],['Mousseur']],
 'basin-floor':[['Socle'],['Corps_sur_pied'],['Mitigeur_lavabo'],['Mousseur']],
 'bath':[['Rosace_murale'],['Mitigeur_bain'],['Bec_bain'],['Douchette'],['Flexible']],
 'shower-mixer':[['Rosace_murale'],['Mitigeur_douche'],['Sortie_flexible']],
 'island':[['Socle'],['Corps_sur_pied'],['Douchette'],['Flexible'],['Mousseur']],
 'shower':[['Mitigeur_douche'],['Colonne','Panneau_hydromassage'],['Pomme_pluie'],['Douchette'],['Flexible']],
 'shower-concealed':[['Mitigeur_douche'],['Pomme_pluie'],['Douchette'],['Flexible']],
 'shower-kit':[['Mitigeur_douche'],['Barre_douchette'],['Douchette'],['Flexible']]
};
const ids=new Set();for(const product of AQUAHOME){
 assert(!ids.has(product.reference));ids.add(product.reference);assert(product.page&&product.finish&&product.sourceName);
 const tap=makeTap(product);finite(tap);const size=new T.Box3().setFromObject(tap).getSize(new T.Vector3()),limits=tapEnvelopes[product.use];
 assert(limits,'Reviewed installation envelope for '+product.use);
 for(const [axis,index]of [['x',0],['y',1],['z',2]])assert(size[axis]>=limits[index][0]&&size[axis]<=limits[index][1],`${product.reference} ${product.use}: ${axis}=${size[axis]}m outside ${limits[index].join('–')}m`);
 for(const alternatives of tapComponents[product.use]){
  const part=alternatives.map(name=>tap.getObjectByName(name)).find(Boolean);assert(part,product.reference+' missing physical component '+alternatives.join(' / '));
  const box=new T.Box3().setFromObject(part);assert(!box.isEmpty()&&box.getSize(new T.Vector3()).length()>.001,product.reference+' empty component '+part.name);
 }
 if(product.use==='shower-mixer')assert(!tap.getObjectByName('Pomme_pluie'),'A wall mixer must not be substituted with a whole column');
 if(product.use==='shower-concealed')assert(!tap.getObjectByName('Colonne'),'Concealed kit must not acquire an exposed column');
 disposeObject(tap);
}
for(const use of Object.keys(tapEnvelopes))assert(tapsFor(use).length>0,'Catalogue includes '+use);
const room=makeRoom(DEFAULT_ROOM,0),comp=new Composition(room),bath=comp.add('bath',makeFixture('bath',{kind:'island',width:170,depth:75}),{kind:'island',width:170,depth:75},{wall:0,u:225,height:0,offset:140,rotation:90}).item;assert(bath);assert.equal(bath.placement.rotation,90);assert.equal(bath.placement.offset,140);const bodyBounds=new T.Box3().setFromObject(bath.root);close(bodyBounds.getSize(new T.Vector3()).z,1.7);const origin={...bath.placement};const second=comp.add('bath',makeFixture('bath',{kind:'rect',width:150,depth:75}),{kind:'rect',width:150,depth:75},{wall:1,u:225,height:0}).item;assert(second);const overlap=comp.previewMove(second.id,{...origin});assert(overlap.error);const settled=comp.settle(second.id,{wall:1,u:225,height:0});assert(!settled.error);assert.equal(comp.validate(second),'');
// Do not allow corrupted layouts or excessive geometry budgets from import.
assert.throws(()=>validateProject({version:1,room:DEFAULT_ROOM,items:[],walls:{}}));
for(const direction of ['horizontal','vertical'])for(const pattern of ['straight','offset']){const g=tiledPolygonGeometry([[0,0],[2.4,0],[2.4,1.8],[0,1.8]],{direction,pattern,x:13,y:-11});assert(Array.from(g.attributes.position.array).every(Number.isFinite));const p=g.attributes.position,n=g.attributes.normal;let area=0;for(let i=0;i<p.count;i+=3)if(n.getZ(i)>.9){const a=new T.Vector3().fromBufferAttribute(p,i),b=new T.Vector3().fromBufferAttribute(p,i+1),c=new T.Vector3().fromBufferAttribute(p,i+2);area+=b.sub(a).cross(c.sub(a)).length()/2;}assert(area>4.26&&area<4.32);g.dispose();}
room.walls[0].setLayout({direction:'vertical',pattern:'offset',x:7});room.setOpenings([{placement:{wall:0,u:225,height:100},dimensions:{width:1.2,height:1}}]);assert(room.walls[0].tiles.geometry.attributes.position.count>0);assert.equal(room.walls[0].layout.x,7);
const project={version:1,title:'Été · salle d’eau',room:DEFAULT_ROOM,items:comp.snapshot()},encoded=encodeProject(project);assert.deepEqual(decodeProject(encoded),project);const journal=new ProjectJournal(3);journal.seed(project);for(let i=1;i<5;i++)journal.record({...project,title:String(i)});assert.equal(journal.entries.length,3);assert.equal(journal.undo().title,'3');journal.record({...project,title:'nouveau'});assert.equal(journal.canRedo,false);
const html=readFileSync('dist/atelier.html','utf8'),htmlIds=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(htmlIds).size,htmlIds.length);const app=readFileSync('src/app.js','utf8');for(const [,id] of app.matchAll(/\$\('#([a-z-]+)'\)/g))assert(htmlIds.includes(id),'DOM target '+id);for(const file of ['src/app.js','src/fixtures.js','src/taps.js'])assert(!/fetch\(['"]https?:/.test(readFileSync(file,'utf8')));assert.equal((html.match(/class="workspace-nav"/g)||[]).length,1);for(const step of ['room','furniture','finishes','presentation'])assert(html.includes(`data-workspace="${step}"`));
const report={passed:true,at:new Date().toISOString(),checks:['four verified cabinet formats and drawer travel at three widths','all twelve bathtub length/type combinations have finite real hollow geometry','all shower finishes, six widths and two screen styles',`${AQUAHOME.length} Aqua Home references have finite meshes, installation-specific XYZ bounds and required physical components; catalog finishes preserved`,'free floor placement/rotation, temporary overlap and settle','horizontal/vertical, aligned/staggered tile coverage and window cuts','history capacity/branching, Unicode portable project encoding and import validation','all new DOM IDs present once; four responsive workspaces; no remote runtime assets'],catalogueReferences:AQUAHOME.length,meshCount,triangles,browserQA:'Not run: CPU geometry/controllers/markup only; no actual device performance or GPU/visual validation'};writeFileSync('qa/bathroom-result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
