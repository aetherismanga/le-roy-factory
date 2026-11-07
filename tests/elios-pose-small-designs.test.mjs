import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
function pure(){const window={};vm.runInNewContext(read('assets/js/elios-pose-small-designs.js'),{window});return window.LRF_ELIOS_SMALL_DESIGNS;}
const formats=['6x25','4.8x45','4.8x20'];

test('24 rectangular studies close a real periodic module without holes, overlapping tiles or invented cut shapes',()=>{
 const api=pure();assert.equal(api.layouts.length,8);
 for(const format of formats)for(const layout of api.layouts){
  const geometry=api.generateGeometry(format,layout.id),area=geometry.width*geometry.height;
  assert(geometry.tiles.length>=12);assert.equal(geometry.rows%6,0);assert(geometry.offsetCm<=15+1e-9,'Every offset follows the manufacturer 10–15 cm limit');assert(Math.abs(geometry.rows*geometry.offsetFraction-Math.round(geometry.rows*geometry.offsetFraction))<1e-9,'Offsets close exactly at the repeat boundary');
  assert(Math.abs(geometry.tiles.reduce((sum,tile)=>sum+tile.width*tile.height,0)-area)<area*1e-9);
  for(const tile of geometry.tiles){assert(tile.x>=-1e-8&&tile.y>=-1e-8&&tile.x+tile.width<=geometry.width+1e-8&&tile.y+tile.height<=geometry.height+1e-8);assert([0,90].includes(tile.rotation));
   const [a,b]=format.split('x').map(Number).sort((a,b)=>a-b);assert(Math.abs(tile.fullWidth*tile.fullHeight-a*b)<1e-9,'Every source tile keeps its physical area and aspect');
  }
  for(let i=0;i<geometry.tiles.length;i++)for(let j=i+1;j<geometry.tiles.length;j++){
   const a=geometry.tiles[i],b=geometry.tiles[j],overlapX=Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x),overlapY=Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y);
   assert(overlapX<1e-8||overlapY<1e-8,format+' '+layout.id+' has no overlapping cells');
  }
  const shares=api.shares(geometry);assert(Math.abs(shares[0]-50)<1e-8);assert(Math.abs(shares[1]-50)<1e-8,'The actual closed period uses equal colour areas');
 }
 assert.throws(()=>api.generateGeometry('6x25','fake-miter'),/inconnu/);assert.throws(()=>api.generateGeometry('0x25','aligned-h'),/inconnu/);
});

test('all small-format combinations use only the chosen family references and their exact boxes',()=>{
 const window={};vm.runInNewContext(read('assets/js/elios-pose-data-v1.js'),{window});const data=window.ELIOS_POSE_V1,api=pure();
 for(const family of [data.tropical,data.domus,data.glow,data.golden])for(const layout of api.layouts)for(const primary of family.colors)for(const secondary of family.colors){
  const rows=api.rowsFor(family,{mode:'duo',primary:primary.color,secondary:secondary.color},layout.id);
  assert.equal(rows.length,primary.ref===secondary.ref?1:2);assert(Math.abs(rows.reduce((sum,row)=>sum+row.share,0)-100)<1e-8);
  for(const row of rows){assert(family.colors.some(color=>color.ref===row.ref&&color.color===row.color));assert.equal(row.series,family.series);assert.equal(row.key,family.format);assert.equal(row.pcs,family.pcs);assert.equal(row.boxM2,family.boxM2);assert.equal(row.finish,'');}
 }
 assert.throws(()=>api.rowsFor(data.tropical,{mode:'duo',primary:'Bianco',secondary:'Moon White'},'aligned-h'),/collection/);
 assert.throws(()=>api.rowsFor(data.tropical,{mode:'single',primary:'Nero'},'aligned-h'),/collection/,'Unverified Tropical Nero 6x25 is not invented from an obsolete reference');
 assert.equal(api.rowsFor(data.tropical,{mode:'single',primary:'Bianco',secondary:'does-not-apply'},'half-v')[0].share,100);
});

test('named material samples avoid ambience crops and never borrow another colour',()=>{
 const window={ELIOS_COLOR_MEDIA:{variants:{tropical:{Salvia:['https://example/Elios_Tropical_Salvia_1.jpg','assets/salvia-catalogue-native.webp'],Petrolio:['assets/petrolio-catalogue-native.webp'],Unknown:['https://example/Unknown_amb.jpg']}}}};
 vm.runInNewContext(read('assets/js/elios-pose-small-designs.js'),{window});const api=window.LRF_ELIOS_SMALL_DESIGNS;
 assert.equal(api.mediaFor({series:'Tropical'},'Salvia'),'assets/salvia-catalogue-native.webp');assert.equal(api.mediaFor({series:'Tropical'},'Petrolio'),'assets/petrolio-catalogue-native.webp');assert.equal(api.mediaFor({series:'Tropical'},'Unknown'),'');assert.equal(api.mediaFor({series:'Tropical'},'Missing'),'');
});

