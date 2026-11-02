// Public visitors always receive the construction page, even without JavaScript.
// The editor markup and executable entry come only from the authenticated API.
const OWNER = 'jerome@leroyfactory.fr';
const API = 'https://us-central1-le-roy-factory.cloudfunctions.net/planPoseApplication';
const status = document.getElementById('plan-pose-access-status');
const construction = document.getElementById('plan-pose-construction');
const host = document.getElementById('plan-pose-private-app');
const constructionCSS = document.querySelector('link[href*="plan-pose-construction.css"]');
const config = {
  apiKey: 'AIzaSyA3iuK5Ua8kFccURSqLihLshHnhA4rm2is',
  authDomain: 'le-roy-factory.firebaseapp.com', projectId: 'le-roy-factory',
  appId: '1:249878619253:web:05f051710b6251dbfa843c'
};
let loaded = false, attempt = 0;

async function openApplication(user) {
  const current = ++attempt;
  if (String(user?.email || '').trim().toLowerCase() !== OWNER) {
    if (loaded) {
      // Close immediately, including when an unsaved-project warning prevents
      // the reload after a sign-out or a change of account in another tab.
      document.body.replaceChildren(construction);
      construction.hidden = false; constructionCSS.disabled = false;
      document.head.append(constructionCSS);
      document.querySelector('link[href*="lrf-plan-pose.css"]')?.remove();
      document.title = 'LRF PLAN & POSE · En cours de construction | LE ROY FACTORY';
      location.reload();
    }
    else status.textContent = '';
    return;
  }
  if (loaded) return;
  status.textContent = 'Ouverture de votre atelier privé…';
  let url, nodes = [];
  try {
    const token = await user.getIdToken(true);
    const response = await fetch(API, {method: 'POST', cache: 'no-store', headers: {
      'Content-Type': 'application/json', Authorization: 'Bearer ' + token
    }, body: '{}', signal: AbortSignal.timeout(20000)});
    if (!response.ok) throw new Error('Accès refusé');
    const data = await response.json();
    if (!data.success || typeof data.html !== 'string' || typeof data.module !== 'string') throw new Error('Application indisponible');
    if (attempt !== current) return;
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = 'assets/css/lrf-plan-pose.css?v=20261024-1';
    await new Promise((resolve, reject) => {css.onload = resolve; css.onerror = reject; document.head.append(css);});
    if (attempt !== current) {css.remove(); return;}
    host.innerHTML = data.html;
    nodes = [...host.childNodes];
    construction.hidden = true; constructionCSS.disabled = true;
    document.body.append(...nodes);
    document.body.dataset.mobileView = 'plan';
    url = URL.createObjectURL(new Blob([data.module], {type: 'text/javascript'}));
    await import(url);
    if (attempt !== current) { location.reload(); return; }
    loaded = true;
    constructionCSS.remove();
    host.remove();
    construction.remove();
    document.title = 'LRF PLAN & POSE · Métré & calepinage | LE ROY FACTORY';
  } catch (_) {
    if (attempt !== current) return;
    nodes.forEach(node => node.remove());
    host.replaceChildren(); host.hidden = true;
    construction.hidden = false; constructionCSS.disabled = false;
    document.querySelector('link[href*="lrf-plan-pose.css"]')?.remove();
    status.textContent = 'Accès administrateur indisponible. Reconnectez-vous puis réessayez.';
  } finally {
    if (url) URL.revokeObjectURL(url);
  }
}

try {
  const [appSDK, authSDK] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js')
  ]);
  const app = appSDK.getApps().find(app => app.options.projectId === config.projectId) || appSDK.initializeApp(config);
  const auth = authSDK.getAuth(app);
  authSDK.onAuthStateChanged(auth, openApplication);
  addEventListener('pageshow', event => {if (event.persisted) location.reload();});
} catch (_) {
  // Connection failures cannot expose or start the editor.
}
