import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {fullTopDrawerAvailable,normalizeTopDrawer} from '../drawer-options.js';
import {buildPhotorealPrompt} from '../photoreal-export.js';

const root=new URL('../../../',import.meta.url);
const load=(application,path)=>import(new URL(application+'/src/'+path,root));
const suites=await Promise.all(['studio-one','randal-general'].map(async application=>({
 application,
 model:await load(application,'model.js'),
 configuration:await load(application,'configuration.js'),
 guided:await load(application,'commerce/guided.js'),
 preview:await load(application,'commerce/preview-model.js'),
 pricing:await load(application,'commerce/pricing.js'),
 projects:await load(application,'projects.js'),
 composition:await load(application,'composition.js'),
 room:await load(application,'room.js'),
 sanitize:application==='studio-one'?(await load(application,'private-surface-prices.js')).publicProjectData:(await load(application,'surface-commerce.js')).publicProject
})));

const visible=(group,predicate)=>{const result=[];group.traverseVisible(o=>{if(predicate(o))result.push(o);});return result;};
const floors=asset=>visible(asset.drawers[0],o=>o.isMesh&&o.name==='Fond_tiroir_8mm');
const siphons=asset=>visible(asset.drawers[0],o=>o.name.startsWith('Passage_siphon'));
function signature(group){
 const hash=createHash('sha256');
 group.traverse(o=>{hash.update(JSON.stringify([o.name,o.position.toArray(),o.rotation.toArray(),o.scale.toArray(),o.visible]));if(o.isMesh){
  for(const [key,attribute] of Object.entries(o.geometry.attributes)){hash.update(key);hash.update(new Uint8Array(attribute.array.buffer,attribute.array.byteOffset,attribute.array.byteLength));}
  if(o.geometry.index)hash.update(new Uint8Array(o.geometry.index.array.buffer));
 }});
 return hash.digest('hex');
}
function hitsFloor(asset,point){
 asset.root.updateMatrixWorld(true);
 return new T.Raycaster(new T.Vector3(point.x,2.5,point.z),new T.Vector3(0,-1,0)).intersectObjects(floors(asset),false).length>0;
}
function dispose(asset){
 const geometries=new Set(),materials=new Set();asset.root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const material of Array.isArray(o.material)?o.material:[o.material])materials.add(material);});
 for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();
}

for(const top of ['plain','neris','torne']){
 assert.equal(fullTopDrawerAvailable(top),true);
 assert.equal(normalizeTopDrawer('full',top),'full');
 for(const value of [undefined,null,false,true,0,'FULL','other','siphon'])assert.equal(normalizeTopDrawer(value,top),'siphon','Only the explicit full setting opts in');
}
for(const top of ['bare','none','compact','sella','tampa',undefined,'unknown']){
 assert.equal(fullTopDrawerAvailable(top),false);
 assert.equal(normalizeTopDrawer('full',top),'siphon','Incompatible tops clear the full drawer');
}

