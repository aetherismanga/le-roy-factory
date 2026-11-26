import {loadEliosCrmSales} from './elios-crm-sales.js?v=20261126-elios';
import {installEliosStatsPeriod} from './statistiques-periods.js?v=20261126-elios';
import './statistiques-core.js?v=20261126-elios';
import './statistiques-commissions.js?v=20261126-elios';
import './statistiques-ux-fix.js?v=20261126-elios';
import './statistiques-annual-note.js?v=20261126-elios';
import './statistiques-ui-final.js?v=20261126-elios';

async function refreshEliosStats() {
  const sales = await loadEliosCrmSales();
  if (installEliosStatsPeriod(sales)) window.dispatchEvent(new Event('lrf-elios-stats-updated'));
}
window.addEventListener('focus',refreshEliosStats);
window.addEventListener('online',refreshEliosStats);
refreshEliosStats();
