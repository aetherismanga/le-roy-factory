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

    // Accès Tarifs PRO personnalisé par client LRF
    if (window.location.pathname.toLowerCase().endsWith('tarifs-pro.html')) {
        import('./tarifs-pro-client-access.js?v=20260817-1720')
            .catch(err => console.error('Erreur chargement accès tarifs PRO client :', err));
    }
});