function attach(){
 const window={},head={append(){}},document={createElement:()=>({}),head};vm.runInNewContext(read('assets/js/elios-pose-data-v1.js'),{window});const D=window.ELIOS_POSE_V1;
 const state={group:'small',smallSeries:'Tropical',smallColor:'Bianco'},S=window.LRF_ELIOS_POSE_V2={D,state,smallFamilies:[D.tropical,D.domus,D.glow,D.golden],small:()=>S.smallFamilies.find(f=>f.series===state.smallSeries),pattern:()=>D.patterns.find(p=>p.id===state.pattern),renderPattern(){},renderSelection(){}};
 vm.runInNewContext(read('assets/js/elios-pose-small-designs.js'),{window,document});return {S,state,D,api:window.LRF_ELIOS_SMALL_DESIGNS};
}
test('the classic script extends only small formats, keeps official drawings intact and scopes palettes to their collection',()=>{
 const {S,state,D,api}=attach();assert.equal(D.patterns.filter(p=>p.origin==='lrf').length,24);assert.equal(D.patterns.filter(p=>p.group==='small'&&!p.origin).length,6);assert.equal(D.patterns.filter(p=>p.group==='modular').length,22);
 state.pattern='23';assert.equal(S.smallRows(),undefined);state.pattern='LRF-R-6x25-half-h';const initial=S.smallRows();assert.equal(initial.length,2);assert(initial.every(row=>row.series==='Tropical'));
 api.design().primary='Petrolio';api.design().mode='single';assert.equal(S.smallRows().length,1);assert.equal(S.smallRows()[0].ref,'0996B40');
 state.smallSeries='Domus';state.smallColor='Moon White';state.pattern='LRF-R-4.8x45-aligned-v';assert(S.smallRows().every(row=>row.series==='Domus'));assert.equal(api.design().primary,'Moon White');
 state.smallSeries='Tropical';state.pattern='LRF-R-6x25-half-h';assert.equal(api.design().primary,'Petrolio');assert.equal(api.design().mode,'single');
 state.group='modular';assert.equal(S.smallRows(),undefined);
});

test('visible illustrated colour controls update the real smallRows hook, preserve the format and clear LRF markers when leaving',async()=>{
 const {createVisualChoiceDOM,descendants}=await import('./helpers/visual-choice-dom.mjs');const dom=createVisualChoiceDOM(),{document,element}=dom,window=document.defaultView;
 try{
  vm.runInNewContext(read('assets/js/elios-pose-data-v1.js'),{window});const D=window.ELIOS_POSE_V1;
  const node=(tag,id,parent=document.body)=>{const e=element(tag);if(id)e.id=id;parent.append(e);return e;};
  const preview=node('div','ep-preview'),section=node('section','ep-composition-section'),step=node('div',null,section);step.className='ep-step';node('b',null,step);node('small',null,step);const controls=node('div','ep-composition-controls',section);
  for(const id of ['ep-preview-badge','ep-ratios','ep-surface-step'])node('div',id);
  const grid=node('div','ep-pattern-grid'),native=node('select','ep-small-color');native.value='Bianco';
  const state={group:'small',smallSeries:'Tropical',smallColor:'Bianco',pattern:'LRF-R-6x25-half-h'};let calculations=0;
  const S=window.LRF_ELIOS_POSE_V2={D,state,smallFamilies:[D.tropical,D.domus,D.glow,D.golden],$:(selector,root=document)=>root.querySelector(selector),$$:(selector,root=document)=>root.querySelectorAll(selector),small:()=>D.tropical,pattern:()=>D.patterns.find(p=>p.id===state.pattern),calculate(){calculations++;},renderPattern(){},renderSelection(){S.renderPattern();},esc:String,fr:n=>String(n)};
  window.ELIOS_COLOR_MEDIA={variants:{tropical:Object.fromEntries(D.tropical.colors.map(color=>[color.color,['assets/'+color.color.toLowerCase()+'-catalogue-native.webp']]))}};
  const draws=[];const originalCreate=document.createElement.bind(document);document.createElement=tag=>{const e=originalCreate(tag);if(tag==='canvas')e.getContext=()=>({fillRect(){},save(){},restore(){},translate(){},scale(){},beginPath(){},rect(){},clip(){},rotate(){},drawImage(...args){draws.push(args);},fillText(){}});return e;};
  class Image{naturalWidth=600;naturalHeight=600;set src(value){this._src=value;this.onload();}get src(){return this._src;}}
  vm.runInNewContext(read('assets/js/elios-pose-small-designs.js'),{window,document,Image,console});
  for(const pattern of D.patterns.filter(p=>p.group==='small'&&p.origin==='lrf'&&p.parts[0][0]==='6x25')){const button=node('button',null,grid);button.className='ep-pattern';button.dataset.pattern=pattern.id;node('div',null,button);Object.defineProperty(button,'firstElementChild',{get:()=>button.children[0]});}
  S.renderSelection();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(preview.dataset.poseOrigin,'lrf');assert.equal(section.hidden,false);assert.equal(grid.querySelectorAll('canvas').length,8,'Each added layout has its own physical thumbnail');assert(draws.length>0);assert(draws.some(args=>Math.abs(args[7]-24.7)<1e-9),'The Tropical example draws a 3 mm joint');assert.match(controls.textContent,/3 mm.*même calibre/);
  const printedCanvas=preview.querySelector('canvas');for(const handler of window.listeners.get('beforeprint')||[])handler({type:'beforeprint'});assert.equal(preview.querySelector('canvas'),printedCanvas,'Printing preserves the painted canvas instead of replacing it asynchronously');await window.LRF_ELIOS_SMALL_DESIGNS.whenRendered();
  const choose=(slot,color)=>descendants(controls).find(e=>e.dataset?.smallDesignSlot===slot&&e.dataset?.smallDesignColor===color).click();
  choose('primary','Petrolio');assert.equal(state.smallColor,'Petrolio');assert.equal(S.smallRows().find(row=>row.ref==='0996B40').share,50);assert.equal(S.smallRows()[0].key,'6x25');
  const picture=descendants(controls).find(e=>e.dataset?.smallDesignColor==='Petrolio').querySelector('img');assert.match(picture.src,/petrolio-catalogue-native/);
  descendants(controls).find(e=>e.dataset?.smallDesignMode==='single').click();assert.equal(S.smallRows().length,1);assert.equal(S.smallRows()[0].share,100);
  assert.equal(native.value,'Petrolio','Choosing an illustrated palette synchronizes the original selector');
  native.value='Ocra';native.onchange({target:native});assert.equal(S.smallRows()[0].ref,'0996B75');assert(calculations>=3);
  state.smallColor='Blu';S.renderSelection();assert.equal(S.smallRows()[0].ref,'0996B50','The external product gallery is also the source for the active palette');assert.equal(native.value,'Blu');
  state.pattern='23';S.renderPattern();assert.equal(S.smallRows(),undefined);assert.equal(preview.dataset.poseOrigin,undefined);assert.equal(controls.classList.contains('ep-small-design-controls'),false);
  await new Promise(resolve=>setImmediate(resolve));
 }finally{dom.restore();}
});

