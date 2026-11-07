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

const flush=async()=>{for(let i=0;i<18;i++)await Promise.resolve();};
function fixture({deferScene=false,deferEnvironment=false,failScene=false,deferCapture=false,failCapture=false,policy:overrides={}}={}){
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(),material=new T.MeshPhysicalMaterial(),mesh=new T.Mesh(new T.BoxGeometry(),material);scene.add(mesh);
 const listeners=new Map(),frames=new Map(),statuses=[],errors=[],captures=[],events=[];let serial=0,time=0,resumeScene,resumeEnvironment,resumeCapture,disposed=0,envDisposed=0,built=0,rendered=0,workerDisposed=0,loaded=0,restores=0,finishes=0,path=null;
 const policy={...progressivePresentationPolicy({floatTargets:true,maxTextureSize:8192}),maxSamples:3,...overrides};
 const renderer={getDrawingBufferSize:v=>v.set(3840,2160)};
 const canvas={width:1920,height:1080,addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:type=>listeners.delete(type)};
 const helper=createProgressivePresentation({renderer,scene,camera,canvas,policy,onStatus:s=>{statuses.push(s);events.push(s.mode);},onFallback:e=>errors.push(e),onRestoreRaster:()=>restores++,onPhotoCapture:c=>{captures.push(c);events.push('capture-callback');},createPathTracer:()=>path={tiles:new T.Vector2(),textureSize:new T.Vector2(),target:{texture:new T.Texture(),width:1280,height:720},samples:0,isCompiling:false,_generator:{_materialUuids:['old']},reset(){this.samples=0;},setBVHWorker(worker){this.worker=worker;},async setSceneAsync(photo,camera){assert.equal(this._generator._materialUuids,null);built++;this.scene=photo;this.camera=camera;if(failScene)throw Error('GPU unavailable');if(deferScene)await new Promise(r=>resumeScene=r);this.samples=0;},renderSample(){rendered++;this.samples++;},dispose(){disposed++;}},createBVHWorker:()=>({dispose(){workerDisposed++;}}),createPhotoFinish:()=>({async finish({target,samples,onStage}){finishes++;assert(target.texture);onStage('denoising');onStage('capturing');if(deferCapture)await new Promise(r=>resumeCapture=r);if(failCapture)throw Error('PNG capture failed');return {blob:new Blob(['PNG'],{type:'image/png'}),width:1920,height:1080,samples,denoised:true};},dispose(){}}),loadEnvironment:()=>{loaded++;const texture=new T.Texture();texture.addEventListener('dispose',()=>envDisposed++);return deferEnvironment?new Promise(r=>resumeEnvironment=()=>r(texture)):Promise.resolve(texture);},clock:()=>time,scheduleFrame:fn=>{const id=++serial;frames.set(id,fn);return id;},cancelFrame:id=>frames.delete(id)});
 const runFrame=async(delta=600)=>{const entry=frames.entries().next().value;if(entry){frames.delete(entry[0]);time+=delta;entry[1]();await flush();}};
 return {helper,scene,material,frames,statuses,errors,captures,events,listeners,runFrame,flush,resumeScene:()=>resumeScene?.(),resumeEnvironment:()=>resumeEnvironment?.(),resumeCapture:()=>resumeCapture?.(),get path(){return path;},get built(){return built;},get rendered(){return rendered;},get disposed(){return disposed;},get envDisposed(){return envDisposed;},get workerDisposed(){return workerDisposed;},get loaded(){return loaded;},get restores(){return restores;},get finishes(){return finishes;}};
}

test('opening, idle, reactivation and pointer release never fetch HDR, build workers or calculate samples',async()=>{
 const f=fixture();await flush();f.helper.changed();f.helper.setActive(false);f.helper.setActive(true);f.listeners.get('pointerdown')({pointerId:1});assert.equal(await f.helper.start(),false);f.listeners.get('pointerup')({pointerId:1});await flush();
 assert.equal(f.loaded,0);assert.equal(f.built,0);assert.equal(f.frames.size,0);assert.equal(f.rendered,0);assert.equal(f.statuses.length,0);f.helper.dispose();assert.equal(f.listeners.size,0);
});

test('explicit photo request calculates its full sample budget, denoises, captures and only then reports ready',async()=>{
 const f=fixture();assert.equal(await f.helper.start(),true);assert.equal(f.loaded,1);assert.equal(f.built,1);assert(f.path.renderScale<1);assert.equal(f.path.bounces,8);assert.equal(f.path.multipleImportanceSampling,true);assert.equal(f.path.rasterizeScene,false);
 await f.runFrame();await f.runFrame();assert.equal(f.captures.length,0);assert.equal(f.finishes,0);await f.runFrame();
 assert.equal(f.rendered,3);assert.equal(f.frames.size,0);assert.equal(f.statuses.at(-1).mode,'ready');assert.equal(f.statuses.at(-1).samples,3);assert.equal(f.captures.length,1);assert.equal(f.helper.getPhotoCapture(),f.captures[0]);assert.deepEqual(f.events.slice(-4),['denoising','capturing','capture-callback','ready']);assert.equal(f.disposed,1);assert.equal(f.workerDisposed,1);assert.equal(f.envDisposed,1);f.helper.dispose();assert.equal(f.disposed,1);
});

