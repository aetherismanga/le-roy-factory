(() => {
  'use strict';
  const animation=document.getElementById('revi-installer-animation');
  const toggle=document.getElementById('revi-animation-toggle');
  if(animation&&toggle){
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    let playing=false,userPaused=false,inView=false;
    const setPlaying=value=>{
      playing=value;
      animation.src=value?animation.dataset.animation:animation.dataset.poster;
      toggle.textContent=value?'Mettre en pause':'Lire l’animation';
      toggle.setAttribute('aria-pressed',String(value));
    };
    toggle.addEventListener('click',()=>{userPaused=playing;setPlaying(!playing);});
    if('IntersectionObserver' in window){
      new IntersectionObserver(entries=>{
        inView=entries[0].isIntersecting;
        setPlaying(inView&&!userPaused&&!reduced.matches);
      },{threshold:.15}).observe(animation);
    }
    reduced.addEventListener?.('change',()=>setPlaying(inView&&!userPaused&&!reduced.matches));
    document.addEventListener('visibilitychange',()=>setPlaying(!document.hidden&&inView&&!userPaused&&!reduced.matches));
  }

  const main=document.querySelector('[data-revi-collection]');
  if(!main)return;
  const products=window.LRF_REVIGLASS_2026?.products||[];
  const gallery=document.getElementById('revi-product-gallery');
  const dialog=document.getElementById('revi-gallery-dialog');
  let product=products.find(p=>p.id===(main.dataset.reviCollection==='midas'?'midas':'st-01-carrara'));
  if(!product||!gallery||!dialog)return;
  let photoIndex=0,opener=null;
  const norm=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const selectProduct=id=>{
    const next=products.find(p=>p.id===id);
    if(!next||next.id==='midas')return;
    product=next;
    const hero=document.getElementById('revi-collection-hero');
    hero.src=product.hero;hero.alt='Piscine Reviglass '+product.name;
    document.getElementById('revi-variant-title').textContent=product.name;
    document.getElementById('revi-product-source').href=product.source;
    document.querySelectorAll('[data-revi-variant]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.reviVariant===id)));
    gallery.replaceChildren(...product.images.map((image,index)=>{
      const button=document.createElement('button');button.type='button';button.dataset.reviPhoto=String(index);
      button.setAttribute('aria-label',`Agrandir la photo ${index+1} de ${product.name}`);
      const img=document.createElement('img');img.src=image.path;img.alt=product.name+' — '+(image.source.includes('/RV_')?'ambiance piscine':'détail de la mosaïque');img.loading='lazy';img.decoding='async';img.width=700;img.height=525;
      const label=document.createElement('span');label.textContent='Agrandir ↗';button.append(img,label);return button;
    }));
    const url=new URL(location.href);url.searchParams.set('ref',product.name);history.replaceState(null,'',url);
  };
  document.querySelectorAll('[data-revi-variant]').forEach(button=>button.addEventListener('click',()=>selectProduct(button.dataset.reviVariant)));
  const wanted=new URLSearchParams(location.search).get('ref');
  if(wanted&&main.dataset.reviCollection==='s-tones'){
    const requested=products.find(p=>norm(p.name)===norm(wanted)||norm(p.id)===norm(wanted));
    if(requested)selectProduct(requested.id);
  }
  const showPhoto=index=>{
    photoIndex=(index+product.images.length)%product.images.length;
    const image=dialog.querySelector('img');image.src=product.images[photoIndex].path;image.alt=product.name+' — photo '+(photoIndex+1);
    dialog.querySelector('p').textContent=`${product.name} · ${photoIndex+1} / ${product.images.length}`;
  };
  const close=()=>dialog.close();
  gallery.addEventListener('click',event=>{
    const button=event.target.closest('[data-revi-photo]');if(!button)return;
    opener=button;showPhoto(Number(button.dataset.reviPhoto));dialog.showModal();document.body.style.overflow='hidden';dialog.querySelector('.revi-close').focus();
  });
  dialog.querySelector('.revi-close').addEventListener('click',close);
  dialog.querySelector('.revi-prev').addEventListener('click',()=>showPhoto(photoIndex-1));
  dialog.querySelector('.revi-next').addEventListener('click',()=>showPhoto(photoIndex+1));
  dialog.addEventListener('click',event=>{if(event.target===dialog)close();});
  dialog.addEventListener('close',()=>{document.body.style.overflow='';opener?.focus();});
  dialog.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'){event.preventDefault();showPhoto(photoIndex-1);}if(event.key==='ArrowRight'){event.preventDefault();showPhoto(photoIndex+1);}});
  let startX=0,startY=0;
  dialog.addEventListener('touchstart',event=>{if(event.touches.length===1){startX=event.touches[0].clientX;startY=event.touches[0].clientY;}else startX=null;},{passive:true});
  dialog.addEventListener('touchend',event=>{
    if(startX===null||!event.changedTouches.length)return;
    const dx=event.changedTouches[0].clientX-startX,dy=event.changedTouches[0].clientY-startY;
    if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.4)showPhoto(photoIndex+(dx<0?1:-1));startX=null;
  },{passive:true});
})();
