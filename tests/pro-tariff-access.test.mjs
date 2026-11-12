import test from 'node:test';
import assert from 'node:assert/strict';
import {localServices} from './fixtures/pro-client-session.mjs';

const credentials = {codeClient:'LRF-99998', departement:'34'};
const routes = [
  ['getTariffPdf', {tariffId:'elios-2026'}, 'ELIOS CERAMICA'],
  ['getNeobathDnaTariff', {}, 'NEOBATH']
];

for (const [route, extra, partner] of routes) {
  const read = (services, overrides={}) => services.call(services.tariffs[route], {...credentials, ...extra, ...overrides});
  test(route+': current partner permission permits the unchanged private document', async () => {
    const services=localServices([partner]);
    const response=await read(services);
    assert.equal(response.statusCode,200);
    assert.equal(services.streamed.length,1);
    assert.match(response.headers['Cache-Control'],/private, no-store/);
  });
  test(route+': disabled accounts are refused immediately, even after a valid login', async () => {
    const services=localServices([partner]);
    assert.equal((await services.login()).statusCode,200);
    const token=(await services.login()).body.sessionToken;
    services.records.get('clients').get('local-client').proAccessDisabled=true;
    assert.equal((await read(services)).statusCode,403);
    assert.equal((await services.call(services.sessions.validateProSession,{sessionToken:token})).statusCode,401);
    assert.equal((await services.login()).statusCode,403);
    assert.equal(services.streamed.length,0);
  });
  test(route+': blocked codes, wrong departments and missing permissions never stream a tariff', async () => {
    const blocked=localServices([partner]);
    blocked.records.get('clients').get('local-client').codeClient='LRF-00001';
    assert.equal((await read(blocked,{codeClient:'LRF-00001'})).statusCode,403);
    assert.equal((await blocked.login({codeClient:'LRF-00001',departement:'34'})).statusCode,403);
    assert.equal(blocked.streamed.length,0);
    const wrongDepartment=localServices([partner]);
    assert.equal((await read(wrongDepartment,{departement:'13'})).statusCode,403);
    assert.equal(wrongDepartment.streamed.length,0);
    const missingPermission=localServices([]);
    assert.equal((await read(missingPermission)).statusCode,403);
    assert.equal(missingPermission.streamed.length,0);
  });
  test(route+': permissions are re-read for every request', async () => {
    const services=localServices([partner]);
    assert.equal((await read(services)).statusCode,200);
    services.setPartners([]);
    assert.equal((await read(services)).statusCode,403);
    assert.equal(services.streamed.length,1);
  });
}
