import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createPublicCompositionSession} from '../../shared/lrf-3d/public-composition-session.js';
import {PUBLIC_COMPOSITIONS,publicCompositionProject} from '../../shared/lrf-3d/public-compositions.js';

const clone=value=>JSON.parse(JSON.stringify(value));
function fixture(){
 let project={version:2,title:'Chantier privé conservé',room:{height:260,points:[[0,0],[450,0],[450,450],[0,450]]},floor:{collection:'Creta',color:'caramello'},walls:[],items:[]},fail=false;
 const original=clone(project),named=[{id:'project-private',title:project.title,status:'draft',data:clone(project)},{id:'project-validated',title:'Commande validée',status:'validated',data:{...clone(project),title:'Commande validée'}}];
 const values=new Map([['active','project-private'],['saved',JSON.stringify(named)],['current',JSON.stringify(project)],['unrelated','keep-me']]);
 const storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};
 const events=[],checkpoints=[];let session;
 const workspace={refreshLock(){events.push(['lock',session.isPreview]);},checkpoint(options){checkpoints.push({options,preview:session.isPreview});if(session.isPreview)return null;const old=storage.getItem('active'),id=old||'project-personal-copy';const all=JSON.parse(storage.getItem('saved'));const record={id,title:project.title,status:'draft',data:clone(project)},index=all.findIndex(r=>r.id===id);if(index>=0)all[index]=record;else all.push(record);storage.setItem('saved',JSON.stringify(all));storage.setItem('active',id);storage.setItem('current',JSON.stringify(project));return record;}};
 session=createPublicCompositionSession({getProject:()=>project,restoreProject:value=>{events.push(['restore',session.isPreview]);if(fail)return false;project=clone(value);return true;},getWorkspace:()=>workspace,storage,activeKey:'active',onBefore:()=>events.push(['before',session?.isPreview]),onChange:mode=>events.push(['change',mode])});
 return {session,workspace,storage,values,events,checkpoints,original,named,get project(){return project;},rejectRestore(value){fail=value;}};
}

