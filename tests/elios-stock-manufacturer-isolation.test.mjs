import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';

// A small DOM fixture runs the shipped scripts, including their real delayed
// callbacks. Mutations are queued, so an accidental reinsertion loop fails the
// bounded flush instead of being hidden by synchronous observer stubs.
function fixture(file, {authorized = true} = {}) {
  const jobs = [], observers = [], documentEvents = new Map(), windowEvents = new Map();
  let mutations = 0;
  const register = (map, type, fn) => { if (!map.has(type)) map.set(type, []); map.get(type).push(fn); };
  const dataKey = name => name.replace(/^data-/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  const isAncestor = (ancestor, node) => { for (; node; node = node.parentElement) if (node === ancestor) return true; return false; };
  function changed(node, type = 'childList') {
    mutations += 1;
    for (const observer of observers) {
      if (observer.pending || !observer.target || !observer.options[type]) continue;
      if (node !== observer.target && !(observer.options.subtree && isAncestor(observer.target, node))) continue;
      observer.pending = true;
      jobs.push(() => { observer.pending = false; if (observer.target) observer.callback([{target:node, type}]); });
    }
  }
  function simpleMatch(node, selector) {
    if (!node || !selector) return false;
    const tag = selector.match(/^[a-z][\w-]*/i)?.[0];
    if (tag && node.tagName.toLowerCase() !== tag.toLowerCase()) return false;
    for (const [, id] of selector.matchAll(/#([\w-]+)/g)) if (node.id !== id) return false;
    for (const [, className] of selector.matchAll(/\.([\w-]+)/g)) if (!node.classList.contains(className)) return false;
    for (const [, name, operator, quote, wanted] of selector.matchAll(/\[([\w-]+)(?:(\^=|=)(["']?)([^\]"']*)\3)?\]/g)) {
      const value = name.startsWith('data-') ? node.dataset[dataKey(name)] : node.getAttribute(name);
      if (value == null) return false;
      if (operator === '=' && String(value) !== wanted) return false;
      if (operator === '^=' && !String(value).startsWith(wanted)) return false;
    }
    return true;
  }
  function match(node, selector) {
    return selector.split(',').some(part => {
      const tokens = part.trim().split(/\s+(?![^\[]*\])/);
      if (!simpleMatch(node, tokens.pop())) return false;
      let parent = node.parentElement;
      while (tokens.length) {
        const wanted = tokens.pop();
        while (parent && !simpleMatch(parent, wanted)) parent = parent.parentElement;
        if (!parent) return false;
        parent = parent.parentElement;
      }
      return true;
    });
  }
  class Element {
    constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.parentElement = null; this.dataset = {}; this.attributes = {}; this.events = new Map(); this.id = ''; this.className = ''; this._text = ''; this._html = ''; this.style = {}; }
    get classList() {
      const node = this;
      return {contains:name => node.className.split(/\s+/).includes(name), add(...names) { node.className = [...new Set([...node.className.split(/\s+/).filter(Boolean), ...names])].join(' '); }, remove(...names) { node.className = node.className.split(/\s+/).filter(name => !names.includes(name)).join(' '); }};
    }
    matches(selector) { return match(this, selector); }
    closest(selector) { for (let node = this; node; node = node.parentElement) if (node.matches(selector)) return node; return null; }
    querySelectorAll(selector) {
      const found = [];
      const visit = node => { for (const child of node.children) { if (child.matches(selector)) found.push(child); visit(child); } };
      visit(this); return found;
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    appendChild(node) { if (node.parentElement) node.remove(); this.children.push(node); node.parentElement = this; changed(this); return node; }
    replaceChildren(...nodes) { for (const child of this.children) child.parentElement = null; this.children = []; this._text = ''; for (const node of nodes) this.appendChild(node); changed(this); }
    remove() { if (!this.parentElement) return; const parent = this.parentElement; parent.children = parent.children.filter(node => node !== this); this.parentElement = null; changed(parent); }
    get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
    set textContent(value) { this.replaceChildren(); this._text = String(value ?? ''); changed(this, 'characterData'); }
    get innerHTML() { return this._html; }
    set innerHTML(value) {
      this.replaceChildren(); this._html = String(value);
      // The injectors only need these leaf nodes from their CTA markup.
      for (const [, tag, attributes, text] of this._html.matchAll(/<(a|button|p|strong|h3)\b([^>]*)>([^<]*)/gi)) {
        const child = new Element(tag);
        for (const [, name, , attrValue] of attributes.matchAll(/([\w-]+)=(['"])(.*?)\2/g)) child.setAttribute(name, attrValue);
        child._text = text;
        this.appendChild(child);
      }
    }
    setAttribute(name, value) { this.attributes[name] = String(value); if (name === 'id') this.id = String(value); if (name === 'class') this.className = String(value); if (name.startsWith('data-')) this.dataset[dataKey(name)] = String(value); }
    getAttribute(name) { return name === 'id' ? this.id : name === 'class' ? this.className : this.attributes[name] ?? null; }
    get href() { return this.getAttribute('href') || ''; }
    set href(value) { this.setAttribute('href', value); }
    addEventListener(type, fn) { register(this.events, type, fn); }
  }
  const head = new Element('head'), body = new Element('body');
  const workspace = new Element('h2'); workspace.id = 'workspace-title'; body.appendChild(workspace);
  const grid = new Element('div'); grid.id = 'partner-products'; body.appendChild(grid);
  const modal = new Element('div'); modal.id = 'product-modal-v2'; body.appendChild(modal);
  const card = new Element('div'); card.id = 'product-modal-v2-card'; modal.appendChild(card);
  const document = {readyState:'complete', head, body,
    getElementById:id => [head, body, ...head.querySelectorAll('*'), ...body.querySelectorAll('*')].find(node => node.id === id) || null,
    createElement:tag => new Element(tag),
    querySelector:selector => body.querySelector(selector) || head.querySelector(selector),
    querySelectorAll:selector => [...body.querySelectorAll(selector), ...head.querySelectorAll(selector)],
    addEventListener:(type, fn) => register(documentEvents, type, fn)};
  let session = authorized ? {isAdmin:true, partenaires:['Elios Ceramica']} : null;
  const window = {ELIOS_CATALOGUE:[{slug:'roma', name:'ROMA'}, {slug:'slate', name:'SLATE'}, {slug:'quercia', name:'QUERCIA'}],
    LRF_PRO_SESSION:{read:() => session}, location:{href:'univers.html'}, addEventListener:(type, fn) => register(windowEvents, type, fn)};
  class MutationObserver {
    constructor(callback) { this.callback = callback; this.pending = false; observers.push(this); }
    observe(target, options) { this.target = target; this.options = options; }
    disconnect() { this.target = null; }
  }
  const context = vm.createContext({window, document, MutationObserver, console, encodeURIComponent,
    sessionStorage:{getItem:() => session ? JSON.stringify(session) : null}, fetch:async() => ({ok:true}),
    setTimeout:fn => { jobs.push(fn); return jobs.length; }, clearTimeout(){}, requestAnimationFrame:fn => { jobs.push(fn); return jobs.length; }});
  vm.runInContext(readFileSync(new URL('../assets/js/' + file, import.meta.url), 'utf8'), context, {filename:file});
  function flush() { let count = 0; while (jobs.length) { assert(++count < 100, 'Observers and timers must settle without reinsertion loops'); jobs.shift()(); } return count; }
  function open(partner, title, shape = '') {
    workspace.textContent = partner;
    modal.className = 'modal-v2 open'; card.className = 'modal-v2-card' + (shape ? ' ' + shape : '');
    const info = new Element('div'); info.className = shape === 'view-safe-modal' ? 'view-safe-info' : 'modal-v2-info';
    const heading = new Element('h2'); heading.textContent = title; info.appendChild(heading); card.replaceChildren(info); return info;
  }
  function event(type, target = body, detail) {
    const e = {type, target, detail, preventDefault(){}, stopPropagation(){}, stopImmediatePropagation(){}};
    return Promise.all((type === 'click' ? documentEvents : windowEvents).get(type)?.map(fn => fn(e)) || []);
  }
  function select(id, name) {
    const item = new Element('article'); item.className = 'product-card-v2'; item.dataset.id = id;
    const heading = new Element('h3'); heading.textContent = name; item.appendChild(heading); grid.appendChild(item); event('click', item);
  }
  async function activateStock(node) { await Promise.all(node.events.get('click')?.map(fn => fn({target:node, preventDefault(){}})) || []); }
  function legacy(className) { const node = new Element('section'); node.className = className; card.appendChild(node); return node; }
  return {card, modal, window, open, select, event, flush, activateStock, legacy, get mutations(){return mutations;}, revoke(){session = null;}};
}

for (const spec of [
  {file:'elios-stock-roma-test.js', panel:'.lrf-elios-stock-cta', control:'button'},
  {file:'selections-ios-elios-parity.js', panel:'.lrf-ios-elios-stock', control:'a'}
]) {
  test(`${spec.file}: delayed ELIOS work cannot add stock actions to VIEW or another maker`, async() => {
    const f = fixture(spec.file);
    f.open('Elios Ceramica', 'ROMA'); f.select('elios-roma', 'ROMA'); f.flush();
    assert(f.card.querySelector(spec.panel), 'ELIOS stock action remains available');
    f.select('elios-slate', 'SLATE'); // Leave work queued while the user changes manufacturer.
    f.open('View Ceramica', 'ARDENNE', 'view-safe-modal');
    f.legacy(spec.panel.slice(1));
    await f.event('lrf-view-product-opened', undefined, {product:{id:'view-ardenne', name:'ARDENNE'}});
    f.flush();
    assert.equal(f.card.querySelector(spec.panel), null, 'VIEW must lose even a previously injected ELIOS action');
    await f.event('lrf-pro-session-changed'); f.flush();
    assert.equal(f.card.querySelector(spec.panel), null, 'Session refresh cannot restore a stale ELIOS action');
    for (const [partner, shape] of [['View Ceramica',''], ['Biopietra',''], ['Elios Ceramica','view-modal-card']]) {
      f.open(partner, 'ROMA', shape); f.flush();
      assert.equal(f.card.querySelector(spec.panel), null, 'A matching product name is insufficient outside a current ELIOS sheet');
    }
    const writes = f.mutations;
    assert.equal(f.flush(), 0, 'No delayed observer loop remains');
    assert.equal(f.mutations, writes);
  });

  test(`${spec.file}: lexicon title changes resolve the current ELIOS collection`, async() => {
    const f = fixture(spec.file);
    f.open('Elios Ceramica', 'ROMA'); f.select('elios-roma', 'ROMA'); f.flush();
    let panel = f.card.querySelector(spec.panel);
    assert(panel);
    if (spec.control === 'button') {
      await f.activateStock(panel.querySelector('button'));
      assert.equal(f.window.location.href, 'disponibilites-elios.html?collection=ROMA');
    } else assert.match(panel.querySelector('a').href, /collection=roma$/);
    f.open('Elios Ceramica', 'QUERCIA'); // Direct lexicon/API opening, without a card click.
    f.flush(); panel = f.card.querySelector(spec.panel);
    assert(panel, 'Direct collection opening retains its ELIOS stock action');
    if (spec.control === 'button') {
      await f.activateStock(panel.querySelector('button'));
      assert.equal(f.window.location.href, 'disponibilites-elios-lot1.html?collection=quercia');
    } else assert.match(panel.querySelector('a').href, /collection=quercia$/);
    f.open('Elios Ceramica', 'Roma autre fabricant'); f.flush();
    assert.equal(f.card.querySelector(spec.panel), null, 'Partial names cannot select another collection');
    f.open('Elios Ceramica', 'ROMA'); f.modal.className = 'modal-v2'; f.flush();
    assert.equal(f.card.querySelector(spec.panel), null, 'Closed modals do not receive stock actions');
  });
}

test('iOS parity preserves ELIOS access checks and excludes legacy-shaped VIEW sheets for admins', async() => {
  const f = fixture('selections-ios-elios-parity.js', {authorized:false});
  f.open('Elios Ceramica', 'ROMA'); f.select('elios-roma', 'ROMA'); f.flush();
  assert.equal(f.card.querySelector('.lrf-ios-elios-stock'), null);
  const admin = fixture('selections-ios-elios-parity.js');
  admin.open('View Ceramica', 'ARDENNE'); admin.select('elios-roma', 'ROMA'); admin.flush();
  assert.equal(admin.card.querySelector('.lrf-ios-elios-stock'), null, 'Admin rights do not make VIEW an ELIOS product');
});
