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

function addNav(){
  const menu=document.querySelector('.sidebar-menu');
  if(menu){
    // L'ancien onglet Prospects n'est plus utilisé.
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

// La sélection de partenaires dans une fiche client doit être répercutée immédiatement
// dans le champ Firestore `partenaires`, utilisé par l'Accès PRO.
if(location.pathname.toLowerCase().endsWith('clients.html')){
  import('./client-partners-sync.js?v=20260901-1')
    .catch(err=>console.error('Erreur synchronisation partenaires client :',err));
}

// En-tête premium : calendrier cliquable, horloge numérique et outils temps.
// Agenda volontairement exclu pour garder la page calendrier la plus légère et compacte possible.
const lrfClockPages=new Set(['dashboard.html','clients.html','mails-groupes.html','comptes-rendus.html','tournees.html']);
const lrfCurrentPage=(location.pathname.split('/').pop()||'').toLowerCase();
if(lrfClockPages.has(lrfCurrentPage)){
  import('./dashboard-clock-tools.js?v=20260903-4')
    .catch(err=>console.error('Erreur chargement outils horloge du CRM :',err));
}
