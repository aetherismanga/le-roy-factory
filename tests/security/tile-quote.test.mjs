import test from 'node:test';
import assert from 'node:assert/strict';
import catalogue from '../../shared/lrf-3d/commercial-surfaces.json' with {type:'json'};
import {checkedTileRequests,quoteTiles,createTileQuoteHandler} from '../../shared/lrf-server/tile-quote.mjs';

const product=catalogue.products.find(p=>p.brand==='ELIOS'&&p.packVerified&&p.packArea>0&&Number.isInteger(p.packPieces)&&p.packPieces>0&&p.priceTTC===null);
assert(product,'A canonical exact-SKU reference supports the synthetic pricing fixture');
const row={catalogueKey:product.key,needed:product.packArea*2+.001};
const identity={client:{codeClient:'LRF-12345'},isAdmin:false,randalAllowed:true};
const rates={success:true,expiresAt:Date.now()+60000,allowedPartners:['elios-ceramica'],eliosExact:{[product.reference]:17.23},elios:{},view:[]};
const round=n=>Math.round((n+Number.EPSILON)*100)/100;

test('tile quantities reject unknown references, duplicates and invalid needs before quoting',()=>{
 assert.equal(checkedTileRequests([row])[0].product,product);
 for(const rows of [null,{},[row,row],[{...row,catalogueKey:'missing'}],[{...row,needed:-1}],[{...row,needed:Infinity}],[{...row,needed:'2'}],[{...row,needed:10001}],Array.from({length:201},()=>row)])assert.throws(()=>checkedTileRequests(rows));
 assert.deepEqual(checkedTileRequests([]),[]);
});

test('tile quote uses canonical full boxes, independent sale and energy totals and own verified LRF code',()=>{
 const requests=checkedTileRequests([{...row,packArea:.00001,pcsBox:9000,purchaseHT:.01,publicTTC:.01,privateCode:'LRF-99999-0.01.00'}]);
 const result=quoteTiles(requests,{rates,identity}),area=Number((3*product.packArea).toFixed(4));
 const unit=round(17.23*3),subtotal=round(area*unit),energy=round(area*.84);
 assert.equal(result.rows[0].boxes,3);assert.equal(result.rows[0].orderArea,area);assert.equal(result.rows[0].orderPieces,3*product.packPieces);
 assert.equal(result.rows[0].unitPublicTTC,unit);assert.equal(result.rows[0].publicTTC,subtotal);assert.equal(result.totals.energyTax.amountTTC,energy);assert.equal(result.totals.publicTTC,round(subtotal+energy));
 const purchaseCents=Math.round(area*17.23*100)+Math.round(area*.70*100);
 assert.equal(result.privateCode,'LRF-12345-'+(purchaseCents/100).toFixed(2)+'.00');
 for(const key of ['_proHT','purchaseHT','purchasePaletteHT','proRows','proHT'])assert.equal(JSON.stringify(result).includes('"'+key+'"'),false);
 const unknown=quoteTiles(requests,{rates:{...rates,eliosExact:{}},identity});assert.equal(unknown.privateCode,'');assert.equal(unknown.totals.publicTTC,null);assert.equal(unknown.rows[0].publicTTC,null);
 const other=quoteTiles(requests,{rates,identity:{...identity,client:{codeClient:'LRF-54321'}}});assert(other.privateCode.startsWith('LRF-54321-'));
});

for(const variant of ['studio-one','randal-general'])test(variant+': real tile gateway trusts live identity only, keeps customer access scoped and fails closed on revoked sessions',async()=>{
 let current=identity,authorityStatus=200,networkCalls=0,authorityCalls=0;
 const commercial=async(req,res)=>{authorityCalls++;assert.deepEqual(req.body,{action:'session'},'No attacker role, amount or account field reaches the identity authority');return res.status(authorityStatus).json(current);};
 const request=async(url,options)=>{networkCalls++;assert(String(url).endsWith('/api/agent-tariffs'),'Customers cannot request the admin purchase grid');assert.equal(options.headers.Authorization,undefined);assert.deepEqual(JSON.parse(options.body),{action:'bootstrap',sessionToken:'synthetic-customer-session-abcdefghijklmnopqrstuvwxyz'});return {ok:true,json:async()=>rates};};
 const handler=createTileQuoteHandler({commercial,variant,request});
 const send=async(body,patch={})=>{let output;const headers={host:'fixture.vercel.app',authorization:'Bearer synthetic-customer-session-abcdefghijklmnopqrstuvwxyz',cookie:(variant==='studio-one'?'studio_one':'randal_general')+'_admin=old.fake.jwt',...patch.headers};await handler({method:patch.method||'POST',headers,body}, {setHeader(){},status(code){this.code=code;return this;},json(value){output={status:this.code,body:value};return value;}});return output;};
 let response=await send({rows:[{...row,publicTTC:.01,purchaseHT:.01}],client:{codeClient:'LRF-99999'},isAdmin:true,allowedPartners:['elios-ceramica']});assert.equal(response.status,200);assert(response.body.privateCode.startsWith('LRF-12345-'));assert.equal(networkCalls,1);
 current={client:{codeClient:'LRF-54321'},isAdmin:false};response=await send({rows:[row]});assert.equal(response.status,200);assert(response.body.privateCode.startsWith('LRF-54321-'));
 current={client:null};response=await send({rows:[row]});assert.equal(response.status,401);assert.equal(networkCalls,2);
 current={error:'Revoked',client:null};authorityStatus=401;response=await send({rows:[row]});assert.equal(response.status,401);assert.equal(networkCalls,2);
 const before=authorityCalls;response=await send({rows:[row]},{method:'GET'});assert.equal(response.status,405);response=await send({rows:[row]},{headers:{origin:'https://other.example'}});assert.equal(response.status,403);assert.equal(authorityCalls,before);
 response=await send({rows:[{...row,catalogueKey:'missing'}]});assert.equal(response.status,400);assert.equal(authorityCalls,before);
});

for(const variant of ['studio-one','randal-general'])test(variant+': native inherited request headers survive the real commercial gateway',async()=>{
 const {default:commercial}=await import('../../'+variant+'/api/commercial.js');
 const handler=createTileQuoteHandler({commercial,variant,request:async()=>{throw Error('Anonymous requests must not reach tariff services.');}});
 const prototype=Object.create(null);
 Object.defineProperties(prototype,{headers:{get(){return {host:'fixture.vercel.app'};}},method:{get(){return 'POST';}}});
 const req=Object.assign(Object.create(prototype),{body:{rows:[]}});
 assert.equal(Object.hasOwn(req,'headers'),false);assert.equal(Object.hasOwn(req,'method'),false);
 let result;await handler(req,{setHeader(){},status(code){this.code=code;return this;},json(body){result={status:this.code,body};return body;}});
 assert.equal(result.status,401);assert.equal(result.body.success,false);
 assert.equal(result.body.error,'Connectez votre compte LRF pour chiffrer le carrelage.');
});
