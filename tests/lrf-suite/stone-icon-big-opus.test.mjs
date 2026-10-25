import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COLLECTIONS,formatsForColor,layoutPatterns,normalizeLayout,opusForFormat} from '../../shared/lrf-3d/surface-catalog.js';
import {tileModules,buildTileGeometry} from '../../shared/lrf-3d/tile-layout.js';
import {quantityForSurface,summarizeQuantities} from '../../shared/lrf-3d/quantities.js';
import {overlapArea} from '../../shared/lrf-3d/plan-topology.mjs';
import {normalizeProjectSurfaceIdentities} from '../../shared/lrf-3d/surface-identity.mjs';
import {encodeProject,decodeProject,ProjectJournal} from '../../studio-one/src/projects.js';

const close=(a,b,t=1e-7)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const commercial=JSON.parse(readFileSync(new URL('../../shared/lrf-3d/commercial-surfaces.json',import.meta.url)));
const dimensions=cell=>[Math.min(cell.width,cell.height),Math.max(cell.width,cell.height)].map(v=>Math.round(v*100)).join('x');

test('Stone Icon exposes the verified four-format Big Opus, without inventing a kit SKU or pack',()=>{
 const c=COLLECTIONS['Stone Icon'];
 for(const color of ['campaspero','francese','leccese']){
  assert.ok(formatsForColor(c.name,color).some(f=>f.id==='Big Opus'));
  assert.deepEqual(layoutPatterns(c.name,color,'Big Opus').map(p=>p.id),['opus']);
  const module=opusForFormat(c.name,'Big Opus',color);
  assert.equal(module.verified,true);assert.equal(module.module,'A');assert.equal(module.pdfPage,38);assert.equal(module.printedPage,73);
  assert.equal(module.packagedKit,false);assert.deepEqual(module.components,['30x30','30x60','60x60','60x90']);
  assert.equal(normalizeLayout({pattern:'straight'},c.name,'Big Opus',color).pattern,'opus');
  const format=c.formats.find(f=>f.id==='Big Opus');assert.equal(format.pcsBox,undefined);assert.equal(format.m2Box,undefined);
 }
 assert.equal(commercial.products.filter(p=>p.collection===c.name).length,47,'Existing individually sold references are unchanged');
 assert.equal(commercial.products.some(p=>p.collection===c.name&&p.format==='Big Opus'),false);
 assert.equal(formatsForColor(c.name,'francese').some(f=>f.id==='120x120'),false);
 assert.equal(formatsForColor(c.name,'leccese').some(f=>f.id==='120x120'),false);
 assert.ok(formatsForColor(c.name,'campaspero').some(f=>f.id==='120x120'));
});

test('manufacturer module A repeats with all four real sizes, without gaps or overlap',()=>{
 const layout=normalizeLayout({},'Stone Icon','Big Opus','campaspero');
 const cells=tileModules({minX:-2,maxX:2,minY:-2,maxY:2},layout);
 assert.deepEqual(new Set(cells.map(dimensions)),new Set(['30x30','30x60','60x60','60x90']));
 assert.equal(new Set(cells.map(c=>c.key)).size,cells.length);
 for(let a=0;a<cells.length;a++)for(let b=a+1;b<cells.length;b++)close(overlapArea(cells[a].polygon,cells[b].polygon),0);
 // Independently sample nominal manufacturer grid cells. Every point belongs
 // to one slab; the half-joint inset is excluded deliberately in this check.
 for(let x=-1.8;x<1.8;x+=.3)for(let y=-1.8;y<1.8;y+=.3){
  const px=x+.15,py=y+.15,hits=cells.filter(c=>px>c.x+1e-7&&px<c.x+c.width-1e-7&&py>c.y+1e-7&&py<c.y+c.height-1e-7);
  assert.equal(hits.length,1,`Nominal Big Opus coverage ${px},${py}`);
 }
 const module=cells.filter(c=>c.key.startsWith('0:0:'));
 assert.equal(module.length,4);close(module.reduce((n,c)=>n+c.nominalArea,0),1.17);
 assert.deepEqual(module.map(c=>Math.round(c.nominalArea/.09)).sort((a,b)=>a-b),[1,2,4,6]);
});

