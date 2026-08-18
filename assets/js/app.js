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

document.addEventListener('DOMContentLoaded', () => {
    const burgerBtn = document.querySelector('.burger-btn');
    const mainNav = document.querySelector('header nav ul');

    if (burgerBtn && mainNav) {
        burgerBtn.addEventListener('click', () => {
            burgerBtn.classList.toggle('active');
            mainNav.classList.toggle('active');
        });

        // Fermeture automatique du menu au clic sur un lien mobile
        mainNav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                burgerBtn.classList.remove('active');
                mainNav.classList.remove('active');
            });
        });
    }

    // Gestion de la sélection unique des cartes
    document.addEventListener('click', (e) => {
        const card = e.target.closest('.card-premium, .card, .partner-card, .inspiration-card, .realisation-card, #grid-catalogues > div');
        if (card) {
            document.querySelectorAll('.is-selected').forEach(c => c.classList.remove('is-selected'));
            card.classList.add('is-selected');
        }
    });

    // Corrige uniquement le lien DNA de la page Tarifs NEOBATH.
    // Le catalogue DNA reste disponible séparément dans la page Catalogues.
    installNeobathDnaTariffFix();

    // Accès Tarifs PRO personnalisé par client LRF
    if (window.location.pathname.toLowerCase().endsWith('tarifs-pro.html')) {
        import('./tarifs-pro-client-access.js?v=20260817-1720')
            .catch(err => console.error('Erreur chargement accès tarifs PRO client :', err));
    }
});
