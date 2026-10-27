// Real r180 WebGL shader compilation in Chromium. The local server and bundle
// live only in memory; no deployment, external assets or output files are used.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {chromium} from 'playwright';

const source=`
import * as T from 'three';
import {createLightweightMaterials} from './shared/lrf-3d/lightweight-rendering.js';
const canvas=document.createElement('canvas');document.body.append(canvas);
const renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setSize(96,96);
const shaderErrors=[];
renderer.debug.onShaderError=(gl,program,vertex,fragment)=>shaderErrors.push({program:gl.getProgramInfoLog(program),vertex:gl.getShaderInfoLog(vertex),fragment:gl.getShaderInfoLog(fragment)});
const scene=new T.Scene();scene.background=new T.Color(0x756656);scene.add(new T.HemisphereLight(0xffffff,0x444444,2));
const light=new T.DirectionalLight(0xffffff,3);light.position.set(2,3,4);scene.add(light);
const texture=new T.DataTexture(new Uint8Array([190,120,60,255,80,60,20,255,210,150,80,255,140,100,40,255]),2,2);texture.needsUpdate=true;
const material=new T.MeshPhysicalMaterial({map:texture,bumpMap:texture,bumpScale:.05,clearcoat:.8,clearcoatMap:texture,clearcoatNormalMap:texture,clearcoatRoughnessMap:texture,roughness:.3,metalness:.2,color:0xc8bba5});
const geometry=new T.BoxGeometry();scene.add(new T.Mesh(geometry,material));
const camera=new T.PerspectiveCamera(45,1,.1,20);camera.position.set(1.7,1.3,2.5);camera.lookAt(0,0,0);
const policy=createLightweightMaterials();let hookCalls=0;
material.onBeforeCompile=shader=>{hookCalls++;shader.uniforms.existingHook={value:1};};
const originalCompile=material.onBeforeCompile,originalKey=material.customProgramCacheKey;
const before={color:material.color.getHexString(),roughness:material.roughness,metalness:material.metalness,clearcoat:material.clearcoat};
policy.apply(scene,true);renderer.render(scene,camera);
const lightweightPrograms=renderer.info.programs.length;
policy.apply(scene,false);renderer.render(scene,camera);
const restoredPrograms=renderer.info.programs.length,gl=renderer.getContext();
const linked=renderer.info.programs.every(program=>gl.getProgramParameter(program.program,gl.LINK_STATUS));
window.lightweightResult={three:T.REVISION,linked,shaderErrors,lightweightPrograms,restoredPrograms,hookCalls,hooksRestored:material.onBeforeCompile===originalCompile&&material.customProgramCacheKey===originalKey,baseTextureUnchanged:material.map===texture,bumpTextureUnchanged:material.bumpMap===texture,clearcoatMapsUnchanged:material.clearcoatMap===texture&&material.clearcoatNormalMap===texture&&material.clearcoatRoughnessMap===texture,propertiesUnchanged:Object.entries(before).every(([name,value])=>(name==='color'?material.color.getHexString():material[name])===value)};
policy.restore();geometry.dispose();material.dispose();texture.dispose();renderer.dispose();
`;

const bundle=await build({stdin:{contents:source,resolveDir:fileURLToPath(new URL('../../../',import.meta.url))},bundle:true,format:'esm',write:false});
const javascript=bundle.outputFiles[0].text;
const server=createServer((request,response)=>{
 response.setHeader('Cache-Control','no-store');
 if(request.url==='/test.js'){response.setHeader('Content-Type','text/javascript');response.end(javascript);return;}
 if(request.url==='/'){response.setHeader('Content-Type','text/html');response.end('<!doctype html><meta charset="utf-8"><title>Lightweight WebGL QA</title><script type="module" src="/test.js"></script>');return;}
 response.writeHead(404);response.end();
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage(),pageErrors=[];
 page.on('pageerror',error=>pageErrors.push(error.message));
 await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForFunction(()=>window.lightweightResult,{},{timeout:60000});
 const result=await page.evaluate(()=>window.lightweightResult);
 assert.deepEqual(pageErrors,[],'The browser must not encounter runtime errors');
 assert.equal(result.three,'180');
 assert.deepEqual(result.shaderErrors,[],'Lightweight and HD shaders must compile without errors');
 assert.equal(result.linked,true,'Both shader variants must link successfully');
 assert(result.lightweightPrograms>0);
 assert(result.restoredPrograms>result.lightweightPrograms,'HD must use a separate restored shader variant');
 assert.equal(result.hookCalls,2,'Preserve the existing shader callback in both variants');
 for(const key of ['hooksRestored','baseTextureUnchanged','bumpTextureUnchanged','clearcoatMapsUnchanged','propertiesUnchanged'])assert.equal(result[key],true,key);
 console.log(JSON.stringify({passed:true,browser:'Chromium',renderer:'SwiftShader',...result,pageErrors}));
}finally{
 if(browser)await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
