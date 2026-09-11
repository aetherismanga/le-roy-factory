(() => {
  'use strict';
  if (window.__LRF_REVIGLASS_PS_GALLERY__) return;
  window.__LRF_REVIGLASS_PS_GALLERY__ = true;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const isRev=()=>norm($('#workspace-title')?.textContent)==='reviglass';

  const GALLERIES={
    'PS25':[
      'https://reviglass.es/wp-content/uploads/2018/11/PS-25web1-1.jpg',
      'https://reviglass.es/wp-content/uploads/2018/11/PS-25web2-1.jpg',
      'https://reviglass.es/wp-content/uploads/2018/11/PS25_03.jpg',
      'https://reviglass.es/wp-content/uploads/2018/11/PS25_04.jpg',
      'https://reviglass.es/wp-content/uploads/2018/11/PS_25_photo.jpg',
      'https://reviglass.es/wp-content/uploads/2018/11/RV_PS25_01.jpg'
    ],
    'PS27':[
      'https://reviglass.es/wp-content/uploads/2018/11/PS-27web1.jpg',
      'https://reviglass.es/wp-content/uploads/2018/11/PS-27web2.jpg',
      'https://reviglass.es/wp-content/uploads/2018/11/PS_27_photo.jpg',
      'https://reviglass.es/wp-content/uploads/2021/06/ps27_01.jpg'
    ],
    'PS53':[
      'https://reviglass.es/wp-content/uploads/2018/11/PS-53web1.jpg',
      'https://reviglass.es/wp-content/uploads/2018/11/PS-53web2.jpg',
      'https://reviglass.es/wp-content/uploads/2018/11/PS_53_photo.jpg'
    ]
  };

  function installStyle(){
    if($('#rev-ps-gallery-style'))return;
    const st=document.createElement('style');st.id='rev-ps-gallery-style';st.textContent=`
      .rev-ps-gallery{margin:14px 0 0;border:1px solid #ddd5c8;border-radius:14px;background:#fff;padding:12px}
      .rev-ps-gallery h3{margin:0 0 8px;font-size:1rem}.rev-ps-gallery small{display:block;color:#746d63;margin-bottom:10px}
      .rev-ps-main{position:relative;overflow:hidden;border-radius:12px;background:#eee;aspect-ratio:4/3;cursor:zoom-in}
      .rev-ps-main img{width:100%;height:100%;object-fit:cover;display:block}
      .rev-ps-main .zoom-hint{position:absolute;right:9px;bottom:9px;background:rgba(0,0,0,.68);color:#fff;border-radius:999px;padding:6px 9px;font-size:.72rem;font-weight:800}
      .rev-ps-thumbs{display:flex;gap:8px;overflow:auto;margin-top:8px;padding-bottom:2px}.rev-ps-thumb{flex:0 0 86px;width:86px;height:66px;border:2px solid transparent;border-radius:9px;overflow:hidden;padding:0;background:#eee}.rev-ps-thumb.active{border-color:#d4af37}.rev-ps-thumb img{width:100%;height:100%;object-fit:cover;display:block}
      .rev-ps-lightbox{position:fixed;inset:0;z-index:1000200;display:none;background:rgba(0,0,0,.96);align-items:center;justify-content:center;overflow:hidden;touch-action:none}.rev-ps-lightbox.open{display:flex}
      .rev-ps-lightbox img{max-width:none;max-height:none;user-select:none;-webkit-user-drag:none;transform-origin:center center;will-change:transform}
      .rev-ps-lightbox-close{position:fixed;top:14px;right:14px;z-index:3;width:48px;height:48px;border-radius:50%;border:1px solid #d4af37;background:#111;color:#fff;font-size:1.8rem}
      .rev-ps-lightbox-nav{position:fixed;top:50%;transform:translateY(-50%);z-index:3;width:48px;height:48px;border-radius:50%;border:1px solid rgba(255,255,255,.5);background:rgba(0,0,0,.55);color:#fff;font-size:2rem}.rev-ps-lightbox-nav.prev{left:14px}.rev-ps-lightbox-nav.next{right:14px}
      .rev-ps-counter{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:3;color:#fff;background:rgba(0,0,0,.55);padding:6px 10px;border-radius:999px;font-size:.78rem}
      @media(max-width:700px){.rev-ps-main{aspect-ratio:1/1}.rev-ps-thumb{flex-basis:72px;width:72px;height:56px}.rev-ps-lightbox-nav{display:none}.rev-ps-lightbox-close{top:10px;right:10px}.rev-ps-lightbox img{max-width:96vw;max-height:86vh}}
    `;document.head.appendChild(st);
  }

  let activeKey='',activeImages=[],activeIndex=0,scale=1,tx=0,ty=0,startDist=0,startScale=1,startX=0,startY=0,startTx=0,startTy=0;

  function galleryFor(ref){return GALLERIES[norm(ref).toUpperCase()]||GALLERIES[norm(ref)]||GALLERIES[String(ref||'').replace(/[^a-z0-9]/gi,'').toUpperCase()]||null}

  function ensureLightbox(){
    let lb=$('#rev-ps-lightbox');if(lb)return lb;
    lb=document.createElement('div');lb.id='rev-ps-lightbox';lb.className='rev-ps-lightbox';lb.innerHTML=`<button class="rev-ps-lightbox-close" type="button">×</button><button class="rev-ps-lightbox-nav prev" type="button">‹</button><img alt="Reviglass HD"><button class="rev-ps-lightbox-nav next" type="button">›</button><div class="rev-ps-counter"></div>`;document.body.appendChild(lb);
    $('.rev-ps-lightbox-close',lb).onclick=closeLightbox;$('.prev',lb).onclick=()=>showLightbox(activeIndex-1);$('.next',lb).onclick=()=>showLightbox(activeIndex+1);
    lb.addEventListener('click',e=>{if(e.target===lb)closeLightbox()});
    lb.addEventListener('wheel',e=>{e.preventDefault();scale=Math.min(5,Math.max(1,scale+(e.deltaY<0?.25:-.25)));applyTransform()}, {passive:false});
    lb.addEventListener('touchstart',onTouchStart,{passive:false});lb.addEventListener('touchmove',onTouchMove,{passive:false});
    return lb;
  }
  function resetTransform(){scale=1;tx=0;ty=0;applyTransform()}
  function applyTransform(){const img=$('#rev-ps-lightbox img');if(img)img.style.transform=`translate(${tx}px,${ty}px) scale(${scale})`}
  function showLightbox(i){if(!activeImages.length)return;activeIndex=(i+activeImages.length)%activeImages.length;const lb=ensureLightbox(),img=$('img',lb);img.src=activeImages[activeIndex];$('.rev-ps-counter',lb).textContent=`${activeIndex+1} / ${activeImages.length}`;resetTransform();lb.classList.add('open');document.body.style.overflow='hidden'}
  function closeLightbox(){$('#rev-ps-lightbox')?.classList.remove('open');document.body.style.overflow=$('#reviglass-pool-modal')?.classList.contains('open')?'hidden':'';resetTransform()}
  function dist(a,b){return Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)}
  function onTouchStart(e){if(e.touches.length===2){startDist=dist(e.touches[0],e.touches[1]);startScale=scale}else if(e.touches.length===1){startX=e.touches[0].clientX;startY=e.touches[0].clientY;startTx=tx;startTy=ty}}
  function onTouchMove(e){e.preventDefault();if(e.touches.length===2&&startDist){scale=Math.min(5,Math.max(1,startScale*dist(e.touches[0],e.touches[1])/startDist));applyTransform()}else if(e.touches.length===1&&scale>1){tx=startTx+e.touches[0].clientX-startX;ty=startTy+e.touches[0].clientY-startY;applyTransform()}}

  function renderGallery(ref){
    const imgs=galleryFor(ref),modal=$('#reviglass-pool-modal');if(!imgs||!modal)return;
    activeKey=ref;activeImages=imgs;
    let box=$('.rev-ps-gallery',modal);if(!box){box=document.createElement('section');box.className='rev-ps-gallery';const action=$('.rev-ref-choice',modal);(action?.parentNode||$('#reviglass-modal-body',modal))?.insertBefore(box,action||null)}
    box.innerHTML=`<h3>Photos HD — ${ref}</h3><small>Photos officielles Reviglass · cliquez pour agrandir. Sur smartphone : pincez pour zoomer.</small><div class="rev-ps-main" data-rev-ps-open="0"><img src="${imgs[0]}" alt="${ref} Reviglass" loading="eager"><span class="zoom-hint">🔍 Agrandir</span></div><div class="rev-ps-thumbs">${imgs.map((u,i)=>`<button type="button" class="rev-ps-thumb${i===0?' active':''}" data-rev-ps-thumb="${i}"><img src="${u}" alt="" loading="lazy"></button>`).join('')}</div>`;
  }

  document.addEventListener('click',e=>{
    if(!isRev())return;
    const ref=e.target.closest('.reviglass-ref-list span');if(ref)setTimeout(()=>renderGallery(ref.textContent.trim()),0);
    const main=e.target.closest('[data-rev-ps-open]');if(main){activeIndex=Number(main.dataset.revPsOpen||0);showLightbox(activeIndex);return}
    const th=e.target.closest('[data-rev-ps-thumb]');if(th){const i=Number(th.dataset.revPsThumb);const box=th.closest('.rev-ps-gallery');const img=$('.rev-ps-main img',box);if(img)img.src=activeImages[i];$$('.rev-ps-thumb',box).forEach((b,j)=>b.classList.toggle('active',j===i));$('.rev-ps-main',box).dataset.revPsOpen=String(i);}
  },true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#rev-ps-lightbox')?.classList.contains('open'))closeLightbox();if($('#rev-ps-lightbox')?.classList.contains('open')&&e.key==='ArrowLeft')showLightbox(activeIndex-1);if($('#rev-ps-lightbox')?.classList.contains('open')&&e.key==='ArrowRight')showLightbox(activeIndex+1)});
  installStyle();
})();