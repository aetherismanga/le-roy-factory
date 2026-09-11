(() => {
  'use strict';
  if (window.__LRF_REVIGLASS_ACTION_BRIDGE_20260911__) return;
  window.__LRF_REVIGLASS_ACTION_BRIDGE_20260911__ = true;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];

  function selectedRef(){
    return $('.reviglass-ref-list .rev-selected-ref')?.textContent?.trim() ||
      $('.rev-ref-choice strong')?.textContent?.replace(/^Référence sélectionnée\s*:\s*/i,'').trim() || '';
  }

  function openNative(kind, ref){
    const modal=$('#reviglass-pool-modal');
    if(!modal) return false;
    const native=$(`[data-rev-modal-action="${kind}"]`, modal);
    if(!native) return false;
    native.click();

    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      const order=$('#rev-order');
      const row=$('.rev-line',order);
      if(order?.classList.contains('open') && row){
        const refSelect=$('select[data-field="ref"]',row);
        if(refSelect && ref){
          const option=[...refSelect.options].find(o=>o.value===ref || o.textContent.trim()===ref);
          if(option){
            refSelect.value=option.value;
            refSelect.dispatchEvent(new Event('change',{bubbles:true}));
          }
        }
        clearInterval(timer);
        order.scrollTop=0;
        $('#rev-ps-lightbox')?.classList.remove('open');
      }
      if(tries>40) clearInterval(timer);
    },50);
    return true;
  }

  document.addEventListener('click',e=>{
    const button=e.target.closest?.('[data-rev-ref-jump]');
    if(!button) return;
    const kind=button.dataset.revRefJump;
    if(kind!=='order' && kind!=='availability') return;
    const ref=selectedRef();
    e.preventDefault();
    e.stopImmediatePropagation();
    openNative(kind,ref);
  },true);
})();