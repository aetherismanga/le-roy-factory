(() => {
  'use strict';
  const ENDPOINT = 'https://gettariffpdf-5m3lsyu7bq-uc.a.run.app';
  const SESSION_KEY = 'lrfProSession';
  const ADMIN_EMAILS = new Set(['jerome@leroyfactory.fr','coryne@leroyfactory.fr']);
  const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyA3iuK5Ua8kFccURSqLihLshHnhA4rm2is',
    authDomain: 'le-roy-factory.firebaseapp.com',
    projectId: 'le-roy-factory',
    storageBucket: 'le-roy-factory.firebasestorage.app',
    messagingSenderId: '249878619253',
    appId: '1:249878619253:web:05f051710b6251dbfa843c'
  };
  const MAP = new Map([
    ['assets/pdf/elios2026.pdf','elios-2026'],
    ['assets/pdf/life-ceramica-2026-tarif-pro.pdf','life-2026'],
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
    ['tarif-neobath-dna.html','neobath-dna-pdf'],
    ['assets/pdf/aquahome.pdf','aquahome'],
    ['assets/pdf/bilt.pdf','bilt'],
    ['assets/pdf/uptrend2026.pdf','uptrend-2026']
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

  function isAdminSession(s){
    if(!s)return false;
    const email=String(s.email||s.adminEmail||'').trim().toLowerCase();
    return (s.isAdmin===true||s.admin===true)&&ADMIN_EMAILS.has(email);
  }

  async function adminToken(){
    const [appModule,authModule]=await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js')
    ]);
    const app=appModule.getApps().find(app=>app.options.projectId===FIREBASE_CONFIG.projectId)||appModule.initializeApp(FIREBASE_CONFIG);
    const auth=authModule.getAuth(app);
    await auth.authStateReady();
    const user=auth.currentUser;
    const email=String(user?.email||'').trim().toLowerCase();
    if(!user||!ADMIN_EMAILS.has(email))return null;
    return user.getIdToken(true);
  }

  function tariffIdFromHref(href){
    const clean=String(href||'').split('?')[0].replace(/^\.\//,'').toLowerCase();
    return MAP.get(clean)||null;
  }

  function patchLinks(root=document){
    root.querySelectorAll?.('a[href]').forEach(a=>{
      if(a.dataset.secureTariffId)return;
      const id=tariffIdFromHref(a.getAttribute('href'));
      if(!id)return;
      a.dataset.secureTariffId=id;
      a.dataset.secureTariffLabel=a.textContent.trim()||'Tarif';
      a.setAttribute('href','#');
      a.removeAttribute('target');
      a.setAttribute('rel','nofollow');
      a.title='Tarif sécurisé LE ROY FACTORY';
    });
  }

  function cardAllowsSecureOpen(anchor){
    const card=anchor.closest('.card-premium');
    if(!card)return true;
    if(anchor.dataset.secureTariffId==='uptrend-2026')return true;
    return !!card.querySelector('.pro-access-badge.allowed, .pro-access-badge.admin');
  }

  async function openSecureTariff(anchor){
    if(!cardAllowsSecureOpen(anchor))return;
    if (anchor.dataset.secureTariffId === 'bulbo-2026' && window.LRF_BULBO_ACCESS) {
      if (anchor.getAttribute?.('aria-busy') === 'true') return;
      anchor.setAttribute('aria-busy','true');
      try { await window.LRF_BULBO_ACCESS.openTariff(anchor,'surfaces'); }
      catch (error) { alert(error.message || 'Impossible d’ouvrir le tarif BULBO.'); }
      finally { anchor.removeAttribute('aria-busy'); }
      return;
    }
    if(anchor.getAttribute?.('aria-busy')==='true')return;
    const s=session();
    anchor.setAttribute('aria-busy','true');
    const old=anchor.textContent;
    anchor.textContent='Ouverture…';

    try{
      const headers={'Content-Type':'application/json'};
      const body={tariffId:anchor.dataset.secureTariffId};

      // The PRO page clears its client session when opening for an agent.
      // Only the live Firebase identity, verified again by the server, can
      // authorize an administrator; browser flags are never credentials.
      const token=await adminToken();
      if(token){
        headers.Authorization=`Bearer ${token}`;
      }else{
        if(isAdminSession(s))throw new Error('Session administrateur Firebase introuvable. Reconnectez-vous à l’Espace Agent.');
        if(!s)throw new Error('Votre accès PRO a expiré. Saisissez à nouveau votre Code LRF et votre département.');
        body.codeClient=s.codeClient;
        body.departement=s.departement;
      }

      const response=await fetch(ENDPOINT,{method:'POST',headers,body:JSON.stringify(body)});
      if(!response.ok){
        let message='Impossible d’ouvrir ce tarif.';
        try{const j=await response.json();if(j?.error)message=j.error}catch(_){}
        throw new Error(message);
      }
      const blob=await response.blob();
      const {showSecurePdf}=await import('./secure-pdf-viewer.mjs?v=20261101-compact1');
      await showSecurePdf(blob,{
        title:anchor.closest('.card-premium')?.querySelector('h3')?.textContent?.trim()||'Tarif professionnel',
        filename:anchor.dataset.secureTariffId+'.pdf',
        trigger:anchor
      });
    }catch(e){
      alert(e.message||'Impossible d’ouvrir ce tarif.');
    }finally{
      anchor.removeAttribute('aria-busy');
      anchor.textContent=old;
    }
  }

  // Public RANDAL documents on the PRO page use the same in-page reader.
  // The private agent document keeps its separate live Firebase verification.
  function publicTariffUrl(anchor){
    if(!anchor.closest('#grid-tarifs')||anchor.dataset.secureTariffId)return null;
    try{
      const url=new URL(anchor.getAttribute('href'),location.href);
      if(url.origin!==location.origin||!url.pathname.toLowerCase().endsWith('.pdf'))return null;
      if(url.pathname.endsWith('/RANDAL-STUDIO-ONE-VASQUES-TARIF-PRO-HT.pdf'))return null;
      return url;
    }catch(_){return null}
  }

  async function openPublicTariff(anchor,url){
    if(anchor.getAttribute('aria-busy')==='true')return;
    const old=anchor.textContent;
    anchor.setAttribute('aria-busy','true');anchor.textContent='Ouverture…';
    try{
      const response=await fetch(url.href,{credentials:'same-origin',cache:'no-store'});
      if(!response.ok)throw new Error('Ce tarif est momentanément indisponible. Réessayez.');
      const {showSecurePdf}=await import('./secure-pdf-viewer.mjs?v=20261101-compact1');
      await showSecurePdf(await response.blob(),{
        title:anchor.closest('.card-premium')?.querySelector('h3')?.textContent?.trim()||'Tarif professionnel',
        filename:decodeURIComponent(url.pathname.split('/').pop()),trigger:anchor
      });
    }catch(e){alert(e.message||'Impossible d’ouvrir ce tarif.');}
    finally{anchor.removeAttribute('aria-busy');anchor.textContent=old;}
  }

  document.addEventListener('click',e=>{
    const a=e.target.closest('a[href]');
    if(!a)return;
    if(!cardAllowsSecureOpen(a))return;
    const publicUrl=publicTariffUrl(a);
    if(!a.dataset.secureTariffId&&!publicUrl)return;
    e.preventDefault();e.stopImmediatePropagation();
    if(a.dataset.secureTariffId)openSecureTariff(a);else openPublicTariff(a,publicUrl);
  },true);

  const observer=new MutationObserver(()=>patchLinks());
  function init(){patchLinks();observer.observe(document.documentElement,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
