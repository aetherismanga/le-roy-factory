import assert from 'node:assert/strict';
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {configureNavigation} from '../src/navigation.js';
import {writeFileSync} from 'node:fs';
function simulate(gesture,reversed){const camera=new T.PerspectiveCamera(42,1,.035,120);camera.position.set(0,1,3);camera.updateMatrixWorld();const control=new OrbitControls(camera,null);control.domElement={clientHeight:600,clientWidth:600};control.enableDamping=false;control.panSpeed=-.65;control.rotateSpeed=-1;if(reversed)configureNavigation(control);const start=camera.position.clone(),target=control.target.clone();
 if(gesture==='mouse-rotate'){control._handleMouseDownRotate({clientX:100,clientY:100});control._handleMouseMoveRotate({clientX:140,clientY:115});}
 if(gesture==='touch-rotate'){control._pointers=[1];control._handleTouchStartRotate({pageX:100,pageY:100});control._handleTouchMoveRotate({pageX:140,pageY:115});control.update();}
 if(gesture==='mouse-pan'){control._handleMouseDownPan({clientX:100,clientY:100});control._handleMouseMovePan({clientX:140,clientY:115});}
 if(gesture==='touch-pan'){control._pointers=[1];control._handleTouchStartPan({pageX:100,pageY:100});control._handleTouchMovePan({pageX:140,pageY:115});control.update();}
 return {position:camera.position.clone().sub(start),target:control.target.clone().sub(target),distance:camera.position.distanceTo(control.target)};
}
for(const gesture of ['mouse-rotate','touch-rotate','mouse-pan','touch-pan']){const a=simulate(gesture,false),b=simulate(gesture,true);assert(a.position.x*b.position.x<0,gesture+' horizontal direction must reverse');assert(a.position.y*b.position.y<0,gesture+' vertical direction must reverse');assert(Math.abs(a.distance-b.distance)<1e-6,'Gestures preserve zoom distance');}
const dummy={};configureNavigation(dummy);assert.equal(dummy.rotateSpeed,1);assert.equal(dummy.panSpeed,.65);configureNavigation(dummy,false);assert.equal(dummy.rotateSpeed,-1);assert.equal(dummy.panSpeed,-.65);configureNavigation(dummy,true);assert.equal(dummy.rotateSpeed,1);
const report={passed:true,at:new Date().toISOString(),checks:['default mouse and touch rotation is opposite to published v12','default mouse and touch pan is opposite to published v12','direction can be toggled both ways','zoom distance unchanged'],browserQA:'CPU camera-control check, not browser rendering'};writeFileSync('qa/navigation-result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
