import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {makeRoom,DEFAULT_ROOM} from '../../shared/lrf-3d/room.js';
import {nichePlacement} from '../../shared/lrf-3d/niche-placement-math.js';
import {nicheWallFinish} from '../../shared/lrf-3d/niches.js';
import {pickSelection} from '../../shared/lrf-3d/picking.js';
import {quantityForSurface} from '../../shared/lrf-3d/quantities.js';
import {normalizeLayout} from '../../shared/lrf-3d/surface-catalog.js';
import {apronFinish,applyBathApron,collectApronFinishes,selectApronFace} from '../../shared/lrf-3d/bath-apron.js';

const finish={collection:'Creta',color:'avena',format:'60x120'},layout=z=>normalizeLayout({},z.collection,z.format,z.color);
const close=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const area=surface=>quantityForSurface(surface,finish,surface.layout,0).area;
const frontArea=geometry=>{const p=geometry.attributes.position,n=geometry.attributes.normal;let area=0;for(let i=0;i<p.count;i+=3){if(n.getZ(i)<.99)continue;const a=new T.Vector3().fromBufferAttribute(p,i),b=new T.Vector3().fromBufferAttribute(p,i+1),c=new T.Vector3().fromBufferAttribute(p,i+2);area+=b.sub(a).cross(c.sub(a)).length()/2;}return area;};

