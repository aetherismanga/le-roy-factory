import {Vector3} from 'three';
// The previously published prototype used negative camera speeds. The new
// default reverses that exact behaviour for both pointer families. Moving an
// object remains separate: it follows the pointer in world coordinates.
export function configureNavigation(controls,inverted=true){
 const direction=inverted?1:-1;
 controls.rotateSpeed=direction;
 controls.panSpeed=.65*direction;
 return controls;
}

// Arrow navigation translates the camera and its orbit target together; the
// direction remains unchanged and mouse-wheel zoom keeps its native controls.
export function translateCameraForKey(camera,controls,key,{step=.18}={}){
 if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(key)||!camera?.position||!controls?.target)return false;
 const forward=new Vector3().subVectors(controls.target,camera.position);forward.y=0;
 if(forward.lengthSq()<1e-8){camera.getWorldDirection?.(forward);forward.y=0;}
 if(forward.lengthSq()<1e-8)forward.set(0,0,-1);forward.normalize();
 const right=new Vector3(-forward.z,0,forward.x),amount=Number.isFinite(step)?Math.max(.01,step):.18;
 const delta=(key==='ArrowLeft'||key==='ArrowRight'?right:forward).multiplyScalar((key==='ArrowLeft'||key==='ArrowDown'?-1:1)*amount);
 camera.position.add(delta);controls.target.add(delta);controls.update();return true;
}
export function navigationInputTarget(target){return !!target?.closest?.('input,textarea,select,[contenteditable="true"],[role="textbox"],[role="menu"],[role="dialog"]');}
