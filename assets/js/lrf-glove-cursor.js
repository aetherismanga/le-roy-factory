(() => {
  'use strict';

  // Curseur personnalisé désactivé : on laisse le navigateur gérer
  // son curseur natif (flèche, main sur les liens, curseur texte, etc.).
  const restoreNativeCursor = () => {
    document.documentElement.classList.remove('lrf-glove-cursor-ready');

    const customCursor = document.getElementById('lrf-glove-cursor');
    if (customCursor) customCursor.remove();

    const customStyle = document.getElementById('lrf-glove-cursor-style');
    if (customStyle) customStyle.remove();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restoreNativeCursor, { once: true });
  } else {
    restoreNativeCursor();
  }
})();
