import * as T from 'three';
import {cabinetFormat} from './configuration.js';
import {isFloorItem} from './composition.js';
import {isOpening} from './openings.js';
// Measured model anchors, then projected into an SVG overlay. Labels remain
// readable in pixels, while endpoints follow the actual 3D placement/camera.
export function dimensionSegments(composition,{room:showRoom=true}={}){
 if(!composition)return [];const segments=[],room=composition.room;
 const add=(a,b,label)=>{if(a.distanceTo(b)>.001)segments.push({a,b,label});};
 if(showRoom)for(const [i,w] of room.walls.entries()){if(w.partitionSide===1)continue;const t=new T.Vector3(Math.cos(w.group.rotation.y),0,-Math.sin(w.group.rotation.y)),a=w.start.clone().addScaledVector(w.normal,.09);a.y=.02;add(a,a.clone().addScaledVector(t,w.length),`${w.partition===undefined?'Mur '+(i+1):'Cloison '+(w.partition+1)} · ${Math.round(w.length*100)} cm`);}
 const w=room.walls[0];if(showRoom&&w){const p=w.start.clone().addScaledVector(w.normal,.07);add(p,p.clone().setY(room.height),`H pièce · ${Math.round(room.height*100)} cm`);}
 const item=composition.selected;if(!item||!item.root.visible)return segments;const d=item.dimensions,half=d.width/2,base=d.base,height=item.type==='cabinet'?cabinetFormat(item.settings.format).height:d.height,z=isFloorItem(item)?-d.depth/2:-.23;
 item.root.updateMatrixWorld(true);const world=(x,y,zz)=>item.root.localToWorld(new T.Vector3(x,y,zz));
 if(item.type==='mirror'){add(world(-half,1.4,.045),world(half,1.4,.045),'L · '+Math.round(d.width*100)+' cm');add(world(half+.04,1.4-d.height/2,.045),world(half+.04,1.4+d.height/2,.045),'H · '+Math.round(d.height*100)+' cm');return segments;}
 const front=z+d.depth+.025,bottom=base;
 add(world(-half,bottom-.055,front),world(half,bottom-.055,front),`L · ${Math.round(d.width*100)} cm`);
 add(world(half+.055,bottom,front),world(half+.055,bottom+height,front),`H · ${Math.round(height*100)} cm`);
 if(!isOpening(item.type))add(world(-half-.045,bottom-.055,z),world(-half-.045,bottom-.055,z+d.depth),`P · ${Math.round(d.depth*100)} cm`);
 const support=room.walls[item.placement.wall];if(support&&['cabinet','column'].includes(item.type)){const t=new T.Vector3(Math.cos(support.group.rotation.y),0,-Math.sin(support.group.rotation.y)),start=support.start.clone().addScaledVector(support.normal,.12);start.y=item.placement.height/100+height+.08;const left=item.placement.u/100-half,right=item.placement.u/100+half;if(left>.01)add(start.clone(),start.clone().addScaledVector(t,left),'Gauche · '+Math.round(left*100)+' cm');if(support.length-right>.01)add(start.clone().addScaledVector(t,right),start.clone().addScaledVector(t,support.length),'Droite · '+Math.round((support.length-right)*100)+' cm');}
 const clearance=item.placement.height/100;if(clearance>.01){const p=world(-half-.055,bottom,z+.03);add(p.clone().setY(0),p,`${isOpening(item.type)?'Allège':'Sous meuble'} · ${Math.round(clearance*100)} cm`);}
 return segments;
}
export function projectDimensions(segments,camera,width,height){
 camera.updateMatrixWorld(true);const output=[];
 for(const {a,b,label} of segments){const pa=a.clone().project(camera),pb=b.clone().project(camera);if([pa,pb].some(p=>!Number.isFinite(p.x)||p.z<-1||p.z>1))continue;const x1=(pa.x+1)*width/2,y1=(1-pa.y)*height/2,x2=(pb.x+1)*width/2,y2=(1-pb.y)*height/2,dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy);if(len<12)continue;const x=(x1+x2)/2,y=(y1+y2)/2;if(x<0||x>width||y<0||y>height)continue;output.push({x1,y1,x2,y2,x,y,label,nx:-dy/len*4,ny:dx/len*4});
 }return output;
}
export function dimensionMarkup(projected){return projected.map(p=>{const n=v=>v.toFixed(1),{x1,y1,x2,y2,x,y,nx,ny,label}=p;return `<g><path d="M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}M${n(x1-nx)} ${n(y1-ny)}L${n(x1+nx)} ${n(y1+ny)}M${n(x2-nx)} ${n(y2-ny)}L${n(x2+nx)} ${n(y2+ny)}"/><text x="${n(x)}" y="${n(y-7)}">${label}</text></g>`;}).join('');}
