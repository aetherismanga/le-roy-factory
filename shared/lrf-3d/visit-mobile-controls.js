import {notifyPortalPresentation} from './randal-presentation-responsive.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const smooth=(start,end,value)=>{const t=clamp((value-start)/(end-start),0,1);return t*t*(3-2*t);};
const stopped=()=>({forward:0,strafe:0,speed:0});

// Unit direction and independent strength: the walk engine must retain speed
// after normalising its world-space direction. Only the outer forward sector
// adds a running boost; backwards movement stays deliberately gentler.
export function visitJoystickInput(x,y,{deadZone=.12,maxSpeed=2.1}={}){
 x=Number(x);y=Number(y);if(!Number.isFinite(x)||!Number.isFinite(y))return stopped();
 const raw=Math.hypot(x,y),radius=Math.min(1,raw);if(radius<=deadZone)return stopped();
 const strafe=x/raw,forward=-y/raw,strength=((radius-deadZone)/(1-deadZone))**1.2;
 const boost=1+(maxSpeed-1)*smooth(.70,1,strength)*smooth(.45,.95,forward);
 return {forward,strafe,speed:strength*boost*(forward<-.2?.75:1)};
}

// Rotation controls layout; fullscreen is best-effort from a visit/joystick
// gesture. This function never locks the phone's physical orientation.
export async function requestVisitLandscape({stage,document:doc=globalThis.document}={}){
 let fullscreen=false;
 try{if(doc?.fullscreenElement===stage||doc?.webkitFullscreenElement===stage)fullscreen=true;else{const request=stage?.requestFullscreen||stage?.webkitRequestFullscreen;if(request){await request.call(stage);fullscreen=doc?.fullscreenElement===stage||doc?.webkitFullscreenElement===stage;}}}catch{}
 return {fullscreen,locked:false};
}

const STYLE=`
.lrf-visit-mobile-controls{display:none;position:absolute;inset:0;z-index:46;pointer-events:none}
.lrf-visit-mobile-controls[hidden]{display:none!important}
.lrf-visit-joystick{box-sizing:border-box;position:absolute;left:max(14px,env(safe-area-inset-left));bottom:max(14px,env(safe-area-inset-bottom));width:104px;height:104px;min-width:0;min-height:0;padding:0;border:1px solid #c9b88dbd;border-radius:50%;background:radial-gradient(circle at 48% 42%,#3f4c40b8,#1c2721b8 75%);box-shadow:inset 0 1px 9px #f0e1ba16,0 3px 14px #07120c38;pointer-events:auto;touch-action:none;user-select:none;-webkit-user-select:none;cursor:grab;-webkit-tap-highlight-color:transparent;overflow:visible}
.lrf-visit-joystick::before{content:'';position:absolute;inset:10px;border:1px solid #d9cda32b;border-radius:50%;pointer-events:none}
.lrf-visit-joystick[aria-pressed=true]{cursor:grabbing;border-color:#e3ce93}
.lrf-visit-joystick[data-fast=true]{border-top:3px solid #ecd390;box-shadow:0 -3px 14px #e7c67f47,0 3px 14px #07120c38}
.lrf-visit-joystick:focus-visible{outline:2px solid #fff4d3;outline-offset:4px}
.lrf-visit-joystick-forward{position:absolute;top:7px;left:0;width:100%;font:9px/1 Arial,sans-serif;text-align:center;color:#e0cc94c9;pointer-events:none}
.lrf-visit-joystick-nub{position:absolute;left:50%;top:50%;width:40px;height:40px;box-sizing:border-box;border:1px solid #e0ce9e;border-radius:50%;background:radial-gradient(circle at 38% 30%,#acb4a0,#586651 75%);box-shadow:0 3px 8px #07120b70,inset 0 1px 3px #fff4cf66;transform:translate(calc(-50% + var(--lrf-stick-x,0px)),calc(-50% + var(--lrf-stick-y,0px)));pointer-events:none}
.lrf-visit-joystick-nub::after{content:'';position:absolute;left:17px;top:17px;width:4px;height:4px;border-radius:50%;background:#f3e4b5}
.lrf-visit-expanded,#viewer.lrf-visit-expanded,.lrf-visit-immersive,#viewer.lrf-visit-immersive{position:fixed!important;inset:auto!important;left:var(--lrf-visit-left,0px)!important;top:var(--lrf-visit-top,0px)!important;width:var(--lrf-visit-width,100vw)!important;min-width:0!important;max-width:none!important;height:var(--lrf-visit-height,100dvh)!important;min-height:0!important;max-height:none!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;transform:none!important;filter:none!important;contain:none!important;z-index:2147483000!important;overflow:hidden!important}
body.lrf-visit-viewport>:not(.lrf-visit-expanded):not(.lrf-visit-immersive):not(dialog[open]):not(script):not(style){visibility:hidden!important;pointer-events:none!important}
.lrf-visit-immersive>canvas,.lrf-visit-expanded>canvas{display:block!important;position:absolute!important;inset:0!important;width:100%!important;height:100%!important;margin:0!important;touch-action:none!important}
.lrf-visit-immersive>:not(canvas):not(.lrf-visit-mobile-controls):not(dialog[open]):not(style){display:none!important}
.lrf-visit-immersive .lrf-visit-mobile-controls{display:block!important}
.lrf-visit-immersive .lrf-visit-mobile-controls>:not(.lrf-visit-joystick){display:none!important}
.lrf-visit-immersive .lrf-visit-joystick{left:max(12px,env(safe-area-inset-left));bottom:max(12px,env(safe-area-inset-bottom))}
@media(max-width:760px),(pointer:coarse){
 .lrf-visit-mobile-controls{display:block}
 .lrf-visit-stage.walk-active .scene-title,.lrf-visit-stage.walk-active .view-commands,.lrf-visit-stage.walk-active .viewer-footer{display:none!important}
 .lrf-visit-stage.walk-active .viewer-top>:not(#fullscreen){display:none!important}
 #viewer.lrf-visit-stage.walk-active .walk-hint,.lrf-visit-stage.walk-active .walk-hint{left:130px!important;right:12px!important;bottom:16px!important;max-width:270px!important;font-size:11px!important;padding:8px!important}
}
@media(pointer:coarse) and (max-height:500px){.lrf-visit-joystick{width:96px;height:96px}}
`;

