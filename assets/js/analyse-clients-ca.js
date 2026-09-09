import { ELIOS_STATS_META, ELIOS_STATS_CLIENTS } from './statistiques-elios-data.js';
import { ELIOS_STATS_CLIENTS as ELIOS_STATS_CLIENTS_2026_07 } from './statistiques-elios-juillet-2026-archive.js';
import { VIEW_STATS_CLIENTS_2026_08 } from './statistiques-view-data.js';
import { VIEW_STATS_CLIENTS_2026_07 } from './statistiques-view-juillet-2026-archive.js';

(() => {
  'use strict';
  if (window.__LRF_CLIENT_CA_ANALYSIS__) return;
  window.__LRF_CLIENT_CA_ANALYSIS__ = true;

  const CURRENT_YEAR = 2026;
  const CURRENT_MONTH_LABEL = 'Août 2026';
  const CURRENT_CUTOFF = '31/08/2026';
  const CURRENT_PERIOD = ELIOS_STATS_META?.period || `01/01/${CURRENT_YEAR} au ${CURRENT_CUTOFF}`;
  const euro = value => Number(value || 0).toLocaleString('fr-FR', { style:'currency', currency:'EUR', minimumFractionDigits:0, maximumFractionDigits:2 });
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  const LEGAL = new Set(['sa','sas','sasu','sarl','eurl','sci','sc','ets','etablissement','etablissements','societe','ste','cod','fatt','france']);
  const AMBIGUOUS_SINGLE = new Set(['richardson','bonifay','costamagna','carrelage','carrelages','materiaux','ceramique','design','concept']);
  const singular = token => token.length > 5 && token.endsWith('s') ? token.slice(0,-1) : token;
  function tokens(value) {
    return String(value || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/&/g, ' et ').replace(/[^a-z0-9]+/g, ' ')
      .trim().split(/\s+/).filter(Boolean)
      .filter(t => !LEGAL.has(t) && !['de','du','des','la','le','les','et','a','au','aux'].includes(t))
      .map(singular);
  }
  function compact(value) { return tokens(value).join(''); }
  function matchScore(a, b) {
    const at = tokens(a), bt = tokens(b);
    if (!at.length || !bt.length) return 0;
    const ac = at.join(''), bc = bt.join('');
    if (ac === bc) return 100;
    const minChars = Math.min(ac.length, bc.length);
    if (minChars >= 8 && (ac.startsWith(bc) || bc.startsWith(ac))) return 94;
    if (minChars >= 9 && (ac.includes(bc) || bc.includes(ac))) return 90;
    const aset = new Set(at), bset = new Set(bt);
    const shared = [...aset].filter(t => bset.has(t));
    const smaller = Math.min(aset.size, bset.size);
    if (smaller === 1 && shared.length === 1) {
      const t = shared[0];
      if (AMBIGUOUS_SINGLE.has(t)) return 0;
      return t.length >= 7 ? 78 : 0;
    }
    const coverage = shared.length / Math.max(1, smaller);
    if (shared.length >= 2 && coverage === 1) return 88;
    if (shared.length >= 2 && coverage >= .67) return 82;
    return 0;
  }
  function bestMatch(company, rows) {
    let best = null, bestScore = 0;
    for (const row of rows || []) {
      const score = matchScore(company, row.name);
      if (score > bestScore) { best = row; bestScore = score; }
    }
    return bestScore >= 78 ? best : null;
  }

  const FACTORIES = [
    { name:'Elios', codeKey:'elios', current:ELIOS_STATS_CLIENTS || [], july:ELIOS_STATS_CLIENTS_2026_07 || [] },
    { name:'View', codeKey:'factory', current:VIEW_STATS_CLIENTS_2026_08 || [], july:VIEW_STATS_CLIENTS_2026_07 || [] }
  ];

  function rowByCode(rows, key, code) {
    if (!code) return null;
    return (rows || []).find(r => String(r?.[key] || '') === String(code)) || null;
  }
  function revenueFor(company) {
    const factories = [];
    for (const f of FACTORIES) {
      const current = bestMatch(company, f.current);
      if (!current) continue;
      const code = current[f.codeKey] || '';
      const july = rowByCode(f.july, f.codeKey, code) || bestMatch(company, f.july);
      const ytd = Number(current.ca2026 || 0);
      const previousComparable = Number(current.ca2025 || 0);
      const august = july ? Number((ytd - Number(july.ca2026 || 0)).toFixed(2)) : null;
      factories.push({ factory:f.name, code, matchedName:current.name, ytd, previousComparable, august, julyCumulative:july ? Number(july.ca2026 || 0) : null });
    }
    const ytd = factories.reduce((sum, x) => sum + x.ytd, 0);
    const previousComparable = factories.reduce((sum, x) => sum + x.previousComparable, 0);
    const monthlyRows = factories.filter(x => x.august !== null);
    const august = monthlyRows.length ? monthlyRows.reduce((sum, x) => sum + x.august, 0) : null;
    return { factories, ytd, previousComparable, august, augustComplete:monthlyRows.length === factories.length && factories.length > 0 };
  }

  function installStyles() {
    if (document.getElementById('lrf-client-ca-style')) return;
    const style = document.createElement('style');
    style.id = 'lrf-client-ca-style';
    style.textContent = `
      .lrf-analysis-table{min-width:1190px!important}
      .lrf-ca-cell{min-width:155px}.lrf-ca-cell>strong{display:block;font-size:.79rem;color:#1d5f43}.lrf-ca-cell>small{display:block;margin-top:2px;color:#88785c;font-size:.58rem}.lrf-ca-mini{display:flex;flex-wrap:wrap;gap:3px;margin-top:5px}.lrf-ca-mini span{padding:3px 5px;border-radius:999px;background:#eef8f2;border:1px solid #c8e3d1;color:#245e43;font-size:.56rem;font-weight:850}
      .lrf-ca-none{color:#8b8170;font-size:.64rem}.lrf-ca-note{display:block;margin-top:3px;font-size:.56rem;color:#8c7d62}
      .lrf-ca-drawer{padding:12px;border:1px solid #d7e6d9;border-radius:13px;background:linear-gradient(145deg,#fff,#f3faf5)}.lrf-ca-drawer h3{display:flex;justify-content:space-between;align-items:center;gap:8px}.lrf-ca-cutoff{font-size:.58rem;color:#7f725d;font-weight:700}.lrf-ca-kpis{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:8px 0}.lrf-ca-kpi{padding:9px;border-radius:10px;border:1px solid #dce9df;background:#fff}.lrf-ca-kpi span{display:block;font-size:.56rem;text-transform:uppercase;color:#746b5b;font-weight:850}.lrf-ca-kpi strong{display:block;margin-top:3px;font-size:.84rem;color:#164f38}.lrf-ca-kpi small{display:block;margin-top:2px;color:#897d69;font-size:.54rem;line-height:1.3}.lrf-ca-kpi.unavailable strong{color:#8a7c65;font-size:.68rem}
      .lrf-ca-factories{display:grid;gap:5px;margin-top:8px}.lrf-ca-factory{display:grid;grid-template-columns:minmax(65px,.7fr) 1fr 1fr;gap:6px;align-items:center;padding:7px 8px;border:1px solid #e6ddcb;border-radius:9px;background:#fff;font-size:.62rem}.lrf-ca-factory strong{font-size:.65rem}.lrf-ca-factory b{text-align:right;color:#215e44}.lrf-ca-factory small{text-align:right;color:#846f4b}.lrf-ca-explain{margin:8px 0 0;color:#766c5b;font-size:.59rem;line-height:1.45}.lrf-ca-hot-product{margin-top:8px;padding:8px 9px;border-left:3px solid #e6a51b;border-radius:8px;background:#fff8e2;font-size:.62rem;color:#5e4a20}.lrf-ca-hot-product strong{display:block;margin-bottom:2px}.lrf-ca-data-note{font-weight:750;color:#6f6149!important}
      @media(max-width:700px){.lrf-ca-cell{min-width:0!important}.lrf-ca-cell>strong{font-size:.82rem}.lrf-ca-mini{justify-content:flex-start}.lrf-ca-drawer{padding:10px}.lrf-ca-factory{grid-template-columns:72px 1fr}.lrf-ca-factory b,.lrf-ca-factory small{text-align:left}.lrf-ca-kpis{grid-template-columns:1fr 1fr}}
    `;
    document.head.appendChild(style);
  }

  function cellHtml(info) {
    if (!info.factories.length) return `<span class="lrf-ca-none">—</span><small class="lrf-ca-note">Pas de CA Elios / View retrouvé</small>`;
    const chips = info.factories.map(x => `<span>${esc(x.factory)} ${euro(x.ytd)}</span>`).join('');
    return `<div class="lrf-ca-cell"><strong>${euro(info.ytd)}</strong><small>Jan. → août 2026</small><div class="lrf-ca-mini">${chips}</div></div>`;
  }

  function enhanceClientTable() {
    const table = document.querySelector('#panel-clients .lrf-analysis-table');
    const body = document.getElementById('lrf-clients-table-body');
    if (!table || !body) return;
    const headRow = table.querySelector('thead tr');
    if (headRow && !headRow.querySelector('[data-lrf-ca-head]')) {
      const th = document.createElement('th');
      th.dataset.lrfCaHead = '1';
      th.textContent = 'CA 2026';
      const actionHead = headRow.lastElementChild;
      actionHead ? headRow.insertBefore(th, actionHead) : headRow.appendChild(th);
    }
    body.querySelectorAll('tr').forEach(row => {
      if (row.querySelector('.lrf-empty')) {
        const td = row.querySelector('td[colspan]');
        if (td) td.colSpan = 11;
        return;
      }
      if (row.querySelector('[data-lrf-ca-cell]')) return;
      const company = row.querySelector('.lrf-client-name-btn strong')?.textContent?.trim();
      if (!company) return;
      const td = document.createElement('td');
      td.dataset.label = "Chiffre d'affaires";
      td.dataset.lrfCaCell = '1';
      td.innerHTML = cellHtml(revenueFor(company));
      const action = [...row.children].find(x => x.dataset?.label === 'Action') || row.lastElementChild;
      action ? row.insertBefore(td, action) : row.appendChild(td);
    });

    const caption = document.querySelector('#panel-clients .lrf-table-caption');
    if (caption && !caption.querySelector('.lrf-ca-data-note')) {
      const note = document.createElement('span');
      note.className = 'lrf-ca-data-note';
      note.textContent = `CA disponible : Elios + View · arrêté au ${CURRENT_CUTOFF}`;
      caption.appendChild(note);
    }
  }

  function favoriteProductFromDrawer() {
    const metrics = [...document.querySelectorAll('#lrf-detail-metrics > div')];
    const hit = metrics.find(div => div.querySelector('span')?.textContent?.trim().toLowerCase() === 'produit favori');
    const value = hit?.querySelector('strong')?.textContent?.trim() || '';
    return value && value !== '—' ? value : '';
  }

  function ensureDrawerSection() {
    const body = document.querySelector('#lrf-client-drawer .lrf-drawer-body');
    if (!body) return null;
    let section = document.getElementById('lrf-detail-ca');
    if (!section) {
      section = document.createElement('div');
      section.id = 'lrf-detail-ca';
      section.className = 'lrf-drawer-section lrf-ca-drawer';
      const signal = body.querySelector('.lrf-detail-signal');
      if (signal?.nextSibling) body.insertBefore(section, signal.nextSibling); else body.appendChild(section);
    }
    return section;
  }

  function drawerHtml(company) {
    const info = revenueFor(company);
    const product = favoriteProductFromDrawer();
    if (!info.factories.length) {
      return `<h3><span>💶 Chiffre d’affaires</span><small class="lrf-ca-cutoff">au ${CURRENT_CUTOFF}</small></h3><div class="lrf-ca-none">Aucun chiffre d’affaires Elios ou View n’a été retrouvé automatiquement pour ce client.</div>${product ? `<div class="lrf-ca-hot-product"><strong>🔥 Produit chaud — intérêt web</strong>${esc(product)}<small class="lrf-ca-note">Basé sur les consultations du site, pas sur les ventes produit.</small></div>` : ''}`;
    }
    const monthText = info.august === null ? '—' : euro(info.august);
    const monthNote = info.augustComplete ? 'Différence entre les arrêtés 31/07 et 31/08' : 'Partiel : une usine ne dispose pas de l’arrêté 31/07';
    const factoryRows = info.factories.map(x => `<div class="lrf-ca-factory"><strong>🏭 ${esc(x.factory)}</strong><b>${euro(x.ytd)}<br><small>2026</small></b><small>${x.august === null ? 'Août : —' : `Août : ${euro(x.august)}`}</small></div>`).join('');
    return `<h3><span>💶 Chiffre d’affaires</span><small class="lrf-ca-cutoff">${esc(CURRENT_PERIOD)}</small></h3>
      <div class="lrf-ca-kpis">
        <div class="lrf-ca-kpi"><span>Année civile ${CURRENT_YEAR}</span><strong>${euro(info.ytd)}</strong><small>Janvier → ${CURRENT_CUTOFF}</small></div>
        <div class="lrf-ca-kpi"><span>${CURRENT_MONTH_LABEL}</span><strong>${monthText}</strong><small>${esc(monthNote)}</small></div>
        <div class="lrf-ca-kpi"><span>N-1 comparable</span><strong>${euro(info.previousComparable)}</strong><small>Janvier → août 2025</small></div>
        <div class="lrf-ca-kpi unavailable"><span>12 mois glissants</span><strong>Historique insuffisant</strong><small>Sept.–déc. 2025 mensuels absents : aucun chiffre n’est inventé.</small></div>
      </div>
      <div class="lrf-ca-factories">${factoryRows}</div>
      <p class="lrf-ca-explain"><strong>Détail mensuel disponible :</strong> ${CURRENT_MONTH_LABEL} est calculé à partir de la différence entre les arrêtés cumulés du 31/07 et du 31/08. Les mois antérieurs seront ajoutés automatiquement dès que leurs arrêtés réels seront intégrés.</p>
      ${product ? `<div class="lrf-ca-hot-product"><strong>🔥 Produit chaud — intérêt web</strong>${esc(product)}<small class="lrf-ca-note">Produit le plus consulté par ce client sur le site ; ce n’est pas un classement de ventes produit.</small></div>` : ''}`;
  }

  function renderDrawerRevenue() {
    const drawer = document.getElementById('lrf-client-drawer');
    if (!drawer?.classList.contains('open')) return;
    const title = document.getElementById('lrf-detail-title');
    const company = title?.textContent?.replace(/\s+/g, ' ').trim() || '';
    if (!company) return;
    const section = ensureDrawerSection();
    if (section) section.innerHTML = drawerHtml(company);
  }

  function bind() {
    installStyles();
    enhanceClientTable();
    ensureDrawerSection();

    const body = document.getElementById('lrf-clients-table-body');
    if (body) new MutationObserver(() => queueMicrotask(enhanceClientTable)).observe(body, { childList:true, subtree:false });

    const drawer = document.getElementById('lrf-client-drawer');
    if (drawer) new MutationObserver(() => setTimeout(renderDrawerRevenue, 0)).observe(drawer, { attributes:true, attributeFilter:['class'] });
    const title = document.getElementById('lrf-detail-title');
    if (title) new MutationObserver(() => setTimeout(renderDrawerRevenue, 0)).observe(title, { childList:true, subtree:true, characterData:true });

    document.addEventListener('click', event => {
      if (event.target.closest('[data-detail-client]')) setTimeout(renderDrawerRevenue, 25);
    }, true);

    let tries = 0;
    const retry = () => {
      enhanceClientTable();
      if (++tries < 20 && !document.querySelector('#lrf-clients-table-body tr')) setTimeout(retry, 250);
    };
    setTimeout(retry, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once:true }); else bind();
})();
