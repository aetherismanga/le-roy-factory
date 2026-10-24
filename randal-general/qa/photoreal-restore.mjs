import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const initializer=source.slice(source.indexOf('function initializeProjectSession(){'),source.indexOf('function storedProjects(){'));
const resume=source.slice(source.indexOf('function resumePhotorealHandoff(){'),source.indexOf('\n\nasync function exportImage('));
function scenario({restore=true,stored='{}'}={}){
 const data=new Map([['randal-general-guided-transfer-v1',stored]]),events=[],location=new URL('https://test.local/atelier.html?guided=1&photoreal=1');
 const box=()=>({append(){},after(){},setAttribute(){}});
 const context=vm.createContext({URL,URLSearchParams,Error,JSON,journal:null,photorealProjectReady:false,ACTIVE_ID:'active',location,
  localStorage:{getItem:key=>data.get(key)||null,removeItem:key=>data.delete(key)},history:{replaceState:(_,__,url)=>{const next=new URL(url,location);location.href=next.href;}},
  ProjectJournal:class{seed(){events.push('seed');}},defaultBathroomProject:()=>({version:2,room:{},items:[]}),restoreProject:()=>restore,
  setWorkspace(){},setView(){},decodeProject:JSON.parse,collectProject:()=>({version:2,room:{},items:[]}),updateHistoryButtons(){},
  placementStatus:message=>events.push(message),document:{createElement:box,querySelector:box},requestAnimationFrame:callback=>callback(),openPhotoreal:()=>events.push('capture')});
 vm.runInContext(initializer+'\n'+resume+'\ninitializeProjectSession();resumePhotorealHandoff();',context);
 return {events,location,ready:context.photorealProjectReady};
}
const failed=scenario({restore:false});
assert(!failed.ready&&!failed.events.includes('capture'),'a rejected guided project never captures the fallback room');
assert(failed.events.some(v=>v.includes('récapitulatif')),'failure leaves a useful route back to the project');
assert(!failed.location.searchParams.has('photoreal'),'failure also consumes the one-shot action');
const invalid=scenario({stored:'{broken'});
assert(!invalid.events.includes('capture'),'invalid stored JSON never triggers an automatic photo');
const valid=scenario();assert(valid.ready&&valid.events.filter(v=>v==='capture').length===1,'a valid restored project triggers exactly one automatic photo');
assert(!valid.location.searchParams.has('photoreal')&&!valid.location.searchParams.has('guided'),'successful one-shot parameters are consumed');
console.log('General photoreal restore: invalid/rejected projects never capture a fallback room; valid restore opens once.');
