import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const source = read('assets/js/inspirations-petracer.js');
const catalogue = () => JSON.parse(read('assets/data/petracer-catalogue.json'));
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

function harness(product = fixture(), fetchImpl = async () => { throw Error('Unexpected fetch'); }) {
  const dialogs = [], bindings = new Map(), events = [], windowListeners = new Map(), documentListeners = new Map();
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
      click() { return this.dispatch('click'); }, focus() { this.focusCount++; }, scrollTo(){}, closest() { return null; },
      classList:{
        add(value) { classes.add(value); }, remove(value) { classes.delete(value); }, contains(value) { return classes.has(value); },
        toggle(value, force) { const next = force ?? !classes.has(value); if (next) classes.add(value); else classes.delete(value); return next; }
      }
    };
  }
  const trigger = node('trigger');
  const document = {
    activeElement:trigger, querySelector() { return null; },
    body:{style:{overflow:'scroll'}, appendChild(){}},
    addEventListener(type, callback) { documentListeners.set(type, callback); },
    createElement() {
      const nodes = new Map();
      const dialog = {...node(), open:false, innerHTML:'',
        querySelector(selector) { if (!nodes.has(selector)) nodes.set(selector, node(selector)); return nodes.get(selector); },
        querySelectorAll() { return []; }, showModal() { this.open = true; }, close() { this.open = false; }
      };
      dialogs.push(dialog);
      return dialog;
    }
  };
  const window = {
    PETRACER_CATALOGUE:product ? [product] : [],
    addEventListener(type, callback) { if (!windowListeners.has(type)) windowListeners.set(type, []); windowListeners.get(type).push(callback); },
    dispatchEvent(event) { events.push(event); for (const callback of windowListeners.get(event.type) || []) callback(event); },
    LRF_GALLERY_GESTURES:{bind(element, options) { bindings.set(element, options); }}
  };
  const CustomEvent = class { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } };
  vm.runInNewContext(source, {window, document, fetch:fetchImpl, CustomEvent, AbortController, URLSearchParams, setTimeout:() => 1, clearTimeout(){}});
  const bindingFor = selector => [...bindings].find(([element]) => element?.selector === selector)?.[1];
  return {window, document, dialogs, trigger, bindingFor, events, documentListeners, api:window.LRF_PETRACER_SELECTION};
}

test('Petracer tile index keeps unique exact references, official sources and one general catalogue', () => {
  const data = catalogue();
  assert.ok(data.products.length >= 20, 'full tile collection index');
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
