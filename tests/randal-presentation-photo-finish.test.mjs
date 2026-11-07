import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {DenoiseMaterial} from 'three-gpu-pathtracer/src/materials/fullscreen/DenoiseMaterial.js';
import {createPresentationPhotoFinish} from '../shared/lrf-3d/randal-presentation-photo-finish.js';

function fixture({capture='success',throwDraw=false}={}){
 const target={texture:new T.Texture(),width:800,height:450},priorTarget={name:'previous target'},viewport=new T.Vector4(4,8,20,30),scissor=new T.Vector4(2,3,10,15),calls=[],stages=[];
 let renderTarget=priorTarget,scissorTest=true,callback,disposed=0,material;
 const canvas={width:1600,height:900,toBlob(fn,type){calls.push('capture');assert.equal(type,'image/png');callback=fn;if(capture==='throw')throw Error('Canvas tainted');if(capture==='success')fn(new Blob(['PNG'],{type}));if(capture==='empty')fn(null);}};
 const renderer={toneMapping:T.ACESFilmicToneMapping,toneMappingExposure:.25,outputColorSpace:T.SRGBColorSpace,autoClear:false,getRenderTarget:()=>renderTarget,setRenderTarget:value=>{renderTarget=value;},getViewport:v=>v.copy(viewport),setViewport:(x,y,z,w)=>viewport.copy(x?.isVector4?x:new T.Vector4(x,y,z,w)),getScissor:v=>v.copy(scissor),setScissor:v=>scissor.copy(v),getScissorTest:()=>scissorTest,setScissorTest:value=>scissorTest=value,getSize:v=>v.set(800,450)};
 const helper=createPresentationPhotoFinish({renderer,canvas,captureTimeoutMs:15,createQuad:m=>{material=m;return {render(){calls.push('denoise');assert.equal(renderTarget,null);assert.deepEqual(viewport.toArray(),[0,0,800,450]);assert.equal(scissorTest,false);assert.equal(renderer.autoClear,true);assert.equal(material.map,target.texture);if(throwDraw)throw Error('GPU draw failed');},dispose(){disposed++;}};}});
 const finish=options=>helper.finish({target,samples:512,onStage:stage=>stages.push(stage),...options});
 const assertRestored=()=>{assert.equal(renderTarget,priorTarget);assert.deepEqual(viewport.toArray(),[4,8,20,30]);assert.deepEqual(scissor.toArray(),[2,3,10,15]);assert.equal(scissorTest,true);assert.equal(renderer.autoClear,false);assert.equal(renderer.toneMappingExposure,.25);assert.equal(renderer.toneMapping,T.ACESFilmicToneMapping);assert.equal(renderer.outputColorSpace,T.SRGBColorSpace);};
 return {helper,finish,canvas,target,renderer,calls,stages,assertRestored,respond:blob=>callback?.(blob),get material(){return material;},get disposed(){return disposed;}};
}

test('final PNG comes from native linear-HDR edge-preserving denoise and captures before renderer state restoration',async()=>{
 const f=fixture(),result=await f.finish();assert.deepEqual(f.calls,['denoise','capture']);assert.deepEqual(f.stages,['denoising','capturing']);assert(f.material instanceof DenoiseMaterial);assert.equal(f.material.toneMapped,true);assert.equal(f.material.blending,T.NoBlending);assert.equal(f.material.sigma,2.5);assert.equal(f.material.threshold,.1);
 assert(result.blob instanceof Blob);assert.equal(result.blob.type,'image/png');assert.equal(result.width,1600);assert.equal(result.height,900);assert.equal(result.nativeWidth,800);assert.equal(result.nativeHeight,450);assert.equal(result.samples,512);assert.equal(result.denoised,true);f.assertRestored();f.helper.dispose();f.helper.dispose();assert.equal(f.disposed,1);
});

test('failed draw, tainted canvas, empty capture and timeout restore state and cannot create a ready photo',async()=>{
 for(const options of [{throwDraw:true},{capture:'throw'},{capture:'empty'},{capture:'timeout'}]){const f=fixture(options);await assert.rejects(f.finish(),/failed|tainted|vide|délai/);f.assertRestored();f.helper.dispose();}
});

test('edits and closure discard late encoded blobs, and closing resolves a pending capture immediately',async()=>{
 const f=fixture({capture:'deferred'});let current=true;const pending=f.finish({isCurrent:()=>current});f.assertRestored();current=false;f.respond(new Blob(['old PNG']));assert.equal(await pending,null);f.helper.dispose();
 const closed=fixture({capture:'deferred'}),capture=closed.finish();closed.helper.dispose();assert.equal(await capture,null);closed.respond(new Blob(['late PNG']));assert.equal(closed.disposed,1);closed.assertRestored();
});

test('cancellation during a stage callback cannot allocate a denoiser or encode a later frame',async()=>{
 const f=fixture();const result=await f.finish({onStage:()=>f.helper.dispose()});assert.equal(result,null);assert.deepEqual(f.calls,[]);assert.equal(f.material,undefined);
});
