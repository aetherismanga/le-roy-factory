import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pointerInsidePanels,mountPanelPointerGuard} from '../../shared/lrf-3d/panel-pointer-guard.js';

const element=(left,top,width,height)=>({hidden:false,getAttribute:()=>null,getClientRects:()=>[1],getBoundingClientRect:()=>({left,top,width,height,right:left+width,bottom:top+height}),contains(target){return target?.parent===this;}});
const rail=()=>element(1080,70,320,830);
const event=(target,x,y,id=1)=>({target,clientX:x,clientY:y,pointerId:id,defaultPrevented:false,stopped:false,stopImmediatePropagation(){this.stopped=true;},preventDefault(){this.defaultPrevented=true;}});
const surface=()=>{const handlers=new Map();return {handlers,addEventListener(type,handler){handlers.set(type,handler);},removeEventListener(type,handler){if(handlers.get(type)===handler)handlers.delete(type);}};};

test('docked inspector rail and native scrollbar are UI, while the uncovered 3D scene remains selectable',()=>{
 const panel=rail(),inspector=element(1104,90,270,680),doc={documentElement:{clientWidth:1400}},view={innerWidth:1400};
 assert.equal(pointerInsidePanels(event(panel,1397,250),[panel,inspector],{document:doc,view}),true,'Native scrollbar targets its rail');
 assert.equal(pointerInsidePanels(event({},1397,250),[panel,inspector],{document:doc,view}),true,'Scrollbar may be retargeted outside the inspector DOM');
 assert.equal(pointerInsidePanels(event({parent:inspector},1200,300),[panel,inspector],{document:doc,view}),true);
 assert.equal(pointerInsidePanels(event({},1070,300),[panel,inspector],{document:doc,view}),false,'The UI must not swallow the adjacent 3D wall');
 assert.equal(pointerInsidePanels(event({},500,300),[panel,inspector],{document:doc,view}),false);
 assert.equal(pointerInsidePanels(event({},1395,30),[panel,inspector],{document:doc,view}),false,'Header remains independent');
});

test('real document gutter and a composed UI path remain protected without hidden panels covering the scene',()=>{
 const panel=element(1080,70,305,830),doc={documentElement:{clientWidth:1385}},view={innerWidth:1400};
 assert.equal(pointerInsidePanels(event({},1396,500),[panel],{document:doc,view}),true);
 assert.equal(pointerInsidePanels({...event({},500,300),composedPath:()=>[{},panel]},[panel],{document:doc,view}),true);
 panel.hidden=true;assert.equal(pointerInsidePanels(event(panel,1200,300),[panel],{document:doc,view}),false);
 panel.hidden=false;panel.getClientRects=()=>[];assert.equal(pointerInsidePanels(event(panel,1200,300),[panel],{document:doc,view}),false);
 panel.getClientRects=()=>[1];view.getComputedStyle=()=>({display:'none'});assert.equal(pointerInsidePanels(event(panel,1200,300),[panel],{document:doc,view}),false);
});

test('scrolling keeps native defaults and cannot finish as a new scene selection or camera gesture',()=>{
 const panel=rail(),canvas={},document=surface(),view=surface();view.innerWidth=1400;document.documentElement={clientWidth:1400};
 const guard=mountPanelPointerGuard({canvas,document,view,getPanels:()=>[panel]});
 const down=event(panel,1397,300);document.handlers.get('pointerdown')(down);
 assert.equal(down.defaultPrevented,false);assert.equal(down.stopped,false,'Native scrollbar still receives its pointer event');assert.equal(guard.isPanelInteraction(down),true);
 const move=event(canvas,1397,520);document.handlers.get('pointermove')(move);assert.equal(move.stopped,true);assert.equal(move.defaultPrevented,false);
 const up=event(canvas,1397,520);document.handlers.get('pointerup')(up);assert.equal(up.stopped,true,'A release over the canvas cannot select the wall behind the rail');
 const next=event(canvas,450,300);document.handlers.get('pointerdown')(next);assert.equal(next.stopped,false);assert.equal(guard.isPanelInteraction(next),false);
 // A real 3D drag may cross the UI while the canvas owns pointer capture.
 const sceneMove=event(canvas,1397,520);document.handlers.get('pointermove')(sceneMove);assert.equal(sceneMove.stopped,false);
 const wheel=event(canvas,1397,520);document.handlers.get('wheel')(wheel);assert.equal(wheel.stopped,true);assert.equal(wheel.defaultPrevented,false);
 const sceneWheel=event(canvas,450,300);document.handlers.get('wheel')(sceneWheel);assert.equal(sceneWheel.stopped,false);
 guard.destroy();assert.equal(document.handlers.size,0);assert.equal(view.handlers.size,0);
});

test('touch cancellation, focus loss and reused pointer IDs cannot leave the viewport blocked',()=>{
 const panel=rail(),canvas={},document=surface(),view=surface();const guard=mountPanelPointerGuard({canvas,document,view,getPanels:()=>[panel]});
 for(const release of ['pointercancel','blur']){
  document.handlers.get('pointerdown')(event(panel,1397,300,7));
  if(release==='blur')view.handlers.get('blur')();else document.handlers.get(release)(event(panel,1397,300,7));
  const up=event(canvas,450,300,7);document.handlers.get('pointerup')(up);assert.equal(up.stopped,false);
 }
 document.handlers.get('pointerdown')(event(panel,1397,300,7));
 const reused=event(canvas,450,300,7);document.handlers.get('pointerdown')(reused);assert.equal(reused.stopped,false);
 const up=event(canvas,450,300,7);document.handlers.get('pointerup')(up);assert.equal(up.stopped,false);
 guard.destroy();
});
