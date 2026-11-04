import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera,Scene} from 'three';
import {createUltraPipeline} from '../shared/lrf-3d/ultra-rendering.js';

// Real Three.js composer, passes and render targets; no GPU or shader mocks
// are needed to observe their resize/disposal lifecycle.
function fixture(){
 const renderer={getSize:target=>target.set(800,600),getPixelRatio:()=>1};
 const pipeline=createUltraPipeline(renderer,new Scene(),new PerspectiveCamera(42,4/3,.035,120));
 const events=[],aoTargets=[pipeline.ao.normalRenderTarget,pipeline.ao.gtaoRenderTarget,pipeline.ao.pdRenderTarget];
 for(const [name,target]of [['beauty',pipeline.composer.renderTarget1],['beauty-copy',pipeline.composer.renderTarget2],...aoTargets.map((t,i)=>['ao-'+i,t])]){
  const resize=target.setSize.bind(target);
  target.setSize=(width,height,...rest)=>{events.push({type:'resize',name,width,height,viewportWidth:pipeline.composer.renderTarget1.width,viewportHeight:pipeline.composer.renderTarget1.height});return resize(width,height,...rest);};
  target.addEventListener('dispose',()=>events.push({type:'dispose',name}));
 }
 return {pipeline,events,aoTargets};
}

test('repeated unchanged Ultra sizing preserves actual composer and half-resolution AO targets',()=>{
 const {pipeline:p,events,aoTargets}=fixture();
 try{
  assert.deepEqual(aoTargets.map(t=>[t.width,t.height]),[[400,300],[400,300],[400,300]]);
  for(let i=0;i<10;i++)p.resize(800,600,1);
  assert.deepEqual(events,[],'unchanged quality/observer callbacks must not resize or dispose any target');
  assert.equal(p.composer.renderTarget1.width,800);
  assert.equal(p.ao.blendIntensity,.35);
  assert.equal(p.ao.gtaoMaterial.defines.SAMPLES,16);
 }finally{p.dispose();}
});

test('composer-driven viewport, density and HD changes never promote AO buffers to full resolution',()=>{
 const {pipeline:p,events,aoTargets}=fixture();
 try{
  for(const [width,height,ratio]of [[1200,700,1],[1200,700,1.5],[1920,1080,1],[1200,700,1.5]]){
   events.length=0;p.resize(width,height,ratio);
   const aoCalls=events.filter(e=>e.type==='resize'&&e.name.startsWith('ao-'));
   assert.ok(aoCalls.length>0);
   for(const call of aoCalls){
    // When both density and dimensions change, the native composer may size
    // the old viewport once first. Every intermediate AO allocation must
    // still receive half the corresponding composer viewport.
    assert.equal(call.width,Math.max(1,Math.round(call.viewportWidth*.5)));
    assert.equal(call.height,Math.max(1,Math.round(call.viewportHeight*.5)));
   }
   assert.deepEqual(aoTargets.map(t=>[t.width,t.height]),Array.from({length:3},()=>[Math.max(1,Math.round(width*ratio*.5)),Math.max(1,Math.round(height*ratio*.5))]));
   assert.equal(p.composer.renderTarget1.width,width*ratio);
   assert.equal(p.composer.renderTarget1.height,height*ratio);
   const fxaa=p.composer.passes.at(-1).uniforms.resolution.value;
   assert.deepEqual(fxaa.toArray(),[1/(width*ratio),1/(height*ratio)]);
   events.length=0;p.resize(width,height,ratio);assert.deepEqual(events,[]);
  }
 }finally{p.dispose();}
});

test('Ultra cleanup disposes composer and all half-resolution AO buffers once',()=>{
 const {pipeline:p,events}=fixture();
 p.resize(1000,800,1.25);events.length=0;p.dispose();
 const disposed=events.filter(e=>e.type==='dispose').map(e=>e.name).sort();
 assert.deepEqual(disposed,['ao-0','ao-1','ao-2','beauty','beauty-copy']);
});
