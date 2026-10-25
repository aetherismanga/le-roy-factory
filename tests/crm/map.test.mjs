import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const source = await readFile(new URL('../../assets/js/carte-core.js', import.meta.url), 'utf8');
const core = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const { mapClient, mapDepartment, mapPopup, matchesMapFilter, mapCoordinate } = core;

test('map keeps the Firestore identifier and excludes both archive flags', () => {
  assert.equal(mapClient('actual-id', { id: 'legacy-id', codeClient: 'LRF-00012' }).id, 'actual-id');
  assert.equal(mapClient('a', { archived: true }), null);
  assert.equal(mapClient('b', { archive: true }), null);
  assert.equal(mapClient('a', {}).type, 'client');
});
test('map handles postal inversion, numeric postal codes, Corsica and Monaco', () => {
  assert.equal(mapClient('a', { codePostal: 'Nice', ville: '06000' }).cp, '06000');
  assert.equal(mapClient('a', { codePostal: 6000, ville: 'Nice' }).dept, '06');
  assert.equal(mapDepartment('20190'), '2A');
  assert.equal(mapDepartment('20200'), '2B');
  assert.equal(mapDepartment('', 'Monaco'), '98');
  assert.equal(mapDepartment('97100'), '971');
  assert.equal(mapDepartment('20000', '', '2B'), '2B');
});
test('coordinates accept legacy aliases but reject empty, nonnumeric and invalid values', () => {
  assert.deepEqual([mapClient('a', { latitude: '43.6', longitude: '4.5' }).lat, mapClient('a', { latitude: '43.6', longitude: '4.5' }).lon], [43.6, 4.5]);
  for (const value of [null, undefined, '', '  ', true, Infinity, 'abc', 91]) assert.equal(mapCoordinate(value, 90), null);
  assert.equal(mapCoordinate(0, 90), 0);
});
test('map popup escapes untrusted data and preserves encoded links to the exact client', () => {
  const popup = mapPopup(mapClient('client & "id', { societe: '<img src=x onerror=alert(1)>', adresse: '<script>', telephone: '"><img src=x>', lat: 43, lon: 4 }));
  assert.ok(!popup.includes('<img'));
  assert.ok(!popup.includes('<script>'));
  assert.ok(popup.includes('&lt;img'));
  assert.ok(popup.includes('clients.html?edit=client%20%26%20%22id'));
  assert.ok(!popup.includes('href="tel:'));
});
test('map filters match both sectors and the selected department', () => {
  const nice = mapClient('a', { codePostal: '06000' });
  assert.equal(matchesMapFilter(nice, 'coryne'), true);
  assert.equal(matchesMapFilter(nice, 'jerome'), false);
  assert.equal(matchesMapFilter(nice, 'dept', '06'), true);
  assert.equal(matchesMapFilter(nice, 'dept', '34'), false);
  assert.equal(matchesMapFilter(nice, 'dept', ''), true);
});

