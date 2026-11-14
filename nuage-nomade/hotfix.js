/* Visual extension installed by the engine; physics and progression stay native. */
window.installNuageNomadeVisuals = function(engine) {
  'use strict';
  const VERSION = '20261114-scroll-fx-2';
  const {state, W, H, ctx, HD_L1, HD_L1_RECTS, HD_L4, HD_L4_RECTS, HD_L6,
    level1AssetsReady, level4AssetsReady, preloadLevel1HD, preloadLevel4HD,
    drawSpriteCenter, showToast,
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
    if(index>=7 && index<=9) {
      preparePanorama(backgrounds[index+1]);
      prepareIslands(index+1);
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

  const panoramas=new WeakMap(), islandSprites=new Map();
  function makeCanvas(width,height) {
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;return canvas;
  }
  function preparePanorama(image) {
    if(!ready(image)) return null;
    if(panoramas.has(image)) return panoramas.get(image);
    const panel=makeCanvas(W,H),p=panel.getContext('2d');
    const scale=Math.max(W/image.naturalWidth,H/image.naturalHeight)*1.025;
    const width=image.naturalWidth*scale,height=image.naturalHeight*scale;
    p.drawImage(image,(W-width)/2,(H-height)/2,width,height);
    // Original + reflected panel: equal pixels meet at both repeating edges.
    // Build once, so scrolling needs only two blits and no live image filters.
    const strip=makeCanvas(W*2,H),s=strip.getContext('2d');
    s.drawImage(panel,0,0);s.save();s.translate(W*2,0);s.scale(-1,1);s.drawImage(panel,0,0);s.restore();
    panoramas.set(image,strip);return strip;
  }
  function prepareIslands(level) {
    const family=level===8?'aurora':'storm';
    if(islandSprites.has(family)) return islandSprites.get(family);
    if(!level1AssetsReady()) return [];
    const sprites=[1,3].map(index=>{
      const [sx,sy,sw,sh]=HD_L1_RECTS.islands[index];
      const canvas=makeCanvas(160,160),c=canvas.getContext('2d');
      const scale=Math.min(148/sw,148/sh),width=sw*scale,height=sh*scale;
      c.filter=level===8?'hue-rotate(125deg) saturate(.65) brightness(.9)':'hue-rotate(195deg) saturate(.65) brightness(.78)';
      c.drawImage(HD_L1.islands,sx,sy,sw,sh,(160-width)/2,(160-height)/2,width,height);
      return canvas;
    });
    islandSprites.set(family,sprites);return sprites;
  }
  function travelDistance() {return Math.max(0,state.progress||0)*levelTheme(state.levelIndex).speed;}
  const PARALLAX_LAYERS=[
      {phase:.72,y:.27,size:58,rate:.12,alpha:.28,sprite:0},
      {phase:.14,y:.70,size:72,rate:.15,alpha:.36,sprite:1},
      {phase:.94,y:.84,size:126,rate:.30,alpha:.85,sprite:0},
      {phase:.29,y:.20,size:96,rate:.24,alpha:.66,sprite:1}
    ];
  function drawParallax(level,distance) {
    const sprites=prepareIslands(level);
    if(!sprites.length) return;
    ctx.save();
    for(const layer of PARALLAX_LAYERS) {
      const margin=layer.size,period=W+margin*2;
      const x=((layer.phase*period-distance*layer.rate)%period+period)%period-margin;
      ctx.globalAlpha=layer.alpha;
      ctx.drawImage(sprites[layer.sprite],x,H*layer.y-layer.size/2,layer.size,layer.size);
    }
    ctx.restore();
  }

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
    const panorama=preparePanorama(image),distance=travelDistance();
    const offset=(distance*.075)%(W*2);
    ctx.drawImage(panorama,-offset,0);ctx.drawImage(panorama,W*2-offset,0);
    drawParallax(level,distance);
    drawAtmosphere(level);
    if(state.flash>0) {
      ctx.fillStyle='rgba(230,245,255,'+(state.flash*.18)+')';ctx.fillRect(0,0,W,H);
    }
  }

  const boltSprites=new Map(), particleSprites=new Map();
  function lightningSprite(length,blue,boss,frame) {
    const size=Math.max(96,Math.round(length/24)*24),key=[size,blue,boss,frame].join(':');
    if(boltSprites.has(key)) return boltSprites.get(key);
    const width=boss?220:176,pad=32,canvas=makeCanvas(width,size+pad*2),c=canvas.getContext('2d'),cx=width/2;
    const points=[];
    for(let i=0;i<15;i++) {
      const x=i===0||i===14?0:Math.sin(i*19.13+frame*5.71)*12+Math.cos(i*8.2+frame)*6;
      points.push([cx+x,pad+size*i/14]);
    }
    const trace=()=>{c.beginPath();c.moveTo(...points[0]);for(let i=1;i<points.length;i++)c.lineTo(...points[i]);};
    c.lineCap='round';c.lineJoin='round';
    for(const [strokeWidth,color] of [[boss?25:19,blue?'rgba(98,173,255,.10)':'rgba(255,202,66,.10)'],[boss?14:10,blue?'rgba(126,198,255,.30)':'rgba(255,213,100,.30)'],[boss?6:4.4,blue?'#bcecff':'#ffe99b'],[boss?2.4:1.8,'#ffffff']]) {
      c.strokeStyle=color;c.lineWidth=strokeWidth;trace();c.stroke();
    }
    for(let branch=0;branch<5;branch++) {
      const at=3+branch*2,[x,y]=points[at],side=branch%2?-1:1;
      c.beginPath();c.moveTo(x,y);c.lineTo(x+side*(17+Math.sin(frame+branch)*6),y+size*.055);c.lineTo(x+side*(27+branch*3),y+size*.13);
      c.strokeStyle=blue?'rgba(167,222,255,.72)':'rgba(255,236,167,.72)';c.lineWidth=boss?2.3:1.5;c.stroke();
    }
    const glow=c.createRadialGradient(cx,pad+size,1,cx,pad+size,boss?31:23);
    glow.addColorStop(0,'rgba(255,255,255,.9)');glow.addColorStop(.22,blue?'rgba(176,228,255,.45)':'rgba(255,226,141,.45)');glow.addColorStop(1,'rgba(128,185,255,0)');
    c.fillStyle=glow;c.fillRect(0,size,width,pad*2);
    const sprite={canvas,length:size,pad,cx};
    // Bounded GPU/CPU texture memory, including different bolt lengths.
    if(boltSprites.size>=32) boltSprites.delete(boltSprites.keys().next().value);
    boltSprites.set(key,sprite);return sprite;
  }
  function drawLightningStrikeFancy(length,blue=false,boss=false) {
    if(!Number.isFinite(length)||length<=0) return;
    const frame=Math.floor(state.time*16)%4,sprite=lightningSprite(length,blue,boss,frame);
    ctx.save();ctx.globalCompositeOperation='screen';
    ctx.globalAlpha=.88+Math.sin(state.time*47)*.1;
    ctx.drawImage(sprite.canvas,-sprite.cx,-sprite.pad,sprite.canvas.width,length+sprite.pad*2);
    ctx.restore();
  }
  function particleSprite(color,kind='glow') {
    const key=color+kind;if(particleSprites.has(key))return particleSprites.get(key);
    const canvas=makeCanvas(48,48),c=canvas.getContext('2d');
    const gradient=c.createRadialGradient(24,24,1,24,24,23);
    gradient.addColorStop(0,'#fff');gradient.addColorStop(.13,color);gradient.addColorStop(.40,color+'88');gradient.addColorStop(1,color+'00');
    c.fillStyle=gradient;c.fillRect(0,0,48,48);
    if(kind==='feather') {
      c.fillStyle='#fff';c.beginPath();c.ellipse(24,23,4,12,.55,0,Math.PI*2);c.fill();
      c.strokeStyle='#c5e9ff';c.lineWidth=1.2;c.beginPath();c.moveTo(19,34);c.lineTo(29,14);c.stroke();
    } else if(kind==='star') {
      c.fillStyle='#fff5af';c.beginPath();
      for(let i=0;i<10;i++){const angle=-Math.PI/2+i*Math.PI/5,r=i%2?4:10;const x=24+Math.cos(angle)*r,y=24+Math.sin(angle)*r;if(i===0)c.moveTo(x,y);else c.lineTo(x,y);}c.closePath();c.fill();
    }
    particleSprites.set(key,canvas);return canvas;
  }
  const BONUS_COLORS={bouclier:'#ffd33f',aimant:'#31d9ff',rafale:'#ff8b2d',foudre:'#8b6cff'};
  function drawParticles() {
    ctx.save();
    for(const particle of state.particles) {
      const life=Math.max(0,Math.min(1,particle.life));if(!life)continue;
      const color=particle.type==='star'?'#ffcf42':particle.type==='feather'?'#b8e8ff':particle.type==='bonus'?(BONUS_COLORS[particle.bonusType||state.bonusType]||'#ffe671'):'#d8f2ff';
      const kind=particle.type==='star'?'star':particle.type==='feather'?'feather':'glow';
      const size=particle.r*(particle.type==='puff'?3.0:3.8)*(1+(1-life)*.28);
      ctx.globalAlpha=life*(particle.type==='puff'?.55:.95);
      ctx.globalCompositeOperation=particle.type==='puff'?'source-over':'screen';
      ctx.drawImage(particleSprite(color,kind),particle.x-size/2,particle.y-size/2,size,size);
    }
    ctx.globalCompositeOperation='screen';
    for(const spark of state.sparks) {
      const size=spark.r*5;ctx.globalAlpha=Math.max(0,Math.min(1,spark.life*2.5));
      ctx.drawImage(particleSprite('#d2edff'),spark.x-size/2,spark.y-size/2,size,size);
    }
    ctx.restore();
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
    bossReady:()=>ready(bossAtlas),
    scroll:()=>({distance:travelDistance(),offset:(travelDistance()*.075)%(W*2),period:W*2,level:state.levelIndex+1}),
    effectCache:()=>({bolts:boltSprites.size,particles:particleSprites.size})
  });
  // Decode/cache while the menu is displayed; never allocate a panorama every frame.
  for(const image of new Set(Object.values(backgrounds))) {
    loadImage(image).then(ok=>ok&&image.decode?image.decode():null).then(()=>preparePanorama(image)).catch(()=>{});
  }
  for(const color of ['#ffcf42','#b8e8ff','#d8f2ff','#d2edff','#ffd33f','#31d9ff','#ff8b2d','#8b6cff','#ffe671']) particleSprite(color);
  window.NuageNomadeHotfixVersion=VERSION;
  return {drawBg,drawStorm,startLevel,drawLightningStrikeFancy,drawParticles,diagnostics};
};
