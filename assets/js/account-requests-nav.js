import { auth } from './firebase.js';

// Tous les appels vers les Cloud Functions LE ROY FACTORY effectués depuis le CRM
// transportent automatiquement le jeton Firebase de l'agent connecté.
// Les pages publiques qui ne chargent pas firebase.js continuent à fonctionner sans jeton.
if (!window.__lrfSecureCloudFetchInstalled) {
  window.__lrfSecureCloudFetchInstalled = true;
  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : String(input?.url || '');
    const isLrfCloudFunction = url.startsWith('https://us-central1-le-roy-factory.cloudfunctions.net/');

    if (isLrfCloudFunction && auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken();
        const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
        headers.set('Authorization', `Bearer ${token}`);
        return nativeFetch(input, { ...init, headers });
      } catch (error) {
        console.warn('Impossible d’ajouter le jeton Firebase à la requête CRM :', error);
      }
    }

    return nativeFetch(input, init);
  };
}

async function openMaStation(){
  const ua=navigator.userAgent||'';
  if(/Android/i.test(ua)){
    try{
      // Dans l'APK LE ROY FACTORY, AppLauncher ouvre MA STATION directement par son package Android.
      // Cela évite Chrome et ne nécessite pas que l'ancienne version de MA STATION connaisse mastation://.
      const launcher=window.Capacitor?.Plugins?.AppLauncher;
      if(launcher){
        const check=await launcher.canOpenUrl({url:'fr.mastation.ma_station'}).catch(()=>({value:true}));
        if(check?.value!==false){
          await launcher.openUrl({url:'fr.mastation.ma_station'});
          return;
        }
      }
    }catch(error){
      console.warn('Ouverture native de MA STATION impossible :',error);
    }

    // Secours pour un accès CRM depuis Chrome plutôt que depuis l'application native.
    window.location.href='intent://open#Intent;scheme=mastation;package=fr.mastation.ma_station;end';
    return;
  }
  window.location.href='mastation://open';
}

