import {test} from 'node:test';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
import {checkedInput} from '../../functions/configurator-projects-core.js';
import {projectStatus,projectPlan,validThumbnail} from '../../randal-general/src/commerce/project-card.js';
const data={version:2,room:{height:260,points:[[0,0],[450,0],[450,450],[0,450]]},items:[]};
test('project previews travel through the bounded server schema; SVG and external images cannot be uploaded',()=>{
 const raw={id:'project-preview-12345',kind:'bathroom',title:'Projet',data,thumbnail:'data:image/webp;base64,UklGRg=='};assert.equal(checkedInput(raw).thumbnail,raw.thumbnail);assert.equal(validThumbnail(raw.thumbnail),raw.thumbnail);
 for(const thumbnail of ['https://example.com/tracker.png','data:image/svg+xml;base64,PHN2Zz4=', 'data:image/png;base64,'+'A'.repeat(120000)])assert.throws(()=>checkedInput({...raw,thumbnail}));
 assert.equal(projectStatus({status:'draft'}),'Devis en cours');assert.equal(projectStatus({status:'validated'}),'Commande validée');assert.match(projectPlan({data}),/^data:image\/svg\+xml/);
 assert.notEqual(projectPlan({data}),projectPlan({data:{...data,room:{...data.room,points:[[0,0],[300,0],[300,250],[0,250]]}}}));
});
if(process.env.STUDIO_PROJECT_ROOT)test('customer quotes preserve public prices and never expose purchase amounts or encoded references',async()=>{
 const root=process.env.STUDIO_PROJECT_ROOT+'/',load=p=>import(pathToFileURL(root+p));
 const [{privateReference,purchaseQuote},{initialDraft,draftProject},{default:handler,departmentInput},{projectAmount}]=await Promise.all([load('server/purchase.js'),load('src/commerce/guided.js'),load('api/commercial.js'),load('src/commerce/project-card.js')]);
 const p=draftProject({...initialDraft(),format:'two',width:80,finish:'ROBLE',top:'bare'});assert.equal(privateReference('LRF-00003',12345),'LRF-00003');assert.equal(privateReference('LRF-00003',12346),'LRF-00003');assert.equal(privateReference('LRF-00003',null),'LRF-00003');const {quoteProject}=await load('src/commerce/pricing.js');assert.equal(projectAmount({data:p}).amount,quoteProject(p).publicTTC);
 assert.equal(departmentInput('05200'),'05');assert.equal(departmentInput('34'),'34');assert.equal(departmentInput('97400'),'974');assert.equal(departmentInput('20100'),'2A');assert.equal(departmentInput('20200'),'2B');assert.equal(departmentInput('1234'),'');
 const original=globalThis.fetch,calls=[];globalThis.fetch=async(url)=>{calls.push(String(url));return{ok:true,status:200,json:async()=>({success:true,client:{id:'synthetic',codeClient:'LRF-00003',departement:'05',societe:'Magasin test',partenaires:['randal-pro']}})};};
 try{const result={headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(v){this.body=v;return this;}};await handler({method:'POST',headers:{host:'test.vercel.app',authorization:'Bearer synthetic-session-abcdefghijklmnopqrstuvwxyz',cookie:'studio_one_admin=stale-admin-cookie'},body:{action:'quote',project:p}},result);assert.equal(result.code,200);assert.equal(result.body.proHT,null);assert.deepEqual(result.body.proRows,[]);assert.equal(result.body.privateCode,'LRF-00003');assert.ok(calls.every(u=>!u.includes('identitytoolkit')),'A stale admin cookie cannot override a customer bearer session');}finally{globalThis.fetch=original;}
});
