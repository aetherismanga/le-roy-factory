/* Shared lifecycle helpers for the classic PDF readers. */
(() => {
  'use strict';
  function createAnchor(read, write, find, frame = requestAnimationFrame) {
    let held = null, revision = 0;
    return {
      get locked() { return held !== null; },
      navigate(page) {
        const token = ++revision;
        held = page;
        write(page);
        frame(() => frame(() => frame(() => frame(() => {
          if (token === revision) held = null;
        }))));
      },
      zoom(layout) {
        const page = held === null ? read() : held;
        held = page;
        const token = ++revision;
        layout();
        frame(() => frame(() => {
          if (token !== revision) return;
          find(page)?.scrollIntoView({behavior:'instant', block:'start'});
          write(page);
          frame(() => frame(() => { if (token === revision) held = null; }));
        }));
      }
    };
  }
  function recovery(host, retry = () => location.reload()) {
    host.hidden = false;
    host.replaceChildren();
    const message = document.createElement('strong');
    message.textContent = 'Le catalogue est momentanément indisponible.';
    const hint = document.createElement('p');
    hint.textContent = 'Vérifiez votre connexion, puis réessayez.';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Réessayer';
    button.style.cssText = 'padding:12px 20px;margin:12px;border:1px solid currentColor;border-radius:8px;background:#fff;color:#222;cursor:pointer;font:inherit';
    button.addEventListener('click', () => { button.disabled = true; retry(); });
    const back = document.createElement('a');
    back.href = 'catalogues.html';
    back.textContent = 'Retour aux catalogues';
    back.style.cssText = 'display:block;padding:12px;color:inherit';
    host.setAttribute('role', 'alert');
    host.append(message, hint, button, back);
  }
  globalThis.LRF_PDF_READER = {createAnchor, recovery};
})();
