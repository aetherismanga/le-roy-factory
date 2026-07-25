document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.nav-container');
  if (!header) return;

  const navUl = header.querySelector('nav ul');
  if (navUl) {
    navUl.classList.add('nav-links');

    if (!document.querySelector('.burger-btn')) {
      const burger = document.createElement('button');
      burger.className = 'burger-btn';
      burger.setAttribute('aria-label', 'Menu');
      burger.innerHTML = '<span></span><span></span><span></span>';
      header.appendChild(burger);

      burger.addEventListener('click', () => {
        navUl.classList.toggle('active');
        burger.classList.toggle('toggle');
      });

      // Fermer le menu au clic sur un lien mobile
      navUl.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          navUl.classList.remove('active');
          burger.classList.remove('toggle');
        });
      });
    }
  }
});
