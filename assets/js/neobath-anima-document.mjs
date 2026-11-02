export function safeAnimaJSON(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

export function animaFrameDocument(data, moduleURL, parentOrigin = 'https://leroyfactory.fr') {
  const css = data.css.replace(/<\/style/gi, '<\\/style');
  const bridge = `
    (() => {
      const origin = ${safeAnimaJSON(parentOrigin)}, pending = new Map();
      addEventListener('message', event => {
        if (event.source !== parent || event.origin !== origin || event.data?.type !== 'anima-api-result') return;
        const task = pending.get(event.data.requestId); if (!task) return;
        pending.delete(event.data.requestId); clearTimeout(task.timeout);
        if (event.data.ok) task.resolve(event.data.data);
        else {const error = new Error(event.data.error || 'Action impossible.');error.status=event.data.status;error.data=event.data.data;task.reject(error);}
      });
      window.animaAPI = (action, payload = {}) => new Promise((resolve, reject) => {
        if (!['projects-list','projects-save','projects-delete'].includes(action)) {reject(new Error('Action non autorisée.'));return;}
        const requestId = crypto.randomUUID();
        const timeout = setTimeout(() => {pending.delete(requestId);reject(new Error('Le serveur ne répond pas. Réessayez.'));}, 30000);
        pending.set(requestId, {resolve,reject,timeout});
        parent.postMessage({type:'anima-api',requestId,action,payload}, origin);
      });
    })();`;
  return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="https://leroyfactory.fr/"><style>' + css + '</style></head><body>' + data.html + '<script>window.NEOBATH_ANIMA_CATALOGUE=' + safeAnimaJSON(data.catalogue) + ';window.NEOBATH_ANIMA_AGENT=' + safeAnimaJSON(data.identity) + ';' + bridge + '<\/script><script src="https://leroyfactory.fr/assets/vendor/studio-one/three.min.js"><\/script><script type="module" src="' + moduleURL + '"><\/script></body></html>';
}
