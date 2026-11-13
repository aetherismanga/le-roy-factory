import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTileComposition,tileCompositionSnapshot} from '../../shared/lrf-3d/tile-composition.js';
import catalogue from '../../shared/lrf-3d/commercial-surfaces.json' with {type:'json'};
const tile=catalogue.products.find(p=>p.collection==='Stone Icon'&&p.colorId==='leccese'&&p.format==='60x90');
const finish={collection:tile.collection,color:tile.colorId,format:tile.format,catalogueKey:tile.key,reference:tile.reference,finish:tile.finish};
const paint={collection:'Peinture',color:'white'};
const layout={width:.9,height:.6,pattern:'straight',direction:'horizontal',groutWidth:2,x:0,y:0};
const project=()=>({version:2,title:'Salle de bains',room:{height:240,points:[[0,0],[300,0],[300,200],[0,200]]},floor:finish,walls:[finish,paint,paint,paint],layouts:{floor:layout,walls:[layout,layout,layout,layout]},items:[],tileLoss:10});
test('subtracts real window opening and prints actual cell polygons',()=>{
 const p=project();p.items=[{id:'window',type:'window',settings:{width:100,height:100},placement:{wall:0,u:150,height:100}}];
 const q=buildTileComposition(p),wall=q.surfaces.find(s=>s.label==='Mur 1');
 assert(Math.abs(wall.area-6.2)<1e-8);assert.equal(wall.holes.length,1);assert(wall.cells.length>0);assert(wall.cells.every(c=>Array.isArray(c.bounds)&&c.bounds.length>=3));
 assert.equal(q.totals.area,12.2);assert(q.rows.every(r=>r.orderPieces===r.boxes*r.pcsBox));
});
test('groups identical references before rounding complete boxes',()=>{
 const p=project(),q=buildTileComposition(p);
 assert.equal(q.rows.length,1);assert.equal(q.rows[0].boxes,Math.ceil((q.rows[0].needed-1e-8)/q.rows[0].m2Box));
 assert.equal(q.totals.energyTax.amountTTC,Math.round(q.totals.orderArea*.84*100)/100);
 assert.equal(q.totals.publicTTC,null);
});
test('captured reports exclude purchases and recalculate loss without stale prices',()=>{
 const snapshot=tileCompositionSnapshot({rows:[{...finish,label:'Mur 1',brand:'ELIOS',area:4,layoutArea:4.1,needed:4.4,tileCount:8,full:7,cut:1,loss:10,purchaseHT:123,totalPurchaseHT:999,publicTTC:777,priceSource:'secret'}]});
 assert(!/purchase|price|publicTTC/i.test(JSON.stringify(snapshot)));
 const q=buildTileComposition({...project(),tileCompositionReport:snapshot,tileLoss:20});
 assert.equal(q.rows[0].needed,4.8);assert.equal(q.rows[0].publicTTC,null);
});
test('different tiled bands remain separate and retain their own laying plan',()=>{
 const p=project();p.walls[0]={...finish,zones:[{id:'band',name:'Bandeau',x:0,y:0,width:300,height:60,...finish,pattern:'third',direction:'horizontal'}]};
 const q=buildTileComposition(p),band=q.surfaces.find(s=>s.label==='Mur 1 · Bandeau');
 assert(band);assert.equal(band.layout.pattern,'third');assert(Math.abs(band.area-1.8)<1e-8);
 assert(Math.abs(q.surfaceRows.filter(r=>r.label.startsWith('Mur 1')).reduce((n,r)=>n+r.area,0)-7.2)<1e-8);
});

test('painted walls keep a wall plan without a fictitious tile grid',()=>{
 const q=buildTileComposition(project()),wall=q.surfaces.find(s=>s.label==='Mur 4');
 assert(wall);assert.equal(wall.finish.collection,'Peinture');assert.deepEqual(wall.cells,[]);
 assert(wall.polygon.length>=4);assert.equal(q.rows.some(r=>r.collection==='Peinture'),false);
});

