const test = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {createHash} = require('node:crypto');
const vm = require('node:vm');
const source = readFileSync(require('node:path').join(__dirname,'../tariff-access.js'),'utf8');
const bytes = Buffer.from('%PDF-' + 'test-official-pdf'.repeat(1000));
const hash = data => createHash('sha256').update(data).digest('hex');
function harness({agent=true,clientPartners=null,corrupt=false}={}) {
  const files=new Map(),saved=[],downloads=[]; let driveCalls=0;
  const bucket={file(path){
    if (!files.has(path)) files.set(path,{exists:async()=>[saved.some(item=>item.path===path)],save:async(data,options)=>saved.push({path,data,options}),createReadStream(){return {on(){return this},pipe(res){downloads.push(path);res.end()}}}});
    return files.get(path);
  }};
  const db={collection(){return {where(){return this},limit(){return this},async get(){return clientPartners ? {empty:false,docs:[{id:'verified-test-client',data:()=>({departement:'34',partenaires:clientPartners})}]} : {empty:true};}}}};
  const exported={}; const mocks={
    'firebase-functions/v2/https':{onRequest:(_opts,handler)=>handler},
    'firebase-admin':{firestore:()=>db,storage:()=>({bucket:()=>bucket})},
    'google-auth-library':{GoogleAuth:class {async getClient(){return {request:async options=>{driveCalls++;assert.match(options.url,/1O97PcQ5eCCOi8-PW-NwuERzzeIHUPTVh/);return {data:corrupt?Buffer.from('%PDF-modified'.repeat(1500)):bytes}}}}}},
    './auth':{getAgentFromRequest:async()=>agent?{uid:'verified-agent'}:null},
    './lrf-analytics-core':{writeClientActivity:async()=>{}},
  };
  const context={require:name=>mocks[name]||require(name),module:{exports:exported},exports:exported,Buffer,console:{error(){}},fetch(){throw Error('Public fallback is forbidden')}};
  vm.runInNewContext(source.replace(/const BULBO_PDF_SHA256 = '[a-f0-9]+';/,"const BULBO_PDF_SHA256 = '"+hash(bytes)+"';")+'\nmodule.exports.testImport=ensureBulboTariffPdf;',context);
  return {saved,downloads,get driveCalls(){return driveCalls},api:context.module.exports.getTariffPdf,import:context.module.exports.testImport};
}
async function request(h,{codeClient='LRF-99998',departement='34'}={}) {
  const res={statusCode:200,headers:{},set(k,v){this.headers[k]=v;return this},status(n){this.statusCode=n;return this},json(value){this.body=value;return this},send(value){this.body=value;return this},end(){return this}};
  await h.api({method:'POST',headers:{origin:'https://leroyfactory.fr'},body:{tariffId:'bulbo-2026',codeClient,departement}},res);return res;
}
test('unauthorized accounts cannot read the private Drive source or stream a tariff',async()=>{
  for(const clientPartners of [null,['Elios Ceramica']]){
    const h=harness({agent:false,clientPartners});const res=await request(h);
    assert.equal(res.statusCode,403);assert.equal(h.driveCalls,0);assert.equal(h.saved.length,0);assert.equal(h.downloads.length,0);
  }
});
test('verified BULBO access imports current originals into the versioned private object only once',async()=>{
  const h=harness({agent:false,clientPartners:['BULBO']});const res=await request(h);
  assert.equal(res.statusCode,200);assert.equal(h.driveCalls,1);assert.equal(h.saved.length,1);
  assert.equal(h.saved[0].path,'private-tariffs/bulbo/bulbo-surfaces-aquerelle-2026-10-01.pdf');
  assert.equal(hash(h.saved[0].data),hash(bytes));assert.match(h.saved[0].options.metadata.cacheControl,/private,no-store/);
  assert.equal(res.headers['Content-Type'],'application/pdf');assert.match(res.headers['Content-Disposition'],/^inline;/);
  await request(h);assert.equal(h.driveCalls,1);assert.equal(h.downloads.length,2);
});
test('altered PDF source fails closed without writing or streaming bytes',async()=>{
  const h=harness({corrupt:true});const res=await request(h);
  assert.equal(res.statusCode,500);assert.equal(h.driveCalls,1);assert.equal(h.saved.length,0);assert.equal(h.downloads.length,0);
});
test('simultaneous authorized first reads share one private source import',async()=>{
  const h=harness();await Promise.all([h.import(),h.import(),h.import()]);
  assert.equal(h.driveCalls,1);assert.equal(h.saved.length,1);
});
