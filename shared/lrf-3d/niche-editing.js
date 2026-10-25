import {isItemPositionLocked} from './position-lock.js';

const clone=value=>JSON.parse(JSON.stringify(value));
const positionKeys=['wallKey','u','bottom','width','height','depth'];
const equal=(a,b)=>a===b||!!a&&!!b&&typeof a==='object'&&typeof b==='object'&&Array.isArray(a)===Array.isArray(b)&&Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(key=>Object.hasOwn(b,key)&&equal(a[key],b[key]));

export function sameNichePosition(before,after){
 return !!before&&!!after&&positionKeys.every(key=>before[key]===after[key]);
}

// A locked composition may change only the requested niche. Finishes and the
// lock itself remain editable; moving/resizing/deleting needs its own unlock.
export function allowsNicheUpdate(composition,current,next,id){
 const before=clone(current),after=clone(next),index=(before.niches||[]).findIndex(n=>n.id===id);
 if(index<0)return false;
 const source=before.niches[index],targetIndex=(after.niches||[]).findIndex(n=>n.id===id),target=after.niches?.[targetIndex];
 if(isItemPositionLocked(composition,source)&&(!target||!sameNichePosition(source,target)))return false;
 before.niches.splice(index,1);if(targetIndex>=0)after.niches.splice(targetIndex,1);
 return equal(before,after);
}
