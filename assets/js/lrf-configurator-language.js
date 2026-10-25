// The public site keeps only the FR/ES interface preference between workshop origins.
// This bridge never receives credentials, projects, prices or client identities.
(()=>{'use strict';
 const KEY='lrf-ui-language-v1',valid=value=>value==='fr'||value==='es';
 const frameOrigins=new Set(['https://studio-one-beta-test-v2.vercel.app','https://randal-catalogue-general-3d.vercel.app']);
 const siteOrigins=new Set(['https://leroyfactory.fr','https://www.leroyfactory.fr']);
 const routes=new Set(['/','/index.html','/configurateurs-randal.html','/studio-one-configurateur.html','/randal-configurateur.html']);
 function requested(){try{const value=new URL(location.href).searchParams.get('lang');return valid(value)?value:null;}catch{return null;}}
 function stored(){try{const value=localStorage.getItem(KEY);return valid(value)?value:null;}catch{return null;}}
 let preference=requested()||stored()||'fr';
 function remember(locale){try{localStorage.setItem(KEY,locale);}catch{}}
 if(requested())remember(preference);
 function get(){return preference;}
 function decorateLink(anchor){
  const href=anchor?.getAttribute('href');if(!href||href.startsWith('#')||anchor.hasAttribute('download'))return;
  try{const url=new URL(href,location.href);if(!/^https?:$/.test(url.protocol)||!routes.has(url.pathname)||url.origin!==location.origin&&!siteOrigins.has(url.origin))return;url.searchParams.set('lang',get());anchor.href=url.href;}catch{}
 }
 function decorateLinks(root=document){for(const anchor of root.querySelectorAll?.('a[href]')||[])decorateLink(anchor);}
 function set(locale){
  if(!valid(locale))return false;preference=locale;remember(locale);
  try{const url=new URL(location.href);url.searchParams.set('lang',locale);history.replaceState(history.state,'',url.href);}catch{}
  decorateLinks();return true;
 }
 function bindFrame(frame,origin){
  if(!frame||!frameOrigins.has(origin))return ()=>{};
  const receive=event=>{if(event.origin!==origin||event.source!==frame.contentWindow||event.data?.type!=='lrf-ui-language'||!valid(event.data.locale))return;set(event.data.locale);};
  addEventListener('message',receive);return ()=>removeEventListener('message',receive);
 }
 window.LRF_CONFIGURATOR_LANGUAGE=Object.freeze({get,set,bindFrame,decorateLinks});
 document.addEventListener('click',event=>decorateLink(event.target.closest?.('a[href]')),true);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>decorateLinks(),{once:true});else decorateLinks();
})();
