import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parse} from 'acorn';
import * as T from 'three';
import {PLINTH_FINISHES,plinthFinish,plinthSettings,plinthSettingsError,calculatePlinths} from '../../shared/lrf-3d/plinth-math.mjs';
import {buildPlinths,plinthReport} from '../../shared/lrf-3d/plinths.js';
import {makeRoom,DEFAULT_ROOM} from '../../shared/lrf-3d/room.js';
import {pickSelection} from '../../shared/lrf-3d/picking.js';
import {plinthControls,bindPlinthControls} from '../../shared/lrf-3d/plinth-ui.mjs';
import {plinthControls as planPlinthControls} from '../../assets/js/lrf-plinth-ui.mjs';
import {newRoom,quantity,plinthOrderLines} from '../../assets/js/lrf-plan-pose/core.mjs';

const walls=[{key:'w',label:'Mur 1',a:[0,0],b:[400,0],cuts:[[80,163]],tiled:false}],grid={width:120,height:60,toGrid:p=>p};
test('decorative finishes preserve real cuts and 2.20m stock counts; unknown choices fail closed',()=>{
 const legacy=plinthSettings({type:'wood'});assert(!Object.hasOwn(legacy,'finish'));assert.equal(plinthFinish(legacy).id,'white');
 const expected=calculatePlinths(walls,legacy,grid);
 for(const finish of PLINTH_FINISHES){
  const settings={...legacy,finish:finish.id},saved=JSON.parse(JSON.stringify(settings));assert.equal(plinthSettingsError(saved),'');assert.equal(plinthSettings(saved).finish,finish.id);
  const report=calculatePlinths(walls,settings,grid);assert.equal(report.finish,finish.id);
  for(const key of ['net','debit','order','units','stockNeeded','tileArea','tiles'])assert.equal(report[key],expected[key],key);
 }
 assert.match(plinthSettingsError({type:'wood',finish:'unverified'}),/Finition/);assert.throws(()=>calculatePlinths(walls,{type:'wood',finish:'unverified'},grid),/Finition/);
 assert.equal(calculatePlinths(walls,{type:'tile'},grid).tileArea>0,true);
 assert.equal(calculatePlinths(walls,{type:'factory',product:{reference:'REAL-PLINTH',height:8,length:120,packPieces:8}},grid).units%8,0);
});

test('wood colours remain distinct purchase lines across rooms and never acquire invented product references',()=>{
 const rows=PLINTH_FINISHES.map((finish,index)=>{
  const r=newRoom([[0,0],[400,0],[400,300],[0,300]]);r.name='Pièce '+index;r.plinths={...r.plinths,type:'wood',finish:finish.id,purchaseHT:15};return {r,...quantity(r,1)};
 });
 const lines=plinthOrderLines(rows);assert.equal(lines.length,4);assert.deepEqual(lines.map(line=>line.finish).sort(),PLINTH_FINISHES.map(f=>f.id).sort());assert(lines.every(line=>line.length===220&&line.product===null));
 const repeated=plinthOrderLines([rows[0],{...rows[0],r:{...rows[0].r,id:'another-white-room'}}]);assert.equal(repeated.length,1);assert.equal(repeated[0].units,rows[0].plinths.units*2);
});

test('actual visible baseboards can be picked and own only their procedural oak texture',()=>{
 const room=makeRoom(DEFAULT_ROOM,0),finishes=room.walls.map(()=>({collection:'Peinture'})),scene=new T.Scene();scene.add(room.root);
 for(const finish of PLINTH_FINISHES){
  const asset=buildPlinths(room,{type:'wood',finish:finish.id},finishes);room.root.add(asset.group);const meshes=[];asset.group.traverse(object=>{if(object.isMesh)meshes.push(object);});assert(meshes.length>0);
  const mesh=meshes[0],target=mesh.getWorldPosition(new T.Vector3()),normal=room.walls[0].normal,camera=new T.PerspectiveCamera(42,1,.01,100);camera.position.copy(target).addScaledVector(normal,.5);camera.position.y+=.15;camera.lookAt(target);camera.updateMatrixWorld(true);
  const hit=pickSelection(scene,camera,new T.Vector2());assert.equal(hit?.editTarget,'plinth');assert.equal(hit.object.userData.plinthWallKey,'boundary-0');
  if(finish.id==='oak'){
   assert(mesh.material.map.isDataTexture);assert.equal(mesh.material.map.colorSpace,T.SRGBColorSpace);let disposed=0;mesh.material.map.addEventListener('dispose',()=>disposed++);asset.dispose();assert.equal(disposed,1);
  }else{assert.equal(mesh.material.color.getHexString(),finish.hex.slice(1));asset.dispose();}
 }
 const sourceMap=new T.Texture();room.floor.material.map=sourceMap;let sharedDisposed=0;sourceMap.addEventListener('dispose',()=>sharedDisposed++);buildPlinths(room,{type:'tile'},finishes).dispose();assert.equal(sharedDisposed,0,'Deleting a plinth must not dispose the floor tile image');room.dispose();
});

