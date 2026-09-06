(() => {
  'use strict';

  const PAGE = 'disponibilites-elios.html?collection=ROMA';
  const STYLE_ID = 'lrf-elios-stock-cta-style';

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .lrf-elios-stock-cta{margin:18px 0 4px;padding:15px;border:1px solid #b9dcc6;background:#f1faf4;border-radius:14px}
      .lrf-elios-stock-cta strong{display:block;color:#17623a;font-size:.92rem;margin-bottom:5px}
      .lrf-elios-stock-cta p{margin:0 0 11px;color:#536259;font-size:.78rem;line-height:1.45}
      .lrf-elios-stock-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;width:100%;border:0;border-radius:10px;padding:12px 15px;background:#17623a;color:#fff;font-weight:900;font-size:.92rem;cursor:pointer;box-shadow:0 5px 14px rgba(23,98,58,.18)}
      .lrf-elios-stock-btn:hover{background:#104d2d}
    `;
    document.head.appendChild(style);
  }

  function isRomaModal(card) {
    const title = card.querySelector('h2,h3')?.textContent || '';
    return /\broma\b/i.test(title) || /\broma\b/i.test(card.textContent || '');
  }

  function injectRomaButton() {
    const card = document.getElementById('product-modal-v2-card');
    if (!card || !isRomaModal(card) || card.querySelector('.lrf-elios-stock-cta')) return;

    const cta = document.createElement('div');
    cta.className = 'lrf-elios-stock-cta';
    cta.innerHTML = `
      <strong>Disponibilités usine ELIOS</strong>
      <p>Voir les références de la collection ROMA et le stock disponible en m².</p>
      <button type="button" class="lrf-elios-stock-btn">● Voir les disponibilités</button>
    `;
    cta.querySelector('button').addEventListener('click', () => {
      window.location.href = PAGE;
    });

    card.appendChild(cta);
  }

  function start() {
    installStyle();
    injectRomaButton();
    const card = document.getElementById('product-modal-v2-card');
    if (card) new MutationObserver(injectRomaButton).observe(card, { childList: true, subtree: true, characterData: true });
    else new MutationObserver(injectRomaButton).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
