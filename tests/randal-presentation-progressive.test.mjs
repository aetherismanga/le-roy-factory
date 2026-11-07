import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {MeshBVH} from 'three-mesh-bvh';
import {PresentationBVHWorker} from '../shared/lrf-3d/randal-presentation-bvh.js';
import {progressivePresentationPolicy,createProgressivePresentation,disposePinnedPathTracer} from '../shared/lrf-3d/randal-presentation-progressive.js';

test('true path tracing uses bounded multi-bounce desktop/mobile budgets and requires float targets and workers',()=>{
 const desktop=progressivePresentationPolicy({floatTargets:true,maxTextureSize:8192}),mobile=progressivePresentationPolicy({mobile:true,floatTargets:true,maxTextureSize:4096});
 assert(desktop.enabled);assert(mobile.enabled);assert.equal(desktop.bounces,8);assert.equal(mobile.bounces,5);assert(desktop.pixels<=1400000&&mobile.pixels<=450000);assert.equal(desktop.textureSize,1024);
 for(const input of [{floatTargets:false,maxTextureSize:8192},{floatTargets:true,maxTextureSize:2048},{floatTargets:true,maxTextureSize:8192,workers:false},{floatTargets:true,maxTextureSize:8192,memory:2}])assert.equal(progressivePresentationPolicy(input).enabled,false);
});

test('BVH worker transfers copies, strips functions and rehydrates the actual acceleration structure',async()=>{
 let message,transfer,terminated=false;const fake={postMessage(value,buffers){message=value;transfer=buffers;structuredClone(value,{transfer:buffers});},terminate(){terminated=true;}},geometry=new T.BoxGeometry();
 const worker=new PresentationBVHWorker({createWorker:()=>fake,url:'worker.js'}),before=geometry.attributes.position.array.slice();
 const promise=worker.generate(geometry,{maxLeafSize:4,onProgress(){}});assert.equal(message.options.onProgress,undefined);assert.equal(transfer.length,2);assert.deepEqual(geometry.attributes.position.array,before);assert(geometry.index.array.byteLength>0);
 const bvh=new MeshBVH(geometry.clone(),{indirect:true}),serialized=MeshBVH.serialize(bvh);fake.onmessage({data:{id:message.id,serialized}});const result=await promise;assert(result instanceof MeshBVH);assert(geometry.boundingBox);worker.dispose();assert(terminated);
});

test('worker failure and closure reject pending requests without detaching the visible composition',async()=>{
 const fake={postMessage(){},terminate(){}},geometry=new T.BoxGeometry(),worker=new PresentationBVHWorker({createWorker:()=>fake,url:'worker.js'});
 const pending=worker.generate(geometry);worker.dispose();await assert.rejects(pending,/fermé/);assert(geometry.attributes.position.array.byteLength>0);await assert.rejects(worker.generate(geometry),/fermé/);
});

const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
function fixture({deferScene=false,deferEnvironment=false,failScene=false}={}){
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(),material=new T.MeshPhysicalMaterial(),mesh=new T.Mesh(new T.BoxGeometry(),material);scene.add(mesh);
 const listeners=new Map(),frames=new Map(),idles=new Map(),statuses=[],errors=[];let serial=0,time=0,resumeScene,resumeEnvironment,disposed=0,envDisposed=0,built=0,rendered=0,workerDisposed=0;
 const environment=new T.Texture();environment.addEventListener('dispose',()=>envDisposed++);
 const path={tiles:new T.Vector2(),textureSize:new T.Vector2(),samples:0,isCompiling:false,_generator:{_materialUuids:['old']},reset(){this.samples=0;},setBVHWorker(worker){this.worker=worker;},async setSceneAsync(photo,camera){assert.equal(this._generator._materialUuids,null);built++;this.scene=photo;this.camera=camera;if(failScene)throw Error('GPU unavailable');if(deferScene)await new Promise(r=>resumeScene=r);this.samples=0;},renderSample(){rendered++;this.samples++;},dispose(){disposed++;}};
 const policy={...progressivePresentationPolicy({floatTargets:true,maxTextureSize:8192}),maxSamples:3};
 const renderer={getDrawingBufferSize:v=>v.set(3840,2160)};
 const canvas={addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:type=>listeners.delete(type)};
 const helper=createProgressivePresentation({renderer,scene,camera,canvas,policy,onStatus:s=>statuses.push(s),onFallback:e=>errors.push(e),createPathTracer:()=>path,createBVHWorker:()=>({dispose(){workerDisposed++;}}),loadEnvironment:()=>deferEnvironment?new Promise(r=>resumeEnvironment=r):Promise.resolve(environment),clock:()=>time,scheduleFrame:fn=>{const id=++serial;frames.set(id,fn);return id;},cancelFrame:id=>frames.delete(id),scheduleIdle:fn=>{const id=++serial;idles.set(id,fn);return id;},cancelIdle:id=>idles.delete(id)});
 const runIdle=async()=>{const entry=idles.entries().next().value;if(entry){idles.delete(entry[0]);entry[1]();await flush();}};
 const runFrame=async()=>{const entry=frames.entries().next().value;if(entry){frames.delete(entry[0]);time+=600;entry[1]();await flush();}};
 return {helper,scene,material,path,frames,idles,statuses,errors,listeners,environment,runIdle,runFrame,resumeScene:()=>resumeScene?.(),resumeEnvironment:()=>resumeEnvironment?.(environment),get built(){return built;},get rendered(){return rendered;},get disposed(){return disposed;},get envDisposed(){return envDisposed;},get workerDisposed(){return workerDisposed;}};
}

