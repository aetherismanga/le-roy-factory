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
  if(menu&&!menu.querySelector('a[href="demandes-clients.html"]')){
    const prospects=[...menu.querySelectorAll('a')].find(a=>a.getAttribute('href')?.includes('filter=prospect'))?.closest('li');
    const li=document.createElement('li');li.innerHTML='<a href="demandes-clients.html"><span class="icon">🧾</span><span class="menu-text">Demandes clients</span></a>';
    if(prospects)prospects.insertAdjacentElement('afterend',li);else menu.appendChild(li);
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
    if(quick&&!quick.querySelector('a[href="ouverture-compte.html"]')){
      const a=document.createElement('a');a.href='ouverture-compte.html';a.target='_blank';a.className='btn-primary-gold';a.style.cssText='text-decoration:none;display:inline-flex;align-items:center;gap:.5rem;padding:.75rem 1.25rem';a.textContent='🔗 Formulaire ouverture / mise à jour';quick.appendChild(a);
    }
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addNav,{once:true});else addNav();