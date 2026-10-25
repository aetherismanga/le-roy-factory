import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const code = await readFile(new URL('../../assets/js/carte-core.js',import.meta.url),'utf8');
const core = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const {mapClient,mapPartnerOptions,matchesMapPartner,mapPartnerKey}=core;

test('manufacturer associations normalize actual string/object aliases, accents and punctuation',()=>{
 const a=mapClient('real-document',{id:'legacy-id',partenaires:['ELIOS-CERAMICA',{id:'view-ceramica',nom:'VIEW Céramica'}],fabricants:[{id:'factory-17',name:'Matières & Déco'}]});
 assert.equal(a.id,'real-document');
 assert.equal(matchesMapPartner(a,'elios ceramica'),true);
 assert.equal(matchesMapPartner(a,'view_ceramica'),true);
 assert.equal(matchesMapPartner(a,'MATIERES et DECO'),false);
 assert.equal(matchesMapPartner(a,'matières & déco'),true);
 assert.equal(mapPartnerKey(' VIEW Céramica '),'view-ceramica');
 assert.equal(matchesMapPartner(a,''),true);
 assert.equal(matchesMapPartner(a,'unrelated-partner'),false);
});

test('options unify supplied name/ID bridges without inventing manufacturers or mutating source records',()=>{
 const raw={partenaires:[{id:'factory-17',name:'Matières & Déco'}]};
 const before=JSON.stringify(raw);
 const items=[mapClient('a',raw),mapClient('b',{fabricants:['Matières & Déco']}),mapClient('c',{partenaires:['factory-17']}),mapClient('empty',{})];
 const options=mapPartnerOptions(items);
 assert.equal(options.length,1);
 assert.equal(options[0].label,'Matières & Déco');
 assert.deepEqual(options[0].aliases,['factory-17','matieres-deco']);
 for(const item of items.slice(0,3))assert.equal(matchesMapPartner(item,options[0].key,options),true);
 assert.equal(matchesMapPartner(items[3],options[0].key,options),false);
 assert.equal(JSON.stringify(raw),before);
 assert.deepEqual(mapPartnerOptions([mapClient('nothing',{})]),[]);
});

async function boot(){
 const html=await readFile(new URL('../../carte.html',import.meta.url),'utf8');
 const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/^\s*import .*;\s*$/gm,'');
 const elements=new Map(),docEvents={},winEvents={},visible=new Set();let snapshot,framed=0,created=0;
 const element=(id,filter)=>({id,value:'',textContent:'',classList:{add(){},remove(){},toggle(){}},getAttribute:n=>n==='data-filter'?filter:null,events:{},addEventListener(n,cb){this.events[n]=cb},fire(n){this.events[n]?.({target:this,currentTarget:this})}});
 const filters=['all','jerome','coryne'].map(value=>element(value,value));
 const map={setView(){framed++;return this},fitBounds(){framed++},invalidateSize(){}};
 const layer={addTo(){return this},hasLayer:m=>visible.has(m),addLayer:m=>visible.add(m),removeLayer:m=>visible.delete(m)};
 const L={map:()=>map,tileLayer:()=>({addTo(){}}),layerGroup:()=>layer,divIcon:x=>x,latLngBounds:x=>x,marker:()=>{created++;return{setLatLng(){return this},setIcon(){return this},bindPopup(){return this}}}};
 const document={addEventListener:(n,cb)=>docEvents[n]=cb,getElementById:id=>{if(!elements.has(id))elements.set(id,element(id));return elements.get(id)},querySelectorAll:()=>filters,querySelector:()=>filters[0]};
 const window={location:{},addEventListener:(n,cb)=>winEvents[n]=cb,dispatchEvent:e=>winEvents[e.type]?.(e)};
 vm.runInNewContext(script,{...core,db:{},collection:()=>({}),onSnapshot:(_,cb)=>{snapshot=cb;return()=>{}},waitForAgent:async()=>({}),document,window,L,localStorage:{getItem:()=>'Agent Démo'},setInterval(){},setTimeout,clearTimeout,requestAnimationFrame:cb=>cb(),CustomEvent:class{constructor(type,opt){this.type=type;this.detail=opt?.detail}},Date,Map,Set,Number,String,JSON,console,AbortController,fetch(){throw Error('Unexpected network')}});
 await docEvents.DOMContentLoaded();
 return {snapshot:rows=>snapshot({forEach:cb=>rows.forEach(([id,data])=>cb({id,data:()=>data}))}),elements,visible,framed:()=>framed,created:()=>created};
}
const rows=[['a',{societe:'DÉMO A',lat:43,lon:3,partenaires:['ELIOS-CERAMICA'],codePostal:'34000'}],['b',{societe:'DÉMO B',lat:44,lon:4,fabricants:[{id:'view-ceramica',nom:'VIEW Céramica'}],codePostal:'30000'}]];
test('select filters real marker layers and snapshots preserve selection and map framing',async()=>{
 const ui=await boot();ui.snapshot(rows);
 assert.equal(ui.visible.size,2);const select=ui.elements.get('partner-select');
 assert.match(select.innerHTML,/elios-ceramica/);assert.match(select.innerHTML,/VIEW Céramica/);
 select.value='view-ceramica';select.fire('change');
 assert.equal(ui.visible.size,1);assert.equal([...ui.visible][0].__lrfClientId,'b');
 const framed=ui.framed();ui.snapshot(rows);
 assert.equal(select.value,'view-ceramica');assert.equal(ui.framed(),framed);assert.equal(ui.created(),2);
 const dept=ui.elements.get('dept-select');dept.value='34';dept.fire('change');assert.equal(ui.visible.size,0);
 select.value='';select.fire('change');assert.equal(ui.visible.size,1);assert.equal([...ui.visible][0].__lrfClientId,'a');
});