test('pointer interactions remain raster; idle computes real photo samples and stops at its budget',async()=>{
 const f=fixture();f.listeners.get('pointerdown')({pointerId:1});assert.equal(f.idles.size,0);assert.equal(f.built,0);f.listeners.get('pointerup')({pointerId:1});await f.runIdle();assert.equal(f.built,1);assert(f.path.renderScale<1);assert.equal(f.path.bounces,8);assert.equal(f.path.rasterizeScene,false);
 for(let i=0;i<3;i++)await f.runFrame();assert.equal(f.rendered,3);assert.equal(f.frames.size,0);assert.equal(f.statuses.at(-1).mode,'ready');assert.equal(f.statuses.at(-1).samples,3);assert.notEqual(f.path.scene.children[0].material,f.material);f.helper.dispose();assert.equal(f.disposed,1);assert.equal(f.workerDisposed,1);assert.equal(f.envDisposed,1);assert.equal(f.listeners.size,0);
});

test('changing camera, geometry or a finish cancels accumulated samples and captures the latest real scene',async()=>{
 const f=fixture();f.helper.changed();await f.runIdle();await f.runFrame();assert.equal(f.path.samples,1);f.helper.changed();assert.equal(f.frames.size,0);assert.equal(f.path.samples,0);f.scene.children[0].position.x=2;await f.runIdle();assert.equal(f.built,2);assert.equal(f.path.scene.children[0].matrix.elements[12],2);f.helper.dispose();
});

test('superseded asynchronous builds never display an old composition',async()=>{
 const f=fixture({deferScene:true});f.helper.changed();await f.runIdle();assert.equal(f.built,1);f.helper.changed();f.resumeScene();await flush();assert.equal(f.frames.size,0);assert.equal(f.idles.size,1);f.helper.dispose();
});

test('closing during environment load or BVH work prevents late allocations and releases resources once',async()=>{
 const loading=fixture({deferEnvironment:true});loading.helper.changed();await loading.runIdle();loading.helper.dispose();loading.resumeEnvironment();await flush();assert.equal(loading.built,0);assert.equal(loading.envDisposed,1);
 const building=fixture({deferScene:true});building.helper.changed();await building.runIdle();building.helper.dispose();building.resumeScene();await flush();assert.equal(building.frames.size,0);assert.equal(building.disposed,1);assert.equal(building.workerDisposed,1);assert.equal(building.envDisposed,1);
});

test('failed photo calculations report an explicit interactive fallback and free GPU resources',async()=>{
 const f=fixture({failScene:true});f.helper.changed();await f.runIdle();assert.equal(f.statuses.at(-1).mode,'fallback');assert.equal(f.errors.length,1);assert.equal(f.disposed,1);assert.equal(f.workerDisposed,1);assert.equal(f.envDisposed,1);assert.equal(f.frames.size,0);f.helper.dispose();assert.equal(f.disposed,1);
});

test('pinned renderer cleanup includes both path passes and owned uniform resources, not source backgrounds',()=>{
 let textures=0,source=0,materials=0,passes=0,geometry=0;const resource={dispose(){textures++;}},background={dispose(){source++;}},material={uniforms:{atlas:{value:resource},backgroundMap:{value:background}},dispose(){materials++;}};
 disposePinnedPathTracer({_pathTracer:{material},_lowResPathTracer:{material,dispose(){passes++;}},_generator:{geometry:{dispose(){geometry++;}}},dispose(){passes++;}});assert.equal(textures,1);assert.equal(source,0);assert.equal(materials,1);assert.equal(passes,2);assert.equal(geometry,1);
});