for(const app of ['studio-one','randal-general']){
 const {renderZones,validateZones}=await import('../../'+app+'/src/surface-zones.js');
 test(app+': a column keeps a real selectable niche, including a niche crossing its edge',()=>{
  const column={...finish,id:'zone-column',color:'caramello',x:100,y:0,width:100,height:260};
  const placed=nichePlacement(DEFAULT_ROOM,'boundary-0',150,130,{zones:[column]});assert.equal(placed.error,'');
  const niche={...placed.niche,id:'niche-column',width:60,height:40,bottom:110};
  const room=makeRoom({...DEFAULT_ROOM,niches:[niche]},0),wall=room.walls[0];
  assert.equal(validateZones(wall,[column]),'');renderZones(wall,[column],()=>{},layout);
  close(area(wall.decorativeZones[0]),2.6-.24);close(area(wall)+area(wall.decorativeZones[0]),4.5*2.6-.24);
  assert.equal(nicheWallFinish(niche,{...finish,zones:[column]}).color,'caramello');
  const scene=new T.Scene();scene.add(room.root);const camera=new T.PerspectiveCamera(42,1,.01,100);camera.position.set(-.75,1.3,3);camera.lookAt(-.75,1.3,-.23);camera.updateMatrixWorld(true);room.updateCutaway(camera.position);
  const target=wall.group.localToWorld(new T.Vector3(1.5,1.3,-.07));assert.equal(pickSelection(scene,camera,target.project(camera)).editTarget,'niche:'+niche.id);
  // Partial column/niche intersections must be clipped at the column edge.
  const partial={...column,x:145,width:80};renderZones(wall,[partial],()=>{},layout);close(area(wall.decorativeZones[0]),.8*2.6-.35*.4);
  assert(frontArea(wall.decorativeZones[0].tiles.geometry)<.8*2.6-.35*.4);
  renderZones(wall,[],()=>{},layout);close(area(wall),4.5*2.6-.24);room.dispose();
 });
 test(app+': three overlapping rugs cover exactly one floor and remain pickable after move/delete',()=>{
  const room=makeRoom(DEFAULT_ROOM,0),floor=room.floor,scene=new T.Scene();scene.add(room.root);
  let rugs=[{...finish,id:'outer',x:-120,y:-300,width:240,height:200},{...finish,id:'inner',color:'caramello',x:-60,y:-260,width:120,height:100},{...finish,id:'partial',color:'ginepro',x:0,y:-220,width:180,height:140}];
  const render=()=>{assert.equal(validateZones(floor,rugs),'');renderZones(floor,rugs,()=>{},layout);close(area(floor)+floor.decorativeZones.reduce((sum,f)=>sum+area(f),0),20.25);};
  render();close(area(floor.decorativeZones[0]),2.52);close(area(floor.decorativeZones[1]),.84);close(area(floor.decorativeZones[2]),2.52);
  const camera=new T.PerspectiveCamera(42,1,.01,100);camera.position.set(.3,5,2.3);camera.lookAt(.3,0,2.3);camera.updateMatrixWorld(true);room.updateCutaway(camera.position);
  const hitAt=(x,y)=>pickSelection(scene,camera,floor.group.localToWorld(new T.Vector3(x,y,.001)).project(camera));
  assert.equal(hitAt(.3,-1.9).editTarget,'zone:partial');assert.equal(hitAt(-.3,-2).editTarget,'zone:inner');assert.equal(hitAt(-1,-2).editTarget,'zone:outer');
  rugs=[rugs[0],rugs[1]];render();close(area(floor.decorativeZones[0]),3.6);assert.equal(hitAt(.3,-1.9).editTarget,'zone:inner');
  rugs=[rugs[0],{...rugs[1],x:-100,y:-280}];render();
  rugs=[rugs[0],{...rugs[0],id:'exact-cover'}];render();close(area(floor.decorativeZones[0]),0);assert.equal(floor.decorativeZones[0].tiles.geometry.attributes.position.count,0);
  rugs=[];render();close(area(floor),20.25);room.dispose();
 });
 test(app+': bathtub faces use their own format, material, hit target and saved finish',async()=>{
  const {setBathData,makeFixture,fixtureError}=await import('../../'+app+'/src/fixtures.js');
  setBathData(JSON.parse(readFileSync(new URL('../../studio-one/dist/assets/bathroom/baths.json',import.meta.url))));
  const settings={kind:'rect',width:170,depth:75,apron:'tile',apronCollection:'Creta',apronColor:'avena',apronFormat:'60x120',apronFaces:{left:{collection:'Creta',color:'caramello',format:'60x60'},front:{collection:'Creta',color:'ginepro',format:'60x120'}}};
  assert.equal(fixtureError('bath',settings),'');const asset=makeFixture('bath',settings),item={type:'bath',settings,asset};
  const colours={avena:'#eeeecc',caramello:'#885533',ginepro:'#226633'};
  applyBathApron(item,(face,finish)=>face.material.color.set(colours[finish.color]));
  assert.equal(asset.tileAprons.find(f=>f.part==='left').material.color.getHexString(),'885533');assert.equal(asset.tileAprons.find(f=>f.part==='front').material.color.getHexString(),'226633');assert.equal(asset.tileAprons.find(f=>f.part==='right').material.color.getHexString(),'eeeecc');
  close(asset.tileAprons.find(f=>f.part==='left').layout.width,.6);close(asset.tileAprons.find(f=>f.part==='front').layout.width,1.2);
  const scene=new T.Scene();scene.add(asset.root);const camera=new T.PerspectiveCamera(42,1,.01,100);
  for(const face of asset.tileAprons){const centre=face.group.localToWorld(new T.Vector3(face.length/2,.279,0)),normal=new T.Vector3(0,0,1).applyQuaternion(face.group.getWorldQuaternion(new T.Quaternion()));camera.position.copy(centre).addScaledVector(normal,2);camera.lookAt(centre);camera.updateMatrixWorld(true);const hit=pickSelection(scene,camera,centre.clone().project(camera));assert(selectApronFace(item,hit));let object=hit.object;while(object&&!object.userData.apronPart)object=object.parent;assert.equal(object.userData.apronPart,face.part);}
  close(asset.tileAprons.reduce((sum,face)=>sum+quantityForSurface(face,apronFinish(settings,face.part),face.layout,0).area,0),(.75*2+1.7)*.558);
  assert.deepEqual(collectApronFinishes([item]).map(f=>f.color),['ginepro','caramello','avena']);
  assert.equal(apronFinish({...settings,apronCatalogueKey:'old-common-SKU'},'left').catalogueKey,undefined,'A new face does not inherit another tile’s old SKU');
  const {encodeProject,decodeProject}=await import('../../'+app+'/src/projects.js');const project={version:2,room:structuredClone(DEFAULT_ROOM),items:[{id:'bath-saved',type:'bath',settings,placement:{wall:0,u:150,height:0,offset:0,rotation:0}}],floor:finish,walls:[]};const saved=decodeProject(encodeProject(project));assert.deepEqual(saved.items[0].settings.apronFaces,settings.apronFaces);
  assert.deepEqual(apronFinish({...settings,apronFaces:undefined},'left'),apronFinish({...settings,apronFaces:undefined},'front'),'Legacy single-colour projects retain their finish');
  assert.match(fixtureError('bath',{...settings,apronFaces:[]}),/invalides/);
 });
}
