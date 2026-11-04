import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parse} from 'acorn';
import * as T from 'three';
import {createHDCapture,captureSize} from '../shared/lrf-3d/hd-capture.js';

const source=readFileSync(new URL('../randal-general/src/commerce/live-preview.js',import.meta.url),'utf8');
const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});
const create=ast.body.find(node=>node.type==='ExportNamedDeclaration'&&node.declaration?.id?.name==='createPreview').declaration;
const snapshot=create.body.body.find(node=>node.type==='FunctionDeclaration'&&node.id.name==='materialSnapshot');
const capture=create.body.body.find(node=>node.type==='VariableDeclaration'&&node.declarations.some(d=>d.id.name==='captureHD')).declarations.find(d=>d.id.name==='captureHD');

function fixture({prepareError=false,renderError=false,lateWorkingTexture=false}={}){
 const events=[],working=new T.Texture(),late=new T.Texture(),maximum=new T.Texture(),material=new T.MeshPhysicalMaterial({map:working,bumpMap:working,color:'#789abc',roughness:.61});
 const target={width:512,height:256,setSize(w,h){this.width=w;this.height=h;events.push(['reflection',w,h]);}};
 const group={traverse(callback){callback({isReflector:true,getRenderTarget:()=>target});callback({material});}};
 const size=new T.Vector2(800,600),shadowSize=new T.Vector2(1024,1024),textures=new Map([['working',Promise.resolve({map:working})]]);
 const context=vm.createContext({T,createHDCapture,captureSize,current:{group},document:{body:{inert:false}},capturing:false,controls:{enabled:true},sun:{shadow:{map:{dispose(){events.push('dispose-shadow');}},mapSize:shadowSize}},textures,
  renderer:{capabilities:{maxTextureSize:4096},shadowMap:{needsUpdate:false},ratio:1.25,getPixelRatio(){return this.ratio;},setPixelRatio(value){this.ratio=value;},getSize(v){return v.copy(size);},setSize(w,h){size.set(w,h);},compileAsync:async()=>{events.push('compile');assert.equal(target.width,1024);assert.equal(shadowSize.x,2048);if(prepareError)throw Error('compile failed');},render(){events.push('render');assert.equal(material.map,maximum);assert.equal(target.width,1024);assert.equal(shadowSize.x,2048);assert.equal(size.x,1920);}},
  camera:{aspect:4/3},scene:{},canvas:{toDataURL(){if(renderError)throw Error('encoder failed');return 'PNG';}},revision:3,
  applyTextures:async(revision,profile)=>{assert.equal(revision,3);assert.equal(profile,'max');material.map=maximum;material.bumpMap=maximum;material.color.set('#ffffff');material.roughness=.25;textures.set('maximum',Promise.resolve({map:maximum}));events.push('maximum-textures');},
  disposeTextures(){events.push('dispose-maximum');},invalidate(){events.push('invalidate');},pendingTextureUpdate:Promise.resolve()
 });
 if(lateWorkingTexture)context.pendingTextureUpdate=Promise.resolve().then(()=>{material.map=late;material.bumpMap=late;textures.set('late-working',Promise.resolve({map:late}));});
 vm.runInContext(source.slice(snapshot.start,snapshot.end),context);
 context.capture=vm.runInContext(source.slice(capture.init.start,capture.init.end),context);
 return {context,events,material,target,size,shadowSize,textures,working:lateWorkingTexture?late:working,dispose(){working.dispose();late.dispose();maximum.dispose();material.dispose();}};
}

for(const failure of [null,'prepare','encoder'])test('actual General preview HD restores optical targets, native working maps and controls after '+(failure||'success'),async()=>{
 const f=fixture({prepareError:failure==='prepare',renderError:failure==='encoder',lateWorkingTexture:true}),{context:c}=f;
 try{
  const first=c.capture(),second=c.capture();assert.equal(first,second,'double clicks share a single native capture transaction');
  if(failure)await assert.rejects(first,failure==='prepare'?/compile failed/:/encoder failed/);else assert.equal(await first,'PNG');
  await Promise.resolve();
  assert.equal(f.material.map,f.working,'pending working texture completion becomes the restore source');assert.equal(f.material.bumpMap,f.working);assert.equal(f.material.roughness,.61);assert.equal(f.material.color.getHexString(),'789abc');
  assert.deepEqual([f.target.width,f.target.height],[512,256]);assert.deepEqual(f.shadowSize.toArray(),[1024,1024]);assert.deepEqual(f.size.toArray(),[800,600]);assert.equal(c.renderer.ratio,1.25);
  assert.equal(c.controls.enabled,true);assert.equal(c.document.body.inert,false);assert.equal(c.capturing,false);assert(f.textures.has('working'));assert(f.textures.has('late-working'));assert.equal(f.textures.has('maximum'),false);assert(f.events.includes('dispose-maximum'));assert.equal(f.events.filter(e=>e==='invalidate').length,1);
 }finally{f.dispose();}
});
