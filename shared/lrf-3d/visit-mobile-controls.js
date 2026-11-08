import {notifyPortalPresentation} from './randal-presentation-responsive.js';
const DIRECTIONS=Object.freeze({forward:{forward:1,strafe:0},back:{forward:-1,strafe:0},left:{forward:0,strafe:-1},right:{forward:0,strafe:1}});

// Each finger owns its direction. Releasing one finger must not stop another
// held button, and cancelled pointers must never leave the visitor walking.
export function createVisitPadState(onChange=()=>{}){
 const pointers=new Map();
 function emit(){let forward=0,strafe=0;for(const direction of pointers.values()){forward+=direction.forward;strafe+=direction.strafe;}const value={forward:Math.max(-1,Math.min(1,forward)),strafe:Math.max(-1,Math.min(1,strafe))};onChange(value);return value;}
 return {press(id,direction){if(!DIRECTIONS[direction])return false;pointers.set(id,DIRECTIONS[direction]);emit();return true;},release(id){if(pointers.delete(id))emit();},reset(){pointers.clear();emit();},get size(){return pointers.size;}};
}

// Rotation controls the layout. Native fullscreen is requested only from a
// visit/pad gesture; the phone orientation is never locked by this helper.
export async function requestVisitLandscape({stage,document:doc=globalThis.document}={}){
 let fullscreen=false;
 try{if(doc?.fullscreenElement===stage||doc?.webkitFullscreenElement===stage)fullscreen=true;else{const request=stage?.requestFullscreen||stage?.webkitRequestFullscreen;if(request){await request.call(stage);fullscreen=doc?.fullscreenElement===stage||doc?.webkitFullscreenElement===stage;}}}catch{}
 return {fullscreen,locked:false};
}

const STYLE=`
.lrf-visit-mobile-controls{display:none;position:absolute;inset:0;z-index:46;pointer-events:none}
.lrf-visit-mobile-controls[hidden]{display:none!important}
.lrf-visit-mobile-pad{position:absolute;left:max(12px,env(safe-area-inset-left));bottom:max(12px,env(safe-area-inset-bottom));display:grid;grid-template-columns:repeat(3,34px);grid-template-rows:repeat(3,34px);gap:2px;pointer-events:auto;touch-action:none;user-select:none;-webkit-user-select:none}
.lrf-visit-mobile-pad button{box-sizing:border-box;border:1px solid #d4c3a1;background:rgba(30,34,31,.83);color:#fffaf0;box-shadow:0 2px 8px #0002;touch-action:none;font:18px/1 Arial,sans-serif;border-radius:9px;padding:0;min-width:0;min-height:0;cursor:pointer;-webkit-tap-highlight-color:transparent}
.lrf-visit-mobile-pad button[aria-pressed=true]{background:#ae8e52;color:#111}
.lrf-visit-mobile-pad button:focus-visible{outline:2px solid #fff;outline-offset:2px}
.lrf-visit-mobile-pad [data-direction=forward]{grid-area:1/2}.lrf-visit-mobile-pad [data-direction=left]{grid-area:2/1}.lrf-visit-mobile-pad [data-direction=right]{grid-area:2/3}.lrf-visit-mobile-pad [data-direction=back]{grid-area:3/2}
.lrf-visit-mobile-pad .lrf-visit-pad-exit{grid-area:2/2;border:0;background:transparent;box-shadow:none;color:#d4c3a1;font-size:10px}
.lrf-visit-expanded,#viewer.lrf-visit-expanded,.lrf-visit-immersive,#viewer.lrf-visit-immersive{position:fixed!important;inset:auto!important;left:var(--lrf-visit-left,0px)!important;top:var(--lrf-visit-top,0px)!important;width:var(--lrf-visit-width,100vw)!important;min-width:0!important;max-width:none!important;height:var(--lrf-visit-height,100dvh)!important;min-height:0!important;max-height:none!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;transform:none!important;filter:none!important;contain:none!important;z-index:2147483000!important;overflow:hidden!important}
body.lrf-visit-viewport>:not(.lrf-visit-expanded):not(.lrf-visit-immersive):not(dialog[open]):not(script):not(style){visibility:hidden!important;pointer-events:none!important}
.lrf-visit-immersive>canvas,.lrf-visit-expanded>canvas{display:block!important;position:absolute!important;inset:0!important;width:100%!important;height:100%!important;margin:0!important;touch-action:none!important}
.lrf-visit-immersive>:not(canvas):not(.lrf-visit-mobile-controls):not(dialog[open]):not(style){display:none!important}
.lrf-visit-immersive .lrf-visit-mobile-controls{display:block!important}
.lrf-visit-immersive .lrf-visit-mobile-controls>:not(.lrf-visit-mobile-pad){display:none!important}
.lrf-visit-immersive .lrf-visit-mobile-pad{left:max(10px,env(safe-area-inset-left));bottom:max(10px,env(safe-area-inset-bottom));grid-template-columns:repeat(3,34px);grid-template-rows:repeat(3,34px)}
@media(max-width:760px),(pointer:coarse){
 .lrf-visit-mobile-controls{display:block}
 .lrf-visit-stage.walk-active .scene-title,.lrf-visit-stage.walk-active .view-commands,.lrf-visit-stage.walk-active .viewer-footer{display:none!important}
 .lrf-visit-stage.walk-active .viewer-top>:not(#fullscreen){display:none!important}
 #viewer.lrf-visit-stage.walk-active .walk-hint,.lrf-visit-stage.walk-active .walk-hint{left:130px!important;right:12px!important;bottom:16px!important;max-width:270px!important;font-size:11px!important;padding:8px!important}
}
@media(pointer:coarse) and (max-height:500px){.lrf-visit-mobile-pad{grid-template-columns:repeat(3,32px);grid-template-rows:repeat(3,32px)}}
`;

