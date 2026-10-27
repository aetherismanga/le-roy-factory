import assert from 'node:assert/strict';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createResident} from '../resident.js';

const originalDocument=globalThis.document,originalTextureLoad=T.TextureLoader.prototype.loadAsync,originalModelLoad=GLTFLoader.prototype.loadAsync;
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({createRadialGradient:()=>({addColorStop(){}}),fillRect(){}})})};
const flights=[],resources=[];
function tracked(resource){const record={resource,count:0};resource.addEventListener('dispose',()=>record.count++);resources.push(record);return resource;}
function defer(url,kind){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});flights.push({url,kind,resolve,reject});return promise;}
T.TextureLoader.prototype.loadAsync=function(url){return defer(url,'texture');};
GLTFLoader.prototype.loadAsync=function(url){return defer(url,'model');};
const profiles={jerome:{model:'resident.glb',height:1.65,noJewelry:true,noOpacity:true,maps:{head_color:'head.webp',body_color:'body.webp',head_normal:'head-normal.webp',body_normal:'body-normal.webp'}}};
const renderer={capabilities:{getMaxAnisotropy:()=>16}};
function texture(){return tracked(new T.Texture({width:1254,height:1254}));}
function model(){
 const root=new T.Group(),embedded=texture(),material=tracked(new T.MeshStandardMaterial({map:embedded}));material.name='m002_head';
 const mesh=new T.Mesh(tracked(new T.BoxGeometry(1,2,.4)),material);mesh.position.y=1;root.add(mesh);
 const add=(name,parent,x,y,z)=>{const bone=new T.Bone();bone.name='Bip01_'+name;bone.position.set(x,y,z);parent.add(bone);return bone;};
 const pelvis=new T.Bone();pelvis.name='Bip01';pelvis.position.y=1;root.add(pelvis);
 for(const sign of [-1,1]){const side=sign===1?'L':'R',thigh=add(side+'_Thigh',pelvis,sign*.2,0,0),calf=add(side+'_Calf',thigh,0,-.5,0);add(side+'_Foot',calf,0,-.5,.1);const arm=add(side+'_UpperArm',root,sign*.4,1.7,0),forearm=add(side+'_Forearm',arm,0,-.4,.1);add(side+'_Hand',forearm,0,-.4,0);}
 const head=add('Head',root,0,1.8,0);add('LEye',head,-.1,.05,.1);add('REye',head,.1,.05,.1);
 root.updateMatrixWorld(true);return {scene:root};
}
function fulfill(flight){const value=flight.kind==='model'?model():texture();flight.resolve(value);return value;}
const settle=()=>new Promise(resolve=>setImmediate(resolve));

try{
 // Model disposal while some independent texture flights are still pending.
 const scene=new T.Scene(),first=createResident(scene,renderer,{profiles,baseURL:'/test/'}),start=flights.length,pending=first.load('jerome'),initial=flights.slice(start);
 assert.equal(initial.length,5,'Personalized model omits the unused opacity map');assert(initial.every(flight=>!flight.url.includes('opacity')));
 const firstRoot=fulfill(initial[0]).scene;fulfill(initial[1]);await settle();first.dispose();
 for(const flight of initial.slice(2))fulfill(flight);
 assert.equal(await pending,null);assert.equal(first.ready,false);assert.equal(first.pivot.parent,null);assert.equal(first.pivot.children.length,0);assert.equal(firstRoot.parent,null);
 assert(resources.every(record=>record.count===1),'Early and late successful results are each released exactly once');
 const afterDispose=flights.length;await first.load('jerome');assert.equal(flights.length,afterDispose,'Disposed resident starts no more requests');

 const late=createResident(new T.Scene(),renderer,{profiles,baseURL:'/test/'}),lateStart=flights.length,latePending=late.load('jerome');late.dispose();
 let lateRoot;for(const flight of flights.slice(lateStart)){const value=fulfill(flight);if(flight.kind==='model')lateRoot=value.scene;}
 assert.equal(await latePending,null);assert.equal(lateRoot.parent,null);assert.equal(late.pivot.children.length,0);
 assert(resources.every(record=>record.count===1),'A model arriving after disposal is released without attaching');

 // One failed sibling must release current results and all later successes.
 const second=createResident(new T.Scene(),renderer,{profiles,baseURL:'/test/'}),secondStart=flights.length,failed=second.load('jerome'),siblings=flights.slice(secondStart);
 fulfill(siblings[0]);fulfill(siblings[1]);siblings[2].reject(Error('missing normal texture'));
 await assert.rejects(failed,/missing normal texture/);
 for(const flight of siblings.slice(3))fulfill(flight);await settle();
 assert.equal(second.ready,false);assert.equal(second.pivot.children.length,1,'Failed model is detached and only contact placeholder remains');second.dispose();
 assert(resources.every(record=>record.count===1),'Rejected parallel loads do not retain successful siblings');

 // Successful load diagnostics report native generated resolution, and cleanup
 // includes replaced original material textures as well as the new atlas maps.
 const third=createResident(new T.Scene(),renderer,{profiles,baseURL:'/test/'}),thirdStart=flights.length,loaded=third.load('jerome');
 for(const flight of flights.slice(thirdStart))fulfill(flight);
 assert(await loaded);assert.equal(third.ready,true);assert.equal(third.diagnostics.textures,1254);assert.deepEqual(third.diagnostics.textureDimensions.head,{width:1254,height:1254});
 third.setVisible(true);assert.equal(third.pivot.visible,true);third.dispose();third.dispose();assert.equal(third.pivot.visible,false);
 assert(resources.every(record=>record.count===1),'Normal and repeated disposal releases every recorded resource once');
 console.log(JSON.stringify({passed:true,checks:['dispose during parallel loading','late successful texture/model cleanup','partial request failure cleanup','no post-dispose requests or attachment','unused opacity request omitted','native atlas resolution diagnostics','idempotent GPU disposal']},null,2));
}finally{
 T.TextureLoader.prototype.loadAsync=originalTextureLoad;GLTFLoader.prototype.loadAsync=originalModelLoad;
 if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;
}
