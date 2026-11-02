import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PUBLIC_COMPOSITIONS,publicComposition,publicCompositionProject} from '../../shared/lrf-3d/public-compositions.js';
import {makeRoom,validateRoom} from '../../shared/lrf-3d/room.js';
import {normalizeProjectSurfaceIdentities} from '../../shared/lrf-3d/surface-identity.mjs';
import {isWallMountedSanitary,normalizeSanitaryPlacement} from '../../shared/lrf-3d/sanitary-mount.js';
import {sameProjectPlacement} from '../../shared/lrf-3d/project-refresh.js';

const clones=value=>JSON.parse(JSON.stringify(value));
const sceneKeys=['version','room','renovation','floor','walls','lighting','brightness','profiles','plinths','tileLoss','temperature','layouts','views','items'];
// These fingerprints were computed from the exact attached exports before
// publication. Ignore only identity/lock/editor flags, never scene geometry,
// materials, quantities, physical references or openings. The one explicit
// General layout correction below is checked separately, then reversed only
// for comparison with the unchanged original export fingerprint.
const thumbnailHashes={'lrf-expo-studio-one':'3c5c4681ebfe2abc12f75b0120e5bccd1f6e39788451ae3a840fd4cc34f0d7ea','lrf-expo-general':'85fddf0f83f72f77d8de5eeac4036e69e3cf4e94d3d9cad7bc3bc4db6670005e'};
const originalSceneHashes={
 'lrf-expo-studio-one':'e3960ad65545c9daebe452d7d35e600dd7d7405b93125ca00a40dde0557ce63f',
 'lrf-expo-general':'6844d1400808b5c65b4d3d501764c0c8259b5e8f282c7b0d9ebdd698f16d2391'
};
function fingerprint(project){
 const data=clones(Object.fromEntries(sceneKeys.filter(key=>key in project).map(key=>[key,project[key]]))),ids=[];
 const collect=value=>{if(value&&typeof value==='object'){if(value.id)ids.push(value.id);for(const child of Object.values(value))collect(child);}};collect(data);
 const entries=ids.map((id,index)=>[id,'ENTITY'+index]).sort((a,b)=>b[0].length-a[0].length);
 const walk=value=>{if(typeof value==='string'){for(const [id,next]of entries)value=value.replaceAll(id,next);return value;}if(Array.isArray(value))return value.map(walk);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!['id','locked','positionUnlocked','editMode'].includes(key)).map(([key,v])=>[walk(key),walk(v)]).sort(([a],[b])=>a.localeCompare(b,'en')));return value;};
 return createHash('sha256').update(JSON.stringify(walk(data))).digest('hex');
}
function entities(project){return [...project.items,...(project.room.partitions||[]),...(project.room.niches||[]),...(project.floor.zones||[]),...project.walls.flatMap(w=>w.zones||[])];}

test('public catalogue keeps both attached bathroom scenes and original thumbnail bytes without account metadata',()=>{
 assert.deepEqual(PUBLIC_COMPOSITIONS.map(p=>[p.id,p.variant,p.itemCount]),[['lrf-expo-studio-one','studio-one',12],['lrf-expo-general','randal-general',13]]);
 const serialized=readFileSync(new URL('../../shared/lrf-3d/public-compositions.json',import.meta.url),'utf8');
 for(const name of ['ownerKey','customer','client','siteReference','comment','lrfPlanPose','positionUnlocked','purchaseHT','totalPurchaseHT','proHT'])assert(!serialized.includes('"'+name+'"'),name+' must not be published');
 assert(!/LRF-00317|LOCAL-20261025|FEC09EE7|D8FF8C78|project-[a-f0-9]{8}-/.test(serialized));
 for(const descriptor of PUBLIC_COMPOSITIONS){
  const project=publicCompositionProject(descriptor.id),original=clones(project);
  if(descriptor.id==='lrf-expo-general'){
   const tap=original.items.find(item=>item.id==='object-lrf-expo-general-05');
   // The refined island body clipped the bathtub end by 24.4 mm. Moving 3 cm
   // is the smallest whole-centimetre correction with a positive clearance
   // (u=45 still collides; u=44 leaves 5.6 mm). Keep every other scene value.
   assert.deepEqual(tap.placement,{wall:3,u:44,height:0,offset:25,rotation:90});tap.placement.u=47;
  }
  assert.equal(fingerprint(original),originalSceneHashes[descriptor.id]);assert.equal(publicComposition(descriptor.id),descriptor);
  const thumbnail=readFileSync(new URL('../../shared/lrf-3d/media/public-compositions/'+descriptor.id+'.webp',import.meta.url));assert.equal(thumbnail.subarray(0,4).toString(),'RIFF');assert.equal(thumbnail.subarray(8,12).toString(),'WEBP');assert(thumbnail.length>3000);assert.equal(createHash('sha256').update(thumbnail).digest('hex'),thumbnailHashes[descriptor.id]);
 }
 assert.equal(publicComposition('missing'),null);assert.throws(()=>publicCompositionProject('missing'),/introuvable/);
});

