(() => {
  'use strict';
  const ENDPOINT = 'https://gettariffpdf-5m3lsyu7bq-uc.a.run.app';
  const SESSION_KEY = 'lrfProSession';
  const ADMIN_EMAILS = new Set(['jerome@leroyfactory.fr','coryne@leroyfactory.fr']);
  const MAP = new Map([
    ['assets/pdf/elios2026.pdf','elios-2026'],
    ['assets/pdf/view2026.pdf','view-2026'],
    ['assets/pdf/lafenice2026.pdf','lafenice-2026'],
    ['assets/pdf/reviglass2026.pdf','reviglass-2026'],
    ['assets/pdf/biopietra2026.pdf','biopietra-2026'],
    ['assets/pdf/biopietracodeprix.pdf','biopietra-code-prix'],
    ['assets/pdf/petracer2023.pdf','petracers'],
    ['assets/pdf/pecchioli2022.pdf','pecchioli'],
    ['assets/pdf/bulbo2026.pdf','bulbo-2026'],
    ['assets/pdf/randal03.pdf','randal'],
    ['assets/pdf/neobathanima.pdf','neobath-anima'],
    ['assets/pdf/neobathdna.pdf','neobath-dna-pdf'],
    ['assets/pdf/aquahome.pdf','aquahome'],
    ['assets/pdf/bilt.pdf','bilt']
  ]);

  function session(){
    try{
      const bridge=window.LRF_PRO_SESSION?.read?.();
      if(bridge)return bridge;
      const value=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null');
      if(!value)return null;
      const email=String(value.email||value.adminEmail||'').trim().toLowerCase();
      if((value.isAdmin===true||value.admin===true)&&ADMIN_EMAILS.has(email))return value;
      if(!/^LRF-\d{5}$/.test(String(value.codeClient||'').toUpperCase())||!value.departement)return null;
      return value;
    }catch(_){return null}
  }
  function tariffIdFromHref(href){
    const clean=String(href||'').split('?')[0].replace(/^\.\//,'').toLowerCase();
    return MAP.get(clean)||null;
  }
  function patchLinks(root=document){
    root.querySelectorAll?.('a[href]').forEach(a=>{
      if(a.dataset.secureTariffId)return;
      const originalHref=a.getAttribute('href')||'';
      const id=tariffIdFromHref(originalHref);
      if(!id)return;
      a.dataset.secureTariffId=id;
      a.dataset.secureTariffHref=originalHref;
      a.dataset.secureTariffLabel=a.textContent.trim()||'Tarif';
      a.setAttribute('href','#');
      a.removeAttribute('target');
      a.setAttribute('rel','nofollow');
      a.title='Tarif sécurisé LE ROY FACTORY';
    });
  }
  function isAdminSession(s){
    if(!s)return false;
    const email=String(s.email||s.adminEmail||'').trim().toLowerCase();
    return (s.isAdmin===true||s.admin===true)&&ADMIN_EMAILS.has(email);
  }
  async function openSecureTariff(anchor){
    const card=anchor.closest('.card-premium');
    if(card&&!card.querySelector('.pro-access-badge.allowed'))return;
    const s=session();
    if(!s){
      alert('Votre accès PRO a expiré. Saisissez à nouveau votre Code LRF et votre département.');
      location.href='tarifs-pro.html';
      return;
    }

    if(isAdminSession(s)){
      const href=anchor.dataset.secureTariffHref;
      if(!href){
        alert('Impossible d’ouvrir ce tarif.');
        return;
      }
      window.open(href,'_blank','noopener');
      return;
    }

    const popup=window.open('about:blank','_blank');
    if(popup){
      popup.document.write('<!doctype html><title>LE ROY FACTORY</title><body style="font-family:Arial;padding:30px">Ouverture du tarif sécurisé…</body>');
      popup.document.close();
    }
    anchor.setAttribute('aria-busy','true');
    const old=anchor.textContent;
    anchor.textContent='Ouverture…';
    try{
      const response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({codeClient:s.codeClient,departement:s.departement,tariffId:anchor.dataset.secureTariffId})});
      if(!response.ok){
        let message='Impossible d’ouvrir ce tarif.';
        try{const j=await response.json();if(j?.error)message=j.error}catch(_){}
        throw new Error(message);
      }
      const blob=await response.blob();
      const url=URL.createObjectURL(blob);
      if(popup)popup.location.replace(url);else location.href=url;
      setTimeout(()=>URL.revokeObjectURL(url),5*60*1000);
    }catch(e){
      if(popup)popup.close();
      alert(e.message||'Impossible d’ouvrir ce tarif.');
    }finally{
      anchor.removeAttribute('aria-busy');
      anchor.textContent=old;
    }
  }

  document.addEventListener('click',e=>{
    const a=e.target.closest('a[data-secure-tariff-id]');
    if(!a)return;
    const card=a.closest('.card-premium');
    if(card&&!card.querySelector('.pro-access-badge.allowed'))return;
    e.preventDefault();e.stopImmediatePropagation();
    openSecureTariff(a);
  },true);

  const observer=new MutationObserver(()=>patchLinks());
  function init(){patchLinks();observer.observe(document.documentElement,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
