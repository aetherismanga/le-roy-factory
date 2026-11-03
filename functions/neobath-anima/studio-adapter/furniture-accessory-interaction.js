export function isFurnitureAccessoryHit(hit){for(let object=hit?.object;object;object=object.parent)if(object.userData?.animaAccessoriesTarget||object.userData?.animaFurnitureAccessory)return true;return hit?.editTarget==='cabinet-accessories';}
// SideBar and Bridge are configured in place: their short tap must never start
// the furniture drag controller installed later on the same canvas.
export function setupFurnitureAccessoryPicking({canvas,controls,enabled=()=>true,pick,onTap=()=>{}}){
 let active=null;const listeners=[],suppressed=new Set(),consume=event=>{event.preventDefault?.();event.stopImmediatePropagation?.();};
 const finish=(cancel,event)=>{const saved=active;if(!saved)return;active=null;controls.enabled=saved.controlsEnabled;try{if(canvas.hasPointerCapture?.(saved.id))canvas.releasePointerCapture(saved.id);}catch{}if(!cancel&&event&&enabled()&&Math.hypot(event.clientX-saved.x,event.clientY-saved.y)<=6&&event.timeStamp-saved.time<650)onTap(saved.hit);};
 const down=event=>{if(suppressed.size){suppressed.add(event.pointerId);consume(event);return;}if(active&&active.id!==event.pointerId){suppressed.add(active.id);suppressed.add(event.pointerId);consume(event);finish(true);return;}if(event.button!==0||!enabled())return;const hit=pick(event);if(!hit?.itemId||!isFurnitureAccessoryHit(hit))return;consume(event);active={id:event.pointerId,hit,x:event.clientX,y:event.clientY,time:event.timeStamp,controlsEnabled:controls.enabled};controls.enabled=false;try{canvas.setPointerCapture(event.pointerId);}catch{}};
 const move=event=>{if(suppressed.has(event.pointerId)||active?.id===event.pointerId){consume(event);if(!enabled())finish(true);}};
 const up=event=>{if(suppressed.delete(event.pointerId)){consume(event);return;}if(active?.id===event.pointerId){consume(event);finish(false,event);}};
 const cancel=event=>{if(suppressed.delete(event.pointerId)){consume(event);return;}if(active?.id===event.pointerId){consume(event);finish(true);}};
 for(const[name,handler]of[['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',cancel],['lostpointercapture',cancel]]){canvas.addEventListener(name,handler,true);listeners.push([name,handler]);}
 return {cancel:()=>finish(true),getActive:()=>active,dispose(){finish(true);suppressed.clear();listeners.forEach(([name,handler])=>canvas.removeEventListener(name,handler,true));}};
}