test('tiled shower tray removes its footprint from the floor and exports visible cladding faces',()=>{
 const p=project();p.items=[{id:'tray',type:'shower',settings:{trayType:'tile',width:120,depth:90,trayInstallation:'raised',trayHeight:12},placement:{wall:0,u:150,height:0,offset:0,rotation:0}}];
 const q=buildTileComposition(p),floor=q.surfaces.find(s=>s.label==='Sol'),tray=q.surfaces.filter(s=>s.label.startsWith('Receveur à carreler'));
 assert(Math.abs(floor.area-4.92)<1e-8);assert.equal(floor.holes.length,1);
 assert.equal(tray.length,4);assert(tray.find(s=>s.label.endsWith('dessus')));assert.equal(tray.some(s=>s.label.endsWith('arrière')),false);
 assert(tray.every(s=>s.cells.length>0));assert(tray.find(s=>s.label.endsWith('dessus')).area<1.08,'Drain channel is removed from tray tiles');
});

test('tray overlapping a tiled rug is subtracted once from each actual material region',()=>{
 const p=project();p.floor={...finish,zones:[{id:'rug',name:'Tapis',x:-100,y:-100,width:200,height:100,...finish,pattern:'third'}]};p.items=[{id:'tray',type:'shower',settings:{trayType:'tile',width:120,depth:90,trayInstallation:'flush'},placement:{wall:0,u:150,height:0,offset:0,rotation:0}}];
 const q=buildTileComposition(p),floor=q.surfaces.find(s=>s.label==='Sol'),rug=q.surfaces.find(s=>s.label==='Sol · Tapis');
 assert(Math.abs(floor.area-4)<1e-8);assert(Math.abs(rug.area-.92)<1e-8);
 const tray=q.surfaces.find(s=>s.label==='Receveur à carreler · dessus');assert(tray.area>1&&tray.cells.length>0,'A flush tray must never subtract its own footprint');
});

test('bath aprons and toilet support retain native dimensions and all laying plans',()=>{
 const p=project();p.items=[{id:'bath',type:'bath',settings:{kind:'rect',apron:'tile',width:170,depth:75,apronFaces:{front:finish,left:finish,right:finish}},placement:{wall:1,u:100,height:0}},{id:'toilet',type:'toilet',settings:{support:true,supportWidth:60,supportHeight:112,supportDepth:20},placement:{wall:0,u:100,height:0}}];
 const q=buildTileComposition(p),aprons=q.surfaces.filter(s=>s.label.startsWith('Baignoire · tablier')),support=q.surfaces.filter(s=>s.label.startsWith('Bâti-support'));
 assert.equal(aprons.length,3);assert(Math.abs(aprons.reduce((n,s)=>n+s.area,0)-(1.7+.75+.75)*.558)<1e-8);
 assert.equal(support.length,4);assert(support.every(s=>s.cells.length>0));
 assert(Math.abs(support.reduce((n,s)=>n+s.area,0)-(.6*1.12+2*.2*1.12+.6*.2))<1e-8);
});

test('niche cladding uses its own 15x15 format inside a 60x90 wall',()=>{
 const p=project(),product=catalogue.products.find(p=>p.collection==='Segmento'&&p.format==='15x15');
 assert(product);const small={collection:product.collection,color:product.colorId,format:product.format,catalogueKey:product.key,reference:product.reference,finish:product.finish};
 p.room.niches=[{id:'niche-small',wallKey:'boundary-0',u:150,bottom:90,width:60,height:60,depth:6,covering:{mode:'all',back:small}}];
 const q=buildTileComposition(p),faces=q.surfaces.filter(s=>s.label.startsWith('Mur 1 · niche'));
 assert.equal(faces.length,5);assert(faces.every(s=>s.layout.width===.15&&s.layout.height===.15));
 assert(faces.find(s=>s.label.endsWith('fond')).cells.length>=16);
});

test('legacy pack differences cannot duplicate an identical canonical SKU in the quote request',()=>{
 const base={...finish,label:'Mur 1',brand:'ELIOS',area:2,layoutArea:2,needed:2.2,tileCount:4,full:4,cut:0,packVerified:true,loss:10};
 const report=tileCompositionSnapshot({rows:[{...base,m2Box:.5,pcsBox:1},{...base,label:'Mur 2',m2Box:2,pcsBox:4}]});
 const q=buildTileComposition({...project(),tileCompositionReport:report});
 assert.equal(q.rows.length,1);assert.equal(q.rows[0].catalogueKey,tile.key);assert.equal(q.rows[0].m2Box,tile.packArea);
 assert(Math.abs(q.rows[0].needed-4.4)<1e-8);assert.equal(q.rows[0].boxes,Math.ceil((4.4-1e-8)/tile.packArea));
});
