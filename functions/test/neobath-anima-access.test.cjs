const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {resolve} = require('node:path');
const {pathToFileURL} = require('node:url');
const {createNeobathAnimaHandler, createStudioApplicationLoader} = require('../neobath-anima-access-core.cjs');
const {createHash} = require('node:crypto');
const {mkdtempSync, writeFileSync, rmSync} = require('node:fs');
const {tmpdir} = require('node:os');
const {gzipSync, gunzipSync} = require('node:zlib');
const {readStudioAsset} = require('../neobath-anima-access-core.cjs');

test('compressed private build artifacts decode identically without requiring public scripts', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'anima-private-test-'));
  try {
    const source = 'export const title = "Neobath Anima · atelier privé";';
    writeFileSync(resolve(directory, 'app.js.gz'), gzipSync(source));
    assert.equal(readStudioAsset(directory, 'app.js'), source);
    assert.throws(() => readStudioAsset(directory, 'absent.css'), {code: 'ENOENT'});
    writeFileSync(resolve(directory, 'app.js'), source + '\n');
    assert.equal(readStudioAsset(directory, 'app.js'), source + '\n');
  } finally {rmSync(directory, {recursive: true, force: true});}
});

test('the actual deployment package contains a coherent paired Studio One release using only committed gzip bundles', () => {
  const directory=resolve(__dirname,'../neobath-anima/studio-dist');
  const load=createStudioApplicationLoader({readAsset:name=>name.endsWith('.js')
    ?gunzipSync(readFileSync(resolve(directory,name+'.gz'))).toString('utf8')
    :readFileSync(resolve(directory,name),'utf8')});
  for(const view of ['home','atelier']){
    const application=load(view);
    assert.equal(application.release.source,'studio-one');
    assert.match(application.release.id,/neobath-anima-studio-one/);
    assert.ok(application.module.length>500000);
    assert.ok(application.catalogue.products.length>=257);
  }
});

function fixtureAssets() {
  const assets = {'accueil.html':'<main id="studio-home">Accueil</main>', 'accueil.css':'body{color:green}', 'accueil.js':'const home=true;', 'atelier.html':'<main id="studio-workshop">Atelier</main>', 'atelier.css':'body{color:blue}', 'app.js':'const workshop=true;', 'catalogue.json':'{"collection":"Anima"}', 'visuals.json':'{"products":{"basin":{"image":"/source.webp"}}}'};
  const checksums=Object.fromEntries(Object.entries(assets).map(([file,text])=>[file,createHash('sha256').update(text).digest('hex')]));
  return {...assets,'release.json':JSON.stringify({id:'anima-studio-unit-test',assets:checksums})};
}
test('the private release loads the paired Studio One home and workshop only after all eight hashes match', () => {
  const assets=fixtureAssets();let reads=0;
  const load=createStudioApplicationLoader({readAsset:name=>{reads++;return assets[name];}});
  const home=load('home'),workshop=load('atelier');
  assert.match(home.html,/studio-home/);assert.match(workshop.html,/studio-workshop/);
  assert.equal(home.module,'const home=true;');assert.equal(workshop.module,'const workshop=true;');
  assert.equal(home.release.source,'studio-one');assert.equal(home.visuals.products.basin.image,'/source.webp');
  assert.equal(reads,9);load('home');assert.equal(reads,9);
  const broken={...assets,'accueil.css':'tampered'};
  assert.throws(()=>createStudioApplicationLoader({readAsset:name=>broken[name]})('home'),/integrity mismatch/);
});
test('a separate executable script cannot be smuggled into the protected body markup', () => {
  const assets=fixtureAssets();assets['atelier.html']='<script src="https://example.invalid/app.js"></script>';
  const release=JSON.parse(assets['release.json']);release.assets['atelier.html']=createHash('sha256').update(assets['atelier.html']).digest('hex');assets['release.json']=JSON.stringify(release);
  assert.throws(()=>createStudioApplicationLoader({readAsset:name=>assets[name]})('atelier'),/must not load another application/);
});

