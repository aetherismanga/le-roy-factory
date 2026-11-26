import { searchKey } from './client-form-core.mjs';
import { eliosCode, eliosSearchCode, matchesEliosClientCode, salesDate, salesPeriod, salesEuro } from './elios-crm-reconciliation.mjs';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function eliosLinkedSearch(report, query) {
  const matches = new Set();
  const name = searchKey(query);
  if (!name || !report) return matches;
  const code = eliosSearchCode(query);
  for (const [clientId, {accounts}] of report.byClientId) {
    if (code ? matchesEliosClientCode(report,clientId,code) : accounts.some(account => searchKey(account.name).includes(name))) {
      matches.add(clientId);
    }
  }
  return matches;
}

export function eliosUnmatchedSearch(report, query) {
  const name = searchKey(query);
  if (!name || !report?.unmatched.length) return '';
  const code = eliosSearchCode(query);
  const matches = report.unmatched.filter(({row}) => code ? eliosCode(row.elios) === code : searchKey(row.name).includes(name));
  if (!matches.length) return '';
  const period = salesPeriod(report.dateFrom, report.dateTo);
  const rows = matches.map(({row}) => `<li>
    <div><strong>${escape(row.name)}</strong><span>Code Elios ${escape(row.elios)} · Compte Elios à rapprocher</span></div>
    <div class="client-elios-source-amount"><strong>${salesEuro(row.ca2026)}</strong><span>CA 2026</span></div>
  </li>`).join('');
  return `<h2 id="elios-source-search-title">Résultats du relevé Elios</h2><p>${escape(period)}</p>
    <ul class="client-elios-source-results">${rows}</ul>`;
}

export function eliosClientMetric(report, clientId) {
  const client = report?.byClientId.get(clientId);
  if (!client || client.ca2026 === null) return '';
  const date = salesDate(report.dateTo);
  return `<small class="client-elios-list-sales" title="${escape(salesPeriod(report.dateFrom,report.dateTo))}">Elios · ${salesEuro(client.ca2026)}${date ? ` au ${date}` : ''}${client.complete ? '' : ' · partiel'}</small>`;
}

export function eliosClientDetails(report, clientId) {
  const heading = '<h3 class="client-elios-sales-title">Chiffre d’affaires Elios</h3>';
  const client = report?.byClientId.get(clientId);
  const period = salesPeriod(report?.dateFrom,report?.dateTo);
  if (!client || client.ca2026 === null) {
    const message = report ? 'Aucun montant exploitable associé à cette fiche pour cet arrêté.' : 'L’arrêté Elios est indisponible.';
    return `${heading}<p>${message}</p>`;
  }
  const previousPeriod = salesPeriod(report.dateFrom.replace(/^\d{4}/,'2025'),report.previousDateTo);
  const breakdown = client.accounts.map(account => `<li><span>${escape(account.name)}${account.code ? ` · ${escape(account.code)}` : ''}${account.method === 'name' ? ' · association par nom' : ''}</span><strong>${salesEuro(account.ca2026)}</strong></li>`).join('');
  return `${heading}
    <dl class="client-elios-sales-kpis">
      <div><dt>CA 2026${period ? ` · ${period}` : ''}${client.complete ? '' : ' · partiel'}</dt><dd>${salesEuro(client.ca2026)}</dd></div>
      <div><dt>CA 2025 comparable${previousPeriod ? ` · ${previousPeriod}` : ''}${client.previousComplete ? '' : ' · partiel'}</dt><dd>${salesEuro(client.ca2025)}</dd></div>
    </dl>
    <details><summary>${client.accounts.length === 1 ? 'Compte usine' : 'Comptes usine retenus'}</summary><ul class="client-elios-sales-accounts">${breakdown}</ul></details>`;
}
