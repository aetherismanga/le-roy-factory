import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {initialDraft,draftProject} from '../src/commerce/guided.js';
import {CATALOG} from '../src/commerce/catalog.js';
import {buildPreview,applyPreviewSettings,previewItems,previewStructure,visibleBounds,FINISHES,mirrorGeometry} from '../src/commerce/preview-model.js';
import {bindQuoteReturn} from '../src/commerce/atelier.js';
import {QUOTE_KEY,CURRENT_KEY,readStored} from '../src/commerce/flow.js';
import {quoteProject} from '../src/commerce/pricing.js';
import {applyMirrorLighting} from '../../shared/lrf-3d/mirror-lighting.js';
import {makeMirrorReflector} from '../../shared/lrf-3d/mirror-reflection.js';
import {configureColourRendering} from '../../shared/lrf-3d/colour-rendering.js';
import {createHDCapture,captureSize} from '../../shared/lrf-3d/hd-capture.js';

class Storage {
 constructor(){this.values=new Map();}
 getItem(key){return this.values.get(key)||null;}
 setItem(key,value){this.values.set(key,String(value));}
}
function dispose(preview){preview.group.traverse(o=>{o.geometry?.dispose();for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])m.dispose();});}

const input=draftProject({...initialDraft(),width:120,finish:'NOGAL',column:true,columnFinish:'NOGAL',top:'tampa',basinColor:'gloss',mirror:'metal-rect',mirrorSize:1,mirrorFinish:'Bronze'});
// prepareAddition() in the workshop seeds shared settings on newly added items,
// including the last cabinet finish on mirrors and bathroom equipment.
for(const item of input.items)Object.assign(item.settings,{finish:'NOGAL',drawers:[0,0]});
input.items.push({id:'workshop-bath',type:'bath',settings:{finish:'NOGAL',kind:'rect',width:170,depth:75},placement:{wall:2,u:200,height:0}});
input.floor={collection:'Shell',color:'ivory'};
input.profiles={enabled:true,color:'Bronze'};
input.views=[{position:[1,2,3],target:[0,1,0]}];
const storage=new Storage(),link={};
bindQuoteReturn(link,()=>input,storage);
link.onclick({preventDefault(){assert.fail('The complete project must return to the quote.');}});
const returned=readStored(storage,QUOTE_KEY),before=JSON.stringify(returned),price=quoteProject(returned);
assert.deepEqual(returned,input);
assert.deepEqual(readStored(storage,CURRENT_KEY),input);
const preview=buildPreview(returned);
assert.deepEqual(preview.items.map(i=>i.type),['cabinet','column','mirror']);
assert.equal(preview.group.children.length,3,'Only furniture roots enter the preview; no room, openings or equipment.');
for(const item of preview.items)applyMirrorLighting(item);
applyPreviewSettings(preview,returned);
const mirror=preview.items.find(i=>i.type==='mirror');
assert.equal(mirror.asset.spec.reference,'10575','The bronze mirror reference survives the return.');
const frame=mirror.asset.root.getObjectByName('Cadre_metal_noir').material;
const frameColor=frame.color.clone();
assert(!frame.color.equals(preview.items[0].asset.wood.color),'The metal frame does not inherit the cabinet wood finish.');
const changed=structuredClone(returned);
for(const item of changed.items)if(item.type==='cabinet'||item.type==='column')item.settings.finish='WHITE';
applyPreviewSettings(preview,changed);
assert(frame.color.equals(frameColor),'Updating furniture finishes leaves the mirror metal unchanged.');
assert(visibleBounds(preview.group).getSize(new T.Vector3()).toArray().every(v=>Number.isFinite(v)&&v>0));
assert.equal(JSON.stringify(returned),before,'Previewing must never strip the environment from the saved project.');
assert.deepEqual(quoteProject(returned),price,'All references and prices remain unchanged.');
const environmentOnly=structuredClone(returned);
environmentOnly.floor.color='grey';environmentOnly.walls=[];environmentOnly.items.push({id:'extra-door',type:'door',settings:{finish:'NOGAL'},placement:{wall:3,u:100,height:0}});
assert.equal(previewStructure(environmentOnly),previewStructure(returned),'Room finishes and excluded equipment do not rebuild furniture.');
const moved=structuredClone(returned);moved.room.points[1][0]+=30;
assert.notEqual(previewStructure(moved),previewStructure(returned),'Furniture mounts refresh when the supporting room changes.');
assert.deepEqual(previewItems(returned).map(i=>i.id),preview.items.map(i=>i.id));
dispose(preview);

