import {ES_UI,ES_PATTERNS} from './es-ui.js';

// This boundary only presents text. It never translates a project, a settings
// value, a catalogue identifier, a URL, a price or a scene object.
export const LANGUAGE_KEY='lrf-ui-language-v1';
export const FR_UI=Object.freeze(Object.fromEntries(Object.keys(ES_UI).map(key=>[key,key])));
const listeners=new Set(),textSources=new WeakMap(),attributeSources=new WeakMap();
const supported=value=>value==='fr'||value==='es';
const normalize=value=>value.replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const dictionary=new Map(Object.entries(ES_UI).map(([fr,es])=>[normalize(fr),es]));
let locale='fr',initialized=false,observer,selector;
let requested=null;
try{requested=typeof location==='object'?new URLSearchParams(location.search).get('lang'):null;}catch{}
if(supported(requested))locale=requested;
else try{const stored=globalThis.localStorage?.getItem(LANGUAGE_KEY);if(supported(stored))locale=stored;}catch{}
export const getLocale=()=>locale;
export const localeTag=()=>locale==='es'?'es-ES':'fr-FR';
export const onLocaleChange=callback=>{listeners.add(callback);return ()=>listeners.delete(callback);};

function exactOrPattern(value){
 const exact=dictionary.get(normalize(value));if(exact!==undefined)return exact;
 for(const [pattern,replacement] of ES_PATTERNS){pattern.lastIndex=0;if(pattern.test(value)){pattern.lastIndex=0;return value.replace(pattern,replacement);}}
 return null;
}
export function translateText(value,language=locale){
 const source=String(value??'');if(language!=='es'||!source.trim())return source;
 const trimmed=source.trim(),leading=source.slice(0,source.indexOf(trimmed)),trailing=source.slice(source.indexOf(trimmed)+trimmed.length);
 // Surface checks can concatenate several independently labelled notices.
 // Split those boundaries before a dynamic rule can consume earlier notices
 // as part of the last wall's label.
 const notices=trimmed.split(/(\s+(?=(?:Sol|Mur \d+|Cloison \d+|Zone \d+|Receveur \d+) :))/u);
 if(notices.length>1)return leading+notices.map((part,index)=>index%2?part:translateText(part,language)).join('')+trailing;
 const exact=exactOrPattern(trimmed);if(exact!==null)return leading+exact+trailing;
 // Dynamic interface labels are often composed with numeric dimensions, a
 // reference or a manufacturer name. Translate only whole UI segments.
 const parts=trimmed.split(/(\n+|\s*[·|]\s*|\s+—\s+|\s+\/\s+)/);
 if(parts.length>1)return leading+parts.map((part,i)=>i%2?part:translateText(part,language)).join('')+trailing;
 const sentences=trimmed.match(/^(.+?[.!?…])(\s+)(.+)$/su);
 if(sentences)return leading+translateText(sentences[1],language)+sentences[2]+translateText(sentences[3],language)+trailing;
 return source; // French is the explicit fallback for an unknown UI label.
}

