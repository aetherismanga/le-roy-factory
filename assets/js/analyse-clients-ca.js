import { VIEW_STATS_CLIENTS_2026_08 } from './statistiques-view-data.js';
import { VIEW_STATS_CLIENTS_2026_07 } from './statistiques-view-juillet-2026-archive.js';
import { eliosClientDetails } from './elios-crm-revenue-ui.js';
import { salesEuro, salesPeriod } from './elios-crm-reconciliation.mjs';

const VIEW_PERIOD = '01/01/2026 au 31/08/2026';
const VIEW_PREVIOUS = '01/01/2025 au 31/08/2025';
const LEGAL = new Set(['sa','sas','sasu','sarl','eurl','sci','sc','ets','etablissement','etablissements','societe','ste','cod','fatt','france','de','du','des','la','le','les','et','a','au','aux']);
const AMBIGUOUS = new Set(['richardson','bonifay','costamagna','carrelage','carrelages','materiaux','ceramique','design','concept']);
const amount = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
const escape = value => String(value ?? '').replace(/[&<>"']/g, char =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function tokens(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/&/g, ' et ').split(/[^a-z0-9]+/).filter(token => token && !LEGAL.has(token))
    .map(token => token.length > 5 && token.endsWith('s') ? token.slice(0,-1) : token);
}

function matchScore(a,b) {
  const at = tokens(a), bt = tokens(b), ac = at.join(''), bc = bt.join('');
  if (!ac || !bc) return 0;
  if (ac === bc) return 100;
  const minChars = Math.min(ac.length,bc.length);
  if (minChars >= 8 && (ac.startsWith(bc) || bc.startsWith(ac))) return 94;
  if (minChars >= 9 && (ac.includes(bc) || bc.includes(ac))) return 90;
  const as = new Set(at), bs = new Set(bt), shared = [...as].filter(token => bs.has(token));
  const smaller = Math.min(as.size,bs.size);
  if (smaller === 1 && shared.length === 1) return !AMBIGUOUS.has(shared[0]) && shared[0].length >= 7 ? 78 : 0;
  if (shared.length >= 2 && shared.length === smaller) return 88;
  return shared.length >= 2 && shared.length / smaller >= .67 ? 82 : 0;
}

function bestMatch(company,rows) {
  const hits = rows.map(row => ({row,score:matchScore(company,row.name)}))
    .filter(hit => hit.score >= 78).sort((a,b) => b.score-a.score);
  return hits[0] && (!hits[1] || hits[0].score-hits[1].score > 4) ? hits[0].row : null;
}

function viewTurnover(company) {
  const current = bestMatch(company,VIEW_STATS_CLIENTS_2026_08);
  if (!current) return null;
  const byCode = current.factory ? VIEW_STATS_CLIENTS_2026_07.filter(row => String(row.factory) === String(current.factory)) : [];
  const earlier = byCode.length === 1 ? byCode[0] : bestMatch(company,VIEW_STATS_CLIENTS_2026_07);
  const ytd = amount(current.ca2026), july = amount(earlier?.ca2026);
  return {name:current.name,code:current.factory,ytd,previous:amount(current.ca2025),august:ytd !== null && july !== null ? (Math.round(ytd*100)-Math.round(july*100))/100 : null};
}

function metric(label,value,period,partial=false) {
  return `<div class="lrf-ca-metric"><span><b>${label}</b><small>${escape(period)}${partial ? ' · partiel' : ''}</small></span><strong${value < 0 ? ' class="lrf-ca-negative"' : ''}>${salesEuro(value)}</strong></div>`;
}

export function clientTurnoverMarkup(client,report) {
  const elios = report?.byClientId.get(client.id), view = viewTurnover(client.societe);
  const period = salesPeriod(report?.dateFrom,report?.dateTo);
  return [
    metric('Elios',elios?.ca2026 ?? null,period || 'Arrêté indisponible',!!elios && !elios.complete),
    ...(view?.ytd !== null && view?.ytd !== undefined ? [metric('View',view.ytd,VIEW_PERIOD)] : [])
  ].join('');
}

export function clientTurnoverDetails(client, report) {
  const view = viewTurnover(client.societe);
  let other = '';
  if (view && view.ytd !== null) {
    const account = [view.name,view.code].filter(Boolean).map(escape).join(' · ');
    other = `<section class="lrf-ca-company"><h3>Chiffre d’affaires View</h3>
      ${metric('CA 2026',view.ytd,VIEW_PERIOD)}
      <details><summary>Historique et compte usine</summary>
        ${metric('CA 2025 comparable',view.previous,VIEW_PREVIOUS)}
        ${metric('Août 2026',view.august,'Écart entre les arrêtés de juillet et d’août')}
        <p>Association automatique par nom · ${account}</p>
      </details></section>`;
  }
  return `<section class="lrf-ca-company">${eliosClientDetails(report,client.id)}</section>${other}`;
}
