import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {architecturalStructure} from '../../assets/js/lrf-plan-pose/structure.mjs';
import {dimensionValue,orthogonalContour,solveDimensions,chooseReadings,usableContours} from '../../assets/js/lrf-plan-pose/dimensions.mjs';
import {suggestedUnit} from '../../assets/js/lrf-plan-pose/plan-reader.mjs';
import {measuredPartitions,convertedRoom} from '../../assets/js/lrf-plan-pose/conversion.mjs';
import {newProject,newRoom,metrics,roomError,tileLayout,confirmRoom,nativeProject,parseProject,area} from '../../assets/js/lrf-plan-pose/core.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} ≠ ${b}`);
const rectangle=()=>newRoom([[0,0],[400,0],[400,300],[0,300]]);
const partition=(patch={})=>({id:'partition-1',a:[200,0],b:[200,150],thickness:10,height:260,...patch});
test('mm, cm, m, nombres espacés : une même géométrie en centimètres',()=>{
 const shape=orthogonalContour([[0,0],[800,0],[800,500],[0,500]]);
 for(const [unit,texts]of [['mm',['3 595','2 230']],['cm',['359,5','223']],['m',['3,595','2,23']]]){const candidates=[[{text:texts[0],score:80}],[{text:texts[1],score:80}],[],[]],r=chooseReadings(shape,candidates,unit);near(r.area,8.01685);assert.deepEqual(r.lengths,[359.5,223,359.5,223]);assert.equal(suggestedUnit(candidates),unit);}
 near(dimensionValue('3\u202f595 mm'),359.5);near(dimensionValue('2,23 m'),223);assert.equal(dimensionValue('3 59 mm'),null);
 assert.equal(suggestedUnit([[{text:'3595',score:80}],[{text:'2230',score:80}],[{text:'CM',score:80}]]),'mm');
});
test('le bord de feuille est retiré ; le contour d’une pièce conserve la priorité sur le mobilier',()=>{
 const region=p=>({points:p}),paper=[[2,10],[498,10],[498,390],[2,390]],room=[[60,80],[400,80],[400,330],[60,330]],furniture=[[90,100],[150,100],[150,160],[90,160]],shapes=usableContours([region(paper),region(room),region(furniture)],500,400);assert.equal(shapes.length,1);near(area(shapes[0].points),85000);
});
test('bandes de murs : fermer une porte et garder la cloison, sans les rectangles de meubles',()=>{
 const w=600,h=450,pixels=new Uint8ClampedArray(w*h*4).fill(255),fill=(x,y,width,height)=>{for(let yy=y;yy<y+height;yy++)for(let xx=x;xx<x+width;xx++){const i=(yy*w+xx)*4;pixels[i]=pixels[i+1]=pixels[i+2]=0;}};
 fill(50,50,500,16);fill(50,50,16,350);fill(534,50,16,350);fill(50,384,200,16);fill(350,384,200,16);fill(250,66,16,160);
 for(const [x,y,ww,hh]of [[100,120,95,95],[380,120,95,130]]){fill(x,y,ww,2);fill(x,y+hh,ww,2);fill(x,y,2,hh);fill(x+ww,y,2,hh);}
 const r=architecturalStructure(pixels,w,h);assert.equal(r.shapes.length,1);assert.equal(r.shapes[0].partitions.length,1);assert.equal(r.shapes[0].kind,'architecture');
});
test('cloison : surface nette, plinthes de ses faces, calepinage et sauvegarde cohérents',()=>{
 const r=rectangle();r.partitions=[partition()];const m=metrics(r,1);assert.equal(m.error,'');near(m.area,11.85);near(m.perimeter,14);near(m.plinth,17);const l=tileLayout(r,1);assert.equal(l.holes.length,1);near(area(l.holes[0]),1500);const p=newProject();p.rooms=[r];assert.deepEqual(parseProject(JSON.stringify(p)).rooms[0].partitions,r.partitions);
 r.partitions.push(partition({id:'partition-2',a:[180,100],b:[230,100]}));assert.match(roomError(r,1),/chevaucher/);
 r.partitions=[partition({a:[0,0],b:[0,150]})];assert.match(roomError(r,1),/dépasse/);
});
test('la reconstruction mesurée conserve les cloisons et ne crée aucun équipement',()=>{
 const shape=orthogonalContour([[100,100],[900,100],[900,600],[100,600]]);shape.partitions=[{a:[500,100],b:[500,350],thickness:20}];const solved=solveDimensions(shape,[400,250,null,null]),row={shape},parts=measuredPartitions(shape,solved),converted=convertedRoom(row,solved,{factor:2},1,parts),r={...newRoom(converted.points),partitions:converted.partitions};assert.equal(r.partitions.length,1);near(r.partitions[0].thickness,10);near(metrics(r,1).area,9.875);const p=newProject();p.rooms=[r];Object.assign(r.tile,{brand:'ELIOS',collection:'Shell',color:'beige',width:120,height:60,format:'60x120'});confirmRoom(p,r);
 for(const target of ['studio','general']){const n=nativeProject(p,r,target);assert.equal(n.items.length,0);assert.equal(n.room.partitions.length,1);assert.equal(n.walls.length,6);assert.equal(n.layouts.walls.length,6);near(n.room.partitions[0].thickness,10);
  const src=readFileSync(new URL('./upstream/'+target+'-room.txt',import.meta.url),'utf8'),context={buildTileGeometry:()=>{},normalizeTileLayout:v=>v,validateNiches:()=>'',T:{Vector3:class{constructor(x,y,z){Object.assign(this,{x,y,z});}}}};vm.createContext(context);vm.runInContext(src.replace(/^import .*?;\s*$/gm,'').replace(/^export \{.*?\};?\s*$/gm,'').replace(/export /g,''),context);assert.equal(context.validateRoom(n.room,0),'');assert.equal(context.validatePartitions(n.room),'');const broken=structuredClone(n.room);broken.partitions[0].thickness=40;assert.ok(context.validatePartitions(broken));
 }
});
