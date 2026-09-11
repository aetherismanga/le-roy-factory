(() => {
  'use strict';
  if (window.__LRF_ELIOS_ORDER_MOBILE_SCROLL_FIX__) return;
  window.__LRF_ELIOS_ORDER_MOBILE_SCROLL_FIX__ = true;

  const style = document.createElement('style');
  style.id = 'elios-order-mobile-scroll-fix-style';
  style.textContent = `
    @media (max-width:700px){
      .order-overlay.open,.order-review-overlay.open{
        display:block!important;
        position:fixed!important;
        inset:0!important;
        width:100%!important;
        height:100dvh!important;
        overflow-y:auto!important;
        overflow-x:hidden!important;
        -webkit-overflow-scrolling:touch!important;
        overscroll-behavior:contain!important;
        touch-action:pan-y!important;
        padding:0!important;
        align-items:initial!important;
        justify-content:initial!important;
      }
      .order-modal,.order-review-modal{
        width:100%!important;
        max-width:none!important;
        min-height:100dvh!important;
        height:auto!important;
        max-height:none!important;
        overflow:visible!important;
        border:0!important;
        border-radius:0!important;
        margin:0!important;
        padding-bottom:calc(26px + env(safe-area-inset-bottom))!important;
      }
      .order-actions,.order-review-actions{
        position:static!important;
        bottom:auto!important;
        margin-top:18px!important;
        padding:12px 0 calc(8px + env(safe-area-inset-bottom))!important;
        background:#fff!important;
      }
      .order-send,.order-review-confirm{
        min-height:50px!important;
        font-size:1rem!important;
      }
    }
  `;
  document.head.appendChild(style);

  const resetScroll = node => {
    if (!node || !node.classList.contains('open')) return;
    requestAnimationFrame(() => { node.scrollTop = 0; });
  };

  const watch = () => {
    ['order-overlay','order-review-overlay'].forEach(id => {
      const node = document.getElementById(id);
      if (!node || node.dataset.mobileScrollFix === '1') return;
      node.dataset.mobileScrollFix = '1';
      let wasOpen = node.classList.contains('open');
      const observer = new MutationObserver(() => {
        const isOpen = node.classList.contains('open');
        if (isOpen && !wasOpen) resetScroll(node);
        wasOpen = isOpen;
      });
      observer.observe(node, { attributes:true, attributeFilter:['class'] });
      if (wasOpen) resetScroll(node);
    });
  };

  const observer = new MutationObserver(watch);
  const start = () => {
    watch();
    observer.observe(document.body, { childList:true, subtree:true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
