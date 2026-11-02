import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import trixie from './media/uptrend/tr443-geometry.json' with {type:'json'};

function bytes(value){const binary=atob(value),result=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)result[i]=binary.charCodeAt(i);return result;}
function decode(data){
 const encoded=bytes(data.positions),view=new DataView(encoded.buffer),positions=new Float32Array(data.vertexCount*3);
 for(let i=0;i<positions.length;i++)positions[i]=trixie.minimum[i%3]+view.getUint16(i*2,true)/65535*trixie.span[i%3];
 const normalBytes=bytes(data.normals),normalView=new DataView(normalBytes.buffer),normals=new Float32Array(data.vertexCount*3);
 for(let i=0;i<normals.length;i++)normals[i]=normalView.getInt16(i*2,true)/32767;
 const indexBytes=bytes(data.indices),indexView=new DataView(indexBytes.buffer),indices=new Uint16Array(data.triangleCount*3);
 for(let i=0;i<indices.length;i++)indices[i]=indexView.getUint16(i*2,true);
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.setAttribute('normal',new T.BufferAttribute(normals,3));geometry.setIndex(new T.BufferAttribute(indices,1));geometry.computeBoundingBox();geometry.computeBoundingSphere();
 geometry.userData={reference:trixie.reference,source:'Manufacturer OBJ derivative',provenance:trixie.source,conversion:trixie.conversion};return geometry;
}
const templates={};
function part(name){templates[name]??=decode(trixie.parts[name]);return templates[name].clone();}
export function makeTrixieCeramicGeometry(){
 // Immutable CPU template; every sanitary owns its clone and GPU allocation.
 // Existing synchronous creation/restoration never substitutes an interim bowl.
 return part('ceramic');
}
export function makeTrixieHardwareGeometries(){return {drain:part('drain'),overflow:part('overflow')};}
export const TRIXIE_CERAMIC_PROVENANCE=Object.freeze({source:trixie.source,conversion:trixie.conversion,triangles:trixie.triangleCount,vertices:trixie.vertexCount});

export const DALIA_LAYOUT=Object.freeze({width:.55,depth:.31,height:.125,drainX:0,drainZ:-.23+.206/.319*.31,tapX:0,tapZ:-.23+.060/.319*.31,drainY:.018,source:'https://uptrend.pl/produkt/dalia/',method:'Photo and technical-drawing reconstruction; published project dimensions retained'});
function contour(w,d,r,cx=0,cz=0){
 r=Math.min(r,w/2,d/2);const result=[],n=24;
 for(const [x,z,start]of [[w/2-r,d/2-r,0],[-w/2+r,d/2-r,Math.PI/2],[-w/2+r,-d/2+r,Math.PI],[w/2-r,-d/2+r,Math.PI*1.5]])for(let i=0;i<=n;i++){const a=start+i/n*Math.PI/2;result.push([cx+x+Math.cos(a)*r,cz+z+Math.sin(a)*r]);}
 return result;
}
function surface(profiles){
 const p=[],uv=[],indices=[],n=100;
 profiles.forEach(([w,d,r,y,cx=0,cz=0],row)=>{
  const points=contour(w,d,r,cx,cz);for(let i=0;i<n;i++){p.push(points[i][0],y,points[i][1]);uv.push(i/n,row/profiles.length);if(row<profiles.length-1){const a=row*n+i,b=row*n+(i+1)%n;indices.push(a,a+n,b,b,a+n,b+n);}}
 });
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(p,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
function polygon(points,Shape=T.Shape,flip=false){const shape=new Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,flip?-z:z):shape.moveTo(x,flip?-z:z));shape.closePath();return shape;}
export function makeDaliaCeramicGeometry(){
 const {width:W,depth:D,height:H,drainZ,tapZ}=DALIA_LAYOUT,z=-.23+D/2,innerDepth=D-.093,innerZ=-.23+.083+innerDepth/2;
 const outer=surface([[W-.006,D-.006,.004,0,0,z],[W-.001,D-.001,.006,H-.008,0,z],[W,D,.006,H-.004,0,z]]);
 const cavity=surface([[W-.020,innerDepth,.012,H-.004,0,innerZ],[W-.032,innerDepth-.012,.017,H-.018,0,innerZ+.002],[W-.075,innerDepth-.037,.035,.065,0,drainZ],[W-.14,innerDepth-.070,.045,.035,0,drainZ],[.14,.10,.045,.023,0,drainZ],[.045,.045,.0225,.018,0,drainZ],[.045,.045,.0225,0,0,drainZ]]);
 const deck=polygon(contour(W,D,.006,0,z),T.Shape,true);
 deck.holes.push(polygon(contour(W-.020,innerDepth,.012,0,innerZ),T.Path,true));
 deck.holes.push(new T.Path().absellipse(0,-tapZ,.018,.018,0,Math.PI*2,true));
 const upper=new T.ExtrudeGeometry(deck,{depth:.004,bevelEnabled:false,curveSegments:48});upper.rotateX(-Math.PI/2);upper.translate(0,H-.004,0);
 const bottom=polygon(contour(W-.006,D-.006,.004,0,z));bottom.holes.push(new T.Path().absellipse(0,drainZ,.0225,.0225,0,Math.PI*2,true));bottom.holes.push(new T.Path().absellipse(0,tapZ,.018,.018,0,Math.PI*2,true));
 const lower=new T.ShapeGeometry(bottom,48);lower.rotateX(Math.PI/2);
 const bore=new T.CylinderGeometry(.018,.018,H-.004,64,1,true);bore.translate(0,(H-.004)/2,tapZ);const bi=bore.index.array;for(let i=0;i<bi.length;i+=3){const temporary=bi[i+1];bi[i+1]=bi[i+2];bi[i+2]=temporary;}bore.computeVertexNormals();
 const geometry=mergeGeometries([outer,cavity,upper,lower,bore].map(part=>part.index?part.toNonIndexed():part),false);geometry.computeBoundingBox();geometry.computeBoundingSphere();geometry.userData={reference:'STR4335',source:DALIA_LAYOUT.source,method:DALIA_LAYOUT.method};return geometry;
}
