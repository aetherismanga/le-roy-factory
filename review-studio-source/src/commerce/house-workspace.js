import '../viewport.js';
import {createIdentity,privateMarkup} from './identity.js';
import {createWorkspace,readProjects} from './workspace.js';
import {ACTIVE_ID,CURRENT_KEY,storeQuote} from './flow.js';
import {returnToRandal} from './navigation.js';
const frame=document.querySelector('#house-frame'),ORIGIN='https://maison-3d-leroyfactory-hugol-trading.vercel.app';
const params=new URLSearchParams(location.search);let current=null,ready=false;
if(params.has('template'))localStorage.removeItem(ACTIVE_ID);else if(params.has('project')){localStorage.setItem(ACTIVE_ID,params.get('project'));current=readProjects().find(p=>p.id===params.get('project'))?.data||null;}
const workspace=createWorkspace({kind:'house',getProject:()=>current,onDeletedActive:()=>{current=null;location.href='index.html?new=1';},onUpdate:data=>{current=data;if(ready)frame.contentWindow.postMessage({type:'lrf-house-meta',name:data.name,client:data.client},ORIGIN);},onOpen:(data,id,record)=>{if(record?.kind!=='house'){storeQuote(localStorage,data,'scene');location.href='atelier.html';return;}current=data;if(ready)frame.contentWindow.postMessage({type:'lrf-house-open',project:data,readOnly:record.status!=='draft'},ORIGIN);},onLock:(locked,record)=>{document.querySelector('#save-house').disabled=locked;document.querySelector('#house-order').disabled=locked;document.querySelector('#house-order').textContent=record?.status==='validated'?'Validé':'Finaliser';if(ready)frame.contentWindow.postMessage({type:'lrf-house-lock',readOnly:locked},ORIGIN);document.querySelector('#house-name').textContent=record?.title||current?.name||'Plans maison';},status:text=>{document.querySelector('#house-status').textContent=text;}});
const identity=createIdentity(()=>null,s=>{workspace.setAccount(s);document.querySelector('#house-account').innerHTML=s.client?privateMarkup({...s,proHT:undefined,proRows:[]}):'<a href="index.html?account=1">Mon compte LRF</a>';});
identity.load();
addEventListener('message',async e=>{if(e.source!==frame.contentWindow||e.origin!==ORIGIN)return;const d=e.data;
 if(d?.type==='lrf-house-bootstrap-ready'){await identity.load();await workspace.refresh();const record=workspace.active;if(record?.kind==='house')current=record.data;frame.contentWindow.postMessage({type:'lrf-house-init',project:current,template:params.get('template')||'villa-pool',readOnly:workspace.locked},ORIGIN);}
 if(d?.type==='lrf-house-ready'){ready=true;document.querySelector('#house-loading').hidden=true;}
 if(d?.type==='lrf-house-checkpoint'&&!workspace.locked&&d.project?.schema===2){current=d.project;workspace.checkpoint();document.querySelector('#house-name').textContent=current.name;}
});
frame.src=ORIGIN+'/?workspace=1';
document.querySelector('#save-house').onclick=()=>workspace.save();document.querySelector('#house-order').onclick=()=>workspace.order();document.querySelector('#house-projects').onclick=()=>workspace.showProjects();document.querySelector('#house-export').onclick=()=>workspace.download();document.querySelector('#house-send').onclick=()=>workspace.sendAdministrator();document.querySelector('#house-duplicate').onclick=()=>workspace.duplicate();document.querySelector('#house-quit').onclick=async()=>{await workspace.flush();returnToRandal();};document.querySelector('#house-plans').onclick=async()=>{await workspace.flush();location.href='atelier.html?plans=1';};
addEventListener('pagehide',()=>{frame.contentWindow.postMessage({type:'lrf-house-flush'},ORIGIN);workspace.checkpoint();});
