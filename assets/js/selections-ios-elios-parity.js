(() => {
  'use strict';
  if (window.__LRF_IOS_ELIOS_PARITY__) return;
  window.__LRF_IOS_ELIOS_PARITY__ = true;

  const norm = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  let activeId = '';

  function hasEliosAccess() {
    try {
      const s = window.LRF_PRO_SESSION?.read?.() || JSON.parse(sessionStorage.getItem('lrfProSession') || 'null');
      if (!s) return false;
      if (s.isAdmin || s.admin) return true;
      return Array.isArray(s.partenaires) && s.partenaires.some(p => {
        const n = norm(p);
        return n === 'elios' || n === 'elios-ceramica' || n === 'eliosceramica';
      });
    } catch (_) { return false; }
  }

  function slugFromId(id) {
    const raw = String(id || '').replace(/^elios-/,'');
    const aliases = {
      'loveanddecors':'love-decors',
      'love-and-decors':'love-decors',
      'millenniumquartz':'millennium-quartz',
      'grandplace':'grand-place',
      'bavariastone':'bavaria-stone',
      'terreetrusche':'terre-etrusche',
      'goldenhour':'golden-hour',
      'design-evo':'d-esign-evo'
    };
    return aliases[raw] || raw;
  }

  function ensureStyle() {
    if (document.getElementById('lrf-ios-elios-parity-style')) return;
    const style = document.createElement('style');
    style.id = 'lrf-ios-elios-parity-style';
    style.textContent = `
      .lrf-ios-elios-stock{margin:14px 0 2px;padding:14px;border:1px solid #add2bb;border-radius:14px;background:#eef8f1;color:#24543a}
      .lrf-ios-elios-stock h3{margin:0 0 5px;font-size:1rem;color:#24543a}
      .lrf-ios-elios-stock p{margin:0 0 11px;font-size:.8rem;line-height:1.45;color:#5e6d63}
      .lrf-ios-elios-stock a{display:flex;align-items:center;justify-content:center;min-height:48px;border-radius:10px;background:#2d6745;color:#fff!important;text-decoration:none;font-weight:850;font-size:.9rem}
    `;
    document.head.appendChild(style);
  }

  function addStockPanel() {
    if (!hasEliosAccess()) return;
    const modal = document.getElementById('product-modal-v2-card');
    if (!modal || !modal.closest('#product-modal-v2')?.classList.contains('open')) return;
    if (modal.querySelector('.lrf-ios-elios-stock')) return;
    const title = modal.querySelector('.modal-v2-info h2')?.textContent?.trim() || '';
    if (!title || !activeId.startsWith('elios-')) return;
    const slug = slugFromId(activeId);
    if (!slug) return;

    ensureStyle();
    const info = modal.querySelector('.modal-v2-info');
    if (!info) return;
    const section = document.createElement('section');
    section.className = 'lrf-ios-elios-stock';
    section.innerHTML = '<h3>Disponibilités & commande ELIOS</h3><p>Voir toutes les références, conditionnements, stocks usine et pièces spéciales de '+
      title.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))+
      '.</p><a href="disponibilites-elios-lot1.html?collection='+encodeURIComponent(slug)+'">● Voir les stocks & commander</a>';
    info.appendChild(section);
  }

  document.addEventListener('click', e => {
    const card = e.target.closest?.('#partner-products .product-card-v2[data-id]');
    if (card) {
      activeId = card.dataset.id || '';
      setTimeout(addStockPanel, 0);
      setTimeout(addStockPanel, 80);
    }
  }, true);

  window.addEventListener('lrf-pro-session-changed', () => setTimeout(addStockPanel, 50));
})();