test('previews are independently locked and copies get fresh editable identities with all scene references remapped',()=>{
 for(const entry of PUBLIC_COMPOSITIONS){
  const preview=publicCompositionProject(entry.id),baseline=clones(preview),copy=publicCompositionProject(entry.id,{copy:true}),other=publicCompositionProject(entry.id,{copy:true});
  assert(preview.renovation.locked);assert(entities(preview).every(entity=>entity.locked===true));assert.equal(copy.renovation.locked,false);assert(entities(copy).every(entity=>entity.locked===false));
  const originals=new Set(entities(preview).map(entity=>entity.id)),copyIDs=new Set(entities(copy).map(entity=>entity.id));assert.equal(copyIDs.size,entities(copy).length);assert(entities(copy).every(entity=>!originals.has(entity.id)));assert(entities(other).every(entity=>!copyIDs.has(entity.id)));
  assert.equal(fingerprint(copy),fingerprint(baseline));
  for(const screen of copy.items.filter(item=>item.type==='screen'))assert(copy.items.some(item=>item.type==='shower'&&item.id===screen.settings.trayId));
  for(const key of Object.keys(copy.profiles?.overrides||{}))if(key.startsWith('bath-'))assert(copy.items.some(item=>item.type==='bath'&&key.startsWith('bath-'+item.id+'|')));
  for(const niche of copy.room.niches||[])assert(/^niche-[a-z0-9-]{1,70}$/i.test(niche.id));
  preview.items[0].settings.width=10;preview.room.points[0][0]=999;copy.walls[0].color='changed';assert.deepEqual(publicCompositionProject(entry.id),baseline);
 }
});

for(const entry of PUBLIC_COMPOSITIONS)test(entry.variant+': exact public preview and editable copy restore through the real geometry/composition engine',async()=>{
 const base='../../'+entry.variant+'/src/';
 const {Composition,itemDimensions,disposeObject}=await import(base+'composition.js');
 const {makeModel}=await import(base+'model.js'),{makeColumn}=await import(base+'column.js'),{makeCatalogueMirror}=await import(base+'mirrors.js');
 const {makeFixture,setBathData,isFixture}=await import(base+'fixtures.js'),{makeEquipment,isAccessory}=await import(base+'equipment.js'),{makeOpening}=await import(base+'openings.js');
 const {validateProject}=await import(base+'projects.js');
 setBathData(JSON.parse(readFileSync(new URL('../../studio-one/dist/assets/bathroom/baths.json',import.meta.url),'utf8')));
 for(const copy of [false,true]){
  const project=normalizeProjectSurfaceIdentities(validateProject(publicCompositionProject(entry.id,{copy})));assert.equal(validateRoom(project.room,0),'');
  const room=makeRoom(project.room,0),composition=new Composition(room),originalSet=room.setOpenings,ids=new Map();room.setOpenings=()=>{};
  const legacy=raw=>isWallMountedSanitary(raw)&&!sameProjectPlacement(normalizeSanitaryPlacement({...raw,dimensions:itemDimensions(raw.type,raw.settings)},raw.placement,room),raw.placement);
  const ordered=[...project.items.filter(item=>item.type!=='screen'&&!legacy(item)),...project.items.filter(item=>item.type==='screen'),...project.items.filter(legacy)];
  try{
   for(const raw of ordered){
    const settings=clones(raw.settings);if(raw.type==='screen')settings.trayId=ids.get(settings.trayId)||settings.trayId;
    const asset=raw.type==='cabinet'?makeModel({width:settings.width/100,format:settings.format,basinLayout:settings.basinLayout,basinTop:settings.top,topDrawer:settings.topDrawer,includeMirror:false}):raw.type==='column'?makeColumn():raw.type==='mirror'?makeCatalogueMirror(settings):isFixture(raw.type)?makeFixture(raw.type,settings):isAccessory(raw.type)?makeEquipment(raw.type,settings):makeOpening(raw.type,settings);
    const added=composition.add(raw.type,asset,settings,raw.placement);assert(added.item,raw.type+': '+added.error);ids.set(raw.id,added.item.id);
    if(raw.type!=='screen'&&!legacy(raw)&&!sameProjectPlacement(added.item.placement,raw.placement)){const moved=composition.move(added.item.id,raw.placement);assert(!moved.error,raw.type+': '+moved.error);}
    assert(sameProjectPlacement(added.item.placement,raw.placement),raw.type+' must retain its exact exported placement');added.item.locked=!!raw.locked;
   }
   room.setOpenings=originalSet;room.setOpenings(composition.items.filter(item=>['window','door'].includes(item.type)));composition.locked=project.renovation.locked;
   assert.equal(composition.items.length,entry.itemCount);assert.equal(composition.locked,!copy);
  }finally{for(const item of composition.items)disposeObject(item.root);room.dispose();}
 }
});