test('Big Opus clips to room and openings in both directions, with finite native geometry',()=>{
 for(const direction of ['horizontal','vertical'])for(const planAxes of [false,true]){
  const layout={...normalizeLayout({},'Stone Icon','Big Opus','francese'),direction,planAxes,x:13,y:-27};
  const polygon=[[0,0],[3,0],[3,3],[0,3]],holes=[[[1,1],[1,2],[2,2],[2,1]]];
  const g=buildTileGeometry(polygon,layout,holes),area=g.userData.cells.reduce((sum,c)=>sum+c.area,0);
  assert.ok(area>7.85&&area<8,'The opening is removed; only the physical 2mm joints reduce remaining coverage');
  for(const key of ['position','normal','uv'])assert.ok([...g.attributes[key].array].every(Number.isFinite));
  assert.ok([...g.attributes.uv.array].every(v=>v>=-1e-5&&v<=1+1e-5));
  assert.deepEqual(new Set(g.userData.cells.map(dimensions)),new Set(['30x30','30x60','60x60','60x90']));g.dispose();
 }
});

test('Big Opus quantities order the four exact Tumbled products and their independent cartons',()=>{
 const suffix={campaspero:'1',francese:'2',leccese:'3'},refs={'30x30':'04S330','30x60':'04S360','60x60':'04S600','60x90':'04S690'},packs={'30x30':[11,.99],'30x60':[7,1.26],'60x60':[4,1.44],'60x90':[2,1.08]};
 for(const color of Object.keys(suffix)){
  const layout=normalizeLayout({},'Stone Icon','Big Opus',color),polygon=[[0,0],[4.5,0],[4.5,4.5],[0,4.5]],g=buildTileGeometry(polygon,layout);
  const row=quantityForSurface({polygon,tiles:{geometry:g}},{collection:'Stone Icon',color,format:'Big Opus'},layout,8,'Sol'),groups=summarizeQuantities([row]);
  assert.equal(groups.length,4);close(groups.reduce((sum,p)=>sum+p.area,0),20.25);
  for(const part of groups){
   assert.equal(part.reference,refs[part.format]+suffix[color]);assert.equal(part.catalogueKey,'ELIOS|'+part.reference);
   assert.equal(part.finish,'Tumbled · R10 B · Rectifié · 8,5 mm');assert.equal(part.packVerified,true);
   assert.equal(part.pcsBox,packs[part.format][0]);assert.equal(part.m2Box,packs[part.format][1]);
   assert.equal(part.boxes,Math.ceil((part.needed-1e-8)/part.m2Box));assert.equal(part.orderPieces,part.boxes*part.pcsBox);
   assert.ok(part.orderArea>=part.withLoss);assert.equal(part.priceTTC,undefined,'No price is invented for the mixed layout');
  }
  g.dispose();
 }
});

test('a small Big Opus band still orders its one real component instead of a fictitious kit',()=>{
 const layout=normalizeLayout({},'Stone Icon','Big Opus','campaspero'),polygon=[[.01,.01],[.21,.01],[.21,.21],[.01,.21]],g=buildTileGeometry(polygon,layout);
 const row=quantityForSurface({polygon,tiles:{geometry:g}},{collection:'Stone Icon',color:'campaspero',format:'Big Opus'},layout,8,'Bande');
 assert.equal(row.components.length,1);assert.equal(row.components[0].format,'60x90');assert.equal(row.components[0].reference,'04S6901');assert.equal(row.components[0].packVerified,true);g.dispose();
});

test('Big Opus format and manufacturer module survive project exchange and Undo/Redo',async()=>{
 const layout=normalizeLayout({},'Stone Icon','Big Opus','campaspero'),project={version:2,room:{height:260,points:[[0,0],[450,0],[450,450],[0,450]]},items:[],floor:{collection:'Stone Icon',color:'campaspero',format:'Big Opus'},walls:[],layouts:{floor:layout,walls:[]}};
 for(const app of ['studio-one','randal-general']){
  const catalog=await import(new URL(`../../${app}/src/surface-catalog.js`,import.meta.url));
  assert.strictEqual(catalog.COLLECTIONS,COLLECTIONS,'Both legacy import paths use the same manufacturer format');
  const back=normalizeProjectSurfaceIdentities(decodeProject(encodeProject(project)));
  assert.equal(back.floor.format,'Big Opus');assert.equal(back.layouts.floor.opus.mode,'stone-icon-big');assert.deepEqual(back.layouts.floor.opus.components,layout.opus.components);
 }
 const journal=new ProjectJournal();journal.seed(project);const regular=structuredClone(project);regular.floor.format='60x90';regular.layouts.floor=normalizeLayout({},'Stone Icon','60x90','campaspero');journal.record(regular);
 assert.equal(journal.undo().floor.format,'Big Opus');assert.equal(journal.redo().floor.format,'60x90');
});
