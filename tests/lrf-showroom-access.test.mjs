import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {createShowroomAccess,showroomAccessEndpoint,verifyShowroomAccess} from '../shared/lrf-3d/showroom-access.js';

const STORAGE_KEY='lrf-showroom-access-v1';
const session=()=>({token:randomBytes(24).toString('base64url'),expiresAt:Date.now()+60*60*1000});
const response=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>data});
const settle=()=>new Promise(resolve=>setImmediate(resolve));

class Element{
 constructor(tag,doc){this.tagName=tag.toUpperCase();this.ownerDocument=doc;this.children=[];this.attrs={};this.listeners=new Map();this.value='';this.disabled=false;this.textContent='';}
 append(...nodes){for(const node of nodes){node.parentNode=this;this.children.push(node);}}
 setAttribute(name,value){this.attrs[name]=String(value);}
 removeAttribute(name){delete this.attrs[name];}
 addEventListener(type,fn){const values=this.listeners.get(type)||[];values.push(fn);this.listeners.set(type,values);}
 emit(type){const event={type,target:this,preventDefault(){}};for(const fn of this.listeners.get(type)||[])fn(event);}
 showModal(){this.open=true;}
 close(){this.open=false;}
 remove(){if(this.parentNode){this.parentNode.children=this.parentNode.children.filter(node=>node!==this);this.parentNode=null;}}
 focus(){this.ownerDocument.activeElement=this;}
}
function find(node,predicate){if(predicate(node))return node;for(const child of node.children){const found=find(child,predicate);if(found)return found;}return null;}
function fixture(t,{saved,fetchImpl}={}){
 const previousDocument=globalThis.document,doc={activeElement:null,createElement:tag=>new Element(tag,doc)};globalThis.document=doc;t.after(()=>{if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;});
 const stage=new Element('main',doc),previous=new Element('button',doc),values=new Map(),overlays=[],requests=[];let invalidations=0;previous.focus();if(saved)values.set(STORAGE_KEY,JSON.stringify(saved));
 const storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
 const access=createShowroomAccess({stage,storage,onOverlay:value=>overlays.push(value),onInvalidate:()=>invalidations++,fetchImpl:async(url,options)=>{requests.push({url,options,body:JSON.parse(options.body)});return fetchImpl?fetchImpl(url,options):response({allowed:true,...session()});}});
 return {access,stage,previous,values,overlays,requests,doc,get invalidations(){return invalidations;},get input(){return find(stage,node=>node.tagName==='INPUT');},get form(){return find(stage,node=>node.tagName==='FORM');},get dialog(){return find(stage,node=>node.tagName==='DIALOG');},get status(){return find(stage,node=>node.attrs.role==='status');}};
}

test('access endpoint follows the two ateliers and sends other origins to the General gateway',()=>{
 for(const origin of ['https://studio-one-beta-test-v2.vercel.app','https://studio-one-beta-test-v2-hugol-trading.vercel.app','https://randal-catalogue-general-3d.vercel.app','https://randal-catalogue-general-3d-reviewed-hugol-trading.vercel.app','http://localhost:5173','http://127.0.0.1:3000'])assert.equal(showroomAccessEndpoint(origin),'/api/showroom-access');
 for(const origin of ['https://leroyfactory.fr','https://us-central1-le-roy-factory.cloudfunctions.net','https://unrelated.example','https://studio-one-beta-test-v2.vercel.app.evil.example',''])assert.equal(showroomAccessEndpoint(origin),'https://randal-catalogue-general-3d.vercel.app/api/showroom-access');
});

test('verification sends JSON without cookies and accepts only a current server-issued session',async()=>{
 const credentials={token:randomBytes(18).toString('base64url')},expected=session(),controller=new AbortController();let request;
 const actual=await verifyShowroomAccess(credentials,{endpoint:'/api/showroom-access',signal:controller.signal,fetchImpl:async(url,options)=>{request={url,options};return response({allowed:true,...expected});}});
 assert.deepEqual(actual,expected);assert.equal(request.url,'/api/showroom-access');assert.equal(request.options.method,'POST');assert.equal(request.options.credentials,'omit');assert.equal(request.options.cache,'no-store');assert.equal(request.options.headers['Content-Type'],'application/json');assert.deepEqual(JSON.parse(request.options.body),credentials);assert.equal(request.options.signal,controller.signal);
 for(const body of [null,{}, {allowed:false}, {allowed:true,token:'',expiresAt:Date.now()+10000}, {allowed:true,token:'x'.repeat(2049),expiresAt:Date.now()+10000}, {allowed:true,token:expected.token,expiresAt:Date.now()-1}, {allowed:true,token:expected.token,expiresAt:Infinity}])await assert.rejects(()=>verifyShowroomAccess(credentials,{fetchImpl:async()=>response(body)}));
 await assert.rejects(()=>verifyShowroomAccess(credentials,{fetchImpl:async()=>response({allowed:false,error:'Code refusé.'},401)}),/Code refusé/);
 await assert.rejects(()=>verifyShowroomAccess(credentials,{fetchImpl:async()=>({ok:true,json:async()=>{throw Error('invalid JSON');}})}),/service d’accès est indisponible/);
});

