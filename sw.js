const CACHE='lrf-pwa-20260915-brand-final3';
const BRAND_VERSION='20260915-brand-final5';
const CORE=['/','/index.html','/assets/icons/lrf-192.png?v=20260915-brand-final3','/assets/icons/lrf-512.png?v=20260915-brand-final3','/apple-touch-icon.png?v=20260915-brand-final3'];

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

function brandPatchHtml(html){
  if(!html||!/<html/i.test(html))return html;

  const headPatch=`
<link rel="icon" type="image/png" href="/assets/img/logo03lrf.png?v=${BRAND_VERSION}">
<link rel="apple-touch-icon" href="/assets/img/logo03lrf.png?v=${BRAND_VERSION}">
<link rel="manifest" href="/manifest.webmanifest?v=${BRAND_VERSION}">
<style id="lrf-brand-mobile-final">
@media(max-width:900px){
  html body:not(.crm-body) header .logo,
  html body:not(.crm-body) header a.logo,
  html body.lrf-premium-v2:not(.crm-body) header .logo{
    width:58px!important;min-width:58px!important;max-width:58px!important;
    height:58px!important;min-height:58px!important;max-height:58px!important;
    padding:0!important;margin-left:10px!important;overflow:hidden!important;
    transform:none!important;display:flex!important;align-items:center!important;justify-content:center!important;
  }
  html body:not(.crm-body) header .logo>img,
  html body:not(.crm-body) header a.logo>img,
  html body.lrf-premium-v2:not(.crm-body) header .logo>img,
  html body.lrf-premium-v2:not(.crm-body) .lrf-monogram-header{
    width:58px!important;min-width:58px!important;max-width:58px!important;
    height:58px!important;min-height:58px!important;max-height:58px!important;
    transform:none!important;scale:1!important;object-fit:contain!important;border-radius:50%!important;
    filter:drop-shadow(0 2px 5px rgba(0,0,0,.2))!important;
  }
}
</style>`;

  const bodyPatch=`
<script id="lrf-mobile-logo-runtime-final">
(function(){
  var VERSION='${BRAND_VERSION}';
  function ensureBrandHead(){
    var head=document.head;if(!head)return;
    var icon=head.querySelector('link[rel="icon"]');
    if(!icon){icon=document.createElement('link');icon.rel='icon';icon.type='image/png';head.appendChild(icon);}
    icon.href='/assets/img/logo03lrf.png?v='+VERSION;
    var apple=head.querySelector('link[rel="apple-touch-icon"]');
    if(!apple){apple=document.createElement('link');apple.rel='apple-touch-icon';head.appendChild(apple);}
    apple.href='/assets/img/logo03lrf.png?v='+VERSION;
    var manifests=head.querySelectorAll('link[rel="manifest"]');
    var manifest=manifests[0];
    if(!manifest){manifest=document.createElement('link');manifest.rel='manifest';head.appendChild(manifest);}
    manifest.href='/manifest.webmanifest?v='+VERSION;
    for(var i=1;i<manifests.length;i++)manifests[i].remove();
  }
  function applyLogo(){
    if(window.innerWidth>900)return;
    var body=document.body;
    if(!body||body.classList.contains('crm-body'))return;
    var logo=document.querySelector('header .logo');
    if(!logo)return;
    ['width','min-width','max-width','height','min-height','max-height'].forEach(function(p){logo.style.setProperty(p,'58px','important');});
    logo.style.setProperty('padding','0','important');
    logo.style.setProperty('margin-left','10px','important');
    logo.style.setProperty('overflow','hidden','important');
    logo.style.setProperty('transform','none','important');
    var img=logo.querySelector('img');
    if(img){
      ['width','min-width','max-width','height','min-height','max-height'].forEach(function(p){img.style.setProperty(p,'58px','important');});
      img.style.setProperty('transform','none','important');
      img.style.setProperty('scale','1','important');
      img.style.setProperty('object-fit','contain','important');
      img.style.setProperty('border-radius','50%','important');
      img.src='/assets/brand-v2/assetlogorond.png?v='+VERSION;
    }
  }
  function apply(){ensureBrandHead();applyLogo();}
  apply();
  document.addEventListener('DOMContentLoaded',apply,{once:true});
  window.addEventListener('resize',apply);
  new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true,attributes:true});
  setTimeout(apply,50);setTimeout(apply,300);setTimeout(apply,1000);setTimeout(apply,2500);
})();
</script>`;

  if(/<\/head>/i.test(html)) html=html.replace(/<\/head>/i,headPatch+'\n</head>');
  if(/<\/body>/i.test(html)) html=html.replace(/<\/body>/i,bodyPatch+'\n</body>');
  return html;
}

async function navigationResponse(request){
  try{
    const response=await fetch(request,{cache:'no-store'});
    const type=response.headers.get('content-type')||'';
    if(response.ok&&type.includes('text/html')){
      const html=brandPatchHtml(await response.text());
      return new Response(html,{status:response.status,statusText:response.statusText,headers:response.headers});
    }
    return response;
  }catch(error){
    const cached=await caches.match(request)||await caches.match('/index.html');
    if(!cached)throw error;
    const type=cached.headers.get('content-type')||'';
    if(type.includes('text/html')){
      const html=brandPatchHtml(await cached.text());
      return new Response(html,{status:cached.status,statusText:cached.statusText,headers:cached.headers});
    }
    return cached;
  }
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;

  if(event.request.mode==='navigate'){
    event.respondWith(navigationResponse(event.request));
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
