document.addEventListener('DOMContentLoaded', () => {
  const burgerBtn = document.querySelector('.burger-btn');
  const navUl = document.querySelector('header nav ul');

  if (burgerBtn && navUl) {
    burgerBtn.addEventListener('click', () => {
      navUl.classList.toggle('active');
      burgerBtn.classList.toggle('toggle');
    });

    // Fermer le menu automatiquement au clic sur un lien (sur mobile)
    navUl.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navUl.classList.remove('active');
        burgerBtn.classList.remove('toggle');
      });
    });
  }
});
