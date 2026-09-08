(() => {
  'use strict';
  if (window.__LRF_TARIFF_VISIBILITY_TOGGLE__) return;
  window.__LRF_TARIFF_VISIBILITY_TOGGLE__ = true;

  const STYLE_ID = 'lrf-tariff-visibility-style';
  const BTN_CLASS = 'lrf-tariff-visibility-btn';
  const HIDDEN_CLASS = 'lrf-tariff-hidden';
  const HIDDEN_CELL_CLASS = 'lrf-tariff-cell-hidden';
  let observer = null;
  let scanQueued = false;

  const norm = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  function session() {
    try {
      const bridge = window.LRF_PRO_SESSION?.read?.();
      if (bridge) return bridge;
    } catch (_) {}
    if (window.LRF_PRO_CONTEXT) return window.LRF_PRO_CONTEXT;
    try {
      const raw = sessionStorage.getItem('lrfProSession');
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  function hasProAccess() {
    const s = session();
    if (!s || typeof s !== 'object') return false;
    if (s.isAdmin === true || s.admin === true) return true;
    return /^LRF-\d{5}$/.test(String(s.codeClient || '').trim().toUpperCase());
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .lrf-tariff-heading-toggle{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:.75rem!important;flex-wrap:wrap!important}
      .${BTN_CLASS}{appearance:none;border:1px solid rgba(26,37,48,.18);background:#f8f6f1;color:#4d4a43;border-radius:999px;padding:.3rem .62rem;font:700 .72rem/1.1 inherit;letter-spacing:0;cursor:pointer;display:inline-flex;align-items:center;gap:.3rem;white-space:nowrap;box-shadow:none;transition:.18s ease;flex:0 0 auto}
      .${BTN_CLASS}:hover,.${BTN_CLASS}:focus-visible{border-color:#D4AF37;color:#1A2530;background:#fffaf0;outline:none}
      .${BTN_CLASS}[aria-pressed="true"]{background:#111;color:#FFD700;border-color:#D4AF37}
      .${HIDDEN_CLASS}{display:none!important}
      .${HIDDEN_CELL_CLASS}{visibility:hidden!important;pointer-events:none!important}
      th .${BTN_CLASS}{margin-left:.45rem;vertical-align:middle;font-size:.66rem;padding:.25rem .48rem}
      @media(max-width:600px){.lrf-tariff-heading-toggle{align-items:center!important}.${BTN_CLASS}{font-size:.68rem;padding:.28rem .55rem}}
    `;
    document.head.appendChild(style);
  }

  function buttonFor(show, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = BTN_CLASS;
    btn.setAttribute('aria-pressed', show ? 'true' : 'false');
    btn.setAttribute('aria-label', show ? 'Cacher les tarifs professionnels' : 'Afficher les tarifs professionnels');
    btn.title = show ? 'Cacher les tarifs' : 'Voir les tarifs';
    btn.innerHTML = show ? '🙈 Cacher' : '👁 Voir';
    btn.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      onClick(btn);
    });
    return btn;
  }

  function isTariffHeading(el) {
    const t = norm(el?.textContent);
    return /tarifs? professionnels?/.test(t) || /tarifs? pro\b/.test(t) || /prix professionnels?/.test(t);
  }

  function tableHasTariffColumn(table) {
    const headers = Array.from(table?.querySelectorAll('thead th, thead td') || []);
    return headers.some(cell => /\b(tarif|prix|price)\b/.test(norm(cell.textContent)));
  }

  function findTariffTableAfter(heading) {
    let node = heading.nextElementSibling;
    let steps = 0;
    while (node && steps < 6) {
      if (/^H[1-6]$/.test(node.tagName)) break;
      if (node.matches?.('table') && tableHasTariffColumn(node)) return node;
      const nested = node.querySelector?.('table');
      if (nested && tableHasTariffColumn(nested)) return nested;
      node = node.nextElementSibling;
      steps += 1;
    }
    return null;
  }

  function installDedicatedSection(heading) {
    if (!isTariffHeading(heading) || heading.dataset.lrfTariffToggle === '1') return false;
    const table = findTariffTableAfter(heading);
    if (!table) return false;

    heading.dataset.lrfTariffToggle = '1';
    table.dataset.lrfTariffControlled = 'section';
    heading.classList.add('lrf-tariff-heading-toggle');
    table.classList.add(HIDDEN_CLASS);

    let shown = false;
    const btn = buttonFor(false, button => {
      shown = !shown;
      table.classList.toggle(HIDDEN_CLASS, !shown);
      button.setAttribute('aria-pressed', shown ? 'true' : 'false');
      button.setAttribute('aria-label', shown ? 'Cacher les tarifs professionnels' : 'Afficher les tarifs professionnels');
      button.title = shown ? 'Cacher les tarifs' : 'Voir les tarifs';
      button.innerHTML = shown ? '🙈 Cacher' : '👁 Voir';
    });
    heading.appendChild(btn);
    return true;
  }

  function tariffColumnIndex(table) {
    const headers = Array.from(table.querySelectorAll('thead tr:first-child th, thead tr:first-child td'));
    return headers.findIndex(cell => /\b(tarif|prix|price)\b/.test(norm(cell.textContent)));
  }

  function installColumnToggle(table) {
    if (!table || table.dataset.lrfTariffControlled || !tableHasTariffColumn(table)) return;
    const index = tariffColumnIndex(table);
    if (index < 0) return;

    const headerRow = table.querySelector('thead tr:first-child');
    const header = headerRow?.children?.[index];
    if (!header) return;

    table.dataset.lrfTariffControlled = 'column';
    let shown = false;

    const cells = () => Array.from(table.querySelectorAll('tbody tr')).map(row => row.children[index]).filter(Boolean);
    const apply = () => cells().forEach(cell => cell.classList.toggle(HIDDEN_CELL_CLASS, !shown));
    apply();

    const btn = buttonFor(false, button => {
      shown = !shown;
      apply();
      button.setAttribute('aria-pressed', shown ? 'true' : 'false');
      button.setAttribute('aria-label', shown ? 'Cacher les tarifs professionnels' : 'Afficher les tarifs professionnels');
      button.title = shown ? 'Cacher les tarifs' : 'Voir les tarifs';
      button.innerHTML = shown ? '🙈 Cacher' : '👁 Voir';
    });
    header.appendChild(btn);

    const bodyObserver = new MutationObserver(() => apply());
    bodyObserver.observe(table, { childList: true, subtree: true });
  }

  function scan() {
    scanQueued = false;
    if (!hasProAccess()) return;
    injectStyle();

    const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6'));
    headings.filter(isTariffHeading).forEach(installDedicatedSection);

    document.querySelectorAll('table').forEach(table => {
      if (!table.dataset.lrfTariffControlled) installColumnToggle(table);
    });
  }

  function queueScan() {
    if (scanQueued) return;
    scanQueued = true;
    requestAnimationFrame(scan);
  }

  function startObserver() {
    if (observer || !document.documentElement) return;
    observer = new MutationObserver(queueScan);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function init() {
    queueScan();
    startObserver();
  }

  window.addEventListener('lrf-pro-session-changed', () => {
    queueScan();
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
