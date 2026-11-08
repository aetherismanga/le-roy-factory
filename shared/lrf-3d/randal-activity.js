// Account-bound usage telemetry. No input values, credentials, project contents or query strings are recorded.
export const ACTIVITY_ENDPOINT='https://us-central1-le-roy-factory.cloudfunctions.net/trackLrfActivity';
export function createRandalActivityTracker({source,getCredential,getIdentity=()=>null,document=globalThis.document,view=globalThis.window,now=()=>Date.now(),send=payload=>fetch(ACTIVITY_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),keepalive:true}).catch(()=>{}),setTimer=fn=>setInterval(fn,1000),clearTimer=id=>clearInterval(id)}={}){
 let identity=null,running=false,seq=0,foregroundMs=0,activeMs=0,lastTick=now(),lastInput=now(),lastFlush=0,visitId='',pageId='',exposed=true,disposed=false,lastView='';
 const listeners=[],id=()=>view.crypto.randomUUID(),on=(target,type,fn,options)=>{target?.addEventListener?.(type,fn,options);listeners.push(()=>target?.removeEventListener?.(type,fn,options));};
 const eligible=s=>s?.client?.codeClient==='LRF-00321'&&s.isAdmin!==true;
 const currentView=()=>String(document.body?.dataset.view||'').slice(0,40);
 const visible=()=>!document.hidden&&exposed&&!(source==='portal'&&document.body?.classList.contains('in-workspace'));
 const device=()=>view.innerWidth<=520?'mobile':view.innerWidth<=900?'tablet':'desktop';
 function tick(){const time=now(),delta=Math.max(0,Math.min(5000,time-lastTick));lastTick=time;if(!running)return;if(visible()){foregroundMs+=delta;if(document.hasFocus?.()!==false&&time-lastInput<90000)activeMs+=delta;}}
 function flush(event,extra={}){tick();if(!running||!eligible(identity))return;const sessionToken=getCredential?.();if(typeof sessionToken!=='string'||sessionToken.length<32||sessionToken.includes('.'))return;lastFlush=now();const payload={scope:'randal',sessionToken,source,visitId,pageId,seq:++seq,foregroundMs:Math.floor(foregroundMs),activeMs:Math.floor(activeMs),page:view.location.pathname,view:currentView(),device:device(),visible:visible(),...(event?{event}:{}),...extra};try{Promise.resolve(send(payload)).catch(()=>{});}catch{}}
 function start(){if(running||disposed||!eligible(identity))return;const time=now();let saved;try{saved=JSON.parse(view.sessionStorage.getItem('lrf-randal-activity-visit')||'null');}catch{}visitId=saved&&time-saved.lastAt<1800000&&/^[a-zA-Z0-9_-]{16,80}$/.test(saved.id)?saved.id:id();pageId=id();seq=foregroundMs=activeMs=0;lastInput=lastTick=time;lastView=currentView();running=true;remember();flush('visit');}
 function remember(){try{view.sessionStorage.setItem('lrf-randal-activity-visit',JSON.stringify({id:visitId,lastAt:now()}));}catch{}}
 function stop(){if(running)flush('logout');running=false;identity=null;}
 function updateIdentity(state){if(!eligible(state)){stop();return;}identity=state;start();}
 function input(){tick();if(running&&now()-lastInput>=1800000){flush();running=false;visitId='';try{view.sessionStorage.removeItem('lrf-randal-activity-visit');}catch{}start();}lastInput=now();if(running)remember();}
 let portalOrigin='';try{portalOrigin=new URL(document.referrer).origin;}catch{}
 const embedded=view.parent!==view&&portalOrigin==='https://studio-one-beta-test-v2.vercel.app'&&source!=='portal';if(embedded)exposed=false;
 on(view,'message',e=>{if(embedded&&e.source===view.parent&&e.origin===portalOrigin&&e.data?.type==='lrf-portal-activity'&&typeof e.data.active==='boolean'){tick();exposed=e.data.active;flush();}});
 for(const type of ['pointerdown','keydown','touchstart','wheel'])on(document,type,input,{passive:true,capture:true});
 on(document,'visibilitychange',()=>{tick();flush();});on(view,'pagehide',()=>flush());on(view,'pageshow',()=>{lastTick=now();});
 on(view,'lrf-randal-presentation',e=>flush(e.detail?.open?'fullscreen_open':'fullscreen_close'));
 on(document,'change',e=>{const target=e.target,key=target?.id||'';let field=key.startsWith('randal-product-')?key.slice(15):({'randal-floor-choice':'floor','randal-wall-choice':'wall','randal-brightness':'brightness'})[key];if(field)flush('option_change',{field,value:String(target.selectedOptions?.[0]?.textContent||target.value).slice(0,100)});});
 const buttons={'randal-composition-open':'composition','randal-item-open':'item','randal-reverse-hinge':'hinge','randal-dimensions-toggle':'dimensions'};
 on(document,'click',e=>{const button=e.target?.closest?.('button'),key=buttons[button?.id];if(key==='composition'||key==='item')queueMicrotask(()=>flush(key+'_'+(button.getAttribute('aria-pressed')==='true'?'open':'close')));else if(key)queueMicrotask(()=>flush('option_change',{field:key,value:button.getAttribute('aria-pressed')||button.textContent.slice(0,50)}));});
 const observer=typeof view.MutationObserver==='function'?new view.MutationObserver(()=>{const next=currentView();if(next!==lastView){lastView=next;flush('view');}else tick();}):null;observer?.observe(document.body,{attributes:true,attributeFilter:['data-view','class']});
 const timer=setTimer(()=>{const state=getIdentity();if(state)updateIdentity(state);tick();if(running&&visible()&&now()-lastFlush>=15000)flush();if(foregroundMs>=82800000){flush();running=false;start();}});
 return {setIdentity:updateIdentity,stop,flush,dispose(){flush();disposed=true;running=false;clearTimer(timer);observer?.disconnect();listeners.splice(0).forEach(off=>off());},get running(){return running;}};
}