export function mountVisitMobileControls({stage,onInput=()=>{},onInvalidate=()=>{},onExitRequest=()=>{}}){
 const doc=stage.ownerDocument||document,win=doc.defaultView||window;
 if(!doc.getElementById('lrf-visit-mobile-style')){const style=doc.createElement('style');style.id='lrf-visit-mobile-style';style.textContent=STYLE;doc.head.append(style);}
 stage.classList.add('lrf-visit-stage');
 const root=doc.createElement('div');root.className='lrf-visit-mobile-controls';root.hidden=true;
 const pad=doc.createElement('div');pad.className='lrf-visit-mobile-pad';pad.setAttribute('role','group');pad.setAttribute('aria-label','Se déplacer dans la visite 3D');
 const held=new Map(),buttons=new Map();let active=false,requesting=false,ownsFullscreen=false,savedOverflow=null,immersive=false,portal=null,exitHold=null,wasFullscreen=false,disposed=false,portalPresented=false;
 const state=createVisitPadState(value=>{onInput(value);onInvalidate();});
 function release(id){const direction=held.get(id);held.delete(id);state.release(id);if(direction&&!Array.from(held.values()).includes(direction))buttons.get(direction)?.setAttribute('aria-pressed','false');}
 function reset(){held.clear();state.reset();for(const button of buttons.values())button.setAttribute('aria-pressed','false');}
 for(const [direction,label,symbol]of [['forward','Avancer','▲'],['left','Aller à gauche','◀'],['right','Aller à droite','▶'],['back','Reculer','▼']]){
  const button=doc.createElement('button');button.type='button';button.dataset.direction=direction;button.textContent=symbol;button.setAttribute('aria-label',label);button.setAttribute('aria-pressed','false');buttons.set(direction,button);
  button.addEventListener('pointerdown',event=>{if(!active||event.button>0)return;event.preventDefault();event.stopPropagation();if(immersive&&!isFullscreen()&&!requesting)requestNative();held.set(event.pointerId,direction);state.press(event.pointerId,direction);button.setAttribute('aria-pressed','true');button.setPointerCapture?.(event.pointerId);});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,event=>{event.preventDefault();event.stopPropagation();release(event.pointerId);});
  button.addEventListener('keydown',event=>{if(!active||![' ','Enter'].includes(event.key))return;event.preventDefault();held.set('key-'+direction,direction);state.press('key-'+direction,direction);button.setAttribute('aria-pressed','true');});
  button.addEventListener('keyup',event=>{if(![' ','Enter'].includes(event.key))return;event.preventDefault();release('key-'+direction);});button.addEventListener('blur',()=>release('key-'+direction));pad.append(button);
 }
 const exit=doc.createElement('button');exit.type='button';exit.className='lrf-visit-pad-exit';exit.textContent='●';exit.setAttribute('aria-label','Maintenir pour quitter la visite');exit.title='Maintenir pour quitter la visite';
 const cancelExitHold=()=>{if(exitHold!==null){win.clearTimeout?.(exitHold);exitHold=null;}};
 exit.addEventListener('pointerdown',event=>{event.preventDefault();event.stopPropagation();cancelExitHold();exit.setPointerCapture?.(event.pointerId);exitHold=win.setTimeout(()=>{exitHold=null;if(active)onExitRequest();},700);});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])exit.addEventListener(type,cancelExitHold);
 exit.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();if(event.detail===0&&active)onExitRequest();});pad.append(exit);
 const isFullscreen=()=>doc.fullscreenElement===stage||doc.webkitFullscreenElement===stage;
 const viewport=()=>({width:win.visualViewport?.width||win.innerWidth,height:win.visualViewport?.height||win.innerHeight,left:win.visualViewport?.offsetLeft||0,top:win.visualViewport?.offsetTop||0});
 const touchDevice=()=>win.matchMedia?!!(win.matchMedia('(pointer:coarse)').matches||win.navigator?.maxTouchPoints>0&&win.matchMedia('(hover:none)').matches):win.navigator?.maxTouchPoints>0;
 const putVariable=(name,value)=>{if(stage.style.setProperty)stage.style.setProperty(name,value);else stage.style[name]=value;};
 function takeStage(){
  if(portal)return;
  const parent=stage.parentNode||stage.parentElement,placeholder=doc.createElement('span');placeholder.hidden=true;placeholder.setAttribute('aria-hidden','true');
  portal={parent,placeholder};if(parent?.insertBefore)parent.insertBefore(placeholder,stage);doc.body.append(stage);
  if(savedOverflow===null)savedOverflow=doc.body.style.overflow;doc.body.style.overflow='hidden';doc.body.classList.add('lrf-visit-viewport');
 }
 function restoreStage(){
  if(!portal)return;const {parent,placeholder}=portal;portal=null;
  if(parent?.insertBefore)parent.insertBefore(stage,placeholder);placeholder.remove();
  if(savedOverflow!==null){doc.body.style.overflow=savedOverflow;savedOverflow=null;}doc.body.classList.remove('lrf-visit-viewport');
 }
 function syncPortalPresentation(open){if(portalPresented===!!open)return;portalPresented=!!open;notifyPortalPresentation(portalPresented,{view:win,document:doc});}
 function syncLayout(){
  const box=viewport();immersive=!!(active&&touchDevice()&&box.width>box.height);
  if(immersive){takeStage();stage.classList.add('lrf-visit-immersive');for(const [key,value]of Object.entries(box))putVariable('--lrf-visit-'+key,value+'px');}
  else{stage.classList.remove('lrf-visit-expanded','lrf-visit-immersive');restoreStage();}
  // Keep the private RANDAL parent chrome in step with physical phone rotation.
  syncPortalPresentation(immersive);onInvalidate();
 }
 async function releaseNative(){
  const exitOwned=ownsFullscreen;ownsFullscreen=false;
  if(exitOwned&&isFullscreen())try{await (doc.exitFullscreen||doc.webkitExitFullscreen)?.call(doc);}catch{}
 }
 async function requestNative(){
  if(requesting||disposed||!active||!immersive)return;requesting=true;
  const alreadyFullscreen=isFullscreen(),result=await requestVisitLandscape({stage,document:doc});requesting=false;
  if(!active||disposed||!immersive){if(result.fullscreen&&!alreadyFullscreen)try{await (doc.exitFullscreen||doc.webkitExitFullscreen)?.call(doc);}catch{}return;}
  ownsFullscreen=ownsFullscreen||result.fullscreen&&!alreadyFullscreen;wasFullscreen=isFullscreen();syncLayout();
 }
 function syncFullscreen(){
  const present=isFullscreen(),left=wasFullscreen&&!present;wasFullscreen=present;
  if(left){ownsFullscreen=false;if(active&&immersive)onExitRequest();}
 }
 function syncViewport(){const wasImmersive=immersive;syncLayout();if(wasImmersive&&!immersive)releaseNative();}
 function blur(){reset();cancelExitHold();}
 function visibility(){if(doc.hidden)blur();}
 root.append(pad);stage.append(root);win.addEventListener('blur',blur);win.addEventListener('resize',syncViewport);win.addEventListener('orientationchange',syncViewport);
 win.visualViewport?.addEventListener('resize',syncViewport);win.visualViewport?.addEventListener('scroll',syncViewport);
 doc.addEventListener('visibilitychange',visibility);doc.addEventListener('fullscreenchange',syncFullscreen);doc.addEventListener('webkitfullscreenchange',syncFullscreen);
 return {setActive(value){active=!!value;root.hidden=!active;reset();cancelExitHold();syncLayout();if(!active)releaseNative();else if(immersive)requestNative();},reset,get immersive(){return immersive;},dispose(){disposed=true;active=false;reset();cancelExitHold();syncLayout();releaseNative();root.remove();stage.classList.remove('lrf-visit-stage');win.removeEventListener('blur',blur);win.removeEventListener('resize',syncViewport);win.removeEventListener('orientationchange',syncViewport);win.visualViewport?.removeEventListener('resize',syncViewport);win.visualViewport?.removeEventListener('scroll',syncViewport);doc.removeEventListener('visibilitychange',visibility);doc.removeEventListener('fullscreenchange',syncFullscreen);doc.removeEventListener('webkitfullscreenchange',syncFullscreen);}};
}
