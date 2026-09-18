(() => {
  'use strict';
  if (window.__LRF_CAMELEON_EASTER_EGG__) return;
  window.__LRF_CAMELEON_EASTER_EGG__ = true;

  const desktop = () => window.innerWidth >= 1000;
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const frameSrc = n => `assets/img/cameleon${String(n).padStart(2,'0')}.png?v=20260918-easter1`;

  function preload() {
    for (let i=1;i<=10;i++) { const im=new Image(); im.src=frameSrc(i); }
    const logo=new Image(); logo.src='assets/brand-v2/logoLRF.png?v=20260918-pc-logo2';
  }

  function installStyle() {
    if (document.getElementById('lrf-cameleon-easter-style')) return;
    const s=document.createElement('style');
    s.id='lrf-cameleon-easter-style';
    s.textContent=`
      #lrf-cameleon-stage{position:fixed;inset:0;z-index:2147483000;pointer-events:none;overflow:hidden;contain:layout paint style}
      #lrf-cameleon-stage .lrf-cam{position:absolute;left:0;bottom:-4px;width:clamp(250px,25vw,430px);height:auto;object-fit:contain;transform:translateX(-120%);transform-origin:50% 100%;will-change:transform,opacity;filter:drop-shadow(0 10px 10px rgba(0,0,0,.24));opacity:0}
      #lrf-cameleon-stage .lrf-fall-logo{position:absolute;width:90px;height:90px;object-fit:contain;border-radius:50%;will-change:transform,opacity;filter:drop-shadow(0 8px 8px rgba(0,0,0,.25))}
      #lrf-cameleon-stage.lrf-close .lrf-cam{width:clamp(440px,46vw,760px);bottom:-7vh}
      .lrf-easter-source-hidden{opacity:0!important}
      @media(max-width:999px),(pointer:coarse){#lrf-cameleon-stage{display:none!important}}
      @media(prefers-reduced-motion:reduce){#lrf-cameleon-stage{display:none!important}}
    `;
    document.head.appendChild(s);
  }

  async function run(source) {
    if (!desktop() || reduced() || window.__LRF_CAMELEON_RUNNING__) return;
    window.__LRF_CAMELEON_RUNNING__=true;
    installStyle();

    const rect=source.getBoundingClientRect();
    const stage=document.createElement('div');
    stage.id='lrf-cameleon-stage';
    stage.setAttribute('aria-hidden','true');
    const logo=document.createElement('img');
    logo.className='lrf-fall-logo';
    logo.src=source.currentSrc || source.src || 'assets/brand-v2/logoLRF.png?v=20260918-pc-logo2';
    logo.style.left=`${rect.left}px`; logo.style.top=`${rect.top}px`;
    const cam=document.createElement('img');
    cam.className='lrf-cam'; cam.src=frameSrc(1);
    stage.append(logo,cam); document.body.appendChild(stage);
    source.classList.add('lrf-easter-source-hidden');

    try {
      const floor=Math.max(0,innerHeight-94);
      await logo.animate([
        {transform:'translate(0,0) rotate(0deg)',offset:0},
        {transform:`translate(8px,${floor-rect.top-90}px) rotate(420deg)`,offset:.76},
        {transform:`translate(12px,${floor-rect.top-118}px) rotate(450deg)`,offset:.88},
        {transform:`translate(16px,${floor-rect.top-90}px) rotate(480deg)`,offset:1}
      ],{duration:1050,easing:'cubic-bezier(.3,.05,.25,1)',fill:'forwards'}).finished;

      cam.style.opacity='1';
      cam.src=frameSrc(1);
      await cam.animate([
        {transform:'translateX(-115%)'},
        {transform:'translateX(7vw)'}
      ],{duration:1150,easing:'ease-out',fill:'forwards'}).finished;

      cam.src=frameSrc(2); await wait(430);
      cam.src=frameSrc(3); await wait(480);
      cam.src=frameSrc(4);
      const roll=logo.animate([
        {transform:`translate(16px,${floor-rect.top-90}px) rotate(480deg)`},
        {transform:`translate(${Math.min(innerWidth*.43,650)}px,${floor-rect.top-90}px) rotate(1320deg)`}
      ],{duration:1250,easing:'cubic-bezier(.18,.72,.35,1)',fill:'forwards'});
      await cam.animate([
        {transform:'translateX(7vw)'},
        {transform:'translateX(31vw)'}
      ],{duration:1250,easing:'ease-in-out',fill:'forwards'}).finished;
      await roll.finished;

      cam.src=frameSrc(5); await wait(700);
      cam.src=frameSrc(6); await wait(600);
      cam.src=frameSrc(7); await wait(550);

      stage.classList.add('lrf-close');
      cam.src=frameSrc(8);
      await cam.animate([
        {transform:'translateX(31vw) scale(.78)'},
        {transform:'translateX(28vw) scale(1.05)'}
      ],{duration:700,easing:'ease-out',fill:'forwards'}).finished;
      await wait(900);

      stage.classList.remove('lrf-close');
      cam.src=frameSrc(9);
      await cam.animate([
        {transform:'translateX(28vw) scale(1.05)'},
        {transform:'translateX(45vw) scale(1)'}
      ],{duration:700,easing:'ease-in-out',fill:'forwards'}).finished;
      await wait(450);

      logo.style.opacity='0';
      cam.src=frameSrc(10);
      await cam.animate([
        {transform:'translateX(45vw)'},
        {transform:'translateX(112vw)'}
      ],{duration:1550,easing:'cubic-bezier(.35,.05,.75,.55)',fill:'forwards'}).finished;
    } catch (_) {}

    source.classList.remove('lrf-easter-source-hidden');
    stage.remove();
    window.__LRF_CAMELEON_RUNNING__=false;
  }

  function bind() {
    if (!desktop()) return;
    preload();
    const logoLink=document.querySelector('header .logo');
    const logo=logoLink?.querySelector('img') || document.querySelector('header .lrf-monogram-header');
    if (!logo || !logoLink || logoLink.dataset.lrfCameleonBound) return;
    logoLink.dataset.lrfCameleonBound='1';
    logoLink.style.cursor='pointer';

    let clicks=0, clickTimer=0;
    logoLink.addEventListener('click', e => {
      if (!desktop()) return;
      clicks++;
      clearTimeout(clickTimer);
      if (clicks >= 2) {
        clicks=0;
        e.preventDefault();
        e.stopPropagation();
        run(logo);
        return;
      }
      e.preventDefault();
      clickTimer=setTimeout(() => {
        clicks=0;
        location.href=logoLink.href || 'index.html';
      }, 320);
    }, true);

    logoLink.addEventListener('dblclick', e => {
      if (!desktop()) return;
      e.preventDefault();
      e.stopPropagation();
      clicks=0;
      clearTimeout(clickTimer);
      run(logo);
    }, true);
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind,{once:true});
  else bind();
})();