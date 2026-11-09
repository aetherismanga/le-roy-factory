// Wall baselines face +Z in their own frame. Islands are deliberately staggered:
// the arrival opens into furnished scenes and a loop, never a corridor of boxes.
const PI=Math.PI;
const DISPLAYS=[
 {x:-10.45,z:-7.4,rotation:PI/2,width:5.6,depth:3.4,floor:'yosemite-natural',returnSide:-1},
 {x:3.1,z:-11.25,rotation:0,width:6,depth:3.3,floor:'creta-pepe',returnSide:1},
 {x:11.25,z:-5.7,rotation:-PI/2,width:5.6,depth:3.4,floor:'creta-caramello',returnSide:1},
 {x:-10.3,z:-15,rotation:PI/2,width:5.6,depth:3.4,floor:'creta-ginepro',returnSide:1},
 {x:11.3,z:-15.6,rotation:-PI/2,width:5.6,depth:3.4,floor:'shell-grey',returnSide:-1},
 {x:.2,z:-24.7,rotation:0,width:6,depth:3.4,floor:'yosemite-natural',returnSide:-1},
 {x:-11,z:-23,rotation:PI/2,width:3.6,depth:2.1,floor:'creta-malto'},
 {x:11.2,z:-24,rotation:-PI/2,width:3.6,depth:2.1,floor:'creta-pepe'},
 {x:-6.1,z:-30,rotation:0,width:4,depth:2,floor:'creta-avena'},
 {x:4.7,z:-30.3,rotation:0,width:5.2,depth:2.8,floor:'creta-caramello',returnSide:1},
 {x:-2.7,z:-16.7,rotation:0,width:3.1,depth:1.8,floor:'creta-pepe',height:1.75},
 {x:4,z:-19.7,rotation:0,width:3,depth:1.8,floor:'creta-malto',height:1.85},
 {x:-3.7,z:-4.6,rotation:0,width:4.6,depth:2.4,floor:'creta-pepe',height:1.5},
 {x:-5.4,z:-21.75,rotation:0,width:3.1,depth:1.5,floor:'creta-ginepro',height:1.7},
 {x:5.8,z:-24.85,rotation:0,width:3,depth:1.7,floor:'creta-avena',height:1.65},
 {x:4,z:-3.8,rotation:0,width:3.6,depth:1.4,floor:'creta-caramello',height:1.25},
 {x:-4.6,z:-10.85,rotation:0,width:2.8,depth:1.7,floor:'creta-malto',height:1.65}
];
export function showroomPoint(layout,x,z){
 const c=Math.cos(layout.rotation),s=Math.sin(layout.rotation);
 return {x:layout.x+c*x+s*z,z:layout.z-s*x+c*z};
}
export function makeShowroomLayout(manufacturers=[]){
 const width=28,height=3.6,depth=33.4;
 const displays=manufacturers.map((manufacturer,index)=>{
  const source=DISPLAYS[index]||{x:-11+(index%5)*5.5,z:-33-Math.floor((index-17)/5)*4,rotation:0,width:3.6,depth:2.2,floor:'creta-pepe'};
  const layout={...source,index,manufacturer,height:source.height||2.25};
  const corners=[[-layout.width/2,0],[layout.width/2,0],[layout.width/2,layout.depth],[-layout.width/2,layout.depth]].map(([x,z])=>showroomPoint(layout,x,z));
  layout.bounds={minX:Math.min(...corners.map(p=>p.x)),maxX:Math.max(...corners.map(p=>p.x)),minZ:Math.min(...corners.map(p=>p.z)),maxZ:Math.max(...corners.map(p=>p.z))};
  layout.approach=showroomPoint(layout,0,layout.depth+.65);
  layout.fixtureLayout={origin:[layout.x,layout.z],rotation:layout.rotation,width:layout.width,depth:layout.depth,hand:index%2===0?-1:1,kind:index<6?'bathroom':manufacturer.id==='randal-pro'?'gallery':manufacturer.id==='aquahome'?'tapbar':'none'};
  return layout;
 });
 return {width,height,depth:Math.max(depth,...displays.map(d=>-d.bounds.minZ+2)),wallHeight:2.25,displays,arrival:{x:0,z:-1.4},focus:{x:2.8,y:1.25,z:-10.8},plantZones:[{x:-11.7,z:-2.8},{x:7,z:-10.3},{x:-7,z:-18.8},{x:1,z:-18.5},{x:10,z:-29},{x:-10,z:-28.6}],lounge:{x:9.3,z:-10.65,rotation:PI/2}};
}
