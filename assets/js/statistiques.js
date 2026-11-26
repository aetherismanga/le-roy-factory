import {loadEliosCrmSales} from './elios-crm-sales.js';
import {loadEliosCrmRevenue} from './elios-crm-revenue.js';
import {installEliosStatsPeriod, installEliosStatsLinks} from './statistiques-periods.js?v=20261126-elios-links';
import './statistiques-core.js?v=20261126-elios-links';
import './statistiques-commissions.js?v=20261126-elios-links';
import './statistiques-ux-fix.js?v=20261126-elios-links';
import './statistiques-annual-note.js?v=20261126-elios-links';
import './statistiques-ui-final.js?v=20261126-elios';

let matchingSales;
async function refreshEliosStats() {
  const sales = await loadEliosCrmSales();
  if (!sales) return;
  if (installEliosStatsPeriod(sales)) window.dispatchEvent(new Event('lrf-elios-stats-updated'));
  if (matchingSales === sales) return;
  matchingSales = sales;
  const report = await loadEliosCrmRevenue().catch(() => null);
  if (installEliosStatsLinks(sales, report)) window.dispatchEvent(new Event('lrf-elios-stats-links-updated'));
  else if (matchingSales === sales) matchingSales = null;
}
window.addEventListener('focus',refreshEliosStats);
window.addEventListener('online',refreshEliosStats);
refreshEliosStats();
