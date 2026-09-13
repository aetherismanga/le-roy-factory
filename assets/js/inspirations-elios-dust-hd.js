(() => {
  'use strict';

  const gallery = [
    'https://eliosceramica.com/wp-content/uploads/2023/05/Dust_terrae_amb_2.jpg',
    'https://eliosceramica.com/wp-content/uploads/2023/05/DUST_amb_4.jpg',
    'https://eliosceramica.com/wp-content/uploads/2023/05/DUST_amb_3.jpg',
    'https://eliosceramica.com/wp-content/uploads/2023/05/Dust_terrae_amb_1.jpg'
  ];

  const colors = ['Terrae','Blush','Dove','Ice','Sage','Pine','Niagara','Ink'];

  window.ELIOS_OFFICIAL_GALLERIES = window.ELIOS_OFFICIAL_GALLERIES || {};
  window.ELIOS_OFFICIAL_GALLERIES.dust = gallery;

  window.ELIOS_VERIFIED_VARIANTS = window.ELIOS_VERIFIED_VARIANTS || {};
  window.ELIOS_VERIFIED_VARIANTS.dust = window.ELIOS_VERIFIED_VARIANTS.dust || {};
  colors.forEach(color => {
    window.ELIOS_VERIFIED_VARIANTS.dust[color] = gallery;
  });

  window.ELIOS_IMAGE_DATA = window.ELIOS_IMAGE_DATA || {};
  gallery.forEach((src, index) => {
    window.ELIOS_IMAGE_DATA[`dust-hd-${index + 1}`] = src;
  });
  window.ELIOS_IMAGE_DATA['dust-1'] = gallery[0];
})();
