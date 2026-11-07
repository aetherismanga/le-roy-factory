import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {SEGMENTO,segmentoCell,segmentoLayout,segmentoColors,segmentoSelection,segmentoPreview} from '../segmento.js';
import {COLLECTIONS,normalizeLayout} from '../surface-catalog.js';
import {availableColors,renderSurfacePicker} from '../surface-picker.js';
import {buildTileGeometry,normalizeTileLayout} from '../tile-layout.js';
import {quantityForSurface,summarizeQuantities} from '../quantities.js';
import {applyTileColors,validTileColors} from '../tile-colors.js';
import {finishForSurface,resolveSurfaceTexture} from '../surface-texture-selection.js';
import {canonicalSurfaceIdentity} from '../surface-identity.mjs';
import {makeRoom,DEFAULT_ROOM} from '../room.js';
const close=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`),root=new URL('../../../',import.meta.url);
assert.equal(availableColors('Segmento').length,16);
assert.equal(SEGMENTO.patterns.length,12);assert.equal(SEGMENTO.compositions.length,48);
assert(segmentoPreview(SEGMENTO.compositions[0],value=>'assets/'+value).includes('https://leroyfactory.fr/assets/img/elios-segmento-20261107/compositions/'));
assert.equal(resolveSurfaceTexture('Segmento','duplex-b','max').rotation,180);assert.equal(resolveSurfaceTexture('Segmento','duplex-b','fluid').rotation,0);
for(const color of COLLECTIONS.Segmento.colors){
 assert.equal(canonicalSurfaceIdentity({collection:'Segmento',color:color.id,format:'15x15',reference:color.references[0]},{usage:'floor'}).color,color.id);
 const original=new URL(color.faces[0].replace('https://leroyfactory.fr/',''),root);assert(existsSync(original));
 assert.equal(createHash('sha256').update(readFileSync(original)).digest('hex'),color.textureProvenance.sourceSha256);
 assert.deepEqual(resolveSurfaceTexture('Segmento',color.id,'max').files,color.faces,'HD capture requests the preserved original');
}
let tested=0;
for(const composition of SEGMENTO.compositions){
 const layout=segmentoLayout({},composition.id),normalized=normalizeLayout(layout,'Segmento','15x15',composition.tiles[0].color);
 assert.equal(segmentoSelection(normalizeTileLayout(normalized)).id,composition.id,'A save/restore layout preserves the composition');
 const geometry=buildTileGeometry([[0,0],[.9,0],[.9,.9],[0,.9]],layout),surface={polygon:[[0,0],[.9,0],[.9,.9],[0,.9]],layout,tiles:{geometry},material:new T.MeshStandardMaterial()},finish={collection:'Segmento',color:composition.tiles[0].color,format:'15x15'};
 assert.equal(geometry.userData.cells.length,36);
 for(const cell of geometry.userData.cells){const [col,row]=cell.key.split(':').map(Number),expected=segmentoCell(composition,col,row);assert.equal(cell.segmentoColor,expected.color);assert.equal(cell.segmentoRotation,expected.rotation||0);}
 assert(Array.from(geometry.attributes.uv.array).every(Number.isFinite));
 const row=quantityForSurface(surface,finish,layout,10,'Sol');close(row.area,.81);close(row.components.reduce((n,c)=>n+c.area,0),.81);
 const groups=summarizeQuantities([row]);assert.equal(groups.length,new Set(composition.tiles.map(t=>t.color)).size);
 for(const part of groups){assert(part.area>0);assert(part.needed>=part.area);assert.equal(part.pcsBox,46);assert.equal(part.m2Box,1.04);assert.equal(part.orderPieces,part.boxes*46);assert(part.reference&&part.catalogueKey,'Every reference component keeps its commercial identity');}
 const actualColors=validTileColors(surface,finish),expectedColors=Object.fromEntries(geometry.userData.cells.filter(c=>c.segmentoColor!==finish.color).map(c=>[c.key,c.segmentoColor]));assert.deepEqual(actualColors,expectedColors);
 applyTileColors(surface,finish,()=>new T.MeshStandardMaterial());assert(geometry.groups.length>0);
 const loaded=finishForSurface('Segmento',finish.color,layout,finish);assert.deepEqual(new Set(loaded.segmentoColors),new Set(segmentoColors(layout)));
 assert.deepEqual(finishForSurface('Segmento',finish.color,{},loaded).segmentoColors,loaded.segmentoColors,'Active texture discovery keeps every composition colour');
 assert.equal(finishForSurface('Segmento',finish.color,{pattern:'straight'},loaded).segmento,undefined,'Reference-only selection removes stale composition metadata');
 geometry.dispose();surface.material.dispose();for(const m of surface.tileMaterials)m.dispose();tested++;
}
// Split wall fragments (openings) must retain colour, orientation and physical
// tile metadata when the room recombines their BufferGeometries.
const room=makeRoom(DEFAULT_ROOM,0),wall=room.walls[0],composition=SEGMENTO.compositions.find(c=>new Set(c.tiles.map(t=>t.color)).size>1);wall.setLayout(segmentoLayout(wall.layout,composition.id));room.setOpenings([{type:'door',placement:{wall:0,u:75,height:0},dimensions:{width:.7,height:2}}]);
assert(wall.tiles.geometry.userData.cells.every(c=>c.segmentoColor&&c.nominalArea>0));const quantities=quantityForSurface(wall,{collection:'Segmento',color:composition.tiles[0].color,format:'15x15'},wall.layout,10,'Mur 1');assert(quantities.components.every(c=>c.area>0));close(quantities.components.reduce((n,c)=>n+c.area,0),quantities.area);room.dispose();
class Element{constructor(tag){this.tagName=tag;this.children=[];this.attrs={};this.dataset={};this.style={setProperty(){}};this.classList={add(){}};this.value='';}append(...items){this.children.push(...items);}replaceChildren(...items){this.children=[...items];}setAttribute(k,v){this.attrs[k]=v;}}
const installed=new Map();globalThis.document={createElement:tag=>new Element(tag),getElementById:id=>installed.get(id),head:{append:e=>installed.set(e.id,e)}};globalThis.Option=function(text,value){const o=new Element('option');o.textContent=text;o.value=value;return o;};
const flattened=e=>[e,...e.children.flatMap(flattened)];let chosen;
const picker=renderSurfacePicker(new Element('div'),{kind:'floor',collection:'Segmento',color:'albus',format:'15x15',urlFor:x=>x,onColor:()=>{},onSegmento:id=>chosen=id,layout:segmentoLayout({},'S01-A')});
assert.equal(flattened(picker).filter(e=>e.dataset.segmentoPattern).length,12);
let target=flattened(picker).find(e=>e.dataset.segmentoPattern==='segmento-12')||flattened(picker).filter(e=>e.dataset.segmentoPattern).at(-1);target.onclick();assert.equal(chosen,undefined,'Browsing another pattern does not apply a composition');const variant=flattened(picker).find(e=>e.dataset.segmentoComposition===SEGMENTO.compositions.find(c=>c.patternId===target.dataset.segmentoPattern).id);variant.onclick();assert.equal(chosen,variant.dataset.segmentoComposition);
const reference=flattened(picker).find(e=>e.dataset.segmentoComposition==='');reference.onclick();assert.equal(chosen,null);assert.equal(reference.attrs['aria-pressed'],'true');
for(const app of ['studio-one','randal-general']){const src=readFileSync(new URL(`${app}/src/app.js`,root),'utf8');assert(src.includes('layout:surface?.layout,onSegmento:id=>setSegmentoComposition(kind,id)'));assert(src.includes("row.label.startsWith('Sol · Segmento ')"),'Expanded floor components remain in the displayed surface total');assert(src.includes('...(finish.segmentoColors||[])')||src.includes('...(value.segmentoColors||[])'),'All colours are included in active texture loading');}
console.log(JSON.stringify({passed:true,compositions:tested,patterns:12,references:16,checks:['original manufacturer image hashes','reference and identity preservation','all 48 physical grids and per-reference box calculations','finite rotated UVs','opening fragments retain colour metadata','active texture discovery for every colour','interactive visual pattern selection','reference-only mode clears selection','floor total includes expanded multicolour rows']}));
