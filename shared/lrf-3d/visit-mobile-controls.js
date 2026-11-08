const DIRECTIONS=Object.freeze({forward:{forward:1,strafe:0},back:{forward:-1,strafe:0},left:{forward:0,strafe:-1},right:{forward:0,strafe:1}});

// Each finger owns its direction. Releasing one finger must not stop another
// held button, and cancelled pointers must never leave the visitor walking.
export function createVisitPadState(onChange=()=>{}){
 const pointers=new Map();
 function emit(){let forward=0,strafe=0;for(const direction of pointers.values()){forward+=direction.forward;strafe+=direction.strafe;}const value={forward:Math.max(-1,Math.min(1,forward)),strafe:Math.max(-1,Math.min(1,strafe))};onChange(value);return value;}
 return {press(id,direction){if(!DIRECTIONS[direction])return false;pointers.set(id,DIRECTIONS[direction]);emit();return true;},release(id){if(pointers.delete(id))emit();},reset(){pointers.clear();emit();},get size(){return pointers.size;}};
}

export async function requestVisitLandscape({stage,document:doc=globalThis.document,screen:display=globalThis.screen}={}){
 let fullscreen=false,locked=false;
 try{if(doc?.fullscreenElement===stage||doc?.webkitFullscreenElement===stage)fullscreen=true;else{const request=stage?.requestFullscreen||stage?.webkitRequestFullscreen;if(request){await request.call(stage);fullscreen=doc?.fullscreenElement===stage||doc?.webkitFullscreenElement===stage;}}}catch{}
 // Orientation locking is available on Android fullscreen and some tablets.
 // Browsers which refuse it keep their normal physical orientation handling.
 if(fullscreen&&display?.orientation?.lock)try{await display.orientation.lock('landscape');locked=true;}catch{}
 return {fullscreen,locked};
}

const STYLE=`
.lrf-visit-mobile-controls{display:none;position:absolute;inset:0;z-index:46;pointer-events:none}
.lrf-visit-mobile-controls[hidden]{display:none!important}
.lrf-visit-mobile-pad{position:absolute;left:max(12px,env(safe-area-inset-left));bottom:max(12px,env(safe-area-inset-bottom));display:grid;grid-template-columns:repeat(3,34px);grid-template-rows:repeat(3,34px);gap:2px;pointer-events:auto;touch-action:none;user-select:none;-webkit-user-select:none}
.lrf-visit-mobile-pad button,.lrf-visit-landscape{box-sizing:border-box;border:1px solid #d4c3a1;background:rgba(30,34,31,.83);color:#fffaf0;box-shadow:0 2px 8px #0002;touch-action:none;font:18px/1 Arial,sans-serif;border-radius:9px;padding:0;min-width:0;min-height:0;cursor:pointer;-webkit-tap-highlight-color:transparent}
.lrf-visit-mobile-pad button[aria-pressed=true]{background:#ae8e52;color:#111}
.lrf-visit-mobile-pad button:focus-visible,.lrf-visit-landscape:focus-visible{outline:2px solid #fff;outline-offset:2px}
.lrf-visit-mobile-pad [data-direction=forward]{grid-area:1/2}.lrf-visit-mobile-pad [data-direction=left]{grid-area:2/1}.lrf-visit-mobile-pad [data-direction=right]{grid-area:2/3}.lrf-visit-mobile-pad [data-direction=back]{grid-area:3/2}
.lrf-visit-mobile-pad::after{content:'';grid-area:2/2;align-self:center;justify-self:center;width:8px;height:8px;border-radius:50%;background:#d4c3a1;pointer-events:none}
.lrf-visit-landscape{position:absolute;top:114px;right:max(12px,env(safe-area-inset-right));min-height:34px;padding:7px 11px;font-size:12px;pointer-events:auto;touch-action:manipulation}
.lrf-visit-orientation-hint{position:absolute;left:130px;right:12px;bottom:max(16px,env(safe-area-inset-bottom));max-width:270px;justify-self:end;margin:0;padding:8px 10px;border-radius:9px;background:#202820e8;color:#fffaf0;font:12px/1.4 Arial,sans-serif;pointer-events:none}
.lrf-visit-orientation-hint[hidden]{display:none!important}
.lrf-visit-expanded{position:fixed!important;inset:0!important;width:100vw!important;max-width:none!important;height:100dvh!important;max-height:none!important;z-index:10000!important}
@media(max-width:760px),(pointer:coarse){
 .lrf-visit-mobile-controls{display:block}
 .lrf-visit-stage.walk-active .scene-title,.lrf-visit-stage.walk-active .view-commands,.lrf-visit-stage.walk-active .viewer-footer{display:none!important}
 .lrf-visit-stage.walk-active .viewer-top>:not(#fullscreen){display:none!important}
 #viewer.lrf-visit-stage.walk-active .walk-hint,.lrf-visit-stage.walk-active .walk-hint{left:130px!important;right:12px!important;bottom:16px!important;max-width:270px!important;font-size:11px!important;padding:8px!important}
}
@media(pointer:coarse) and (max-height:500px){.lrf-visit-landscape{top:108px}.lrf-visit-mobile-pad{grid-template-columns:repeat(3,32px);grid-template-rows:repeat(3,32px)}}
`;

