const CACHE_NAME='nuage-nomade-20260930-endless-full-assets-score-5';
const CORE=[
 './',
 './index.html?v=20260930-endless-full-assets-score-5',
 './manifest.webmanifest',
 './icon.svg',
 './install.html',
 './hotfix.js?v=20260930-endless-full-assets-score-5',
 './assets/level8.webp?v=20260930-endless-full-assets-score-5',
 './assets/vortex.webp?v=20260930-endless-full-assets-score-5',
 './assets/crows_atlas.webp?v=20260930-endless-full-assets-score-5',
 './assets/storms_atlas.webp?v=20260930-endless-full-assets-score-5',
 './assets/boss_atlas.webp?v=20260930-endless-full-assets-score-5'
];
self.addEventListener('install',e=>{
 self.skipWaiting();
 e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(CORE).catch(()=>{})));
});
self.addEventListener('activate',e=>{
 e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 e.respondWith(
  fetch(e.request,{cache:'no-store'})
   .then(r=>{const copy=r.clone();caches.open(CACHE_NAME).then(c=>c.put(e.request,copy)).catch(()=>{});return r;})
   .catch(()=>caches.match(e.request).then(hit=>hit||caches.match('./index.html?v=20260930-endless-full-assets-score-5')||caches.match('./')))
 );
});