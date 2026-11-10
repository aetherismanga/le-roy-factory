export function safeAnimaJSON(value) {
  return JSON.stringify(value ?? null).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

// A route changes the private wrapper's state; it never grants a different origin
// or loads an executable address supplied by the iframe.
export function animaRoute(currentURL, {view, search, hash} = {}) {
  const url = new URL(currentURL);
  const nextView = view ?? url.searchParams.get('studioView') ?? 'home';
  if (!['home', 'atelier'].includes(nextView)) throw Error('Vue Anima inconnue.');
  if (search !== undefined) {
    if (typeof search !== 'string' || search.length > 180000) throw Error('Adresse de projet invalide.');
    if (search.startsWith('?') || search === '') url.search = search;
    else {
      const next = new URL(search, url);
      if (!['http:', 'https:'].includes(next.protocol)) throw Error('Adresse de projet invalide.');
      url.search = next.search;
      if (hash === undefined) url.hash = next.hash;
    }
  }
  if (hash !== undefined) {
    if (typeof hash !== 'string' || hash.length > 180000) throw Error('Lien de projet invalide.');
    url.hash = hash;
  }
  url.searchParams.set('studioView', nextView);
  return url.href;
}

export function animaFrameDocument(data, moduleURL, parentOrigin = 'https://leroyfactory.fr', routeURL = parentOrigin + '/neobath-anima-configurateur.html') {
  const displayCatalogue={...data.catalogue,products:data.catalogue.products?.map(product=>({...product,prices:product.prices?.map(price=>({...price,label:String(price.label||'').replace(/\b(?:HT|TTC)\b/g,'').trim()}))}))};
  const css = data.css.replace(/<\/style/gi, '<\\/style');
  const studio = data.engine === 'studio-one';
  const view = data.view === 'atelier' ? 'atelier' : 'home';
  const base = studio ? 'https://studio-one-beta-test-v2.vercel.app/' : 'https://leroyfactory.fr/';
  const bridge = `
    (() => {
      const origin = ${safeAnimaJSON(parentOrigin)}, pending = new Map();
      const nativeUUID = crypto.randomUUID?.bind(crypto);
      const uuid = () => nativeUUID ? nativeUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {const a = new Uint8Array(1); crypto.getRandomValues(a); const n = a[0] & 15; return (c === 'x' ? n : (n & 3) | 8).toString(16);});
      if (!crypto.randomUUID) Object.defineProperty(crypto, 'randomUUID', {value: uuid, configurable: true});
      addEventListener('message', event => {
        if (event.source !== parent || event.origin !== origin) return;
        if (event.data?.type === 'anima-route') {
          window.__ANIMA_ROUTE_URL__ = event.data.url;
          return;
        }
        if (event.data?.type !== 'anima-api-result') return;
        const task = pending.get(event.data.requestId); if (!task) return;
        pending.delete(event.data.requestId); clearTimeout(task.timeout);
        if (event.data.ok) task.resolve(event.data.data);
        else {const error = new Error(event.data.error || 'Action impossible.');error.status=event.data.status;error.data=event.data.data;task.reject(error);}
      });
      window.animaAPI = (action, payload = {}) => new Promise((resolve, reject) => {
        if (!['quote','projects-list','projects-save','projects-delete','projects-email','projects-order'].includes(action)) {reject(new Error('Action non autorisée.'));return;}
        const requestId = uuid();
        const timeout = setTimeout(() => {pending.delete(requestId);reject(new Error('Le serveur ne répond pas. Réessayez.'));}, 30000);
        pending.set(requestId, {resolve,reject,timeout});
        parent.postMessage({type:'anima-api',requestId,action,payload}, origin);
      });
      window.animaNavigate = (nextView, search = '', hash = '') => {
        if (!['home','atelier'].includes(nextView)) throw new Error('Vue Anima inconnue.');
        try {Promise.resolve(window.LRF_PROJECT_WORKSPACE?.flush?.()).catch(() => {});} catch (_) {}
        parent.postMessage({type:'anima-navigate',view:nextView,search,hash}, origin);
      };
      window.animaLogout = () => parent.postMessage({type:'anima-logout'}, origin);
      window.animaHistory = (value, replace = false) => {
        const next = new URL(String(value || ''), window.__ANIMA_ROUTE_URL__);
        next.searchParams.set('studioView', window.__ANIMA_VIEW__);
        window.__ANIMA_ROUTE_URL__ = next.href;
        parent.postMessage({type:'anima-history',url:next.href,replace:replace === true}, origin);
      };
      document.addEventListener('click', event => {
        const a = event.target.closest?.('a[href]');
        if (!a || a.hasAttribute('download') || event.defaultPrevented || a.target === '_blank' || a.target === '_top') return;
        let target; try {target = new URL(a.getAttribute('href'), ${safeAnimaJSON(base)});} catch (_) {return;}
        if (!['accueil.html','index.html','atelier.html','neobath-anima-configurateur.html'].includes(target.pathname.split('/').pop())) return;
        if (!['leroyfactory.fr','www.leroyfactory.fr','studio-one-beta-test-v2.vercel.app'].includes(target.hostname)) return;
        event.preventDefault();
        window.animaNavigate(target.pathname.endsWith('atelier.html') || target.searchParams.get('studioView') === 'atelier' ? 'atelier' : 'home', target.search, target.hash);
      });
    })();`;
  return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><base href="' + base + '"><style>' + css + '</style></head><body' + (studio && view === 'home' ? ' data-view="home"' : '') + '>' + data.html + '<script>window.NEOBATH_ANIMA_CATALOGUE=' + safeAnimaJSON(displayCatalogue) + ';window.NEOBATH_ANIMA_VISUALS=' + safeAnimaJSON(data.visuals || {}) + ';window.NEOBATH_ANIMA_AGENT=' + safeAnimaJSON(data.identity) + ';window.__ANIMA_ROUTE_URL__=' + safeAnimaJSON(routeURL) + ';window.__ANIMA_VIEW__=' + safeAnimaJSON(view) + ';' + bridge + '<\/script>' + (studio ? '' : '<script src="https://leroyfactory.fr/assets/vendor/studio-one/three.min.js"><\/script>') + '<script type="module" src="' + moduleURL + '"><\/script></body></html>';
}
