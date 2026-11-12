import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const runtime = readFileSync(new URL('../assets/js/pdf-reader-runtime.js', import.meta.url), 'utf8');
function anchorFixture() {
  const context = vm.createContext({requestAnimationFrame: () => {}});
  vm.runInContext(runtime, context);
  let page = 7;
  const frames = [], scrolled = [];
  const anchor = context.LRF_PDF_READER.createAnchor(() => page, p => {page = p;}, p => ({scrollIntoView() {scrolled.push(p);}}), fn => frames.push(fn));
  return {anchor, scrolled, page: () => page, flush() {while (frames.length) frames.shift()();}};
}
test('successive zooms keep the original page and release the observer lock', () => {
  const f = anchorFixture();
  f.anchor.zoom(() => assert.equal(f.anchor.locked, true));
  f.anchor.zoom(() => {});
  f.flush();
  assert.deepEqual(f.scrolled, [7]);
  assert.equal(f.page(), 7);
  assert.equal(f.anchor.locked, false);
});
test('explicit navigation supersedes pending zoom restoration', () => {
  const f = anchorFixture();
  f.anchor.zoom(() => {});
  f.anchor.navigate(9);
  f.flush();
  assert.deepEqual(f.scrolled, []);
  assert.equal(f.page(), 9);
  assert.equal(f.anchor.locked, false);
});
test('zoom immediately after navigation retains the requested page', () => {
  const f = anchorFixture();
  f.anchor.navigate(11);
  f.anchor.zoom(() => {});
  f.flush();
  assert.deepEqual(f.scrolled, [11]);
});
test('a stale UPTREND getPage result cannot repaint after zoom invalidation', async () => {
  const source = readFileSync(new URL('../assets/js/uptrend-interactive.js', import.meta.url), 'utf8');
  const render = source.slice(source.indexOf('  async function renderPage('), source.indexOf('  function createPages('));
  let resolvePage;
  const state = {rendered:new Set(), catalogue:{getPage:() => new Promise(r => {resolvePage = r;})}};
  const holder = {dataset:{renderToken:'1'}, prepend(){assert.fail('stale canvas appended');}};
  const context = vm.createContext({state});
  vm.runInContext(render, context);
  const pending = context.renderPage(holder, 2);
  holder.dataset.renderToken = '2';
  holder.dataset.rendering = 'new-render';
  resolvePage({getViewport(){assert.fail('stale page rendered');}});
  await pending;
  assert.equal(holder.dataset.rendering, 'new-render');
  assert.equal(state.rendered.size, 0);
});
for (const outcome of ['complete', 'stale', 'failed']) {
  test(`UPTREND retains the visible page while rendering: ${outcome}`, async () => {
    const source = readFileSync(new URL('../assets/js/uptrend-interactive.js', import.meta.url), 'utf8');
    const render = source.slice(source.indexOf('  async function renderPage('), source.indexOf('  function createPages('));
    let finish, reject, replacements = 0, hotspots = 0;
    const previous = {removed:false, remove(){this.removed = true;}};
    const next = {getContext:() => ({})};
    const holder = {
      dataset:{renderToken:'1'},
      getBoundingClientRect:() => ({width:600}),
      querySelectorAll:() => [previous],
      querySelector:() => previous,
      prepend(canvas){assert.equal(canvas, next); replacements++;}
    };
    const state = {rendered:new Set(), catalogue:{getPage:async () => ({getViewport:() => ({width:600,height:800}),render:() => ({promise:new Promise((resolve, fail) => {finish=resolve;reject=fail;})})})}};
    const context = vm.createContext({state, devicePixelRatio:1, document:{createElement:() => next}, addHotspots(){hotspots++;}, console:{error(){}}});
    vm.runInContext(render, context);
    const pending = context.renderPage(holder, 2);
    await new Promise(setImmediate);
    assert.equal(previous.removed, false);
    assert.equal(replacements, 0, 'unfinished canvas must never enter the visible DOM');
    if(outcome === 'stale') holder.dataset.renderToken = '2';
    if(outcome === 'failed') reject(new Error('render failed')); else finish();
    await pending;
    assert.equal(previous.removed, outcome === 'complete');
    assert.equal(replacements, outcome === 'complete' ? 1 : 0);
    assert.equal(hotspots, outcome === 'complete' ? 1 : 0);
  });
}
test('recovery exposes an explicit retry and a catalogue return without submitting a form', () => {
  const document = {createElement:tag => ({tag, style:{}, addEventListener(event, fn){this[event] = fn;}})};
  const context = vm.createContext({document, requestAnimationFrame(){}});
  vm.runInContext(runtime, context);
  const host = {replaceChildren(){}, setAttribute(){}, append(...nodes){this.nodes = nodes;}};
  let attempts = 0;
  context.LRF_PDF_READER.recovery(host, () => {attempts++;});
  const button = host.nodes.find(node => node.tag === 'button');
  assert.equal(button.type, 'button');
  button.click();
  assert.equal(button.disabled, true);
  assert.equal(attempts, 1);
  assert.equal(host.nodes.find(node => node.tag === 'a').href, 'catalogues.html');
  assert.equal(host.hidden, false);
});
test('La Fenice waits for canvas cancellation and only renders the latest request', async () => {
  const source = readFileSync(new URL('../assets/js/fenice-pdf-viewer.js', import.meta.url), 'utf8');
  const render = source.slice(source.indexOf('  async function renderPage('), source.indexOf('  function go(n)'));
  let active = 0, renders = 0, cancellations = 0, errors = [];
  const canvas = {style: {}, getContext: () => ({})};
  Object.defineProperty(canvas, 'width', {set() {assert.equal(active, 0, 'canvas resized while previous render active');}});
  const page = {
    getViewport: ({scale}) => ({width:600*scale, height:800*scale}),
    render() {
      assert.equal(active, 0); active++; renders++;
      let resolve;
      const promise = new Promise(r => {resolve = r;});
      return {promise, cancel() {cancellations++; queueMicrotask(() => {if (active) {active--; resolve();}});}, complete() {active--; resolve();}};
    }
  };
  const context = vm.createContext({canvas, stage:{clientWidth:600}, status:{}, window:{devicePixelRatio:1, scrollTo(){}}, console:{error:e=>errors.push(e)}, updateControls(){}, syncUrl(){}, renderLexicon(){}, lexiconSearch:null, fail:m=>errors.push(m), pdf:{numPages:20,getPage:async()=>page}, pageNo:2, zoom:1, fitMode:true, rendering:null, renderToken:0});
  vm.runInContext(render, context);
  const first = context.renderPage();
  await new Promise(setImmediate);
  const second = context.renderPage();
  const third = context.renderPage();
  await new Promise(setImmediate);
  context.rendering.complete();
  await Promise.all([first, second, third]);
  assert.equal(renders, 2);
  assert.ok(cancellations >= 1);
  assert.equal(active, 0);
  assert.deepEqual(errors, []);
  assert.equal(context.status.hidden, true);
});
