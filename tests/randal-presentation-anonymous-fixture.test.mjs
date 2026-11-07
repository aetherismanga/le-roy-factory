import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fixture from './lrf-suite/anonymous-commercial-fixture.cjs';

test('local browser fixture distinguishes a valid anonymous session from protected actions and malformed requests',async t=>{
 let handled=0;
 const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://fixture').pathname;if(fixture.handle(req,res,pathname)){handled++;return;}res.writeHead(401,{'Content-Type':'application/json'});res.end(JSON.stringify({success:false}));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
 const base='http://127.0.0.1:'+server.address().port;
 const request=async(path,body,method='POST')=>{const response=await fetch(base+path,{method,...(method==='POST'?{body,headers:{'Content-Type':'application/json'}}:{})});return {status:response.status,cache:response.headers.get('cache-control'),body:await response.json()};};
 for(const path of ['/api/commercial','/studio/api/commercial','/general/api/commercial']){
  const response=await request(path,JSON.stringify({action:'session',isAdmin:true,codeClient:'LRF-00321',configuratorAccess:{mode:'presentation',allowWorkshop:false}}));
  assert.equal(response.status,200);assert.equal(response.cache,'no-store');assert.deepEqual(response.body,{client:null,isAdmin:false,randalAllowed:false,configuratorAccess:{mode:'standard',allowWorkshop:true},proHT:null,proRows:[],referenceAllowed:false});
 }
 for(const action of ['exchange','identify','admin','login','logout','save','Session'])assert.equal((await request('/api/commercial',JSON.stringify({action}))).status,401,action);
 for(const path of ['/api/projects','/api/admin','/api/commercial/extra','/api/commercials']){const before=handled;assert.equal((await request(path,'{"action":"session"}')).status,401);assert.equal(handled,before,path+' is not claimed by the anonymous helper');}
 for(const raw of ['', '{', 'null', '[]', '"session"', '{"action":null}', '{"action":"session"} trailing',JSON.stringify({action:'session',padding:'x'.repeat(9000)})])assert.equal((await request('/api/commercial',raw)).status,401,'invalid body stays unauthenticated');
 const before=handled;assert.equal((await request('/api/commercial',null,'GET')).status,401);assert.equal(handled,before,'GET is not handled');
});

test('the HTTPS route adapter uses the same strict session response without claiming other endpoints',()=>{
 assert.equal(fixture.responseFor('POST','/api/commercial','{"action":"session"}').status,200);
 assert.equal(fixture.responseFor('POST','/api/commercial','{"action":"exchange"}').status,401);
 assert.equal(fixture.responseFor('POST','/api/commercial','not JSON').status,401);
 assert.equal(fixture.responseFor('POST','/api/projects','{"action":"session"}'),null);
 assert.equal(fixture.responseFor('GET','/api/commercial','{"action":"session"}'),null);
});
