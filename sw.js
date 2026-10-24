const CACHE='lrf-pwa-v10-green-logo-20260915';
const CORE=['/','/index.html','/assets/img/logo03lrf.png?v=20260915-lrf-green-standard'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('lrf-pwa-')&&k!==CACHE).map(k=>caches.delete(k))))
  );
  self.clients.claim();
});

function isMigratedPublicMedia(url){
  return url.origin==='https://storage.googleapis.com' && url.pathname.startsWith('/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/');
}

function canCacheResponse(response,request){
  if(/(?:no-store|private)/i.test(response?.headers?.get('cache-control')||''))return false;
  return response && (response.status===200 || (response.type==='opaque' && isMigratedPublicMedia(new URL(request.url))));
}

async function networkFirst(request){
  try{
    const response=await fetch(request,{cache:'no-store'});
    if(canCacheResponse(response,request)){
      const copy=response.clone();
      caches.open(CACHE).then(c=>c.put(request,copy));
    }
    return response;
  }catch(error){
    const cached=await caches.match(request);
    if(cached)return cached;
    throw error;
  }
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin && !isMigratedPublicMedia(url))return;
  // Authenticated prices and APIs must never enter a service-worker cache.
  if(url.origin===location.origin && (/^\/api\//.test(url.pathname)||/\/server\//.test(url.pathname)))return;
  if(url.origin===location.origin && ((url.pathname.startsWith('/assets/js/lrf-plan-pose/')||url.pathname.startsWith('/shared/lrf-3d/'))&&url.pathname.endsWith('.json'))){
    event.respondWith(networkFirst(event.request));return;
  }

  if(event.request.mode==='navigate'){
    event.respondWith(
      networkFirst(event.request).catch(()=>caches.match('/index.html'))
    );
    return;
  }

  if(['script','style','worker'].includes(event.request.destination)){
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Logos LRF : toujours vérifier le réseau pour éviter tout retour d'un ancien visuel.
  if(url.pathname.includes('logo03lrf') || url.pathname.includes('assetlogorond') || url.pathname.includes('lrf-logo-officiel-2026')){
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached=>{
      // An opaque preview can display in <img> but cannot be read by WebGL.
      // CacheStorage matches URLs across request modes; reject this stale entry.
      const needsCors=isMigratedPublicMedia(url)&&event.request.mode==='cors';
      const readable=cached&&(!needsCors||cached.type==='cors');
      return readable?cached:fetch(event.request,needsCors?{cache:'reload'}:undefined).then(response=>{
      if(canCacheResponse(response,event.request)){
        const copy=response.clone();
        caches.open(CACHE).then(c=>c.put(event.request,copy));
      }
      return response;
    })})
  );
});
