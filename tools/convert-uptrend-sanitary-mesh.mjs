// Usage: node tools/convert-uptrend-sanitary-mesh.mjs INPUT.obj OUTPUT.json
// Requires the repository's three package and meshoptimizer supplied with
// MESHOPT_MODULE=/absolute/path/to/meshoptimizer/index.js. Nothing is fetched.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';

const [input,output]=process.argv.slice(2);
if(!input||!output||!process.env.MESHOPT_MODULE)throw Error('Supply input OBJ, output JSON and MESHOPT_MODULE.');
const source=await readFile(input),object=new OBJLoader().parse(source.toString('utf8')),pieces=[];
object.updateMatrixWorld(true);object.traverse(part=>{if(!part.isMesh)return;const geometry=part.geometry.clone();geometry.applyMatrix4(part.matrixWorld);geometry.deleteAttribute('normal');geometry.deleteAttribute('uv');pieces.push(geometry);});
let geometry=mergeVertices(mergeGeometries(pieces,false),1e-6);geometry.computeBoundingBox();
const min=geometry.boundingBox.min.clone(),size=geometry.boundingBox.getSize(min.clone()),position=geometry.attributes.position;
// Preserve the already-published project dimensions and the existing wall plane.
// The manufacturer CAD's centimetre units and offset origin are normalized here.
for(let i=0;i<position.count;i++)position.setXYZ(i,(position.getX(i)-min.x)/size.x*.625-.3125,(position.getY(i)-min.y)/size.y*.15,(position.getZ(i)-min.z)/size.z*.285-.23);
geometry.computeVertexNormals();const sourceNormals=geometry.attributes.normal.array,sourcePositions=geometry.attributes.position.array,sourceIndices=new Uint32Array(geometry.index.array);
const {MeshoptSimplifier}=await import(pathToFileURL(resolve(process.env.MESHOPT_MODULE)));await MeshoptSimplifier.ready;
// The OBJ contains one named object, but three disconnected physical parts:
// ceramic body, click-clack cover and overflow. Keep their materials separate.
const parents=Uint32Array.from({length:position.count},(_,i)=>i);
const find=i=>{while(parents[i]!==i){parents[i]=parents[parents[i]];i=parents[i];}return i;};
for(let i=0;i<sourceIndices.length;i+=3){const a=find(sourceIndices[i]);parents[find(sourceIndices[i+1])]=a;parents[find(sourceIndices[i+2])]=a;}
const components=new Map();for(let i=0;i<sourceIndices.length;i+=3){const key=find(sourceIndices[i]);if(!components.has(key))components.set(key,[]);components.get(key).push(sourceIndices[i],sourceIndices[i+1],sourceIndices[i+2]);}
const ordered=[...components.values()].sort((a,b)=>b.length-a.length);
if(ordered.length!==3)throw Error('Unexpected manufacturer OBJ component count: '+ordered.length);
const b64=array=>Buffer.from(array.buffer,array.byteOffset,array.byteLength).toString('base64');
const minimum=[-.3125,0,-.23],span=[.625,.15,.285],parts={};let maximumError=0,totalVertices=0,totalTriangles=0;
for(const [partNumber,name]of ['ceramic','drain','overflow'].entries()){
 const targetTriangles=[24000,2200,1600][partNumber],[indices,error]=MeshoptSimplifier.simplify(new Uint32Array(ordered[partNumber]),sourcePositions,3,targetTriangles*3,.00015,['ErrorAbsolute','LockBorder']);
 const [remap,count]=MeshoptSimplifier.compactMesh(indices),positions=new Uint16Array(count*3),normals=new Int16Array(count*3);
 if(count>65535)throw Error('The optimized mesh exceeds its 16-bit index budget.');
 const low=[Infinity,Infinity,Infinity],high=[-Infinity,-Infinity,-Infinity];
 for(let old=0;old<remap.length;old++)if(remap[old]!==0xffffffff)for(let axis=0;axis<3;axis++){low[axis]=Math.min(low[axis],sourcePositions[old*3+axis]);high[axis]=Math.max(high[axis],sourcePositions[old*3+axis]);}
 const centre=low.map((value,axis)=>(value+high[axis])/2),partScale=name==='drain'?[.063/(high[0]-low[0]),1,.063/(high[2]-low[2])]:[1,1,1];
 for(let old=0;old<remap.length;old++){
  const target=remap[old];if(target===0xffffffff)continue;
  const normal=[0,1,2].map(axis=>sourceNormals[old*3+axis]/partScale[axis]),normalLength=Math.hypot(...normal)||1;
  for(let axis=0;axis<3;axis++){
   const coordinate=centre[axis]+(sourcePositions[old*3+axis]-centre[axis])*partScale[axis];
   positions[target*3+axis]=Math.round(Math.max(0,Math.min(1,(coordinate-minimum[axis])/span[axis]))*65535);
   normals[target*3+axis]=Math.round(Math.max(-1,Math.min(1,normal[axis]/normalLength))*32767);
  }
 }
 parts[name]={vertexCount:count,triangleCount:indices.length/3,maxEstimatedErrorMetres:error,...(name==='drain'?{nominalCoverDiameterMetres:.063}:{}),positions:b64(positions),normals:b64(normals),indices:b64(new Uint16Array(indices))};
 maximumError=Math.max(maximumError,error);totalVertices+=count;totalTriangles+=indices.length/3;
}
const result={
 reference:'TR443',name:'UPTREND TRIXIE',format:'uint16-position-int16-normal-uint16-index-base64-le-v1',
 source:{page:'https://uptrend.pl/produkt/trixie/',asset:process.env.UPTREND_SOURCE_URL||null,file:input.split(/[\\/]/).at(-1),sha256:createHash('sha256').update(source).digest('hex'),triangles:sourceIndices.length/3,vertices:position.count},
 conversion:{method:'meshoptimizer topology-aware indexed simplification with locked borders; original CAD vertex positions and smooth normals retained; ceramic, drain and overflow components kept separate',maxEstimatedErrorMetres:maximumError,positionQuantizationMaximumMetres:Math.hypot(...span)/65535/2,projectDimensionsMetres:[.625,.285,.15],wallPlaneMetres:-.23,dimensionPolicy:'Existing project dimensions retained. The 2026 catalogue states 625 × 285 × 150 mm; manufacturer technical drawing and CAD have small dimensional differences. The separate click-clack cover retains its nominal 63 mm diameter after overall normalization.'},
 vertexCount:totalVertices,triangleCount:totalTriangles,minimum,span,parts
};
await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(result)+'\n');
console.log(JSON.stringify({output,sourceTriangles:result.source.triangles,triangles:result.triangleCount,vertices:totalVertices,estimatedErrorMetres:maximumError,bytes:(await readFile(output)).length}));
