(() => {
  'use strict';
  if (window.__LRF_CAMELEON_VIDEO_EASTER__) return;
  window.__LRF_CAMELEON_VIDEO_EASTER__ = true;

  const isDesktop = () => window.innerWidth >= 1000 && !window.matchMedia('(pointer: coarse)').matches;
  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let running = false;

  function installStyle() {
    if (document.getElementById('lrf-cameleon-video-style')) return;
    const style = document.createElement('style');
    style.id = 'lrf-cameleon-video-style';
    style.textContent = `
      #lrf-cameleon-video-stage{
        position:fixed; inset:0; z-index:2147483000; pointer-events:none;
        overflow:hidden; background:transparent!important;
      }
      #lrf-cameleon-video-stage video{
        position:absolute; left:0; bottom:-9vh;
        width:100vw; height:auto; max-width:none;
        display:block; background:transparent!important;
        object-fit:contain; object-position:center bottom;
      }
      @media(max-width:999px),(pointer:coarse){
        #lrf-cameleon-video-stage{display:none!important}
      }
      @media(prefers-reduced-motion:reduce){
        #lrf-cameleon-video-stage{display:none!important}
      }
    `;
    document.head.appendChild(style);
  }

  function playAnimation() {
    if (running || !isDesktop() || reduceMotion()) return;
    running = true;
    installStyle();

    const stage = document.createElement('div');
    stage.id = 'lrf-cameleon-video-stage';
    stage.setAttribute('aria-hidden','true');

    const video = document.createElement('video');
    video.src = 'assets/videos/cameleon-site-alpha-v2.webm?v=20260918-alpha2';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.disablePictureInPicture = true;
    video.setAttribute('playsinline','');
    video.setAttribute('webkit-playsinline','');
    stage.appendChild(video);
    document.body.appendChild(stage);

    const cleanup = () => {
      if (!stage.isConnected) return;
      try { video.pause(); } catch (_) {}
      stage.remove();
      running = false;
    };

    video.addEventListener('ended', cleanup, {once:true});
    video.addEventListener('error', cleanup, {once:true});
    video.play().catch(cleanup);
    setTimeout(cleanup, 13000);
  }

  function bind() {
    if (!isDesktop()) return;
    const logoLink = document.querySelector('header .logo');
    if (!logoLink || logoLink.dataset.lrfCameleonVideoBound) return;
    logoLink.dataset.lrfCameleonVideoBound = '1';
    logoLink.style.cursor = 'pointer';

    let clicks = 0;
    let timer = 0;
    logoLink.addEventListener('click', event => {
      if (!isDesktop()) return;
      clicks += 1;
      clearTimeout(timer);
      event.preventDefault();
      event.stopPropagation();

      if (clicks >= 2) {
        clicks = 0;
        playAnimation();
        return;
      }
      timer = setTimeout(() => {
        clicks = 0;
        location.href = logoLink.href || 'index.html';
      }, 320);
    }, true);

    logoLink.addEventListener('dblclick', event => {
      if (!isDesktop()) return;
      event.preventDefault();
      event.stopPropagation();
      clicks = 0;
      clearTimeout(timer);
      playAnimation();
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, {once:true});
  else bind();
})();