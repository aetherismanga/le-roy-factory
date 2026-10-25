/* TEST BUILD ONLY. Defense in depth; CSP also forbids all external API requests. */
(() => {
  if (window.__LRF_PREVIEW_GUARD__) return;
  window.__LRF_PREVIEW_GUARD__ = true;
  window.__LRF_CRM_PREVIEW__ = true;
  // Missing decorative demo assets keep their text labels, without broken-image glyphs.
  document.addEventListener('error', event => {
    const img = event.target;
    if (img?.tagName === 'IMG') img.style.setProperty('display', 'none', 'important');
  }, true);
  const message='Version test : cette action externe est désactivée. Aucun e-mail ni aucune donnée réelle ne sera envoyé.';
  const nativeFetch=window.fetch.bind(window);
  window.fetch=(input,init)=>{
    const url=new URL(typeof input==='string'||input instanceof URL?String(input):input.url,location.href);
    if(url.origin!==location.origin)return Promise.reject(new Error(message));
    return nativeFetch(input,init);
  };
  const nativeWindowOpen=window.open.bind(window);
  window.open=(url,...args)=>{if(url&&new URL(url,location.href).origin!==location.origin){alert(message);return null;}return nativeWindowOpen(url,...args);};
  const nativeOpen=XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open=function(method,url,...rest){if(new URL(url,location.href).origin!==location.origin)throw new Error(message);return nativeOpen.call(this,method,url,...rest);};
  if(navigator.sendBeacon)navigator.sendBeacon=()=>false;
  const denySocket=()=>{throw new Error(message);};
  window.WebSocket=denySocket;window.EventSource=denySocket;
  navigator.serviceWorker?.getRegistrations().then(items=>items.forEach(x=>x.unregister())).catch(()=>{});
  document.addEventListener('click',event=>{
    const a=event.target.closest('a');if(!a)return;
    const href=a.getAttribute('href')||'';
    if(href==='#crm-preview-unavailable'){event.preventDefault();event.stopImmediatePropagation();alert(message);return;}
    if(/^(mailto:|tel:|https?:)/i.test(href)&&!href.startsWith(location.origin)){
      event.preventDefault();event.stopImmediatePropagation();alert(message);
    }
  },true);
  function banner(){
    if(document.getElementById('crm-preview-banner'))return;
    const bar=document.createElement('aside');bar.id='crm-preview-banner';bar.setAttribute('aria-label','Environnement de test');
    bar.innerHTML='<strong>VERSION TEST</strong><span title="Données fictives · sauvegarde sur cet appareil">Données fictives</span><label>Compte démo <select id="crm-preview-actor" aria-label="Choisir le compte de démonstration"><option value="jerome">Jérôme</option><option value="coryne">Coryne</option></select></label>';
    document.body.prepend(bar);
    import('/assets/js/crm-preview-sdk.mjs').then(sdk=>{const select=bar.querySelector('select');select.value=sdk.previewRuntime.actor;select.addEventListener('change',()=>{sdk.selectPreviewActor(select.value);location.reload();});});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',banner,{once:true});else banner();
})();
