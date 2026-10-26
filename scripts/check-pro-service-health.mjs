import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {setTimeout as pause} from 'node:timers/promises';

const FUNCTIONS = 'https://us-central1-le-roy-factory.cloudfunctions.net/';
const ORIGIN = 'https://leroyfactory.fr';
// Empty credentials fail before querying clients or creating/revoking a session.
// Check both URLs when the browser uses Run.app and server callers use its alias.
export const PRO_HEALTH_TARGETS = Object.freeze([
  {name:'createProSession', url:FUNCTIONS+'createProSession', body:{}, status:403},
  {name:'validateProSession', url:FUNCTIONS+'validateProSession', body:{}, status:401},
  {name:'revokeProSession', url:FUNCTIONS+'revokeProSession', body:{}, status:200, success:true},
  {name:'getTariffPdf', url:'https://gettariffpdf-5m3lsyu7bq-uc.a.run.app', body:{tariffId:'elios-2026'}, status:403, authorization:true},
  {name:'getTariffPdf alias', url:FUNCTIONS+'getTariffPdf', body:{tariffId:'elios-2026'}, status:403, authorization:true},
  {name:'getNeobathDnaTariff', url:'https://getneobathdnatariff-5m3lsyu7bq-uc.a.run.app', body:{}, status:403, authorization:true},
  {name:'getNeobathDnaTariff alias', url:FUNCTIONS+'getNeobathDnaTariff', body:{}, status:403, authorization:true},
  {name:'getAccountClientPrefill', url:'https://getaccountclientprefill-5m3lsyu7bq-uc.a.run.app', body:{}, status:403}
].map(target => Object.freeze(target)));

const tokens = value => String(value || '').toLowerCase().split(',').map(value => value.trim());
function checkCors(response, origin) {
  const value = response.headers.get('access-control-allow-origin');
  if (value !== origin && value !== '*') throw Error('missing or incorrect Access-Control-Allow-Origin');
}
function checkPreflight(response, target, origin) {
  if (response.status !== 204) throw Error('expected OPTIONS 204');
  checkCors(response, origin);
  if (!tokens(response.headers.get('access-control-allow-methods')).includes('post')) throw Error('POST not allowed by CORS');
  const allowed = tokens(response.headers.get('access-control-allow-headers'));
  if (!allowed.includes('content-type') || target.authorization && !allowed.includes('authorization')) throw Error('request headers not allowed by CORS');
}
async function checkPost(response, target, origin) {
  if (response.status !== target.status) throw Error('expected POST '+target.status);
  checkCors(response, origin);
  if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') || '')) throw Error('expected JSON, received a platform or HTML response');
  const body = await response.json();
  if (!body || typeof body !== 'object' || body.success !== (target.success === true)) throw Error('unexpected JSON success flag');
  if (body.client != null || body.sessionToken != null || body.accessToken != null) throw Error('anonymous health request returned account credentials or client data');
}

export async function checkProServiceHealth({
  request = fetch, targets = PRO_HEALTH_TARGETS, origin = ORIGIN,
  attempts = 3, delayMs = 2000, timeoutMs = 15000, wait = pause
} = {}) {
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 3) throw Error('Health checks allow one to three attempts');
  async function probe(target, method) {
    for (let attempt = 1; attempt <= attempts; attempt++) {
      let response;
      try {
        const headers = {Origin:origin};
        if (method === 'OPTIONS') {
          headers['Access-Control-Request-Method'] = 'POST';
          headers['Access-Control-Request-Headers'] = 'content-type'+(target.authorization ? ', authorization' : '');
        } else headers['Content-Type'] = 'application/json';
        response = await request(target.url, {
          method, headers, credentials:'omit', redirect:'error', cache:'no-store',
          ...(method === 'POST' ? {body:JSON.stringify(target.body)} : {}),
          signal:AbortSignal.timeout(timeoutMs)
        });
        if (response.status >= 500 && response.status <= 599 && attempt < attempts) {
          await response.body?.cancel();
          await wait(delayMs);
          continue;
        }
      } catch (error) {
        if (attempt < attempts) { await wait(delayMs); continue; }
        return {name:target.name, method, ok:false, status:null, attempts:attempt, error:'network failure: '+String(error.message || error)};
      }
      try {
        if (method === 'OPTIONS') checkPreflight(response, target, origin);
        else await checkPost(response, target, origin);
        return {name:target.name, method, ok:true, status:response.status, attempts:attempt};
      } catch (error) {
        return {name:target.name, method, ok:false, status:response.status, attempts:attempt, error:error.message};
      }
    }
  }
  const results = await Promise.all(targets.flatMap(target => ['OPTIONS', 'POST'].map(method => probe(target, method))));
  return {ok:results.every(result => result.ok), results};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = await checkProServiceHealth();
  for (const row of report.results) console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.name} ${row.method} ${row.status ?? 'NETWORK'}${row.attempts > 1 ? ' ('+row.attempts+' attempts)' : ''}${row.error ? ': '+row.error : ''}`);
  console.log(`PRO service health: ${report.results.filter(row => row.ok).length}/${report.results.length} passed. No valid account or session was used.`);
  if (!report.ok) process.exitCode = 1;
}
