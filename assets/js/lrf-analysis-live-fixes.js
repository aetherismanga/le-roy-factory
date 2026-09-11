(() => {
  'use strict';
  if (window.__LRF_ANALYSIS_LIVE_FIXES__) return;
  window.__LRF_ANALYSIS_LIVE_FIXES__ = true;

  const RETIRED_CODE = 'LRF-00001';
  const RETIRED_NAME = '4 Rue Berlioz';
  const VERIFIED_ORDERS = [
    {
      code:'LRF-00184', name:'JEM Carrelages Venelles', partner:'VIEW', at:'2026-09-11T15:59:56+02:00',
      short:'11/09 15:59', detail:'View Ceramica · COCO 40×60 Light · réf. VCC4610L · 57,60 m²',
      drawer:'11/09/2026 à 15:59 · COCO 40×60 Light · réf. VCC4610L · 57,60 m².'
    },
    {
      code:'LRF-00286', name:'SMCE PRESTIGE', partner:'VIEW', at:'2026-09-10T10:50:00+02:00',
      short:'10/09 10:50', detail:'View Ceramica · DIGIONE Oro 60×90 · réf. VDJ6920L20R · Grip R11',
      drawer:'10/09/2026 à 10:50 · DIGIONE Oro 60×90 · réf. VDJ6920L20R · Grip R11.'
    }
  ];

  const norm = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const byIdentity = (text, order) => String(text || '').includes(order.code) || norm(text).includes(norm(order.name));

  function removeRetired(root = document) {
    root.querySelectorAll('tr,.lrf-hot-card,.lrf-online-row,.lrf-event,.lrf-order-row,option').forEach(el => {
      const text = el.textContent || '';
      if (text.includes(RETIRED_CODE) || norm(text).includes(norm(RETIRED_NAME))) el.remove();
    });
    const count = document.querySelector('#lrf-client-count');
    if (count) {
      const visible = [...document.querySelectorAll('#lrf-clients-table-body tr')].filter(r => r.offsetParent !== null && !/aucun client/i.test(r.textContent || '')).length;
      count.textContent = `${visible} client${visible > 1 ? 's' : ''}`;
    }
  }

  function orderInPeriod(order) {
    const select = document.querySelector('#lrf-period');
    const v = select?.value || '7d';
    const ms = new Date(order.at).getTime();
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startYesterday = startToday - 86400000;
    if (v === 'today') return ms >= startToday;
    if (v === 'yesterday') return ms >= startYesterday && ms < startToday;
    if (v === '7d') return ms >= startToday - 6 * 86400000;
    if (v === '30d') return ms >= startToday - 29 * 86400000;
    if (v === '90d') return ms >= startToday - 89 * 86400000;
    if (v === 'month') return new Date(ms).getMonth() === now.getMonth() && new Date(ms).getFullYear() === now.getFullYear();
    if (v === 'prev_month') {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const od = new Date(ms);
      return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear();
    }
    if (v === 'custom') {
      const a = document.querySelector('#lrf-date-start')?.value;
      const b = document.querySelector('#lrf-date-end')?.value;
      const min = a ? new Date(`${a}T00:00:00`).getTime() : -Infinity;
      const max = b ? new Date(`${b}T23:59:59`).getTime() : Infinity;
      return ms >= min && ms <= max;
    }
    return true;
  }

  function includedOrders() { return VERIFIED_ORDERS.filter(orderInPeriod); }

  function openDetail(order) {
    const rows = [...document.querySelectorAll('#lrf-clients-table-body tr')];
    const row = rows.find(r => byIdentity(r.textContent, order));
    const trigger = row?.querySelector('[data-detail-client]');
    if (trigger) { trigger.click(); return; }
    document.querySelector('.lrf-analytics-tab[data-panel="clients"]')?.click();
    setTimeout(() => {
      const retry = [...document.querySelectorAll('#lrf-clients-table-body tr')].find(r => byIdentity(r.textContent, order));
      retry?.querySelector('[data-detail-client]')?.click();
    }, 80);
  }

  function patchVerifiedOrders() {
    const orders = includedOrders();
    document.querySelectorAll('.lrf-kpi').forEach(card => {
      const label = card.querySelector('div>span')?.textContent?.trim().toLowerCase();
      if (label !== 'commandes') return;
      const n = card.querySelector('strong');
      if (!n) return;
      const current = Number((n.textContent || '').replace(/\D/g,'')) || 0;
      n.textContent = String(Math.max(current, orders.length));
    });

    VERIFIED_ORDERS.forEach(order => {
      document.querySelectorAll('#lrf-clients-table-body tr').forEach(row => {
        if (!byIdentity(row.textContent, order)) return;
        const cell = [...row.children].find(td => (td.dataset?.label || '').toLowerCase() === 'commandes');
        if (cell && orderInPeriod(order)) cell.innerHTML = '<strong>1</strong>';
      });
      document.querySelectorAll('.lrf-hot-card').forEach(card => {
        if (!byIdentity(card.textContent, order) || !orderInPeriod(order)) return;
        const reasons = card.querySelector('.lrf-hot-reasons');
        if (reasons && !new RegExp(`commande\\s+${order.partner}`, 'i').test(reasons.textContent || '')) reasons.textContent += ` · 1 commande ${order.partner}`;
      });
    });

    ['#lrf-orders-list','#lrf-overview-orders'].forEach((sel, idx) => {
      const host = document.querySelector(sel);
      if (!host) return;
      host.querySelectorAll('.lrf-verified-order').forEach(x => x.remove());
      if (!orders.length) return;
      if (/aucune commande/i.test(host.textContent || '')) host.innerHTML = '';
      orders.slice().sort((a,b)=>new Date(b.at)-new Date(a.at)).forEach(order => {
        const existing = [...host.querySelectorAll('.lrf-order-row')].some(row => byIdentity(row.textContent, order));
        if (existing) return;
        const btn = document.createElement('button');
        btn.className = 'lrf-order-row lrf-verified-order';
        btn.type = 'button';
        btn.innerHTML = `<span class="lrf-order-icon">🛒</span><span><strong>${order.name}</strong><small>${order.detail}</small></span><time>${order.short}</time><b>Voir →</b>`;
        btn.addEventListener('click', () => openDetail(order));
        host.prepend(btn);
      });
      if (idx === 1) [...host.querySelectorAll('.lrf-order-row')].slice(5).forEach(x => x.remove());
    });

    const drawer = document.querySelector('#lrf-client-drawer.open');
    if (drawer) {
      const order = VERIFIED_ORDERS.find(o => byIdentity(drawer.textContent, o) && orderInPeriod(o));
      if (order) {
        const metrics = drawer.querySelector('#lrf-detail-metrics');
        if (metrics && !metrics.querySelector('[data-verified-order]')) {
          const d = document.createElement('div');
          d.dataset.verifiedOrder = '1';
          d.innerHTML = `<span>Commandes</span><strong>1 · ${order.partner}</strong>`;
          metrics.appendChild(d);
        }
        const signal = drawer.querySelector('.lrf-detail-signal');
        if (signal && !signal.querySelector('[data-order-confirmed]')) {
          const p = document.createElement('p');
          p.dataset.orderConfirmed = '1';
          p.innerHTML = `<strong>🛒 Commande ${order.partner} confirmée</strong><br>${order.drawer}`;
          signal.appendChild(p);
        }
      }
    }
  }

  function makeClientCardsClickable() {
    document.querySelectorAll('.lrf-hot-card').forEach(card => {
      if (card.dataset.clientClickable) return;
      const order = VERIFIED_ORDERS.find(o => byIdentity(card.textContent, o));
      const clientRow = [...document.querySelectorAll('#lrf-clients-table-body tr')].find(r => {
        const name = card.querySelector('.lrf-hot-name')?.textContent?.trim() || '';
        const code = card.querySelector('.lrf-hot-meta')?.textContent?.match(/LRF-\d{5}/)?.[0] || '';
        return (code && r.textContent.includes(code)) || (name && norm(r.textContent).includes(norm(name)));
      });
      const open = () => {
        if (order) return openDetail(order);
        const trigger = clientRow?.querySelector('[data-detail-client]');
        if (trigger) trigger.click();
      };
      card.dataset.clientClickable = '1';
      card.setAttribute('role','button'); card.setAttribute('tabindex','0'); card.style.cursor='pointer';
      card.addEventListener('click', e => { if (!e.target.closest('a,button,input,select')) open(); });
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });

    document.querySelectorAll('#lrf-clients-table-body tr').forEach(row => {
      if (row.dataset.clientClickable) return;
      row.dataset.clientClickable='1';
      row.style.cursor='pointer';
      row.addEventListener('click', e => {
        if (e.target.closest('a,button,input,select')) return;
        row.querySelector('[data-detail-client]')?.click();
      });
    });
  }

  function fixFicheLinks() {
    document.querySelectorAll('a.lrf-open-client[href*="clients.html?edit="]').forEach(a => {
      try {
        const url = new URL(a.href, location.href);
        const id = url.searchParams.get('edit');
        if (!id) return;
        a.href = `clients.html?focus=${encodeURIComponent(id)}`;
        a.textContent = a.textContent.replace(/Fiche CRM/i,'Fiche').replace(/Ouvrir la fiche CRM du client/i,'Ouvrir la fiche principale');
      } catch (_) {}
    });
  }

  function makeDashboardCardsClickable() {
    const map = { 'clients actifs':'clients', 'visites du site':'activity', 'commandes':'orders', 'clients à suivre':'clients' };
    document.querySelectorAll('.lrf-kpi').forEach(card => {
      const label = card.querySelector('div>span')?.textContent?.trim().toLowerCase();
      const panel = map[label];
      if (!panel || card.dataset.clickable) return;
      card.dataset.clickable = '1';
      card.setAttribute('role','button'); card.setAttribute('tabindex','0'); card.style.cursor = 'pointer';
      const open = () => document.querySelector(`.lrf-analytics-tab[data-panel="${panel}"]`)?.click();
      card.addEventListener('click', open);
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });
  }

  function run() {
    removeRetired();
    patchVerifiedOrders();
    fixFicheLinks();
    makeDashboardCardsClickable();
    makeClientCardsClickable();
  }

  let pending = false;
  const schedule = () => { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; run(); }); };
  const observer = new MutationObserver(schedule);
  const boot = () => { observer.observe(document.body, { childList:true, subtree:true }); run(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
