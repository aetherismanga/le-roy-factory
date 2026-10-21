import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';

const proxies=[{url:new URL('../../randal-general/api/projects.js',import.meta.url),variant:'randal-general',cookie:'randal_general'}];
if(process.env.STUDIO_PROJECT_PROXY)proxies.push({url:pathToFileURL(process.env.STUDIO_PROJECT_PROXY),variant:'studio-one',cookie:'studio_one'});
for(const proxy of proxies)test(proxy.variant+' rejects absent credentials locally and forwards only its own variant',async()=>{
 const {default:handler}=await import(proxy.url);let calls=0,last;
 const original=globalThis.fetch;
 globalThis.fetch=async(url,options)=>{calls++;last={url,options};return{status:401,json:async()=>({success:false,error:'Verified rejection'})};};
 const response=()=>({code:null,body:null,setHeader(){},status(n){this.code=n;return this;},json(v){this.body=v;return this;}});
 try{
  for(const headers of [{host:'test.vercel.app'},{host:'test.vercel.app',authorization:'Bearer '},{host:'test.vercel.app',cookie:proxy.cookie+'_pro=%xx'}]){
   const res=response();await handler({method:'POST',headers,body:{action:'list'}},res);assert.equal(res.code,401);assert.equal(calls,0);
  }
  const res=response();await handler({method:'POST',headers:{host:'test.vercel.app',authorization:'Bearer test-invalid-token'},body:{action:'list',variant:'untrusted'}},res);
  assert.equal(calls,1);assert.equal(res.code,401);assert.equal(last.options.headers.Authorization,'Bearer test-invalid-token');assert.equal(JSON.parse(last.options.body).variant,proxy.variant);
 }finally{globalThis.fetch=original;}
});
