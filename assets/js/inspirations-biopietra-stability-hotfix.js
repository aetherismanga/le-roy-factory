(() => {
  'use strict';
  if (window.__LRF_BIOPIETRA_STABILITY_HOTFIX__) return;
  window.__LRF_BIOPIETRA_STABILITY_HOTFIX__ = true;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const getModal = () => document.getElementById('biopietra-modal');

  // Les galeries historiques pouvaient demander jusqu'à 100 médias HD d'un coup.
  // On limite uniquement l'API média Biopietra afin d'éviter les gels mémoire sur mobile.
  if (!window.__LRF_BIOPIETRA_FETCH_LIMITED__ && typeof window.fetch === 'function') {
    window.__LRF_BIOPIETRA_FETCH_LIMITED__ = true;
    const nativeFetch = window.fetch.bind(window);
    window.fetch = function(input, init) {
      try {
        const raw = typeof input === 'string' ? input : input?.url;
        if (raw && /biopietra\.com\/wp-json\/wp\/v2\/media/i.test(raw)) {
          const u = new URL(raw, location.href);
          const current = Number(u.searchParams.get('per_page') || 0);
          if (!current || current > 18) u.searchParams.set('per_page', '18');
          if (typeof input === 'string') return nativeFetch(u.toString(), init);
          if (input instanceof Request) return nativeFetch(new Request(u.toString(), input), init);
        }
      } catch (_) {}
      return nativeFetch(input, init);
    };
  }

  function releaseHeavyMedia(modal) {
    if (!modal) return;
    // Libère immédiatement les anciennes images HD lorsque la fiche est fermée.
    $$('.bio-gallery img,.bio-safe-gallery img,.bio-b2-gallery img', modal).forEach(img => {
      try {
        img.removeAttribute('srcset');
        img.removeAttribute('sizes');
        img.src = '';
      } catch (_) {}
    });
    $$('.bio-gallery,.bio-safe-gallery,.bio-b2-gallery', modal).forEach(node => node.remove());
    document.getElementById('bio-fs')?.remove();
    document.getElementById('bio-b2-fs')?.remove();
    $$('.bio-safe-fs').forEach(node => node.remove());
  }

  function closeCleanly(modal) {
    if (!modal) return;
    modal.classList.remove('open');
    // IMPORTANT : ne jamais laisser style="display:none" en inline.
    // Le moteur Biopietra réutilise la même modale pour le produit suivant.
    modal.style.removeProperty('display');
    document.body.style.overflow = '';
    releaseHeavyMedia(modal);
  }

  function ensureReusableModal() {
    const modal = getModal();
    if (!modal) return;
    if (modal.classList.contains('open')) {
      // Corrige une ancienne fermeture qui aurait laissé display:none en inline.
      modal.style.removeProperty('display');
    } else if (modal.style.display === 'none') {
      modal.style.removeProperty('display');
    }
  }

  // Intercepte uniquement le bouton X Biopietra : cela évite que deux anciens
  // gestionnaires de fermeture remettent display:none et rendent l'ouverture suivante impossible.
  document.addEventListener('click', event => {
    const close = event.target.closest?.('.bio-close');
    if (close) {
      const modal = close.closest('.bio-modal') || getModal();
      if (modal) {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeCleanly(modal);
        return;
      }
    }

    const card = event.target.closest?.('.bio-card');
    if (card) {
      // Avant l'ouverture d'une nouvelle référence, on garantit que la modale est réutilisable.
      ensureReusableModal();
      setTimeout(() => {
        ensureReusableModal();
        const modal = getModal();
        if (modal?.classList.contains('open')) modal.scrollTop = 0;
      }, 0);
    }
  }, true);

  // Fermeture en touch/pointer sur certains Android où le click peut être retardé.
  document.addEventListener('pointerdown', event => {
    if (event.target.closest?.('.bio-card')) ensureReusableModal();
  }, true);

  // Si la fermeture se fait en touchant l'arrière-plan de la modale,
  // on nettoie aussi les médias lourds après le gestionnaire natif.
  document.addEventListener('click', event => {
    const modal = getModal();
    if (!modal) return;
    setTimeout(() => {
      if (!modal.classList.contains('open')) {
        modal.style.removeProperty('display');
        document.body.style.overflow = '';
        releaseHeavyMedia(modal);
      } else {
        modal.style.removeProperty('display');
      }
    }, 30);
  }, false);

  window.addEventListener('pagehide', () => {
    const modal = getModal();
    if (modal) releaseHeavyMedia(modal);
    document.body.style.overflow = '';
  });
})();