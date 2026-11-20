import * as T from 'three';
import {basinCenters} from './integrated-basins.js';
import {solidSurface} from './solid-surface-catalog.js';

// A continuous one-piece deck with through openings. The bowl mouths,
// slab and thickness follow the tariff; the moulded curves follow its photos.
export function createSolidSurfaceBasin({kind,plan=solidSurface(kind),parent,ceramic,chrome,roundedRect,mesh}){
 const group=new T.Group(),centres=basinCenters(plan.layout,(plan.width-1)/100);
 group.name='Plan_Solid_Surface_'+plan.name;group.userData.editTarget='basin';
 group.userData.basinLayout=plan.layout;group.userData.basinCenters=centres;parent.add(group);
 const deckHeight=.82+plan.thickness/100,bowlZ=.021;
 const rounded=kind==='milo'||kind.startsWith('hebe');
 const radius=rounded?.055:kind==='aria'?.025:.012;
 const mouth=roundedRect(plan.bowlWidth/100,plan.bowlDepth/100,radius).getPoints(12);
 const deck=roundedRect(plan.width/100,plan.depth/100,.004);
 for(const x of centres){
  deck.holes.push(new T.Path(mouth.map(p=>new T.Vector2(x+p.x,p.y-bowlZ)).reverse()));
  const tap=new T.Path();tap.absarc(x,.173,.017,0,2*Math.PI,true);deck.holes.push(tap);
 }
 const towelSlot=kind==='hebe-toallero',slabThickness=towelSlot?.015:plan.thickness/100;
 const slab=new T.ExtrudeGeometry(deck,{depth:slabThickness,bevelEnabled:false,curveSegments:24});
 slab.rotateX(-Math.PI/2);mesh(slab,ceramic,'Plan_'+plan.name+'_'+plan.width*10+'x460',group,0,deckHeight-slabThickness,0);
 if(towelSlot){
  const w=plan.width/100,h=plan.thickness/100-slabThickness,side=.012;
  const fascia=roundedRect(w,h,.002);
  const slot=roundedRect(Math.min(w-.1,.5),.032,.015);fascia.holes.push(new T.Path(slot.getPoints(10).reverse()));
  mesh(new T.ExtrudeGeometry(fascia,{depth:side,bevelEnabled:false,curveSegments:12}),ceramic,'Prise_porte_serviette',group,0,.82+h/2,.23-side);
  for(const sign of [-1,1])mesh(new T.BoxGeometry(side,h,.46-side),ceramic,'Joue_porte_serviette',group,sign*(w-side)/2,.82+h/2,-side/2);
 }

 // Smoothed, sloping Milo and the steeper, flatter-sided Fiona mould.
 const drop=rounded?.112:.105;
 const profile=rounded?[[1,0],[.975,.025],[.93,.19],[.83,.68],[.66,.92],[.46,.97]] :
  [[1,0],[.987,.025],[.975,.09],[.91,.84],[.86,.93],[.60,.975]];
 const positions=[],indices=[];
 for(const [scale,depth] of profile){
  for(const p of mouth)positions.push(p.x*scale,-depth*drop,-p.y*scale);
 }
 // Keep the drain opening circular even though the cuve is rectangular.
 for(const p of mouth){
  const a=Math.atan2(-p.y,p.x);positions.push(.02*Math.cos(a),-drop,.02*Math.sin(a));
 }
 for(let r=0;r<profile.length;r++)for(let j=0;j<mouth.length-1;j++){
  const a=r*mouth.length+j,b=a+mouth.length;indices.push(a,a+1,b,b,a+1,b+1);
 }
 const shell=new T.BufferGeometry();shell.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 shell.setIndex(indices);shell.computeVertexNormals();
 for(const x of centres){
  mesh(shell,ceramic,'Cuve_'+plan.name,group,x,deckHeight,bowlZ);
  mesh(new T.CylinderGeometry(.024,.021,.004,40),chrome,'Bonde_'+plan.name,group,x,deckHeight-drop+.002,bowlZ);
 }
 return group;
}
