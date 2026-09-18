// Montreal — restauration des visuels couleur HD pour Sélections ELIOS.
(() => {
  const variants = {
    White: ['https://peintner.shop/media/image/variation/24831/md/montreal-boden-und-wandfliesen-85mm_farbe_white.jpg'],
    Grey: ['https://peintner.shop/media/image/variation/24832/md/montreal-boden-und-wandfliesen-85mm_farbe_grey.jpg'],
    Beige: ['https://peintner.shop/media/image/variation/24833/md/montreal-boden-und-wandfliesen-85mm_farbe_beige.jpg'],
    Taupe: ['https://peintner.shop/media/image/variation/24834/md/montreal-boden-und-wandfliesen-85mm_farbe_taupe.jpg'],
    Dark: ['https://peintner.shop/media/image/variation/24835/md/montreal-boden-und-wandfliesen-85mm_farbe_dark.jpg']
  };
  const collection = [
    'https://peintner.shop/media/image/product/38853/md/montreal-boden-und-wandfliesen-85mm.jpg',
    ...Object.values(variants).flat()
  ];
  window.ELIOS_OFFICIAL_GALLERIES = window.ELIOS_OFFICIAL_GALLERIES || {};
  window.ELIOS_OFFICIAL_GALLERIES.montreal = collection;
  window.ELIOS_VERIFIED_VARIANTS = window.ELIOS_VERIFIED_VARIANTS || {};
  window.ELIOS_VERIFIED_VARIANTS.montreal = variants;
})();