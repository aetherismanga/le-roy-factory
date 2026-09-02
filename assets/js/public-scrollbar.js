(() => {
  if (!window.matchMedia('(min-width: 901px)').matches) return;
  if (document.getElementById('lrf-global-scrollbar')) return;

  const style = document.createElement('style');
  style.id = 'lrf-global-scrollbar-style';
  style.textContent = `
    @media (min-width:901px){
      html{scrollbar-width:none!important;scrollbar-gutter:auto!important;overflow-y:scroll!important}
      html::-webkit-scrollbar,body::-webkit-scrollbar{width:0!important;height:0!important;display:none!important}
      body{padding-right:18px!important;box-sizing:border-box!important}
      #lrf-global-scrollbar{position:fixed;right:0;top:0;bottom:0;width:18px;z-index:2147483640;background:#e8dfcf;border-left:1px solid #c9b98f;box-shadow:inset 2px 0 5px rgba(0,0,0,.12);cursor:pointer;user-select:none}
      #lrf-global-scrollbar-thumb{position:absolute;left:2px;top:0;width:13px;min-height:72px;border-radius:9px;background:linear-gradient(180deg,#f2cf57 0%,#c39319 52%,#8a6211 100%);border:1px solid #5f430b;box-shadow:0 1px 5px rgba(0,0,0,.42),inset 0 1px 1px rgba(255,255,255,.65);cursor:grab;will-change:transform}
      #lrf-global-scrollbar-thumb::after{content:'≡';position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(90deg);font:bold 12px/1 Arial,sans-serif;color:rgba(45,30,3,.72)}
      #lrf-global-scrollbar-thumb:hover{background:linear-gradient(180deg,#ffe077,#d3a526 55%,#7b5508 100%)}
      #lrf-global-scrollbar-thumb.dragging{cursor:grabbing;background:linear-gradient(180deg,#ffe994,#c28c13 60%,#674704 100%)}
    }`;
  document.head.appendChild(style);

  const track = document.createElement('div');
  track.id = 'lrf-global-scrollbar';
  track.setAttribute('aria-hidden','true');
  const thumb = document.createElement('div');
  thumb.id = 'lrf-global-scrollbar-thumb';
  track.appendChild(thumb);
  document.body.appendChild(track);

  const scroller = document.scrollingElement || document.documentElement;
  let thumbHeight = 72;

  const metrics = () => {
    const docHeight = Math.max(scroller.scrollHeight, document.body.scrollHeight, document.documentElement.scrollHeight);
    const viewport = window.innerHeight;
    const maxScroll = Math.max(0, docHeight - viewport);
    const trackHeight = track.clientHeight || viewport;
    thumbHeight = maxScroll > 0 ? Math.max(72, Math.round(trackHeight * viewport / docHeight)) : trackHeight;
    const travel = Math.max(0, trackHeight - thumbHeight);
    return { docHeight, viewport, maxScroll, trackHeight, travel };
  };

  const sync = () => {
    const m = metrics();
    thumb.style.height = `${thumbHeight}px`;
    const top = scroller.scrollTop || window.pageYOffset || 0;
    const ratio = m.maxScroll ? Math.min(1, Math.max(0, top / m.maxScroll)) : 0;
    thumb.style.transform = `translate3d(0,${Math.round(m.travel * ratio)}px,0)`;
    track.style.display = m.maxScroll > 2 ? 'block' : 'none';
  };

  let dragging = false;
  let startY = 0;
  let startScroll = 0;

  thumb.addEventListener('pointerdown', e => {
    dragging = true;
    startY = e.clientY;
    startScroll = scroller.scrollTop || 0;
    thumb.classList.add('dragging');
    thumb.setPointerCapture?.(e.pointerId);
    e.preventDefault();
    e.stopPropagation();
  });

  window.addEventListener('pointermove', e => {
    if (!dragging) return;
    const m = metrics();
    if (!m.travel) return;
    scroller.scrollTop = startScroll + ((e.clientY - startY) / m.travel) * m.maxScroll;
    sync();
    e.preventDefault();
  }, { passive:false });

  window.addEventListener('pointerup', () => {
    dragging = false;
    thumb.classList.remove('dragging');
  });

  track.addEventListener('pointerdown', e => {
    if (e.target === thumb) return;
    const m = metrics();
    const rect = track.getBoundingClientRect();
    const wanted = Math.max(0, Math.min(m.travel, e.clientY - rect.top - thumbHeight / 2));
    scroller.scrollTop = m.travel ? (wanted / m.travel) * m.maxScroll : 0;
    sync();
  });

  window.addEventListener('scroll', () => requestAnimationFrame(sync), { passive:true });
  window.addEventListener('resize', () => requestAnimationFrame(sync), { passive:true });
  if ('ResizeObserver' in window) new ResizeObserver(() => requestAnimationFrame(sync)).observe(document.documentElement);
  new MutationObserver(() => requestAnimationFrame(sync)).observe(document.body,{childList:true,subtree:true,attributes:false});
  requestAnimationFrame(sync);
  setTimeout(sync,250);
  setTimeout(sync,1000);
})();