let geometryCases=0,settingsCases=0;
for(const suite of suites){
 const {application,model,configuration,guided,preview,pricing,projects,composition,room,sanitize}=suite;
 const general=application==='randal-general';
 const geometryOptions=general?[
  {format:'harmony-two',width:.80,basinTop:'sella'},
  {format:'harmony-three',width:.80,basinTop:'sella'},
  {format:'aruba-two',width:1.20,basinTop:'sella',basinLayout:'double'},
  {format:'amat-two',width:1.00,basinTop:'sella'},
  {format:'amat-two-door',width:1.00,basinTop:'sella'},
  {format:'brent-niche',width:.80,basinTop:'tampa'}
 ]:[
  {format:'two',width:.40,basinTop:'plain'},
  {format:'three',width:.80,basinTop:'sella'},
  {format:'one-xl',width:.80,basinTop:'sella'},
  {format:'two-xl',width:1.20,basinTop:'sella',basinLayout:'double'},
  {format:'two',width:1.00,basinTop:'sella',basinLayout:'offset'}
 ];
 for(const options of geometryOptions){
  assert(configuration.CABINET_FORMATS.some(f=>f.id===options.format),'Known test format '+options.format);
  const asset=model.makeModel({...options,includeMirror:false});asset.setTop(options.basinTop);
  assert.equal(asset.getTopDrawer(),'siphon',application+' legacy projects default to the U cut');
  asset.root.updateMatrixWorld(true);
  const cutFaces=siphons(asset).filter(o=>o.name==='Passage_siphon_face');
  assert(cutFaces.length>0,application+' '+options.format+' has a genuine default siphon cut');
  const cutPoints=cutFaces.map(face=>face.parent.localToWorld(new T.Vector3(face.position.x,0,-.10)));
  const frontPoints=floors(asset).map(floor=>floor.parent.localToWorld(new T.Vector3(floor.position.x,0,.10)));
  for(const point of cutPoints)assert.equal(hitsFloor(asset,point),false,'Rear U recess must be an actual hole in the floor');
  for(const point of frontPoints)assert.equal(hitsFloor(asset,point),true,'Floor remains solid in front of the siphon recess');
  const lower=asset.drawers.slice(1).map(signature);
  const outer=new T.Box3().setFromObject(asset.cabinet).getSize(new T.Vector3()).toArray();
  assert.equal(asset.setTop('plain'),true);asset.setTopDrawer('full');
  assert.equal(asset.getTopDrawer(),'full');
  assert.equal(siphons(asset).length,0,'Full drawer has no visible siphon walls');
  assert(visible(asset.drawers[0],o=>o.name==='Dos_tiroir').length>0,'Full drawer closes the entire rear edge');
  for(const point of cutPoints)assert.equal(hitsFloor(asset,point),true,'Full floor physically fills every rear U recess');
  for(const point of frontPoints)assert.equal(hitsFloor(asset,point),true,'Full floor remains solid at the front');
  assert.deepEqual(asset.drawers.slice(1).map(signature),lower,'Changing the upper drawer preserves lower drawer geometry');
  assert.deepEqual(new T.Box3().setFromObject(asset.cabinet).getSize(new T.Vector3()).toArray(),outer,'Drawer option preserves exterior furniture dimensions');
  asset.setTopDrawer('siphon');assert.equal(asset.getTopDrawer(),'siphon');
  for(const point of cutPoints)assert.equal(hitsFloor(asset,point),false,'Returning to the U option restores the real floor cut');
  asset.setTopDrawer('full');asset.setTop(options.basinTop==='plain'?'torne':options.basinTop);
  if(options.basinTop!=='plain'){
   assert.equal(asset.getTopDrawer(),'siphon','An integrated basin resets the incompatible full drawer');
   assert(siphons(asset).length>0);asset.setTop('plain');assert.equal(asset.getTopDrawer(),'siphon','The incompatible full choice is not silently revived');
  }
  dispose(asset);geometryCases++;
 }
 for(const top of ['plain','neris','torne']){
  const options={format:general?'harmony-two':'two',width:.80,basinTop:top,topDrawer:'full',includeMirror:false};
  const asset=model.makeModel(options);asset.setTop(top);
  assert.equal(asset.getTopDrawer(),'full','Constructor carries the full option into '+top);
  assert.equal(siphons(asset).length,0);
  assert.equal(hitsFloor(asset,new T.Vector3(0,0,-.10)),true);
  dispose(asset);
 }
 for(const top of general?['sella','tampa','none']:['sella','tampa','bare']){
  const asset=model.makeModel({format:general?'harmony-two':'two',width:.80,basinTop:'plain',topDrawer:'full',includeMirror:false});asset.setTop('plain');
  assert.equal(asset.getTopDrawer(),'full');assert.equal(asset.setTop(top),true);assert.equal(asset.getTopDrawer(),'siphon','Every incompatible top resets the full interior: '+top);
  asset.setTop('plain');assert.equal(asset.getTopDrawer(),'siphon');asset.setTopDrawer('full');asset.setTopDrawer('unknown');assert.equal(asset.getTopDrawer(),'siphon','Unknown model settings reset conservatively');
  dispose(asset);
 }
 if(general)for(const format of ['less-door','sima-counter']){
  const form=configuration.cabinetFormat(format),asset=model.makeModel({format,width:form.widths[0]/100,basinTop:configuration.defaultTop(format),topDrawer:'full',includeMirror:false});
  assert.equal(asset.drawers.length,0);assert.equal(asset.getTopDrawer(),'siphon','Door and counter models cannot retain a full-drawer option');asset.setTopDrawer('full');assert.equal(asset.getTopDrawer(),'siphon');dispose(asset);
 }

 // Direct model consumers also get the correct two-basin plumbing when changing
 // from a full counter drawer to a wide integrated basin.
 const wide=model.makeModel({format:general?'aruba-two':'two',width:1.20,basinTop:'plain',basinLayout:'double',topDrawer:'full',includeMirror:false});
 assert.equal(wide.getTopDrawer(),'full');assert.equal(wide.setTop('sella'),true);assert.equal(wide.getTopDrawer(),'siphon');
 assert.equal(siphons(wide).filter(o=>o.name==='Passage_siphon_face').length,2,'Wide integrated basins restore a real U recess at each bowl');
 for(const face of siphons(wide).filter(o=>o.name==='Passage_siphon_face'))assert.equal(hitsFloor(wide,face.parent.localToWorld(new T.Vector3(face.position.x,0,-.10))),false);
 dispose(wide);

 const initial=guided.initialDraft();
 assert.equal(guided.normalizeDraft({...initial,top:'plain'}).topDrawer,'siphon','Old guided drafts retain the U default');
 for(const top of ['plain','neris','torne']){
  const draft=guided.normalizeDraft({...initial,top,topDrawer:'full'}),project=guided.draftProject(draft),settings=project.items[0].settings;
  assert.equal(draft.topDrawer,'full');assert.equal(settings.topDrawer,'full','Guided transfer keeps the selected drawer');
  const legacy=guided.draftProject({...draft,topDrawer:'siphon'});
  assert.deepEqual(pricing.quoteProject(project),pricing.quoteProject(legacy),'Drawer geometry must not alter catalogue references or public totals');
  const decoded=projects.decodeProject(projects.encodeProject(project));
  assert.equal(decoded.items[0].settings.topDrawer,'full','Share/export roundtrip keeps the drawer');
  const publicData=sanitize({...decoded,purchaseHT:123,items:decoded.items.map(item=>({...item,settings:{...item.settings,purchaseHT:123}}))});
  assert.equal(publicData.items[0].settings.topDrawer,'full');assert.equal(JSON.stringify(publicData).includes('purchaseHT'),false);
  assert(buildPhotorealPrompt(publicData).includes('"topDrawer": "full"'),'Photoreal export includes the real drawer design');
  const built=preview.buildPreview(publicData);
  assert.equal(built.items[0].asset.getTopDrawer(),'full','Guided preview uses the selected physical drawer');
  assert.equal(siphons(built.items[0].asset).length,0);
  for(const item of built.items)dispose(item.asset);
  const sceneRoom=room.makeRoom(publicData.room,0),asset=model.makeModel({format:settings.format,width:settings.width/100,basinTop:settings.top,topDrawer:settings.topDrawer,includeMirror:false});
  asset.setTop(settings.top);const scene=new composition.Composition(sceneRoom),added=scene.add('cabinet',asset,settings,publicData.items[0].placement);
  assert(added.item,added.error);assert.equal(scene.snapshot()[0].settings.topDrawer,'full','Composition snapshots and saved projects keep the option');
  const copySettings={...scene.snapshot()[0].settings,drawers:[...settings.drawers]},copyAsset=model.makeModel({format:settings.format,width:settings.width/100,basinTop:settings.top,topDrawer:copySettings.topDrawer,includeMirror:false});
  copyAsset.setTop(settings.top);const duplicate=scene.add('cabinet',copyAsset,copySettings,{wall:0,u:300,height:settings.format==='three'?0:configuration.cabinetFormat(settings.format).base*100});
  assert(duplicate.item,duplicate.error);assert.equal(duplicate.item.asset.getTopDrawer(),'full');assert.equal(scene.snapshot()[1].settings.topDrawer,'full','Duplicating the composition preserves the option');
  dispose(asset);dispose(copyAsset);sceneRoom.dispose();settingsCases++;
 }
 const integrated=guided.normalizeDraft({...initial,top:'sella',basinColor:'gloss',topDrawer:'full'});
 assert.equal(integrated.topDrawer,'siphon','Guided top changes clear incompatible full drawers');
 assert.equal(guided.draftProject(integrated).items[0].settings.topDrawer,'siphon');
 const unknown=guided.normalizeDraft({...initial,top:'plain',topDrawer:'unknown'});assert.equal(unknown.topDrawer,'siphon');

 if(preview.previewStructure&&preview.applyPreviewSettings){
  const first=guided.draftProject({...initial,top:'plain',topDrawer:'siphon'}),next=guided.draftProject({...initial,top:'plain',topDrawer:'full'});
  let built=preview.buildPreview(first);
  if(preview.previewStructure(first)!==preview.previewStructure(next)){for(const item of built.items)dispose(item.asset);built=preview.buildPreview(next);}else preview.applyPreviewSettings(built,next);
  assert.equal(built.items[0].asset.getTopDrawer(),'full','A live preview refresh updates actual drawer geometry');
  assert.equal(siphons(built.items[0].asset).length,0);
  for(const item of built.items)dispose(item.asset);
 }
}
console.log(JSON.stringify({passed:true,geometryCases,settingsCases,checks:['real rear-floor raycasts and reversible U geometry','single, XL, three-drawer, offset and double-bay cabinets','lower drawers and outside dimensions unchanged','incompatible tops reset to the legacy U default','guided transfer, preview, duplicate and share/export persistence','same catalogue references and public totals','public export retains drawer and strips purchase data']},null,2));
