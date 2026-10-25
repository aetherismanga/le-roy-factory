// A project restore commits its scene and controls together. Pending image loads
// may publish many faces, but their shared scene updates run once per frame.
const priority={quality:10,materials:20,composition:30,layouts:40,palettes:50,pickers:55,inspector:60,profiles:70,quantities:80,textures:90,invalidate:100};
export function createProjectRefreshBatch({requestFrame=callback=>requestAnimationFrame(callback)}={}){
 let depth=0,flushing=false,current=null,entered=false,frameQueued=false,generation=0;const pending=new Map(),completed=new Set(),requested={},executed={};
 const count=(map,key)=>map[key]=(map[key]||0)+1;
 function defer(key,run){
  count(requested,key);
  if(flushing&&current===key&&!entered){entered=true;count(executed,key);return false;}
  if(depth||flushing){if(!completed.has(key))pending.set(key,run);return true;}
  count(executed,key);return false;
 }
 function flush(){
  if(depth||flushing)return;frameQueued=false;generation++;flushing=true;completed.clear();
  try{while(pending.size){const [key,run]=[...pending].sort((a,b)=>(priority[a[0]]??50)-(priority[b[0]]??50))[0];pending.delete(key);if(completed.has(key))continue;current=key;entered=false;run();completed.add(key);}}
  finally{current=null;entered=false;flushing=false;completed.clear();}
 }
 function schedule(key,run){pending.set(key,run);if(depth||flushing||frameQueued)return;frameQueued=true;const token=++generation;requestFrame(()=>{if(token!==generation)return;frameQueued=false;flush();});}
 return {defer,schedule,flush,begin(){if(!depth)completed.clear();depth++;},end(){if(depth)depth--;if(!depth)flush();},cancel(){depth=0;pending.clear();completed.clear();frameQueued=false;generation++;},diagnostics:()=>({requested:{...requested},executed:{...executed},pending:[...pending.keys()],depth})};
}
export function sameProjectPlacement(a,b){return !!a&&!!b&&['wall','u','height'].every(key=>Number.isFinite(a[key])&&Number.isFinite(b[key])&&a[key]===b[key])&&['offset','rotation'].every(key=>(a[key]??0)===(b[key]??0));}