const skipSelector='script,style,code,pre,[translate="no"],[data-i18n-skip],.lrf-language';
// Commands such as favourites need a stable identity even while their visible
// labels change. Never derive a persistent key from translated text.
export function getSourceText(element,{accessible=false}={}){
 if(accessible)for(const name of ['aria-label','title']){const current=element.getAttribute(name);if(current){const record=attributeSources.get(element)?.get(name);return record?.output===current?record.source:current;}}
 const source=node=>{if(node.nodeType===3){const record=textSources.get(node);return record?.output===node.data?record.source:node.data;}return [...node.childNodes].map(source).join('');};
 return source(element);
}
function excluded(element){return !element||!!element.closest(skipSelector);}
function translateNode(node){
 if(node.nodeType===3){if(excluded(node.parentElement)||node.parentElement.closest('textarea,input'))return;if(node.parentElement.localName==='option'&&!node.parentElement.hasAttribute('value'))node.parentElement.setAttribute('value',node.parentElement.textContent);const current=node.data;let record=textSources.get(node);if(!record||current!==record.output)record={source:current,output:current};const output=translateText(record.source);record.output=output;textSources.set(node,record);if(current!==output)node.data=output;return;}
 if(node.nodeType!==1)return;
 if(excluded(node))return;
 let records=attributeSources.get(node);if(!records){records=new Map();attributeSources.set(node,records);}
 for(const name of ['title','aria-label','placeholder','alt']){if(!node.hasAttribute(name))continue;const current=node.getAttribute(name);let record=records.get(name);if(!record||current!==record.output)record={source:current,output:current};const output=translateText(record.source);record.output=output;records.set(name,record);if(current!==output)node.setAttribute(name,output);}
}
export function translateDOM(root=globalThis.document){
 if(!root)return;translateNode(root);
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{acceptNode:node=>node.nodeType===1&&excluded(node)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
 let node;while((node=walker.nextNode()))translateNode(node);
}
export function withLocaleURL(value){
 const url=new URL(value,location.href);url.searchParams.set('lang',locale);return url.href;
}
function publishLocaleToSite(){
 if(!globalThis.document||!globalThis.parent||globalThis.parent===globalThis)return;
 try{const origin=new URL(document.referrer).origin;if(['https://leroyfactory.fr','https://www.leroyfactory.fr'].includes(origin))parent.postMessage({type:'lrf-ui-language',locale},origin);}catch{}
}
function preserveLinkLocale(event){
 const anchor=event.target.closest?.('a[href]');if(!anchor||anchor.hasAttribute('download'))return;
 const url=new URL(anchor.href,location.href);
 const workshop=url.origin===location.origin||/^(studio-one-beta-test-v2|randal-catalogue-general-3d)(?:-[a-z0-9-]+)?\.vercel\.app$/.test(url.hostname);
 const site=['leroyfactory.fr','www.leroyfactory.fr'].includes(url.hostname)&&['/','/index.html','/configurateurs-randal.html','/studio-one-configurateur.html','/randal-configurateur.html'].includes(url.pathname);
 if((!workshop&&!site)||!/^https?:$/.test(url.protocol)||!/(?:\.html|\/)$/i.test(url.pathname))return;
 url.searchParams.set('lang',locale);anchor.href=url.href;
}
export function setLocale(next){
 if(!supported(next))return false;
 const changed=next!==locale;locale=next;
 try{globalThis.localStorage?.setItem(LANGUAGE_KEY,locale);}catch{}
 if(globalThis.document?.documentElement){document.documentElement.lang=locale;if(selector)selector.value=locale;const url=new URL(location.href);url.searchParams.set('lang',locale);history.replaceState(history.state,'',url);translateDOM(document);}
 publishLocaleToSite();
 if(changed)for(const callback of listeners)callback(locale);
 if(changed&&globalThis.dispatchEvent)dispatchEvent(new CustomEvent('lrf-locale-change',{detail:{locale}}));
 return true;
}

const css=`.lrf-language{display:inline-flex;flex:0 0 auto;align-items:center;gap:5px;margin-left:auto;font:12px/1.2 Arial,sans-serif;color:#353a32}.lrf-language select{appearance:auto;min-height:36px;max-width:155px;padding:7px 8px;border:1px solid #d0c8b9;border-radius:8px;background:#fffef9;color:#28382e;font:inherit;cursor:pointer}.lrf-language select:focus-visible{outline:3px solid #b49a66;outline-offset:2px}.lrf-language .lrf-language-label{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}html[lang=es] .official-photo:not([data-photo-ready="true"])::after{content:"Cargando la foto…"}html[lang=es] .official-photo[data-photo-ready="error"]::after{content:"Foto no disponible · compruebe la conexión"}@media(max-width:760px){.lrf-language{font-size:11px}.lrf-language select{min-height:36px;width:58px;max-width:100%;padding:6px 2px}.lrf-language{margin-left:0}body>header:has(.lrf-language){gap:6px}body>header:has(.lrf-language) .quit-configurator{max-width:92px;white-space:normal;text-align:center;font-size:9px}}@media(max-width:760px){body>header.app-header:has(.lrf-language){display:grid;grid-template-columns:minmax(0,1fr) 60px;grid-template-rows:44px auto;flex-basis:auto;height:auto;min-height:60px;padding:5px 12px;gap:4px 8px}body>header.app-header>.brand{grid-area:1/1;min-width:0;gap:8px}body>header.app-header .brand .randal-partner-logo{width:76px!important;margin-right:0!important}body>header.app-header .studio-logo{width:88px}body>header.app-header>.lrf-language{grid-area:1/2;justify-self:end}body>header.app-header>.header-actions{grid-area:2/1/3/3;justify-content:flex-end;flex-wrap:wrap;padding-top:0;min-width:0}body>header:not(.app-header):has(.lrf-language)>.lrf-language{grid-area:2/1;justify-self:start}body>header:not(.app-header):has(.lrf-language)>.back-to-quote{grid-area:2/2/3/4;min-width:0;font-size:10px;padding:4px}}@media print{.lrf-language{display:none!important}}`;
export function initI18n({selector:showSelector=true}={}){
 if(initialized||!globalThis.document?.documentElement||!document.createTreeWalker)return;initialized=true;
 const style=document.createElement('style');style.dataset.lrfI18n='';style.textContent=css;document.head.append(style);
 if(showSelector){const label=document.createElement('label');label.className='lrf-language';label.setAttribute('translate','no');label.innerHTML='<span class="lrf-language-label">Français / Español</span><select data-testid="lrf-language-selector" aria-label="Langue / Idioma"><option value="fr">🇫🇷 Français</option><option value="es">🇪🇸 Español</option></select>';selector=label.querySelector('select');selector.value=locale;selector.onchange=()=>setLocale(selector.value);const header=document.querySelector('body>header,.app-header');if(header)header.append(label);else document.body.prepend(label);}
 setLocale(locale);
 observer=new MutationObserver(records=>{const roots=new Set();for(const record of records){if(record.type==='characterData'||record.type==='attributes')roots.add(record.target);else for(const node of record.addedNodes)roots.add(node);}for(const root of roots){if(root.isConnected)translateDOM(root);}});
 observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','aria-label','placeholder','alt']});
 document.addEventListener('click',preserveLinkLocale,true);
 addEventListener('storage',event=>{if(event.key===LANGUAGE_KEY&&supported(event.newValue)&&event.newValue!==locale)setLocale(event.newValue);});
 addEventListener('beforeprint',()=>translateDOM(document));
}
