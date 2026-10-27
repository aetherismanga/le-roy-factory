import * as T from 'three';
// Selecting is distinct from orbiting/panning. Multi-touch cancels the whole tap.
export function tapGesture(threshold=7){
 const pointers=new Set();let candidate=null;
 return {
  down(e){pointers.add(e.pointerId);if(pointers.size===1&&e.button===0)candidate={id:e.pointerId,x:e.clientX,y:e.clientY,t:e.timeStamp};else candidate=null;},
  move(e){if(candidate&&Math.hypot(e.clientX-candidate.x,e.clientY-candidate.y)>threshold)candidate=null;},
  up(e){const c=candidate;pointers.delete(e.pointerId);candidate=null;return !!c&&c.id===e.pointerId&&pointers.size===0&&e.timeStamp-c.t<650&&Math.hypot(e.clientX-c.x,e.clientY-c.y)<=threshold;},
  cancel(e){pointers.delete(e.pointerId);candidate=null;}
 };
}
export function pickSelection(scene,camera,ndc){
 scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);const meshes=[];scene.traverseVisible(o=>{
  if(!o.isMesh)return;
  // First-person hands can sit between the camera and a handle. Their draw
  // group is visual only: taps still reach the actual furniture behind it.
  for(let parent=o;parent;parent=parent.parent)if(parent.userData.skipPicking===true)return;
  meshes.push(o);
 });
 const ray=new T.Raycaster();ray.setFromCamera(ndc,camera);const hit=ray.intersectObjects(meshes,false)[0];if(!hit)return null;
 let editTarget=null,itemId=null;for(let o=hit.object;o;o=o.parent){if(!editTarget&&o.userData.editTarget)editTarget=o.userData.editTarget;if(o.userData.itemId)itemId=o.userData.itemId;}
 return {editTarget,itemId,point:hit.point,object:hit.object,cellKey:hit.object.geometry.userData.faceCells?.[hit.faceIndex]||null};
}
export function pickEditable(scene,camera,ndc){return pickSelection(scene,camera,ndc)?.editTarget||null;}