export function mountVisitMobileControls({stage,onInput=()=>{},onInvalidate=()=>{},onExitRequest=()=>{}}){
 const doc=stage.ownerDocument||document,win=doc.defaultView||window;
 if(!doc.getElementById('lrf-visit-mobile-style')){const style=doc.createElement('style');style.id='lrf-visit-mobile-style';style.textContent=STYLE;doc.head.append(style);}
 stage.classList.add('lrf-visit-stage');
 const root=doc.createElement('div');root.className='lrf-visit-mobile-controls';root.hidden=true;
 const joystick=doc.createElement('button');joystick.type='button';joystick.className='lrf-visit-joystick';joystick.setAttribute('aria-label','Joystick de déplacement : glisser pour marcher, maintenir le centre pour quitter');joystick.setAttribute('aria-pressed','false');joystick.title='Glisser pour marcher · Plus haut pour accélérer · Maintenir au centre pour quitter';
 const forwardMark=doc.createElement('span');forwardMark.className='lrf-visit-joystick-forward';forwardMark.textContent='▲';forwardMark.setAttribute('aria-hidden','true');
 const nub=doc.createElement('span');nub.className='lrf-visit-joystick-nub';nub.setAttribute('aria-hidden','true');joystick.append(forwardMark,nub);root.append(joystick);
 const orientationQuery=win.matchMedia?.('(orientation: landscape)'),coarseQuery=win.matchMedia?.('(pointer:coarse)'),hoverQuery=win.matchMedia?.('(hover:none)'),orientation=win.screen?.orientation;
 let active=false,requesting=false,ownsFullscreen=false,savedOverflow=null,immersive=false,portal=null,exitHold=null,wasFullscreen=false,disposed=false,portalPresented=false,pointerId=null;
 const settleTimers=new Set(),setTimer=(fn,delay)=>win.setTimeout?.(fn,delay),clearTimer=id=>win.clearTimeout?.(id);
 const putVariable=(object,name,value)=>{if(object.style.setProperty)object.style.setProperty(name,value);else object.style[name]=value;};
 function emit(value,x=0,y=0){putVariable(joystick,'--lrf-stick-x',x+'px');putVariable(joystick,'--lrf-stick-y',y+'px');joystick.dataset.fast=value.speed>1?'true':'false';joystick.dataset.speed=value.speed.toFixed(3);onInput(value);onInvalidate();}
 const cancelExitHold=()=>{if(exitHold!==null){clearTimer(exitHold);exitHold=null;}};
 function reset(){pointerId=null;cancelExitHold();joystick.setAttribute('aria-pressed','false');emit(stopped());}
 function point(event){const box=joystick.getBoundingClientRect?.()||{left:0,top:0,width:104,height:104},radius=Math.max(12,Math.min(box.width,box.height)/2-18),x=(event.clientX-box.left-box.width/2)/radius,y=(event.clientY-box.top-box.height/2)/radius;return {x,y,radius,distance:Math.hypot(x,y)};}
 function moveStick(event){const value=point(event),amount=Math.max(1,value.distance);if(value.distance>.18)cancelExitHold();emit(visitJoystickInput(value.x,value.y),value.x/amount*value.radius,value.y/amount*value.radius);return value;}
 joystick.addEventListener('pointerdown',event=>{
  if(!active||event.button>0||pointerId!==null)return;event.preventDefault();event.stopPropagation();pointerId=event.pointerId;joystick.setPointerCapture?.(pointerId);joystick.setAttribute('aria-pressed','true');
  if(immersive&&!isFullscreen()&&!requesting)requestNative();const value=moveStick(event);
  if(value.distance<=.18)exitHold=setTimer(()=>{exitHold=null;if(active&&pointerId===event.pointerId)onExitRequest();},900);
 });
 joystick.addEventListener('pointermove',event=>{if(!active||event.pointerId!==pointerId)return;event.preventDefault();event.stopPropagation();moveStick(event);});
 function release(event){if(event.pointerId!==pointerId)return;event.preventDefault();event.stopPropagation();reset();}
 for(const type of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(type,release);
 joystick.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();if(active&&event.detail===0)onExitRequest();});
 joystick.addEventListener('contextmenu',event=>event.preventDefault());
 const isFullscreen=()=>doc.fullscreenElement===stage||doc.webkitFullscreenElement===stage;
 function orientationState(){
  const type=String(orientation?.type||''),layout=win.innerWidth>0&&win.innerHeight>0?win.innerWidth>win.innerHeight:null,visual=win.visualViewport,actual=visual?.width>0&&visual?.height>0?visual.width>visual.height:layout,media=typeof orientationQuery?.matches==='boolean'?orientationQuery.matches:null;
  // A focused keyboard may shrink an otherwise portrait phone to a wide
  // rectangle. Its unchanged physical screen width distinguishes that from
  // real rotation, where the layout becomes wider than the old screen width.
  const editing=doc.activeElement?.closest?.('input,textarea,select,[contenteditable="true"],[role="textbox"]');
  if(editing&&type.startsWith('portrait')&&win.screen?.width>0&&win.screen?.height>win.screen.width&&win.innerWidth<=win.screen.width*1.1&&win.innerHeight<win.screen.height*.6)return false;
  // WebViews can keep screen.type stale after geometry has already rotated.
  // Agreement between both viewports and CSS orientation wins symmetrically.
  // If only visualViewport is stale, retain the screen/media fallback below.
  if(layout!==null&&actual===layout&&(media===null||media===layout))return layout;
  if(type.startsWith('landscape'))return true;if(type.startsWith('portrait'))return false;
  if(typeof win.orientation==='number')return Math.abs(win.orientation)%180===90;
  return media;
 }
 function viewport(){
  const visual=win.visualViewport,width=visual?.width||win.innerWidth,height=visual?.height||win.innerHeight,expected=orientationState();
  // On Android screen.orientation changes before visualViewport settles. Use
  // the already-rotated layout viewport instead of a stale portrait rectangle.
  if(expected!==null&&(width>height)!==expected&&win.innerWidth>0&&win.innerHeight>0&&(win.innerWidth>win.innerHeight)===expected)return {width:win.innerWidth,height:win.innerHeight,left:0,top:0};
  return {width,height,left:visual?.offsetLeft||0,top:visual?.offsetTop||0};
 }
 const touchDevice=()=>!!(coarseQuery?.matches||win.navigator?.maxTouchPoints>0&&(hoverQuery?.matches||win.navigator?.userAgentData?.mobile===true||/Android.*Mobile|iPhone|iPod/i.test(win.navigator?.userAgent||'')));
 function takeStage(){
  if(portal)return;const parent=stage.parentNode||stage.parentElement,placeholder=doc.createElement('span');placeholder.hidden=true;placeholder.setAttribute('aria-hidden','true');portal={parent,placeholder};
  if(parent?.insertBefore)parent.insertBefore(placeholder,stage);doc.body.append(stage);if(savedOverflow===null)savedOverflow=doc.body.style.overflow;doc.body.style.overflow='hidden';doc.body.classList.add('lrf-visit-viewport');
 }
 function restoreStage(){if(!portal)return;const {parent,placeholder}=portal;portal=null;if(parent?.insertBefore)parent.insertBefore(stage,placeholder);placeholder.remove();if(savedOverflow!==null){doc.body.style.overflow=savedOverflow;savedOverflow=null;}doc.body.classList.remove('lrf-visit-viewport');}
 function syncPortalPresentation(open){if(portalPresented===!!open)return;portalPresented=!!open;notifyPortalPresentation(portalPresented,{view:win,document:doc});}
 function syncLayout(){
  if(disposed&&active)return;const box=viewport(),direction=orientationState();immersive=!!(active&&touchDevice()&&(direction===null?box.width>box.height:direction));
  if(immersive){takeStage();stage.classList.add('lrf-visit-immersive');for(const [key,value]of Object.entries(box))putVariable(stage,'--lrf-visit-'+key,value+'px');}
  else{stage.classList.remove('lrf-visit-expanded','lrf-visit-immersive');restoreStage();}
  syncPortalPresentation(immersive);onInvalidate();
 }
 async function releaseNative(){const owned=ownsFullscreen;ownsFullscreen=false;if(owned&&isFullscreen())try{await (doc.exitFullscreen||doc.webkitExitFullscreen)?.call(doc);}catch{}}
 async function requestNative(){
  if(requesting||disposed||!active||!immersive)return;requesting=true;const alreadyFullscreen=isFullscreen(),result=await requestVisitLandscape({stage,document:doc});requesting=false;
  if(!active||disposed||!immersive){if(result.fullscreen&&!alreadyFullscreen)try{await (doc.exitFullscreen||doc.webkitExitFullscreen)?.call(doc);}catch{}return;}
  ownsFullscreen=ownsFullscreen||result.fullscreen&&!alreadyFullscreen;wasFullscreen=isFullscreen();syncLayout();
 }
 function syncFullscreen(){const present=isFullscreen(),left=wasFullscreen&&!present;wasFullscreen=present;if(left){ownsFullscreen=false;if(active&&immersive)onExitRequest();}}
 function syncViewport(){const wasImmersive=immersive;syncLayout();if(wasImmersive&&!immersive){reset();releaseNative();}}
 function clearSettles(){for(const timer of settleTimers)clearTimer(timer);settleTimers.clear();}
 function settleRotation(){
  reset();syncViewport();clearSettles();
  // Chrome/WebView can deliver orientation, layout and visual viewport updates
  // separately. Reconcile their final geometry without requiring another tap.
  for(const delay of [0,80,220,500,1000]){let timer;timer=setTimer(()=>{settleTimers.delete(timer);if(active&&!disposed)syncViewport();},delay);if(timer!==undefined)settleTimers.add(timer);}
 }
 function visibility(){if(doc.hidden)reset();else if(active)settleRotation();}
 const listenQuery=(query,handler)=>{if(query?.addEventListener)query.addEventListener('change',handler);else query?.addListener?.(handler);};
 const unlistenQuery=(query,handler)=>{if(query?.removeEventListener)query.removeEventListener('change',handler);else query?.removeListener?.(handler);};
 stage.append(root);win.addEventListener('blur',reset);win.addEventListener('resize',syncViewport);win.addEventListener('orientationchange',settleRotation);win.addEventListener('pageshow',settleRotation);
 win.visualViewport?.addEventListener('resize',syncViewport);win.visualViewport?.addEventListener('scroll',syncViewport);orientation?.addEventListener?.('change',settleRotation);listenQuery(orientationQuery,settleRotation);listenQuery(coarseQuery,syncViewport);listenQuery(hoverQuery,syncViewport);
 doc.addEventListener('visibilitychange',visibility);doc.addEventListener('fullscreenchange',syncFullscreen);doc.addEventListener('webkitfullscreenchange',syncFullscreen);
 return {setActive(value){active=!!value;root.hidden=!active;reset();clearSettles();syncLayout();if(!active)releaseNative();else{if(immersive)requestNative();}},reset,get immersive(){return immersive;},get joystick(){return joystick;},dispose(){disposed=true;active=false;reset();clearSettles();syncLayout();releaseNative();root.remove();stage.classList.remove('lrf-visit-stage');win.removeEventListener('blur',reset);win.removeEventListener('resize',syncViewport);win.removeEventListener('orientationchange',settleRotation);win.removeEventListener('pageshow',settleRotation);win.visualViewport?.removeEventListener('resize',syncViewport);win.visualViewport?.removeEventListener('scroll',syncViewport);orientation?.removeEventListener?.('change',settleRotation);unlistenQuery(orientationQuery,settleRotation);unlistenQuery(coarseQuery,syncViewport);unlistenQuery(hoverQuery,syncViewport);doc.removeEventListener('visibilitychange',visibility);doc.removeEventListener('fullscreenchange',syncFullscreen);doc.removeEventListener('webkitfullscreenchange',syncFullscreen);}};
}
