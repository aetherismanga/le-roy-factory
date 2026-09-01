const CACHE='lrf-pwa-v2';
const CORE=['/','/index.html','/assets/brand-v2/assetlogorond.png'];

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
    if(response&&response.status===200){
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
  if(url.origin!==location.origin)return;

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

  event.respondWith(
    caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
      if(response&&response.status===200){
        const copy=response.clone();
        caches.open(CACHE).then(c=>c.put(event.request,copy));
      }
      return response;
    }))
  );
});
