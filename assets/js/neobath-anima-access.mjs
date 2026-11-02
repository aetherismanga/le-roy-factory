import {createAnimaSession, isAnimaAgent} from './neobath-anima-session.mjs?v=20261102-1';
import {animaFrameDocument} from './neobath-anima-document.mjs?v=20261102-1';

const API = 'https://us-central1-le-roy-factory.cloudfunctions.net/neobathAnimaApplication';
const shell = document.getElementById('anima-private-shell');
const host = document.getElementById('anima-private-host');
const status = document.getElementById('anima-access-status');
const config = {
  apiKey: 'AIzaSyA3iuK5Ua8kFccURSqLihLshHnhA4rm2is',
  authDomain: 'le-roy-factory.firebaseapp.com', projectId: 'le-roy-factory',
  appId: '1:249878619253:web:05f051710b6251dbfa843c'
};
let currentUser = null;
let moduleURL = '';
let currentFrame = null;
const PROJECT_ACTIONS = new Set(['projects-list', 'projects-save', 'projects-delete']);

function unmount() {
  // Removing the iframe destroys its renderer, timers, private data and DOM,
  // even if an application beforeunload handler would block a page reload.
  host.replaceChildren();
  currentFrame = null;
  if (moduleURL) URL.revokeObjectURL(moduleURL);
  moduleURL = '';
  shell.hidden = false;
  document.title = 'Atelier privé | LE ROY FACTORY';
}
const refresh = createAnimaSession({
  unmount,
  status(message) {status.textContent = message;},
  async request(user) {
    const token = await user.getIdToken();
    const response = await fetch(API, {method: 'POST', cache: 'no-store', headers: {
      'Content-Type': 'application/json', Authorization: 'Bearer ' + token
    }, body: JSON.stringify({action: 'application'}), signal: AbortSignal.timeout(25000)});
    let data;
    try {data = await response.json();} catch (_) {throw Error('Atelier momentanément indisponible. Réessayez dans un instant.');}
    if (!response.ok || !data.success) throw Error(data.error || 'Accès refusé. Reconnectez-vous à votre espace agent.');
    if (typeof data.html !== 'string' || typeof data.css !== 'string' || typeof data.module !== 'string' || !data.catalogue) throw Error('L’atelier est incomplet. Réessayez dans un instant.');
    return data;
  },
  mount(data) {
    unmount();
    moduleURL = URL.createObjectURL(new Blob([data.module], {type: 'text/javascript'}));
    const frame = document.createElement('iframe');
    frame.title = 'Neobath Anima — atelier privé 3D';
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-downloads allow-modals allow-top-navigation-by-user-activation');
    frame.setAttribute('allow', 'fullscreen');
    frame.srcdoc = animaFrameDocument(data, moduleURL, location.origin);
    host.replaceChildren(frame);
    currentFrame = frame;
    shell.hidden = true;
    document.title = 'Neobath Anima · Atelier privé | LE ROY FACTORY';
  }
});

// Tokens stay in the top-level authenticated page. The private iframe receives
// only the narrowly permitted project results, and stale frames receive none.
addEventListener('message', async event => {
  const frame = currentFrame;
  if (!frame || event.source !== frame.contentWindow || event.origin !== location.origin || event.data?.type !== 'anima-api') return;
  const {requestId, action, payload} = event.data;
  if (typeof requestId !== 'string' || requestId.length > 100 || !PROJECT_ACTIONS.has(action)) return;
  const user = currentUser;
  if (!isAnimaAgent(user)) return;
  let result;
  try {
    const body = { ...(payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {}), action};
    const encoded = JSON.stringify(body);
    if (new TextEncoder().encode(encoded).length > 1048576) throw Error('Le projet dépasse la taille autorisée.');
    const token = await user.getIdToken();
    const response = await fetch(API, {method: 'POST', cache: 'no-store', headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + token}, body: encoded, signal: AbortSignal.timeout(25000)});
    const data = await response.json();
    result = {type: 'anima-api-result', requestId, ok: response.ok && data.success === true, data, error: data.error || '', status: response.status};
  } catch (error) {
    result = {type: 'anima-api-result', requestId, ok: false, error: error?.message || 'Connexion au serveur impossible.'};
  }
  if (frame === currentFrame && currentUser?.uid === user.uid && isAnimaAgent(currentUser)) frame.contentWindow.postMessage(result, location.origin);
});

document.getElementById('anima-access-retry').addEventListener('click', () => refresh(currentUser));
addEventListener('pageshow', event => {if (event.persisted) {unmount(); refresh(currentUser);}});
try {
  const [appSDK, authSDK] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js')
  ]);
  const app = appSDK.getApps().find(app => app.options.projectId === config.projectId) || appSDK.initializeApp(config);
  const auth = authSDK.getAuth(app);
  // Also reauthorize refreshed tokens; a rejected/revoked session closes the app.
  authSDK.onIdTokenChanged(auth, user => {currentUser = user; refresh(user);});
} catch (_) {
  unmount();
  status.textContent = 'Connexion indisponible. Vérifiez votre connexion puis réessayez.';
}
