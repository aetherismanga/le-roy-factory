import assert from 'node:assert/strict';
import {rowShift,tileModules,buildTileGeometry,normalizeTileLayout} from '../tile-layout.js';
import {COLLECTIONS,formatsForColor,layoutPatterns,normalizeLayout,opusForFormat} from '../surface-catalog.js';
import {overlapArea} from '../plan-topology.mjs';
import {renderGroutChoices,renderSurfacePicker} from '../surface-picker.js';

const close=(a,b,t=1e-7)=>assert(Math.abs(a-b)<t,`${a} != ${b}`);
for(const [row,expected]of [[0,0],[1,.4],[2,.8],[3,0],[-1,.8],[-2,.4]])close(rowShift('third',row,1.2),expected);
const third=tileModules({minX:0,maxX:3,minY:0,maxY:2},{width:1.2,height:.6,pattern:'third'});
close(third.find(c=>c.col===0&&c.row===1).x,.4);
close(third.find(c=>c.col===0&&c.row===2).x,.8);
assert(layoutPatterns('Creta','caramello','60x120').some(p=>p.id==='third'));
assert(!layoutPatterns('Creta','caramello','60x120').some(p=>p.id==='opus'),'A ratio-compatible pair of sizes is not a manufacturer Opus kit');
assert.equal(normalizeLayout({pattern:'opus'},'Creta','60x120','caramello').pattern,'straight');
for(const name of ['Roma','Sedimenti']){
 const id='Opus · module 4 formats',color=COLLECTIONS[name].colors[0].id;
 assert.deepEqual(layoutPatterns(name,color,id).map(p=>p.id),['opus']);
 const module=opusForFormat(name,id,color);assert(module.verified&&module.source.endsWith('.pdf'));
 assert.equal(normalizeLayout({pattern:'third'},name,id,color).pattern,'opus');
 assert(!layoutPatterns(name,color,'60x120').some(p=>p.id==='opus'),'Regular rectangles cannot silently become a mixed module');
}
for(const id of ['23.4x95.7','15x85','7.5x40.7']){
 assert.deepEqual(layoutPatterns('Yosemite','honey',id).map(p=>p.id),['chevron']);
 const layout=normalizeLayout({pattern:'offset'},'Yosemite',id,'honey');assert.equal(layout.pattern,'chevron');assert.equal(layout.shape,'chevron');
}
assert(layoutPatterns('Yosemite','natural','23.4x119.5').some(p=>p.id==='third'));
assert(!formatsForColor('Yosemite','natural').some(f=>f.id==='15x85'),'Small Honey/Amber chevron cannot appear in another manufacturer colour');
assert.equal(normalizeLayout({pattern:'chevron',width:.957,height:.234},'Yosemite','23.4x119.5','honey').pattern,'straight','An explicit new format wins over the old layout dimensions');
const allContinuous=COLLECTIONS.Allure?.colors.find(c=>c.continuousDecor);
if(allContinuous)assert.deepEqual(layoutPatterns('Allure',allContinuous.id,formatsForColor('Allure',allContinuous.id)[0].id).map(p=>p.id),['straight']);

