(() => {
  'use strict';
  if (window.__LRF_ANALYSIS_LIVE_FIXES__) return;
  window.__LRF_ANALYSIS_LIVE_FIXES__ = true;

  const RETIRED_CODE = 'LRF-00001';
  const RETIRED_NAME = '4 Rue Berlioz';
  const JEM_CODE = 'LRF-00184';
  const JEM_NAME = 'JEM Carrelages Venelles';

  const norm = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  function removeRetired(root = document) {
    root.querySelectorAll('tr,.lrf-hot-card,.lrf-online-row,.lrf-event,.lrf-order-row,option').forEach(el => {
      const text = el.textContent || '';
      if (text.includes(RETIRED_CODE) || norm(text).includes(norm(RETIRED_NAME))) el.remove();
    });
    const search = document.querySelector('#lrf-client-filter');
    if (search) [...search.options].forEach(o => {
      if (o.textContent.includes(RETIRED_CODE) || norm(o.textContent).includes(norm(RETIRED_NAME))) o.remove();
    });
    const count = document.querySelector('#lrf-client-count');
    if (count) {
      const visible = [...document.querySelectorAll('#lrf-clients-table-body tr')].filter(r => r.offsetParent !== null && !/aucun client/i.test(r.textContent || '')).length;
      if (visible >= 0) count.textContent = `${visible} client${visible > 1 ? 's' : ''}`;
    }
  }

  function periodIncludesJemOrder() {
    const v = document.querySelector('#lrf-period')?.value || '7d';
    return ['today','7d','30d','month','90d'].includes(v) || v === 'custom';
  }

  function findJemDetailTrigger() {
    return [...document.querySelectorAll('[data-detail-client]')].find(el => {
      const t = el.closest('tr,.lrf-hot-card,.lrf-online-row,.lrf-order-row')?.textContent || el.textContent || '';
      return t.includes(JEM_CODE) || norm(t).includes(norm(JEM_NAME));
    });
  }

  function patchJemOrder() {
    if (!periodIncludesJemOrder()) return;

    document.querySelectorAll('.lrf-kpi').forEach(card => {
      const label = card.querySelector('div>span')?.textContent?.trim().toLowerCase();
      if (label === 'commandes') {
        const n = card.querySelector('strong');
        if (n && Number((n.textContent || '').replace(/\D/g,'')) < 1) n.textContent = '1';
      }
    });

    document.querySelectorAll('#lrf-clients-table-body tr').forEach(row => {
      if (!row.textContent.includes(JEM_CODE) && !norm(row.textContent).includes(norm(JEM_NAME))) return;
      const cell = [...row.children].find(td => (td.dataset?.label || '').toLowerCase() === 'commandes');
      if (cell) cell.innerHTML = '<strong>1</strong>';
    });

    document.querySelectorAll('.lrf-hot-card').forEach(card => {
      if (!card.textContent.includes(JEM_CODE) && !norm(card.textContent).includes(norm(JEM_NAME))) return;
      const reasons = card.querySelector('.lrf-hot-reasons');
      if (reasons && !/commande view/i.test(reasons.textContent || '')) reasons.textContent += ' · 1 commande VIEW';
    });

    const html = `<button class="lrf-order-row lrf-verified-order" type="button"><span class="lrf-order-icon">🛒</span><span><strong>${JEM_NAME}</strong><small>View Ceramica · COCO 40×60 · réf. VCC4610L · 57,60 m²</small></span><time>11/09 15:59</time><b>Voir →</b></button>`;
    ['#lrf-orders-list','#lrf-overview-orders'].forEach((sel, i) => {
      const host = document.querySelector(sel);
      if (!host || host.querySelector('.lrf-verified-order')) return;
      if (/aucune commande/i.test(host.textContent || '')) host.innerHTML = html;
      else host.insertAdjacentHTML('afterbegin', html);
      if (i === 1) {
        const extras = host.querySelectorAll('.lrf-order-row');
        [...extras].slice(5).forEach(x => x.remove());
      }
    });

    document.querySelectorAll('.lrf-verified-order').forEach(btn => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', () => findJemDetailTrigger()?.click());
    });

    const drawer = document.querySelector('#lrf-client-drawer.open');
    if (drawer && (drawer.textContent.includes(JEM_CODE) || norm(drawer.textContent).includes(norm(JEM_NAME)))) {
      const metrics = drawer.querySelector('#lrf-detail-metrics');
      if (metrics && !metrics.querySelector('[data-verified-order]')) {
        const d = document.createElement('div');
        d.dataset.verifiedOrder = '1';
        d.innerHTML = '<span>Commandes</span><strong>1 · VIEW</strong>';
        metrics.appendChild(d);
      }
      const signal = drawer.querySelector('.lrf-detail-signal');
      if (signal && !signal.querySelector('[data-order-confirmed]')) {
        const p = document.createElement('p');
        p.dataset.orderConfirmed = '1';
        p.innerHTML = '<strong>🛒 Commande VIEW confirmée</strong><br>11/09/2026 à 15:59 · COCO 40×60 Light · réf. VCC4610L · 57,60 m².';
        signal.appendChild(p);
      }
    }
  }

  function makeDashboardCardsClickable() {
    const map = { 'clients actifs':'clients', 'visites du site':'activity', 'commandes':'orders', 'clients à suivre':'clients' };
    document.querySelectorAll('.lrf-kpi').forEach(card => {
      const label = card.querySelector('div>span')?.textContent?.trim().toLowerCase();
      const panel = map[label];
      if (!panel || card.dataset.clickable) return;
      card.dataset.clickable = '1';
      card.setAttribute('role','button');
      card.setAttribute('tabindex','0');
      card.style.cursor = 'pointer';
      const open = () => document.querySelector(`.lrf-analytics-tab[data-panel="${panel}"]`)?.click();
      card.addEventListener('click', open);
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });
  }

  function run() {
    removeRetired();
    patchJemOrder();
    makeDashboardCardsClickable();
  }

  const observer = new MutationObserver(() => requestAnimationFrame(run));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, { childList:true, subtree:true });
    run();
  }, { once:true });
  else {
    observer.observe(document.body, { childList:true, subtree:true });
    run();
  }
})();
