/* Visual extension installed by the engine; physics and progression stay native. */
window.installNuageNomadeVisuals = function(engine) {
  'use strict';
  const VERSION = '20261114-visual-coherence-1';
  const {state, W, H, ctx, HD_L1, HD_L4, HD_L4_RECTS, HD_L6,
    level1AssetsReady, level4AssetsReady, preloadLevel1HD, preloadLevel4HD,
    drawSpriteCenter, drawLightningStrikeFancy, showToast,
    drawBg: baseDrawBg, drawStorm: baseDrawStorm, startLevel: baseStartLevel,
    LEVEL_CARD_ART, levelTheme, initBackground} = engine;
  const ready = image => !!(image && image.complete && image.naturalWidth > 0);
  const makeImage = path => {
    const image = new Image();
    image.decoding = 'async';
    image.src = './assets/' + path + '?v=' + VERSION;
    return image;
  };
  const backgrounds = {8: makeImage('level8.webp'), 9: makeImage('vortex.webp')};
  backgrounds[10] = backgrounds[9];
  const bossAtlas = makeImage('boss_atlas.webp');
  const loads = new WeakMap();
  function loadImage(image) {
    if(ready(image)) return Promise.resolve(true);
    if(loads.has(image)) return loads.get(image);
    const promise = new Promise(resolve => {
      let timer;
      const finish = () => {
        clearTimeout(timer);
        image.removeEventListener('load', finish);
        image.removeEventListener('error', finish);
        resolve(ready(image));
      };
      image.addEventListener('load', finish, {once:true});
      image.addEventListener('error', finish, {once:true});
      timer = setTimeout(finish, 12000);
      if(image.complete) finish();
    }).then(ok => { if(!ok) loads.delete(image); return ok; });
    loads.set(image, promise);
    return promise;
  }
  let pendingStart = 0;
  async function startLevel(index, ...args) {
    const ticket = ++pendingStart;
    const originScreen=state.screen, originMode=state.mode;
    if(index >= 7 && index <= 9) {
      const image = backgrounds[index + 1];
      if(!ready(image) || !level1AssetsReady() || !level4AssetsReady() || (index === 9 && !ready(bossAtlas))) {
        showToast('Chargement des décors HD…');
        const checks = await Promise.all([
          loadImage(image), preloadLevel1HD(), preloadLevel4HD(),
          index === 9 ? loadImage(bossAtlas) : Promise.resolve(true)
        ]);
        if(ticket !== pendingStart || state.screen !== originScreen || state.mode !== originMode) return;
        if(!checks.every(Boolean)) {
          showToast('Décor HD indisponible. Touche le niveau pour réessayer.');
          // A retry requests a fresh copy rather than silently changing art style.
          for(const asset of [image, bossAtlas]) {
            if(!ready(asset)) asset.src = asset.src.split('&retry=')[0] + '&retry=' + Date.now();
          }
          return;
        }
      }
    }
    return baseStartLevel(index, ...args);
  }
  const css = document.createElement('style');
  css.textContent = `
    #app {height:min(100dvh,177.7778vw)!important;width:min(100vw,56.25dvh)!important;max-height:100dvh!important;aspect-ratio:9/16!important;border-radius:0!important;box-shadow:none!important}
    html,body {margin:0!important;height:100%!important;overflow:hidden!important;overscroll-behavior:none;background:#132f61!important}
    body {display:flex!important;align-items:center!important;justify-content:center!important}
    #home .home-shell {width:100%!important;height:100%!important;margin:0!important;border-radius:0!important;box-shadow:none!important}
    #home.home-screen {padding:0!important}
    .hud .panel {border-color:rgba(187,231,255,.8)}
    @media(max-width:600px) {#app {height:100dvh!important;width:100vw!important;aspect-ratio:auto!important}}
  `;
  document.head.appendChild(css);

  // Level cards and live gameplay use the same source art.
  for(const n of [8,9,10]) LEVEL_CARD_ART[n] = backgrounds[n].src;

  function drawAtmosphere(level) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    if(level === 8) {
      // Soft curved ribbons stay high in the sky, away from the flight corridor.
      for(let i=0;i<3;i++) {
        const y=90+i*35+Math.sin(state.time*.22+i)*16;
        const gradient=ctx.createLinearGradient(0,y,0,y+85);
        gradient.addColorStop(0,'rgba(108,255,220,0)');
        gradient.addColorStop(.5,'rgba(108,255,220,.055)');
        gradient.addColorStop(1,'rgba(161,142,255,0)');
        ctx.strokeStyle=gradient;ctx.lineWidth=28+i*8;
        ctx.beginPath();ctx.moveTo(-30,y+55);
        ctx.bezierCurveTo(W*.25,y-28,W*.65,y+112,W+30,y+8);ctx.stroke();
      }
    }
    for(let i=0;i<24;i++) {
      const x=((i*137.3+state.time*(2+i%3))%(W+40))-20;
      const y=((i*89.7+state.time*(3+i%2))%(H+40))-20;
      ctx.globalAlpha=.12+(1+Math.sin(state.time*.8+i))*.06;
      ctx.fillStyle=level===8?'#c8fff1':'#d8ccff';
      ctx.beginPath();ctx.arc(x,y,.7+(i%3)*.4,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
    // A restrained vignette separates obstacles from the illustrated scenery.
    const shade=ctx.createLinearGradient(0,0,0,H);
    shade.addColorStop(0,'rgba(9,20,57,.08)');
    shade.addColorStop(.45,'rgba(9,20,57,.03)');
    shade.addColorStop(1,level===10?'rgba(36,8,72,.16)':'rgba(16,39,72,.05)');
    ctx.fillStyle=shade;ctx.fillRect(0,0,W,H);
  }
  let endlessWorld = -1;
  function drawBg(theme) {
    if(state.mode === 'endless') {
      const index=Math.min(6,Math.floor((state.progress||0)/35));
      if(endlessWorld !== index) {
        endlessWorld=index;state.levelIndex=index;initBackground(levelTheme(index).theme);
      }
      const previous=state.mode;state.mode='adventure';
      try { return baseDrawBg(levelTheme(index).theme); }
      finally { state.mode=previous; }
    }
    endlessWorld=-1;
    const level=state.levelIndex+1;
    if(level < 8) return baseDrawBg(theme);
    const image=ready(backgrounds[level])?backgrounds[level]:ready(HD_L6.bg)?HD_L6.bg:HD_L1.bg;
    if(!ready(image)) return baseDrawBg(theme);
    ctx.clearRect(0,0,W,H);
    const scale=Math.max(W/image.naturalWidth,H/image.naturalHeight)*1.035;
    const width=image.naturalWidth*scale,height=image.naturalHeight*scale;
    ctx.drawImage(image,(W-width)/2+Math.sin(state.time*.055)*5,(H-height)/2+Math.cos(state.time*.045)*4,width,height);
    drawAtmosphere(level);
    if(state.flash>0) {
      ctx.fillStyle='rgba(230,245,255,'+(state.flash*.18)+')';ctx.fillRect(0,0,W,H);
    }
  }
  function drawStorm(obstacle) {
    const level=state.levelIndex+1;
    if(level<8 || state.mode==='endless' || !level4AssetsReady()) return baseDrawStorm(obstacle);
    const boss=obstacle.type==='boss';
    ctx.save();ctx.translate(obstacle.x,obstacle.y);
    ctx.globalAlpha=obstacle.warn>0?.94+Math.sin(state.time*28)*.06:1;
    ctx.shadowColor='rgba(21,18,64,.36)';ctx.shadowBlur=12;ctx.shadowOffsetY=5;
    if(boss && ready(bossAtlas)) {
      const frame=obstacle.bolt>0?2:obstacle.warn>0?1:0;
      ctx.drawImage(bossAtlas,frame*256,0,256,256,-100,-100,200,200);
    } else {
      const rect=HD_L4_RECTS.storms[(obstacle.variant||0)%HD_L4_RECTS.storms.length];
      ctx.filter=level===8?'hue-rotate(155deg) saturate(.72) brightness(1.08)':'hue-rotate(195deg) saturate(.85)';
      drawSpriteCenter(HD_L4.pack,rect,0,0,obstacle.big?.39:.34,Math.sin(state.time*1.6+obstacle.phase)*.015,1);
    }
    ctx.filter='none';ctx.shadowColor='transparent';
    if(obstacle.warn>0) {
      ctx.fillStyle='rgba(180,225,255,'+(.09+.05*Math.sin(state.time*28))+')';
      ctx.beginPath();ctx.arc(0,10,boss?82:62,0,Math.PI*2);ctx.fill();
    }
    if(obstacle.bolt>0) drawLightningStrikeFancy(obstacle.boltLen,true,boss);
    ctx.restore();
  }
  const diagnostics=Object.freeze({
    version:VERSION,
    assets:()=>Object.fromEntries([8,9,10].map(level=>[level,{ready:ready(backgrounds[level]),width:backgrounds[level].naturalWidth,height:backgrounds[level].naturalHeight}])),
    sharedSpritesReady:()=>level1AssetsReady()&&level4AssetsReady(),
    bossReady:()=>ready(bossAtlas)
  });
  window.NuageNomadeHotfixVersion=VERSION;
  return {drawBg,drawStorm,startLevel,diagnostics};
};