function response() {
  return {code:200,headers:{},set(k,v){this.headers[k]=v;return this;},status(v){this.code=v;return this;},json(v){this.body=v;return this;},send(v){this.body=v;return this;}};
}
async function request({agent=null,method='POST',origin='https://leroyfactory.fr',body={},failure=false}={}) {
  let reads=0,verifications=0; const views=[];
  const handler=createNeobathAnimaHandler({getAgent:async()=>{verifications++;return agent;},loadApplication:view=>{reads++;views.push(view);if(failure)throw Error('private diagnostic');return {html:'<main>Private Anima editor</main>',css:'.private{}',module:'const privateEditor=true;',catalogue:{products:['private catalogue']}};}});
  const res=response();await handler({method,headers:{origin},body},res);
  return {...res,reads,verifications,views};
}
test('anonymous and forged PRO/admin/identity fields cannot obtain any protected application content',async()=>{
  for(const body of [{},{isAdmin:true,email:'jerome@leroyfactory.fr',codeClient:'LRF-00317'},{role:'admin',sessionToken:'forged',identity:{uid:'forged',email:'coryne@leroyfactory.fr'}}]){
    const result=await request({body});assert.equal(result.code,401);assert.equal(result.reads,0);assert.equal(result.verifications,1);assert.equal(result.body.success,false);
    for(const field of ['html','css','module','catalogue','visuals','identity'])assert.equal(result.body[field],undefined);
  }
});
test('a valid customer or different identity cannot open the private application',async()=>{
  for(const email of ['client@example.com','corinne@leroyfactory.fr','jerome@leroyfactory.fr.evil.invalid']){
    const result=await request({agent:{email,uid:'verified-client'}});assert.equal(result.code,403);assert.equal(result.reads,0);assert.equal(result.body.module,undefined);
  }
});
test('Jerome and Coryne each get the application and their server-verified identity without caching',async()=>{
  for(const email of ['jerome@leroyfactory.fr','coryne@leroyfactory.fr']){
    const result=await request({agent:{email,uid:'verified-agent'},body:{identity:{email:'forged',uid:'forged'}}});
    assert.equal(result.code,200);assert.equal(result.reads,1);assert.equal(result.body.success,true);assert.match(result.body.html,/Private Anima editor/);assert.match(result.body.module,/privateEditor/);assert.deepEqual(result.body.identity,{email,uid:'verified-agent'});
    assert.match(result.headers['Cache-Control'],/private, no-store/);assert.equal(result.headers['Access-Control-Allow-Origin'],'https://leroyfactory.fr');assert.match(result.headers.Vary,/Authorization/);
  }
});
test('authorization-only checks do not load or return any private assets',async()=>{
  const result=await request({agent:{email:'coryne@leroyfactory.fr',uid:'verified-agent'},body:{action:'authorize'}});
  assert.equal(result.code,200);assert.equal(result.reads,0);assert.deepEqual(result.body,{success:true});
});
test('disallowed origins, GET and preflight never load private assets or verify credentials',async()=>{
  for(const [input,status] of [[{origin:'https://attacker.invalid'},403],[{method:'GET'},405],[{method:'OPTIONS'},204]]){
    const result=await request(input);assert.equal(result.code,status);assert.equal(result.reads,0);assert.equal(result.verifications,0);
  }
});
test('unknown actions and load failures fail closed without exposing private diagnostics',async()=>{
  const agent={email:'jerome@leroyfactory.fr',uid:'verified-agent'};
  const invalid=await request({agent,body:{action:'download-secret'}});assert.equal(invalid.code,400);assert.equal(invalid.reads,0);
  const failed=await request({agent,failure:true});assert.equal(failed.code,503);assert.equal(failed.body.module,undefined);assert.doesNotMatch(JSON.stringify(failed.body),/private diagnostic/);
});
test('the real authentication helper checks Firebase revocation and never accepts PRO browser flags',()=>{
  const source=readFileSync(resolve(__dirname,'../auth.js'),'utf8');
  assert.match(source,/verifyIdToken\(match\[1\], true\)/);assert.doesNotMatch(source,/localStorage|sessionToken|isAdmin/);
});