function element(id, filter) {
  const listeners = new Map(), classes = new Set(filter === 'all' ? ['active'] : []);
  return { id, value: '', textContent: '', disabled: false, hidden: false,
    classList: { add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x), toggle: x => { if(classes.has(x))classes.delete(x);else classes.add(x); } },
    getAttribute: name => name === 'data-filter' ? filter : null,
    addEventListener: (event, callback) => listeners.set(event, callback),
    fire: (event, extra = {}) => listeners.get(event)?.({ target: null, currentTarget: null, ...extra }),
  };
}
async function boot() {
  const html = await readFile(new URL('../../carte.html', import.meta.url), 'utf8');
  const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/^\s*import .*;\s*$/gm, '');
  const elements = new Map(), filters = ['all', 'jerome', 'coryne'].map(f => element(f, f));
  const docCallbacks = {}, winCallbacks = {};
  let snapshot, unsubscribeCount = 0, created = 0, rebound = 0, fetched = 0;
  const visible = new Set();
  const map = { setView(){return this}, fitBounds(){}, invalidateSize(){} };
  const layer = { addTo(){return this}, hasLayer: m => visible.has(m), addLayer: m => visible.add(m), removeLayer: m => visible.delete(m) };
  const L = {
    map: () => map, tileLayer: () => ({ addTo(){} }), layerGroup: () => layer, divIcon: options => options,
    marker: (coords, options) => { created++; return { coords, options, setLatLng(v){this.coords=v;return this},setIcon(v){this.options.icon=v;return this},bindPopup(v){this.popup=v;rebound++;return this} } },
    latLngBounds: points => points,
  };
  const document = {
    addEventListener: (name, callback) => { docCallbacks[name] = callback },
    getElementById: id => { if(!elements.has(id))elements.set(id, element(id));return elements.get(id) },
    querySelectorAll: () => filters,
    querySelector: () => filters[0],
  };
  const window = { location: {}, addEventListener: (name, callback) => { winCallbacks[name] = callback }, dispatchEvent: event => winCallbacks[event.type]?.(event) };
  vm.runInNewContext(script, { ...core, db: {}, collection: () => ({}), onSnapshot: (_, callback) => { snapshot = callback; return () => unsubscribeCount++ }, waitForAgent: async () => ({}),
    document, window, L, localStorage: { getItem: () => 'Test Agent' }, setInterval(){}, setTimeout, clearTimeout, requestAnimationFrame: callback => callback(), CustomEvent: class { constructor(type, opts){this.type=type;this.detail=opts?.detail} },
    Date, Map, Set, Number, String, console, AbortController, fetch: () => { fetched++;throw new Error('Unexpected network') },
  });
  await docCallbacks.DOMContentLoaded();
  return {
    snapshot: rows => snapshot({forEach: callback => rows.forEach(([id,data]) => callback({id,data:()=>data}))}), visible, elements, filters,
    typeFilter: detail => winCallbacks['lrf-map-types-changed']({detail}),
    close: () => winCallbacks.pagehide(),
    counts: () => ({created,rebound,fetched,unsubscribeCount}),
  };
}
const fixture = [
  ['nice', { societe: 'Fixture Nice', type: 'client', codePostal: '06000', latitude: 43.7, longitude: 7.2 }],
  ['montpellier', { societe: 'Fixture Montpellier', type: 'prospect', codePostal: '34000', lat: 43.6, lon: 3.8 }],
  ['archived', { societe: 'Fixture archived', archived: true, lat: 43.1, lon: 4.1 }],
  ['missing', { societe: 'Fixture no coordinates', codePostal: '13000' }],
];
test('map snapshot displays active valid markers without network calls or production writes', async () => {
  const h = await boot(); h.snapshot(fixture);
  assert.equal(h.visible.size, 2);
  assert.equal(h.elements.get('map-counter').textContent, '2 entreprise(s) sur la carte · 1 sans coordonnées');
  assert.equal(h.counts().fetched, 0);
  assert.equal(h.elements.get('map-location-help').hidden, false);
  h.close(); assert.equal(h.counts().unsubscribeCount, 1);
});
test('unchanged snapshots reuse all markers; one changed record updates only one popup', async () => {
  const h = await boot(); h.snapshot(fixture); h.snapshot(fixture);
  assert.deepEqual(h.counts(), {created:2,rebound:2,fetched:0,unsubscribeCount:0});
  h.snapshot(fixture.map(([id,data]) => [id, id === 'nice' ? {...data,societe:'Updated Fixture Nice'} : data]));
  assert.equal(h.counts().created, 2);
  assert.equal(h.counts().rebound, 3);
  assert.ok([...h.visible].some(m => m.popup.includes('Updated Fixture Nice')));
});
test('sector, department clearing and client visibility update actual layers and counters', async () => {
  const h = await boot(); h.snapshot(fixture);
  h.filters[1].fire('click', {currentTarget:h.filters[1]});
  assert.equal(h.visible.size, 1);
  assert.equal([...h.visible][0].__lrfClientId, 'montpellier');
  const dep = h.elements.get('dept-select'); dep.value='06';dep.fire('change',{target:dep});
  assert.equal([...h.visible][0].__lrfClientId, 'nice');
  dep.value='';dep.fire('change',{target:dep});
  assert.equal(h.visible.size, 2);
  assert.equal(h.filters[0].classList.contains('active'), true);
  h.typeFilter({clients:false,prospects:true});
  assert.equal(h.visible.size, 1);
  assert.equal([...h.visible][0].__lrfClientId, 'montpellier');
});
test('archiving a visible record removes its existing marker from the map', async () => {
  const h = await boot();h.snapshot(fixture);
  h.snapshot(fixture.map(([id,data]) => [id,id==='nice'?{...data,archived:true}:data]));
  assert.equal(h.visible.size,1);
  assert.equal([...h.visible][0].__lrfClientId,'montpellier');
});
test('large unchanged portfolios retain markers across repeated snapshots', async () => {
  const h=await boot(), rows=Array.from({length:1000},(_,i)=>['fixture-'+i,{societe:'Fixture '+i,codePostal:'34000',lat:43.5+(i%10)*.01,lon:3.7+(i%10)*.01}]);
  for(let i=0;i<10;i++)h.snapshot(rows);
  assert.equal(h.counts().created,1000);
  assert.equal(h.counts().rebound,1000);
  assert.equal(h.visible.size,1000);
});

