const CACHE='lrf-pwa-v13-catalogues-20260924-fallback2';
const CORE=['/','/index.html','/assets/brand-v2/lrf-logo-officiel-2026.png?v=20260918-crm-floral-1'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
  );
  self.clients.claim();
});

function isMigratedPublicMedia(url){
  return url.origin==='https://storage.googleapis.com' && url.pathname.startsWith('/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/');
}

function canCacheResponse(response,request){
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
    caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
      if(canCacheResponse(response,event.request)){
        const copy=response.clone();
        caches.open(CACHE).then(c=>c.put(event.request,copy));
      }
      return response;
    }))
  );
});
