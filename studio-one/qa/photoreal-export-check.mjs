import vm from 'node:vm';
import assert from 'node:assert/strict';
import {buildStudioPhotorealPrompt} from '../src/photoreal-project.js';
import {initialDraft,draftProject} from '../src/commerce/guided.js';
import {readFileSync} from 'node:fs';
import {buildPhotorealPrompt,CHATGPT_URL} from '../src/photoreal-export.js';
const secret='CLIENT-PRIVE-ACHAT-HT-8421';
const project={title:secret,client:{email:secret},siteReference:secret,comment:secret,prices:{purchaseHT:secret},room:{height:260,points:[[0,0],[450,0],[450,380],[0,380]],partitions:[{a:[100,0],b:[100,150],thickness:10,client:secret}]},floor:{collection:'Creta',color:'caramello',format:'60x120',purchaseHT:secret},walls:[{collection:'Allure',color:'beige',tiles:{'0:0':'decor-1','1:0':'decor-2',purchase:secret}}],layouts:{floor:{direction:'horizontal',pattern:'straight',width:1.2,height:.6}},items:[{type:'cabinet',settings:{format:'two-xl',width:100,finish:'ALBA',purchaseHT:secret,client:secret},placement:{wall:0,u:160,height:45,offset:0}},{type:'column',settings:{columnModel:'armoire',hingeSide:'right',doorOpen:true,finish:'NOGAL'},placement:{wall:1,u:80,height:40}},{type:'mirror',settings:{mirrorModel:'round-led',led:true}}]};
const before=JSON.stringify(project),prompt=buildPhotorealPrompt(project,{name:'RANDAL STUDIO ONE',finishName:id=>({ALBA:'Serenade Alba',NOGAL:'Nogal Valentina'}[id]||id)});
assert.equal(JSON.stringify(project),before,'Preparing the prompt must not alter the project');
assert(!prompt.includes(secret),'No client/contact/site/comment/private price data is exported');
for(const expected of ['Serenade Alba','Nogal Valentina','450','380','two-xl','100','armoire','right','round-led','decor-1','decor-2','Allure','calepinage','Ne déplace'])assert(prompt.includes(expected),expected);
assert(!prompt.includes('purchaseHT'));assert(!prompt.includes('siteReference'));
const malformed=structuredClone(project);malformed.room.points.push([secret,{client:secret}]);malformed.room.partitions[0].a=[secret,{client:secret}];malformed.room.partitions[0].height={client:secret};
assert(!buildPhotorealPrompt(malformed).includes(secret),'Malformed geometry is not serialized as arbitrary metadata');
const furniture=buildPhotorealPrompt(project,{scope:'furniture'});assert(furniture.includes('sans inventer une salle de bain'));assert(!furniture.includes('"contour"'));
assert.equal(CHATGPT_URL,'https://chatgpt.com/');
const home=readFileSync('src/commerce/home.js','utf8'),app=readFileSync('src/app.js','utf8');
assert(home.includes("launch(project,{photoreal:true})"),'Final quote uses the actual atelier rather than the furniture-only preview');
assert(app.includes("photoRoute.searchParams.delete('photoreal')"),'The one-time route is consumed');
assert(app.includes("capture:()=>captureHD()"),'The existing source-maximal capture pipeline is reused');
const cataloguePrompt=buildStudioPhotorealPrompt(draftProject({...initialDraft(),format:'two-xl',width:100,top:'plain',column:true}));
assert(cataloguePrompt.includes('100 × 75 × 46 cm'));assert(cataloguePrompt.includes('38 × 132 × 27 cm'));assert(cataloguePrompt.includes('14214 100@'));assert(!cataloguePrompt.includes('publicTTC'));
console.log('PASS photorealistic export: visual fidelity, room geometry, model/decor order, project immutability and privacy whitelist.');

// Exercise the real startup catch and automatic-route guard without a GPU.
const initialize=app.slice(app.indexOf('function initializeProjectSession(){'),app.indexOf('function storedProjects(){'));
const handoff=app.slice(app.indexOf('const photoRoute=new URL(location.href);'),app.indexOf('\n }catch(e){showError(e);}',app.indexOf('const photoRoute=new URL(location.href);')));
for(const [missing,restored]of [[false,false],[true,false],[false,true]]){
 let opened=0,alerts=0;const location={href:'http://localhost/atelier.html?guided=1&photoreal=1',search:'?guided=1&photoreal=1',hash:''};
 const node=()=>({setAttribute(){},append(){},after(){alerts++;}});
 const context=vm.createContext({state:{surfaceNotices:[]},URL,URLSearchParams,location,history:{state:null,replaceState(_state,_title,url){location.href=String(url);location.search=new URL(String(url)).search;}},localStorage:{getItem:()=>missing?null:JSON.stringify({items:[]}),removeItem(){}},ProjectJournal:class{seed(){}},setWorkspace(){},setView(){},restoreProject:()=>restored,defaultBathroomProject:()=>({}),collectProject:()=>({}),updateHistoryButtons(){},placementStatus(){},document:{createElement:node,querySelector:node},photorealExport:{open:async()=>{opened++;}},$:()=>null});
 vm.runInContext('let journal=null,photorealProjectReady=false;'+initialize+'initializeProjectSession();',context);
 await vm.runInContext('(async()=>{'+handoff+'})()',context);
 assert.equal(opened,restored?1:0,'Only a successfully restored composition can open the automatic capture');assert(restored?alerts===0:alerts>0,'The original guided-transfer error remains visible on rejection');assert(!location.search.includes('photoreal='),'Rejected one-time requests are consumed too');
}
console.log('PASS rejected/missing guided restore: no automatic default-scene capture, original error kept.');
