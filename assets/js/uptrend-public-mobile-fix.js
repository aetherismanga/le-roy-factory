(() => {
  'use strict';

  const ADMIN_EMAILS = new Set(['jerome@leroyfactory.fr','coryne@leroyfactory.fr']);

  function readSession() {
    try {
      const value = window.LRF_PRO_SESSION?.read?.() || JSON.parse(sessionStorage.getItem('lrfProSession') || 'null');
      if (!value) return null;
      const email = String(value.email || value.adminEmail || '').trim().toLowerCase();
      if ((value.isAdmin === true || value.admin === true) && ADMIN_EMAILS.has(email)) return value;
      if (!/^LRF-\d{5}$/.test(String(value.codeClient || '').toUpperCase()) || !value.departement) return null;
      return value;
    } catch (_) {
      return null;
    }
  }

  function installDealerButton() {
    const actions = document.querySelector('.up-dialog-actions');
    if (!actions || document.getElementById('dealer-open')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'dealer-open';
    button.className = 'up-primary up-dealer-button';
    button.textContent = 'Trouver votre magasin revendeur';
    button.addEventListener('click', () => {
      const ref = (document.getElementById('dialog-ref')?.textContent || '').trim();
      const url = new URL('contact.html', location.href);
      url.searchParams.set('objet', 'revendeur');
      url.searchParams.set('marque', 'UPTREND');
      if (ref) url.searchParams.set('ref', ref);
      location.href = url.href;
    });
    const close = document.getElementById('dialog-cancel');
    actions.insertBefore(button, close || actions.firstChild);
  }

  function applyPublicMode() {
    const publicMode = !readSession();
    document.body.classList.toggle('up-public-mode', publicMode);

    const lexiconLabel = document.querySelector('#lexicon-button span');
    if (lexiconLabel) lexiconLabel.textContent = 'Lexique';

    if (!publicMode) return;

    installDealerButton();

    const add = document.getElementById('add-to-cart');
    const pro = document.getElementById('pro-login');
    const cart = document.querySelector('.up-cart-bar');
    if (add) add.hidden = true;
    if (pro) pro.hidden = true;
    if (cart) cart.hidden = true;

    const help = document.querySelector('.up-help');
    if (help) help.innerHTML = '<span class="up-pulse"></span> Touchez une référence pour consulter le produit.';

    const message = document.getElementById('dialog-message');
    if (message && /connectez-vous|accès pro/i.test(message.textContent || '')) message.hidden = true;
  }

  function keepPublicActionsClean() {
    if (readSession()) return;
    const add = document.getElementById('add-to-cart');
    const pro = document.getElementById('pro-login');
    const cart = document.querySelector('.up-cart-bar');
    if (add) add.hidden = true;
    if (pro) pro.hidden = true;
    if (cart) cart.hidden = true;
    installDealerButton();
    const message = document.getElementById('dialog-message');
    if (message && /connectez-vous|accès pro/i.test(message.textContent || '')) message.hidden = true;
  }

  function init() {
    applyPublicMode();
    const dialog = document.getElementById('product-dialog');
    if (dialog) {
      new MutationObserver(keepPublicActionsClean).observe(dialog, {
        attributes: true,
        subtree: true,
        childList: true,
        characterData: true,
        attributeFilter: ['hidden','open']
      });
    }
    window.addEventListener('storage', applyPublicMode);
    window.addEventListener('pageshow', applyPublicMode);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
