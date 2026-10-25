/* CRM V2 presentation only: the existing modules keep their data and handlers. */
(() => {
  'use strict';
  if (window.__lrfCrmV2Shell) return;
  window.__lrfCrmV2Shell = true;
  const paths = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m3 10v-3a5 5 0 0 0-3-4"/>',
    map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Zm6-3v15m6-12v15"/>',
    route: '<circle cx="6" cy="5" r="2"/><circle cx="18" cy="19" r="2"/><path d="M8 5h8a4 4 0 0 1 0 8H8a3 3 0 0 0 0 6h8"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18M8 15h3m3 0h2"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Zm0 0v6h6M8 13h8m-8 4h6"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Zm0 0L11 13"/>',
    chart: '<path d="M3 3v18h18M7 16v-5m5 5V7m5 9V4"/>',
    settings: '<path d="m12 3 2 3 4-1 1 4 3 3-3 3-1 4-4-1-2 3-2-3-4 1-1-4-3-3 3-3 1-4 4 1Z"/><circle cx="12" cy="12" r="3"/>',
    folder: '<path d="M3 7V5a2 2 0 0 1 2-2h5l3 3h6a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
    contact: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M5 17a4 4 0 0 1 8 0m2-9h3m-3 4h3m-3 4h3"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    collapse: '<path d="m14 6-6 6 6 6"/>',
  };
  const icon = key => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[key] || paths.folder}</svg>`;
  const fileOf = link => { try { return new URL(link.href, location.href).pathname.split('/').pop(); } catch { return ''; } };
  const routeOf = link => { try { const u = new URL(link.href, location.href); return u.pathname.split('/').pop() + u.search; } catch { return ''; } };
  const current = location.pathname.split('/').pop();
  const definitions = [
    ['TABLEAU DE BORD', [['dashboard.html', 'Accueil', 'home']]],
    ['RELATION CLIENT', [['clients.html', 'Clients', 'users'], ['clients.html?filter=prospect', 'Prospects', 'users'], ['demandes-clients.html', 'Demandes clients', 'file'], ['contacts-partenaires.html', 'Contacts partenaires', 'contact'], ['carte.html', 'Carte commerciale', 'map']]],
    ['ACTIVITÉ', [['agenda.html', 'Agenda', 'calendar'], ['tournees.html', 'Tournées', 'route'], ['comptes-rendus.html', 'Comptes-rendus et relances', 'file']]],
    ['COMMUNICATION', [['mails-groupes.html', 'Mails et historique', 'send']]],
    ['ANALYSE', [['statistiques.html', 'Statistiques', 'chart'], ['analyse-ventes-clients.html', 'Ventes clients', 'chart'], ['analyse-clients-lrf.html', 'Analyse clients LRF', 'chart']]],
    ['OUTILS', [['documents-clients.html', 'Documents clients', 'folder'], ['parametres.html', 'Paramètres', 'settings']]],
  ];
  function boot() {
    const body = document.body;
    if (!body.classList.contains('crm-v2')) return;
    const sidebar = document.querySelector('aside.crm-sidebar');
    const menu = sidebar?.querySelector('.sidebar-menu');
    if (!sidebar || !menu) return;
    const main = document.querySelector('main');
    const mobile = matchMedia('(max-width: 900px)');
    sidebar.id ||= 'crm-v2-sidebar';
    sidebar.setAttribute('aria-label', 'Navigation du CRM');
    sidebar.querySelector('.btn-logout-sidebar')?.setAttribute('aria-label', 'Déconnexion');
    const logoLink = sidebar.querySelector('.sidebar-brand a');
    if (logoLink) logoLink.href = 'dashboard.html';

    // Reuse original <li>/<a> nodes so module-specific listeners stay attached.
    let grouping = false;
    const group = () => {
      if (grouping) return;
      grouping = true;
      observer?.disconnect();
      menu.querySelectorAll('.crm-v2-nav-heading').forEach(el => el.remove());
      const original = [...menu.querySelectorAll(':scope > li')];
      const byFile = new Map();
      for (const li of original) {
        const link = li.querySelector(':scope > a');
        if (!link) continue;
        const file = fileOf(link);
        if (file === 'catalogues.html' || file === 'partenaires.html') { li.remove(); continue; }
        // The old '#' settings placeholder now targets the existing settings module.
        if (link.getAttribute('href') === '#' && /param[eè]tres/i.test(link.textContent)) link.href = 'parametres.html';
        if (link.getAttribute('href') === '#' && /statistiques/i.test(link.textContent)) link.href = 'statistiques.html';
        if (!byFile.has(routeOf(link))) byFile.set(routeOf(link), li);
      }
      const used = new Set();
      for (const [title, entries] of definitions) {
        // Every target below is an existing CRM page. Create a consistent menu
        // on pages whose legacy copy omitted some of these modules.
        const matched = entries;
        const heading = document.createElement('li');
        heading.className = 'crm-v2-nav-heading'; heading.textContent = title; heading.setAttribute('role', 'presentation'); menu.append(heading);
        for (const [file, label, symbol] of matched) {
          let li = byFile.get(file);
          if (!li) { li = document.createElement('li'); const a = document.createElement('a'); a.href = file; const t = document.createElement('span'); t.className = 'menu-text'; a.append(t); li.append(a); }
          const link = li.querySelector(':scope > a');
          used.add(li);
          let pic = link.querySelector('.icon');
          if (!pic) { pic = document.createElement('span'); pic.className = 'icon'; link.prepend(pic); }
          pic.innerHTML = icon(symbol);
          const text = link.querySelector('.menu-text');
          if (text) text.textContent = label;
          const isCurrent = current === file.split('?')[0] && (file.includes('?') ? location.search === file.slice(file.indexOf('?')) : !location.search.includes('filter=prospect'));
          link.title = label; link.classList.toggle('active', isCurrent);
          if (isCurrent) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
          menu.append(li);
        }
      }
      const rest = original.filter(li => li.isConnected && !used.has(li) && !li.classList.contains('crm-v2-nav-heading'));
      if (rest.length) {
        const heading = document.createElement('li'); heading.className = 'crm-v2-nav-heading'; heading.textContent = 'AUTRES OUTILS'; heading.setAttribute('role', 'presentation'); menu.append(heading);
        rest.forEach(li => menu.append(li));
      }
      grouping = false;
      observer?.observe(menu, { childList: true });
    };
    const observer = new MutationObserver(group);
    group();
    const close = document.createElement('button');
    close.type = 'button'; close.className = 'crm-v2-drawer-close'; close.innerHTML = icon('close'); close.setAttribute('aria-label', 'Fermer le menu'); sidebar.prepend(close);
    const collapse = document.createElement('button');
    collapse.type = 'button'; collapse.className = 'crm-v2-collapse'; collapse.innerHTML = `${icon('collapse')}<span>Réduire le menu</span>`; collapse.setAttribute('aria-label', 'Réduire le menu'); collapse.setAttribute('aria-expanded', 'true'); sidebar.append(collapse);
    try { body.classList.toggle('crm-v2-collapsed', localStorage.getItem('lrf:crm:v2:collapsed') === '1'); } catch {}
    collapse.setAttribute('aria-expanded', String(!body.classList.contains('crm-v2-collapsed')));
    collapse.addEventListener('click', () => {
      const collapsed = body.classList.toggle('crm-v2-collapsed');
      collapse.setAttribute('aria-expanded', String(!collapsed)); collapse.setAttribute('aria-label', collapsed ? 'Développer le menu' : 'Réduire le menu');
      try { localStorage.setItem('lrf:crm:v2:collapsed', collapsed ? '1' : '0'); } catch {}
      window.dispatchEvent(new Event('resize'));
    });
    const backdrop = document.createElement('button');
    backdrop.className = 'crm-v2-backdrop'; backdrop.type = 'button'; backdrop.setAttribute('aria-label', 'Fermer le menu'); backdrop.hidden = true; body.append(backdrop);
    const appbar = document.createElement('header'); appbar.className = 'crm-v2-appbar';
    const brand = document.createElement('a'); brand.className = 'crm-v2-brand'; brand.href = 'dashboard.html'; brand.setAttribute('aria-label', 'LE ROY FACTORY — Accueil');
    const logo = sidebar.querySelector('.sidebar-brand img');
    if (logo) { const copy = logo.cloneNode(); copy.removeAttribute('id'); copy.alt = 'LE ROY FACTORY'; brand.append(copy); }
    const brandCopy = document.createElement('span'); brandCopy.innerHTML = '<strong>LE ROY FACTORY</strong><small>Espace commercial</small>'; brand.append(brandCopy);
    const moment = document.createElement('span'); moment.className = 'crm-v2-moment';
    appbar.append(brand, moment); body.prepend(appbar);
    const tick = () => {
      const now = new Date(); moment.replaceChildren();
      const date = document.createElement('span'); date.textContent = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
      const time = document.createElement('time'); time.dateTime = now.toISOString(); time.textContent = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      moment.append(date, time);
    }; tick(); let clockTimer = setInterval(tick, 30000);
    window.addEventListener('pagehide', () => clearInterval(clockTimer));
    window.addEventListener('pageshow', event => { if (event.persisted) { tick(); clockTimer = setInterval(tick, 30000); } });
    const bottom = document.createElement('nav'); bottom.className = 'crm-v2-bottom-nav'; bottom.setAttribute('aria-label', 'Navigation principale');
    for (const [file, label, symbol] of [['dashboard.html', 'Accueil', 'home'], ['clients.html', 'Clients', 'users'], ['carte.html', 'Carte', 'map'], ['tournees.html', 'Tournées', 'route']]) {
      const a = document.createElement('a'); a.href = file; a.innerHTML = `${icon(symbol)}<span>${label}</span>`;
      if (current === file) a.setAttribute('aria-current', 'page'); bottom.append(a);
    }
    const menuButton = document.createElement('button'); menuButton.type = 'button'; menuButton.innerHTML = `${icon('menu')}<span>Menu</span>`;
    menuButton.setAttribute('aria-label', 'Ouvrir le menu'); menuButton.setAttribute('aria-controls', sidebar.id); menuButton.setAttribute('aria-expanded', 'false'); bottom.append(menuButton); body.append(bottom);
    let lastFocus = null;
    function setOpen(open) {
      if (open) lastFocus = document.activeElement;
      body.classList.toggle('crm-v2-menu-open', open); backdrop.hidden = !open; menuButton.setAttribute('aria-expanded', String(open));
      sidebar.classList.remove('mobile-open'); body.classList.remove('crm-menu-open');
      if (mobile.matches) { sidebar.inert = !open; if (main) main.inert = open; sidebar.setAttribute('aria-hidden', String(!open)); }
      if (open) close.focus(); else if (lastFocus?.isConnected) lastFocus.focus();
    }
    menuButton.addEventListener('click', () => setOpen(!body.classList.contains('crm-v2-menu-open')));
    close.addEventListener('click', () => setOpen(false)); backdrop.addEventListener('click', () => setOpen(false));
    menu.addEventListener('click', event => { if (mobile.matches && event.target.closest('a[href]')) setOpen(false); });
    document.addEventListener('keydown', event => {
      if (!body.classList.contains('crm-v2-menu-open')) return;
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
      if (event.key === 'Tab') {
        const items = [...sidebar.querySelectorAll('a[href],button:not([disabled])')].filter(el => el.getClientRects().length);
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    });
    const mediaChange = () => {
      setOpen(false); sidebar.inert = mobile.matches; sidebar.setAttribute('aria-hidden', String(mobile.matches)); if (main) main.inert = false;
    }; mediaChange(); mobile.addEventListener('change', mediaChange);
    // visualViewport follows the on-screen keyboard; no fixed control covers inputs.
    const viewport = window.visualViewport;
    let restingHeight = viewport?.height || innerHeight;
    const keyboardChange = () => {
      const editing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '');
      const height = viewport?.height || innerHeight;
      const covered = Math.max(innerHeight, restingHeight) - height > 150;
      body.classList.toggle('crm-v2-keyboard-open', Boolean(editing && covered));
      if (!editing) restingHeight = height;
    };
    viewport?.addEventListener('resize', keyboardChange);
    document.addEventListener('focusin', keyboardChange);
    document.addEventListener('focusout', () => setTimeout(keyboardChange, 0));

  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();
