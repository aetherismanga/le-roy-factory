import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkProServiceHealth, PRO_HEALTH_TARGETS} from '../scripts/check-pro-service-health.mjs';

const origin = 'https://leroyfactory.fr';
const target = PRO_HEALTH_TARGETS.find(target => target.name === 'getTariffPdf');
function healthy(method, current = target) {
  const headers = {'Access-Control-Allow-Origin':origin};
  if (method === 'OPTIONS') return new Response(null, {status:204, headers:{...headers, 'Access-Control-Allow-Methods':'POST, OPTIONS', 'Access-Control-Allow-Headers':'Content-Type, Authorization'}});
  return Response.json({success:current.success === true}, {status:current.status, headers});
}

test('all checks use anonymous malformed payloads without creating a valid session', async () => {
  const requests = [];
  const report = await checkProServiceHealth({request:async (url, options) => {
    requests.push({url, ...options});
    const current = PRO_HEALTH_TARGETS.find(target => target.url === url);
    return healthy(options.method, current);
  }});
  assert.equal(report.ok, true);
  assert.equal(requests.length, PRO_HEALTH_TARGETS.length * 2);
  for (const request of requests) {
    assert.equal(request.credentials, 'omit');
    assert.equal(request.headers.Authorization, undefined);
    assert.equal(request.headers.Origin, origin);
    if (request.method === 'POST') {
      const body = JSON.parse(request.body);
      assert.equal(body.codeClient, undefined);
      assert.equal(body.sessionToken, undefined);
    }
  }
});

test('platform 503 is retried, then rejected even if its HTML claims success', async () => {
  const calls = [], pauses = [];
  const report = await checkProServiceHealth({targets:[target], wait:async ms => pauses.push(ms), request:async (_url, options) => {
    calls.push(options.method);
    return options.method === 'OPTIONS' ? new Response('<html>Service not available</html>', {status:503}) : healthy('POST');
  }});
  assert.equal(report.ok, false);
  const failed = report.results.find(row => !row.ok);
  assert.equal(failed.status, 503);
  assert.equal(failed.attempts, 3);
  assert.equal(calls.filter(method => method === 'OPTIONS').length, 3);
  assert.deepEqual(pauses, [2000, 2000]);
});

test('transient network failure and 5xx can recover within three attempts', async () => {
  let count = 0;
  const report = await checkProServiceHealth({targets:[target], wait:async () => {}, request:async (_url, options) => {
    if (options.method === 'POST') return healthy('POST');
    count++;
    if (count === 1) throw Error('connection reset');
    if (count === 2) return new Response(null, {status:500});
    return healthy('OPTIONS');
  }});
  assert.equal(report.ok, true);
  assert.equal(report.results[0].attempts, 3);
});

test('CORS failure is detected on an otherwise healthy 204 and not retried', async () => {
  let count = 0;
  const report = await checkProServiceHealth({targets:[target], request:async (_url, options) => {
    count++;
    return options.method === 'OPTIONS' ? new Response(null, {status:204}) : healthy('POST');
  }});
  assert.equal(count, 2);
  assert.equal(report.ok, false);
  assert.match(report.results[0].error, /Access-Control-Allow-Origin/);
});

test('anonymous requests must receive JSON refusal and no client or bearer token', async () => {
  for (const response of [
    new Response('<html>Sign in</html>', {status:403, headers:{'Access-Control-Allow-Origin':origin, 'Content-Type':'text/html'}}),
    Response.json({success:true}, {status:403, headers:{'Access-Control-Allow-Origin':origin}}),
    Response.json({success:false, sessionToken:'unexpected-secret'}, {status:403, headers:{'Access-Control-Allow-Origin':origin}})
  ]) {
    const report = await checkProServiceHealth({targets:[target], request:async (_url, options) => options.method === 'OPTIONS' ? healthy('OPTIONS') : response});
    assert.equal(report.ok, false);
    assert.equal(report.results[1].attempts, 1);
  }
});

test('Authorization preflight permission is required for administrator PDF requests', async () => {
  const report = await checkProServiceHealth({targets:[target], request:async (_url, options) => {
    if (options.method === 'POST') return healthy('POST');
    return new Response(null, {status:204, headers:{'Access-Control-Allow-Origin':origin, 'Access-Control-Allow-Methods':'POST', 'Access-Control-Allow-Headers':'Content-Type'}});
  }});
  assert.equal(report.ok, false);
  assert.match(report.results[0].error, /headers not allowed/);
});
