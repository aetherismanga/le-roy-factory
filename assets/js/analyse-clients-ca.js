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
  const amount = value => {
    if (value === null || value === undefined || String(value).trim() === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };
  const euro = value => value === null ? 'Non disponible' : value.toLocaleString('fr-FR', { style:'currency', currency:'EUR', minimumFractionDigits:0, maximumFractionDigits:2 });
  const sumKnown = values => {
    const known = values.filter(value => value !== null);
    return known.length ? Number(known.reduce((sum, value) => sum + value, 0).toFixed(2)) : null;
  };
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
    const candidates = (rows || []).map(row => ({ row, score:matchScore(company, row.name) }))
      .filter(hit => hit.score >= 78).sort((a, b) => b.score - a.score);
    if (!candidates.length) return null;
    // A shared company name is not a reliable identifier when several accounts match.
    if (candidates[1] && candidates[0].score - candidates[1].score <= 4) return null;
    return candidates[0].row;
  }

  const FACTORIES = [
    { name:'Elios', codeKey:'elios', current:ELIOS_STATS_CLIENTS || [], july:ELIOS_STATS_CLIENTS_2026_07 || [] },
    { name:'View', codeKey:'factory', current:VIEW_STATS_CLIENTS_2026_08 || [], july:VIEW_STATS_CLIENTS_2026_07 || [] }
  ];

  function rowByCode(rows, key, code) {
    if (!code) return null;
    const matches = (rows || []).filter(row => String(row?.[key] || '') === String(code));
    return matches.length === 1 ? matches[0] : null;
  }
  function revenueFor(company) {
    const factories = [];
    for (const factory of FACTORIES) {
      const current = bestMatch(company, factory.current);
      if (!current) continue;
      const code = current[factory.codeKey] || '';
      const july = rowByCode(factory.july, factory.codeKey, code) || bestMatch(company, factory.july);
      const ytd = amount(current.ca2026);
      const previousComparable = amount(current.ca2025);
      const julyCumulative = amount(july?.ca2026);
      const august = ytd !== null && julyCumulative !== null ? Number((ytd - julyCumulative).toFixed(2)) : null;
      factories.push({ factory:factory.name, code, matchedName:current.name, ytd, previousComparable, august, julyCumulative });
    }
    return {
      factories,
      ytd:sumKnown(factories.map(row => row.ytd)),
      previousComparable:sumKnown(factories.map(row => row.previousComparable)),
      august:sumKnown(factories.map(row => row.august)),
      ytdComplete:factories.length > 0 && factories.every(row => row.ytd !== null),
      previousComplete:factories.length > 0 && factories.every(row => row.previousComparable !== null),
      augustComplete:factories.length > 0 && factories.every(row => row.august !== null)
    };
  }

  function installStyles() {
    if (document.getElementById('lrf-client-ca-style')) return;
    const style = document.createElement('style');
    style.id = 'lrf-client-ca-style';
    style.textContent = `
      .lrf-ca-cell{min-width:155px}.lrf-ca-cell>strong{display:block;font-size:.79rem;color:#1d5f43}.lrf-ca-cell>small{display:block;margin-top:2px;color:#88785c;font-size:.58rem}.lrf-ca-mini{display:flex;flex-wrap:wrap;gap:3px;margin-top:5px}.lrf-ca-mini span{padding:3px 5px;border-radius:999px;background:#eef8f2;border:1px solid #c8e3d1;color:#245e43;font-size:.56rem;font-weight:850}
      [data-client-revenue]{min-width:0;overflow-wrap:anywhere}.lrf-ca-card{display:flex;justify-content:space-between;align-items:center;gap:12px;border-top:1px solid #ece7dd;padding-top:12px;margin-top:2px}.lrf-ca-card>span{font-size:.72rem;color:#6f6a60;line-height:1.5}.lrf-ca-card strong{font-size:1rem;color:#215e44;text-align:right;white-space:normal}.lrf-ca-card small{display:block;font-size:.68rem;color:#766e60}.lrf-ca-negative,.lrf-ca-negative strong,.lrf-ca-factory .lrf-ca-negative{color:#9d3d21!important}.lrf-ca-warning{display:block;margin-top:5px;color:#9d3d21;font-size:.72rem;font-weight:700}.lrf-ca-drawer details{margin-top:10px}.lrf-ca-drawer summary{cursor:pointer;font-size:.82rem;font-weight:700;color:#615234;min-height:32px;padding:6px 0}.lrf-ca-drawer [data-ca-total]{font-size:1.35rem;font-weight:800;margin:8px 0;color:#215e44}.lrf-ca-drawer .lrf-ca-explain{font-size:.74rem;line-height:1.5}.lrf-ca-drawer .lrf-ca-cutoff{font-size:.72rem}.lrf-ca-drawer .lrf-ca-kpi span{font-size:.68rem}.lrf-ca-drawer .lrf-ca-kpi small{font-size:.67rem}.lrf-ca-drawer .lrf-ca-factory{font-size:.74rem}.lrf-ca-drawer .lrf-ca-factory strong{font-size:.76rem}.lrf-ca-drawer .lrf-ca-none{font-size:.78rem}.lrf-ca-drawer .lrf-ca-note{font-size:.7rem}.lrf-ca-match-note{margin:9px 0 0;color:#756a58;font-size:.72rem;line-height:1.5}
      .lrf-ca-none{color:#8b8170;font-size:.64rem}.lrf-ca-note{display:block;margin-top:3px;font-size:.56rem;color:#8c7d62}
      .lrf-ca-drawer{padding:12px;border:1px solid #d7e6d9;border-radius:13px;background:linear-gradient(145deg,#fff,#f3faf5)}.lrf-ca-drawer h3{display:flex;justify-content:space-between;align-items:center;gap:8px}.lrf-ca-cutoff{font-size:.58rem;color:#7f725d;font-weight:700}.lrf-ca-kpis{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:8px 0}.lrf-ca-kpi{padding:9px;border-radius:10px;border:1px solid #dce9df;background:#fff}.lrf-ca-kpi span{display:block;font-size:.56rem;text-transform:uppercase;color:#746b5b;font-weight:850}.lrf-ca-kpi strong{display:block;margin-top:3px;font-size:.84rem;color:#164f38}.lrf-ca-kpi small{display:block;margin-top:2px;color:#897d69;font-size:.54rem;line-height:1.3}.lrf-ca-kpi.unavailable strong{color:#8a7c65;font-size:.68rem}
      .lrf-ca-factories{display:grid;gap:5px;margin-top:8px}.lrf-ca-factory{display:grid;grid-template-columns:minmax(65px,.7fr) 1fr 1fr;gap:6px;align-items:center;padding:7px 8px;border:1px solid #e6ddcb;border-radius:9px;background:#fff;font-size:.62rem}.lrf-ca-factory strong{font-size:.65rem}.lrf-ca-factory b{text-align:right;color:#215e44}.lrf-ca-factory small{text-align:right;color:#846f4b}.lrf-ca-explain{margin:8px 0 0;color:#766c5b;font-size:.59rem;line-height:1.45}.lrf-ca-hot-product{margin-top:8px;padding:8px 9px;border-left:3px solid #e6a51b;border-radius:8px;background:#fff8e2;font-size:.62rem;color:#5e4a20}.lrf-ca-hot-product strong{display:block;margin-bottom:2px}.lrf-ca-data-note{font-weight:750;color:#6f6149!important}
      @media(max-width:700px){.lrf-ca-cell{min-width:0!important}.lrf-ca-cell>strong{font-size:.82rem}.lrf-ca-mini{justify-content:flex-start}.lrf-ca-drawer{padding:10px}.lrf-ca-factory{grid-template-columns:72px 1fr}.lrf-ca-factory b,.lrf-ca-factory small{text-align:left}.lrf-ca-kpis{grid-template-columns:1fr 1fr}}
    `;
    document.head.appendChild(style);
  }

  function cellHtml(info) {
    if (!info.factories.length || info.ytd === null) return '<span class="lrf-ca-none">CA non disponible</span><small class="lrf-ca-note">Elios / View · rapprochement non établi ou montant manquant</small>';
    return `<div class="lrf-ca-cell${info.ytd < 0 ? ' lrf-ca-negative' : ''}"><strong>${euro(info.ytd)}</strong><small>Janv.–août 2026 · ${esc(info.factories.map(row => row.factory).join(' + '))}${info.ytdComplete ? '' : ' · partiel'}</small>${info.ytd < 0 ? '<span class="lrf-ca-warning">CA net négatif</span>' : ''}<small class="lrf-ca-note">Rapprochement par nom à vérifier</small></div>`;
  }

  function cardHtml(info) {
    const coverage = info.factories.filter(row => row.ytd !== null).map(row => row.factory).join(' + ');
    if (!coverage) return '<div class="lrf-ca-card"><span>CA disponible<small>Elios / View · janv.–août 2026</small></span><strong class="lrf-ca-none">Non disponible</strong></div>';
    return `<div class="lrf-ca-card${info.ytd < 0 ? ' lrf-ca-negative' : ''}"><span>${info.ytd < 0 ? 'CA net négatif' : 'CA retrouvé'}<small>${esc(coverage)} · janv.–août 2026${info.ytdComplete ? '' : ' · partiel'}</small></span><strong>${euro(info.ytd)}</strong></div><small class="lrf-ca-note">Rapprochement par nom à vérifier dans le compte rendu.</small>`;
  }

  function enhanceClientCards() {
    document.querySelectorAll('#lrf-client-cards article[data-client-id]').forEach(card => {
      const company = card.dataset.clientCompany || '';
      const slot = card.querySelector('[data-client-revenue]');
      if (!company || !slot || slot.dataset.revenueCompany === company) return;
      slot.dataset.revenueCompany = company;
      slot.innerHTML = cardHtml(revenueFor(company));
    });
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

  function ensureDrawerSection() {
    const body = document.querySelector('#lrf-client-drawer .lrf-drawer-body');
    if (!body) return null;
    let section = document.getElementById('lrf-detail-ca');
    if (!section) {
      section = document.createElement('div');
      section.id = 'lrf-detail-ca';
      section.className = 'lrf-drawer-section lrf-ca-drawer';
      const signal = body.querySelector('.lrf-detail-signal');
      const anchor = body.querySelector('#lrf-detail-ca-anchor');
      if(anchor) anchor.appendChild(section); else if (signal?.nextSibling) body.insertBefore(section, signal.nextSibling); else body.appendChild(section);
    }
    return section;
  }

  function drawerHtml(company) {
    const info = revenueFor(company);
    const heading = '<h3>Chiffre d’affaires disponible</h3><small class="lrf-ca-cutoff">Janv.–août 2026 · sources Elios / View</small>';
    if (!info.factories.length || info.ytd === null) {
      return `${heading}<p class="lrf-ca-none">CA non disponible : aucun montant exploitable rapproché pour ce client. Cela ne signifie pas un chiffre d’affaires nul.</p><p class="lrf-ca-match-note">Les rapprochements sont automatiques par nom. En cas de plusieurs comptes possibles, aucun montant n’est attribué.</p>`;
    }
    const factoryRows = info.factories.map(row => `<div class="lrf-ca-factory"><strong>${esc(row.factory)}</strong><b class="${row.ytd !== null && row.ytd < 0 ? 'lrf-ca-negative' : ''}">${euro(row.ytd)}</b><small>Août : ${euro(row.august)}</small></div>`).join('');
    const identities = info.factories.map(row => `${row.factory} : ${row.matchedName}${row.code ? ` (${row.code})` : ''}`).join(' · ');
    const coverage = info.factories.filter(row => row.ytd !== null).map(row => row.factory).join(' + ');
    return `${heading}
      <div data-ca-total class="${info.ytd < 0 ? 'lrf-ca-negative' : ''}">${euro(info.ytd)}</div>
      ${info.ytd < 0 ? '<span class="lrf-ca-warning">CA net négatif sur la période. La cause doit être vérifiée dans les pièces commerciales.</span>' : ''}
      <p class="lrf-ca-explain">Couverture retrouvée : <strong>${esc(coverage)}</strong>${info.ytdComplete ? '' : ' (montants partiels)'}. Cette période est indépendante du filtre d’activité du site. Les autres fabricants ne sont pas inclus.</p>
      <details><summary>Détail par fabricant et comparaison</summary>
        <div class="lrf-ca-factories">${factoryRows}</div>
        <div class="lrf-ca-kpis">
          <div class="lrf-ca-kpi${info.august !== null && info.august < 0 ? ' lrf-ca-negative' : ''}"><span>${CURRENT_MONTH_LABEL}</span><strong>${euro(info.august)}</strong><small>${info.augustComplete ? 'Différence entre les arrêtés du 31/07 et du 31/08' : 'Partiel ou non disponible : arrêté de juillet manquant'}</small></div>
          <div class="lrf-ca-kpi${info.previousComparable !== null && info.previousComparable < 0 ? ' lrf-ca-negative' : ''}"><span>Janv.–août 2025</span><strong>${euro(info.previousComparable)}</strong><small>${info.previousComplete ? 'Même couverture des comptes rapprochés' : 'Comparaison partielle ou indisponible'}</small></div>
        </div>
        <p class="lrf-ca-match-note"><strong>Rapprochement automatique par nom à vérifier :</strong> ${esc(identities)}.</p>
      </details>`;
  }

  function renderDrawerRevenue() {
    const drawer = document.getElementById('lrf-client-drawer');
    if (!drawer?.classList.contains('open')) return;
    const title = document.getElementById('lrf-detail-title');
    const company = title?.textContent?.replace(/\s+/g, ' ').trim() || '';
    if (!company) return;
    const section = ensureDrawerSection();
    if (section && section.dataset.revenueCompany !== company) {
      section.dataset.revenueCompany = company;
      section.innerHTML = drawerHtml(company);
    }
  }

  function bind() {
    installStyles();
    enhanceClientTable();
    enhanceClientCards();
    ensureDrawerSection();

    // Watch only direct card/row replacement, not our own enrichment inside each slot.
    let scheduled = false;
    const scheduleCards = () => {
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(() => { scheduled = false; enhanceClientCards(); });
    };
    const cards = document.getElementById('lrf-client-cards');
    if (cards) new MutationObserver(scheduleCards).observe(cards, { childList:true });
    const body = document.getElementById('lrf-clients-table-body');
    if (body) new MutationObserver(() => queueMicrotask(enhanceClientTable)).observe(body, { childList:true });
    document.addEventListener('lrf:clients-rendered', scheduleCards);

    let drawerScheduled = false;
    const scheduleDrawer = () => {
      if (drawerScheduled) return;
      drawerScheduled = true;
      queueMicrotask(() => { drawerScheduled = false; renderDrawerRevenue(); });
    };
    const drawer = document.getElementById('lrf-client-drawer');
    if (drawer) new MutationObserver(scheduleDrawer).observe(drawer, { attributes:true, attributeFilter:['class'] });
    const title = document.getElementById('lrf-detail-title');
    if (title) new MutationObserver(scheduleDrawer).observe(title, { childList:true, subtree:true, characterData:true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once:true }); else bind();
})();
