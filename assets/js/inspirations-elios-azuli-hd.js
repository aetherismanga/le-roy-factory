(() => {
  'use strict';

  const ROOT = 'assets/img/elios/azuli-mood/';
  const galleries = {
    Chalk: [ROOT + 'chalk-01.jpg', ROOT + 'chalk-02.jpg'],
    Sand: [ROOT + 'sand-01.jpg', ROOT + 'sand-02.jpg'],
    Bone: [ROOT + 'bone-01.jpg', ROOT + 'bone-02.jpg'],
    'Thyme Green': [ROOT + 'thyme-green-01.jpg', ROOT + 'thyme-green-02.jpg'],
    Burgundy: [ROOT + 'burgundy-01.jpg', ROOT + 'burgundy-02.jpg'],
    'Coffee Bean': [ROOT + 'coffee-bean-01.jpg', ROOT + 'coffee-bean-02.jpg'],
    Blue: [ROOT + 'blue-01.jpg', ROOT + 'blue-02.jpg'],
    'Bottle Green': [ROOT + 'bottle-green-01.jpg', ROOT + 'bottle-green-02.jpg'],
    Turquoise: [ROOT + 'turquoise-01.jpg', ROOT + 'turquoise-02.jpg'],
    Dusk: [ROOT + 'dusk-01.jpg', ROOT + 'dusk-02.jpg'],
    Dawn: [ROOT + 'dawn-01.jpg', ROOT + 'dawn-02.jpg']
  };
  const allImages = Object.values(galleries).flat();

  window.ELIOS_OFFICIAL_GALLERIES = window.ELIOS_OFFICIAL_GALLERIES || {};
  window.ELIOS_OFFICIAL_GALLERIES['azuli-mood'] = allImages;
  window.ELIOS_VERIFIED_VARIANTS = window.ELIOS_VERIFIED_VARIANTS || {};
  window.ELIOS_VERIFIED_VARIANTS['azuli-mood'] = galleries;
  window.ELIOS_IMAGE_DATA = window.ELIOS_IMAGE_DATA || {};
  allImages.forEach((src, i) => { window.ELIOS_IMAGE_DATA[`azuli-mood-hd-${i + 1}`] = src; });
  window.ELIOS_IMAGE_DATA['azuli-mood-1'] = ROOT + 'chalk-01.jpg';

  const refs = [
    ['Bone', '04Q1000', '04Q5500', '04Q1200'],
    ['Bottle Green', '04Q1001', '04Q5501', '04Q1201'],
    ['Burgundy', '04Q1002', '04Q5502', '04Q1202'],
    ['Chalk', '04Q1003', '04Q5503', '04Q1203'],
    ['Coffee Bean', '04Q1004', '04Q5504', '04Q1204'],
    ['Dawn', '04Q1005', '04Q5505', '04Q1205'],
    ['Dusk', '04Q1006', '04Q5506', '04Q1206'],
    ['Sand', '04Q1007', '04Q5507', '04Q1207'],
    ['Thyme Green', '04Q1008', '04Q5508', '04Q1208'],
    ['Turquoise', '04Q1009', '04Q5509', '04Q1209'],
    ['Blue', '04Q1010', '04Q5510', '04Q1210']
  ];

  const catalogue = Array.isArray(window.ELIOS_CATALOGUE) ? window.ELIOS_CATALOGUE : [];
  const product = catalogue.find(p => p && p.slug === 'azuli-mood');
  if (product) {
    product.gallery = allImages.map((_, i) => `azuli-mood-hd-${i + 1}`);
    product.stockRefs = refs.flatMap(([color, r10, r5, rq]) => [
      { color, format: '10x10', ref: r10, pcsBox: 60, sqmBox: 0.60 },
      { color, format: '5x15', ref: r5, pcsBox: 66, sqmBox: 0.50 },
      { color, format: 'Quarter round 1,2x20', ref: rq, pcsBox: 22, sqmBox: 0.05 }
    ]);
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function isAzuliModal(box) {
    return /azuli\s*mood/i.test(box?.querySelector('h2')?.textContent || '');
  }

  function enhanceReferenceBlock() {
    const box = document.getElementById('product-modal-v2-card');
    if (!box || !isAzuliModal(box)) return;
    const info = box.querySelector('.modal-v2-info');
    if (!info) return;

    let block = info.querySelector('[data-azuli-stock-block]');
    if (!block) {
      block = document.createElement('div');
      block.dataset.azuliStockBlock = '1';
      info.appendChild(block);
    }
    if (block.dataset.azuliComplete === '1') return;
    block.dataset.azuliComplete = '1';
    block.style.cssText = 'margin-top:1rem;padding:12px;border:1px solid #e5e2da;border-radius:12px;background:#fffdf9;overflow:hidden';

    const rows = refs.map(([color, r10, r5, rq]) => `
      <tr>
        <td style="padding:7px 6px;border-bottom:1px solid #ece8df;white-space:nowrap">${esc(color)}</td>
        <td style="padding:7px 6px;border-bottom:1px solid #ece8df;text-align:center"><strong>${r10}</strong></td>
        <td style="padding:7px 6px;border-bottom:1px solid #ece8df;text-align:center"><strong>${r5}</strong></td>
        <td style="padding:7px 6px;border-bottom:1px solid #ece8df;text-align:center">${rq}</td>
      </tr>`).join('');

    block.innerHTML = `
      <h4 style="margin:.05rem 0 .45rem">Références catalogue / stock</h4>
      <div style="overflow-x:auto;-webkit-overflow-scrolling:touch">
        <table style="width:100%;border-collapse:collapse;font-size:.78rem;min-width:500px">
          <thead><tr><th style="padding:7px 6px;text-align:left">Couleur</th><th>10x10</th><th>5x15</th><th>1,2x20</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p style="margin:.7rem 0 .35rem;font-size:.76rem;color:#6c746f">Conditionnement : 10x10 = 60 pièces / 0,60 m² · 5x15 = 66 pièces / 0,50 m² · Quarter round 1,2x20 = 22 pièces.</p>
      <details style="margin:.45rem 0 .75rem">
        <summary style="cursor:pointer;font-weight:700">Mosaïques Azuli Mood</summary>
        <div style="margin-top:.5rem;font-size:.76rem;line-height:1.6">
          <strong>Cassettone 30,3x30,3 :</strong> 04QH100 Bone–Coffee Bean · 04QH101 Thyme Green–Bottle Green · 04QH102 Turquoise–Blue · 04QH103 Sand–Burgundy<br>
          <strong>Ottagona 30,5x27,2 :</strong> 04QH104 Bone–Coffee Bean · 04QH105 Thyme Green–Bottle Green · 04QH106 Turquoise–Blue · 04QH107 Sand–Burgundy<br>
          <strong>Losanghe 23,4x23,4 :</strong> 04QH108 Bone–Dusk · 04QH109 Chalk–Dawn
        </div>
      </details>
      <div style="display:flex;gap:.55rem;flex-wrap:wrap">
        <a class="pro-link" href="disponibilites-elios-lot1.html?collection=azuli-mood">Vérifier le stock</a>
        <a class="pro-link" href="assets/pdf/AZULI-MOOD_new.pdf" target="_blank" rel="noopener">Ouvrir le catalogue Azuli Mood</a>
      </div>`;
  }

  function install() {
    const box = document.getElementById('product-modal-v2-card');
    if (box) new MutationObserver(() => setTimeout(enhanceReferenceBlock, 0)).observe(box, { childList: true, subtree: true });
    document.addEventListener('click', event => {
      if (event.target.closest?.('.product-card-v2[data-id="elios-azuli-mood"]')) setTimeout(enhanceReferenceBlock, 30);
    });
    setTimeout(enhanceReferenceBlock, 0);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();