const VERSION='20260915-mobile-recovery1';

/*
  LE ROY FACTORY — service worker de récupération.
  Le site doit rester prioritairement réseau. Nous ne interceptons plus les
  navigations ni les fichiers CSS/JS : cela évite qu'un ancien cache PWA
  conserve une page blanche dans Google/Chrome, Safari, iPhone ou tablette.
*/
self.addEventListener('install',event=>{
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    try{
      const keys=await caches.keys();
      await Promise.all(keys.filter(key=>/^lrf-pwa-/i.test(key)).map(key=>caches.delete(key)));
    }catch(e){}
    await self.clients.claim();
  })());
});

self.addEventListener('message',event=>{
  if(event.data==='SKIP_WAITING') self.skipWaiting();
});

/* Aucun handler fetch volontairement : le navigateur charge directement
   leroyfactory.fr et ses ressources, sans shell PWA susceptible d'être périmé. */