function addNav(){
  const menu=document.querySelector('.sidebar-menu');
  if(menu){
    [...menu.querySelectorAll('a')].filter(a=>a.getAttribute('href')?.includes('filter=prospect')).forEach(a=>a.closest('li')?.remove());
  }
  if(menu&&!menu.querySelector('a[href="demandes-clients.html"]')){
    const clients=[...menu.querySelectorAll('a')].find(a=>a.getAttribute('href')==='clients.html')?.closest('li');
    const li=document.createElement('li');li.innerHTML='<a href="demandes-clients.html"><span class="icon">🧾</span><span class="menu-text">Demandes clients</span></a>';
    if(clients)clients.insertAdjacentElement('afterend',li);else menu.appendChild(li);
  }
  if(menu&&!menu.querySelector('a[href="tournees.html"]')){
    const agenda=[...menu.querySelectorAll('a')].find(a=>a.getAttribute('href')==='agenda.html')?.closest('li');
    const li=document.createElement('li');li.innerHTML='<a href="tournees.html"><span class="icon">🧭</span><span class="menu-text">Tournées</span></a>';
    if(agenda)agenda.insertAdjacentElement('afterend',li);else menu.appendChild(li);
  }
  if(menu&&!menu.querySelector('a[href="contacts-partenaires.html"]')){
    const mails=[...menu.querySelectorAll('a')].find(a=>a.getAttribute('href')==='mails-groupes.html')?.closest('li');
    const li=document.createElement('li');li.innerHTML='<a href="contacts-partenaires.html"><span class="icon">🏭</span><span class="menu-text">Contacts partenaires</span></a>';
    if(mails)mails.insertAdjacentElement('afterend',li);else menu.appendChild(li);
  }
  if(menu){
    const stats=[...menu.querySelectorAll('a')].find(a=>a.textContent.toLowerCase().includes('statistiques'));
    if(stats)stats.href='statistiques.html';
    if(!menu.querySelector('[data-open-ma-station]')){
      const statsLi=stats?.closest('li');
      const settings=[...menu.querySelectorAll('a')].find(a=>a.textContent.toLowerCase().includes('paramètres'))?.closest('li');
      const li=document.createElement('li');
      li.innerHTML='<a href="#" data-open-ma-station="1"><span class="icon">⛽</span><span class="menu-text">Ma Station</span></a>';
      if(statsLi)statsLi.insertAdjacentElement('afterend',li);
      else if(settings)settings.insertAdjacentElement('beforebegin',li);
      else menu.appendChild(li);
    }
  }
  if(location.pathname.toLowerCase().endsWith('dashboard.html')){
    const quick=[...document.querySelectorAll('h2')].find(h=>h.textContent.includes('Actions rapides'))?.nextElementSibling;
    if(quick&&!quick.querySelector('a[href="demandes-clients.html"]')){
      const a=document.createElement('a');a.href='demandes-clients.html';a.className='btn-primary-gold';a.style.cssText='text-decoration:none;display:inline-flex;align-items:center;gap:.5rem;padding:.75rem 1.25rem';a.textContent='🧾 Demandes clients';quick.appendChild(a);
    }
    if(quick&&!quick.querySelector('a[href="tournees.html"]')){
      const a=document.createElement('a');a.href='tournees.html';a.className='btn-primary-gold';a.style.cssText='text-decoration:none;display:inline-flex;align-items:center;gap:.5rem;padding:.75rem 1.25rem';a.textContent='🧭 Créer une tournée';quick.appendChild(a);
    }
    if(quick&&!quick.querySelector('a[href="ouverture-compte.html"]')){
      const a=document.createElement('a');a.href='ouverture-compte.html';a.target='_blank';a.className='btn-primary-gold';a.style.cssText='text-decoration:none;display:inline-flex;align-items:center;gap:.5rem;padding:.75rem 1.25rem';a.textContent='🔗 Formulaire ouverture / mise à jour';quick.appendChild(a);
    }
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addNav,{once:true});else addNav();

document.addEventListener('click',e=>{
  const a=e.target.closest('[data-open-ma-station]');
  if(!a)return;
  e.preventDefault();
  openMaStation();
});

if(location.pathname.toLowerCase().endsWith('clients.html')){
  import('./client-partners-sync.js?v=20260901-1')
    .catch(err=>console.error('Erreur synchronisation partenaires client :',err));
}

const lrfCurrentPage=(location.pathname.split('/').pop()||'').toLowerCase();

if(lrfCurrentPage==='demandes-clients.html'){
  import('./elios-order-crm.js?v=20260907-order1')
    .catch(err=>console.error('Erreur commandes ELIOS CRM :',err));
}

if(lrfCurrentPage==='comptes-rendus.html'){
  import('./comptes-rendus-simple.js?v=20260904-1')
    .catch(err=>console.error('Erreur saisie simple compte-rendu :',err));
}

// Nouveau compte-rendu : recherche tactile du client + sélection usine/contact + envoi direct du mail.
if(lrfCurrentPage==='nouveau-compte-rendu.html'){
  import('./nouveau-cr-client-mail.js?v=20260904-1')
    .catch(err=>console.error('Erreur nouveau compte-rendu client/mail :',err));
}

if(new Set(['clients.html','mails-groupes.html']).has(lrfCurrentPage)){
  import('./mail-archive-enhancer.js?v=20260903-1')
    .catch(err=>console.error('Erreur archivage détaillé des mails :',err));
}

if(lrfCurrentPage==='dashboard.html'){
  import('./dashboard-ui-fixes.js?v=20260903-1')
    .catch(err=>console.error('Erreur correctifs dashboard :',err));
  import('./dashboard-agent-avatar.js?v=20260904-avatar3')
    .catch(err=>console.error('Erreur avatar agent dashboard :',err));
  import('./crm-radio-player.js?v=20260904-radio1')
    .catch(err=>console.error('Erreur lecteur radio CRM :',err));
}

const lrfClockPages=new Set(['dashboard.html','clients.html','mails-groupes.html','comptes-rendus.html','tournees.html']);
if(lrfClockPages.has(lrfCurrentPage)){
  import('./dashboard-clock-tools.js?v=20260904-header1').then(async()=>{
    await import('./dashboard-clock-state-fix.js?v=20260903-1')
      .catch(err=>console.error('Erreur état des outils horloge :',err));
    if(lrfCurrentPage==='dashboard.html'||document.getElementById('lrf-clock-page-layout-fix'))return;
    const style=document.createElement('style');
    style.id='lrf-clock-page-layout-fix';
    style.textContent=`@media(max-width:760px){
      html body.crm-body .crm-topbar{align-items:flex-start!important;text-align:left!important}
      html body.crm-body .crm-topbar .welcome-box{padding-left:13px!important;border-left:4px solid var(--crm-gold,#f3ad18)!important;text-align:left!important}
      html body.crm-body .crm-topbar .welcome-box p{text-align:left!important;margin:0!important;max-width:none!important}
      html body.crm-body .info-widgets.lrf-premium-status{justify-content:center!important}
    }`;
    document.head.appendChild(style);
  }).catch(err=>console.error('Erreur chargement outils horloge du CRM :',err));
}