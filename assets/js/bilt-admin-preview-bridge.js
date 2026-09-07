(() => {
  'use strict';

  const ORDER_API = 'https://us-central1-le-roy-factory.cloudfunctions.net/biltOrder';
  const ADMIN_API = 'https://us-central1-le-roy-factory.cloudfunctions.net/biltAdminPreview';
  const SENTINEL = '__LRF_BILT_ADMIN_PREVIEW__';
  const ADMIN_EMAILS = new Set(['jerome@leroyfactory.fr', 'coryne@leroyfactory.fr']);
  const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyA3iuK5Ua8kFccURSqLihLshHnhA4rm2is',
    authDomain: 'le-roy-factory.firebaseapp.com',
    projectId: 'le-roy-factory',
    storageBucket: 'le-roy-factory.firebasestorage.app',
    messagingSenderId: '249878619253',
    appId: '1:249878619253:web:05f051710b6251dbfa843c'
  };

  const sessionApi = window.LRF_PRO_SESSION;
  if (!sessionApi || sessionApi.__biltAdminPreviewPatched) return;

  const originalRead = sessionApi.read.bind(sessionApi);
  const originalRestore = sessionApi.restore?.bind(sessionApi);
  const originalFetch = window.fetch.bind(window);

  function withPreviewToken(session) {
    return session?.isAdmin ? { ...session, sessionToken: SENTINEL } : session;
  }

  sessionApi.read = () => withPreviewToken(originalRead());
  if (originalRestore) {
    sessionApi.restore = async () => withPreviewToken(await originalRestore());
  }
  sessionApi.__biltAdminPreviewPatched = true;

  async function getAdminIdToken() {
    const [appModule, authModule] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js')
    ]);
    const app = appModule.getApps().length ? appModule.getApp() : appModule.initializeApp(FIREBASE_CONFIG);
    const auth = authModule.getAuth(app);

    let user = auth.currentUser;
    if (!user) {
      user = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          try { unsubscribe(); } catch (_) {}
          reject(new Error('Session administrateur Firebase indisponible. Rechargez la page.'));
        }, 5000);
        const unsubscribe = authModule.onAuthStateChanged(auth, current => {
          if (!current) return;
          clearTimeout(timer);
          unsubscribe();
          resolve(current);
        });
      });
    }

    const email = String(user?.email || '').trim().toLowerCase();
    if (!ADMIN_EMAILS.has(email)) throw new Error('Compte administrateur LE ROY FACTORY non reconnu.');
    return user.getIdToken();
  }

  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url;
    if (url === ORDER_API && String(init?.method || 'GET').toUpperCase() === 'POST') {
      let payload = null;
      try { payload = JSON.parse(String(init?.body || '{}')); } catch (_) {}
      if (payload?.sessionToken === SENTINEL) {
        const adminToken = await getAdminIdToken();
        const nextPayload = { ...payload, adminToken };
        delete nextPayload.sessionToken;
        return originalFetch(ADMIN_API, { ...init, body: JSON.stringify(nextPayload) });
      }
    }
    return originalFetch(input, init);
  };

  function applyAdminUi() {
    const session = originalRead();
    if (!session?.isAdmin) return;

    let banner = document.getElementById('bilt-admin-preview-banner');
    const account = document.querySelector('.account');
    if (!banner && account?.parentNode) {
      banner = document.createElement('div');
      banner.id = 'bilt-admin-preview-banner';
      banner.style.cssText = 'margin:0 0 16px;padding:13px 16px;border:1px solid #d6b453;border-radius:12px;background:#fff8df;color:#5f4a12;font-weight:800;line-height:1.45';
      banner.innerHTML = 'MODE ADMINISTRATEUR — catalogue, tarifs, panier et présentation disponibles. <strong>Aucun e-mail BILT et aucune commande réelle ne peuvent être envoyés depuis ce mode.</strong>';
      account.parentNode.insertBefore(banner, account);
    }

    const button = document.getElementById('submit-order');
    if (button) {
      button.disabled = true;
      button.textContent = 'MODE ADMIN — ENVOI E-MAIL BLOQUÉ';
      button.title = 'Sécurité administrateur : aucun e-mail ni commande réelle ne peut partir.';
    }

    const fine = document.querySelector('#order-form .fine');
    if (fine) {
      fine.textContent = 'Mode administrateur de démonstration : vous pouvez ajouter les produits, vérifier les minimums, les tarifs et le total du panier. L’envoi réel et tous les e-mails sont bloqués.';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyAdminUi();
    const observer = new MutationObserver(applyAdminUi);
    observer.observe(document.body, { childList: true, subtree: true });
  }, { once: true });
})();
