import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../assets/js/global-search-router.js', import.meta.url), 'utf8');
const turn = () => new Promise(resolve => setImmediate(resolve));

function homeFixture() {
  const nodes = new Map(), scripts = [], requested = [], documentEvents = new Map();
  let button, opened = 0;
  const node = () => {
    const handlers = new Map(), attributes = new Map();
    return {
      innerHTML: '',
      setAttribute(name, value) { attributes.set(name, value); },
      removeAttribute(name) { attributes.delete(name); },
      addEventListener(name, fn) { if (!handlers.has(name)) handlers.set(name, new Set()); handlers.get(name).add(fn); },
      removeEventListener(name, fn) { handlers.get(name)?.delete(fn); },
      click() { if (!this.disabled) for (const fn of [...(handlers.get('click') || [])]) fn(); },
      remove() { nodes.delete(this.id); const index = scripts.indexOf(this); if (index >= 0) scripts.splice(index, 1); },
      handlers
    };
  };
  const head = {appendChild(element) {
    nodes.set(element.id, element);
    if (element.src) { scripts.push(element); requested.push(element); }
  }};
  const old = {getAttribute: () => 'partenaires.html', className: 'hero-btn', replaceWith(element) { button = element; nodes.set(element.id, element); }};
  const document = {
    readyState: 'complete', scripts, head, documentElement: head,
    querySelectorAll: () => [old], getElementById: id => nodes.get(id),
    createElement: node, addEventListener: (name, fn) => documentEvents.set(name, fn)
  };
  vm.runInNewContext(source, {window: {}, document, location: {pathname: '/index.html'}, console});
  return {
    requested, get button() { return button; }, get opened() { return opened; },
    loaded(script) {
      if (script.src.includes('site-search-v2.js')) {
        nodes.set('lrf-search-overlay', {});
        button.addEventListener('click', () => { opened++; });
      }
      script.onload();
    },
    shortcut() { documentEvents.get('keydown')({ctrlKey:true, key:'k', preventDefault() {}}); }
  };
}

test('home search requests no catalogue data until activation, then opens on the first click', async () => {
  const fixture = homeFixture();
  assert.equal(fixture.requested.length, 0);
  fixture.button.click();
  fixture.shortcut();
  assert.equal(fixture.requested.length, 1, 'Concurrent input shares the in-progress bootstrap');
  const paths = [];
  for (let index = 0; index < 30; index++) {
    assert.equal(fixture.requested.length, index + 1, 'Dependencies load in order');
    const script = fixture.requested[index]; paths.push(script.src);
    fixture.loaded(script); await turn();
    if(script.src.includes('site-search-v2.js'))break;
  }
  assert.match(paths.at(-1), /site-search-v2/);
  assert.equal(fixture.opened, 1, 'The original activation opens search after loading');
  assert.equal(fixture.button.disabled, false);
  fixture.button.click(); await turn();
  assert.equal(fixture.requested.length, paths.length, 'Reopening does not rebuild the catalogue index');
  assert.equal(fixture.opened, 2);
});

test('a failed search dependency can be retried without leaving a disabled button', async () => {
  const fixture = homeFixture(); fixture.button.click();
  fixture.requested[0].onerror(new Error('temporary offline')); await turn();
  assert.equal(fixture.button.disabled, false);
  fixture.button.click();
  assert.equal(fixture.requested.length, 2, 'The failed script is requested again');
  assert.equal(fixture.requested[0].src, fixture.requested[1].src);
});
