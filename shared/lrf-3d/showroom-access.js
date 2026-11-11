const STORAGE_KEY='lrf-showroom-access-v1';
const LOGO='https://leroyfactory.fr/assets/img/logo03lrf.png';
export function showroomAccessEndpoint(origin=globalThis.location?.origin||''){
 return /^https:\/\/(?:studio-one-beta-test-v2|randal-catalogue-general-3d)(?:-[a-z0-9-]+)?\.vercel\.app$/.test(origin)||/^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin)?'/api/showroom-access':'https://randal-catalogue-general-3d.vercel.app/api/showroom-access';
}
export async function verifyShowroomAccess(credentials,{fetchImpl=globalThis.fetch,endpoint=showroomAccessEndpoint(),signal}={}){
 const response=await fetchImpl(endpoint,{method:'POST',credentials:'omit',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(credentials),signal});
 let result;try{result=await response.json();}catch{throw Error('Le service d’accès est indisponible. Réessayez.');}
 if(!response.ok||result?.allowed!==true)throw Error(result?.error||'Accès refusé. Vérifiez le mot de passe.');
 if(typeof result.token!=='string'||!result.token||result.token.length>2048||!Number.isFinite(result.expiresAt)||result.expiresAt<=Date.now())throw Error('La session d’accès est invalide. Réessayez.');
 return {token:result.token,expiresAt:result.expiresAt};
}

// Only the server-issued session is remembered. The door password never enters
// project files, browser storage, URLs or the public application bundle.
export function createShowroomAccess({stage,onOverlay=()=>{},onInvalidate=()=>{},fetchImpl=globalThis.fetch,storage}={}){
 let pending=null;
 try{storage??=globalThis.sessionStorage;}catch{}
 const forget=()=>{try{storage?.removeItem(STORAGE_KEY);}catch{}};
 const remember=session=>{try{storage?.setItem(STORAGE_KEY,JSON.stringify(session));}catch{}};
 function saved(){try{const value=JSON.parse(storage?.getItem(STORAGE_KEY)||'null');if(typeof value?.token==='string'&&value.expiresAt>Date.now())return value;}catch{}forget();return null;}
 function finish(allowed=false){
  const state=pending;if(!state)return;pending=null;state.controller?.abort();state.dialog.close?.();state.dialog.remove();state.previousFocus?.focus?.();onOverlay(false);state.resolve(allowed);onInvalidate();
 }
 function request(){
  if(pending)return pending.promise;
  const dialog=document.createElement('dialog');dialog.className='lrf-showroom-access';dialog.setAttribute('aria-labelledby','lrf-showroom-access-title');
  const style=document.createElement('style');style.textContent=`.lrf-showroom-access{box-sizing:border-box;width:min(410px,calc(100vw - 28px));max-height:calc(100dvh - 28px);overflow:auto;border:1px solid #b8a67b;border-radius:16px;padding:28px;background:#f7f5ef;color:#293b32;font:15px/1.5 system-ui;box-shadow:0 20px 70px #0005}.lrf-showroom-access::backdrop{background:#14251fcc;backdrop-filter:blur(6px)}.lrf-showroom-access img{display:block;width:82px;height:82px;object-fit:contain;margin:0 auto 12px}.lrf-showroom-access h2{text-align:center;font:29px/1.2 Georgia,serif;margin:0 0 12px}.lrf-showroom-access p{margin:0 0 18px}.lrf-showroom-access label{display:block;font-weight:650;margin-bottom:7px}.lrf-showroom-access input{box-sizing:border-box;width:100%;min-height:48px;font:20px system-ui;letter-spacing:6px;padding:10px 14px;border:1px solid #abae9e;border-radius:8px;background:#fff;color:#283a30}.lrf-showroom-access [role=status]{margin:10px 0;min-height:24px;font-size:13px;color:#8c3429}.lrf-showroom-access-actions{display:flex;gap:10px;margin-top:15px}.lrf-showroom-access button{flex:1;min-height:46px;padding:10px;border:1px solid #bfc3b2;border-radius:8px;background:#fff;color:#2d493b;font:650 14px system-ui;cursor:pointer}.lrf-showroom-access button[type=submit]{border-color:#264e3e;background:#264e3e;color:#fff}.lrf-showroom-access button:disabled{opacity:.55;cursor:wait}.lrf-showroom-access :focus-visible{outline:3px solid #ad905a;outline-offset:3px}@media(max-height:500px){.lrf-showroom-access{padding:14px 22px}.lrf-showroom-access img{width:48px;height:48px;margin-bottom:6px}.lrf-showroom-access h2{font-size:23px}.lrf-showroom-access p{margin-bottom:10px}}`;
  const logo=document.createElement('img');logo.src=LOGO;logo.alt='Le Roy Factory';logo.width=82;logo.height=82;
  const title=document.createElement('h2');title.id='lrf-showroom-access-title';title.textContent='Showrooms';
  const intro=document.createElement('p');intro.textContent='Saisissez le mot de passe pour entrer dans les showrooms Le Roy Factory.';
  const form=document.createElement('form'),label=document.createElement('label'),input=document.createElement('input');label.textContent='Mot de passe';input.id='lrf-showroom-password';label.htmlFor=input.id;input.type='password';input.inputMode='numeric';input.autocomplete='current-password';input.maxLength=64;input.required=true;
  const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const actions=document.createElement('div');actions.className='lrf-showroom-access-actions';const cancel=document.createElement('button'),submit=document.createElement('button');cancel.type='button';cancel.textContent='Annuler';submit.type='submit';submit.textContent='Entrer';actions.append(cancel,submit);form.append(label,input,status,actions);dialog.append(style,logo,title,intro,form);
  let resolve;const promise=new Promise(done=>{resolve=done;});const state={dialog,resolve,promise,previousFocus:document.activeElement,controller:null,busy:false};pending=state;
  async function check(credentials,cached=false){
   if(state.busy||pending!==state)return;state.busy=true;submit.disabled=true;input.disabled=true;form.setAttribute('aria-busy','true');status.textContent='Vérification de l’accès…';state.controller=new AbortController();
   try{const session=await verifyShowroomAccess(credentials,{fetchImpl,signal:state.controller.signal});if(pending!==state)return;remember(session);input.value='';finish(true);}
   catch(error){if(pending!==state)return;if(cached)forget();status.textContent=cached?'Votre accès a expiré. Saisissez le mot de passe.':error.message;input.value='';input.disabled=false;input.focus();}
   finally{if(pending===state){state.busy=false;submit.disabled=false;input.disabled=false;form.removeAttribute('aria-busy');}}
  }
  cancel.addEventListener('click',()=>finish(false));dialog.addEventListener('cancel',event=>{event.preventDefault();finish(false);});form.addEventListener('submit',event=>{event.preventDefault();if(!input.value||state.busy)return;const password=input.value;input.value='';check({password});});
  stage.append(dialog);dialog.showModal();onOverlay(true);onInvalidate();const cached=saved();if(cached)check({token:cached.token},true);else input.focus();return promise;
 }
 return {request,close:()=>finish(false),get pending(){return !!pending}};
}
