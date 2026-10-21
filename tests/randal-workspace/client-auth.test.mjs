import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const base=path.resolve(process.env.WORKSPACE_ROOT||'..');
test('only the most recent identity response can replace a tab credential',async()=>{
 const priorFetch=globalThis.fetch,priorStorage=globalThis.sessionStorage;
 try{
  for(const [root,key] of [[process.env.STUDIO_PROJECT_ROOT||path.join(base,'studio-work'),'studio-one-session'],[path.join(base,'randal-work/randal-general'),'randal-general-session']]){
   const saved=new Map(),pending=[];
   globalThis.sessionStorage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)};
   globalThis.fetch=(url,options)=>new Promise(resolve=>pending.push({url,options,reply:body=>resolve({ok:true,json:async()=>body})}));
   const client=await import(pathToFileURL(path.join(root,'src/commerce/client.js')).href+'?credential-race');
   const older=client.commercialRequest('exchange',{sessionToken:'older'}),latest=client.commercialRequest('exchange',{sessionToken:'latest'});
   pending[1].reply({client:{codeClient:'LRF-00003'},accessToken:'verified-latest'});
   assert.equal((await latest).accessToken,undefined);
   pending[0].reply({client:{codeClient:'LRF-00002'},accessToken:'verified-older'});await older;
   assert.equal(saved.get(key),'verified-latest');
   const list=client.projectRequest('list');assert.equal(pending[2].options.headers.Authorization,'Bearer verified-latest');pending[2].reply({projects:[]});await list;

   const logout=client.commercialRequest('logout'),login=client.commercialRequest('exchange',{sessionToken:'newer'});
   pending[4].reply({client:{codeClient:'LRF-00004'},accessToken:'verified-newer'});await login;
   pending[3].reply({success:true});await logout;
   assert.equal(saved.get(key),'verified-newer');
   const refreshed=client.commercialRequest('session');assert.equal(pending[5].options.headers.Authorization,'Bearer verified-newer');pending[5].reply({client:{codeClient:'LRF-00004'}});await refreshed;

   const anonymous=client.commercialRequest('session'),final=client.commercialRequest('exchange',{sessionToken:'final'});
   pending[7].reply({accessToken:'verified-final'});await final;
   pending[6].reply({accessToken:'obsolete-refresh'});await anonymous;
   assert.equal(saved.get(key),'verified-final');
   const completed=client.commercialRequest('logout');pending[8].reply({success:true});await completed;
   assert.equal(saved.get(key),undefined);
  }
 }finally{globalThis.fetch=priorFetch;if(priorStorage===undefined)delete globalThis.sessionStorage;else globalThis.sessionStorage=priorStorage;}
});
