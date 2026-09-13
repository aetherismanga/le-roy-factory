(() => {
  'use strict';
  if (window.__LRF_BIOPIETRA_SERIES_MEDIA_V1__) return;
  window.__LRF_BIOPIETRA_SERIES_MEDIA_V1__ = true;

  const LOGO = 'assets/img/biopietra.png';
  const norm = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  const img = (url, label) => ({ url, label });

  // Visuels officiels Biopietra, déclarés en dur pour ne plus dépendre
  // de la recherche WordPress à chaque ouverture de fiche sur mobile.
  const MEDIA = {
    'acropoli': [
      img('https://biopietra.com/wp-content/uploads/2016/08/Acropoli-M96-Torre-870x870.jpg', 'Acropoli · M96'),
      img('https://biopietra.com/wp-content/uploads/2016/08/acropoli_A_2677-870x870.jpg', 'Acropoli · ambiance'),
      img('https://biopietra.com/wp-content/uploads/2024/07/Acropoli-B81_min-964x640.jpg', 'Acropoli · B81')
    ],
    'bergamo mix ber': [
      img('https://biopietra.com/wp-content/uploads/2016/08/Bergamo-B80-torre-870x870.jpg', 'Bergamo · B80')
    ],
    'brick design': [
      img('https://biopietra.com/wp-content/uploads/2023/12/Brick-Design-G88-Torre-870x870.jpg', 'Brick Design · G88'),
      img('https://biopietra.com/wp-content/uploads/2016/08/Listone-agata-Torre-870x870.jpg', 'Brick Design · Agata'),
      img('https://biopietra.com/wp-content/uploads/2016/08/Listone-rosso-vintage-Torre-870x870.jpg', 'Brick Design · Rosso Vintage')
    ],
    'ciottolo river mix cio': [
      img('https://biopietra.com/wp-content/uploads/2023/12/Ciottolo-River-Torre-870x870.jpg', 'Ciottolo River · Torre'),
      img('https://biopietra.com/wp-content/uploads/2016/08/cittoloriver-870x870.jpg', 'Ciottolo River · Mix'),
      img('https://biopietra.com/wp-content/uploads/2016/08/ciottolo_D98H0199-870x870.jpg', 'Ciottolo River · Quarzo')
    ],
    'credaro mix cre': [
      img('https://biopietra.com/wp-content/uploads/2016/08/Credaro-B82-Torre-870x870.jpg', 'Credaro · B82'),
      img('https://biopietra.com/wp-content/uploads/2016/08/Credaro-B80-Torre-870x870.jpg', 'Credaro · B80'),
      img('https://biopietra.com/wp-content/uploads/2022/09/Credaro-Mix-1-870x870.jpg', 'Credaro · Mix CRE 01'),
      img('https://biopietra.com/wp-content/uploads/2022/09/Credaro-O91-870x870.jpg', 'Credaro · O91'),
      img('https://biopietra.com/wp-content/uploads/2022/09/Credaro-C54-4-870x870.jpg', 'Credaro · C54 Beige')
    ],
    'listello liguria': [
      img('https://biopietra.com/wp-content/uploads/2016/08/Liguria-Rosso-Vintage-Torre-870x870.jpg', 'Listello Liguria · Rosso Vintage')
    ],
    'listello mattone antico': [
      img('https://biopietra.com/wp-content/uploads/2024/02/Listello-Mattone-Antico-Rosso-Vintage-San-Gregorio-870x870.jpeg', 'Mattone Antico · Rosso Vintage'),
      img('https://biopietra.com/wp-content/uploads/2023/10/Mattone-Antico-Mix-Beige_65-C58_35-stucco-GS-Corcagnano-2-870x870.jpg', 'Mattone Antico · Beige / C58'),
      img('https://biopietra.com/wp-content/uploads/2023/10/Mattone-Antico-Mix-Beige_65-C58_35-stucco-GS-Corcagnano-7-870x870.jpg', 'Mattone Antico · Mix'),
      img('https://biopietra.com/wp-content/uploads/2016/08/listellomattoneantico-870x870.jpg', 'Listello Mattone Antico · Bianco')
    ],
    'listello toscana 1 5 cm': [
      img('https://biopietra.com/wp-content/uploads/2016/08/Toscana-Bianco-3cm-Torre-870x870.jpg', 'Listello Toscana · Bianco'),
      img('https://biopietra.com/wp-content/uploads/2016/08/Toscana-Rosso-Torre-870x870.jpg', 'Listello Toscana · Rosso'),
      img('https://biopietra.com/wp-content/uploads/2016/08/Toscana-C58-Cromite-Torre-870x870.jpg', 'Listello Toscana · C58 Cromite'),
      img('https://biopietra.com/wp-content/uploads/2016/08/listello_toscana__0030-870x870.jpg', 'Listello Toscana · ambiance'),
      img('https://biopietra.com/wp-content/uploads/2016/08/ListTosc_IMGL9986-870x870.jpg', 'Listello Toscana · Beige'),
      img('https://biopietra.com/wp-content/uploads/2016/08/listellotoscana-870x870.jpg', 'Listello Toscana · Cenere')
    ],
    'listello toscana 3 cm': [
      img('https://biopietra.com/wp-content/uploads/2016/08/Toscana-Bianco-3cm-Torre-870x870.jpg', 'Listello Toscana 3 cm · Bianco'),
      img('https://biopietra.com/wp-content/uploads/2016/08/Toscana-Rosso-Torre-870x870.jpg', 'Listello Toscana · Rosso'),
      img('https://biopietra.com/wp-content/uploads/2016/08/Toscana-C58-Cromite-Torre-870x870.jpg', 'Listello Toscana · C58 Cromite'),
      img('https://biopietra.com/wp-content/uploads/2016/08/listello_toscana__0030-870x870.jpg', 'Listello Toscana · ambiance')
    ],
    'composizioni': [
      img('https://biopietra.com/wp-content/uploads/2023/01/Livorno-F3-M-G-P-870x870.jpeg', 'Composizioni Biopietra · Livorno')
    ],
    'ortisei mix ort': [
      img('https://biopietra.com/wp-content/uploads/2024/01/Ortisei-B82-Motta-Visconti-9-870x870.jpg', 'Ortisei · B82'),
      img('https://biopietra.com/wp-content/uploads/2016/07/Ortisei-M96-Inserto-B80-6-870x870.jpg', 'Ortisei · M96 + B80'),
      img('https://biopietra.com/wp-content/uploads/2016/07/Mix-ortisei-B82-O91-870x870.jpg', 'Ortisei · Mix ORT 17'),
      img('https://biopietra.com/wp-content/uploads/2019/09/Ortisei-B82-a-secco-870x870.jpg', 'Ortisei · B82 pose à sec'),
      img('https://biopietra.com/wp-content/uploads/2019/09/Ortisei-O91-870x870.jpg', 'Ortisei · O91'),
      img('https://biopietra.com/wp-content/uploads/2019/09/MIX-ORT-18-870x870.jpg', 'Ortisei · Mix ORT 18')
    ],
    'roccia mix roc': [
      img('https://biopietra.com/wp-content/uploads/2016/07/Roccia-M92-Torre-870x870.jpg', 'Roccia · M92'),
      img('https://biopietra.com/wp-content/uploads/2016/07/Roccia-V1-1-870x870.jpg', 'Roccia · V1'),
      img('https://biopietra.com/wp-content/uploads/2016/07/roccia2-870x870.jpg', 'Roccia · C54 Beige'),
      img('https://biopietra.com/wp-content/uploads/2016/07/roccia_edificstorici_0029_dopo-870x870.jpg', 'Roccia · réalisation')
    ],
    'roma': [
      img('https://biopietra.com/wp-content/uploads/2021/12/quarzo-870x870.jpg', 'Roma · Quarzo'),
      img('https://biopietra.com/wp-content/uploads/2021/12/ardesia-870x870.jpg', 'Roma · Ardesia')
    ],
    'scaglia carsica': [
      img('https://biopietra.com/wp-content/uploads/2016/07/Scaglia-Carsica-Granito-Gussago_5-870x870.jpeg', 'Scaglia Carsica · Granito'),
      img('https://biopietra.com/wp-content/uploads/2016/07/Scaglia-Carsica-Cromo-Usmate-Velate-3-870x870.jpg', 'Scaglia Carsica · Cromo'),
      img('https://biopietra.com/wp-content/uploads/2016/08/Scaglia-Carsica-Grigio-2-4-870x870.jpg', 'Scaglia Carsica · Melange'),
      img('https://biopietra.com/wp-content/uploads/2016/08/Scaglia-Carsica-Arena-3-870x870.jpg', 'Scaglia Carsica · Arena'),
      img('https://biopietra.com/wp-content/uploads/2016/08/Scaglia-Carsica-Grigio-8-870x870.jpg', 'Scaglia Carsica · Grigio')
    ],
    'scaglia marmolada': [
      img('https://biopietra.com/wp-content/uploads/2016/08/Marmolada-O91-Torre-870x870.jpg', 'Scaglia Marmolada · O91'),
      img('https://biopietra.com/wp-content/uploads/2016/08/Marmolada-Quarzo-Torre-870x870.jpg', 'Scaglia Marmolada · Quarzo'),
      img('https://biopietra.com/wp-content/uploads/2016/07/Scaglia-Marmolada-C58-Cromite-Casalgrande-1-870x870.jpg', 'Scaglia Marmolada · C58 Cromite'),
      img('https://biopietra.com/wp-content/uploads/2016/07/Marmolada-C58-Senza-Sfumature-2-870x870.jpg', 'Scaglia Marmolada · C58')
    ],
    'scaglia montebello': [
      img('https://biopietra.com/wp-content/uploads/2016/08/montebelloscaglia_quarzo_0017palazzo-870x870.jpg', 'Scaglia Montebello · Quarzo'),
      img('https://biopietra.com/wp-content/uploads/2016/08/montebelloscaglia_C58cromite_0009amb-870x870.jpg', 'Scaglia Montebello · C58 Cromite')
    ],
    'sierra nevada mix sie': [
      img('https://biopietra.com/wp-content/uploads/2016/08/Sierra-M96-Torre-870x870.jpg', 'Sierra Nevada · M96')
    ],
    'spaccatello mix spc': [
      img('https://biopietra.com/wp-content/uploads/2022/04/Spaccatello-Torre-870x870.jpg', 'Spaccatello · ambiance')
    ],
    'stelvio mix ste': [
      img('https://biopietra.com/wp-content/uploads/2016/08/Stelvio-B80-Torre-870x870.jpg', 'Stelvio · B80')
    ],
    'travertino': [
      img('https://biopietra.com/wp-content/uploads/2023/02/Travertino-Naturale-870x870.png', 'Travertino · Naturale')
    ]
  };

  window.LRF_BIOPIETRA_SERIES_MEDIA = MEDIA;

  const SEARCH_TO_SERIES = {
    'acropoli': 'acropoli',
    'bergamo': 'bergamo mix ber',
    'brick design': 'brick design',
    'ciottolo river': 'ciottolo river mix cio',
    'credaro': 'credaro mix cre',
    'listello liguria': 'listello liguria',
    'mattone antico': 'listello mattone antico',
    'listello toscana': 'listello toscana 1 5 cm',
    'biopietra mix': 'composizioni',
    'ortisei': 'ortisei mix ort',
    'roccia': 'roccia mix roc',
    'roma biopietra': 'roma',
    'roma': 'roma',
    'scaglia carsica': 'scaglia carsica',
    'scaglia marmolada': 'scaglia marmolada',
    'scaglia montebello': 'scaglia montebello',
    'sierra nevada': 'sierra nevada mix sie',
    'spaccatello': 'spaccatello mix spc',
    'stelvio': 'stelvio mix ste',
    'travertino biopietra': 'travertino',
    'travertino': 'travertino'
  };

  // Le moteur de galerie historique attend une réponse de l'API média WordPress.
  // On lui sert les visuels officiels ci-dessus localement : pas de recherche distante,
  // donc moins de requêtes, moins de mémoire et aucun blocage lié à CORS / API.
  if (!window.__LRF_BIOPIETRA_STATIC_MEDIA_FETCH__ && typeof window.fetch === 'function') {
    window.__LRF_BIOPIETRA_STATIC_MEDIA_FETCH__ = true;
    const nativeFetch = window.fetch.bind(window);
    window.fetch = function(input, init) {
      try {
        const raw = typeof input === 'string' ? input : input?.url;
        if (raw && /biopietra\.com\/wp-json\/wp\/v2\/media/i.test(raw)) {
          const url = new URL(raw, location.href);
          const search = norm(url.searchParams.get('search'));
          let key = SEARCH_TO_SERIES[search];
          if (!key) {
            key = Object.keys(SEARCH_TO_SERIES).find(alias => search.includes(alias) || alias.includes(search));
            key = key ? SEARCH_TO_SERIES[key] : null;
          }
          const items = key ? MEDIA[key] : null;
          if (items?.length) {
            const payload = items.map((item, index) => ({
              id: 900000 + index,
              source_url: item.url,
              media_details: {
                sizes: {
                  full: { source_url: item.url },
                  large: { source_url: item.url }
                }
              },
              title: { rendered: item.label },
              caption: { rendered: item.label },
              description: { rendered: '' }
            }));
            return Promise.resolve(new Response(JSON.stringify(payload), {
              status: 200,
              headers: { 'Content-Type': 'application/json; charset=utf-8' }
            }));
          }
        }
      } catch (_) {}
      return nativeFetch(input, init);
    };
  }

  function isBiopietraWorkspace() {
    return norm(document.querySelector('#workspace-title')?.textContent) === 'biopietra';
  }

  function patchCards() {
    if (!isBiopietraWorkspace()) return;
    document.querySelectorAll('#partner-products .bio-card[data-bio-name]').forEach(card => {
      const name = card.dataset.bioName || '';
      const key = norm(name);
      const items = MEDIA[key];
      if (!items?.length) return;
      const image = card.querySelector('.bio-card-top img');
      if (!image || image.dataset.bioSeriesMedia === key) return;
      image.dataset.bioSeriesMedia = key;
      image.classList.add('bio-series-card-image');
      image.alt = `${name} · Biopietra`;
      image.loading = 'lazy';
      image.decoding = 'async';
      image.onerror = () => {
        image.onerror = null;
        image.classList.remove('bio-series-card-image');
        image.src = LOGO;
      };
      image.src = items[0].url;
    });
  }

  function installStyle() {
    if (document.getElementById('lrf-biopietra-series-media-style')) return;
    const style = document.createElement('style');
    style.id = 'lrf-biopietra-series-media-style';
    style.textContent = `
      .bio-card-top img.bio-series-card-image{
        object-fit:cover!important;
        object-position:center!important;
        padding:0!important;
        background:#eee9df!important;
      }
    `;
    document.head.appendChild(style);
  }

  function cleanDuplicateGalleries() {
    document.querySelectorAll('.bio-modal.open').forEach(modal => {
      if (modal.querySelector('.bio-gallery-main')) {
        modal.querySelectorAll('.bio-safe-gallery,.bio-b2-gallery').forEach(node => node.remove());
      }
    });
  }

  function init() {
    installStyle();
    patchCards();
    window.addEventListener('lrf-biopietra-rerendered', () => setTimeout(patchCards, 0));
    document.addEventListener('click', event => {
      if (event.target.closest?.('.bio-card') || event.target.closest?.('#partner-grid')) {
        setTimeout(patchCards, 80);
        setTimeout(cleanDuplicateGalleries, 350);
      }
    }, false);

    const host = document.querySelector('#partner-products');
    if (host) {
      new MutationObserver(() => patchCards()).observe(host, { childList: true, subtree: true });
    }
    const modal = document.querySelector('#biopietra-modal');
    if (modal) {
      new MutationObserver(() => setTimeout(cleanDuplicateGalleries, 0)).observe(modal, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();