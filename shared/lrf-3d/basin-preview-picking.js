import {tapGesture,pickSelection} from './picking.js';
export function bindPreviewBasinPicker(canvas,scene,camera,onSelect){
 const gesture=tapGesture(),touch=new AbortController(),listen=(event,fn)=>canvas.addEventListener(event,fn,{signal:touch.signal});
 listen('pointerdown',e=>gesture.down(e));listen('pointermove',e=>gesture.move(e));listen('pointercancel',e=>gesture.cancel(e));
 listen('pointerup',e=>{
  if(!gesture.up(e))return;
  const box=canvas.getBoundingClientRect();if(!box.width||!box.height)return;
  const hit=pickSelection(scene,camera,{x:2*(e.clientX-box.left)/box.width-1,y:1-2*(e.clientY-box.top)/box.height});
  if(hit?.editTarget==='basin'&&hit.itemId)onSelect(hit.itemId);
 });
 return ()=>touch.abort();
}
