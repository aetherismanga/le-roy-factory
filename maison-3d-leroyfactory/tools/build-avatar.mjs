// Convert the MIT-licensed Rocketbox source; retain only the expressions used by the house.
// node tools/build-avatar.mjs /path/to/Male_Adult_01_facial.fbx [output.glb]
import fs from 'node:fs';
import * as T from 'three';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
class Reader {readAsArrayBuffer(blob){blob.arrayBuffer().then(b=>{this.result=b;this.onloadend?.();});}readAsDataURL(blob){blob.arrayBuffer().then(b=>{this.result='data:application/octet-stream;base64,'+Buffer.from(b).toString('base64');this.onloadend?.();});}}
globalThis.FileReader=Reader;
const manager=new T.LoadingManager();manager.addHandler(/\.tga$/i,{setPath(){return this;},load:()=>new T.Texture()});
const buffer=fs.readFileSync(process.argv[2]);const root=new FBXLoader(manager).parse(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength),'');
root.name='LRF_Resident_Rocketbox';root.animations=[];
root.traverse(o=>{if(!o.isMesh)return;
 const names=Object.keys(o.morphTargetDictionary||{}),keep=names.map((n,i)=>/AK_(09_EyeBlinkLeft|10_EyeBlinkRight|44_MouthSmileLeft|45_MouthSmileRight)$/.test(n)?i:-1).filter(i=>i>=0);
 for(const k of Object.keys(o.geometry.morphAttributes))o.geometry.morphAttributes[k]=keep.map(i=>o.geometry.morphAttributes[k][i]);
 o.morphTargetDictionary=Object.fromEntries(keep.map((i,j)=>[names[i],j]));o.morphTargetInfluences=keep.map(()=>0);
 o.material=(Array.isArray(o.material)?o.material:[o.material]).map(m=>new T.MeshStandardMaterial({name:m.name,color:0xffffff,roughness:/head/.test(m.name)?.58:.9,side:/opacity/.test(m.name)?T.DoubleSide:T.FrontSide}));
});
const data=await new GLTFExporter().parseAsync(root,{binary:true,onlyVisible:false});
fs.writeFileSync(process.argv[3]||'assets/avatar/resident-v1.glb',Buffer.from(data));console.log('Avatar GLB',data.byteLength,'bytes');
for(const name of ['Bip01_Head','Bip01_L_UpperArm','Bip01_L_Forearm','Bip01_L_Hand','Bip01_L_Thigh','Bip01_L_Calf','Bip01_L_Foot','Bip01_LEye']){const b=root.getObjectByName(name);console.log(name,b.getWorldPosition(new T.Vector3()).toArray().map(x=>+x.toFixed(2)));}