test('preview checkpoints private scene before isolation; switching and closing never mutate named projects',()=>{
 const f=fixture(),first=PUBLIC_COMPOSITIONS[0].id,second=PUBLIC_COMPOSITIONS[1].id;
 assert(f.session.preview(first));assert(f.session.isPreview);assert.equal(f.session.composition.id,first);assert.equal(f.project.renovation.locked,true);assert.equal(f.storage.getItem('active'),'project-private');assert.equal(f.checkpoints.length,1);assert.equal(f.checkpoints[0].preview,false);assert.deepEqual(JSON.parse(f.storage.getItem('saved')),f.named);
 assert(f.session.preview(second));assert.equal(f.checkpoints.length,1,'Switching examples does not checkpoint a public scene');assert.equal(f.session.composition.id,second);assert.equal(f.workspace.checkpoint(),null);assert.deepEqual(JSON.parse(f.storage.getItem('saved')),f.named);
 assert(f.session.leave());assert.equal(f.session.isPreview,false);assert.deepEqual(f.project,f.original);assert.equal(f.session.leave(),false);assert.deepEqual(JSON.parse(f.storage.getItem('saved')),f.named);assert.equal(f.storage.getItem('active'),'project-private');assert.equal(f.storage.getItem('unrelated'),'keep-me');
 assert.deepEqual(f.events.filter(e=>e[0]==='change').map(e=>e[1]),['preview','preview','close']);
});
test('an explicit copy creates editable independent data under a new personal ID and keeps old validated projects',()=>{
 const f=fixture(),id=PUBLIC_COMPOSITIONS[0].id,sourceBefore=publicCompositionProject(id);
 f.session.preview(id);const previewIds=f.project.items.map(i=>i.id);assert(f.session.copy());assert.equal(f.session.isPreview,false);assert.equal(f.project.renovation.locked,false);assert(f.project.items.every(i=>i.locked===false));assert(f.project.items.every(i=>!previewIds.includes(i.id)));assert.equal(f.storage.getItem('active'),'project-personal-copy');
 const saved=JSON.parse(f.storage.getItem('saved'));assert.equal(saved.length,3);assert.deepEqual(saved.find(p=>p.id==='project-private'),f.named[0]);assert.deepEqual(saved.find(p=>p.id==='project-validated'),f.named[1]);assert.equal(f.checkpoints.at(-1).options.capture,true);assert.equal(f.checkpoints.at(-1).preview,false);
 f.project.items[0].settings.width=999;assert.deepEqual(publicCompositionProject(id),sourceBefore,'Editing a copy does not mutate the public source');
});
test('direct copy preserves prior private scene, route preview can suppress initial checkpoint, and invalid IDs are atomic',()=>{
 const f=fixture(),id=PUBLIC_COMPOSITIONS[0].id;assert.throws(()=>f.session.preview('missing'),/introuvable/);assert.throws(()=>f.session.copy('missing'),/introuvable/);assert.equal(f.checkpoints.length,0);assert(f.session.copy(id));assert.equal(f.checkpoints.length,2);assert.equal(f.storage.getItem('active'),'project-personal-copy');assert.deepEqual(JSON.parse(f.storage.getItem('saved')).find(p=>p.id==='project-private'),f.named[0]);
 const route=fixture();assert(route.session.preview(id,{checkpoint:false}));assert.equal(route.checkpoints.length,0);route.session.leave();assert.deepEqual(route.project,route.original);
});
test('failed preview or copy leaves private saved identity and preview state intact',()=>{
 const f=fixture(),id=PUBLIC_COMPOSITIONS[0].id;f.rejectRestore(true);assert.throws(()=>f.session.preview(id),/ouverte/);assert.equal(f.session.isPreview,false);assert.equal(f.storage.getItem('active'),'project-private');assert.deepEqual(f.project,f.original);
 f.rejectRestore(false);f.session.preview(id);const before=clone(f.project),saved=f.storage.getItem('saved');f.rejectRestore(true);assert.throws(()=>f.session.copy(),/créée/);assert.equal(f.session.isPreview,true);assert.equal(f.session.composition.id,id);assert.equal(f.storage.getItem('active'),'project-private');assert.equal(f.storage.getItem('saved'),saved);assert.deepEqual(f.project,before);
});
test('a failed close remains an isolated readonly preview so retry cannot overwrite the private project',()=>{
 const f=fixture(),id=PUBLIC_COMPOSITIONS[0].id;f.session.preview(id);const saved=f.storage.getItem('saved');f.rejectRestore(true);assert.throws(()=>f.session.leave(),/réaffiché/);assert.equal(f.session.isPreview,true,'A failed private restore must retain preview isolation');assert.equal(f.workspace.checkpoint(),null);assert.equal(f.storage.getItem('saved'),saved);assert.equal(f.storage.getItem('active'),'project-private');f.rejectRestore(false);assert(f.session.leave());assert.deepEqual(f.project,f.original);
});
test('both real workspace checkpoint implementations reject readonly writes before accessing private state',()=>{
 for(const app of ['studio-one','randal-general']){
  const source=readFileSync(new URL('../../'+app+'/src/commerce/workspace.js',import.meta.url),'utf8'),a=source.indexOf('function checkpoint('),b=source.indexOf('// Projects are saved',a);assert(a>=0&&b>a);
  let reads=0,writes=0;const checkpoint=vm.runInNewContext('('+source.slice(a,b).trim()+')',{readonly:()=>true,getProject:()=>{reads++;throw Error('Must not inspect preview for saving');},putProject:()=>writes++,localStorage:{setItem:()=>writes++}});
  assert.equal(checkpoint({capture:true}),null);assert.equal(reads,0);assert.equal(writes,0,app+' must preserve private records during readonly preview');
 }
});
