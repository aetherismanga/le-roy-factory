import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { inflateSync } from 'node:zlib';
import { createRequire } from 'node:module';
import { reportDateISO, reportInPeriod, buildReportExport } from '../assets/js/crm-report-export-core.mjs';
import { createReportPDF } from '../assets/js/crm-report-pdf.mjs';
const { jsPDF } = createRequire(import.meta.url)('../assets/vendor/studio-one/jspdf.umd.min.js');
const rows = [
  { clientId: 'A', societe: 'Éco Céramique', ville: 'Montpellier', code_postal: '34000', date: '2026-11-01', author: 'Jérôme', usine: 'Randall Pro', text: 'Premier échange.' },
  { clientId: 'A', societe: 'Éco Céramique', date: '10/11/2026', usine: 'Randal, View', text: 'Deuxième échange.' },
  { clientId: 'B', societe: 'Éco Céramique', date: '2026-11-10', usine: 'Randal', text: 'Autre agence.' },
  { globalId: 'campaign', date: '2026-11-05', usine: 'Randal', text: 'Campagne.' },
  { clientId: 'C', date: '2026-11-05', usine: 'Neobath', text: 'À exclure.' },
  { clientId: 'D', date: '2026-10-31', usine: 'Randal', text: 'Hors période.' }
];
const filters = { usine: 'Randal', start: '2026-11-01', end: '2026-11-10' };
test('inclusive period supports French dates and rejects invalid/undated reports when bounded', () => {
  for (const date of ['2026-11-01', '2026-11-10T23:59:00Z', '1/11/2026', '10.11.2026']) assert.ok(reportInPeriod({ date }, filters.start, filters.end));
  for (const date of ['', '2026-11-31', '2026-10-31', '2026-11-11']) assert.equal(reportInPeriod({ date }, filters.start, filters.end), false);
  assert.equal(reportDateISO('31/02/2026'), '');
  assert.ok(reportInPeriod({ date: '' }));
  assert.equal(reportInPeriod({ date: '2026-11-05' }, filters.end, filters.start), false);
  assert.throws(() => buildReportExport(rows, { start: filters.end, end: filters.start }), /date de fin/);
  assert.throws(() => buildReportExport([], filters), /Aucun/);
});
test('factory export groups real client IDs and separates campaigns without mutating records', () => {
  const before = JSON.stringify(rows), model = buildReportExport(rows, filters);
  assert.equal(model.count, 4); assert.equal(model.clients.length, 2); assert.equal(model.campaigns.length, 1);
  assert.equal(model.clients[0].reports.length, 2);
  assert.equal(model.clients[0].reports[1].text, 'Deuxième échange.');
  assert.equal(model.filename, 'LRF_Comptes-rendus_Randal_2026-11-01_2026-11-10.pdf');
  rows[0].text = 'Modified after preparation';
  assert.equal(model.clients[0].reports[0].text, 'Premier échange.');
  rows[0].text = 'Premier échange.';
  assert.equal(JSON.stringify(rows), before);
});
test('actual PDF paginates long multiline reports and stays a valid PDF attachment', () => {
  const model = buildReportExport(rows, filters);
  model.clients[0].reports[0].text = 'Échange commercial avec Jérôme. Produits présentés et suites à donner.\n'.repeat(160);
  const pdf = createReportPDF(model, jsPDF), raw = pdf.output();
  assert.ok(pdf.getNumberOfPages() > 3); assert.ok(raw.startsWith('%PDF-'));
  const streams = [...raw.matchAll(/stream\n([\s\S]*?)\nendstream/g)].map(match => inflateSync(Buffer.from(match[1], 'binary')).toString('latin1')).join('\n');
  assert.match(streams, /Actions g/); assert.match(streams, /Autre agence/); assert.ok(pdf.output('datauristring').split(',')[1]);
});
function harness({ user = true, success = true } = {}) {
  const elements = new Map();
  function element() { return {value:'',textContent:'',disabled:false,listeners:{},addEventListener(type, handler){this.listeners[type]=handler;},replaceChildren(){},append(){},reset(){},reportValidity(){return true;},showModal(){this.open=true;},close(){this.open=false;this.listeners.close?.();},focus(){}}; }
  const $ = id => { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); };
  const requests = [];
  const context = vm.createContext({document:{getElementById:$,createElement:element,activeElement:element()}, buildReportExport,
    reportPeriodLabel:()=> 'Du 01/11/2026 au 10/11/2026', createReportPDF:model=>createReportPDF(model,jsPDF),
    fetch:async(url, options)=>{requests.push({url,options}); return {ok:success,status:success?200:401,json:async()=>({success,sentCopy:{status:'saved'}})};},
    setTimeout(){}, URL, window:{open(){return null;}}
  });
  let source=readFileSync(new URL('../assets/js/crm-report-export.mjs',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replace('export function','function');
  vm.runInContext(source+';this.init=initReportExport;', context);
  const profile = {name:'Coryne',email:'coryne@leroyfactory.fr'};
  context.init({getRows:()=>rows,getFilters:()=>filters,getAgentProfile:()=>profile,auth:{currentUser:user?{getIdToken:async()=> 'test-token'}:null}});
  $('cr-export-open').listeners.click();
  $('cr-export-recipient').value='factory@example.test';$('cr-export-subject').value='Récapitulatif';$('cr-export-message').value='Bonjour <usine> & merci';
  return { $, requests, send:()=> $('cr-export-mail').listeners.submit({preventDefault(){}}) };
}
test('mail action uses the signed-in sender and attaches the prepared PDF with no client history reassignment', async () => {
  const h=harness(); await h.send(); await h.send();
  // Disabled submit buttons cannot be clicked, but programmatic submit must also be guarded.
  assert.equal(h.requests.length,1);
  const payload=JSON.parse(h.requests[0].options.body);
  assert.equal(payload.senderMode,'coryne');assert.equal(payload.mailKind,'client-direct');
  assert.deepEqual(payload.bccRecipients,['factory@example.test']);assert.deepEqual(payload.clientIds,[]);
  assert.ok(Buffer.from(payload.attachments[0].content,'base64').toString().startsWith('%PDF-'));
  assert.match(payload.htmlContent,/Bonjour &lt;usine&gt; &amp; merci/);
  assert.equal(h.requests[0].options.headers.Authorization,'Bearer test-token');
});
test('expired authentication blocks network delivery and server refusal leaves the action retryable', async () => {
  const absent=harness({user:false});await absent.send();assert.equal(absent.requests.length,0);assert.match(absent.$('cr-export-status').textContent,/session a expiré/);
  const refused=harness({success:false});await refused.send();assert.match(refused.$('cr-export-status').textContent,/Session non autorisée/);assert.equal(refused.$('cr-export-send').disabled,false);
});
