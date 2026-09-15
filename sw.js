const CACHE='lrf-pwa-20260915-brand-final6';
const CORE=[
  '/',
  '/index.html',
  '/assets/icons/lrf-192.png?v=20260915-brand-final6',
  '/assets/icons/lrf-512.png?v=20260915-brand-final6',
  '/apple-touch-icon.png?v=20260915-brand-final6'
];

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

async function networkFirst(request){
  try{
    const response=await fetch(request,{cache:'no-store'});
    if(response&&response.ok){
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{});
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
  if(url.origin!==location.origin)return;

  // Les navigations et fichiers critiques passent toujours par le réseau d'abord.
  // Cela évite qu'une ancienne version reste figée après une mise à jour.
  if(event.request.mode==='navigate'||['script','style','worker'].includes(event.request.destination)){
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Images/fonts : cache rapide avec repli réseau.
  event.respondWith(
    caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
      if(response&&response.ok){
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});
      }
      return response;
    }))
  );
});
