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
});
