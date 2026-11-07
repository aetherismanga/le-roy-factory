import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
function fixture(failImage=''){
 const context=vm.createContext({window:{},console});vm.runInContext(read('assets/js/elios-pose-data-v1.js'),context);
 const data=context.window.ELIOS_POSE_V1,events=new Map(),elements=new Map(),painted=[];
 const element=tag=>({tagName:tag.toUpperCase(),dataset:{},children:[],isConnected:true,textContent:'',attributes:{},classList:{add(){}},append(...nodes){this.children.push(...nodes);},replaceChildren(...nodes){this.children=nodes;},setAttribute(key,value){this.attributes[key]=value;},getContext(){return {save(){},restore(){},beginPath(){},closePath(){},rect(){},clip(){},moveTo(){},lineTo(){},fillRect(){},translate(){},rotate(){},stroke(){},drawImage(image,...coords){painted.push({source:image.src,coords});}};}});
 for(const id of ['#ep-preview','#ep-preview-badge','#ep-preview-title','#ep-pattern-grid'])elements.set(id,element('div'));
 let baseRenders=0;const state={group:'sedimenti',pattern:'29',colorsSedimenti:{A:'White Selected',B:'Beige Selected',C:'Grey Selected'}};
 const S={D:data,state,$:key=>elements.get(key),$$:()=>[],renderPattern(){baseRenders++;}};
 context.window.LRF_ELIOS_POSE_V2=S;context.window.addEventListener=(event,fn)=>events.set(event,fn);
 context.document={createElement:element,head:{append(){}}};
 context.Image=class {constructor(){this.width=this.naturalWidth=1400;this.height=this.naturalHeight=700;}set src(value){this._src=value;queueMicrotask(()=>failImage&&value.includes(failImage)?this.onerror?.():this.onload?.());}get src(){return this._src;}};
 vm.runInContext(read('assets/js/elios-pose-sedimenti-preview.js'),context);
 return {S,api:context.window.LRF_ELIOS_SEDIMENTI_PREVIEW,element,elements,events,painted,renders:()=>baseRenders};
}

test('the four Sedimenti layouts retain the original PDF rectangle and quad paths, with complete colour roles',()=>{
 const {api}=fixture();
 assert.match(api.source.source,/PDF page 226/);assert.match(api.source.sourceSha256,/^[a-f0-9]{64}$/);
 for(const [id,count]of [['29',49],['30',68],['31',105],['32',72]]){
  const cells=api.getShapes(id);assert.equal(cells.length,count);
  for(const cell of cells){assert.equal(cell.points.length,4);assert.ok(['A','B','C'].includes(cell.slot));assert.ok(cell.points.every(point=>point.every(value=>Number.isFinite(value)&&value>-.4&&value<1.4)));}
  assert.equal(new Set(cells.map(cell=>JSON.stringify(cell.points))).size,count);
 }
 const before=api.getShapes('29')[0].points[0][0];api.getShapes('29')[0].points[0][0]=99;assert.equal(api.getShapes('29')[0].points[0][0],before,'Geometry callers cannot mutate the canonical PDF paths');
 assert.deepEqual(Array.from(api.getShapes('29').reduce((map,cell)=>map.set(cell.slot,(map.get(cell.slot)||0)+1),new Map())),[['C',16],['B',24],['A',9]],'Source border crop contains complete 30 × 30, band and cabochon paths');
});

test('each colour role resolves the exact Selected reference and never borrows a Tumbled sample',()=>{
 const {api}=fixture();
 const cells=api.resolveCells('29',{A:'Sand Selected',B:'White Selected',C:'Grey Selected'});
 for(const [slot,ref]of [['A','03Z3303'],['B','03Z7301'],['C','03Z7704']]){
  const role=cells.filter(cell=>cell.slot===slot);assert.ok(role.length);assert.ok(role.every(cell=>cell.reference===ref));assert.ok(role.every(cell=>cell.image.includes('-SELECTED_z.jpg')));
 }
 assert.throws(()=>api.resolveCells('29',{A:'White Tumbled'}),/inconnue/);
 assert.equal(api.getShapes('32').filter(cell=>cell.slot==='A').length,30,'The printed grey 40% role is A in drawing 32');
});

test('paint uses actual Selected photos with aspect-preserving cover crops and does not alter purchasing data',async()=>{
 const {S,api,element,painted}=fixture(),before=JSON.stringify(S.D.patterns),state=JSON.stringify(S.state);
 const canvas=element('canvas');assert.equal(await api.paint(canvas,'29',S.state.colorsSedimenti,600),true);
 assert.equal(painted.length,49);assert.equal(canvas.dataset.loaded,'true');
 assert.match(canvas.attributes['aria-label'],/Simulation couleurs LRF/);
 for(const call of painted){assert.match(call.source,/-SELECTED_z\.jpg$/);const [, ,sw,sh,,,dw,dh]=call.coords;assert.ok(Math.abs(sw/sh-dw/dh)<1e-9,'A material sample is cropped, never stretched');}
 assert.equal(JSON.stringify(S.D.patterns),before);assert.equal(JSON.stringify(S.state),state);
});

test('the live preview declares its LRF origin synchronously and prints the current palette without changing it',async()=>{
 const {S,api,elements,events,renders}=fixture();const before=JSON.stringify(S.state);
 S.renderPattern();assert.equal(renders(),1);assert.equal(elements.get('#ep-preview').dataset.poseOrigin,'lrf');assert.match(elements.get('#ep-preview-badge').textContent,/Simulation couleurs LRF · schéma Elios/);assert.equal(elements.get('#ep-preview').children[0].tagName,'CANVAS');
 S.state.colorsSedimenti.A='Sand Selected';S.renderPattern();await api.whenRendered();const printedCanvas=elements.get('#ep-preview').children[0];events.get('beforeprint')?.();
 assert.equal(api.resolveCells('29').find(cell=>cell.slot==='A').reference,'03Z3303');assert.equal(renders(),2,'Only the explicit palette change invokes the original renderer');assert.equal(elements.get('#ep-preview').children[0],printedCanvas,'Beforeprint retains the fully painted canvas');
 assert.equal(JSON.parse(before).group,S.state.group);
 await new Promise(resolve=>setImmediate(resolve));
});


test('an unavailable Selected image is labelled explicitly and never replaced by a neighbouring colour',async()=>{
 const {S,api,elements,painted}=fixture('SAND-SELECTED');S.state.colorsSedimenti.A='Sand Selected';S.renderPattern();await api.whenRendered();
 const preview=elements.get('#ep-preview'),canvas=preview.children[0],note=preview.children[1];
 assert.equal(canvas.dataset.loaded,'false');assert.equal(note.className,'ep-sedimenti-image-note');assert.match(note.textContent,/photo de couleur est indisponible/);
 assert.equal(api.resolveCells('29').find(cell=>cell.slot==='A').reference,'03Z3303');assert.ok(painted.every(call=>!call.source.includes('WHITE-SELECTED')),'A missing Sand image never borrows White');
});
