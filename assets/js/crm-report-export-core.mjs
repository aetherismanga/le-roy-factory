import { reportMatchesPartner } from './crm-report-partners.mjs?v=20261108-partners1';

export function reportDateISO(value) {
  const raw = String(value || '').trim();
  let match = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
  if (!match) {
    const legacy = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
    if (legacy) match = [raw, legacy[3], legacy[2].padStart(2, '0'), legacy[1].padStart(2, '0')];
  }
  if (!match) return '';
  const [, y, m, d] = match;
  const date = new Date(`${y}-${m}-${d}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === `${y}-${m}-${d}` ? `${y}-${m}-${d}` : '';
}

export function reportInPeriod(report, start = '', end = '') {
  if (start && end && start > end) return false;
  const date = reportDateISO(report.date);
  return (!start && !end) || Boolean(date && (!start || date >= start) && (!end || date <= end));
}

export function buildReportExport(rows, filters = {}) {
  const { start = '', end = '', usine = '' } = filters;
  if (start && end && start > end) throw new Error('La date de fin doit être postérieure ou égale à la date de début.');
  const selected = rows.filter(row => reportInPeriod(row, start, end) && reportMatchesPartner(row, usine)).map(row => ({ ...row }));
  if (!selected.length) throw new Error('Aucun compte-rendu ne correspond à cette sélection.');
  const groups = new Map(), campaigns = [];
  for (const report of selected) {
    if (report.globalId) { campaigns.push(report); continue; }
    // Client IDs keep distinct agencies with identical company names separate.
    const key = report.clientId || JSON.stringify([report.societe, report.code_postal, report.ville]);
    if (!groups.has(key)) groups.set(key, { societe: report.societe || 'Client sans nom', ville: report.ville || '', codePostal: report.code_postal || '', reports: [] });
    groups.get(key).reports.push(report);
  }
  const oldestFirst = (a, b) => reportDateISO(a.date).localeCompare(reportDateISO(b.date)) || String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
  const clients = [...groups.values()].sort((a, b) => a.societe.localeCompare(b.societe, 'fr', { sensitivity: 'base' }));
  clients.forEach(client => client.reports.sort(oldestFirst));
  campaigns.sort(oldestFirst);
  const slug = (usine || 'toutes-usines').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
  return { clients, campaigns, count: selected.length, filters: { ...filters }, filename: `LRF_Comptes-rendus_${slug}_${start || 'origine'}_${end || 'toutes-dates'}.pdf` };
}

export const shortReportDate = value => {
  const iso = reportDateISO(value);
  return iso ? iso.split('-').reverse().join('/') : String(value || 'Date non renseignée');
};

export function reportPeriodLabel({ start, end } = {}) {
  return start && end ? `Du ${shortReportDate(start)} au ${shortReportDate(end)}` : start ? `Depuis le ${shortReportDate(start)}` : end ? `Jusqu’au ${shortReportDate(end)}` : 'Toutes les dates';
}
