'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { priceLine } = require('../bilt-pricing');
const { productByRef, publicCatalog } = require('../bilt-catalog');

test('Talox stays net for every discount and gifts only complete tens of paid kits', () => {
  const kit = productByRef('BSA203');
  assert.equal(kit.net, 49.85);
  for (const discount of [0, 5, 10]) {
    for (const [quantity, freeQuantity] of [[1,0],[9,0],[10,1],[11,1],[19,1],[20,2],[100,10]]) {
      const line = priceLine(kit, quantity, discount);
      assert.equal(line.finalUnit, 49.85);
      assert.equal(line.discountPercent, 0);
      assert.equal(line.lineFinal, Number((49.85 * quantity).toFixed(2)));
      assert.equal(line.freeQuantity, freeQuantity);
      assert.equal(line.deliveredQuantity, quantity + freeQuantity);
    }
  }
});

test('mixed orders keep discounts on eligible products and cannot gift other kits', () => {
  const kit = priceLine(productByRef('BSA203'), 10, 10);
  const clips = priceLine(productByRef('BSA046'), 1, 10);
  assert.equal(kit.lineFinal, 498.50);
  assert.equal(clips.lineFinal, 86.04);
  assert.equal(Number((kit.lineFinal + clips.lineFinal).toFixed(2)), 584.54);
  assert.equal(priceLine(productByRef('BSA025'), 20, 10).freeQuantity, 0);
});

test('browser catalogue and basket agree with the server, including gift removal', () => {
  const elements = new Map();
  const document = {
    getElementById(id) { if (!elements.has(id)) elements.set(id, {}); return elements.get(id); },
    addEventListener() {}
  };
  const filename = path.join(__dirname, '../../assets/js/bilt-order.js');
  const source = fs.readFileSync(filename, 'utf8').replace(/\}\)\(\);\s*$/, `
    globalThis.biltTest = {
      priceFor, renderCart, renderCatalog,
      setup(data, items) { context=data; catalog=data.catalog; cart.clear(); items.forEach(i=>cart.set(i.ref,i)); }
    };
  })();`);
  const sandbox = { document };
  vm.runInNewContext(source, sandbox);
  const api = sandbox.biltTest;
  const context = { discount:{percent:10}, catalog:publicCatalog() };
  api.setup(context, [{ref:'BSA203',quantity:10},{ref:'BSA046',quantity:1}]);
  api.renderCatalog(); api.renderCart();
  const html = elements.get('cart-summary').innerHTML;
  assert.match(html, /584,54/);
  assert.match(html, /9,56/);
  assert.match(elements.get('cart-lines').innerHTML, /Total à livrer : 11 kits/);
  assert.equal(api.priceFor(productByRef('BSA203')).percent, 0);
  api.setup(context, [{ref:'BSA203',quantity:9}]); api.renderCart();
  assert.doesNotMatch(elements.get('cart-lines').innerHTML, /Total à livrer/);
  assert.doesNotMatch(elements.get('cart-summary').innerHTML, /Remise LRF/);
  assert.match(elements.get('cart-summary').innerHTML, /448,65/);
});
