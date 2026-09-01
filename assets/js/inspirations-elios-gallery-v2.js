(() => {
  const grid = document.getElementById('partner-products');
  const modal = document.getElementById('product-modal-v2');
  if (!grid || !modal) return;

  const images = window.ELIOS_IMAGE_DATA || {};
  const catalogue = Array.isArray(window.ELIOS_CATALOGUE) ? window.ELIOS_CATALOGUE : [];
  const remote = window.ELIOS_HD_REMOTE || {};
  const extraOfficial = window.ELIOS_OFFICIAL_GALLERIES || {};
  const extraVariants = window.ELIOS_VERIFIED_VARIANTS || {};

  // Galeries officielles Elios validées. Roma reste le modèle de référence.
  // Les collections listées ici utilisent uniquement des visuels officiels HD.
  const OFFICIAL_GALLERIES = {
    dolomiti: [
      'https://eliosceramica.com/wp-content/uploads/2021/01/DOLOMITI_LIVING_bianco_greige.jpg',
      'https://eliosceramica.com/wp-content/uploads/2021/01/DOLOMITI_CAMERA_beige.jpg',
      'https://eliosceramica.com/wp-content/uploads/2021/01/DOLOMITI_BAGNO_beige.jpg',
      'https://eliosceramica.com/wp-content/uploads/2021/01/DOLOMITI_LIVING_beige_lappato.jpg',
      'https://eliosceramica.com/wp-content/uploads/2021/01/DOLOMITI_LIVING_beige1.jpg',
      'https://eliosceramica.com/wp-content/uploads/2021/01/DOLOMITI_CUCINA_greige.jpg',
      'https://eliosceramica.com/wp-content/uploads/2021/01/DOLOMITI_CAMERAgreige.jpg',
      'https://eliosceramica.com/wp-content/uploads/2021/01/DOLOMITI_CAMERA_greige_chevron.jpg',
      'https://eliosceramica.com/wp-content/uploads/2021/01/DOLOMITI_LIVING_greige.jpg',
      'https://eliosceramica.com/wp-content/uploads/2021/01/DOLOMITI_LIVING_greige_lappato.jpg',
      'https://eliosceramica.com/wp-content/uploads/2021/01/DOLOMITI_LIVING_grigio.jpg',
      'https://eliosceramica.com/wp-content/uploads/2021/01/DOLOMITI_LIVING_grigio_chevron.jpg',
      'https://eliosceramica.com/wp-content/uploads/2021/01/DOLOMITI_LIVING_grigio1.jpg',
      'https://eliosceramica.com/wp-content/uploads/2021/01/DOLOMITI_LIVING_antracite.jpg',
      'https://eliosceramica.com/wp-content/uploads/2021/01/DOLOMITI_LIVING_antracite_out.jpg'
    ],
    sedimenti: [
      'https://eliosceramica.com/wp-content/uploads/2024/02/SEDIMENTI-MODULO-BEIGE-TUMBLED-1.jpg',
      'https://eliosceramica.com/wp-content/uploads/2024/02/Elios-Sedimenti-1.jpg',
      'https://eliosceramica.com/wp-content/uploads/2024/02/Elios-Sedimenti-2.jpg',
      'https://eliosceramica.com/wp-content/uploads/2024/02/Elios-Sedimenti-3.jpg',
      'https://eliosceramica.com/wp-content/uploads/2024/02/TROIABASSA-NEWTON-SEDIMENTI-BEIGE-SAND-LOIRE-BEIGE-14X76-2.jpg',
      'https://eliosceramica.com/wp-content/uploads/2024/02/SEDIMENTI-GREY-TUMBLED-1.jpg',
      'https://eliosceramica.com/wp-content/uploads/2024/02/Elios-Sedimenti-4.jpg',
      'https://eliosceramica.com/wp-content/uploads/2024/02/Elios-Sedimenti-5.jpg',
      'https://eliosceramica.com/wp-content/uploads/2024/02/SEDIMENTI-MODULO-GREY-TUMBLED.jpg',
      'https://eliosceramica.com/wp-content/uploads/2024/02/Elios-Sedimenti-6.jpg',
      'https://eliosceramica.com/wp-content/uploads/2024/02/Elios-Sedimenti-7.jpg',
      'https://eliosceramica.com/wp-content/uploads/2024/02/Elios-Sedimenti-8.jpg'
    ],
    yosemite: [
      'https://eliosceramica.com/wp-content/uploads/2022/11/YOSEMITE_amb4.jpg',
      'https://eliosceramica.com/wp-content/uploads/2022/11/yosemite_honey_amb1.jpg',
      'https://eliosceramica.com/wp-content/uploads/2022/11/YOSEMITE_amb5.jpg',
      'https://eliosceramica.com/wp-content/uploads/2022/11/YOSEMITE_amb3.jpg',
      'https://eliosceramica.com/wp-content/uploads/2022/11/yosemite_netural_amb2.jpg',
      'https://eliosceramica.com/wp-content/uploads/2022/11/YOSEMITE_amb7.jpg'
    ],
    'millennium-quartz': [
      'https://eliosceramica.com/wp-content/uploads/2023/10/Millenium_Quartz_Amb_5.jpg',
      'https://eliosceramica.com/wp-content/uploads/2023/10/Millenium_Quartz_Amb_11-scaled.jpg',
      'https://eliosceramica.com/wp-content/uploads/2023/10/Millenium_Quartz_Amb_6-scaled.jpg',
      'https://eliosceramica.com/wp-content/uploads/2023/10/Millenium_Quartz_Amb_4-scaled.jpg',
      'https://eliosceramica.com/wp-content/uploads/2023/10/Millenium_Quartz_Amb_1.jpg'
    ],
    manhattan: [
      'https://eliosceramica.com/wp-content/uploads/2021/06/Manhattan_Grey_amb-scaled.jpg',
      'https://eliosceramica.com/wp-content/uploads/2021/06/Manhattan_Dark_grey_amb2-scaled.jpg',
      'https://eliosceramica.com/wp-content/uploads/2021/06/Manhattan_Sand_amb2-scaled.jpg',
      'https://eliosceramica.com/wp-content/uploads/2021/06/Manhattan_Pearl_amb2-scaled.jpg'
    ],
    mysterium: [
      'https://eliosceramica.com/wp-content/uploads/2025/05/ELIOS_MYSTERIUM_SABBIA_BAGNO.jpg',
      'https://eliosceramica.com/wp-content/uploads/2025/05/ELIOS_MYSTERIUM_CASELLI_sabbia.jpg',
      'https://eliosceramica.com/wp-content/uploads/2025/05/ELIOS_MYSTERIUM_ACQUA_LIVING.jpg',
      'https://eliosceramica.com/wp-content/uploads/2025/05/ELIOS_MYSTERIUM_ACQUA_SPA.jpg',
      'https://eliosceramica.com/wp-content/uploads/2025/05/ELIOS_MYSTERIUM_OCEANO_GIARDINO.jpg',
      'https://eliosceramica.com/wp-content/uploads/2025/05/ELIOS_MYSTERIUM_OCEANO_LIVING.jpg',
      'https://eliosceramica.com/wp-content/uploads/2025/05/ELIOS_MYSTERIUM_TERRA_CUCINA.jpg',
      'https://eliosceramica.com/wp-content/uploads/2025/05/ELIOS_MYSTERIUM_TERRA_UFFICIO.jpg'
    ],
    'bavaria-stone': [
      'https://eliosceramica.com/wp-content/uploads/2021/01/Elios_Bavaria_Stone_3.jpg',
      'https://eliosceramica.com/wp-content/uploads/2021/01/Elios_Bavaria_Stone_2.jpg',
      'https://eliosceramica.com/wp-content/uploads/2021/01/Elios_Bavaria_Stone_1.jpg',
      'https://eliosceramica.com/wp-content/uploads/2021/01/BAVARIA-STONE_White_beige_grey.jpg',
      'https://eliosceramica.com/wp-content/uploads/2021/01/bavaria_stone_noce_amb1-scaled.jpg',
      'https://eliosceramica.com/wp-content/uploads/2021/01/bavaria_stone_noce_amb3-scaled.jpg'
    ]
  };

  const VERIFIED_VARIANTS = {
    roma: {
      Aventino: [
        'https://eliosceramica.com/wp-content/uploads/2021/02/Roma_Aventino_pav.jpg',
        'https://eliosceramica.com/wp-content/uploads/2021/02/Roma_Aventino_2.jpg'
      ],
      Celio: [
        'https://eliosceramica.com/wp-content/uploads/2021/02/Roma_CELIO-1.jpg',
        'https://eliosceramica.com/wp-content/uploads/2021/02/Roma_Celio_pav_Cop.jpg'
      ],
      Viminale: [
        'https://eliosceramica.com/wp-content/uploads/2021/02/Roma_Viminale_cucina.jpg',
        'https://eliosceramica.com/wp-content/uploads/2021/02/Roma_viminale-1.jpg'
      ],
      Palatino: [
        'https://eliosceramica.com/wp-content/uploads/2021/02/ROMA_PALATINO_amb.jpg',
        'https://eliosceramica.com/wp-content/uploads/2021/02/Roma_Palatino_1.jpg',
        'https://eliosceramica.com/wp-content/uploads/2021/02/Roma_Palatino_2.jpg',
        'https://eliosceramica.com/wp-content/uploads/2021/02/Roma_Palatino_3.jpg',
        'https://eliosceramica.com/wp-content/uploads/2021/02/Roma_palatino_esterno2.jpg',
        'https://eliosceramica.com/wp-content/uploads/2021/02/Roma_Palatino_PART.jpg',
        'https://eliosceramica.com/wp-content/uploads/2021/02/Roma_Palatino_riv.jpg'
      ]
    },
    dolomiti: {
      Bianco: ['https://eliosceramica.com/wp-content/uploads/2021/01/DOLOMITI_LIVING_bianco_greige.jpg'],
      Beige: [
        'https://eliosceramica.com/wp-content/uploads/2021/01/DOLOMITI_CAMERA_beige.jpg',
        'https://eliosceramica.com/wp-content/uploads/2021/01/DOLOMITI_BAGNO_beige.jpg',
        'https://eliosceramica.com/wp-content/uploads/2021/01/DOLOMITI_LIVING_beige_lappato.jpg',
        'https://eliosceramica.com/wp-content/uploads/2021/01/DOLOMITI_LIVING_beige1.jpg'
      ],
      Greige: [
        'https://eliosceramica.com/wp-content/uploads/2021/01/DOLOMITI_LIVING_bianco_greige.jpg',
        'https://eliosceramica.com/wp-content/uploads/2021/01/DOLOMITI_CUCINA_greige.jpg',
        'https://eliosceramica.com/wp-content/uploads/2021/01/DOLOMITI_CAMERAgreige.jpg',
        'https://eliosceramica.com/wp-content/uploads/2021/01/DOLOMITI_CAMERA_greige_chevron.jpg',
        'https://eliosceramica.com/wp-content/uploads/2021/01/DOLOMITI_LIVING_greige.jpg',
        'https://eliosceramica.com/wp-content/uploads/2021/01/DOLOMITI_LIVING_greige_lappato.jpg'
      ],
      Grigio: [
        'https://eliosceramica.com/wp-content/uploads/2021/01/DOLOMITI_LIVING_grigio.jpg',
        'https://eliosceramica.com/wp-content/uploads/2021/01/DOLOMITI_LIVING_grigio_chevron.jpg',
        'https://eliosceramica.com/wp-content/uploads/2021/01/DOLOMITI_LIVING_grigio1.jpg'
      ],
      Antracite: [
        'https://eliosceramica.com/wp-content/uploads/2021/01/DOLOMITI_LIVING_antracite.jpg',
        'https://eliosceramica.com/wp-content/uploads/2021/01/DOLOMITI_LIVING_antracite_out.jpg'
      ]
    },
    sedimenti: {
      Beige: [
        'https://eliosceramica.com/wp-content/uploads/2024/02/SEDIMENTI-MODULO-BEIGE-TUMBLED-1.jpg',
        'https://eliosceramica.com/wp-content/uploads/2024/02/TROIABASSA-NEWTON-SEDIMENTI-BEIGE-SAND-LOIRE-BEIGE-14X76-2.jpg'
      ],
      Sand: ['https://eliosceramica.com/wp-content/uploads/2024/02/TROIABASSA-NEWTON-SEDIMENTI-BEIGE-SAND-LOIRE-BEIGE-14X76-2.jpg'],
      Grey: [
        'https://eliosceramica.com/wp-content/uploads/2024/02/SEDIMENTI-GREY-TUMBLED-1.jpg',
        'https://eliosceramica.com/wp-content/uploads/2024/02/SEDIMENTI-MODULO-GREY-TUMBLED.jpg'
      ]
    },
    yosemite: {
      Honey: ['https://eliosceramica.com/wp-content/uploads/2022/11/yosemite_honey_amb1.jpg'],
      Natural: ['https://eliosceramica.com/wp-content/uploads/2022/11/yosemite_netural_amb2.jpg']
    },
    manhattan: {
      Pearl: ['https://eliosceramica.com/wp-content/uploads/2021/06/Manhattan_Pearl_amb2-scaled.jpg'],
      Sand: ['https://eliosceramica.com/wp-content/uploads/2021/06/Manhattan_Sand_amb2-scaled.jpg'],
      Ash: [
        'https://eliosceramica.com/wp-content/uploads/2021/06/Manhattan_Grey_amb-scaled.jpg',
        'https://eliosceramica.com/wp-content/uploads/2021/06/Manhattan_Dark_grey_amb2-scaled.jpg'
      ]
    },
    mysterium: {
      Acqua: [
        'https://eliosceramica.com/wp-content/uploads/2025/05/ELIOS_MYSTERIUM_ACQUA_LIVING.jpg',
        'https://eliosceramica.com/wp-content/uploads/2025/05/ELIOS_MYSTERIUM_ACQUA_SPA.jpg'
      ],
      Ocean: [
        'https://eliosceramica.com/wp-content/uploads/2025/05/ELIOS_MYSTERIUM_OCEANO_GIARDINO.jpg',
        'https://eliosceramica.com/wp-content/uploads/2025/05/ELIOS_MYSTERIUM_OCEANO_LIVING.jpg'
      ]
    }
  };

  const esc = value => String(value ?? '').replace(/[&<>\"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;'
  }[c]));

  function unique(list) {
    const seen = new Set();
    return list.filter(src => {
      if (!src || seen.has(src)) return false;
      seen.add(src);
      return true;
    });
  }

  function productFromId(id) {
    const slug = String(id || '').replace(/^elios-/, '');
    const product = catalogue.find(p => p.slug === slug);
    return product ? { slug, product } : null;
  }

  function bestLocalImage(product) {
    const candidates = (product.gallery || [])
      .map(key => images[key])
      .filter(Boolean)
      .sort((a, b) => String(b).length - String(a).length);
    return candidates[0] || '';
  }

  function baseGallery(slug, product) {
    // Dès qu'une galerie officielle HD est validée, on n'affiche plus les anciennes
    // miniatures PDF de cette collection. Sinon : 1 HD principal + meilleur secours local.
    const official = extraOfficial[slug] || OFFICIAL_GALLERIES[slug] || [];
    if (official.length) return unique(official);
    const hd = remote[slug] ? [remote[slug]] : [];
    const localBest = bestLocalImage(product);
    return unique([...hd, ...(localBest ? [localBest] : [])]);
  }

  function buildGallery(card, id) {
    const found = productFromId(id);
    if (!found || card.dataset.galleryEnhanced === id) return;

    const { slug, product } = found;
    const main = card.querySelector('.modal-v2-main');
    const oldMainImage = main?.querySelector(':scope > img');
    const info = card.querySelector('.modal-v2-info');
    if (!main || !oldMainImage || !info) return;

    const collectionImages = baseGallery(slug, product);
    if (!collectionImages.length) return;

    const verified = { ...(VERIFIED_VARIANTS[slug] || {}), ...(extraVariants[slug] || {}) };
    let currentImages = collectionImages;
    let currentIndex = 0;

    const gallery = document.createElement('div');
    gallery.className = 'elios-gallery-v2';
    gallery.innerHTML = `
      <div class="elios-gallery-stage" aria-label="Galerie ${esc(product.name)}">
        <img class="elios-gallery-main" alt="${esc(product.name)}" draggable="false">
        <button class="elios-gallery-nav prev" type="button" aria-label="Image précédente">‹</button>
        <button class="elios-gallery-nav next" type="button" aria-label="Image suivante">›</button>
        <span class="elios-gallery-counter"></span>
      </div>
      <div class="elios-gallery-thumbs" aria-label="Miniatures"></div>
      <div class="elios-gallery-caption">Glissez l'image sur smartphone · cliquez sur les miniatures sur PC</div>
    `;
    oldMainImage.replaceWith(gallery);

    const stage = gallery.querySelector('.elios-gallery-stage');
    const mainImage = gallery.querySelector('.elios-gallery-main');
    const thumbs = gallery.querySelector('.elios-gallery-thumbs');
    const counter = gallery.querySelector('.elios-gallery-counter');
    const prev = gallery.querySelector('.prev');
    const next = gallery.querySelector('.next');

    function safeSetImage(src) {
      mainImage.onerror = () => {
        const fallback = collectionImages.find(x => x !== src);
        mainImage.onerror = null;
        mainImage.src = fallback || 'assets/img/03.png';
      };
      mainImage.src = src || 'assets/img/03.png';
    }

    function render() {
      if (!currentImages.length) currentImages = collectionImages;
      if (currentIndex >= currentImages.length) currentIndex = 0;
      safeSetImage(currentImages[currentIndex]);
      counter.textContent = `${currentIndex + 1} / ${currentImages.length}`;
      prev.hidden = next.hidden = currentImages.length < 2;
      thumbs.hidden = currentImages.length < 2;
      thumbs.innerHTML = currentImages.map((src, i) => `
        <button type="button" class="elios-gallery-thumb ${i === currentIndex ? 'active' : ''}" data-gallery-index="${i}" aria-label="Voir l'image ${i + 1}">
          <img src="${esc(src)}" alt="" loading="lazy" draggable="false">
        </button>
      `).join('');
    }

    function go(delta) {
      if (currentImages.length < 2) return;
      currentIndex = (currentIndex + delta + currentImages.length) % currentImages.length;
      render();
    }

    prev.addEventListener('click', e => { e.stopPropagation(); go(-1); });
    next.addEventListener('click', e => { e.stopPropagation(); go(1); });
    thumbs.addEventListener('click', e => {
      const button = e.target.closest('[data-gallery-index]');
      if (!button) return;
      currentIndex = Number(button.dataset.galleryIndex) || 0;
      render();
    });

    let touchX = null;
    let touchY = null;
    stage.addEventListener('touchstart', e => {
      const t = e.touches[0];
      touchX = t.clientX;
      touchY = t.clientY;
    }, { passive: true });
    stage.addEventListener('touchend', e => {
      if (touchX === null || touchY === null) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchX;
      const dy = t.clientY - touchY;
      touchX = touchY = null;
      if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
    }, { passive: true });

    const headings = [...info.querySelectorAll('h4')];
    const colorHeading = headings.find(h => h.textContent.trim().toLowerCase().startsWith('couleurs'));
    const oldColorChips = colorHeading?.nextElementSibling?.classList.contains('chips') ? colorHeading.nextElementSibling : null;

    if (colorHeading && oldColorChips && Array.isArray(product.colors) && product.colors.length) {
      const colorBox = document.createElement('div');
      colorBox.className = 'elios-variant-colors';
      colorBox.innerHTML = product.colors.map((color, index) => {
        const isVerified = Array.isArray(verified[color]) && verified[color].length;
        return `<button type="button" data-elios-color="${esc(color)}" data-color-index="${index}" class="${isVerified ? 'verified' : ''}" title="${isVerified ? 'Visuels HD vérifiés pour cette couleur' : 'Visuels HD de la collection'}">${esc(color)}</button>`;
      }).join('');
      oldColorChips.replaceWith(colorBox);

      const note = document.createElement('div');
      note.className = 'elios-variant-note';
      note.textContent = 'Choisissez une couleur pour afficher ses visuels lorsqu’ils sont disponibles.';
      colorBox.after(note);

      colorBox.addEventListener('click', e => {
        const button = e.target.closest('[data-elios-color]');
        if (!button) return;
        const selectedColor = button.dataset.eliosColor || '';
        colorBox.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === button));
        const variantImages = verified[selectedColor];
        if (Array.isArray(variantImages) && variantImages.length) {
          currentImages = unique(variantImages);
          note.textContent = `${selectedColor} · visuels HD officiels Elios`;
        } else {
          currentImages = collectionImages;
          note.textContent = `${selectedColor} · visuels HD de la collection`;
        }
        currentIndex = 0;
        render();
      });
    }

    document.addEventListener('keydown', event => {
      if (!modal.classList.contains('open')) return;
      if (event.key === 'ArrowLeft') go(-1);
      if (event.key === 'ArrowRight') go(1);
    }, { once: false });

    card.dataset.galleryEnhanced = id;
    render();
  }

  grid.addEventListener('click', event => {
    const productCard = event.target.closest('[data-id^="elios-"]');
    if (!productCard) return;
    const id = productCard.dataset.id;
    window.setTimeout(() => {
      const modalCard = document.getElementById('product-modal-v2-card');
      if (modalCard) buildGallery(modalCard, id);
    }, 0);
  });
})();