import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {beginEmptyStudioEntry,settleEmptyStudioEntry,markStudioEntryEdited,resumeStudioEntry} from '../../studio-one/src/commerce/start-entry.js';
const CURRENT='studio-one-current-project',ACTIVE='studio-one-active-project-id-v2';
function store(values){const rows=new Map(Object.entries(values));return {getItem:key=>rows.get(key)||null,setItem:(key,value)=>rows.set(key,value),removeItem:key=>rows.delete(key)};}
test('empty entry retains the last project, saved identity and explicit resume across repeated visits',()=>{
 const previous={version:2,title:'Projet conservé',items:[{id:'cabinet'}]},empty={version:2,items:[]},storage=store({[CURRENT]:JSON.stringify(previous),[ACTIVE]:'saved-id'});
 beginEmptyStudioEntry(storage);assert.equal(storage.getItem(ACTIVE),null);settleEmptyStudioEntry(storage,empty);
 storage.setItem(CURRENT,JSON.stringify(empty));markStudioEntryEdited(storage,empty);beginEmptyStudioEntry(storage);settleEmptyStudioEntry(storage,empty);
 assert.deepEqual(resumeStudioEntry(storage),previous);assert.equal(storage.getItem(ACTIVE),'saved-id');assert.deepEqual(JSON.parse(storage.getItem(CURRENT)),previous);
});
test('actual changes to a fresh room become the current project; simply rendering it does not replace Resume',()=>{
 const previous={version:2,items:[{id:'old'}]},empty={version:2,items:[]},storage=store({[CURRENT]:JSON.stringify(previous)});
 beginEmptyStudioEntry(storage);settleEmptyStudioEntry(storage,empty);markStudioEntryEdited(storage,empty);
 const edited={version:2,items:[{id:'new'}]};markStudioEntryEdited(storage,edited);storage.setItem(CURRENT,JSON.stringify(edited));assert.equal(resumeStudioEntry(storage),null);assert.deepEqual(JSON.parse(storage.getItem(CURRENT)),edited);
});
test('legacy current drafts remain resumable and blocked browser storage cannot break a new empty entry',()=>{
 const previous={version:1,items:[{id:'legacy'}]},empty={version:2,items:[]},storage=store({[CURRENT]:JSON.stringify(previous)});
 beginEmptyStudioEntry(storage);settleEmptyStudioEntry(storage,empty);assert.deepEqual(resumeStudioEntry(storage),previous);
 const blocked={getItem(){throw Error('Blocked');},setItem(){throw Error('Blocked');},removeItem(){throw Error('Blocked');}};
 assert.doesNotThrow(()=>{beginEmptyStudioEntry(blocked);settleEmptyStudioEntry(blocked,empty);markStudioEntryEdited(blocked,empty);});assert.equal(resumeStudioEntry(blocked),null);
});

// Execute the real wrapper router with inert browser surfaces, without accessing
// any browser account or fetching the embedded application.
function wrapperDestination(search='',hash=''){
 const markup=readFileSync(new URL('../../studio-one-configurateur.html',import.meta.url),'utf8'),script=[...markup.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1],nodes=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,style:{},contentWindow:{postMessage(){}},addEventListener(){},getBoundingClientRect(){return {height:0};}});return nodes.get(id);};
 const storage={length:0,getItem(){return null;},key(){return null;}};
 vm.runInNewContext(script,{URL,URLSearchParams,location:{search,hash},document:{getElementById:node},window:{visualViewport:null,addEventListener(){}},sessionStorage:storage,localStorage:storage,innerHeight:900,getComputedStyle:()=>({getPropertyValue:()=> '0'}),requestAnimationFrame(){},addEventListener(){}});
 const frame=node('studio-one'),direct=node('direct-open');assert.equal(frame.src,direct.href);return new URL(frame.src);
}
test('the configurator chooser opens Studio One welcome, with no implicit project resume',()=>{
 const url=wrapperDestination();assert.equal(url.pathname,'/index.html');assert.equal(url.search,'');assert.equal(url.hash,'');
 const chooser=readFileSync(new URL('../../configurateurs-randal.html',import.meta.url),'utf8');assert.match(chooser,/href="studio-one-configurateur\.html"/);
});
test('explicit workshop, resume, import, plans and account routes retain their intent',()=>{
 for(const query of ['?page=atelier.html','?new=1','?resume=1','?guided=1','?plans=1','?project=example'])assert.equal(wrapperDestination(query).pathname,'/atelier.html',query);
 assert.equal(wrapperDestination('', '#projet=copie-validee').pathname,'/atelier.html');assert.equal(wrapperDestination('', '#projet=copie-validee').hash,'#projet=copie-validee');
 for(const query of ['?view=configure&new=1&step=0','?account=1','?view=quote'])assert.equal(wrapperDestination(query).pathname,'/index.html',query);
 const house=wrapperDestination('?page=maison.html&project=saved-house');assert.equal(house.pathname,'/maison.html');assert.equal(house.searchParams.get('project'),'saved-house');
 const explicit=wrapperDestination('?page=atelier.html&resume=1');assert.equal(explicit.searchParams.get('resume'),'1');
 const plain=wrapperDestination('?page=atelier.html');assert.equal(plain.searchParams.has('resume'),false,'Opening the workshop itself must stay empty');
 assert.equal(wrapperDestination('?page=https://untrusted.invalid/').pathname,'/index.html','Only known application pages may replace the entry path');
});
