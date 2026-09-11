(() => {
  'use strict';
  if (window.__LRF_REVIGLASS_REF_SWIPE_20260911_ALL__) return;
  window.__LRF_REVIGLASS_REF_SWIPE_20260911_ALL__ = true;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  let startX=0,startY=0,dragging=false,pointerId=null;

  function lightbox(){return $('#rev-all-lightbox.open')||$('#rev-ps-lightbox.open')}
  function isOpen(){return !!lightbox()}
  function currentRef(){
    const lb=lightbox();
    if(!lb)return '';
    if(lb.dataset.revRef)return lb.dataset.revRef.trim();
    const counter=$('.rev-all-counter,.rev-ps-counter',lb)?.textContent||'';
    const selected=$('.reviglass-ref-list .rev-selected-ref')?.textContent?.trim()||'';
    return selected || counter.split('·')[0].trim();
  }
  function refs(){
    const all=$$('.reviglass-ref-list span').map(x=>x.textContent.trim()).filter(Boolean);
    return [...new Set(all)];
  }
  function updateBadge(){
    const lb=lightbox();if(!lb)return;
    const ref=currentRef();if(!ref)return;
    if(lb.id==='rev-all-lightbox'){
      lb.dataset.revRef=ref;
      const badge=$('.rev-all-photo-ref',lb);if(badge&&badge.textContent!==ref)badge.textContent=ref;
      return;
    }
    let badge=$('.rev-ps-ref-badge',lb);
    if(!badge){badge=document.createElement('div');badge.className='rev-ps-ref-badge';lb.appendChild(badge)}
    if(badge.textContent!==ref)badge.textContent=ref;
    lb.dataset.revRef=ref;
  }
  function goRef(delta){
    if(!isOpen())return;
    const list=refs(),cur=currentRef();if(!list.length||!cur)return;
    const i=list.findIndex(x=>x.toUpperCase()===cur.toUpperCase());if(i<0)return;
    const next=list[(i+delta+list.length)%list.length];
    const target=$$('.reviglass-ref-list span').find(x=>x.textContent.trim().toUpperCase()===next.toUpperCase());
    if(target){target.click();setTimeout(updateBadge,120)}
  }

  function installStyle(){
    if($('#rev-ref-swipe-style'))return;
    const st=document.createElement('style');st.id='rev-ref-swipe-style';st.textContent=`
      #rev-ps-lightbox,#rev-all-lightbox{cursor:grab}
      #rev-ps-lightbox.dragging,#rev-all-lightbox.dragging{cursor:grabbing}
      .rev-ps-ref-badge{position:fixed;z-index:4;left:22px;top:22px;background:rgba(255,247,218,.96);color:#4e3f13;border:1px solid #d4af37;border-radius:999px;padding:9px 14px;font-size:1rem;font-weight:950;letter-spacing:.04em;box-shadow:0 5px 18px rgba(0,0,0,.18);pointer-events:none}
      @media(max-width:700px){.rev-ps-ref-badge{left:14px;top:14px;font-size:.92rem;padding:8px 12px}}
    `;document.head.appendChild(st)
  }

  document.addEventListener('click',e=>{
    const ref=e.target.closest?.('.reviglass-ref-list span');if(ref)setTimeout(updateBadge,120);
    const nav=e.target.closest?.('.rev-ps-lightbox-nav,.rev-all-nav');
    if(nav&&isOpen()){
      e.preventDefault();e.stopImmediatePropagation();
      goRef(nav.classList.contains('prev')?-1:1);
    }
  },true);

  document.addEventListener('touchstart',e=>{
    if(!isOpen()||e.touches.length!==1)return;
    startX=e.touches[0].clientX;startY=e.touches[0].clientY;
  },true);
  document.addEventListener('touchend',e=>{
    if(!isOpen()||!e.changedTouches?.length)return;
    const dx=e.changedTouches[0].clientX-startX,dy=e.changedTouches[0].clientY-startY;
    if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.2){
      e.preventDefault();e.stopImmediatePropagation();
      goRef(dx<0?1:-1);
    }
  },true);

  document.addEventListener('pointerdown',e=>{
    if(!isOpen()||e.pointerType==='touch'||e.button!==0)return;
    if(e.target.closest('.rev-ps-lightbox-close,.rev-ps-lightbox-nav,.rev-all-close,.rev-all-nav'))return;
    startX=e.clientX;startY=e.clientY;dragging=true;pointerId=e.pointerId;lightbox()?.classList.add('dragging');
  },true);
  document.addEventListener('pointerup',e=>{
    if(!dragging||e.pointerId!==pointerId)return;
    const dx=e.clientX-startX,dy=e.clientY-startY;dragging=false;pointerId=null;lightbox()?.classList.remove('dragging');
    if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.1)goRef(dx<0?1:-1);
  },true);
  document.addEventListener('pointercancel',()=>{dragging=false;pointerId=null;lightbox()?.classList.remove('dragging')},true);

  document.addEventListener('keydown',e=>{
    if(!isOpen())return;
    if(e.key==='ArrowLeft'){e.preventDefault();e.stopImmediatePropagation();goRef(-1)}
    if(e.key==='ArrowRight'){e.preventDefault();e.stopImmediatePropagation();goRef(1)}
  },true);

  installStyle();
})();