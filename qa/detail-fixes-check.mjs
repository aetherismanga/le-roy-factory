import assert from 'node:assert/strict';
import * as T from 'three';
import {readFileSync,writeFileSync} from 'node:fs';
import {makeRoom,DEFAULT_ROOM,roomPreset} from '../src/room.js';
import {Composition,boundsOnWall,floorExtents,disposeObject} from '../src/composition.js';
import {makeFixture,setBathData} from '../src/fixtures.js';
import {makeCatalogueMirror,MIRRORS} from '../src/mirrors.js';
import {applyMirrorLighting} from '../src/mirror-lighting.js';
const close=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
setBathData(JSON.parse(readFileSync('dist/assets/bathroom/baths.json','utf8')));
// Actual rotated footprints touch two walls, without crossing them. Pointer
// overshoot must clamp instead of leaving a gap. Test every wall/orientation.
for(const type of ['bath','shower'])for(const wall of [0,1,2,3])for(const rotation of [0,90,180,270]){
 const room=makeRoom(DEFAULT_ROOM,0),c=new Composition(room),settings={width:type==='bath'?170:120,depth:type==='bath'?75:90,kind:'rect',apron:'tile'},a=makeFixture(type,settings),item=c.add(type,a,settings,{wall,u:225,height:0,offset:120,rotation}).item;assert(item);
 for(const corner of ['left','right']){assert(!c.flushFloor(item.id,corner).error);assert.equal(c.validate(item),'');const e=floorExtents(item);close(item.placement.u,corner==='left'?e.along*100:(4.5-e.along)*100);close(item.placement.offset,(e.normal-item.dimensions.depth/2)*100);const actual=new T.Box3().setFromObject(item.root);assert(actual.min.x>=-2.254&&actual.max.x<=2.254&&actual.min.z>=-.234&&actual.max.z<=4.274,'Actual geometry stays in the room');}
 assert(c.previewMove(item.id,{u:-60,offset:-80}).item);close(item.placement.u,floorExtents(item).along*100);assert.equal(c.validate(item),'');disposeObject(a.root);room.dispose();
}
// Narrow, real recessed channel running along depth rather than the width.
for(const depth of [80,90,140,200]){const a=makeFixture('shower',{width:120,depth,trayColor:'white'}),cover=a.root.getObjectByName('Grille_evacuation'),b=new T.Box3().setFromObject(cover),size=b.getSize(new T.Vector3());assert(size.z>size.x*20);assert(size.x<.04);assert(b.max.y<.035);a.root.updateMatrixWorld(true);const tray=a.root.getObjectByName('Receveur_resine'),ray=x=>new T.Raycaster(new T.Vector3(x,.4,cover.position.z),new T.Vector3(0,-1,0)).intersectObject(tray)[0];assert(!ray(cover.position.x),'Channel is an actual opening in the tray');close(ray(0).point.y,.035);disposeObject(a.root);}
// Texture belongs to independently tiled planes, outside the plain carrier.
for(const width of [140,170]){const a=makeFixture('bath',{kind:'rect',width,depth:75,apron:'tile'}),texture=new T.Texture();a.setApron({material:new T.MeshPhysicalMaterial({map:texture,color:'#fff',roughness:.82})});assert(a.apron.every(o=>!o.material.map&&!o.material.bumpMap));assert(a.tileAprons.every(o=>o.mat.map===texture));const front=a.tileAprons[0].group,carrier=new T.Box3().setFromObject(a.apron[0]);assert(front.position.z>carrier.max.z+.001);const g=a.tileAprons[0].tiles.geometry,p=g.attributes.position,uv=g.attributes.uv,n=g.attributes.normal;for(let i=0;i<p.count;i+=3){if(n.getZ(i)<.99)continue;for(let j=1;j<3;j++){close(Math.abs(p.getX(i+j)-p.getX(i)),Math.abs(uv.getX(i+j)-uv.getX(i))*1.2);close(Math.abs(p.getY(i+j)-p.getY(i)),Math.abs(uv.getY(i+j)-uv.getY(i))*.6);}}disposeObject(a.root);}
// Light rays use real area lights. Halo cannot intercept clicks, lighting is
// bounded per mirror and can be disabled without rebuilding geometry.
for(const m of MIRRORS){const s={mirrorModel:m.id,width:m.sizes[0][0],height:m.sizes[0][1],led:true},item={type:'mirror',settings:s,asset:makeCatalogueMirror(s)},root=item.asset.root,g=applyMirrorLighting(item),lights=g.children.filter(o=>o.isRectAreaLight);assert.equal(lights.length,2);assert.equal(g.visible,!!(m.led||m.metal));const halo=root.getObjectByName('Halo_mural_LED');assert.equal(halo.material.depthWrite,false);const hits=[];halo.raycast(null,hits);assert.equal(hits.length,0);assert(halo.position.z<-.018&&halo.position.z>-.028);applyMirrorLighting(item,true);assert(lights.every(l=>!l.visible));assert.equal(root.getObjectByName('Eclairage_LED'),g);s.led=false;applyMirrorLighting(item);assert(!g.visible&&!root.getObjectByName('Anneau_LED').visible);disposeObject(root);}
// Concave rooms retain the existing polygon rejection; no clamping through a
// re-entrant wall is allowed.
{const room=makeRoom(roomPreset('l'),0),c=new Composition(room),s={width:120,depth:90},item=c.add('shower',makeFixture('shower',s),s,{wall:0,u:225,height:0}).item;const before={...item.placement};assert(c.previewMove(item.id,{u:400,offset:300}).error);assert.deepEqual(item.placement,before);}
const report={passed:true,at:new Date().toISOString(),checks:['bath and tray flush into both corners of all four walls at four rotations','overshooting floor pointer clamps to the footprint; concave outlines still reject escape','thin lengthwise metal cover over an actual recessed drain opening','all apron tile UVs retain 120x60cm physical scale; plain carrier never covers tiled face','LED area lights and shaped wall halo toggle without extra allocations; Light skips dynamic lights; halo cannot steal clicks'],rendering:'Node geometry/material checks; no WebGL shader or visual/device validation'};writeFileSync('qa/detail-fixes-result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
