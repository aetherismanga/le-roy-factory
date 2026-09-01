(() => {
  const grid = document.getElementById('partner-products');
  const modal = document.getElementById('product-modal-v2');
  if (!grid || !modal) return;

  const images = window.ELIOS_IMAGE_DATA || {};
  const catalogue = Array.isArray(window.ELIOS_CATALOGUE) ? window.ELIOS_CATALOGUE : [];
  const remote = window.ELIOS_HD_REMOTE || {};

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
    // Même règle pour toutes les collections :
    // 1 visuel officiel HD + uniquement le meilleur visuel local issu du catalogue.
    // Les anciennes petites vignettes compressées ne sont plus envoyées dans la galerie.
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

    const verified = VERIFIED_VARIANTS[slug] || {};
    let currentImages = collectionImages;
    let currentIndex = 0;
    let selectedColor = '';

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
        selectedColor = button.dataset.eliosColor || '';
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