test('password entry waits for the server, stores only the session, and shares an existing request',async t=>{
 let complete;const expected=session(),f=fixture(t,{fetchImpl:()=>new Promise(resolve=>{complete=resolve;})}),promise=f.access.request();assert.equal(f.access.request(),promise);assert.equal(f.access.pending,true);assert.deepEqual(f.overlays,[true]);
 const password=randomBytes(12).toString('hex');f.input.value=password;f.form.emit('submit');assert.equal(f.input.value,'');assert.equal(f.input.disabled,true);assert.equal(f.requests.length,1);assert.deepEqual(f.requests[0].body,{password});assert.equal(f.values.size,0,'no credentials are written while verification is pending');
 complete(response({allowed:true,...expected}));assert.equal(await promise,true);assert.equal(f.access.pending,false);assert.equal(f.stage.children.length,0);assert.deepEqual(JSON.parse(f.values.get(STORAGE_KEY)),expected);assert.ok(![...f.values.values()].join('').includes(password));assert.deepEqual(f.overlays,[true,false]);assert.equal(f.doc.activeElement,f.previous);
});

test('a remembered token is verified again and a denied token falls back to password entry',async t=>{
 const remembered=session(),fresh=session(),f=fixture(t,{saved:remembered,fetchImpl:async()=>f.requests.length===1?response({allowed:false,error:'Session expirée.'},401):response({allowed:true,...fresh})}),promise=f.access.request();
 await settle();assert.equal(f.access.pending,true);assert.equal(f.requests.length,1);assert.deepEqual(f.requests[0].body,{token:remembered.token});assert.equal(f.values.has(STORAGE_KEY),false);assert.equal(f.input.disabled,false);assert.equal(f.doc.activeElement,f.input);assert.match(f.status.textContent,/expiré/);
 f.input.value=randomBytes(12).toString('hex');f.form.emit('submit');assert.equal(await promise,true);assert.deepEqual(JSON.parse(f.values.get(STORAGE_KEY)),fresh);
});

test('successful cached verification never asks for the password or extends the server expiry',async t=>{
 const remembered=session(),f=fixture(t,{saved:remembered,fetchImpl:async()=>response({allowed:true,...remembered})});
 assert.equal(await f.access.request(),true);assert.deepEqual(f.requests.map(request=>request.body),[{token:remembered.token}]);assert.deepEqual(JSON.parse(f.values.get(STORAGE_KEY)),remembered);assert.equal(f.stage.children.length,0);
});

test('expired browser data grants no access and makes no automatic password request',async t=>{
 const f=fixture(t,{saved:{...session(),expiresAt:Date.now()-1}}),promise=f.access.request();assert.equal(f.requests.length,0);assert.equal(f.values.has(STORAGE_KEY),false);assert.equal(f.doc.activeElement,f.input);assert.equal(f.access.pending,true);f.dialog.emit('cancel');assert.equal(await promise,false);assert.equal(f.access.pending,false);assert.deepEqual(f.overlays,[true,false]);
});

test('closing during verification aborts the request and ignores a late successful response',async t=>{
 let complete;const f=fixture(t,{fetchImpl:()=>new Promise(resolve=>{complete=resolve;})}),promise=f.access.request();f.input.value=randomBytes(12).toString('hex');f.form.emit('submit');const signal=f.requests[0].options.signal;
 f.access.close();assert.equal(await promise,false);assert.equal(signal.aborted,true);assert.equal(f.access.pending,false);assert.equal(f.stage.children.length,0);assert.equal(f.doc.activeElement,f.previous);const invalidations=f.invalidations;
 complete(response({allowed:true,...session()}));await settle();assert.equal(f.values.size,0);assert.equal(f.access.pending,false);assert.equal(f.invalidations,invalidations);assert.deepEqual(f.overlays,[true,false]);f.access.close();assert.deepEqual(f.overlays,[true,false]);
});

test('wrong passwords keep the dialog usable and a later door request starts cleanly',async t=>{
 const f=fixture(t,{fetchImpl:async()=>response({allowed:false,error:'Code d’accès incorrect.'},401)}),promise=f.access.request();f.input.value=randomBytes(12).toString('hex');f.form.emit('submit');await settle();assert.equal(f.access.pending,true);assert.equal(f.input.disabled,false);assert.equal(f.input.value,'');assert.match(f.status.textContent,/incorrect/);assert.equal(f.values.size,0);
 const cancel=find(f.dialog,node=>node.tagName==='BUTTON'&&node.type==='button');cancel.emit('click');assert.equal(await promise,false);const second=f.access.request();assert.notEqual(second,promise);assert.equal(f.input.value,'');assert.equal(f.doc.activeElement,f.input);f.access.close();assert.equal(await second,false);assert.deepEqual(f.overlays,[true,false,true,false]);
});
