import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createVisualChoiceDOM, descendants, fire} from './helpers/visual-choice-dom.mjs';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const data=JSON.parse(source('assets/data/elios-segmento.json'));
const settle=()=>new Promise(resolve=>setImmediate(resolve));
async function mount({width=390,failure=false}={}){
 const dom=createVisualChoiceDOM(),document=dom.document,window=document.defaultView;
 window.innerWidth=width;window.matchMedia=()=>({matches:width>760});
 const draws=[];const create=document.createElement.bind(document);
 document.createElement=tag=>{const el=create(tag);Object.defineProperty(el,'firstElementChild',{get:()=>el.children.find(child=>child.nodeType===1)||null});if(tag==='canvas')el.getContext=()=>({fillRect(){},save(){},restore(){},translate(){},rotate(angle){draws.push(angle);},drawImage(){}});return el;};
 const root=document.createElement('main');document.body.append(root);const elements=new Map();
 for(const key of ['#ep-compatible-note','#ep-product-controls','#ep-pattern-grid','#ep-preview-title','#ep-preview-badge','#ep-preview','#ep-ratios','#ep-composition-section','#ep-surface-step','#ep-composition-controls','#ep-composition-section .ep-step b','#ep-composition-section .ep-step small']){const el=document.createElement('div');el.id=key.startsWith('#')&&!key.includes(' ')?key.slice(1):'';root.append(el);elements.set(key,el);}
 const state={group:'segmento',pattern:'S01'};let calculates=0;
 const S={state,D:{},root,$:key=>elements.get(key),$$:()=>[],esc:String,fr:n=>String(n),renderSelection(){},renderPattern(){},renderAll(){S.renderSelection();},pattern:()=>({id:state.pattern,label:state.pattern}),calculate(){calculates++;if(S.segmentoReady)state.last={rows:S.segmentoRows(),pattern:S.pattern()};}};window.LRF_ELIOS_POSE_V2=S;
 const context=vm.createContext({window,document,console:{error(){}},location:{search:''},URLSearchParams,fetch:async()=>({ok:!failure,json:async()=>data}),Image:class{set src(value){this.url=value;queueMicrotask(()=>this.onload?.());}}});
 vm.runInContext(source('assets/js/elios-pose-designs.js'),context);vm.runInContext(source('assets/js/elios-pose-segmento.js'),context);await settle();await settle();
 const buttons=()=>descendants(root).filter(el=>el.tagName==='BUTTON');const button=label=>buttons().find(el=>el.textContent===label);const byClass=(name,scope=root)=>descendants(scope).filter(el=>el.classList?.contains(name));
 return {dom,document,window,root,state,S,draws,elements,buttons,button,byClass,get calculates(){return calculates;},api:window.LRF_ELIOS_SEGMENTO};
}
test('Segmento photos enlarge without choosing while names apply once, with six initial mobile motifs',async()=>{
 const f=await mount();try{
  assert.equal(f.S.segmentoReady,true);assert.equal(f.api.current().id,'S01-A');
  assert.equal(f.byClass('ep-pattern').length,6);assert.ok(f.button('Voir les 12 dessins'));
  const first=f.calculates;f.byClass('ep-segmento-card-photo',f.elements.get('#ep-pattern-grid'))[1].click();
  assert.equal(f.calculates,first);assert.equal(f.api.current().id,'S01-A');assert.ok(f.document.querySelector('.ep-segmento-lightbox'));
  f.document.querySelector('.ep-segmento-close').click();assert.equal(f.document.querySelector('.ep-segmento-lightbox'),null);
  f.byClass('ep-segmento-card-choice',f.elements.get('#ep-pattern-grid'))[1].click();
  assert.equal(f.calculates,first+1);assert.equal(f.api.current().id,'S02-A');
  f.button('Voir les 12 dessins').click();assert.equal(f.byClass('ep-pattern').length,12);
 }finally{f.dom.restore();}
});
test('LRF modes resolve real references and rotate without mutating the manufacturer grid',async()=>{
 const snapshot=JSON.stringify(data),f=await mount();try{
  f.button('Créations LRF').click();assert.equal(f.api.current().origin,'lrf');assert.equal(f.api.current().preview,null);assert.match(f.S.pattern().label,/Création LRF/);assert.equal(f.api.current().tiles.length,36);
  const roles=f.api.roles();assert.ok(roles.length>=2);const base=f.api.base();const target=f.byClass('ep-segmento-color').find(el=>el.dataset.color==='coelestis');const before=f.calculates;
  target.children[0].click();assert.equal(f.calculates,before);assert.equal(f.api.current().tiles.filter(tile=>tile.color==='coelestis').length,0);f.document.querySelector('.ep-segmento-close').click();
  target.children[1].click();assert.equal(f.calculates,before+1);assert.equal(f.api.current().tiles.filter(tile=>tile.color==='coelestis').length,roles[0].count);
  assert.ok(f.state.last.rows.some(row=>row.ref==='04I1530'));assert.equal(f.state.last.rows.reduce((sum,row)=>sum+row.share,0),100);
  const prior=f.api.current();f.button('Tourner de 90°').click();const rotated=f.api.current();for(const tile of prior.tiles){const next=rotated.tiles.find(next=>next.col===5-tile.row&&next.row===tile.col);assert.equal(next.color,tile.color);assert.equal(next.rotation,(tile.rotation+90)%360);}
  assert.equal(f.elements.get('#ep-preview').dataset.poseOrigin,'lrf');assert.equal(f.api.base().id,base.id);assert.equal(JSON.stringify(data),snapshot);
  const pending=f.api.ready();assert.equal(f.api.ready(),pending);await pending;assert.equal(f.api.status().state,'ready');assert.ok(f.draws.length>=36);
 }finally{f.dom.restore();}
});
test('official customization uses a fresh canvas, palettes retain exact SKUs, and reset restores the crop',async()=>{
 const f=await mount({width:1000});try{
  const official=f.api.current();assert.ok(official.preview);
  f.byClass('ep-segmento-palette-choice')[1].click();const custom=f.api.current();assert.equal(custom.preview,null);assert.equal(custom.origin,'lrf');assert.ok(f.state.last.rows.every(row=>data.colors.some(color=>color.ref===row.ref)));
  assert.equal(f.elements.get('#ep-preview').children[0].tagName,'CANVAS');assert.equal(f.elements.get('#ep-preview').dataset.poseOrigin,'lrf');
  f.button('Revenir à la composition Elios').click();assert.equal(f.api.current().id,official.id);assert.equal(f.api.current().preview,official.preview);assert.equal(f.elements.get('#ep-preview').dataset.poseOrigin,'elios');
  assert.equal(f.elements.get('#ep-preview').children[0].tagName,'IMG');
 }finally{f.dom.restore();}
});
test('search and colour filters preserve the current drawing and expose an explicit empty state',async()=>{
 const f=await mount();try{
  const current=f.api.current().id,search=f.document.getElementById('ep-segmento-search');search.value='04I1530';fire(search,'input');assert.ok(f.byClass('ep-pattern').length>0);assert.equal(f.api.current().id,current);
  const filter=f.document.getElementById('ep-segmento-filter-color');filter.value='duplex-a';fire(filter,'change');assert.equal(f.byClass('ep-pattern').length,0);assert.match(f.byClass('ep-segmento-empty')[0].textContent,/Aucun dessin/);assert.equal(f.api.current().id,current);
  f.button('Effacer les filtres').click();assert.equal(f.state.segmentoQuery,'');assert.equal(f.byClass('ep-pattern').length,6);
 }finally{f.dom.restore();}
});
test('missing Segmento data keeps readiness false and reports the failure',async()=>{
 const f=await mount({failure:true});try{assert.equal(f.S.segmentoReady,false);assert.equal(f.api,undefined);assert.match(f.document.querySelector('.ep-segmento-error').textContent,/n’a pas pu être chargé/);assert.ok(f.calculates>0);}finally{f.dom.restore();}
});