// Manufacturer chevrons are mitred parallelograms: no overlapping rectangular
// ends, finite clipped geometry around openings, correct area and usable UVs.
for(const direction of ['horizontal','vertical'])for(const planAxes of [false,true]){
 const layout={width:.957,height:.234,shape:'chevron',pattern:'chevron',chevronAngle:45,direction,planAxes,groutWidth:2};
 assert.equal(normalizeTileLayout(layout).shape,'chevron');
 const modules=tileModules({minX:0,maxX:2,minY:0,maxY:2},layout);
 assert(new Set(modules.map(c=>c.key)).size===modules.length);
 for(let a=0;a<modules.length;a++)for(let b=a+1;b<modules.length;b++)close(overlapArea(modules[a].polygon,modules[b].polygon),0);
 const geometry=buildTileGeometry([[0,0],[3,0],[3,3],[0,3]],layout,[[[1,1],[1,2],[2,2],[2,1]]]);
 for(const name of ['position','normal','uv'])assert(Array.from(geometry.attributes[name].array).every(Number.isFinite));
 assert(Array.from(geometry.attributes.uv.array).every(v=>v>=-1e-5&&v<=1+1e-5),'The grain follows each plank without sampling outside its face');
 const area=geometry.userData.cells.reduce((n,c)=>n+c.area,0);assert(area<8&&area>7.8,'Opening area removed; only physical joints reduce remaining face area');
 assert.equal(geometry.userData.faceCells.length,geometry.attributes.position.count/3);
 geometry.dispose();
}
const testName='QA chevron product';COLLECTIONS[testName]={brand:'ELIOS',colors:[{id:'wood'}],formats:[{id:'chevron',width:.957,height:.234,shape:'chevron',layouts:['chevron'],chevronAngle:45},{id:'plank',width:1.195,height:.234,shape:'rectangle'}]};
assert.deepEqual(layoutPatterns(testName,'wood','chevron').map(p=>p.id),['chevron']);
assert.equal(normalizeLayout({pattern:'third'},testName,'chevron','wood').pattern,'chevron');
assert.equal(normalizeLayout({pattern:'chevron'},testName,'plank','wood').pattern,'straight');delete COLLECTIONS[testName];

// Exercise the actual checked inputs and the bounded RAL picker, without a GPU.
class Element{
 constructor(tag){this.tagName=tag;this.children=[];this.attrs={};this.dataset={};this.style={setProperty:(k,v)=>this.style[k]=v};this.classList={add:()=>{}};this.value='';this.checked=false;}
 append(...items){this.children.push(...items);}
 replaceChildren(...items){this.children=[...items];}
 setAttribute(k,v){this.attrs[k]=v;}
}
const installed=new Map();globalThis.document={createElement:tag=>new Element(tag),getElementById:id=>installed.get(id),head:{append:e=>installed.set(e.id,e)}};
globalThis.Option=function(text,value){const o=new Element('option');o.textContent=text;o.value=value;return o;};
let chosen;const parent=new Element('div'),grout=renderGroutChoices(parent,{colors:{Ivoire:'#eee1c0',Blanc:'#fff',Gris:'#888'},value:'Blanc',onChange:name=>chosen=name});
assert.equal(grout.children.filter(c=>c.children[0].checked).length,1);assert.equal(grout.children[1].children[0].value,'Blanc');
grout.children[2].children[0].checked=true;grout.children[2].children[0].onchange();assert.equal(chosen,'Gris');assert.equal(grout.children[2].attrs['aria-checked'],'true');assert.equal(grout.children[1].attrs['aria-checked'],'false');
const flattened=root=>[root,...root.children.flatMap(flattened)];
const paint=renderSurfacePicker(new Element('div'),{kind:'wall',collection:'Peinture',color:'ral-7016',urlFor:x=>x,onColor:id=>chosen=id,onPaint:()=>{}}),els=flattened(paint),samples=els.filter(e=>e.className==='surface-color');
assert.equal(samples.length,7,'The RAL catalogue must not flood a mobile panel with hundreds of swatches');
const ral=els.find(e=>e.dataset.surfaceField==='ral'),search=els.find(e=>e.type==='search');assert.equal(ral.value,'ral-7016');assert(ral.children.length>200);
search.value='7016';search.oninput();assert.equal(ral.children.length,2);assert.equal(ral.children[1].value,'ral-7016');
ral.value='ral-7016';ral.onchange();assert.equal(chosen,'ral-7016');
console.log(JSON.stringify({passed:true,checks:['third stagger positive and negative rows','documented per-format Opus eligibility','continuous decor stays straight','mitred chevron tessellation without overlap','chevron clipping, area, directions, plan axes and UVs','visible checked grout colour','compact searchable RAL choice']}));
