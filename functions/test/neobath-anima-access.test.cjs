const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {resolve} = require('node:path');
const {pathToFileURL} = require('node:url');
const {createNeobathAnimaHandler} = require('../neobath-anima-access-core.cjs');
const {createHash} = require('node:crypto');

test('the private release contains matching interface, script, style and catalogue assets', () => {
  const root = resolve(__dirname, '../neobath-anima');
  const release = JSON.parse(readFileSync(resolve(root, 'release.json'), 'utf8'));
  assert.equal(release.id, '20261102-neobath-anima-private-1');
  for (const file of ['app.js', 'application.html', 'style.css', 'catalogue.json']) {
    assert.equal(createHash('sha256').update(readFileSync(resolve(root, file))).digest('hex'), release.assets[file], file);
  }
});

function response() {
  return {code:200,headers:{},set(k,v){this.headers[k]=v;return this;},status(v){this.code=v;return this;},json(v){this.body=v;return this;},send(v){this.body=v;return this;}};
}
async function request({agent=null,method='POST',origin='https://leroyfactory.fr',body={},failure=false}={}) {
  let reads=0,verifications=0;
  const handler=createNeobathAnimaHandler({getAgent:async()=>{verifications++;return agent;},loadApplication:()=>{reads++;if(failure)throw Error('private diagnostic');return {html:'<main>Private Anima editor</main>',css:'.private{}',module:'const privateEditor=true;',catalogue:{products:['private catalogue']}};}});
  const res=response();await handler({method,headers:{origin},body},res);
  return {...res,reads,verifications};
}
test('anonymous and forged PRO/admin/identity fields cannot obtain any protected application content',async()=>{
  for(const body of [{},{isAdmin:true,email:'jerome@leroyfactory.fr',codeClient:'LRF-00317'},{role:'admin',sessionToken:'forged',identity:{uid:'forged',email:'coryne@leroyfactory.fr'}}]){
    const result=await request({body});assert.equal(result.code,401);assert.equal(result.reads,0);assert.equal(result.verifications,1);assert.equal(result.body.success,false);
    for(const field of ['html','css','module','catalogue','identity'])assert.equal(result.body[field],undefined);
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