test('shared sidebar controls expose four finish names and reject unknown DOM values before changing state',()=>{
 const settings={type:'wood',finish:'black'},html=plinthControls(walls,settings,calculatePlinths(walls,settings,grid));assert(html.includes('data-plinth-finish'));assert(planPlinthControls(walls,settings,calculatePlinths(walls,settings,grid)).includes('data-plinth-finish'));for(const finish of PLINTH_FINISHES)assert(html.includes(finish.name));
 const events=new Map(),host={querySelector:selector=>selector==='[data-plinth-finish]'?{addEventListener:(_name,callback)=>events.set(selector,callback)}:null,querySelectorAll:()=>[]},changes=[],errors=[];
 bindPlinthControls(host,{getSettings:()=>settings,onChange:next=>changes.push(next),onError:error=>errors.push(error)});
 events.get('[data-plinth-finish]')({target:{value:'invented'}});assert.equal(changes.length,0);assert.equal(errors.length,1);
 events.get('[data-plinth-finish]')({target:{value:'white'}});assert.equal(changes[0].finish,'white');assert.equal(changes[0].purchaseHT,null);
});

for(const app of ['studio-one','randal-general'])test(`${app}: real click and context action open the same plinth inspector; material changes preserve dimensions`,()=>{
 const source=readFileSync(new URL(`../../${app}/src/app.js`,import.meta.url),'utf8'),wanted=['updatePlinthSettings','setPlinthAppearance','plinthContextActions','handleObjectTap','openInspector'],ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),bundle=ast.body.filter(node=>node.type==='FunctionDeclaration'&&wanted.includes(node.id.name)).map(node=>source.slice(node.start,node.end)).join('\n');
 let refreshed=0;const context=vm.createContext({PLINTH_FINISHES,plinthFinish,plinthSettings,plinthSettingsError,plinthConfig:{enabled:true,type:'tile',height:9,thickness:1.2,reserve:8,walls:{'boundary-1':false}},plinthSignature:'old',captureBusy:false,projectWorkspace:null,composition:{items:[]},renovation:{tap:()=>false},matchingPlinthProducts:()=>[],currentFloorFinish:()=>({collection:'Shell',color:'beige'}),placementStatus(){},refreshQuantities:()=>refreshed++,refreshInspector(){},invalidate(){},closeElementPanel(){},stopOrbit(){},closeInspector(){context.editTarget=null;},editTarget:null,tileEditing:false,selectedTile:null,highlightIndividualTile(){}});
 vm.runInContext(bundle,context);context.handleObjectTap({editTarget:'plinth'});assert.equal(context.editTarget,'plinth');context.editTarget=null;context.plinthContextActions({editTarget:'plinth'})[0].run();assert.equal(context.editTarget,'plinth');assert.equal(context.plinthContextActions({editTarget:'floor'}),null);
 assert(context.setPlinthAppearance('white'));assert.equal(context.plinthConfig.type,'wood');assert.equal(context.plinthConfig.finish,'white');assert.equal(context.plinthConfig.height,9);assert.equal(context.plinthConfig.thickness,1.2);assert.equal(context.plinthConfig.walls['boundary-1'],false);
 const saved=JSON.stringify(context.plinthConfig),count=refreshed;assert.equal(context.setPlinthAppearance('unknown'),false);assert.equal(JSON.stringify(context.plinthConfig),saved);assert.equal(refreshed,count);
 context.projectWorkspace={locked:true};assert.equal(context.setPlinthAppearance('black'),false);assert.equal(JSON.stringify(context.plinthConfig),saved);
});
