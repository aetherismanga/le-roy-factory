import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const source = read('assets/js/inspirations-petracer.js');
const catalogue = () => JSON.parse(read('assets/data/petracer-catalogue.json'));
const bathCatalogue = () => JSON.parse(read('assets/data/petracer-bain-catalogue.json'));
const bathFixture = (slug, navCategory, productType) => ({...fixture(), id:'petracer-bain-' + slug, slug, name:'Bain ' + slug, family:'Collection ' + slug, navCategory, productType, unit:'pièces', formats:['100 × 50 × 85 cm'], catalogueUrl:'https://petracer.it/bath.pdf#page=20', cataloguePage:20, technicalUrl:'https://petracer.it/bath.pdf#page=180'});
const local = path => existsSync(new URL(String(path).replace(/^\//, ''), root));
const fixture = () => ({
  id:'petracer-example', slug:'example', name:'Test <décor>', description:'A documented collection', family:'Élégance classique',
  colors:['Bianco', 'Nero'], formats:['20 × 20 cm'], finishes:['Brillant'],
  details:['Le format dépend de la référence choisie.'],
  catalogueUrl:'https://petracer.it/current.pdf#page=12', cataloguePage:12,
  sourceUrl:'https://petracer.it/ceramiche-di-lusso/example/',
  images:[
    {url:'/assets/first.webp', thumb:'/assets/first-thumb.webp', hd:'/assets/first-hd.webp', label:'First'},
    {url:'/assets/second.webp', thumb:'/assets/second-thumb.webp', hd:'/assets/second-hd.webp', label:'Second'}
  ]
});

function harness(product = fixture(), fetchImpl = async () => { throw Error('Unexpected fetch'); }, options = {}) {
  const dialogs = [], elements = [], bindings = new Map(), events = [], windowListeners = new Map(), documentListeners = new Map();
  function node(selector = '') {
    const listeners = new Map(), classes = new Set(), attributes = new Map();
    return {
      selector, style:{}, dataset:{}, value:'', textContent:'', src:'', alt:'', isConnected:true, hidden:false, focusCount:0,
      setAttribute(key, value) { attributes.set(key, value); }, getAttribute(key) { return attributes.get(key); },
      addEventListener(type, callback) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(callback); },
      dispatch(type, extra = {}) {
        const event = {target:this, currentTarget:this, preventDefault(){this.prevented = true;}, stopPropagation(){}, ...extra};
        this['on' + type]?.(event);
        for (const callback of listeners.get(type) || []) callback(event);
        return event;
      },
      click() { return this.dispatch('click'); }, focus() { this.focusCount++; }, scrollTo(){}, scrollIntoView(){}, before(){}, closest() { return null; },
      classList:{
        add(value) { classes.add(value); }, remove(value) { classes.delete(value); }, contains(value) { return classes.has(value); },
        toggle(value, force) { const next = force ?? !classes.has(value); if (next) classes.add(value); else classes.delete(value); return next; }
      }
    };
  }
  const trigger = node('trigger'), globalNodes = new Map();
  if (options.workspace) {
    for (const selector of ['#workspace-title','#partner-workspace','#v2-filters','#workspace-sub','#v2-search','#workspace-pro-badge','#workspace-pro-link','#partner-count','#partner-products']) globalNodes.set(selector,node(selector));
    globalNodes.get('#workspace-title').textContent = "Petracer's";
    globalNodes.get('#partner-count').parentElement = {querySelector:() => node('hint')};
  }
  const document = {
    activeElement:trigger, querySelector(selector) { return globalNodes.get(selector) || null; },
    body:{style:{overflow:'scroll'}, appendChild(){}},
    addEventListener(type, callback) { documentListeners.set(type, callback); },
    createElement(tagName) {
      const nodes = new Map();
      const dialog = {...node(), open:false, innerHTML:'',
        querySelector(selector) { if (!nodes.has(selector)) nodes.set(selector, node(selector)); return nodes.get(selector); },
        querySelectorAll(selector) { return selector === '.pcr-choice input,.pcr-choice select' ? ['color','format','quantity','details'].map(key => this.querySelector('#pcr-choice-' + key)) : []; }, showModal() { this.open = true; }, close() { this.open = false; }
      };
      elements.push(dialog);
      if (tagName === 'dialog') dialogs.push(dialog);
      return dialog;
    }
  };
  const window = {
    PETRACER_CATALOGUE:product ? [product] : [],
    PETRACER_BATH_CATALOGUE:options.bath || [],
    matchMedia:() => ({matches:false}),
    addEventListener(type, callback) { if (!windowListeners.has(type)) windowListeners.set(type, []); windowListeners.get(type).push(callback); },
    dispatchEvent(event) { events.push(event); for (const callback of windowListeners.get(event.type) || []) callback(event); },
    LRF_GALLERY_GESTURES:{bind(element, options) { bindings.set(element, options); }}
  };
  const CustomEvent = class { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } };
  vm.runInNewContext(source, {window, document, fetch:fetchImpl, CustomEvent, AbortController, URLSearchParams, setTimeout:() => 1, clearTimeout(){}});
  const bindingFor = selector => [...bindings].find(([element]) => element?.selector === selector)?.[1];
  return {window, document, dialogs, elements, globalNodes, trigger, bindingFor, events, documentListeners, api:window.LRF_PETRACER_SELECTION};
}

test('Petracer tile index keeps unique exact references, official sources and one general catalogue', () => {
  const data = catalogue();
  assert.equal(data.products.length, 21, 'existing tile collection index is preserved');
  for (const key of ['id', 'slug']) assert.equal(new Set(data.products.map(product => product[key])).size, data.products.length, key);
  assert.equal(data.catalogues.length, 1);
  assert.match(data.catalogues[0].url, /^https:\/\/petracer\.it\//);
  for (const product of data.products) {
    assert.ok(product.name && product.description && product.family, product.slug);
    assert.match(product.sourceUrl, /^https:\/\/petracer\.it\/ceramiche-di-lusso\//);
    assert.equal(product.category, 'carrelage-exception');
    assert.doesNotMatch(product.productType || '', /furniture|sanitary/);
    assert.ok(product.cataloguePage > 0, product.slug + ' exact catalogue page');
    assert.ok(product.formats.length, product.slug + ' documented formats');
  }
  const forbidden = ['romantica', 'posterum', 'grand-jete', 'opera-prima', 'fantasma', 'primo-attore', 'michelangelo', 'vasca-elegance'];
  for (const slug of forbidden) assert.ok(!data.products.some(product => product.slug === slug), slug + ' furniture excluded');
});

test('every tile collection has attributed local images, thumbnails and full screen originals', () => {
  const urls = new Set();
  for (const product of catalogue().products) {
    assert.ok(product.images?.length > 0, product.slug + ' gallery');
    for (const image of product.images) {
      assert.ok(local(image.url), image.url);
      assert.ok(local(image.thumb), image.thumb);
      if (image.hd) assert.ok(local(image.hd), image.hd);
      assert.ok(image.label, product.slug + ' image label');
      assert.match(image.source || image.originalUrl || '', /^https:\/\/(?:www\.)?petracer\.it\//);
      urls.add(image.url);
    }
  }
  assert.ok(urls.size > catalogue().products.length, 'collection galleries include multiple exact images');
});

test('public catalogue contains no professional rates or purchase fields', () => {
  const walk = value => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      assert.doesNotMatch(key, /^(price|proPrice|purchasePrice|prixAchat|purchaseHT|tarifHT|netPrice|discount)$/i);
      walk(child);
    }
  };
  walk(catalogue());
});

test('cards escape supplier text and details keep documented choices without preselecting variants', () => {
  const h = harness(), product = h.api.normaliseProducts()[0], cards = h.api.renderCards([product]);
  assert.match(cards, /Test &lt;décor&gt;/);
  assert.doesNotMatch(cards, /Test <décor>/);
  assert.ok(product.keywords.includes('20 x 20 cm'));
  assert.ok(h.api.matches(product));
  assert.match(h.api.renderCards([]), /Réinitialiser les filtres/);
  assert.equal(h.api.openCollection(product.id), true);
  const detail = h.dialogs[0].innerHTML;
  assert.equal((detail.match(/Voir dans le catalogue/g) || []).length, 1);
  assert.match(detail, /#page=12/);
  assert.match(detail, /Le format dépend de la référence choisie/);
  assert.doesNotMatch(detail, /selected=|checked=|Tarif PRO accessible|€|obsolete\.pdf/);
  const email = h.dialogs[0].querySelector('#pcr-request-link').href;
  assert.match(email, /^mailto:jerome@leroyfactory\.fr,coryne@leroyfactory\.fr\?/);
  assert.ok(decodeURIComponent(email).includes('partner=petracers&collection=example'));
});

test('main and full screen swipes stay synchronized, arrows work and zoom disables photo changing drag', () => {
  const h = harness();
  h.api.openCollection('example');
  const dialog = h.dialogs[0], gallery = h.bindingFor('.pcr-main-photo');
  assert.equal(h.document.body.style.overflow, 'hidden');
  assert.equal(gallery.isEnabled(), true);
  gallery.onSwipe(1);
  assert.equal(dialog.querySelector('#pcr-main-image').src, '/assets/second.webp');
  assert.equal(dialog.querySelector('#pcr-image-count').textContent, '2 / 2');
  dialog.querySelector('[data-pcr-main-next]').click();
  assert.equal(dialog.querySelector('#pcr-image-count').textContent, '1 / 2');
  dialog.querySelector('.pcr-main-photo').click();
  const lightbox = h.dialogs[1], fullscreen = h.bindingFor('.pcr-lightbox-stage');
  assert.equal(lightbox.open, true);
  assert.equal(lightbox.querySelector('.pcr-lightbox-stage img').src, '/assets/first-hd.webp');
  assert.equal(fullscreen.isEnabled(), true);
  fullscreen.onSwipe(-1);
  assert.equal(dialog.querySelector('#pcr-main-image').src, '/assets/second.webp');
  assert.equal(lightbox.querySelector('.pcr-lightbox-stage img').src, '/assets/second-hd.webp');
  lightbox.querySelector('[data-pcr-next]').click();
  assert.equal(dialog.querySelector('#pcr-image-count').textContent, '1 / 2');
  lightbox.querySelector('[data-pcr-zoom]').click();
  assert.equal(fullscreen.isEnabled(), false);
  lightbox.querySelector('[data-pcr-zoom]').click();
  assert.equal(fullscreen.isEnabled(), true);
  lightbox.dispatch('keydown', {key:'ArrowRight'});
  assert.equal(dialog.querySelector('#pcr-image-count').textContent, '2 / 2');
  lightbox.dispatch('cancel');
  assert.equal(lightbox.open, false);
  assert.equal(dialog.open, true);
  assert.equal(fullscreen.isEnabled(), false);
  assert.equal(h.document.body.style.overflow, 'hidden');
  assert.ok(dialog.querySelector('.pcr-main-photo').focusCount > 0);
  dialog.dispatch('cancel');
  assert.equal(dialog.open, false);
  assert.equal(gallery.isEnabled(), false);
  assert.equal(h.document.body.style.overflow, 'scroll');
  assert.equal(h.trigger.focusCount, 1);
});

test('loader reports failure and retry recovers without duplicate concurrent requests', async () => {
  let calls = 0;
  const h = harness(null, async () => {
    calls++;
    if (calls === 1) return {ok:false};
    return {ok:true, json:async () => ({products:[fixture()], catalogues:[{label:'Catalogue', url:'https://petracer.it/current.pdf'}]})};
  });
  await assert.rejects(h.window.LRF_PETRACER_LOAD());
  assert.match(h.api.renderCards([]), /data-pcr-retry/);
  assert.equal(h.events.at(-1).type, 'lrf-petracer-data-error');
  h.documentListeners.get('click')({target:{closest:selector => selector === '[data-pcr-retry]' ? {} : null}});
  await h.window.LRF_PETRACER_LOAD();
  assert.equal(calls, 2);
  assert.equal(h.window.PETRACER_CATALOGUE.length, 1);
  assert.ok(h.events.some(event => event.type === 'lrf-petracer-data-ready'));
  assert.match(h.api.renderCards(h.api.normaliseProducts()), /pcr-card-button/);
});

test('desktop and iOS pages load the dedicated presentation before the shared selection controller', () => {
  for (const page of ['univers.html', 'univers-ios.html']) {
    const html = read(page);
    assert.match(html, /inspirations-petracer\.css/);
    assert.ok(html.indexOf('inspirations-petracer.js') >= 0);
    assert.ok(html.indexOf('inspirations-petracer.js') < html.indexOf('inspirations-v2.js'));
  }
  assert.match(read('assets/js/inspirations-v2.js'), /LRF_PETRACER_SELECTION/);
  assert.match(read('assets/js/inspirations-v2.js'), /lrf-petracer-data-ready/);
});

test('Petracer bath modes show only the documented product category and preserve the tile dataset', () => {
  const bath = [
    bathFixture('console', 'meubles', 'furniture'),
    bathFixture('baignoire', 'sanitaire', 'sanitary'),
    bathFixture('mitigeur', 'robinetterie', 'tapware'),
    bathFixture('miroir', 'robinetterie', 'mirror'),
    bathFixture('accessoire', 'robinetterie', 'accessory')
  ];
  const h = harness(fixture(), undefined, {bath});
  assert.equal(h.api.normaliseProducts().map(product => product.id).join(','), 'petracer-example');
  assert.equal(h.api.normaliseProducts('meubles').map(product => product.id).join(','), 'petracer-bain-console');
  assert.equal(h.api.normaliseProducts().map(product => product.id).join(','), 'petracer-example', 'inspecting a category does not switch active mode');
  for (const category of ['meubles', 'sanitaire', 'robinetterie']) {
    h.api.setCategory(category);
    const expected = bath.filter(product => product.navCategory === category);
    assert.equal(h.api.normaliseProducts().map(product => product.id).join(','), expected.map(product => product.id).join(','));
    for (const product of expected) assert.equal(h.api.matches(product), true);
    assert.equal(h.api.openCollection('example'), false, 'tile IDs cannot open from a bath category');
    const foreign = bath.find(product => product.navCategory !== category);
    assert.equal(h.api.openCollection(foreign.id), false, 'other bath categories cannot leak into this mode');
  }
  h.api.setCategory('exception');
  assert.equal(h.api.normaliseProducts()[0].id, 'petracer-example');
  assert.equal(h.window.PETRACER_CATALOGUE.length, 1);
  assert.equal(h.window.PETRACER_BATH_CATALOGUE.length, 5);
});

test('category switches close an active collection and reset its family filter', () => {
  const bath = [bathFixture('console', 'meubles', 'furniture'), bathFixture('meuble', 'meubles', 'furniture'), bathFixture('vasque', 'sanitaire', 'sanitary')];
  const h = harness(fixture(), undefined, {bath, workspace:true});
  h.api.setCategory('meubles');
  h.api.refreshChrome();
  const guide = h.elements.find(element => element.id === 'pcr-guide');
  assert.ok(guide, 'bath workspace guide exists');
  guide.dispatch('click', {target:{closest:selector => selector === '[data-pcr-group]' ? {dataset:{pcrGroup:bath[0].family}} : null}});
  assert.equal(h.api.matches(bath[0]), true);
  assert.equal(h.api.matches(bath[1]), false, 'chosen family actually filters this mode');
  assert.equal(h.api.openCollection(bath[0].id), true);
  assert.equal(h.document.body.style.overflow, 'hidden');
  h.api.setCategory('sanitaire');
  assert.equal(h.dialogs[0].open, false);
  assert.equal(h.document.body.style.overflow, 'scroll');
  assert.equal(h.api.matches(bath[2]), true, 'old furniture family cannot empty the sanitary category');
  h.api.setCategory('meubles');
  assert.equal(h.api.matches(bath[1]), true, 'returning to furniture starts with all its families');
});

test('bath workspace copy, lexicon and documentation follow its active category', () => {
  const bath = [bathFixture('console', 'meubles', 'furniture'), bathFixture('vasque', 'sanitaire', 'sanitary'), bathFixture('mitigeur', 'robinetterie', 'tapware')];
  const h = harness(fixture(), undefined, {bath, workspace:true});
  h.window.PETRACER_CATALOGUES = [{label:'Catalogue carrelage', url:'https://petracer.it/tiles.pdf'}];
  h.window.PETRACER_BATH_CATALOGUES = [{label:'Catalogue Originali Interni Italiani', url:'https://petracer.it/bath.pdf'}];
  for (const category of ['meubles', 'sanitaire', 'robinetterie']) {
    h.api.refreshChrome(category);
    const guide = h.elements.find(element => element.id === 'pcr-guide');
    assert.equal(guide.dataset.category, category);
    assert.doesNotMatch(guide.getAttribute('aria-label'), /carrelage/i);
    assert.doesNotMatch(guide.querySelector('[data-pcr-intro-eyebrow]').textContent, /CARRELAGE/);
    assert.doesNotMatch(h.globalNodes.get('#workspace-sub').textContent, /Sols|revêtements|carrelage/i);
    assert.match(guide.querySelector('#pcr-catalogue-links').innerHTML, /bath\.pdf/);
    assert.doesNotMatch(guide.querySelector('#pcr-catalogue-links').innerHTML, /tiles\.pdf/);
    assert.match(guide.querySelector('#pcr-jump').innerHTML, new RegExp(bath.find(product => product.navCategory === category).id));
    assert.doesNotMatch(guide.querySelector('#pcr-jump').innerHTML, /petracer-example/);
  }
  h.api.refreshChrome('exception');
  const guide = h.elements.find(element => element.id === 'pcr-guide');
  assert.match(guide.querySelector('[data-pcr-intro-eyebrow]').textContent, /CARRELAGE/);
  assert.match(guide.querySelector('#pcr-catalogue-links').innerHTML, /tiles\.pdf/);
  assert.doesNotMatch(guide.querySelector('#pcr-catalogue-links').innerHTML, /bath\.pdf/);
});

test('bath details use integer quantities, correct category deep links and distinct technical pages', () => {
  for (const [category, type] of [['meubles', 'furniture'], ['sanitaire', 'sanitary'], ['robinetterie', 'tapware']]) {
    const product = bathFixture('example-' + category, category, type);
    const h = harness(fixture(), undefined, {bath:[product]});
    h.api.setCategory(category);
    assert.equal(h.api.openCollection(product.id), true);
    const dialog = h.dialogs[0];
    assert.doesNotMatch(dialog.innerHTML, /Surface souhaitée \(m²\)|min="0\.01"|step="0\.01"|CARRELAGE D’EXCEPTION/);
    assert.match(dialog.innerHTML, /min="1"/);
    assert.match(dialog.innerHTML, /step="1"/);
    assert.match(dialog.innerHTML, /Détails techniques/);
    assert.match(dialog.innerHTML, /#page=180/);
    dialog.querySelector('#pcr-choice-quantity').value = '2';
    dialog.querySelector('#pcr-choice-quantity').dispatch('input');
    const email = decodeURIComponent(dialog.querySelector('#pcr-request-link').href);
    assert.ok(email.includes('category=' + category), 'deep link retains bath category');
    assert.ok(email.includes('collection=' + product.slug), 'deep link retains exact reference');
    assert.match(email, /Quantité souhaitée \(pièces\) : 2/);
    assert.doesNotMatch(email, /Surface souhaitée \(m²\)/);
  }
});

test('late tile and bath loads remain independent when the visible category changes', async () => {
  const pending = new Map(), calls = [];
  const bath = [bathFixture('console', 'meubles', 'furniture'), bathFixture('vasque', 'sanitaire', 'sanitary')];
  const h = harness(null, url => {
    const key = url.includes('petracer-bain-catalogue.json') ? 'bath' : 'tile';
    calls.push(key);
    return new Promise(resolve => pending.set(key, resolve));
  });
  const tilePromise = h.window.LRF_PETRACER_LOAD('exception');
  h.api.setCategory('meubles');
  const furniturePromise = h.window.LRF_PETRACER_LOAD('meubles');
  const sanitaryPromise = h.window.LRF_PETRACER_LOAD('sanitaire');
  assert.equal(calls.join(','), 'tile,bath', 'bath categories share one request while tiles remain independent');
  pending.get('tile')({ok:true, json:async () => ({products:[fixture()], catalogues:[]})});
  await tilePromise;
  assert.equal(h.api.normaliseProducts().length, 0, 'late tile response does not become furniture');
  pending.get('bath')({ok:true, json:async () => ({products:bath, catalogues:[]})});
  assert.equal((await furniturePromise).map(product => product.id).join(','), 'petracer-bain-console');
  assert.equal((await sanitaryPromise).map(product => product.id).join(','), 'petracer-bain-vasque');
  assert.equal(h.api.normaliseProducts().map(product => product.id).join(','), 'petracer-bain-console', 'requesting sanitary data does not change the selected furniture mode');
  assert.ok(h.events.filter(event => event.type === 'lrf-petracer-data-ready').every(event => event.detail?.category), 'completion events identify the requested category');
  h.api.setCategory('exception');
  assert.equal(h.api.normaliseProducts()[0].id, 'petracer-example');
});

test('a bath loading failure does not replace ready tiles and retry only requests bath data', async () => {
  const calls = [];
  const product = bathFixture('console', 'meubles', 'furniture');
  const h = harness(fixture(), async url => {
    calls.push(url);
    return calls.length === 1 ? {ok:false} : {ok:true, json:async () => ({products:[product], catalogues:[]})};
  });
  h.api.setCategory('meubles');
  await assert.rejects(h.window.LRF_PETRACER_LOAD('meubles'));
  assert.match(h.api.renderCards([]), /data-pcr-retry/);
  h.api.setCategory('exception');
  assert.match(h.api.renderCards(h.api.normaliseProducts()), /pcr-card-button/);
  assert.doesNotMatch(h.api.renderCards(h.api.normaliseProducts()), /data-pcr-retry/);
  h.api.setCategory('meubles');
  h.documentListeners.get('click')({target:{closest:selector => selector === '[data-pcr-retry]' ? {} : null}});
  await h.window.LRF_PETRACER_LOAD('meubles');
  assert.equal(calls.length, 2);
  assert.ok(calls.every(url => url.includes('petracer-bain-catalogue.json')));
  assert.equal(h.api.normaliseProducts()[0].id, product.id);
  assert.equal(h.window.PETRACER_CATALOGUE[0].id, 'petracer-example');
});

test('bath catalogue assigns documented references to one category, with attributed media and no rates', () => {
  const data = bathCatalogue();
  assert.ok(data.products.length > 0);
  for (const key of ['id', 'slug']) assert.equal(new Set(data.products.map(product => product[key])).size, data.products.length, key);
  for (const category of ['meubles', 'sanitaire', 'robinetterie']) assert.ok(data.products.some(product => product.navCategory === category), category + ' is populated');
  const categories = {furniture:'meubles', sanitary:'sanitaire', tapware:'robinetterie', mirror:'robinetterie', accessory:'robinetterie'};
  for (const product of data.products) {
    assert.equal(product.navCategory, categories[product.productType], product.slug + ' correct family placement');
    assert.equal(product.unit, 'pièces');
    assert.ok(product.id.startsWith('petracer-bain-'));
    assert.ok(product.name && product.description && product.family && product.cataloguePage > 0);
    assert.match(product.sourceUrl, /^https:\/\/(?:www\.)?petracer\.it\//);
    assert.ok(product.images?.length, product.slug + ' gallery');
    for (const image of product.images) {
      assert.ok(local(image.url), image.url);
      assert.ok(local(image.thumb), image.thumb);
      if (image.hd) assert.ok(local(image.hd), image.hd);
      assert.ok(image.label);
      assert.match(image.source || image.originalUrl || '', /^https:\/\/(?:www\.)?petracer\.it\//);
    }
  }
  const walk = value => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      assert.doesNotMatch(key, /^(price|proPrice|purchasePrice|prixAchat|purchaseHT|tarifHT|netPrice|discount)$/i);
      walk(child);
    }
  };
  walk(data);
});
