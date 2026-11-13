import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync,mkdirSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import vm from 'node:vm';
import {build} from 'esbuild';
import {parse} from 'acorn';
import * as T from 'three';
import {transformCommonStudioSource} from '../functions/neobath-anima/studio-adapter/studio-source-transform.mjs';
import {transformOriginalModel} from '../functions/neobath-anima/studio-adapter/model-transform.mjs';
import {validateProject} from '../functions/neobath-anima/studio-adapter/projects.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),studio=join(root,'studio-one/src'),adapter=join(root,'functions/neobath-anima/studio-adapter');
mkdirSync(join(root,'node_modules/.cache'),{recursive:true});const directory=mkdtempSync(join(root,'node_modules/.cache/anima-startup-'));
const aliases=new Map(['model','configuration','finishes','tops','basins','column','mirrors'].map(name=>[join(studio,name+'.js'),join(adapter,name+'.js')]));
// Execute the same factories and source adapters as the production bundle. This
// check allocates real meshes, room bounds and a real reflection render target,
// but never creates a WebGLRenderer or claims to validate GPU drawing.
await build({stdin:{contents:[
 `export {makeModel} from ${JSON.stringify(join(adapter,'model.js'))};`,
 `export {Composition} from ${JSON.stringify(join(studio,'composition.js'))};`,
 `export {makeRoom,DEFAULT_ROOM} from ${JSON.stringify(join(studio,'room.js'))};`,
 `export {makeMirrorReflector,captureMirrorScene} from ${JSON.stringify(join(studio,'mirror-reflection.js'))};`,
 `export {AdaptiveQuality,ReflectionSchedule,profileSizes} from ${JSON.stringify(join(studio,'performance.js'))};`,
 `export {MIRRORS} from ${JSON.stringify(join(adapter,'mirrors.js'))};`
 ].join('\n'),resolveDir:root,loader:'js'},outfile:join(directory,'factory.mjs'),bundle:true,format:'esm',platform:'node',packages:'external',plugins:[{name:'production-startup-contract',setup(b){
 b.onResolve({filter:/^@studio-one-original\//},a=>({path:join(studio,a.path.slice('@studio-one-original/'.length))}));
 b.onResolve({filter:/^@anima-adapter\//},a=>({path:join(adapter,a.path.slice('@anima-adapter/'.length))}));
 b.onResolve({filter:/^\./},a=>{const target=aliases.get(resolve(a.resolveDir,a.path));return target?{path:target}:undefined;});
 b.onLoad({filter:/studio-one[\\/]src[\\/].*\.js$/},a=>{const relative=a.path.slice(studio.length+1);let source=readFileSync(a.path,'utf8');if(relative==='model.js')source=transformOriginalModel(source);return {contents:transformCommonStudioSource(source,relative),loader:'js',resolveDir:dirname(a.path)};});
 }}]});
const M=await import(pathToFileURL(join(directory,'factory.mjs')).href);after(()=>rmSync(directory,{recursive:true,force:true}));
const source=transformCommonStudioSource(readFileSync(join(studio,'app.js'),'utf8'),'app.js'),ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),functions=new Map(ast.body.filter(node=>node.type==='FunctionDeclaration').map(node=>[node.id.name,node]));
const expression=name=>{const declaration=ast.body.flatMap(node=>node.type==='VariableDeclaration'?node.declarations:[]).find(node=>node.id.name===name);assert.ok(declaration,name);return '('+source.slice(declaration.init.start,declaration.init.end)+')';};
function find(node,predicate){if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const child of Object.values(node)){if(Array.isArray(child)){for(const member of child){const value=find(member,predicate);if(value)return value;}}else{const value=find(child,predicate);if(value)return value;}}return null;}
const initialFactory=find(functions.get('start'),node=>node.type==='CallExpression'&&node.callee.type==='Identifier'&&node.callee.name==='makeModel');assert.ok(initialFactory);
function context(){const state=vm.runInNewContext(expression('state')),scene=new T.Scene(),roomScene=M.makeRoom(M.DEFAULT_ROOM,0);scene.add(roomScene.root);const value={...M,T,state,scene,roomScene,composition:null,captureBusy:false,quality:new M.AdaptiveQuality(),isMobile:false,renderer:{capabilities:{maxSamples:0}},CABINET_KEYS:vm.runInNewContext(expression('CABINET_KEYS')),counterDecor:[],cabinetContact:null,selectItem(id){value.composition.selectedId=id;}};vm.createContext(value);for(const name of ['attachLiveMirror','initializeComposition']){const node=functions.get(name);vm.runInContext(source.slice(node.start,node.end),value);}return value;}
function release(context){for(const item of context.composition?.items||[])item.asset.reflector?.dispose();context.mirror?.dispose();context.roomScene.dispose();const geometries=new Set(),materials=new Set();context.scene.traverse(node=>{if(node.isMesh){geometries.add(node.geometry);for(const material of Array.isArray(node.material)?node.material:[node.material])materials.add(material);}});for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();}
test('the initial factory keeps its real source mirror through reflection setup and strict composition initialization',()=>{
 const c=context();try{
  vm.runInContext('model='+source.slice(initialFactory.start,initialFactory.end)+';scene.add(model.root);',c);
  const initial=c.model,frame=initial.mirror;assert.ok(frame?.isObject3D,'boot factory must provide the mirror consumed immediately afterwards');
  assert.equal(initial.spec.cabinetRef,'APUR-BA8052');assert.equal(initial.getTop(),'bare');
  assert.doesNotThrow(()=>vm.runInContext('mirror=attachLiveMirror(model.mirror);initializeComposition();',c));
  assert.equal(c.composition.items.length,2);const cabinet=c.composition.items.find(item=>item.type==='cabinet'),mirror=c.composition.items.find(item=>item.type==='mirror');
  assert.equal(cabinet.asset,initial);assert.equal(cabinet.asset.mirror,null);assert.equal(mirror.asset.root,frame);assert.equal(mirror.asset.reflector,c.mirror);assert.equal(frame.parent,mirror.root);assert.equal(c.mirror.parent,frame);assert.equal(cabinet.root.parent,c.scene);assert.equal(mirror.root.parent,c.scene);assert.equal(c.composition.selected,cabinet);
  const project={version:2,manufacturer:'neobath-anima',room:M.DEFAULT_ROOM,items:c.composition.snapshot()};assert.doesNotThrow(()=>validateProject(project));assert.equal(mirror.settings.mirrorModel,M.MIRRORS[0].id);
 }finally{release(c);}
});
test('the old boot without a mirror reproduces the actual startup TypeError while additional cabinets stay mirror-free',()=>{
 const c=context(),asset=M.makeModel({format:'pura-base-two',basinTop:'bare',includeMirror:false});c.scene.add(asset.root);try{assert.equal(asset.mirror,null);assert.throws(()=>c.attachLiveMirror(asset.mirror),/Cannot read properties of null.*add/);
  const additions=find(ast,node=>node.type==='FunctionDeclaration'&&node.id.name==='makeSceneAsset');assert.match(source.slice(additions.start,additions.end),/includeMirror:false/);
 }finally{release(c);}
});
