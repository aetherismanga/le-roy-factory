function ensureMobileCss() {
    if (!window.matchMedia('(max-width: 900px)').matches) return;
    const old = document.getElementById('lrf-mobile-enhancements');
    if (old) old.remove();
    const link = document.createElement('link');
    link.id = 'lrf-mobile-enhancements';
    link.rel = 'stylesheet';
    link.href = 'assets/css/mobile-enhancements.css?v=20260817-1935';
    document.head.appendChild(link);
}

ensureMobileCss();

function installProSessionBridge() {
    if (document.getElementById('lrf-pro-session-bridge')) return;
    const script = document.createElement('script');
    script.id = 'lrf-pro-session-bridge';
    script.src = 'assets/js/pro-session-bridge.js?v=20260818b';
    script.defer = true;
    document.head.appendChild(script);
}

function installNeobathDnaTariffFix() {
    if (!window.location.pathname.toLowerCase().endsWith('tarifs-pro.html')) return;

    const patchLink = () => {
        document.querySelectorAll('a[href="assets/pdf/neobathDNA.pdf"]').forEach(link => {
            link.setAttribute('href', 'tarif-neobath-dna.html');
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener');

            const row = link.closest('.pro-info-row');
            if (!row) return;
            const title = row.querySelector('strong');
            const description = row.querySelector('span');
            if (title) title.textContent = 'Tarif DNA';
            if (description) description.textContent = 'Tarif public HT officiel de la gamme DNA.';
        });
    };

    patchLink();
    const grid = document.getElementById('grid-tarifs');
    if (grid && !grid.dataset.dnaTariffObserver) {
        grid.dataset.dnaTariffObserver = '1';
        new MutationObserver(patchLink).observe(grid, { childList: true, subtree: true });
    }
}

function installInspirationsNeobathPdf() {
    const path = window.location.pathname.toLowerCase();
    if (!path.endsWith('univers.html') && path !== '/' && !path.endsWith('/')) return;
    if (!document.getElementById('products-grid')) return;

    const loadHelper = () => {
        if (document.getElementById('lrf-neobath-pdf-helper')) return;
        const helper = document.createElement('script');
        helper.id = 'lrf-neobath-pdf-helper';
        helper.src = 'assets/js/inspirations-pdf-images.js?v=20260818e';
        helper.defer = true;
        document.body.appendChild(helper);
    };

    if (window.pdfjsLib) {
        loadHelper();
        return;
    }

    const existing = document.getElementById('lrf-pdfjs');
    if (existing) {
        existing.addEventListener('load', loadHelper, { once: true });
        return;
    }

    const pdfjs = document.createElement('script');
    pdfjs.id = 'lrf-pdfjs';
    pdfjs.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
    pdfjs.onload = loadHelper;
    pdfjs.onerror = () => console.warn('Impossible de charger PDF.js pour les visuels NEOBATH.');
    document.body.appendChild(pdfjs);
}

installProSessionBridge();

document.addEventListener('DOMContentLoaded', () => {
    const burgerBtn = document.querySelector('.burger-btn');
    const mainNav = document.querySelector('header nav ul');

    if (burgerBtn && mainNav) {
        burgerBtn.addEventListener('click', () => {
            burgerBtn.classList.toggle('active');
            mainNav.classList.toggle('active');
        });

        mainNav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                burgerBtn.classList.remove('active');
                mainNav.classList.remove('active');
            });
        });
    }

    document.addEventListener('click', (e) => {
        const card = e.target.closest('.card-premium, .card, .partner-card, .inspiration-card, .realisation-card, #grid-catalogues > div');
        if (card) {
            document.querySelectorAll('.is-selected').forEach(c => c.classList.remove('is-selected'));
            card.classList.add('is-selected');
        }
    });

    installNeobathDnaTariffFix();
    installInspirationsNeobathPdf();

    if (window.location.pathname.toLowerCase().endsWith('tarifs-pro.html')) {
        import('./tarifs-pro-client-access.js?v=20260817-1720')
            .catch(err => console.error('Erreur chargement accès tarifs PRO client :', err));
    }
});
