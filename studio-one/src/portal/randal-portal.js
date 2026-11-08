import {mountPortalSlideshow} from './slideshow.js';
import {commercialRequest,getSessionCredential} from '../commerce/client.js';
import {createRandalPortalSession,randalPortalFrameURL,RANDAL_PORTAL_ORIGINS} from '../../../shared/lrf-3d/randal-portal-session.js';
const $=id=>document.getElementById(id),frames=new Map(),pendingEnd=new Map();
let active=null,ending=false;
const text={fr:{header:'Votre espace de composition',choose:'Les deux configurateurs',logout:'Se déconnecter',eyebrow:'Les ateliers RANDAL',title:'Votre espace.<br><em>Votre signature.</em>',intro:'Deux configurateurs, un seul espace pour composer vos projets.',private:'Accès réservé',loginTitle:'Connexion',help:'Utilisez les identifiants de votre compte client RANDAL.',code:'Code d’accès',identifier:'Identifiant',postal:'Clé',submit:'Se connecter',waiting:'Vérification de votre compte…',chooser:'Choisissez votre configurateur',studioLabel:'Sur mesure',studioDescription:'Vos dimensions, vos finitions, votre composition.',studioAction:'Entrer dans STUDIO ONE',generalLabel:'Les collections RANDAL',generalTitle:'Catalogue général',generalDescription:'Composez avec les collections, matières et finitions RANDAL.',generalAction:'Découvrir les collections',imageNote:'Visuels d’inspiration. Les produits et options se choisissent dans les configurateurs.',footer:'RANDAL · Conception des configurateurs : LE ROY FACTORY',expired:'Votre session a expiré. Reconnectez votre compte LRF RANDAL.',refused:'Connexion refusée. Vérifiez vos identifiants LRF RANDAL.'},es:{header:'Su espacio de diseño',choose:'Los dos configuradores',logout:'Cerrar sesión',eyebrow:'Los talleres RANDAL',title:'Su espacio.<br><em>Su estilo.</em>',intro:'Dos configuradores, un solo espacio para crear sus proyectos.',private:'Acceso reservado',loginTitle:'Acceso',help:'Utilice los datos de acceso de su cuenta de cliente RANDAL.',code:'Código de acceso',identifier:'Identificador',postal:'Clave',submit:'Iniciar sesión',waiting:'Verificando su cuenta…',chooser:'Elija su configurador',studioLabel:'A medida',studioDescription:'Sus medidas, sus acabados, su composición.',studioAction:'Entrar en STUDIO ONE',generalLabel:'Las colecciones RANDAL',generalTitle:'Catálogo general',generalDescription:'Combine las colecciones, los materiales y los acabados RANDAL.',generalAction:'Descubrir las colecciones',imageNote:'Imágenes de inspiración. Los productos y las opciones se eligen en los configuradores.',footer:'RANDAL · Desarrollo de los configuradores: LE ROY FACTORY',expired:'Su sesión ha caducado. Conecte de nuevo su cuenta LRF RANDAL.',refused:'Acceso rechazado. Compruebe sus datos LRF RANDAL.'}};
let lang=new URLSearchParams(location.search).get('lang')==='fr'?'fr':'es';
const words=()=>text[lang];
function translate(){
 document.documentElement.lang=lang;$('language').value=lang;
 const w=words(),mapping={'header-label':'header',choose:'choose',logout:'logout',eyebrow:'eyebrow',intro:'intro','private-label':'private','login-title':'loginTitle','login-help':'help','code-label':'code','postal-label':'postal','login-submit':'submit','chooser-title':'chooser','studio-label':'studioLabel','studio-description':'studioDescription','studio-action':'studioAction','general-label':'generalLabel','general-title':'generalTitle','general-description':'generalDescription','general-action':'generalAction','image-note':'imageNote',footer:'footer'};
 for(const [id,key]of Object.entries(mapping))$(id).textContent=w[key];$('title').innerHTML=w.title;const identifier=document.querySelector?.('[name=codeClient]');if(identifier)identifier.placeholder=w.identifier;const key=document.querySelector?.('[name=departement]');if(key)key.placeholder=w.postal;globalThis.dispatchEvent?.(new Event('randal-portal-language'));
}
function shareActivity(){for(const [variant,frame]of frames)frame.contentWindow?.postMessage({type:'lrf-portal-activity',active:variant===active},RANDAL_PORTAL_ORIGINS[variant]);}
function showChooser(){active=null;document.body.classList.remove('in-workspace','randal-view-fullscreen');$('workspace').hidden=true;$('landing').hidden=false;for(const frame of frames.values())frame.hidden=true;$('choose').hidden=true;shareActivity();}
function render(state){
 const allowed=session.allowed();$('login-submit').disabled=state.pending;
 $('login-status').textContent=state.pending?words().waiting:state.error?(lang==='es'?words().refused:state.error):'';
 $('login').hidden=allowed;$('configurators').hidden=!allowed;$('logout').hidden=!allowed;$('landing').classList.toggle('connected',allowed);
 $('account-name').textContent=allowed?(state.client.societe||'RANDAL')+' · '+state.client.codeClient:'';
 if(!allowed)showChooser();
}
const session=createRandalPortalSession({request:commercialRequest,getCredential:getSessionCredential,changed:()=>queueMicrotask(()=>render(session.state))});
function openConfigurator(variant){
 if(!session.allowed()||!Object.hasOwn(RANDAL_PORTAL_ORIGINS,variant))return;
 let frame=frames.get(variant);
 if(!frame){
  frame=document.createElement('iframe');frame.title=variant==='studio'?'RANDAL STUDIO ONE':'RANDAL Catalogue général';
  frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-downloads allow-modals');
  frame.setAttribute('allow','fullscreen');frame.setAttribute('allowfullscreen','');frame.referrerPolicy='strict-origin-when-cross-origin';
  frame.src=randalPortalFrameURL(variant,lang);frames.set(variant,frame);$('workspace').append(frame);
 }
 for(const [key,value]of frames)value.hidden=key!==variant;
 active=variant;$('workspace').hidden=false;$('landing').hidden=true;$('choose').hidden=false;document.body.classList.add('in-workspace');shareActivity();
}
async function endSession(expired=false){
 if(ending)return;ending=true;showChooser();
 // A tab switch keeps projects alive; logout instead explicitly clears both
 // visited applications before removing their frames and this portal's token.
 const waits=[...frames].map(([variant,frame])=>new Promise(resolve=>{
  const requestId=crypto.randomUUID();const timeout=setTimeout(()=>{pendingEnd.delete(requestId);resolve();},1800);
  pendingEnd.set(requestId,{frame,variant,resolve:()=>{clearTimeout(timeout);pendingEnd.delete(requestId);resolve();}});
  frame.contentWindow?.postMessage({type:'lrf-portal-end-session',requestId},RANDAL_PORTAL_ORIGINS[variant]);
 }));
 session.lock(expired?words().expired:'');
 await Promise.allSettled(waits);for(const frame of frames.values())frame.remove();frames.clear();
 try{await session.logout();}catch{/* Local token and UI are cleared even offline. */}
 if(expired)session.lock(words().expired);ending=false;$('login-form').reset();$('login-form').elements.codeClient.focus();
}
addEventListener('message',event=>{
 const match=[...frames].find(([variant,frame])=>event.source===frame.contentWindow&&event.origin===RANDAL_PORTAL_ORIGINS[variant]);
 if(!match)return;const [variant,frame]=match,data=event.data;
 if(session.sendSession(event,frame,variant)){shareActivity();frame.contentWindow.postMessage({type:'lrf-portal-language',locale:lang},RANDAL_PORTAL_ORIGINS[variant]);return;}
 if(data?.type==='lrf-ui-language'&&['fr','es'].includes(data.locale)){changeLanguage(data.locale);return;}
 if(data?.type==='lrf-portal-session-ended'){
  const pending=pendingEnd.get(data.requestId);if(pending?.frame===frame&&pending.variant===variant)pending.resolve();return;
 }
 if(data?.type==='lrf-portal-presentation'&&typeof data.open==='boolean'){if(variant===active)document.body.classList.toggle('randal-view-fullscreen',data.open);return;}
 if(data?.type==='lrf-portal-exit'){showChooser();return;}
 if(data?.type==='lrf-portal-logout'||data?.type==='lrf-portal-auth-required'){void endSession(data.type==='lrf-portal-auth-required');return;}
 // Public-gallery requests can only switch between the two fixed applications.
 // The restricted account still cannot open the workshop or a different site.
 if(data?.type==='lrf-portal-open'){
  const target=data.variant==='studio-one'?'studio':data.variant==='randal-general'?'general':null;
  if(target)openConfigurator(target);
 }
});
$('login-form').addEventListener('submit',async event=>{event.preventDefault();if(ending||session.state.pending)return;const form=new FormData(event.currentTarget);await session.connect({codeClient:String(form.get('codeClient')).trim().toUpperCase(),departement:String(form.get('departement')).trim().toUpperCase()});});
$('open-studio').onclick=()=>openConfigurator('studio');$('open-general').onclick=()=>openConfigurator('general');$('choose').onclick=showChooser;$('logout').onclick=()=>void endSession();
function changeLanguage(next){
 if(!['fr','es'].includes(next)||next===lang)return;lang=next;const url=new URL(location.href);url.searchParams.set('lang',lang);history.replaceState(null,'',url);translate();render(session.state);
 for(const [variant,frame]of frames)frame.contentWindow?.postMessage({type:'lrf-portal-language',locale:lang},RANDAL_PORTAL_ORIGINS[variant]);
}
$('language').addEventListener('change',()=>changeLanguage($('language').value));
translate();render(session.state);void session.resume();
// Revalidate a restored browser page rather than restoring a cached identity.
addEventListener('pageshow',event=>{if(event.persisted){void endSession(true);}});

if(document.querySelectorAll)mountPortalSlideshow();