test('camera, geometry and finish changes cancel photo and require another explicit request',async()=>{
 const f=fixture();await f.helper.start();const previous=f.path;await f.runFrame();assert.equal(previous.samples,1);f.helper.changed();assert.equal(f.frames.size,0);assert.equal(f.statuses.at(-1).mode,'interactive');await flush();assert.equal(f.built,1);assert.equal(f.loaded,1);
 f.scene.children[0].position.x=2;await f.helper.start();assert.equal(f.built,2);assert.equal(f.path.scene.children[0].matrix.elements[12],2);assert.notEqual(f.path.scene.children[0].material,f.material);f.helper.dispose();
});

test('a pointer gesture cancels photo immediately, restores raster and does not restart on release',async()=>{
 const f=fixture();await f.helper.start();await f.runFrame();f.listeners.get('pointerdown')({pointerId:7});assert.equal(f.frames.size,0);assert.equal(f.restores,1);f.listeners.get('pointerup')({pointerId:7});await flush();assert.equal(f.loaded,1);assert.equal(f.built,1);assert.equal(f.frames.size,0);assert.equal(f.captures.length,0);f.helper.dispose();
});

test('superseded asynchronous builds never display an old composition or reschedule themselves',async()=>{
 const f=fixture({deferScene:true});const start=f.helper.start();await flush();assert.equal(f.built,1);f.helper.changed();f.resumeScene();assert.equal(await start,false);await flush();assert.equal(f.frames.size,0);assert.equal(f.built,1);assert.equal(f.disposed,1);f.helper.dispose();
});

test('closing during HDR load or BVH work prevents late allocations and releases resources once',async()=>{
 const loading=fixture({deferEnvironment:true});const start=loading.helper.start();await flush();loading.helper.dispose();loading.resumeEnvironment();assert.equal(await start,false);assert.equal(loading.built,0);assert.equal(loading.envDisposed,1);
 const building=fixture({deferScene:true});const second=building.helper.start();await flush();building.helper.dispose();building.resumeScene();assert.equal(await second,false);assert.equal(building.frames.size,0);assert.equal(building.disposed,1);assert.equal(building.workerDisposed,1);assert.equal(building.envDisposed,1);
});

test('a 90-second render with only eight samples is still incomplete, never ready or captured',async()=>{
 const f=fixture({policy:{maxSamples:128,maxTimeMs:100000}});await f.helper.start();for(let i=0;i<8;i++)await f.runFrame(11500);
 assert.equal(f.path.samples,8);assert.equal(f.statuses.at(-1).mode,'photoreal');assert.equal(f.finishes,0);assert.equal(f.captures.length,0);await f.runFrame(11500);assert.equal(f.statuses.at(-1).mode,'incomplete');assert.equal(f.finishes,0);assert.equal(f.frames.size,0);assert.equal(f.restores,1);f.helper.dispose();
});

test('shader compile timeouts cannot produce a completed image even if sample counters advance',async()=>{
 const f=fixture({policy:{compileTimeMs:1000}});await f.helper.start();f.path.isCompiling=true;await f.runFrame(1100);assert.equal(f.statuses.at(-1).mode,'incomplete');assert.equal(f.captures.length,0);assert.equal(f.frames.size,0);f.helper.dispose();
});

test('capture completion after an edit or close is discarded and never reports ready',async()=>{
 for(const close of [false,true]){const f=fixture({deferCapture:true});await f.helper.start();for(let i=0;i<3;i++)await f.runFrame();assert.equal(f.statuses.at(-1).mode,'capturing');if(close)f.helper.dispose();else f.helper.changed();f.resumeCapture();await flush();assert.equal(f.captures.length,0);assert(!f.statuses.some(s=>s.mode==='ready'));assert.equal(f.disposed,1);f.helper.dispose();}
});

test('failed calculation or PNG capture report explicit fallback and free resources without fake success',async()=>{
 const f=fixture({failScene:true});assert.equal(await f.helper.start(),false);assert.equal(f.statuses.at(-1).mode,'fallback');assert.equal(f.errors.length,1);assert.equal(f.disposed,1);assert.equal(f.workerDisposed,1);assert.equal(f.envDisposed,1);assert.equal(f.frames.size,0);f.helper.dispose();assert.equal(f.disposed,1);
 const capture=fixture({failCapture:true});await capture.helper.start();for(let i=0;i<3;i++)await capture.runFrame();assert.equal(capture.statuses.at(-1).mode,'fallback');assert.equal(capture.captures.length,0);assert(!capture.statuses.some(s=>s.mode==='ready'));capture.helper.dispose();
});

test('pinned renderer cleanup includes both path passes and owned uniform resources, not source backgrounds',()=>{
 let textures=0,source=0,materials=0,passes=0,geometry=0;const resource={dispose(){textures++;}},background={dispose(){source++;}},material={uniforms:{atlas:{value:resource},backgroundMap:{value:background}},dispose(){materials++;}};
 disposePinnedPathTracer({_pathTracer:{material},_lowResPathTracer:{material,dispose(){passes++;}},_generator:{geometry:{dispose(){geometry++;}}},dispose(){passes++;}});assert.equal(textures,1);assert.equal(source,0);assert.equal(materials,1);assert.equal(passes,2);assert.equal(geometry,1);
});
