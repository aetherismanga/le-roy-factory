/* CRM V2 — presentation only. All writes remain in the existing CRM services. */
const clean = value => String(value ?? '').trim();

export function clientContactLinks({ phone = '', email = '', address = '' } = {}) {
  const number = clean(phone).replace(/^\+33\s*\(0\)/, '+33').replace(/[\s.()\-]/g, '');
  const mail = clean(email);
  return {
    phone: /^\+?\d{6,16}$/.test(number) ? `tel:${number}` : '',
    email: /^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(mail)
      ? `mailto:${encodeURIComponent(mail).replace(/%40/gi, '@')}` : '',
    map: clean(address) ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(clean(address))}` : '',
  };
}

export function clientAppointmentUrl(clientId, company) {
  const id = clean(clientId);
  return id ? `agenda.html?${new URLSearchParams({ clientId: id, clientName: clean(company) })}` : '';
}

const icons = {
  call: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.9.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
  map: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  note: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M12 13v5M9.5 15.5h5"/>',
  partners: '<path d="M3 21V9l6 3V9l6 3V4h5v17ZM3 21h18M7 16h1M11 16h1M16 16h1"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;

function initClientPresentation() {
  const modal = document.getElementById('client-modal');
  const tableBody = document.getElementById('clients-table-body');
  if (!modal || !tableBody) return;
  let currentId = '', openedClient = null, creating = false, queued = false;
  const field = id => clean(document.getElementById(id)?.value);
  const visible = () => getComputedStyle(modal).display !== 'none';
  let actions;

  function useTab(tab, focusId) {
    modal.querySelector(`.lrf-tab[data-tab="${tab}"]`)?.click();
    const target = focusId ? document.getElementById(focusId) : modal.querySelector(`[data-lrf-pane="${tab}"]`);
    if (!target) return;
    target.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    if (focusId) target.focus({ preventScroll: true });
  }

  function mountActions() {
    const header = modal.querySelector('.modal-header');
    if (actions?.isConnected) {
      if (header && header.nextElementSibling !== actions) header.insertAdjacentElement('afterend', actions);
      return;
    }
    if (!header) return;
    actions = document.createElement('nav');
    actions.id = 'lrf-v2-client-actions';
    actions.className = 'lrf-v2-client-actions';
    actions.setAttribute('aria-label', 'Actions de la fiche client');
    actions.innerHTML = `<a data-contact="phone">${icon('call')}<span>Appeler</span></a>
      <a data-contact="email">${icon('mail')}<span>E-mail</span></a>
      <a data-contact="map" target="_blank" rel="noopener noreferrer">${icon('map')}<span>GPS</span></a>
      <button type="button" data-client-action="report">${icon('note')}<span>Compte-rendu</span></button>
      <a data-contact="appointment" target="_blank" rel="noopener noreferrer">${icon('calendar')}<span>Rendez-vous</span></a>
      <button type="button" data-client-action="partners">${icon('partners')}<span>Partenaires</span></button>`;
    header.insertAdjacentElement('afterend', actions);
    actions.addEventListener('click', event => {
      const action = event.target.closest('[data-client-action]')?.dataset.clientAction;
      if (action === 'report') useTab('history', 'cr-text-input');
      if (action === 'partners') useTab('partners');
      if (event.target.closest('[aria-disabled="true"]')) event.preventDefault();
    });
  }

  function updateAction(anchor, href, unavailable) {
    if (!anchor) return;
    if (href) {
      if (anchor.getAttribute('href') !== href) anchor.setAttribute('href', href);
      anchor.removeAttribute('aria-disabled');
      anchor.removeAttribute('tabindex');
      anchor.title = '';
    } else {
      anchor.removeAttribute('href');
      anchor.setAttribute('aria-disabled', 'true');
      anchor.setAttribute('tabindex', '-1');
      anchor.title = unavailable;
    }
  }

  function refreshActions() {
    if (!visible()) { document.body.classList.remove('lrf-v2-client-open'); return; }
    document.body.classList.add('lrf-v2-client-open');
    mountActions();
    if (!actions) return;
    const phone = [...modal.querySelectorAll('#phones-container .phone-input')].map(input => clean(input.value)).find(Boolean) || '';
    const links = clientContactLinks({ phone, email: field('edit-email'), address: [field('edit-adresse'), field('edit-code-postal'), field('edit-ville')].filter(Boolean).join(', ') });
    for (const [name, url] of Object.entries(links)) updateAction(actions.querySelector(`[data-contact="${name}"]`), url, 'Coordonnée non renseignée');
    const exactId = creating ? '' : clean(modal.dataset.clientId || currentId || window.__LRF_EXACT_CLIENT_ID__);
    updateAction(actions.querySelector('[data-contact="appointment"]'), clientAppointmentUrl(exactId, field('edit-societe')), 'Enregistrez cette nouvelle fiche pour préparer un rendez-vous');
    const code = document.getElementById('edit-code-client');
    if (code) { code.setAttribute('aria-readonly', 'true'); code.setAttribute('autocomplete', 'off'); }
    const codeValue = creating ? '' : clean(code?.value || openedClient?.codeClient);
    let identity = document.getElementById('lrf-v2-client-reference');
    if (!identity && codeValue) {
      identity = document.createElement('p'); identity.id = 'lrf-v2-client-reference';
      identity.className = 'lrf-v2-client-reference'; modal.querySelector('.modal-header')?.appendChild(identity);
    }
    if (identity) {
      identity.hidden = !codeValue;
      if (identity.textContent !== codeValue) identity.textContent = codeValue;
    }
  }

  function decorateRows() {
    const headers = [...tableBody.closest('table').querySelectorAll('thead th')].map(th => clean(th.textContent));
    for (const row of tableBody.rows) {
      if (row.cells.length < 7) continue;
      [...row.cells].forEach((cell, index) => {
        if (cell.dataset.label !== headers[index]) cell.dataset.label = headers[index];
      });
      const edit = row.querySelector('.btn-edit-row');
      const company = clean(row.cells[1]?.querySelector('strong')?.textContent || row.cells[1]?.firstChild?.textContent);
      if (edit) edit.setAttribute('aria-label', `Ouvrir la fiche ${company}`);
      for (const img of row.querySelectorAll('.row-partners img')) {
        const label = clean(img.title);
        if (img.alt !== label) img.alt = label;
      }
      const partners = [...row.querySelectorAll('.row-partners img')].map(img => clean(img.title || img.alt)).filter(Boolean);
      let summary = row.querySelector('.lrf-v2-partner-names');
      const names = partners.join(' · ');
      if (names && !summary) {
        summary = document.createElement('span');
        summary.className = 'lrf-v2-partner-names';
        row.cells[1].appendChild(summary);
      }
      if (summary && summary.textContent !== names) summary.textContent = names;
    }
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; decorateRows(); refreshActions(); });
  }

  tableBody.addEventListener('click', event => {
    const row = event.target.closest('tr[data-client-id]');
    if (row) { currentId = clean(row.dataset.clientId); creating = false; schedule(); }
  }, true);
  document.getElementById('btn-add-client')?.addEventListener('click', () => { creating = true; currentId = ''; openedClient = null; schedule(); }, true);
  window.addEventListener('lrf-client-opened', event => { currentId = clean(event.detail?.clientId); openedClient = event.detail?.client || null; creating = !currentId; schedule(); });
  modal.addEventListener('input', schedule);
  modal.addEventListener('change', schedule);
  // Safari's layout viewport can remain tall while its keyboard is open.
  // Bound this dialog to the genuinely visible viewport so the form can scroll.
  const viewport = window.visualViewport;
  const fitVisibleViewport = () => {
    if (!viewport) return;
    const height = `${Math.round(viewport.height)}px`;
    if (modal.style.getPropertyValue('--lrf-client-viewport-height') !== height) modal.style.setProperty('--lrf-client-viewport-height', height);
    if (visible() && modal.contains(document.activeElement)) requestAnimationFrame(() => document.activeElement?.scrollIntoView({ block: 'nearest', behavior: 'auto' }));
  };
  viewport?.addEventListener('resize', fitVisibleViewport);
  fitVisibleViewport();
  const modalObserver = new MutationObserver(schedule);
  modalObserver.observe(modal, { attributes: true, attributeFilter: ['style', 'class', 'data-client-id'] });
  const rowObserver = new MutationObserver(schedule);
  rowObserver.observe(tableBody, { childList: true, subtree: true });
  const formObserver = new MutationObserver(schedule);
  const form = document.getElementById('client-form');
  if (form) formObserver.observe(form, { childList: true, subtree: true });
  window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    modalObserver.disconnect(); rowObserver.disconnect(); formObserver.disconnect();
    viewport?.removeEventListener('resize', fitVisibleViewport);
  }, { once: true });
  const attributes = { 'edit-adresse': ['street-address', 'text'], 'edit-code-postal': ['postal-code', 'numeric'], 'edit-ville': ['address-level2', 'text'], 'edit-email': ['email', 'email'] };
  for (const [id, [autocomplete, inputmode]] of Object.entries(attributes)) {
    const input = document.getElementById(id);
    input?.setAttribute('autocomplete', autocomplete);
    input?.setAttribute('inputmode', inputmode);
  }
  schedule();
}

/* Prepare an appointment via the existing agenda form, never save automatically. */
function initAppointmentContext() {
  if (!/\/agenda\.html$/.test(location.pathname)) return;
  const params = new URLSearchParams(location.search);
  const id = clean(params.get('clientId')), company = clean(params.get('clientName'));
  const newButton = document.getElementById('btn-new-event');
  if (!id || !newButton) return;
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'lrf-v2-appointment-context';
  button.textContent = `Planifier pour ${company || 'ce client'}`;
  newButton.insertAdjacentElement('afterend', button);
  button.addEventListener('click', () => {
    newButton.click();
    const modal = document.getElementById('event-modal');
    if (!modal || getComputedStyle(modal).display === 'none') return;
    const title = document.getElementById('event-title'), description = document.getElementById('event-description');
    if (title && !title.value) title.value = `Rendez-vous · ${company || 'Client'}`;
    if (description && !description.value) description.value = `Fiche CRM : clients.html?edit=${encodeURIComponent(id)}`;
    title?.focus();
  });
}

if (typeof document !== 'undefined') {
  const start = () => { initClientPresentation(); initAppointmentContext(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}
