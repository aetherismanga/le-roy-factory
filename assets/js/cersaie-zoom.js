(() => {
  'use strict';
  const style=document.createElement('style');
  style.textContent=`
    .cersaie26-card img{height:auto!important;max-height:none!important;cursor:zoom-in!important;image-rendering:auto!important}
    .cersaie26-card{overflow:visible!important}
    .cersaie26-zoom{position:fixed;inset:0;z-index:10150;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.94);padding:18px;overflow:auto;touch-action:pinch-zoom}
    .cersaie26-zoom.open{display:flex}
    .cersaie26-zoom img{display:block;max-width:96vw;max-height:94vh;width:auto;height:auto;object-fit:contain;cursor:zoom-out;image-rendering:auto}
    .cersaie26-zoom-close{position:fixed;right:18px;top:18px;z-index:10151;width:44px;height:44px;border-radius:50%;border:1px solid #d4af37;background:#0b0b0b;color:#fff;font-size:28px;line-height:1;cursor:pointer}
    .cersaie26-zoom-hint{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:10151;background:rgba(0,0,0,.72);border:1px solid rgba(212,175,55,.55);border-radius:999px;padding:7px 12px;color:#fff;font-size:.78rem;white-space:nowrap}
  `;
  document.head.appendChild(style);
  const zoom=document.createElement('div');
  zoom.className='cersaie26-zoom';
  zoom.setAttribute('aria-hidden','true');
  zoom.innerHTML='<button class="cersaie26-zoom-close" aria-label="Fermer">×</button><img alt="Visuel CERSAIE 2026 agrandi"><div class="cersaie26-zoom-hint">Pincez ou utilisez le zoom du navigateur pour agrandir</div>';
  document.body.appendChild(zoom);
  const zoomImg=zoom.querySelector('img');
  const close=()=>{zoom.classList.remove('open');zoom.setAttribute('aria-hidden','true');zoomImg.removeAttribute('src')};
  const open=(src,alt)=>{if(!src)return;zoomImg.src=src;zoomImg.alt=alt||'Visuel CERSAIE 2026 agrandi';zoom.classList.add('open');zoom.setAttribute('aria-hidden','false')};
  const wire=()=>document.querySelectorAll('.cersaie26-card img').forEach(img=>{if(img.dataset.zoomReady)return;img.dataset.zoomReady='1';img.title='Cliquer pour agrandir';img.addEventListener('click',e=>{e.stopPropagation();open(img.currentSrc||img.src,img.alt)})});
  wire();
  const obs=new MutationObserver(wire);obs.observe(document.body,{childList:true,subtree:true});
  zoom.querySelector('.cersaie26-zoom-close').addEventListener('click',close);
  zoom.addEventListener('click',e=>{if(e.target===zoom||e.target===zoomImg)close()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&zoom.classList.contains('open'))close()});
})();
