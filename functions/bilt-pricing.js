'use strict';

// Les quantités saisies sont les quantités payantes. Les cadeaux sont ajoutés
// une seule fois, à partir de ces quantités, sans modifier la base facturée.
function priceLine(product, quantity, requestedDiscount = 0) {
  const isTaloxKit = product.ref === 'BSA203';
  const discountPercent = isTaloxKit ? 0 : Number(requestedDiscount || 0);
  const netPrice = Number(product.net);
  const finalUnit = Number((netPrice * (1 - discountPercent / 100)).toFixed(4));
  const freeQuantity = isTaloxKit ? Math.floor(quantity / 10) : 0;
  return {
    ...product, quantity, netPrice, discountPercent, finalUnit, freeQuantity,
    deliveredQuantity: quantity + freeQuantity,
    lineNet: Number((netPrice * quantity).toFixed(2)),
    lineFinal: Number((finalUnit * quantity).toFixed(2))
  };
}

module.exports = { priceLine };