export function mountVisitMobileControls({stage,onInput=()=>{},onInvalidate=()=>{}}){
 const doc=stage.ownerDocument||document,win=doc.defaultView||window;
 if(!doc.getElementById('lrf-visit-mobile-style')){const style=doc.createElement('style');style.id='lrf-visit-mobile-style';style.textContent=STYLE;doc.head.append(style);}
 stage.classList.add('lrf-visit-stage');
 const root=doc.createElement('div');root.className='lrf-visit-mobile-controls';root.hidden=true;
 const pad=doc.createElement('div');pad.className='lrf-visit-mobile-pad';pad.setAttribute('role','group');pad.setAttribute('aria-label','Se déplacer dans la visite 3D');
 const held=new Map(),buttons=new Map();let active=false,expanded=false,requesting=false,ownsFullscreen=false,ownsOrientation=false,savedOverflow=null,hintTimer=null;
 const state=createVisitPadState(value=>{onInput(value);onInvalidate();});
 function release(id){const direction=held.get(id);held.delete(id);state.release(id);if(direction&&!Array.from(held.values()).includes(direction))buttons.get(direction)?.setAttribute('aria-pressed','false');}
 function reset(){held.clear();state.reset();for(const button of buttons.values())button.setAttribute('aria-pressed','false');}
 for(const [direction,label,symbol]of [['forward','Avancer','▲'],['left','Aller à gauche','◀'],['right','Aller à droite','▶'],['back','Reculer','▼']]){
  const button=doc.createElement('button');button.type='button';button.dataset.direction=direction;button.textContent=symbol;button.setAttribute('aria-label',label);button.setAttribute('aria-pressed','false');buttons.set(direction,button);
  button.addEventListener('pointerdown',event=>{if(!active||event.button>0)return;event.preventDefault();event.stopPropagation();held.set(event.pointerId,direction);state.press(event.pointerId,direction);button.setAttribute('aria-pressed','true');button.setPointerCapture?.(event.pointerId);});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,event=>{event.preventDefault();event.stopPropagation();release(event.pointerId);});
  // Keyboard users can also operate the focused pad without a held pointer.
  button.addEventListener('keydown',event=>{if(!active||![' ','Enter'].includes(event.key))return;event.preventDefault();held.set('key-'+direction,direction);state.press('key-'+direction,direction);button.setAttribute('aria-pressed','true');});
  button.addEventListener('keyup',event=>{if(![' ','Enter'].includes(event.key))return;event.preventDefault();release('key-'+direction);});button.addEventListener('blur',()=>release('key-'+direction));pad.append(button);
 }
 const landscape=doc.createElement('button');landscape.type='button';landscape.className='lrf-visit-landscape';landscape.textContent='↔ Horizontal';landscape.setAttribute('aria-label','Visiter en plein écran horizontal');landscape.setAttribute('aria-pressed','false');
 const hint=doc.createElement('p');hint.className='lrf-visit-orientation-hint';hint.hidden=true;hint.setAttribute('role','status');
 function showHint(message){clearTimeout(hintTimer);hint.textContent=message;hint.hidden=false;hintTimer=win.setTimeout(()=>{hint.hidden=true;},6000);}
 const resize=()=>{win.dispatchEvent(new Event('resize'));onInvalidate();};
 async function collapse(){
  expanded=false;stage.classList.remove('lrf-visit-expanded');landscape.textContent='↔ Horizontal';landscape.setAttribute('aria-pressed','false');hint.hidden=true;
  if(ownsOrientation)try{win.screen?.orientation?.unlock?.();}catch{}ownsOrientation=false;
  const exitOwned=ownsFullscreen;ownsFullscreen=false;
  if(exitOwned&&(doc.fullscreenElement===stage||doc.webkitFullscreenElement===stage))try{await (doc.exitFullscreen||doc.webkitExitFullscreen)?.call(doc);}catch{}
  if(savedOverflow!==null){doc.body.style.overflow=savedOverflow;savedOverflow=null;}resize();
 }
 landscape.addEventListener('click',async event=>{
  event.preventDefault();event.stopPropagation();if(requesting)return;reset();if(expanded){await collapse();return;}
  requesting=true;landscape.disabled=true;
  const alreadyFullscreen=doc.fullscreenElement===stage||doc.webkitFullscreenElement===stage;
  const result=await requestVisitLandscape({stage,document:doc,screen:win.screen});
  requesting=false;landscape.disabled=false;
  if(!active){if(result.locked)try{win.screen?.orientation?.unlock?.();}catch{}if(result.fullscreen&&!alreadyFullscreen)try{await (doc.exitFullscreen||doc.webkitExitFullscreen)?.call(doc);}catch{}return;}
  ownsFullscreen=result.fullscreen&&!alreadyFullscreen;ownsOrientation=result.locked;expanded=true;savedOverflow=doc.body.style.overflow;doc.body.style.overflow='hidden';
  if(!result.fullscreen)stage.classList.add('lrf-visit-expanded');landscape.textContent='↙ Réduire';landscape.setAttribute('aria-pressed','true');
  if(!result.locked&&win.innerHeight>win.innerWidth)showHint('Tournez votre téléphone à l’horizontale.');resize();
 });
 function syncFullscreen(){if(ownsFullscreen&&!doc.fullscreenElement&&!doc.webkitFullscreenElement){ownsFullscreen=false;collapse();}}
 function visibility(){if(doc.hidden)reset();}
 root.append(pad,landscape,hint);stage.append(root);win.addEventListener('blur',reset);doc.addEventListener('visibilitychange',visibility);doc.addEventListener('fullscreenchange',syncFullscreen);doc.addEventListener('webkitfullscreenchange',syncFullscreen);
 return {setActive(value){active=!!value;root.hidden=!active;reset();if(!active&&expanded)collapse();},reset,dispose(){reset();clearTimeout(hintTimer);collapse();root.remove();stage.classList.remove('lrf-visit-stage');win.removeEventListener('blur',reset);doc.removeEventListener('visibilitychange',visibility);doc.removeEventListener('fullscreenchange',syncFullscreen);doc.removeEventListener('webkitfullscreenchange',syncFullscreen);}};
}
