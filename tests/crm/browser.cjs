#!/usr/bin/env node
/* Run: node tests/crm/browser.cjs [evidence-directory]
 * Optional CHROMIUM_EXECUTABLE selects a preinstalled compatible browser.
 * No production network or production database is used. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const cp = require('node:child_process');
const { chromium } = require('playwright');
const fixture = require('./browser-fixtures.cjs');
const root = path.resolve(__dirname, '../..');
const evidence = path.resolve(process.argv[2] || path.join(root, '../crm-audit-evidence'));
const origin = 'http://crm-offline.test';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const report = { mode: 'offline-fictional-only', started: new Date().toISOString(), checks: [], screenshots: [], metrics: {}, blockedExternal: [], pageErrors: [] };
let browser;
let lastPage;

function pass(name, detail) { report.checks.push({ name, status: 'passed', detail }); console.log('PASS ' + name); }
async function contextFor(options = {}) {
  const context = await browser.newContext({ viewport: options.mobile ? { width: 390, height: 844 } : { width: 1440, height: 1050 }, isMobile: !!options.mobile, deviceScaleFactor: 1, serviceWorkers: 'block' });
  context.setDefaultTimeout(10000);
  await context.addInitScript(fixture.initializeFixture, { authMode: options.authMode || 'valid', authDelay: options.authDelay || 80, seedRows: fixture.rows });
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    const headers = { 'access-control-allow-origin': '*' };
    if (url.hostname === 'www.gstatic.com') {
      const file = path.basename(url.pathname);
      const body = file === 'firebase-app.js' ? fixture.appModule : file === 'firebase-auth.js' ? fixture.authModule : file === 'firebase-firestore.js' ? fixture.firestoreModule : 'export {};';
      return route.fulfill({ status: 200, headers, contentType: 'text/javascript', body });
    }
    if (url.hostname === 'unpkg.com' && url.pathname.endsWith('leaflet.js')) return route.fulfill({ status: 200, headers, contentType: 'text/javascript', body: fixture.leafletScript });
    if (url.origin !== origin) {
      report.blockedExternal.push({ url: url.origin + url.pathname, method: route.request().method() });
      if (route.request().resourceType() === 'image') return route.fulfill({ status: 200, headers, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="60" height="40"><rect width="60" height="40" fill="#e6eae4"/></svg>' });
      return route.fulfill({ status: 200, headers, contentType: url.pathname.endsWith('.css') || url.hostname.includes('fonts') ? 'text/css' : 'application/json', body: url.hostname.includes('fonts') || url.pathname.endsWith('.css') ? '' : '[]' });
    }
    const filename = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/clients.html' : url.pathname));
    if (!filename.startsWith(root + path.sep)) return route.abort();
    try {
      let body = await fs.readFile(filename);
      if (filename.endsWith('.html')) body = Buffer.from(body.toString().replace(/\s+integrity="[^"]*"/g, ''));
      return route.fulfill({ status: 200, contentType: mime[path.extname(filename)] || 'application/octet-stream', body });
    } catch { return route.fulfill({ status: 404, body: 'Offline fixture: local file absent' }); }
  });
  context.on('page', page => {lastPage=page; page.on('pageerror', error => report.pageErrors.push({ url: page.url(), error: error.message,stack:error.stack }));page.on('console',message=>{if(message.type()==='error') (report.consoleErrors ||= []).push({message:message.text(),location:message.location()});});});
  return context;
}
async function screenshot(page, filename) {
  const output = path.join(evidence, filename);
  await page.screenshot({ path: output, fullPage: page.viewportSize().width > 600 });
  report.screenshots.push(output);
}
async function ready(page, route = '/clients.html') {
  await page.goto(origin + route, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('body.lrf-workspace');
  if (route.startsWith('/clients')) await page.waitForSelector('#clients-table-body tr[data-client-id]');
}
async function mutationMetric(source) {
  const page = await browser.newPage();
  await page.setContent('<div id="client-modal" style="display:flex"><div class="modal-content"><div class="modal-header"></div><form id="client-form"><div class="modal-grid-edit"><input id="edit-societe" value="Entreprise fictive"></div><div class="crm-extra-section">Interlocuteurs</div><div class="documents-section">Documents joints</div></form></div></div>');
  await page.addScriptTag({ content: source });
  await page.waitForTimeout(200);
  await page.evaluate(() => { window.__mutations = 0; new MutationObserver(records => window.__mutations += records.length).observe(document.querySelector('#client-form'), { attributes: true, childList: true, subtree: true }); });
  await page.waitForTimeout(1000);
  const count = await page.evaluate(() => window.__mutations);
  await page.close();
  return count;
}

(async () => {
  await fs.mkdir(evidence, { recursive: true });
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || process.env.CRM_TEST_CHROMIUM_PATH || undefined, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try { report.metrics.baselineIdleFormMutationsPerSecond = await mutationMetric(cp.execFileSync('git', ['show', 'b415028998f0136be9c411206ae65105779dd29f:assets/js/crm-ui-modern.js'], { cwd: root, encoding: 'utf8' })); }
  catch { report.metrics.baselineUnavailable = 'Original commit absent from this checkout'; }
  report.metrics.updatedIdleFormMutationsPerSecond = await mutationMetric(await fs.readFile(path.join(root, 'assets/js/crm-ui-modern.js'), 'utf8'));
  assert.equal(report.metrics.updatedIdleFormMutationsPerSecond, 0, 'No repeated mutation loop while the form is idle');
  if (!report.metrics.baselineUnavailable) assert.ok(report.metrics.updatedIdleFormMutationsPerSecond < report.metrics.baselineIdleFormMutationsPerSecond, 'Idle mutation loop must be reduced');
  pass('Idle modal mutation loop reduced', report.metrics);

  const context = await contextFor();
  const page = await context.newPage();
  await ready(page);
  assert.equal(await page.evaluate(() => window.__crmTest.writes.length), 0);
  assert.equal(await page.locator('#clients-table-body tr[data-client-id]').count(), 4);
  pass('Directory opens without writes; archived records excluded');
  await screenshot(page, 'crm-clients-desktop.png');
  report.initialRows = await page.locator('#clients-table-body tr').evaluateAll(rows => rows.map(row => ({id:row.dataset.clientId,html:row.innerHTML.slice(-1000)})));

  await page.locator('tr[data-client-id="fictional-client-a"] td:nth-child(2) strong').click();
  await page.waitForSelector('#lrf-client-tabs');
  await page.locator('#lrf-client-tabs [data-tab="partners"]').click();
  await page.waitForSelector('#lrf-partner-access-section', { state: 'visible' });
  assert.equal(await page.locator('#lrf-partner-access-section').getAttribute('data-collapsed'), '0');
  assert.equal(await page.locator('#lrf-pane-history').count(), 1);
  assert.equal(await page.locator('#lrf-pane-documents').count(), 1);
  await page.locator('#lrf-client-tabs [data-tab="infos"]').click();
  pass('Partners panel is accessible; history text cannot misclassify the document pane');
  assert.equal(await page.locator('#client-modal').getAttribute('data-client-id'), 'fictional-client-a');
  await page.locator('#edit-ville').fill('Montpellier Test');
  const before = await page.evaluate(() => window.__crmTest.writes.length);
  await page.evaluate(() => { const form = document.querySelector('#client-form'); form.requestSubmit(); form.requestSubmit(); });
  await page.waitForFunction(() => document.querySelector('#client-modal').style.display === 'none');
  const edited = await page.evaluate(() => ({ client: window.__crmTest.store.clients['fictional-client-a'], other: window.__crmTest.store.clients['fictional-client-b'], writes: window.__crmTest.writes.slice() }));
  report.editWriteTrace = edited.writes;
  assert.equal(edited.client.codeClient, 'LRF-00101');
  assert.deepEqual(edited.client.codesLRF, ['LRF-00088']);
  assert.equal(edited.client.ville, 'Montpellier Test');
  assert.equal(edited.other.ville, 'Nîmes');
  assert.equal(edited.writes.length - before, 1);
  assert.equal(edited.writes.at(-1).path, 'clients/fictional-client-a');
  report.saveMetrics={editClientWrites:edited.writes.length-before,editDocumentId:'fictional-client-a',preservedCode:edited.client.codeClient,preservedAliases:edited.client.codesLRF};
  pass('Exact document ID, LRF code, aliases and same-name branch preserved; double submit writes once');

  await page.locator('tr[data-client-id="fictional-client-a"] td:nth-child(2) strong').click();
  await page.locator('#edit-notes').fill('BROUILLON FICTIF À CONSERVER');
  await page.evaluate(() => { window.__crmTest.failedNext = true; document.querySelector('#client-form').requestSubmit(); });
  await page.waitForFunction(() => window.__crmTest.alerts.length > 0);
  assert.equal(await page.locator('#client-modal').isVisible(), true);
  assert.equal(await page.locator('#edit-notes').inputValue(), 'BROUILLON FICTIF À CONSERVER');
  assert.equal(await page.evaluate(() => window.__crmTest.writes.length), edited.writes.length);
  pass('Simulated save failure preserves the open form and unsaved input');
  await screenshot(page, 'crm-client-desktop.png');
  const firstTab = page.locator('#lrf-client-tabs [role="tab"]').first();
  await firstTab.focus(); await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.tab), 'contacts');
  assert.equal(await page.locator('#lrf-client-tabs [data-tab="contacts"]').getAttribute('aria-selected'), 'true');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#client-modal').isVisible(), false);
  pass('Modal tabs support keyboard arrows and Escape closes the modal');

  await page.locator('#btn-add-client').click();
  await page.locator('#edit-societe').fill('TEST — Nouveau magasin fictif');
  await page.locator('#edit-code-postal').fill('84000');
  await page.locator('#edit-ville').fill('Avignon');
  await page.evaluate(() => { const form = document.querySelector('#client-form'); form.requestSubmit(); form.requestSubmit(); });
  await page.waitForFunction(() => document.querySelector('#client-modal').style.display === 'none');
  const created = await page.evaluate(() => Object.entries(window.__crmTest.store.clients).filter(([, row]) => row.societe === 'TEST — Nouveau magasin fictif'));
  assert.equal(created.length, 1); assert.equal(created[0][1].codeClient, 'LRF-00106');
  report.saveMetrics.createdDocuments=created.length;report.saveMetrics.createdCode=created[0][1].codeClient;
  pass('Fictional create allocates one document and next LRF code under double submit');
  await page.locator('#search-input').fill('LRF-00106');
  await page.waitForTimeout(180);
  assert.equal(await page.locator('#clients-table-body tr[data-client-id]:visible').count(), 1);
  await page.locator('#search-input').fill('');
  await page.locator('#filter-type').selectOption('prospect');
  assert.equal(await page.locator('#clients-table-body tr[data-client-id]:visible').count(), 2);
  pass('Search by LRF code and type filtering');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector(`tr[data-client-id="${created[0][0]}"]`);
  await page.goto(origin + '/clients.html?edit=fictional-client-a', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#client-modal')?.dataset.clientId === 'fictional-client-a');
  assert.equal(await page.locator('#edit-ville').inputValue(), 'Montpellier Test');
  pass('Saved fictional data survives reload and exact deep link reopens correct record');
  await context.close();

  const mapContext = await contextFor(); const mapPage = await mapContext.newPage();
  await ready(mapPage, '/carte.html');
  await mapPage.waitForFunction(() => window.__lrfCarteVisiblePoints?.length === 3);
  report.mapMetrics={initialVisible:await mapPage.evaluate(()=>window.__lrfCarteVisiblePoints.length),writesOnOpen:await mapPage.evaluate(()=>window.__crmTest.writes.length)};
  assert.equal(await mapPage.evaluate(() => window.__crmTest.writes.length), 0);
  assert.match(await mapPage.locator('#map-counter').textContent(), /3 entreprise.*1 sans coordonnées/);
  await mapPage.locator('.btn-filter[data-filter="coryne"]').click();
  assert.equal(await mapPage.evaluate(() => window.__lrfCarteVisiblePoints.length), 1);
  report.mapMetrics.agentFilteredVisible=await mapPage.evaluate(()=>window.__lrfCarteVisiblePoints.length);
  await mapPage.locator('.btn-filter[data-filter="all"]').click();
  await mapPage.locator('#dept-select').selectOption('34');
  assert.equal(await mapPage.evaluate(() => window.__lrfCarteVisiblePoints.length), 1);
  report.mapMetrics.departmentFilteredVisible=await mapPage.evaluate(()=>window.__lrfCarteVisiblePoints.length);
  await mapPage.locator('.btn-filter[data-filter="all"]').click();
  await mapPage.locator('#lrf-toggle-clients').click();
  assert.equal(await mapPage.evaluate(() => window.__lrfCarteVisiblePoints.length), 1);
  report.mapMetrics.prospectsOnlyVisible=await mapPage.evaluate(()=>window.__lrfCarteVisiblePoints.length);
  await mapPage.locator('#lrf-toggle-clients').click();
  await mapPage.evaluate(() => window.__crmMarkers.find(x => x.__lrfClientId === 'fictional-client-a').openPopup());
  const href = await mapPage.locator('.leaflet-popup a[href*="clients.html?edit="]').getAttribute('href');
  assert.equal(href, 'clients.html?edit=fictional-client-a');
  await screenshot(mapPage, 'crm-map-desktop.png');
  pass('Map excludes archived/missing coordinates, filters agent/department/type and links exact document ID');
  await mapContext.close();

  const mobile = await contextFor({ mobile: true }); const phone = await mobile.newPage();
  await ready(phone);
  await screenshot(phone, 'crm-clients-mobile.png');
  const tableWidth = await phone.locator('.crm-table-container').evaluate(el => ({ client: el.clientWidth, scroll: el.scrollWidth, doc: document.documentElement.scrollWidth, viewport: innerWidth }));
  report.mobileTableMetrics = tableWidth;
  const mobileTableDisplay = await phone.locator('.crm-table').evaluate(el => getComputedStyle(el).display);
  assert.ok(tableWidth.scroll > tableWidth.client || mobileTableDisplay === 'block', 'Small screen uses a local scroll area or stacked cards');
  assert.ok(tableWidth.doc <= tableWidth.viewport + 2, 'Page has no horizontal overflow');
  await phone.locator('tr[data-client-id="fictional-client-a"]').scrollIntoViewIfNeeded();
  await screenshot(phone, 'crm-clients-mobile-cards.png');
  await phone.locator('tr[data-client-id="fictional-client-a"] td:nth-child(2) strong').click();
  await phone.waitForSelector('#lrf-client-tabs');
  const modalGeometry = await phone.locator('#client-modal').evaluate(el => {
    const content=el.querySelector('.modal-content').getBoundingClientRect();
    const title=el.querySelector('.modal-header').getBoundingClientRect();
    const tabs=el.querySelector('#lrf-client-tabs').getBoundingClientRect();
    return {right:content.right,width:content.width,viewport:innerWidth,headerHeight:title.height,tabsHeight:tabs.height,titleBottom:title.bottom,tabsBottom:tabs.bottom,modalBottom:content.bottom};
  });
  report.mobileModalMetrics=modalGeometry;
  assert.ok(modalGeometry.right<=modalGeometry.viewport+1,'Modal fits within mobile viewport');
  assert.ok(modalGeometry.headerHeight>=50&&modalGeometry.tabsHeight>=35,'Modal title and tabs keep usable heights');
  assert.ok(modalGeometry.tabsBottom<=modalGeometry.modalBottom,'Tabs remain within modal');
  await screenshot(phone, 'crm-client-mobile.png');
  await phone.keyboard.press('Escape');
  await ready(phone, '/carte.html');
  await phone.waitForSelector('#map-mobile-filter');
  await phone.locator('#map-mobile-filter').click();
  await phone.locator('.btn-filter[data-filter="coryne"]').click();
  assert.equal(await phone.evaluate(() => window.__lrfCarteVisiblePoints.length), 1);
  assert.equal(await phone.locator('.filter-bar').evaluate(el => el.classList.contains('mobile-open')), false);
  await screenshot(phone, 'crm-map-mobile.png');
  pass('Mobile cards stay within viewport; modal and map filter sheet work at 390 px');
  await mobile.close();

  const delayed = await contextFor({ authDelay: 500 }); const delayedPage = await delayed.newPage();
  await delayedPage.goto(origin + '/clients.html', { waitUntil: 'domcontentloaded' });
  await delayedPage.waitForTimeout(100);
  assert.equal(await delayedPage.evaluate(() => window.__crmTest.reads.length), 0);
  await delayedPage.waitForSelector('#clients-table-body tr[data-client-id]');
  pass('Client data reads wait for restored Firebase authentication');
  await delayed.close();

  const denied = await contextFor({ authMode: 'null', authDelay: 100 }); const deniedPage = await denied.newPage();
  await deniedPage.addInitScript(() => { localStorage.setItem('agentLoggedIn', 'true'); localStorage.setItem('agentEmail', 'jerome@leroyfactory.fr'); });
  await deniedPage.goto(origin + '/clients.html', { waitUntil: 'domcontentloaded' });
  await deniedPage.waitForURL(/agent\.html\?return=/);
  await deniedPage.waitForTimeout(250);
  report.agentRuntimeErrors = await deniedPage.evaluate(() => window.__crmTest.runtimeErrors);
  assert.equal(await deniedPage.evaluate(() => window.__crmTest.reads.length), 0);
  assert.equal(await deniedPage.evaluate(() => window.__crmTest.writes.length), 0);
  pass('Stale localStorage without Firebase session redirects without CRM reads or writes');
  await denied.close();
  assert.equal(report.pageErrors.length,0,'No unexpected browser JavaScript exception');
  report.finished = new Date().toISOString();
  report.summary = `${report.checks.length} browser checks passed`;
  await fs.writeFile(path.join(evidence, 'browser-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({summary:report.summary,metrics:report.metrics,evidence, screenshots:report.screenshots,pageErrors:report.pageErrors}, null, 2));
})().catch(async error => {
  report.failure = { message: error.message, stack: error.stack };
  try { report.failure.dom = await lastPage?.evaluate(() => ({url:location.href, sections:[...document.querySelectorAll('#client-form > *, #lrf-client-tabs .lrf-tab')].map(el=>({id:el.id,tag:el.tagName,classes:el.className,display:getComputedStyle(el).display,pane:el.dataset.lrfPane,hidden:el.hidden,tab:el.dataset.tab,selected:el.getAttribute('aria-selected')}))}));await lastPage?.screenshot({path:path.join(evidence,'failure.png'),fullPage:true}); } catch {}
  await fs.mkdir(evidence, { recursive: true });
  await fs.writeFile(path.join(evidence, 'browser-report.json'), JSON.stringify(report, null, 2));
  console.error(error); process.exitCode = 1;
}).finally(async () => { await browser?.close(); });
