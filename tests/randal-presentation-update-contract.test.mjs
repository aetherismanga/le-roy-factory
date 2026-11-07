import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parse} from 'acorn';
import * as T from 'three';
import {buildPreview} from '../randal-general/src/commerce/preview-model.js';

// Exercise the exact update function used by General's live preview with its
// genuine geometry builder. Only the GPU-facing presentation/texture adapters
// are substituted; no WebGL context is necessary for its persistence contract.
const source=await readFile(new URL('../randal-general/src/commerce/live-preview.js',import.meta.url),'utf8');
const entry=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.find(n=>n.type==='ExportNamedDeclaration'&&n.declaration?.id?.name==='createPreview').declaration;
const declaration=entry.body.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='update');
const updateSource=source.slice(declaration.start,declaration.end);
function fixture(){
 const scene=new T.Scene(),pending=[];let renders=0,prunes=0;
 const make=Function('deps',`const {scene,buildPreview,pending,pruneTextures,invalidate}=deps;let lastProject=null,revision=0,disposed=false,current=null,lastShape='',pendingTextureUpdate;const premium={prepareModel(){}},options={presentation:true};function texture(){return pending.length?pending.shift():Promise.resolve(null);}function disposeCurrent(){if(current)scene.remove(current.group);}function fit(){}async function applyTextures(){}${updateSource};return {update,dispose(){disposed=true;revision++;},current:()=>current};`);
 const api=make({scene,buildPreview,pending,pruneTextures(){prunes++;},invalidate(){renders++;}});
 return {...api,pending,scene,counts:()=>({renders,prunes})};
}
const project=()=>({room:{points:[[0,0],[400,0],[400,300],[0,300]],height:250},items:[{id:'column',type:'column',settings:{finish:'WHITE',hingeSide:'left'},placement:{wall:0,u:150,height:28}}]});

test('General confirms successful and repeated fullscreen choices so the UI can persist them',async()=>{
 const f=fixture(),value=project();assert.equal(await f.update(value),true);assert.ok(f.current().items.some(i=>i.id==='column'));assert.equal(await f.update(structuredClone(value)),true);assert.equal(f.scene.children.length,1);assert.equal(f.counts().prunes,2);
});

test('superseded and closed fullscreen requests never report successful application',async()=>{
 const f=fixture();let resolve;f.pending.push(new Promise(r=>resolve=r));const stale=f.update(project());assert.equal(await f.update(project()),true);resolve(null);assert.equal(await stale,false);assert.equal(f.counts().prunes,1);
 let release;f.pending.push(new Promise(r=>release=r));const closed=f.update(project());f.dispose();release(null);assert.equal(await closed,false);assert.equal(await f.update(project()),false);assert.equal(f.counts().prunes,1);
});
