'use strict';
// Shared verbatim with the CeraStone browser: manufacturer pack areas are
// authoritative, even when they differ from nominal dimensions.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CeraQuantities = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const units = ['m²', 'ml', 'pièces', 'boîtes'];
  const positive = value => typeof value === 'number' && Number.isFinite(value) && value > 0;
  const round = value => Math.round(value * 1e6) / 1e6;
  function convert(product, quantity, unit) {
    if (!positive(quantity) || quantity > 100000 || !units.includes(unit)) throw new RangeError('Quantité ou unité invalide.');
    if (['pièces', 'boîtes'].includes(unit) && !Number.isSafeInteger(quantity)) throw new RangeError('Saisissez un nombre entier.');
    const kind = product.kind || 'tile', pack = product.packaging || {};
    const baseUnit = product.unit || (kind === 'plinth' ? 'ml' : kind === 'tile' || kind === 'ambiance' ? 'm²' : 'pièces');
    if (kind === 'tile' && unit === 'ml' || kind === 'plinth' && unit === 'm²' || !['tile', 'plinth', 'ambiance'].includes(kind) && unit !== 'pièces' && !(unit === 'boîtes' && pack.status === 'known' && positive(pack.piecesPerBox))) throw new RangeError('Cette unité ne correspond pas à cet article.');
    if (!['tile', 'plinth', 'ambiance'].includes(kind) && pack.status === 'known' && Number.isSafeInteger(pack.piecesPerBox) && pack.piecesPerBox > 1) {
      const boxes = unit === 'boîtes' ? quantity : Math.max(1, Math.ceil((quantity - 1e-9) / pack.piecesPerBox));
      return {status:'known',requestedQuantity:quantity,requestedUnit:unit,boxes,quantity:boxes*pack.piecesPerBox,unit:'pièces',pieces:boxes*pack.piecesPerBox,factor:pack.piecesPerBox,piecesPerBox:pack.piecesPerBox};
    }
    if (!['tile', 'plinth', 'ambiance'].includes(kind)) return {status:'piece', requestedQuantity:quantity, requestedUnit:unit, quantity, unit:'pièces', pieces:quantity};
    const pieces = positive(pack.piecesPerBox) && Number.isSafeInteger(pack.piecesPerBox) ? pack.piecesPerBox : null;
    const factor = baseUnit === 'ml' ? pack.linearMetresPerBox : pack.areaPerBox;
    if (pack.status !== 'known' || !positive(factor) || unit === 'pièces' && !pieces) return {status:'unknown', requestedQuantity:quantity, requestedUnit:unit, quantity, unit};
    const boxes = unit === 'boîtes' ? quantity : Math.max(1, Math.ceil((quantity - 1e-9) / (unit === 'pièces' ? pieces : factor)));
    return {status:'known', requestedQuantity:quantity, requestedUnit:unit, boxes, quantity:round(boxes * factor), unit:baseUnit, pieces:pieces ? boxes * pieces : null, factor, piecesPerBox:pieces};
  }
  // Sale prices only: purchase facts never belong in the browser or registry.
  function priceEnding90(purchaseHt) {
    if (!positive(purchaseHt)) throw new RangeError('Prix de base invalide.');
    const multipliedCents = Math.round(purchaseHt * 300);
    return Math.max(90, Math.round((multipliedCents - 90) / 100) * 100 + 90) / 100;
  }
  function estimateLine(product, quantity, unit) {
    if (!positive(product.priceTtc)) return null;
    const packing = convert(product, quantity, unit);
    const priceUnit = product.priceUnit || product.unit;
    let billedQuantity;
    if (priceUnit === 'boîtes') billedQuantity = packing.boxes;
    else if (packing.unit === priceUnit) billedQuantity = packing.quantity;
    if (!positive(billedQuantity)) return null;
    return {unitPrice:product.priceTtc,priceUnit,quantity:billedQuantity,total:Math.round((billedQuantity * product.priceTtc + Number.EPSILON) * 100) / 100,demo:product.priceBasis === 'demo'};
  }
  return Object.freeze({convert, units, priceEnding90, estimateLine});
});
