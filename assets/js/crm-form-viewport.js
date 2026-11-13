// Keep the editor and its actions inside Safari's visual viewport when typing.
(() => {
  const install = () => {
    const modals = [...document.querySelectorAll('#cr-modal, #client-modal')];
    if (!modals.length) return;
    const viewport = window.visualViewport;
    const refresh = () => {
      let open = false;
      for (const modal of modals) {
        if (getComputedStyle(modal).display === 'none') continue;
        open = true;
        modal.style.setProperty('--crm-viewport-height', `${viewport?.height || window.innerHeight}px`);
        modal.style.setProperty('--crm-viewport-top', `${viewport?.offsetTop || 0}px`);
      }
      document.body.classList.toggle('crm-editor-open', open);
    };
    // Only observe visibility: our viewport style writes must not loop.
    const observer = new MutationObserver(records => {
      if (records.some(record => (record.oldValue || '').match(/display\s*:\s*([^;]+)/)?.[1] !== record.target.style.display)) refresh();
    });
    modals.forEach(modal => observer.observe(modal, {attributes:true, attributeFilter:['style'], attributeOldValue:true}));
    viewport?.addEventListener('resize', refresh);
    viewport?.addEventListener('scroll', refresh);
    window.addEventListener('resize', refresh);
    refresh();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
})();