// Execute the real asynchronous preview controller as well as the model builder.
// Only the GPU, image decoder and DOM are doubles; this is not a WebGL test.
class Renderer {
 constructor(){this.shadowMap={};this.capabilities={getMaxAnisotropy:()=>8};}
 setPixelRatio(){} setSize(){} render(){} dispose(){}
}
class PMREM {
 fromScene(){const texture=new T.Texture();return {texture,dispose:()=>texture.dispose()};}
 dispose(){}
}
class Controls {
 constructor(){this.target=new T.Vector3();}
 addEventListener(){} update(){} dispose(){}
}
const canvas={setAttribute(){},addEventListener(){},remove(){}};
const host={clientWidth:700,clientHeight:900,prepend(){}};
const context=vm.createContext({T:{...T,WebGLRenderer:Renderer,PMREMGenerator:PMREM,TextureLoader:class{async loadAsync(){return new T.Texture();}}},OrbitControls:Controls,RoomEnvironment,RectAreaLightUniformsLib,makeMirrorReflector,applyMirrorLighting,buildPreview,visibleBounds,previewStructure,previewItems,applyPreviewSettings,FINISHES,mirrorGeometry,configureColourRendering,createHDCapture,captureSize,document:{createElement:()=>canvas},devicePixelRatio:1,innerWidth:1440,requestAnimationFrame:()=>1,cancelAnimationFrame(){},ResizeObserver:class{observe(){}disconnect(){}}});
const source=readFileSync(new URL('../src/commerce/live-preview.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export function createPreview','function createPreview');
vm.runInContext(source,context);
const engine=context.createPreview(host);
try{
 assert.equal(await engine.update(returned),true,'The asynchronous texture application must accept a workshop mirror carrying a cabinet finish.');
 assert.deepEqual(Array.from(engine.diagnostics().items,i=>i.type),['cabinet','column','mirror']);
 await engine.update(changed);
 assert.equal(engine.diagnostics().geometryBuilds,1,'Finish updates reuse the furniture geometry.');
 await engine.update(environmentOnly);
 assert.equal(engine.diagnostics().items.length,3,'Environment equipment never enters the live preview.');
 await engine.update(moved);
 assert.equal(engine.diagnostics().geometryBuilds,2,'Changed supporting walls update furniture placement.');
 assert.equal(JSON.stringify(returned),before);
}finally{engine.dispose();}

let cases=0;
for(const model of CATALOG.mirrors)for(const finish of FINISHES){
 const project=draftProject({...initialDraft(),finish:finish.id,column:true,columnFinish:finish.id,mirror:model.id});
 project.items.find(i=>i.type==='mirror').settings.finish=finish.id;
 const composition=buildPreview(project);
 try{applyPreviewSettings(composition,project);assert.equal(composition.items.filter(i=>i.type==='mirror').length,1);cases++;}finally{dispose(composition);}
}
console.log(JSON.stringify({passed:true,mirrorFinishCases:cases,checks:['Workshop return with shared mirror finish','Cabinet, basin, column and mirror preserved','Furniture-only preview, complete saved environment retained','Metal frame and quote prices unchanged','Room changes invalidate furniture mounts','Real asynchronous preview updates with synthetic textures'],limits:'CPU geometry/controller tests; renderer, decoder and DOM doubles; no GPU validation.'},null,2));
