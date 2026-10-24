import {trimWallsToFloor,floorContains} from './plan-topology.mjs';
import * as T from 'three';
import {calculatePlinths,plinthSettings,subtractIntervals,wallHasPlinth} from './plinth-math.mjs';
const dist=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
export function plinthWalls(room,finishes=[]){
 const walls=room.walls.map((w,i)=>{const a=[w.start.x*100,-(w.start.z+.23)*100],angle=w.group.rotation.y,b=[a[0]+w.length*100*Math.cos(angle),a[1]+w.length*100*Math.sin(angle)],f=finishes[i]||{};return {key:w.key,label:w.partition===undefined?'Mur '+(i+1):'Cloison '+(w.partition+1)+' · face '+(w.partitionSide+1),index:i,a,b,tiled:f.collection!=='Peinture',cuts:(w.openings||[]).filter(o=>o.bottom<.001).map(o=>[o.left*100,o.right*100]),tiledCuts:(f.zones||[]).filter(z=>z.y<.1&&z.collection!=='Peinture').map(z=>[z.x,z.x+z.width])};});
 for(const [i,p]of (room.partitions||[]).entries()){const polygon=p.corners.map(([x,z])=>[x*100,-z*100]);for(const j of [1,3]){const indexes=room.walls.map((w,k)=>w.partition===i?k:-1).filter(n=>n>=0);walls.push({key:'partition-'+p.id+'-end'+j,label:'Cloison '+(i+1)+' · retour '+(j===1?1:2),index:indexes[0],a:polygon[j],b:polygon[(j+1)%4],tiled:indexes.some(k=>finishes[k]?.collection!=='Peinture'),cuts:[]});}}
 for(const w of walls){w.cuts.push(...(room.plinthExclusions?.[w.key]||[]));const len=dist(w.a,w.b),ux=(w.b[0]-w.a[0])/len,uy=(w.b[1]-w.a[1])/len;for(const other of walls){if(w===other)continue;const project=p=>(p[0]-w.a[0])*ux+(p[1]-w.a[1])*uy,offset=p=>Math.abs((p[0]-w.a[0])*uy-(p[1]-w.a[1])*ux);if(offset(other.a)<.1&&offset(other.b)<.1)w.cuts.push([Math.max(0,Math.min(project(other.a),project(other.b))),Math.min(len,Math.max(project(other.a),project(other.b)))]);}}if(room.partitions?.length&&room.floor.usableRegions){const usable=room.floor.usableRegions;trimWallsToFloor(walls,{usable,contains:p=>floorContains(usable,p)},1);}return walls;
}
export function plinthGrid(room){
 const l=room.floor.layout||{},vertical=l.direction==='vertical',x=l.x||0,y=l.y||0,width=(l.width||1.2)*100,height=(l.height||.6)*100,toGrid=p=>{const q=l.planAxes?[p[0],-p[1]]:p;return vertical?[q[1]-y,-q[0]+x]:[q[0]-x,q[1]-y];},fromGrid=p=>{const q=vertical?[-p[1]+x,p[0]+y]:[p[0]+x,p[1]+y];return l.planAxes?[q[0],-q[1]]:q;},grout=(l.groutWidth||2)/10;
 const cells=(room.floor.tiles?.geometry.userData.cells||[]).map(c=>{const center=toGrid(c.center.map(v=>v*100));return c.bounds.map(p=>{const q=toGrid(p.map(v=>v*100));return fromGrid([center[0]+(q[0]-center[0])*c.width*100/(c.width*100-grout),center[1]+(q[1]-center[1])*c.height*100/(c.height*100-grout)]);});});
 return {width,height,pattern:l.pattern,toGrid,...(cells.length?{cells}:{})};
}
export function plinthReport(room,settings,finishes){try{return calculatePlinths(plinthWalls(room,finishes),settings,plinthGrid(room));}catch(error){const s=plinthSettings(settings);return {error:error.message,type:s.type,net:null,debit:null,order:null,waste:null,units:0,tiles:0,tileArea:0,pieces:0,boxes:null,height:s.height,product:s.product,runs:[],pieceList:[],cutting:[]};}}
export function buildPlinths(room,value,finishes){
 const s=plinthSettings(value),report=plinthReport(room,s,finishes),walls=plinthWalls(room,finishes),group=new T.Group(),materials=new Set();group.name='Plinthes';
 const material=s.type==='wood'?new T.MeshStandardMaterial({color:'#f8f7f2',roughness:.66}):room.floor.material.clone();materials.add(material);const byWall=new Map();
 for(const piece of report.pieceList){const wall=walls.find(w=>w.key===piece.key);if(!byWall.has(piece.key)){const child=new T.Group();child.userData.wallIndex=wall.index;child.name=wall.label;group.add(child);byWall.set(piece.key,child);}const a=piece.a,b=piece.b,length=dist(a,b),joint=s.type==='wood'?0:(room.floor.layout?.groutWidth||2)/10,g=new T.BoxGeometry(Math.max(.0001,(length-joint)/100),report.height/100,s.thickness/100),mesh=new T.Mesh(g,material),nx=-(b[1]-a[1])/length,ny=(b[0]-a[0])/length;
 // Room floor coordinates use -Z. Its inside is right of each oriented edge.
 mesh.position.set((a[0]+b[0])/200-nx*s.thickness/200,report.height/200,-(a[1]+b[1])/200-.23+ny*s.thickness/200);mesh.rotation.y=Math.atan2(b[1]-a[1],b[0]-a[0]);mesh.castShadow=mesh.receiveShadow=true;mesh.name='Plinthe_'+piece.key;mesh.raycast=()=>{};byWall.get(piece.key).add(mesh);
 }
 return {group,report,dispose(){group.removeFromParent();group.traverse(o=>o.geometry?.dispose());for(const m of materials)m.dispose();}};
}
