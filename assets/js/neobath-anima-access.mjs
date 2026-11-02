import {createAnimaSession, isAnimaAgent} from './neobath-anima-session.mjs?v=20261102-studio2';
import {animaFrameDocument, animaRoute} from './neobath-anima-document.mjs?v=20261102-studio2';

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
let signOutAgent = null;
const PROJECT_ACTIONS = new Set(['projects-list', 'projects-save', 'projects-delete', 'projects-email', 'projects-order']);
const selectedView = () => new URL(location.href).searchParams.get('studioView') === 'atelier' ? 'atelier' : 'home';

function unmount() {
  // Destroying the frame releases the full Studio One renderer and all private
  // project state, even if an inner beforeunload handler prevents navigation.
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
    const view = selectedView();
    const token = await user.getIdToken();
    const response = await fetch(API, {method: 'POST', cache: 'no-store', headers: {
      'Content-Type': 'application/json', Authorization: 'Bearer ' + token
    }, body: JSON.stringify({action: 'application', view}), signal: AbortSignal.timeout(45000)});
    let data;
    try {data = await response.json();} catch (_) {throw Error('Atelier momentanément indisponible. Réessayez dans un instant.');}
    if (!response.ok || !data.success) throw Error(data.error || 'Accès refusé. Reconnectez-vous à votre espace agent.');
    if (data.engine !== 'studio-one' || data.view !== view || typeof data.html !== 'string' || typeof data.css !== 'string' || typeof data.module !== 'string' || !data.catalogue || !data.visuals) throw Error('La nouvelle version de l’atelier est en cours de publication. Réessayez dans un instant.');
    return data;
  },
  mount(data) {
    unmount();
    moduleURL = URL.createObjectURL(new Blob([data.module], {type: 'text/javascript'}));
    const frame = document.createElement('iframe');
    frame.title = data.view === 'atelier' ? 'Neobath Anima — atelier 3D' : 'Neobath Anima — configuration Studio One';
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-downloads allow-modals allow-top-navigation-by-user-activation');
    frame.setAttribute('allow', 'fullscreen');
    frame.srcdoc = animaFrameDocument(data, moduleURL, location.origin, animaRoute(location.href, {view: data.view}));
    host.replaceChildren(frame);
    currentFrame = frame;
    shell.hidden = true;
    document.title = 'Neobath Anima · Atelier privé | LE ROY FACTORY';
  }
});

// All iframe requests must originate from the current, authorized Studio One
// instance. Tokens remain in this parent document and never enter project files.
addEventListener('message', async event => {
  const frame = currentFrame;
  const user = currentUser;
  if (!frame || event.source !== frame.contentWindow || event.origin !== location.origin || !isAnimaAgent(user)) return;
  const data = event.data;
  if (data?.type === 'anima-history') {
    try {
      const url = animaRoute(location.href, {view: selectedView(), search: data.url});
      if (url !== location.href) history[data.replace === true ? 'replaceState' : 'pushState']({anima: true}, '', url);
      frame.contentWindow.postMessage({type: 'anima-route', url}, location.origin);
    } catch (_) { /* The current private view remains mounted. */ }
    return;
  }
  if (data?.type === 'anima-navigate') {
    try {
      const url = animaRoute(location.href, {view: data.view, search: data.search, hash: data.hash});
      history.pushState({anima: true}, '', url);
      await refresh(user, {force: true});
    } catch (error) {status.textContent = error.message;}
    return;
  }
  if (data?.type === 'anima-logout') {
    unmount();
    try {await signOutAgent?.();} catch (_) {status.textContent = 'Déconnexion indisponible. Fermez cet onglet puis reconnectez-vous.';}
    return;
  }
  if (data?.type !== 'anima-api') return;
  const {requestId, action, payload} = data;
  if (typeof requestId !== 'string' || requestId.length > 100 || !PROJECT_ACTIONS.has(action)) return;
  let result;
  try {
    const body = {...(payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {}), action};
    const encoded = JSON.stringify(body);
    if (new TextEncoder().encode(encoded).length > 1048576) throw Error('Le projet dépasse la taille autorisée.');
    const token = await user.getIdToken();
    const response = await fetch(API, {method: 'POST', cache: 'no-store', headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + token}, body: encoded, signal: AbortSignal.timeout(65000)});
    const responseData = await response.json();
    if ([401, 403].includes(response.status)) {
      if (frame === currentFrame && currentUser?.uid === user.uid) {unmount();status.textContent = 'Votre session agent a expiré. Reconnectez-vous pour ouvrir cet atelier privé.';}
      return;
    }
    result = {type: 'anima-api-result', requestId, ok: response.ok && responseData.success === true, data: responseData, error: responseData.error || '', status: response.status};
  } catch (error) {
    result = {type: 'anima-api-result', requestId, ok: false, error: error?.message || 'Connexion au serveur impossible.'};
  }
  if (frame === currentFrame && currentUser?.uid === user.uid && isAnimaAgent(currentUser)) frame.contentWindow.postMessage(result, location.origin);
});

document.getElementById('anima-access-retry').addEventListener('click', () => refresh(currentUser, {force: true}));
addEventListener('popstate', () => {
  if (isAnimaAgent(currentUser)) {try {currentFrame?.contentWindow.LRF_PROJECT_WORKSPACE?.flush?.();} catch (_) {}}
  refresh(currentUser, {force: true});
});
addEventListener('pageshow', event => {if (event.persisted) refresh(currentUser, {force: true});});
try {
  const [appSDK, authSDK] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js')
  ]);
  const app = appSDK.getApps().find(app => app.options.projectId === config.projectId) || appSDK.initializeApp(config);
  const auth = authSDK.getAuth(app);
  signOutAgent = () => authSDK.signOut(auth);
  authSDK.onIdTokenChanged(auth, user => {currentUser = user; refresh(user);});
} catch (_) {
  unmount();
  status.textContent = 'Connexion indisponible. Vérifiez votre connexion puis réessayez.';
}
