const test = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync,existsSync} = require('node:fs');
const {join} = require('node:path');
const {createHash} = require('node:crypto');
const vm = require('node:vm');
const source = readFileSync(join(__dirname,'../tariff-access.js'),'utf8');
const ids = ['saxso-distributeurs-2026','saxso-public-ht-2026','saxso-conditions-2026','saxso-emballage-2026'];
const bytes = Buffer.from('%PDF-' + 'synthetic-private-supplier-document'.repeat(1000));
const hash = data => createHash('sha256').update(data).digest('hex');

function harness({agent=false,partners=['SAXSO'],disabled=false,corrupt=false}={}) {
  const saved=[],streamed=[],driveRequests=[],activities=[];
  const record={departement:'34',partenaires:partners,proAccessDisabled:disabled};
  const bucket={file(path){return {
    exists:async()=>[saved.some(item=>item.path===path)],
    save:async(data,options)=>saved.push({path,data,options}),
    createReadStream(){return {on(){return this},pipe(res){streamed.push(path);res.end()}}}
  }}};
  const db={collection(){return {where(){return this},limit(){return this},async get(){return {empty:false,docs:[{id:'synthetic-client',data:()=>record}]}}}}};
  const mocks={
    './pro-client-access.cjs':require('../pro-client-access.cjs'),
    'firebase-functions/v2/https':{onRequest:(_opts,handler)=>handler},
    'firebase-admin':{firestore:()=>db,storage:()=>({bucket:()=>bucket})},
    'google-auth-library':{GoogleAuth:class {async getClient(){return {request:async options=>{driveRequests.push(options);return {data:corrupt?Buffer.from('%PDF-tampered'.repeat(1500)):bytes}}}}}},
    './auth':{getAgentFromRequest:async()=>agent?{uid:'verified-test-agent'}:null},
    './lrf-analytics-core':{writeClientActivity:async(client,activity)=>activities.push(activity)}
  };
  const context={require:name=>mocks[name]||require(name),module:{exports:{}},Buffer,console:{error(){}},fetch(){throw Error('No public source fallback permitted')}};
  vm.runInNewContext(source.replace(/pdfSha256:'[a-f0-9]+'/g,"pdfSha256:'"+hash(bytes)+"'"),context);
  async function request(tariffId=ids[0],extra={}) {
    const res={statusCode:200,headers:{},set(k,v){this.headers[k]=v;return this},status(n){this.statusCode=n;return this},json(value){this.body=value;return this},send(value){this.body=value;return this},end(){return this}};
    await context.module.exports.getTariffPdf({method:'POST',headers:{origin:'https://leroyfactory.fr'},body:{tariffId,codeClient:'LRF-99998',departement:'34',...extra}},res);
    return res;
  }
  return {saved,streamed,driveRequests,activities,record,request};
}

test('all SAXSO originals refuse unauthorized accounts before reading Drive or a cached PDF',async()=>{
  for(const options of [{partners:[]},{partners:['Elios Ceramica']},{disabled:true}]) {
    const h=harness(options);
    for(const id of ids)assert.equal((await h.request(id,{isAdmin:true})).statusCode,403);
    assert.equal(h.driveRequests.length,0);assert.equal(h.saved.length,0);assert.equal(h.streamed.length,0);
  }
  const h=harness();
  assert.equal((await h.request(ids[0],{departement:'13'})).statusCode,403);
  assert.equal((await h.request(ids[0],{codeClient:'LRF-00001'})).statusCode,403);
  assert.equal((await h.request(ids[0],{codeClient:''})).statusCode,403);
  assert.equal(h.driveRequests.length,0);
});

test('verified SAXSO partners and legacy labels can open only the hash-pinned private originals',async()=>{
  for(const partner of ['SAXSO','saxso','SAXCO','Saxo']) {
    const h=harness({partners:[partner]});
    for(const id of ids) {
      const res=await h.request(id);
      assert.equal(res.statusCode,200);
      assert.equal(res.headers['Content-Type'],'application/pdf');
      assert.match(res.headers['Cache-Control'],/private, no-store/);
      assert.match(res.headers['Content-Disposition'],/^inline;/);
    }
    assert.equal(h.driveRequests.length,4);assert.equal(h.saved.length,4);assert.equal(h.streamed.length,4);
    for(const saved of h.saved) {
      assert.match(saved.path,/^private-tariffs\/saxso\//);
      assert.equal(hash(saved.data),hash(bytes));
      assert.match(saved.options.metadata.cacheControl,/private,no-store/);
    }
    for(const request of h.driveRequests)assert.match(request.url,/^https:\/\/www.googleapis.com\/drive\/v3\/files\/[A-Za-z0-9_-]+\?alt=media$/);
  }
});

test('partner permission is checked again even when a valid PDF is already cached',async()=>{
  const h=harness();assert.equal((await h.request()).statusCode,200);
  h.record.partenaires=[];
  assert.equal((await h.request()).statusCode,403);
  assert.equal(h.driveRequests.length,1);assert.equal(h.streamed.length,1);
});

test('altered Drive originals fail closed without writing or streaming private bytes',async()=>{
  const h=harness({agent:true,corrupt:true});
  for(const id of ids)assert.equal((await h.request(id)).statusCode,500);
  assert.equal(h.saved.length,0);assert.equal(h.streamed.length,0);
});

test('simultaneous verified agent reads share one source import and then use the private cache',async()=>{
  const h=harness({agent:true,partners:[]});
  const results=await Promise.all([h.request(),h.request(),h.request()]);
  assert(results.every(res=>res.statusCode===200));
  assert.equal(h.driveRequests.length,1);assert.equal(h.saved.length,1);assert.equal(h.streamed.length,3);
  await h.request();assert.equal(h.driveRequests.length,1);
});

test('the PRO card uses secured virtual links and never includes a public purchase PDF',()=>{
  const root=join(__dirname,'../..');
  const html=readFileSync(join(root,'tarifs-pro.html'),'utf8');
  const bridge=readFileSync(join(root,'assets/js/secure-tariff-links.js'),'utf8');
  const mappings=bridge.match(/const MAP = new Map\(\[([\s\S]*?)\]\);/)[1];
  const map=vm.runInNewContext('new Map(['+mappings+'])');
  for(const id of ids) {
    const path='assets/pdf/'+id+'.pdf';
    assert(html.includes('lien:"'+path+'"'));
    assert.equal(map.get(path),id);
    assert.equal(existsSync(join(root,path)),false);
  }
  assert.doesNotMatch(html,/1JlzPHfHGYD2INpzNwqx0q03E6jW0n6zI|drive\.google\.com/);
});
