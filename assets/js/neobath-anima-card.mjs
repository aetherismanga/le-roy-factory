import {isAnimaAgent} from './neobath-anima-session.mjs?v=20261102-1';

// The card is created only after real Firebase authentication AND server
// authorization, never from a stored agentLoggedIn/PRO/admin browser flag.
let generation = 0;
let card;
try {
  const [appSDK, authSDK] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js')
  ]);
  const app = appSDK.getApps().find(app => app.options.projectId === 'le-roy-factory') || appSDK.initializeApp({
    apiKey: 'AIzaSyA3iuK5Ua8kFccURSqLihLshHnhA4rm2is',
    authDomain: 'le-roy-factory.firebaseapp.com', projectId: 'le-roy-factory',
    appId: '1:249878619253:web:05f051710b6251dbfa843c'
  });
  authSDK.onIdTokenChanged(authSDK.getAuth(app), async user => {
    const current = ++generation;
    card?.remove();
    card = null;
    if (!isAnimaAgent(user)) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch('https://us-central1-le-roy-factory.cloudfunctions.net/neobathAnimaApplication', {
        method: 'POST', cache: 'no-store', headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + token},
        body: JSON.stringify({action: 'authorize'}), signal: AbortSignal.timeout(15000)
      });
      const result = await response.json();
      if (current !== generation || !response.ok || !result.success) return;
      const grid = document.querySelector('.config-grid');
      if (!grid) return;
      card = document.createElement('article');
      card.className = 'config-card';
      card.dataset.privateAnima = 'true';
      card.innerHTML = '<div class="config-logo" style="color:#376052;font-family:Georgia,serif;font-size:29px;letter-spacing:3px">NEOBATH <span style="font-size:15px;margin-left:10px">ANIMA</span></div><h2>Neobath Anima · Atelier privé</h2><p>Composez les meubles Pura et Ribelle, choisissez leurs finitions et visualisez votre composition en 3D. Version de travail réservée à Jérôme et Coryne.</p><a class="config-open" href="neobath-anima-configurateur.html">Ouvrir mon atelier privé</a>';
      grid.prepend(card);
    } catch (_) { /* No successful authorization means no visible card. */ }
  });
} catch (_) { /* Public configurators remain available if auth is offline. */ }
