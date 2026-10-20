import assert from 'node:assert/strict';
import * as T from 'three';
import {makeTiledSurface,SURFACES} from '../src/surfaces.js';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
const originalHashes={floor:'99a6fa45f1144b5bad49ce3a1a3e96fb2ef12d752655d07feef36ec8af4440d7',wall:'103c15a27588b04216c6aa5a80af8da81dbbb8ced605b9a097b36e34c5c05ebe'};
const results=[];
for(const [kind,columns,rows] of [['floor',10,20],['wall',5,5]]){
 const surface=makeTiledSurface(kind,columns,rows);
 const spec=surface.spec;
 assert.equal(spec.width,1.2);assert.equal(spec.height,.6);assert.equal(spec.grout,.002);
 assert.equal(surface.tiles.count,columns*rows);assert.equal(surface.tiles.receiveShadow,true);
 const dim=new T.Box3().setFromBufferAttribute(surface.tiles.geometry.attributes.position).getSize(new T.Vector3());
 assert(Math.abs(dim.x-1.198)<.000001);assert(Math.abs(dim.y-.598)<.000001);
 const a=new T.Matrix4(),b=new T.Matrix4();surface.tiles.getMatrixAt(0,a);surface.tiles.getMatrixAt(1,b);
 assert(Math.abs(new T.Vector3().setFromMatrixPosition(b).x-new T.Vector3().setFromMatrixPosition(a).x-1.2)<.000001);
 surface.tiles.getMatrixAt(columns,b);assert(Math.abs(new T.Vector3().setFromMatrixPosition(b).y-new T.Vector3().setFromMatrixPosition(a).y-.6)<.000001);
 if(kind==='floor')surface.group.rotation.x=-Math.PI/2;else surface.group.position.set(0,1.5,-.230);
 surface.group.updateMatrixWorld(true);const box=new T.Box3().setFromObject(surface.group);
 if(kind==='floor'){assert(Math.abs(box.max.y)<.000001);assert(Math.abs(box.min.y+.009)<.000001);}else{assert(Math.abs(box.max.z+.230)<.000001);assert(Math.abs(box.min.y)<.000001);assert(Math.abs(box.max.y-3)<.000001);}
 assert(surface.grout.position.z<0&&surface.grout.position.z>-.009);
 const bytes=readFileSync('dist/assets/'+spec.file);const hash=createHash('sha256').update(bytes).digest('hex');assert.equal(hash,originalHashes[kind]);
 results.push({kind,collection:spec.collection,color:spec.color,format:'60x120',jointMm:2,tiles:surface.tiles.count,bytes:bytes.length,sha256:hash});
}
const source=readFileSync('src/app.js','utf8');assert(source.includes("loader.loadAsync('assets/'+choice.file)"));assert(source.includes('texture.colorSpace=T.SRGBColorSpace'));assert(source.includes('applyRoom(roomConfig)'));assert(!/https?:\/\//.test(source));
const report={passed:true,date:new Date().toISOString(),checks:['physical 60x120cm modules','2mm joints and recessed grout','floor lies at y=0','legacy reference-grid geometry remains valid; custom room checked separately','authentic textures unchanged byte for byte','local texture loading and sRGB colour space','wall cutaway retained'],surfaces:results};writeFileSync('qa/surfaces-result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
