import assert from 'node:assert/strict';
import * as T from 'three';
import {makeModel} from '../src/model.js';
import {BLACK_LEG_SPEC,DRAWER_METAL} from '../src/cabinet-hardware.js';
import {CABINET_FORMATS,cabinetHeightLabel,drawerTravel,topAvailable} from '../src/configuration.js';
import {makeRoom,DEFAULT_ROOM} from '../src/room.js';
import {Composition,boundsOnWall,disposeObject,itemDimensions} from '../src/composition.js';
import {buildPreview,visibleBounds} from '../src/commerce/preview-model.js';
import {draftProject,initialDraft} from '../src/commerce/guided.js';
import {quoteProject} from '../src/commerce/pricing.js';
import {CATALOG} from '../src/commerce/catalog.js';
import {cabinetDrawing} from '../src/commerce/visuals.js';
import {encodeProject,decodeProject} from '../src/projects.js';

const close=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const box=o=>new T.Box3().setFromObject(o);
const room=makeRoom(DEFAULT_ROOM,0);
function checkDrawerMetal(model){
 assert.equal(model.drawerMetal.color.getHexString(),'34383b');assert.equal(model.drawerMetal.metalness,DRAWER_METAL.metalness);
 for(const drawer of model.drawers)drawer.traverse(o=>{if(/^(Fond_tiroir|Flanc_anthracite|Dos_tiroir|Contre_facade)/.test(o.name)){assert.equal(o.material,model.drawerMetal);assert.equal(o.material.map,null);}});
}

let variants=0;
for(const width of [40,60,80,100,120])for(const top of ['bare','plain','sella','tampa','neris','torne']){
 if(!topAvailable(top,width))continue;
 const settings={format:'three',width,top,finish:'BLANCO',drawers:[0,0,0]},model=makeModel({width:width/100,format:'three',includeMirror:false});
 model.setTop(top);model.root.updateMatrixWorld(true);
 close(model.spec.height,.81);close(model.spec.bottom,.10);close(model.spec.legHeight,.10);close(model.spec.totalHeight,.91);
 close(box(model.cabinet).min.y,.10);close(box(model.cabinet).max.y,.91);close(box(model.cabinet).getSize(new T.Vector3()).y,.81);
 assert.equal(model.legs.children.length,4);assert.equal(model.drawers.length,3);checkDrawerMetal(model);
 for(const leg of model.legs.children){assert.equal(leg.userData.hardware.id,BLACK_LEG_SPEC.id);assert.equal(leg.userData.hardware.finish,'black');const support=leg.getObjectByName('Pied_ALBUFERA_metal_noir'),plate=leg.getObjectByName('Platine_triangulaire_percee_noire');assert(support&&plate);assert.equal(support.material.color.getHexString(),'171d20');assert.equal(plate.geometry.parameters.shapes.holes.length,5);assert(!leg.getObjectByName('Pied_chrome_10cm'));}

 for(const leg of model.legs.children){close(box(leg).min.y,0);close(box(leg).max.y,.10);assert(box(leg).min.x>=-width/200&&box(leg).max.x<=width/200);}
 const fronts=model.frontMeshes.map(o=>box(o).getCenter(new T.Vector3()).y);
 close(fronts[0]-fronts[1],.271);close(fronts[1]-fronts[2],.27);
 const comp=new Composition(room),added=comp.add('cabinet',model,settings,{wall:0,u:150});assert(added.item,added.error);
 assert.equal(added.item.placement.height,0);close(box(added.item.asset.legs).min.y,0);close(boundsOnWall(room,added.item).bottom,0);
 close(itemDimensions('cabinet',settings).height,.93+(top==='neris'?.14:top==='torne'?.12:0));
 for(let i=0;i<3;i++)model.drawers[i].position.z=drawerTravel(i,3);
 model.root.updateMatrixWorld(true);assert(box(model.drawers[2]).max.z>.5,'The lower drawer really opens');
 comp.remove(added.item.id);variants++;
}
for(const form of CABINET_FORMATS.filter(f=>f.id!=='three')){
 const m=makeModel({format:form.id,includeMirror:false});checkDrawerMetal(m);close(m.spec.height,form.height);close(m.spec.bottom,.28);assert.equal(m.legs.children.length,0);disposeObject(m.root);
}
const project=draftProject({...initialDraft(),format:'three',width:80,top:'plain'}),saved=decodeProject(encodeProject(project));
const preview=buildPreview(saved),model=preview.items[0].asset;
close(box(model.legs).min.y,0);close(box(model.cabinet).min.y,.10);close(box(model.cabinet).max.y,.91);close(visibleBounds(preview.group).min.y,0);
const restored=new Composition(room),raw=saved.items[0],m=makeModel({width:.8,format:'three',includeMirror:false});m.setTop('plain');
const item=restored.add(raw.type,m,raw.settings,raw.placement).item;assert(item);close(box(item.asset.legs).min.y,0);close(box(item.asset.cabinet).max.y,.91);
const quoted=quoteProject(project);assert.match(quoted.rows[0].detail,/caisson 81 cm \+ pieds 10 cm/);
assert.equal(quoteProject(draftProject({...initialDraft(),width:120,format:'three',top:'plain',column:true,mirror:'basic'})).publicTTC,146080);
assert.match(cabinetHeightLabel('three'),/caisson 81 \+ pieds 10 cm/);
const illustration=cabinetDrawing('three');assert.match(illustration,/data-part="legs"/);assert.match(illustration,/caisson 81 cm et pieds 10 cm/);assert.match(illustration,/hauteur totale 91 cm/);
const catalogue=CATALOG.models.find(m=>m.id==='three');assert.equal(catalogue.height,catalogue.bodyHeight+catalogue.legHeight);assert.equal(catalogue.base,'13693');
disposeObject(preview.group);disposeObject(item.root);room.dispose();
console.log(JSON.stringify({passed:true,variants,checks:['81 cm carcass, four manufacturer black ALBUFERA 10 cm legs with drilled triangular plates, total 91 cm','Anthracite metal drawer floors, sides, backs and inner fronts on every Studio format','Ground placement in selection preview, workshop and saved projects','Three working drawers at five widths and every compatible top','Other cabinet formats, catalogue references and prices preserved','Selection drawing and quote state the complete dimensions']}));
