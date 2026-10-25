import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {newTiledZone} from '../../shared/lrf-3d/tiled-zone-controls.js';
import {makeRoom,DEFAULT_ROOM} from '../../shared/lrf-3d/room.js';
import {normalizeLayout} from '../../shared/lrf-3d/surface-catalog.js';
import {pickSelection} from '../../shared/lrf-3d/picking.js';
import {quantityForSurface} from '../../shared/lrf-3d/quantities.js';
import catalogue from '../../shared/lrf-3d/commercial-surfaces.json' with {type:'json'};

const product=catalogue.products.find(p=>p.collection==='Creta'&&p.colorId==='caramello'&&p.format==='60x120');
assert(product);
const finish={collection:product.collection,color:product.colorId,format:product.format,catalogueKey:product.key,reference:product.reference,finish:product.finish,pack:{collection:product.collection,color:product.colorId,format:product.format,pcsBox:product.packPieces,m2Box:product.packArea,source:product.packSource}};

test('a floor rug starts with two-by-two selected modules and independent manufacturer identity',()=>{
 const room=makeRoom(DEFAULT_ROOM,0),floor=room.floor;floor.setLayout(normalizeLayout({direction:'horizontal'},finish.collection,finish.format,finish.color));
 const rug=newTiledZone(floor,finish,'floor');assert.equal(rug.width,240);assert.equal(rug.height,120);assert.equal(rug.name,'Tapis de carrelage');
 const xs=floor.polygon.map(p=>p[0]*100),ys=floor.polygon.map(p=>p[1]*100);
 assert(Math.abs(rug.x+120-(Math.min(...xs)+Math.max(...xs))/2)<=.5);assert(Math.abs(rug.y+60-(Math.min(...ys)+Math.max(...ys))/2)<=.5);
 for(const key of ['catalogueKey','reference','finish','format','collection','color'])assert.equal(rug[key],finish[key]);
 assert.deepEqual(rug.pack,finish.pack);rug.pack.pcsBox=1;assert.notEqual(rug.pack.pcsBox,finish.pack.pcsBox);room.dispose();
});

test('floor defaults rotate physically and fit small surfaces without changing the tile format',()=>{
 const room=makeRoom({height:260,points:[[0,0],[150,0],[150,180],[0,180]]},0);room.floor.setLayout(normalizeLayout({direction:'vertical'},finish.collection,finish.format,finish.color));
 const rug=newTiledZone(room.floor,finish,'floor');assert.equal(rug.width,120);assert.equal(rug.height,180);assert.equal(rug.format,'60x120');assert.equal(rug.reference,finish.reference);room.dispose();
});

for(const app of ['studio-one','randal-general'])test(app+': resized and moved rugs keep exact floor area, material quantities and real hit targets',async()=>{
 const {renderZones,validateZones}=await import('../../'+app+'/src/surface-zones.js');
 const room=makeRoom(DEFAULT_ROOM,0),floor=room.floor;floor.setLayout(normalizeLayout({direction:'horizontal'},finish.collection,finish.format,finish.color));
 const scene=new T.Scene();scene.add(room.root);
 const layout=z=>normalizeLayout({direction:z.direction||'horizontal'},z.collection,z.format,z.color),material=()=>{};
 let rug={id:'rug',...newTiledZone(floor,finish,'floor'),color:'avena',width:180,height:120,x:-90,y:-285};
 assert.equal(validateZones(floor,[rug]),'');renderZones(floor,[rug],material,layout);
 const area=()=>quantityForSurface(floor,finish,floor.layout,0).area+floor.decorativeZones.reduce((sum,face)=>sum+quantityForSurface(face,face.zone,face.layout,0).area,0);
 assert(Math.abs(area()-20.25)<1e-8);assert(Math.abs(quantityForSurface(floor.decorativeZones[0],rug,layout(rug),0).area-2.16)<1e-8);
 const camera=new T.PerspectiveCamera(42,1,.01,100);camera.position.set(0,5,3);camera.lookAt(0,0,1.8);camera.updateMatrixWorld(true);room.updateCutaway(camera.position);
 let face=floor.decorativeZones[0],center=face.group.localToWorld(new T.Vector3(rug.width/200,rug.height/200,0));
 assert.equal(pickSelection(scene,camera,center.project(camera)).editTarget,'zone:rug');
 rug={...rug,width:160,height:90,x:-30,y:-220};assert.equal(validateZones(floor,[rug]),'');renderZones(floor,[rug],material,layout);face=floor.decorativeZones[0];
 assert(Math.abs(area()-20.25)<1e-8);assert(Math.abs(quantityForSurface(face,rug,layout(rug),0).area-1.44)<1e-8);
 center=face.group.localToWorld(new T.Vector3(.8,.45,0));assert.equal(pickSelection(scene,camera,center.project(camera)).editTarget,'zone:rug');
 assert(validateZones(floor,[{...rug,x:500}]).includes('surface'));assert(validateZones(floor,[rug,{...rug,id:'overlap'}]).includes('superposer'));
 const {encodeProject,decodeProject}=await import('../../'+app+'/src/projects.js');
 const saved={version:2,room:structuredClone(DEFAULT_ROOM),items:[],floor:{...finish,zones:[{...rug,positionUnlocked:true}]},walls:[],renovation:{locked:true}};
 const restored=decodeProject(encodeProject(saved));assert.deepEqual(restored.floor.zones,saved.floor.zones);assert.equal(restored.floor.zones[0].reference,finish.reference);room.dispose();
});