const sessionModule=import(pathToFileURL(resolve(__dirname,'../../assets/js/neobath-anima-session.mjs')));
const documentModule=import(pathToFileURL(resolve(__dirname,'../../assets/js/neobath-anima-document.mjs')));
const agent=(email='jerome@leroyfactory.fr')=>({uid:email,email});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject};};
test('sign-out during an authorization request prevents late application insertion',async()=>{
  const {createAnimaSession}=await sessionModule;const pending=deferred();const mounts=[];let closes=0;
  const refresh=createAnimaSession({request:()=>pending.promise,mount:data=>mounts.push(data),unmount:()=>closes++,status:()=>{}});
  const opening=refresh(agent());await refresh(null);pending.resolve({success:true});await opening;
  assert.deepEqual(mounts,[]);assert.ok(closes>0);
});
test('account switches close the former application immediately and ignore stale responses',async()=>{
  const {createAnimaSession}=await sessionModule;const requests=[];const mounts=[];let closes=0;
  const refresh=createAnimaSession({request:user=>{const p=deferred();requests.push({user,...p});return p.promise;},mount:data=>mounts.push(data),unmount:()=>closes++,status:()=>{}});
  let opening=refresh(agent());requests[0].resolve({success:true,name:'Jerome'});await opening;
  opening=refresh(agent('coryne@leroyfactory.fr'));assert.equal(closes,1);
  await refresh(null);requests[1].resolve({success:true,name:'Coryne'});await opening;
  assert.deepEqual(mounts,[{success:true,name:'Jerome'}]);assert.equal(closes,2);
});
test('token reauthorization preserves the same live project, while failed verification closes it',async()=>{
  const {createAnimaSession}=await sessionModule;let permitted=true,mounts=0,closes=0;
  const refresh=createAnimaSession({request:async()=>{if(!permitted)throw Error('Session révoquée');return {success:true};},mount:()=>mounts++,unmount:()=>closes++,status:()=>{}});
  await refresh(agent());await refresh(agent());assert.equal(mounts,1);assert.equal(closes,0);
  permitted=false;await refresh(agent());assert.equal(closes,1);
});
test('no request is sent for a customer or a forged browser role without verified agent identity',async()=>{
  const {createAnimaSession}=await sessionModule;let calls=0,mounts=0;
  const refresh=createAnimaSession({request:async()=>{calls++;return {success:true};},mount:()=>mounts++,unmount:()=>{},status:()=>{}});
  for(const user of [null,{email:'client@example.com',uid:'client',isAdmin:true},{email:'jerome@leroyfactory.fr',isAdmin:true}])await refresh(user);
  assert.equal(calls,0);assert.equal(mounts,0);
});
test('catalogue text cannot close the inline script and the verified storage identity is injected',async()=>{
  const {safeAnimaJSON,animaFrameDocument}=await documentModule;
  const value={label:'</script><script>alert(1)</script>\u2028\u2029é'};
  const serialized=safeAnimaJSON(value);assert.doesNotMatch(serialized,/</);assert.deepEqual(JSON.parse(serialized),value);
  const frame=animaFrameDocument({html:'<main id="private"></main>',css:'main{}',catalogue:value,identity:{uid:'verified',email:'coryne@leroyfactory.fr'}},'blob:https://leroyfactory.fr/unit-test');
  assert.match(frame,/window\.NEOBATH_ANIMA_AGENT=\{"uid":"verified"/);assert.equal((frame.match(/<script>/g)||[]).length,1);assert.match(frame,/assets\/vendor\/studio-one\/three\.min\.js/);
});
test('private application files are excluded from both publication routes and the public shell has no editor',()=>{
  const excluded=readFileSync(resolve(__dirname,'../../_config.yml'),'utf8');assert.match(excluded,/\n  - functions\n/);
  const build=readFileSync(resolve(__dirname,'../../scripts/build-public-site.mjs'),'utf8');assert.match(build,/node_modules\|server\|functions/);
  const shell=readFileSync(resolve(__dirname,'../../neobath-anima-configurateur.html'),'utf8');assert.match(shell,/noindex,nofollow,noarchive/);assert.doesNotMatch(shell,/NEOBATH_ANIMA_CATALOGUE|<canvas|APUR-/);
  const cards=readFileSync(resolve(__dirname,'../../configurateurs.html'),'utf8');assert.doesNotMatch(cards,/href="neobath-anima-configurateur\.html"/);
  const loader=readFileSync(resolve(__dirname,'../../assets/js/neobath-anima-access.mjs'),'utf8');assert.doesNotMatch(loader,/getIdToken\(true\)/);assert.match(loader,/host\.replaceChildren\(\)/);
});

test('project actions remain behind verified authentication, bounded payloads and known methods',async()=>{
  let projectCalls=0,loads=0;
  const projectStore=Object.fromEntries(['projects-list','projects-save','projects-delete'].map(action=>[action,async(body,agent)=>{projectCalls++;assert.equal(agent.email,'coryne@leroyfactory.fr');return {success:true,action,project:body.project};}]));
  for(const agent of [null,{uid:'client',email:'client@example.com'}]){
    const handler=createNeobathAnimaHandler({getAgent:async()=>agent,loadApplication:()=>{loads++;},projectStore});
    for(const action of Object.keys(projectStore)){
      const res=response();await handler({method:'POST',headers:{origin:'https://leroyfactory.fr'},body:{action,isAdmin:true}},res);
      assert.ok([401,403].includes(res.code));assert.equal(res.body.success,false);
    }
  }
  assert.equal(projectCalls,0);assert.equal(loads,0);
  const handler=createNeobathAnimaHandler({getAgent:async()=>({uid:'coryne',email:'coryne@leroyfactory.fr'}),loadApplication:()=>{loads++;},projectStore});
  for(const action of Object.keys(projectStore)){
    const res=response();await handler({method:'POST',headers:{origin:'https://leroyfactory.fr'},body:{action,project:{id:'unit-test'}}},res);
    assert.equal(res.code,200);assert.equal(res.body.action,action);
  }
  assert.equal(projectCalls,3);assert.equal(loads,0);
  const oversize=response();await handler({method:'POST',headers:{},body:{action:'projects-save',project:{huge:'x'.repeat(1048576)}}},oversize);
  assert.equal(oversize.code,413);assert.equal(projectCalls,3);
});
test('project revision and tombstone conflicts retain their useful status without leaking internals',async()=>{
  for(const status of [409,410]){
    const handler=createNeobathAnimaHandler({getAgent:async()=>({uid:'coryne',email:'coryne@leroyfactory.fr'}),loadApplication:()=>{},projectStore:{'projects-save':async()=>{throw Object.assign(Error('Rechargez le projet.'),{status});}}});
    const res=response();await handler({method:'POST',headers:{},body:{action:'projects-save'}},res);
    assert.equal(res.code,status);assert.equal(res.body.error,'Rechargez le projet.');
  }
});

test('only authenticated home and atelier views load their original Studio One application', async () => {
  for (const email of ['jerome@leroyfactory.fr', 'coryne@leroyfactory.fr']) for (const view of ['home','atelier']) {
    const result = await request({agent:{uid:'agent',email},body:{action:'application',view}});
    assert.equal(result.code,200); assert.deepEqual(result.views,[view]);
    assert.equal(result.body.view,view); assert.equal(result.body.engine,'studio-one');
    assert.equal(result.body.assetBase,'https://studio-one-beta-test-v2.vercel.app/');
  }
  const denied = await request({body:{view:'atelier',isAdmin:true}});
  assert.equal(denied.code,401); assert.equal(denied.reads,0);
  for (const view of ['../../secret', 'https://evil.invalid', 'house', {}, ['atelier']]) {
    const invalid = await request({agent:{uid:'agent',email:'jerome@leroyfactory.fr'},body:{action:'application',view}});
    assert.equal(invalid.code,400); assert.equal(invalid.reads,0);
  }
});

test('forced view navigation reauthorizes and remounts while normal token refresh preserves the open project', async () => {
  const {createAnimaSession}=await sessionModule; let mounts=0,closes=0,requests=0;
  const refresh=createAnimaSession({request:async()=>{requests++;return {success:true};},mount:()=>mounts++,unmount:()=>closes++,status:()=>{}});
  await refresh(agent()); await refresh(agent());
  assert.equal(mounts,1);assert.equal(requests,2);assert.equal(closes,0);
  await refresh(agent(),{force:true});
  assert.equal(mounts,2);assert.equal(requests,3);assert.equal(closes,1);
});

test('Studio One frame gets the real asset base, route and visual data without loading a second Three engine', async () => {
  const {animaFrameDocument,animaRoute}=await documentModule;
  const origin='https://leroyfactory.fr';
  const url=animaRoute(origin+'/neobath-anima-configurateur.html?studioView=home',{view:'atelier',search:'?view=configure&step=2',hash:'#projet=abc'});
  const frame=animaFrameDocument({engine:'studio-one',view:'atelier',html:'<main id="private"></main>',css:'main{}',catalogue:{collection:'Anima'},visuals:{image:'</script><img src=x onerror=alert(1)>'},identity:{uid:'verified',email:'coryne@leroyfactory.fr'}},'blob:https://leroyfactory.fr/unit-test',origin,url);
  assert.match(frame,/<base href="https:\/\/studio-one-beta-test-v2\.vercel\.app\/">/);
  assert.match(frame,/window\.__ANIMA_VIEW__="atelier"/);
  assert.match(frame,/window\.__ANIMA_ROUTE_URL__=/);
  assert.match(frame,/window\.NEOBATH_ANIMA_VISUALS=/);
  assert.doesNotMatch(frame,/three\.min\.js/);
  assert.equal((frame.match(/<script>/g)||[]).length,1);
  assert.doesNotMatch(frame,/<img src=x/);
  const route=new URL(url);assert.equal(route.origin,origin);assert.equal(route.searchParams.get('studioView'),'atelier');assert.equal(route.searchParams.get('step'),'2');assert.equal(route.hash,'#projet=abc');
  const protectedRoute=animaRoute(url,{view:'home',search:'https://evil.invalid/secret?view=quote'});
  assert.equal(new URL(protectedRoute).origin,origin);assert.equal(new URL(protectedRoute).pathname,'/neobath-anima-configurateur.html');assert.equal(new URL(protectedRoute).hash,'');
  assert.throws(()=>animaRoute(url,{view:'../../private'}));
  assert.throws(()=>animaRoute(url,{search:'javascript:alert(1)'}));
});

test('frame bridge works without native randomUUID and resolves only a parent reply', async () => {
  const vm=require('node:vm'); const {animaFrameDocument}=await documentModule;
  const origin='https://leroyfactory.fr', messages=[], listeners={};
  const parent={postMessage:(data,target)=>messages.push({data,target})};
  const context={parent,crypto:{getRandomValues:a=>{a[0]=17;return a;}},Uint8Array,Map,URL,setTimeout,clearTimeout,document:{addEventListener:()=>{}},addEventListener:(name,fn)=>{listeners[name]=fn;}};
  context.window=context;
  const frame=animaFrameDocument({engine:'studio-one',view:'home',html:'',css:'',catalogue:{},identity:{uid:'verified'}},'blob:unit-test',origin,origin+'/neobath-anima-configurateur.html');
  const script=frame.match(/<script>([\s\S]*?)<\/script>/)[1];
  vm.runInNewContext(script,context);
  const pending=context.animaAPI('projects-list',{});
  assert.match(messages[0].data.requestId,/^[a-f0-9-]{36}$/);
  assert.equal(messages[0].target,origin);
  listeners.message({source:{},origin,data:{type:'anima-api-result',requestId:messages[0].data.requestId,ok:true,data:{success:true,projects:['forged']}}});
  listeners.message({source:parent,origin,data:{type:'anima-api-result',requestId:messages[0].data.requestId,ok:true,data:{success:true,projects:[]}}});
  assert.deepEqual(await pending,{success:true,projects:[]});
  context.animaNavigate('atelier','?view=configure','#abc');assert.equal(messages[1].data.type,'anima-navigate');
  context.animaHistory('?view=quote',true);assert.equal(messages[2].data.type,'anima-history');assert.equal(messages[2].data.replace,true);
});

async function loaderHarness({rejectProjects=false}={}) {
  const vm=require('node:vm');const {createAnimaSession,isAnimaAgent}=await sessionModule;const {animaFrameDocument,animaRoute}=await documentModule;
  let href='https://leroyfactory.fr/neobath-anima-configurateur.html?studioView=home',signouts=0;
  const requests=[],listeners={},elements={
    'anima-private-shell':{hidden:false},'anima-private-host':{children:[],replaceChildren(...children){this.children=children;}},
    'anima-access-status':{textContent:''},'anima-access-retry':{addEventListener:()=>{}}
  };
  const context={URL,Blob,AbortSignal,TextEncoder,createAnimaSession,isAnimaAgent,animaFrameDocument,animaRoute,
    document:{title:'',getElementById:id=>elements[id],createElement:()=>({attrs:{},setAttribute(name,value){this.attrs[name]=value;},contentWindow:{messages:[],postMessage(data,origin){this.messages.push({data,origin});}}})},
    location:{get href(){return href;},get origin(){return new URL(href).origin;}},
    history:{pushState:(_state,_title,url)=>{href=url;},replaceState:(_state,_title,url)=>{href=url;}},
    addEventListener:(name,listener)=>{(listeners[name]??=[]).push(listener);},
    fetch:async(_url,options)=>{const body=JSON.parse(options.body);requests.push(body);return {
      ok:!(rejectProjects&&body.action==='projects-list'),status:rejectProjects&&body.action==='projects-list'?401:200,
      json:async()=>body.action==='application'?{success:true,engine:'studio-one',view:body.view,html:'<main></main>',css:'main{}',module:'const studioOne=true;',catalogue:{},visuals:{},identity:{uid:'verified',email:'jerome@leroyfactory.fr'}}:rejectProjects?{success:false,error:'Session expirée'}:{success:true,projects:[]}
    };},
    unitAgent:{uid:'verified',email:'jerome@leroyfactory.fr',getIdToken:async()=>'unit-test-token'},
    unitSignout:async()=>{signouts++;}
  };
  let source=readFileSync(resolve(__dirname,'../../assets/js/neobath-anima-access.mjs'),'utf8').replace(/^import .+;\n/gm,'');
  source=source.slice(0,source.lastIndexOf('\ntry {\n  const [appSDK'));
  const state=vm.createContext(context);vm.runInContext(source,state);
  await vm.runInContext('currentUser=unitAgent; signOutAgent=unitSignout; refresh(currentUser)',state);
  return {state,requests,elements,listeners,get frame(){return elements['anima-private-host'].children[0];},get href(){return href;},get signouts(){return signouts;}};
}

test('only the active verified iframe can navigate between the two private Studio One views or request projects', async()=>{
  const h=await loaderHarness(),first=h.frame;
  const message=h.listeners.message[0];const origin='https://leroyfactory.fr';
  await message({source:{},origin,data:{type:'anima-navigate',view:'atelier'}});
  assert.equal(h.requests.length,1);
  await message({source:first.contentWindow,origin:'https://attacker.invalid',data:{type:'anima-navigate',view:'atelier'}});
  assert.equal(h.requests.length,1);
  await message({source:first.contentWindow,origin,data:{type:'anima-navigate',view:'atelier',search:'?view=configure&step=2',hash:'#project=example'}});
  const second=h.frame;assert.notEqual(second,first);assert.equal(h.requests[1].view,'atelier');
  assert.equal(new URL(h.href).searchParams.get('studioView'),'atelier');assert.equal(new URL(h.href).hash,'#project=example');
  await message({source:first.contentWindow,origin,data:{type:'anima-api',requestId:'stale',action:'projects-list',payload:{profile:'studio-one'}}});
  assert.equal(h.requests.length,2);
  await message({source:second.contentWindow,origin,data:{type:'anima-api',requestId:'valid',action:'projects-list',payload:{profile:'studio-one'}}});
  assert.equal(h.requests[2].profile,'studio-one');assert.equal(second.contentWindow.messages.at(-1).data.requestId,'valid');
  await message({source:second.contentWindow,origin,data:{type:'anima-history',url:'https://evil.invalid/other?view=quote',replace:true}});
  assert.equal(h.requests.length,3);assert.equal(h.frame,second);assert.equal(new URL(h.href).origin,origin);assert.equal(new URL(h.href).searchParams.get('view'),'quote');
  await message({source:first.contentWindow,origin,data:{type:'anima-logout'}});assert.equal(h.signouts,0);
  await message({source:second.contentWindow,origin,data:{type:'anima-logout'}});assert.equal(h.signouts,1);assert.equal(h.frame,undefined);
});

test('a revoked project request tears down the private renderer immediately',async()=>{
  const h=await loaderHarness({rejectProjects:true});
  await h.listeners.message[0]({source:h.frame.contentWindow,origin:'https://leroyfactory.fr',data:{type:'anima-api',requestId:'expired',action:'projects-list',payload:{profile:'studio-one'}}});
  assert.equal(h.frame,undefined);assert.match(h.elements['anima-access-status'].textContent,/expiré/);
});
