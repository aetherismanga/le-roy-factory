import { db } from './firebase.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

if (!window.__LRF_CRM_SMART_SEARCH__) {
  window.__LRF_CRM_SMART_SEARCH__ = true;

  const page = (location.pathname.split('/').pop() || '').toLowerCase();
  let clientsPromise = null;

  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const words = v => String(v ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/&/g, ' et ').replace(/[^a-z0-9]+/g, ' ')
    .trim().replace(/\s+/g, ' ');
  const compact = v => words(v).replace(/\s+/g, '');

  function levenshtein(a, b) {
    a = String(a || ''); b = String(b || '');
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const prev = Array.from({length:b.length + 1}, (_, i) => i);
    const cur = new Array(b.length + 1);
    for (let i = 1; i <= a.length; i += 1) {
      cur[0] = i;
      for (let j = 1; j <= b.length; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      }
      for (let j = 0; j <= b.length; j += 1) prev[j] = cur[j];
    }
    return prev[b.length];
  }

  function bigrams(s) {
    s = String(s || '');
    if (s.length < 2) return s ? [s] : [];
    const out = [];
    for (let i = 0; i < s.length - 1; i += 1) out.push(s.slice(i, i + 2));
    return out;
  }

  function dice(a, b) {
    const aa = bigrams(a), bb = bigrams(b);
    if (!aa.length || !bb.length) return 0;
    const used = new Array(bb.length).fill(false);
    let hits = 0;
    aa.forEach(x => {
      const idx = bb.findIndex((y, i) => !used[i] && y === x);
      if (idx >= 0) { used[idx] = true; hits += 1; }
    });
    return (2 * hits) / (aa.length + bb.length);
  }

  function score(query, candidate) {
    const qw = words(query), cw = words(candidate);
    const q = compact(query), c = compact(candidate);
    if (!q || !c) return 0;
    if (q === c) return 1;
    if (c.includes(q)) return .97 - Math.min(.12, Math.max(0, c.length - q.length) * .004);
    const terms = qw.split(' ').filter(Boolean);
    if (terms.length > 1 && terms.every(t => c.includes(t))) return .93;
    if (q.length <= 3) return c.includes(q) ? .9 : 0;

    const candidates = new Set([c]);
    const cWords = cw.split(' ').filter(Boolean);
    for (let i = 0; i < cWords.length; i += 1) {
      let part = '';
      for (let j = i; j < Math.min(cWords.length, i + 4); j += 1) {
        part += cWords[j];
        if (part.length >= Math.max(3, q.length - 3) && part.length <= q.length + 5) candidates.add(part);
      }
    }

    let best = 0;
    candidates.forEach(part => {
      const d = levenshtein(q, part);
      const ratio = 1 - d / Math.max(q.length, part.length, 1);
      best = Math.max(best, ratio, dice(q, part) * .96);
    });
    return best;
  }

  function accepted(q, s) {
    const n = compact(q).length;
    if (n <= 3) return s >= .88;
    if (n <= 5) return s >= .64;
    return s >= .58;
  }

  async function clients() {
    if (!clientsPromise) {
      clientsPromise = getDocs(collection(db, 'clients')).then(snap => {
        const out = [];
        snap.forEach(d => {
          const c = { id:d.id, ...d.data() };
          if (c.archived === true || c.archive === true) return;
          out.push(c);
        });
        return out;
      }).catch(error => {
        console.warn('Recherche intelligente CRM : clients indisponibles', error);
        return [];
      });
    }
    return clientsPromise;
  }

  function rankClients(list, query, limit = 8) {
    const q = String(query || '').trim();
    if (compact(q).length < 2) return [];
    return list.map(c => {
      const fields = [c.societe, c.codeClient, c.ville, c.codePostal || c.code_postal, c.contact, c.telephone, ...(c.telephones || [])].filter(Boolean);
      let best = 0;
      fields.forEach(v => { best = Math.max(best, score(q, v)); });
      best = Math.max(best, score(q, c.societe || '') * 1.04);
      return { c, s:Math.min(1, best) };
    }).filter(x => accepted(q, x.s))
      .sort((a, b) => b.s - a.s || String(a.c.societe || '').localeCompare(String(b.c.societe || ''), 'fr'))
      .slice(0, limit);
  }

  function installStyles() {
    if (document.getElementById('lrf-smart-search-style')) return;
    const s = document.createElement('style');
    s.id = 'lrf-smart-search-style';
    s.textContent = `
      .lrf-smart-wrap{position:relative!important}.lrf-smart-results{position:absolute;z-index:12000;left:0;right:0;top:calc(100% + 6px);display:none;max-height:340px;overflow:auto;background:#fffdf9;border:1px solid #dcccae;border-radius:14px;box-shadow:0 16px 38px rgba(54,37,17,.18);padding:6px}.lrf-smart-results.open{display:block}.lrf-smart-result{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;padding:11px 12px;border:0;border-bottom:1px solid #eee7dc;border-radius:9px;background:#fff;text-align:left;text-decoration:none;color:#252525;cursor:pointer;font:inherit}.lrf-smart-result:last-child{border-bottom:0}.lrf-smart-result:hover,.lrf-smart-result:focus{background:#fff7df;outline:none}.lrf-smart-result strong{display:block;font-size:.84rem}.lrf-smart-result small{display:block;margin-top:3px;color:#746b5e;font-size:.7rem}.lrf-smart-badge{flex:none;padding:4px 7px;border-radius:999px;background:#eef8f2;color:#226442;font-size:.6rem;font-weight:850}.lrf-smart-empty{padding:13px;text-align:center;color:#7a7267;font-size:.75rem}
      @media(max-width:700px){.lrf-smart-results{position:static;margin-top:6px;box-shadow:0 8px 22px rgba(54,37,17,.10)}.lrf-smart-result{padding:13px 11px}.lrf-smart-result strong{font-size:.92rem}}
    `;
    document.head.appendChild(s);
  }

  function rowForClientId(clientId) {
    const id = String(clientId || '');
    if (!id) return null;
    return [...document.querySelectorAll('#clients-table-body tr')].find(r =>
      String(r.dataset.clientId || r.getAttribute('data-client-id') || r.dataset.id || r.getAttribute('data-id') || '') === id
    ) || null;
  }

  function notifyExactClient(clientId, source = 'smart-search') {
    const id = String(clientId || '');
    if (!id) return;
    window.__LRF_EXACT_CLIENT_ID__ = id;
    try { sessionStorage.setItem('lrfExactClientId', id); } catch (_) {}
    window.dispatchEvent(new CustomEvent('lrf-client-opened', { detail:{ clientId:id, source } }));
  }

  function openExactRow(clientId) {
    const row = rowForClientId(clientId);
    if (!row) return false;
    notifyExactClient(clientId);
    row.click();
    return true;
  }

  function waitAndOpenExactRow(clientId, fallbackHref = '') {
    if (openExactRow(clientId)) return;
    const tbody = document.getElementById('clients-table-body');
    if (!tbody) {
      if (fallbackHref) location.href = fallbackHref;
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return true;
      if (!openExactRow(clientId)) return false;
      done = true;
      observer.disconnect();
      return true;
    };
    const observer = new MutationObserver(finish);
    observer.observe(tbody, { childList:true, subtree:true, attributes:true, attributeFilter:['data-client-id','data-id'] });
    setTimeout(() => {
      if (finish()) return;
      observer.disconnect();
      if (fallbackHref) location.href = fallbackHref;
    }, 1800);
  }

  async function enhanceDashboard() {
    const input = document.getElementById('crm-global-search');
    const box = document.getElementById('crm-global-results');
    if (!input || !box || input.dataset.smartSearch === '1') return;
    input.dataset.smartSearch = '1';
    const list = await clients();

    const inject = () => {
      const q = input.value.trim();
      box.querySelectorAll('[data-lrf-smart-client]').forEach(el => el.remove());
      if (compact(q).length < 2) return;
      const hits = rankClients(list, q, 6);
      if (!hits.length) return;
      box.querySelectorAll('.dash-search-empty').forEach(el => el.remove());
      const existing = new Set([...box.querySelectorAll('a[href*="clients.html?edit="]')].map(a => a.getAttribute('href')));
      const frag = document.createDocumentFragment();
      hits.slice().reverse().forEach(({c}) => {
        const href = `clients.html?edit=${encodeURIComponent(c.id)}`;
        if (existing.has(href)) return;
        const a = document.createElement('a');
        a.className = 'dash-search-result';
        a.dataset.lrfSmartClient = '1';
        a.href = href;
        a.innerHTML = `<span class="dash-search-icon">👥</span><span><b>${esc(c.societe || 'Client')}</b><small>${esc([c.codeClient, c.ville, c.codePostal || c.code_postal].filter(Boolean).join(' · '))}</small></span><span class="dash-search-kind">Client</span>`;
        frag.insertBefore(a, frag.firstChild);
      });
      box.insertBefore(frag, box.firstChild);
      box.classList.add('open');
    };
    input.addEventListener('input', () => setTimeout(inject, 0));
    input.addEventListener('focus', () => setTimeout(inject, 0));
  }

  async function enhanceClientsPage() {
    const input = document.getElementById('search-input');
    if (!input || input.dataset.smartSearch === '1') return;
    input.dataset.smartSearch = '1';
    installStyles();
    const list = await clients();
    const wrap = input.closest('.search-wrapper') || input.parentElement;
    if (!wrap) return;
    wrap.classList.add('lrf-smart-wrap');
    const box = document.createElement('div');
    box.className = 'lrf-smart-results';
    box.id = 'lrf-clients-smart-results';
    wrap.appendChild(box);

    const render = () => {
      const q = input.value.trim();
      if (compact(q).length < 2) { box.classList.remove('open'); box.innerHTML = ''; return; }
      const hits = rankClients(list, q, 8);
      box.innerHTML = hits.length ? hits.map(({c}) => `<button type="button" class="lrf-smart-result" data-client-id="${esc(c.id)}"><span><strong>${esc(c.societe || 'Client')}</strong><small>${esc([c.codeClient, c.ville, c.codePostal || c.code_postal].filter(Boolean).join(' · '))}</small></span><span class="lrf-smart-badge">Trouvé</span></button>`).join('') : '';
      box.classList.toggle('open', hits.length > 0);
    };

    input.addEventListener('input', render);
    input.addEventListener('focus', render);
    box.addEventListener('click', event => {
      const btn = event.target.closest('[data-client-id]');
      if (!btn) return;
      event.preventDefault();
      event.stopPropagation();
      const id = btn.dataset.clientId || '';
      box.classList.remove('open');
      // Important : on ouvre exactement la même ligne que lorsqu'on passe par les filtres département.
      // Aucun rechargement de page, donc aucun risque qu'un autre module choisisse une fiche homonyme.
      waitAndOpenExactRow(id, `clients.html?edit=${encodeURIComponent(id)}`);
    });
    document.addEventListener('click', e => { if (!wrap.contains(e.target)) box.classList.remove('open'); });

    // Pour les liens provenant du dashboard ou d'une autre page, on force ensuite un vrai clic
    // sur la ligne Firebase exacte. Cela remet tous les modules CRM sur le même client.
    const editId = new URLSearchParams(location.search).get('edit');
    if (editId) {
      notifyExactClient(editId, 'direct-link');
      setTimeout(() => waitAndOpenExactRow(editId), 80);
    }
  }

  async function enhanceCrFeed() {
    const input = document.getElementById('cr-search-input');
    if (!input || input.dataset.smartSearch === '1') return;
    input.dataset.smartSearch = '1';
    installStyles();
    const list = await clients();
    const wrap = input.closest('.search-wrapper') || input.parentElement;
    if (!wrap) return;
    wrap.classList.add('lrf-smart-wrap');
    const box = document.createElement('div');
    box.className = 'lrf-smart-results';
    box.id = 'lrf-cr-feed-smart-results';
    wrap.appendChild(box);

    const render = () => {
      const q = input.value.trim();
      if (compact(q).length < 2) { box.classList.remove('open'); box.innerHTML = ''; return; }
      const hits = rankClients(list, q, 8);
      box.innerHTML = hits.length ? hits.map(({c}) => `<button type="button" class="lrf-smart-result" data-name="${esc(c.societe || '')}"><span><strong>${esc(c.societe || 'Client')}</strong><small>${esc([c.codeClient, c.ville, c.codePostal || c.code_postal].filter(Boolean).join(' · '))}</small></span><span class="lrf-smart-badge">Client</span></button>`).join('') : '';
      box.classList.toggle('open', hits.length > 0);
      box.querySelectorAll('[data-name]').forEach(btn => btn.addEventListener('click', () => {
        input.value = btn.dataset.name || '';
        box.classList.remove('open');
        input.dispatchEvent(new Event('input', {bubbles:true}));
        input.focus();
      }));
    };
    input.addEventListener('input', render);
    input.addEventListener('focus', render);
    document.addEventListener('click', e => { if (!wrap.contains(e.target)) box.classList.remove('open'); });
  }

  async function init() {
    installStyles();
    if (page === 'dashboard.html') await enhanceDashboard();
    if (page === 'clients.html') await enhanceClientsPage();
    if (page === 'comptes-rendus.html') await enhanceCrFeed();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init, 120), {once:true});
  else setTimeout(init, 120);
}