test('displayed motif names are searchable, keyboard focus survives edits, and preview traps Tab',async()=>{
 const f=await mount();try{
  const search=f.document.getElementById('ep-segmento-search');search.value='motif01';fire(search,'input');assert.equal(f.byClass('ep-pattern').length,1);
  f.button('Effacer les filtres').click();f.button('Créations LRF').click();
  const role=f.byClass('ep-segmento-role')[1];role.focus();role.click();assert.equal(f.document.activeElement.dataset.segmentoFocus,role.dataset.segmentoFocus);
  const rotate=f.button('Tourner de 90°');rotate.focus();rotate.click();assert.equal(f.document.activeElement.textContent,'Tourner de 90°');
  const enlarge=f.button('Agrandir l’aperçu');enlarge.click();const close=f.document.querySelector('.ep-segmento-close');assert.equal(f.document.activeElement,close);
  const event={type:'keydown',key:'Tab',bubbles:false,shiftKey:true};f.document.dispatchEvent(event);assert.equal(event.defaultPrevented,true);assert.equal(f.document.activeElement,close);
  f.document.dispatchEvent({type:'keydown',key:'Escape',bubbles:false});assert.equal(f.document.querySelector('.ep-segmento-lightbox'),null);assert.equal(f.document.activeElement,enlarge);
 }finally{f.dom.restore();}
});
