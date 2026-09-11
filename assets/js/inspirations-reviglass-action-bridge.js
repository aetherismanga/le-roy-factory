(() => {
  'use strict';
  if (window.__LRF_REVIGLASS_ACTION_BRIDGE_20260911_V3__) return;
  window.__LRF_REVIGLASS_ACTION_BRIDGE_20260911_V3__ = true;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];

  function installMobileOrderFix(){
    if($('#reviglass-mobile-order-fix')) return;
    const st=document.createElement('style');
    st.id='reviglass-mobile-order-fix';
    st.textContent=`
      @media(max-width:700px){
        #rev-order .rev-order-shell{overflow:visible!important}
        #rev-order .rev-order-head{
          position:relative!important;
          top:auto!important;
          height:auto!important;
          min-height:0!important;
          padding:18px 82px 20px 18px!important;
          box-sizing:border-box!important;
          overflow:visible!important;
        }
        #rev-order .rev-order-head .eyebrow{font-size:.68rem!important;line-height:1.2!important;margin:0 0 8px!important}
        #rev-order .rev-order-head h2{
          display:block!important;
          position:static!important;
          margin:0!important;
          max-width:100%!important;
          font-size:clamp(1.55rem,7.2vw,2rem)!important;
          line-height:1.08!important;
          white-space:normal!important;
          overflow:visible!important;
          color:#fff!important;
        }
        #rev-order .rev-order-head p{
          display:block!important;
          position:static!important;
          margin:10px 0 0!important;
          max-width:100%!important;
          font-size:.88rem!important;
          line-height:1.35!important;
          white-space:normal!important;
          overflow:visible!important;
          color:#d6d2ca!important;
        }
        #rev-order .rev-order-close{right:14px!important;top:14px!important}
        #rev-order .rev-order-body{
          position:relative!important;
          margin-top:0!important;
          padding:16px 11px 24px!important;
          background:#fbfaf7!important;
        }
        #rev-order .rev-order-lines{margin-top:0!important}
      }
    `;
    document.head.appendChild(st);
  }

  installMobileOrderFix();

  function selectedRef(){
    return $('.reviglass-ref-list .rev-selected-ref')?.textContent?.trim() ||
      $('.rev-ref-choice strong')?.textContent?.replace(/^Référence sélectionnée\s*:\s*/i,'').trim() || '';
  }

  function currentContext(){
    const modal=$('#reviglass-pool-modal');
    const seriesId=modal?.dataset.revSeries||'';
    const sub=$('#reviglass-modal-sub',modal)?.textContent||'';
    const match=sub.match(/Format\s+(.+?)(?:\s*·|$)/i);
    return {modal,seriesId,format:(match?.[1]||'').trim()};
  }

  function dispatchChange(el){
    if(el) el.dispatchEvent(new Event('change',{bubbles:true}));
  }

  function prefillOrder(ref,seriesId,format){
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      const order=$('#rev-order');
      let row=$('.rev-line',order);
      if(!order?.classList.contains('open') || !row){
        if(tries>80) clearInterval(timer);
        return;
      }

      const formatSelect=$('select[data-field="format"]',row);
      if(formatSelect && format){
        const opt=[...formatSelect.options].find(o=>o.value===format || o.textContent.trim()===format);
        if(opt && formatSelect.value!==opt.value){
          formatSelect.value=opt.value;
          dispatchChange(formatSelect);
          return;
        }
      }

      row=$('.rev-line',order);
      const seriesSelect=$('select[data-field="series"]',row);
      if(seriesSelect && seriesId){
        const opt=[...seriesSelect.options].find(o=>o.value===seriesId);
        if(opt && seriesSelect.value!==opt.value){
          seriesSelect.value=opt.value;
          dispatchChange(seriesSelect);
          return;
        }
      }

      row=$('.rev-line',order);
      const refSelect=$('select[data-field="ref"]',row);
      if(refSelect && ref){
        const option=[...refSelect.options].find(o=>o.value===ref || o.textContent.trim()===ref);
        if(option && refSelect.value!==option.value){
          refSelect.value=option.value;
          dispatchChange(refSelect);
          return;
        }
      }

      clearInterval(timer);
      order.scrollTop=0;
      $('#rev-ps-lightbox')?.classList.remove('open');
      $('#reviglass-pool-modal')?.classList.remove('open');
      document.body.style.overflow='hidden';
    },60);
  }

  function openOrder(kind,ref){
    const {seriesId,format}=currentContext();
    const trigger=$(`[data-rev-open="${kind}"]`);
    if(!trigger) return false;
    trigger.click();
    prefillOrder(ref,seriesId,format);
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
    openOrder(kind,ref);
  },true);
})();