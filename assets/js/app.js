document.addEventListener('DOMContentLoaded', () => {
  const burgerBtn = document.querySelector('.burger-btn');
  const navUl = document.querySelector('header nav ul');

  if (burgerBtn && navUl) {
    burgerBtn.addEventListener('click', () => {
      navUl.classList.toggle('active');
      burgerBtn.classList.toggle('toggle');

      if (navUl.classList.contains('active')) {
        navUl.style.setProperty('display', 'flex', 'important');
        navUl.style.setProperty('flex-direction', 'column', 'important');
        navUl.style.setProperty('position', 'absolute', 'important');
        navUl.style.setProperty('top', '100%', 'important');
        navUl.style.setProperty('left', '0', 'important');
        navUl.style.setProperty('width', '100%', 'important');
        navUl.style.setProperty('background', '#ffffff', 'important');
        navUl.style.setProperty('padding', '2rem', 'important');
        navUl.style.setProperty('box-shadow', '0 10px 25px rgba(0,0,0,0.15)', 'important');
        navUl.style.setProperty('z-index', '1000', 'important');
        navUl.style.setProperty('gap', '1rem', 'important');
      } else {
        navUl.style.cssText = '';
      }
    });

    navUl.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navUl.classList.remove('active');
        burgerBtn.classList.remove('toggle');
        navUl.style.cssText = '';
      });
    });
  }
});
