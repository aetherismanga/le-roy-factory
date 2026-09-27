const CACHE_NAME='nuage-nomade-20260927-final-live-3-stage8-10';
const CORE=['./','./index.html?v=20260927-final-live-3-stage8-10','./manifest.webmanifest','./icon.svg','./install.html','./hotfix.js?v=20260927-final-live-3-stage8-10'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(CORE).catch(()=>{})));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{const copy=r.clone();caches.open(CACHE_NAME).then(c=>c.put(e.request,copy)).catch(()=>{});return r;}).catch(()=>caches.match(e.request).then(hit=>hit||caches.match('./index.html?v=20260927-final-live-3-stage8-10')||caches.match('./'))));
});