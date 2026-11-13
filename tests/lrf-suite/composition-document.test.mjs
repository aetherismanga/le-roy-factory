import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {tilePlanSVG,createCompositionPDF,escapeDocument} from '../../shared/lrf-3d/composition-document.js';
import {buildTileComposition} from '../../shared/lrf-3d/tile-composition.js';
import {draftProject,initialDraft} from '../../studio-one/src/commerce/guided.js';
const require=createRequire(import.meta.url),{jsPDF}=require('../../assets/vendor/studio-one/jspdf.umd.min.js');
const tinyPng='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1cAAAAASUVORK5CYII=';

test('the exact measured tile cells create finite printable polygons with wall dimensions and opening masks',()=>{
 const model=buildTileComposition(draftProject(initialDraft()));assert.equal(model.surfaces.length,5);
 for(const surface of model.surfaces){
  assert.equal(surface.cells.length>0,surface.finish.collection!=='Peinture');assert(surface.cells.every(c=>c.bounds.length>=3&&c.bounds.every(p=>p.length===2&&p.every(Number.isFinite))));
  const svg=tilePlanSVG(surface);assert.match(svg,/viewBox="0 0 900 600"/);assert.doesNotMatch(svg,/NaN|undefined|Infinity/);
  const outlines=[...svg.matchAll(/<polygon points="([^"]*)" fill="none" stroke="#9b998e"/g)];assert.equal(outlines.length,surface.cells.length);assert(outlines.every(m=>m[1].split(' ').length>=3));
  assert.match(svg,/cm<\/text>/);assert.match(svg,/<mask[^>]+maskUnits="userSpaceOnUse"/);
 }
 const opening={label:'Mur test',polygon:[[0,0],[3,0],[3,2.5],[0,2.5]],openings:[{left:1,right:2,bottom:1,top:2}],cells:[{bounds:[[0,0],[3,0],[3,2.5],[0,2.5]]}]};
 const svg=tilePlanSVG(opening);assert.equal([...svg.matchAll(/fill="white" stroke="#47574c"/g)].length,1);assert.match(svg,/>300 cm</);assert.match(svg,/>250 cm</);
});

test('a real jsPDF document paginates a long quote, prints public totals and energy separately, then includes every wall plan',async()=>{
 const texts=[],planCalls=[];
 function RecordingPDF(options){const pdf=new jsPDF(options),original=pdf.text;pdf.text=function(value,...args){texts.push(value);return original.call(this,value,...args);};return pdf;}
 const rows=Array.from({length:28},(_,i)=>({name:'Collection synthétique '+(i+1),reference:'SYN-'+(i+1),detail:'3 boîtes · 12 carreaux · 4,32 m² · perte 10 %',total:108.13}));
 const plans=Array.from({length:4},(_,i)=>({label:'Mur '+(i+1),description:'Pose droite · horizontale · décalage 1/3 · joint 2 mm',area:3.6,tileCount:10,full:5,cut:5}));
 const pdf=await createCompositionPDF({kind:'tiles',title:'Projet <personnalisé>',siteReference:'TEST-123',customer:{name:'Client & Associés'},rows,subtotal:3027.64,total:3052.84,energy:{area:30,rate:.84,amount:25.2},plans,privateCode:'LRF-12345-1070.00.00'},{PDF:RecordingPDF,planImage:async surface=>{planCalls.push(surface.label);return tinyPng;}});
 assert(pdf.getNumberOfPages()>=7,'Long lines paginate before four dedicated plan pages');assert.deepEqual(planCalls,['Mur 1','Mur 2','Mur 3','Mur 4']);
 const printed=texts.flat().join('\n');assert.match(printed,/Taxe énergétique/);assert.match(printed,/25,20/);assert.match(printed,/3 052,84/);assert.match(printed,/LRF-12345-1070\.00\.00/);assert.doesNotMatch(printed,/TTC|Achat HT|purchaseHT/);
 for(const plan of plans)assert(printed.includes(plan.label));assert.match(printed,/décalage 1\/3/);assert.equal([...printed.matchAll(/5 carreaux entiers/g)].length,4);
 const bytes=Buffer.from(pdf.output('arraybuffer'));assert(bytes.length>5000);assert(bytes.subarray(0,8).toString('ascii').startsWith('%PDF-1.'));assert(bytes.subarray(-10).toString('ascii').includes('%%EOF'));
 assert.equal(escapeDocument('<img src=x onerror="test()"> & chantier'), '&lt;img src=x onerror=&quot;test()&quot;&gt; &amp; chantier');
});


test('the rendered plan keeps overlapping openings white and still draws the unmasked tile grid',t=>{
 if(spawnSync('inkscape',['--version']).status!==0||spawnSync('python3',['-c','from PIL import Image']).status!==0){t.skip('Native SVG renderer and Pillow are unavailable');return;}
 const directory=mkdtempSync(path.join(tmpdir(),'lrf-plan-svg-'));
 try{
  const holeA=[[.7,.7],[1.7,.7],[1.7,1.7],[.7,1.7]],holeB=[[1.3,1.1],[2.3,1.1],[2.3,2.1],[1.3,2.1]],surface={polygon:[[0,0],[3,0],[3,2.5],[0,2.5]],holes:[holeA,holeB],cells:[{bounds:[[.5,0],[1,0],[1,2.5],[.5,2.5]]},{bounds:[[1.5,0],[2,0],[2,2.5],[1.5,2.5]]}]};
  const svg=tilePlanSVG(surface),second=tilePlanSVG(surface),id=svg.match(/<mask id="([^"]+)"/)[1],secondId=second.match(/<mask id="([^"]+)"/)[1];assert.notEqual(id,secondId,'Printed inline plans own distinct masks');
  const source=path.join(directory,'plan.svg'),target=path.join(directory,'plan.png');writeFileSync(source,svg);
  execFileSync('inkscape',[source,'--export-width=900','--export-background=white','--export-filename='+target],{stdio:['ignore','ignore','pipe']});
  const pixels=JSON.parse(execFileSync('python3',['-c',"from PIL import Image; import json,sys; im=Image.open(sys.argv[1]).convert('RGB'); print(json.dumps({'overlap':[im.getpixel((x,y)) for x in range(448,453) for y in range(246,251)],'grid':[im.getpixel((x,y)) for x in range(242,246) for y in range(453,458)]}))",target],{encoding:'utf8'}));
  assert(pixels.overlap.every(rgb=>rgb.every(value=>value>=250)),'No grid line bleeds through the opening overlap');assert(pixels.grid.some(rgb=>rgb.some(value=>value<220)),'The native renderer still draws the visible tile grid');
 }finally{rmSync(directory,{recursive:true,force:true});}
});
