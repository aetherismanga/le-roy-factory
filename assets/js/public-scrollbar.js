(() => {
  if (!window.matchMedia('(min-width: 901px)').matches) return;
  if (document.getElementById('lrf-desktop-scrollbar')) return;

  const style = document.createElement('style');
  style.id = 'lrf-desktop-scrollbar-style';
  style.textContent = `
    @media (min-width:901px){
      html{scrollbar-width:none!important;scrollbar-gutter:auto!important;overflow-y:scroll!important}
      html::-webkit-scrollbar,body::-webkit-scrollbar{width:0!important;height:0!important;display:none!important}
      body{padding-right:18px!important;box-sizing:border-box!important}
      #lrf-desktop-scrollbar{position:fixed;right:0;top:0;bottom:0;width:18px;z-index:2147483640;background:#e8dfcf;border-left:1px solid #c9b98f;box-shadow:inset 2px 0 5px rgba(0,0,0,.12);cursor:pointer;user-select:none}
      #lrf-desktop-scrollbar-thumb{position:absolute;left:2px;top:0;width:13px;min-height:72px;border-radius:9px;background:linear-gradient(180deg,#f2cf57 0%,#c39319 52%,#8a6211 100%);border:1px solid #5f430b;box-shadow:0 1px 5px rgba(0,0,0,.42),inset 0 1px 1px rgba(255,255,255,.65);cursor:grab;will-change:transform}
      #lrf-desktop-scrollbar-thumb::after{content:'≡';position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(90deg);font:bold 12px/1 Arial,sans-serif;color:rgba(45,30,3,.72)}
      #lrf-desktop-scrollbar-thumb:hover{background:linear-gradient(180deg,#ffe077,#d3a526 55%,#7b5508 100%)}
      #lrf-desktop-scrollbar-thumb.dragging{cursor:grabbing;background:linear-gradient(180deg,#ffe994,#c28c13 60%,#674704 100%)}
    }`;
  document.head.appendChild(style);

  const track = document.createElement('div');
  track.id = 'lrf-desktop-scrollbar';
  track.setAttribute('aria-hidden','true');
  const thumb = document.createElement('div');
  thumb.id = 'lrf-desktop-scrollbar-thumb';
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
    return { maxScroll, travel };
  };

  const currentTop = () => scroller.scrollTop || document.documentElement.scrollTop || document.body.scrollTop || window.pageYOffset || 0;
  const setTop = value => {
    scroller.scrollTop = value;
    document.documentElement.scrollTop = value;
    document.body.scrollTop = value;
  };

  const sync = () => {
    const m = metrics();
    thumb.style.height = `${thumbHeight}px`;
    const ratio = m.maxScroll ? Math.min(1, Math.max(0, currentTop() / m.maxScroll)) : 0;
    thumb.style.transform = `translate3d(0,${Math.round(m.travel * ratio)}px,0)`;
    track.style.display = m.maxScroll > 2 ? 'block' : 'none';
  };

  let dragging = false, startY = 0, startScroll = 0;
  thumb.addEventListener('pointerdown', e => {
    dragging = true; startY = e.clientY; startScroll = currentTop();
    thumb.classList.add('dragging'); thumb.setPointerCapture?.(e.pointerId);
    e.preventDefault(); e.stopPropagation();
  });
  window.addEventListener('pointermove', e => {
    if (!dragging) return;
    const m = metrics(); if (!m.travel) return;
    setTop(startScroll + ((e.clientY - startY) / m.travel) * m.maxScroll);
    sync(); e.preventDefault();
  }, { passive:false });
  window.addEventListener('pointerup', () => { dragging = false; thumb.classList.remove('dragging'); });

  track.addEventListener('pointerdown', e => {
    if (e.target === thumb) return;
    const m = metrics(); const rect = track.getBoundingClientRect();
    const wanted = Math.max(0, Math.min(m.travel, e.clientY - rect.top - thumbHeight / 2));
    setTop(m.travel ? (wanted / m.travel) * m.maxScroll : 0); sync();
  });

  const queueSync = () => requestAnimationFrame(sync);
  window.addEventListener('scroll', queueSync, { passive:true, capture:true });
  document.addEventListener('scroll', queueSync, { passive:true, capture:true });
  window.addEventListener('wheel', queueSync, { passive:true });
  window.addEventListener('resize', queueSync, { passive:true });
  if ('ResizeObserver' in window) new ResizeObserver(queueSync).observe(document.documentElement);
  new MutationObserver(queueSync).observe(document.body,{childList:true,subtree:true});
  queueSync(); setTimeout(sync,150); setTimeout(sync,600); setTimeout(sync,1500);
})();