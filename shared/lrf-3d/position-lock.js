// The composition lock protects the room and all elements by default. An
// explicit exception lets one element move without unlocking the whole room.
// Older projects have no exception and retain their original global lock.
export function isItemPositionLocked(composition,item){
 return !!item&&(composition?.locked?item.positionUnlocked!==true:!!item.locked);
}

export function setItemPositionLock(composition,item,locked){
 if(!item)return false;
 item.locked=!!locked;
 if(composition?.locked&&!locked)item.positionUnlocked=true;
 else delete item.positionUnlocked;
 return true;
}

export function setCompositionPositionLock(composition,locked){
 composition.locked=!!locked;
 // A deliberate use of the global button resets its individual exceptions.
 for(const item of composition.items||[])delete item.positionUnlocked;
}
