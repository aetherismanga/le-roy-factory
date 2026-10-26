import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {Readable} from 'node:stream';
import vm from 'node:vm';
import {verifyClientToken,createAgentTariffsHandler} from '../../shared/lrf-server/agent-tariffs.mjs';

// Real session functions, synthetic accounts and tariff data only.
const require=createRequire(import.meta.url);
const sessionAuthority='https://us-central1-le-roy-factory.cloudfunctions.net/validateProSession';
export const fixture={version:1,elios:{'azuli-mood|5x15|standard':{amount:12.34,label:'Synthetic 5x15'},'azuli-mood|10x10|standard':{amount:56.78,label:'Synthetic 10x10'}},view:[{productId:'view-test',variantKey:'60x60',proDetail:23.45}],documents:{'randal-studio-one-basins':Buffer.from('%PDF-1.4\nSynthetic agent document').toString('base64')}};
const hash=token=>createHash('sha256').update(token).digest('hex');
const copy=value=>structuredClone(value);

function response(){return {statusCode:200,headers:{},set(key,value){this.headers[key]=value;return this;},setHeader(key,value){this.headers[key]=value;},status(value){this.statusCode=value;return this;},json(value){this.body=copy(value);return this;},send(value){this.body=value;return this;},end(){this.ended=true;return this;}};}
export function localServices(partners=['ELIOS CERAMICA','VIEW CERAMICA'],tariffData=fixture){
  const records=new Map([['clients',new Map([['local-client',{codeClient:'LRF-99998',departement:'34',societe:'Local test customer',partenaires:partners}]])],['pro_sessions',new Map()]]);
  const collection=name=>{
    if(!records.has(name))records.set(name,new Map());
    const values=records.get(name);
    const snapshot=(id,value)=>({id,exists:value!==undefined,data:()=>value});
    return {
      doc:id=>({id,get:async()=>snapshot(id,values.get(id)),set:async(value,options)=>{values.set(id,options?.merge?{...values.get(id),...value}:value);},delete:async()=>{values.delete(id);}}),
      where:(field,operator,expected)=>{assert.equal(operator,'==');return {limit:n=>({get:async()=>{const docs=[...values].filter(([,value])=>value[field]===expected).slice(0,n).map(([id,value])=>snapshot(id,value));return {empty:!docs.length,docs};}})};}
    };
  };
  const firestore=()=>({collection});
  firestore.FieldValue={serverTimestamp:()=>({localTimestamp:true})};
  firestore.Timestamp={fromMillis:value=>({toMillis:()=>value})};
  const streamed=[];
  const storage={bucket:()=>({file:path=>({exists:async()=>[true],createReadStream:()=>{streamed.push(path);const stream=Readable.from(Buffer.from('%PDF-1.4\nSynthetic protected tariff'));stream.pipe=res=>{res.body=Buffer.from('%PDF-1.4\nSynthetic protected tariff');return res;};return stream;}})})};
  function load(path){
    const module={exports:{}};
    const stubRequire=name=>name==='firebase-functions/v2/https'?{onRequest:(options,handler)=>handler}:name==='firebase-admin'?{firestore,storage:()=>storage}:name==='./lrf-analytics-core'?{writeClientActivity:async()=>{}}:name==='./auth'?{getAgentFromRequest:async()=>null}:name==='google-auth-library'?{GoogleAuth:class{}}:require(name);
    vm.runInNewContext(readFileSync(new URL('../../functions/'+path,import.meta.url),'utf8'),{require:stubRequire,module,exports:module.exports,Buffer,Date,Set,console},{filename:path});
    return module.exports;
  }
  const sessions=load('pro-session.js'),tariffs=load('tariff-access.js');
  const call=async(handler,body)=>{const res=response();await handler({method:'POST',headers:{origin:'https://leroyfactory.fr'},body},res);return res;};
  const request=async(url,options)=>{
    assert.equal(url,sessionAuthority,'The verifier must call the fixed session authority');
    assert.equal(options.method,'POST');assert.equal(options.headers['Content-Type'],'application/json');
    const body=JSON.parse(options.body);assert.deepEqual(Object.keys(body),['sessionToken']);
    const res=await call(sessions.validateProSession,body);
    return {ok:res.statusCode>=200&&res.statusCode<300,status:res.statusCode,json:async()=>res.body};
  };
  let reads=0;
  const handler=createAgentTariffsHandler({verify:async()=>null,verifyClient:token=>verifyClientToken(token,{request}),read:async()=>{reads++;return tariffData;}});
  return {records,streamed,sessions,tariffs,call,request,get reads(){return reads;},setPartners(value){records.get('clients').get('local-client').partenaires=value;},async login(body={codeClient:'LRF-99998',departement:'34'}){return call(sessions.createProSession,body);},async bootstrap(token,extra={}){const res=response();await handler({method:'POST',headers:{host:'randal-catalogue-general-3d.vercel.app',origin:'https://leroyfactory.fr'},body:{action:'bootstrap',sessionToken:token,...extra}},res);return res;},async document(token){const res=response();await handler({method:'POST',headers:{origin:'https://leroyfactory.fr'},body:{action:'document',id:'randal-studio-one-basins',sessionToken:token}},res);return res;}};
}