test('official collection round trips never restore a creative palette after official quantities have been calculated',()=>{
 const window={},document={createElement:()=>({}),head:{append(){}}};vm.runInNewContext(read('assets/js/elios-pose-data-v1.js'),{window});const D=window.ELIOS_POSE_V1;
 const state={group:'small',smallSeries:'Tropical',smallColor:'Bianco',pattern:'23',smallDesigns:{Tropical:{series:'Tropical',mode:'duo',primary:'Blu',secondary:'Petrolio',_mainColor:'Blu'}}};
 const elements={'#ep-preview':{dataset:{}},'#ep-composition-controls':{classList:{remove(){}}},'#ep-pattern-grid':{}};
 const S=window.LRF_ELIOS_POSE_V2={D,state,smallFamilies:[D.tropical,D.domus,D.glow,D.golden],small:()=>S.smallFamilies.find(f=>f.series===state.smallSeries),smallChoice:()=>S.small().colors.find(c=>c.color===state.smallColor),pattern:()=>D.patterns.find(p=>p.id===state.pattern),$:selector=>elements[selector],$$:()=>[],calculate(){state.last={reference:S.smallChoice().ref};},renderPattern(){S.calculate();},renderSelection(){S.renderPattern();}};
 vm.runInNewContext(read('assets/js/elios-pose-small-designs.js'),{window,document});
 for(const [series,pattern,color]of [['Tropical','23','Bianco'],['Tropical','23','Blu'],['Domus','25','Moon White'],['Tropical','23','Bianco'],['Glow','25','Texas'],['Tropical','23','Petrolio']]){
  state.smallSeries=series;state.pattern=pattern;state.smallColor=color;S.renderSelection();
  assert.equal(state.smallColor,color,'An official selection stays authoritative');assert.equal(state.last.reference,S.smallChoice().ref,'The shown selection and calculated reference remain identical');assert.equal(S.smallRows(),undefined);
 }
 assert.equal(state.smallDesigns.Tropical.primary,'Blu','Official browsing leaves the saved creative palette untouched');
});


test('45 cm staggered studies use a 10 cm offset and honest format-specific labels',()=>{
 const {api,D}=attach();
 for(const id of ['half-h','half-v']){
  const geometry=api.generateGeometry('4.8x45',id);assert.equal(geometry.offsetCm,10);assert.equal(geometry.offsetFraction,2/9);assert.equal(geometry.periodRows,18);assert.equal(geometry.rows%18,0);
  assert.match(D.patterns.find(p=>p.id==='LRF-R-4.8x45-'+id).label,/Décalée 10 cm/);assert.doesNotMatch(D.patterns.find(p=>p.id==='LRF-R-4.8x45-'+id).label,/½/);
  assert.equal(api.generateGeometry('6x25',id).offsetCm,12.5);assert.equal(api.generateGeometry('4.8x20',id).offsetCm,10);assert.match(D.patterns.find(p=>p.id==='LRF-R-6x25-'+id).label,/½/);
 }
 assert.equal(api.generateGeometry('4.8x45','third-h').offsetCm,15);
});
