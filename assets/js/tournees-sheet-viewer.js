const $ = (s) => document.querySelector(s);

let overlay = null;
let placeholder = null;
let resultSection = null;
let originalPrintLabel = '';

function addStyles() {
  if ($('#tour-sheet-viewer-style')) return;
  const style = document.createElement('style');
  style.id = 'tour-sheet-viewer-style';
  style.textContent = `
    #tour-route-sheet-overlay {
      position: fixed;
      inset: 0;
      z-index: 99999;
      background: rgba(12, 12, 12, .72);
      backdrop-filter: blur(7px);
      -webkit-backdrop-filter: blur(7px);
      padding: 28px;
      overflow: auto;
      overscroll-behavior: contain;
    }
    .tour-sheet-shell {
      position: relative;
      width: min(1500px, 100%);
      margin: 0 auto;
      background: #fdf9f1;
      border: 1px solid rgba(201, 158, 45, .55);
      border-radius: 22px;
      box-shadow: 0 28px 80px rgba(0,0,0,.35);
      padding: 18px;
      min-height: calc(100vh - 56px);
    }
    .tour-sheet-close {
      position: sticky;
      top: 0;
      margin-left: auto;
      z-index: 100005;
      width: 48px;
      height: 48px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      border: 2px solid #d7aa32;
      background: #111;
      color: #f6c943;
      font-size: 31px;
      line-height: 1;
      font-weight: 400;
      cursor: pointer;
      box-shadow: 0 8px 20px rgba(0,0,0,.25);
    }
    .tour-sheet-close:hover {
      transform: scale(1.06);
      background: #242424;
    }
    #tour-route-sheet-overlay .tour-result {
      width: 100%;
      max-width: none;
      margin: 0;
      box-shadow: none;
      border: 0;
      background: transparent;
    }
    #tour-route-sheet-overlay .tour-saved {
      display: none !important;
    }
    #tour-route-sheet-overlay #tour-save {
      display: none !important;
    }
    body.tour-sheet-open {
      overflow: hidden !important;
    }
    @media (max-width: 720px) {
      #tour-route-sheet-overlay { padding: 8px; }
      .tour-sheet-shell {
        padding: 10px;
        border-radius: 14px;
        min-height: calc(100vh - 16px);
      }
      .tour-sheet-close {
        width: 44px;
        height: 44px;
        font-size: 28px;
      }
    }
    @media print {
      body > *:not(#tour-route-sheet-overlay) { display: none !important; }
      #tour-route-sheet-overlay {
        position: static !important;
        inset: auto !important;
        padding: 0 !important;
        background: #fff !important;
        overflow: visible !important;
      }
      .tour-sheet-shell {
        width: 100% !important;
        min-height: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        box-shadow: none !important;
        background: #fff !important;
      }
      .tour-sheet-close { display: none !important; }
    }
  `;
  document.head.appendChild(style);
}

function openSheet() {
  if (overlay) return;
  resultSection = $('.tour-result');
  const printBtn = $('#tour-print');
  if (!resultSection || !printBtn || printBtn.disabled) return;

  placeholder = document.createComment('tour-result-placeholder');
  resultSection.parentNode.insertBefore(placeholder, resultSection);

  overlay = document.createElement('div');
  overlay.id = 'tour-route-sheet-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Feuille de route');

  const shell = document.createElement('div');
  shell.className = 'tour-sheet-shell';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'tour-sheet-close';
  closeBtn.setAttribute('aria-label', 'Fermer la feuille de route');
  closeBtn.title = 'Fermer';
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', closeSheet);

  shell.appendChild(closeBtn);
  shell.appendChild(resultSection);
  overlay.appendChild(shell);
  document.body.appendChild(overlay);
  document.body.classList.add('tour-sheet-open');

  originalPrintLabel = printBtn.textContent;
  printBtn.textContent = '🖨 Imprimer';

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeSheet();
  });

  setTimeout(() => {
    closeBtn.focus();
    window.dispatchEvent(new Event('resize'));
  }, 60);
}

function closeSheet() {
  if (!overlay) return;
  const printBtn = $('#tour-print');

  if (placeholder?.parentNode && resultSection) {
    placeholder.parentNode.insertBefore(resultSection, placeholder);
    placeholder.remove();
  }

  overlay.remove();
  overlay = null;
  placeholder = null;
  document.body.classList.remove('tour-sheet-open');

  if (printBtn && originalPrintLabel) printBtn.textContent = originalPrintLabel;
  originalPrintLabel = '';

  setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
}

function handlePrintButton(event) {
  const btn = event.target.closest('#tour-print');
  if (!btn) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  if (overlay) {
    window.print();
  } else {
    openSheet();
  }
}

function init() {
  addStyles();
  document.addEventListener('click', handlePrintButton, true);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && overlay) closeSheet();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
