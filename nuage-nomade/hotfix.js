(()=>{
'use strict';
const V='20260930-fullscreen-endless-hd-3';
window.NuageNomadeHotfixVersion=V;
const lv=()=>state.mode==='endless'?0:(state.levelIndex+1);
const ready=i=>!!(i&&i.complete&&i.naturalWidth>0);
const mkimg=s=>{const i=new Image();i.decoding='async';i.src=s;return i};
const ASSET_BASE='./assets/';
const bg={
  8:mkimg(ASSET_BASE+'level8.webp?v='+V),
  9:mkimg(ASSET_BASE+'vortex.webp?v='+V),
  10:mkimg(ASSET_BASE+'vortex.webp?v='+V)
};
const crowAtlas=mkimg(ASSET_BASE+'crows_atlas.webp?v='+V);
const stormAtlas=mkimg(ASSET_BASE+'storms_atlas.webp?v='+V);
const bossAtlas=mkimg(ASSET_BASE+'boss_atlas.webp?v='+V);
const hdAssets=[bg[8],bg[9],bg[10],crowAtlas,stormAtlas,bossAtlas];
const assetPromise=Promise.all(hdAssets.map(im=>new Promise(resolve=>{
  if(ready(im))return resolve(true);
  const done=()=>resolve(ready(im));
  im.addEventListener('load',done,{once:true});
  im.addEventListener('error',()=>resolve(false),{once:true});
  if(im.decode)im.decode().then(done).catch(()=>{});
})));
const allHdReady=()=>hdAssets.every(ready);
if(typeof startLevel==='function'){
  const baseStartLevel=startLevel;
  startLevel=function(index,...args){
    if(index>=7&&!allHdReady()){
      try{showToast('Chargement HD…')}catch(e){}
      assetPromise.then(()=>baseStartLevel(index,...args));
      return;
    }
    return baseStartLevel(index,...args);
  };
}
try{LEVELS[9].name='Le Roi des Tempetes';LEVELS[9].desc='Le combat final au coeur de la tempete.';}catch(e){}
const css=document.createElement('style');
css.textContent=`
html,body{margin:0!important;width:100%!important;height:100%!important;min-height:100dvh!important;overflow:hidden!important;background:#8edfff!important}
body{display:block!important;position:fixed!important;inset:0!important;padding:0!important}
#app{position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;min-height:100dvh!important;max-width:none!important;max-height:none!important;aspect-ratio:auto!important;border-radius:0!important;box-shadow:none!important;transform:none!important}
.screen,.overlay,#game,#home,#map{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;border-radius:0!important}
#home.home-screen{padding:0!important}
#home .page-ribbon{display:none!important}
#home .home-shell{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;min-height:0!important;max-width:none!important;margin:0!important;border-radius:0!important;padding:0!important;box-shadow:none!important}
#home .home-hero-art{inset:0!important;width:100%!important;height:100%!important;border-radius:0!important;background-size:cover!important;background-position:center center!important}
.score-banner::before,.score-banner::after{display:none!important;content:none!important}
.score-banner #bestEndless{position:relative!important;z-index:3!important;background:transparent!important}
canvas,#gameCanvas{display:block!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;border-radius:0!important}
@supports(height:100svh){#app{height:100svh!important}}
`;
document.head.appendChild(css);


/* 2026-09-30: the home score is ONLY the endless-mode record. */
refreshHomeScore=function(){
  const el=document.getElementById('bestEndless');
  if(el) el.textContent=fmt(Number(state.progressData.bestEndless||state.bestEndless||0));
};

/* Endless mode now progresses through the same HD visual worlds as levels 1-7.
   A new visual/difficulty chapter starts every 35 seconds, then stays on level 7
   while the native endless difficulty continues increasing with score. */
function endlessStage(){
  if(state.mode!=='endless') return 1;
  return Math.min(7,1+Math.floor((state.progress||0)/35));
}
function syncEndlessStage(){
  if(state.mode!=='endless') return;
  const idx=endlessStage()-1;
  if(state.levelIndex!==idx){
    state.levelIndex=idx;
    try{initBackground(levelTheme(idx).theme);showToast('Mode infini · Zone '+(idx+1));}catch(e){}
  }
}

const oldDrawBg=drawBg;
/* IMPORTANT: HD backdrops are selected by the native drawBg from state.levelIndex.
   Do not call private HD renderer names here: they are not global in the bundled game. */
drawBg=function(theme){
  if(state.mode==='endless'){
    const s=endlessStage();
    const wanted=s-1;
    if(state.levelIndex!==wanted) state.levelIndex=wanted;
    return oldDrawBg(levelTheme(wanted).theme);
  }
  const n=lv(),im=bg[n];
  if(n>=8&&n<=10&&ready(im)){
    ctx.clearRect(0,0,W,H);
    const iw=im.naturalWidth,ih=im.naturalHeight,s=Math.max(W/iw,H/ih)*1.035,dw=iw*s,dh=ih*s;
    const dx=Math.sin(state.time*.045)*8,dy=Math.cos(state.time*.032)*5;
    ctx.drawImage(im,(W-dw)/2+dx,(H-dh)/2+dy,dw,dh);

    // moving aurora / storm energy overlays
    ctx.save();ctx.globalCompositeOperation='screen';
    if(n===8){
      for(let i=0;i<4;i++){
        const y=110+i*155+Math.sin(state.time*(.30+i*.04)+i)*35;
        const g=ctx.createLinearGradient(0,y,W,y+75);
        g.addColorStop(0,'rgba(70,255,220,0)');
        g.addColorStop(.45,'rgba(70,255,215,.14)');
        g.addColorStop(.72,'rgba(90,160,255,.12)');
        g.addColorStop(1,'rgba(90,160,255,0)');
        ctx.fillStyle=g;ctx.fillRect(0,y,W,80);
      }
    }else{
      const rg=ctx.createRadialGradient(W*.72,H*.26,20,W*.72,H*.26,n===10?260:210);
      rg.addColorStop(0,n===10?'rgba(235,120,255,.18)':'rgba(135,160,255,.14)');
      rg.addColorStop(.55,n===10?'rgba(130,55,220,.10)':'rgba(90,125,220,.08)');
      rg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=rg;ctx.fillRect(0,0,W,H);
    }
    ctx.restore();

    const shade=ctx.createLinearGradient(0,0,0,H);
    shade.addColorStop(0,n===10?'rgba(12,4,45,.12)':'rgba(6,20,55,.05)');
    shade.addColorStop(.62,'rgba(0,0,0,0)');
    shade.addColorStop(1,'rgba(8,18,45,.11)');
    ctx.fillStyle=shade;ctx.fillRect(0,0,W,H);
    if(state.flash>0){ctx.fillStyle='rgba(230,245,255,'+(state.flash*.18)+')';ctx.fillRect(0,0,W,H);}
    return;
  }
  return oldDrawBg(theme);
};

function crowSprite(o,n){
  if(!ready(crowAtlas))return false;
  const frame=((Math.floor((o.phase||0)*.72)+(o.variant||0))%8+8)%8;
  const sx=(frame%4)*256, sy=Math.floor(frame/4)*256;
  const aggressive=n>=9;
  const target=n===8?(o.type==='birdfast'?138:148):n===9?(o.type==='birdfast'?148:158):(o.type==='birdfast'?154:166);
  const bob=Math.sin((o.phase||0)*1.55)*4.5;
  const diveTilt=o.hfDive?Math.sin((o.phase||0)*.72)*.18:0;
  ctx.save();
  ctx.translate(o.x,o.y+bob);
  if(aggressive||o.type==='birdfast'){
    ctx.save();ctx.globalCompositeOperation='screen';
    for(let i=0;i<3;i++){
      ctx.strokeStyle='rgba('+(n===10?'218,86,255':'118,170,255')+','+(.22-i*.05)+')';
      ctx.lineWidth=5-i*1.15;
      ctx.beginPath();ctx.moveTo(30+i*7,-8+i*6);ctx.lineTo(92+i*17,-13+i*8);ctx.stroke();
    }
    ctx.restore();
  }
  ctx.rotate(Math.sin((o.phase||0))*.055+diveTilt);
  ctx.scale(-1,1);
  ctx.shadowColor=aggressive?'rgba(128,55,255,.48)':'rgba(30,58,105,.30)';
  ctx.shadowBlur=aggressive?18:11;ctx.shadowOffsetY=5;
  ctx.drawImage(crowAtlas,sx,sy,256,256,-target*.5,-target*.5,target,target);
  ctx.restore();
  return true;
}
const oldDrawBird=drawBird;
drawBird=function(o){const n=lv();if(n>=8&&n<=10&&(o.type==='bird'||o.type==='birdfast'||o.type==='owl')){if(crowSprite(o,n))return}return oldDrawBird(o)};
const oldSpawnBird=spawnBird;
spawnBird=function(theme){
  const n=(theme&&theme.id)||lv();
  if(state.mode==='endless'||n<8)return oldSpawnBird(theme);
  const fast=Math.random()<(n===8?.55:n===9?.72:.78);
  const y=rand(170,H-220);
  const speed=levelTheme(state.levelIndex).speed+rand(fast?52:34,n===10?118:n===9?102:80);
  const diveChance=n===8?.34:n===9?.56:.64;
  state.obstacles.push({
    type:fast?'birdfast':'bird',x:W+110,y:y,baseY:y,vx:speed,r:n===8?25:27,
    phase:rand(0,6.2),amp:Math.random()<diveChance?rand(38,82):rand(14,28),
    warned:false,passed:false,near:false,variant:0,
    hfDive:Math.random()<diveChance,hfDiveStart:false,hfDiveTarget:y
  });
};

function stormFace(n,o){const mood=Math.sin((o.phase||0)*.7+state.time*1.3+(o.variant||0)),eye=n>=9?'rgba(255,86,62,.98)':'rgba(255,190,68,.98)';ctx.save();ctx.shadowColor=eye;ctx.shadowBlur=n>=9?18:13;ctx.fillStyle=eye;ctx.beginPath();ctx.ellipse(-17,3,6.5,5,-.15,0,Math.PI*2);ctx.ellipse(17,3,6.5,5,.15,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(28,12,24,.85)';ctx.lineWidth=4.5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-29,-8);ctx.lineTo(-12,-3);ctx.moveTo(29,-8);ctx.lineTo(12,-3);ctx.stroke();ctx.strokeStyle=n>=9?'rgba(255,92,71,.98)':'rgba(255,198,70,.98)';ctx.lineWidth=4.5;ctx.beginPath();if(mood>0){ctx.moveTo(-18,25);ctx.quadraticCurveTo(0,14,18,25)}else{ctx.moveTo(-18,21);ctx.quadraticCurveTo(0,37,18,21)}ctx.stroke();ctx.restore()}
function drawStormHD(o,n){
  if(!ready(stormAtlas))return false;
  let frame=0;
  if(o.bolt>0)frame=2;
  else if(o.warn>0)frame=1;
  else frame=(o.variant||0)%3;
  const sx=frame*384;
  const target=n===8?(o.big?196:174):n===9?(o.big?208:184):(o.big?218:190);
  ctx.save();
  ctx.rotate(Math.sin(state.time*1.55+(o.phase||0))*.025);
  ctx.globalAlpha=o.warn>0?.93+Math.sin(state.time*28)*.07:1;
  ctx.shadowColor=o.bolt>0?'rgba(170,215,255,.80)':n>=9?'rgba(120,63,210,.52)':'rgba(60,105,165,.36)';
  ctx.shadowBlur=o.bolt>0?28:17;
  ctx.drawImage(stormAtlas,sx,0,384,384,-target*.5,-target*.5,target,target);
  stormFace(n,o);
  if(o.warn>0){
    const p=.15+.10*Math.sin(state.time*30);
    ctx.fillStyle='rgba(210,235,255,'+p+')';
    ctx.beginPath();ctx.arc(0,12,n>=9?76:69,0,Math.PI*2);ctx.fill();
  }
  if(o.bolt>0)drawLightningStrikeFancy(o.boltLen,true,false);
  ctx.restore();
  return true;
}
const oldDrawStorm=drawStorm;
drawStorm=function(o){const n=lv();if(n>=8&&n<=10&&o.type==='storm'){ctx.save();ctx.translate(o.x,o.y);const ok=drawStormHD(o,n);ctx.restore();if(ok)return}if(n===10&&o.type==='boss'){ctx.save();ctx.translate(o.x,o.y);drawFinalBoss(o);ctx.restore();return}return oldDrawStorm(o)};
const oldSpawnStorm=spawnStorm;
spawnStorm=function(theme){
  const n=(theme&&theme.id)||lv();
  if(state.mode==='endless'||n<8)return oldSpawnStorm(theme);
  const big=Math.random()<(n===8?.50:n===9?.58:.62);
  state.obstacles.push({
    type:'storm',x:W+135,y:rand(195,H-305),
    vx:levelTheme(state.levelIndex).speed+rand(8,n>=9?30:20),
    r:n===7?(big?61:53):n===8?(big?63:55):n===9?(big?66:57):(big?69:59),
    phase:rand(0,6.2),warn:0,bolt:0,
    flashCd:n===7?rand(1.05,1.85):n===8?rand(.88,1.55):n===9?rand(.64,1.18):rand(.58,1.08),
    boltLen:n===7?rand(185,260):n===8?rand(200,285):rand(220,320),
    passed:false,near:false,big:big,canBolt:true,variant:Math.floor(Math.random()*4)
  });
};
const oldStormChance=stormChanceForLevel;
stormChanceForLevel=function(level){if(state.mode!=='endless'){if(level.id===8)return .33;if(level.id===9)return .43;if(level.id===10)return .39}return oldStormChance(level)};

drawLightningStrikeFancy=function(len,blue=false,boss=false){const t=state.time||0,j=n=>Math.sin(t*49+n*11)*(boss?7:5),p=[[0,0],[11+j(1),len*.14],[-9+j(2),len*.31],[13+j(3),len*.51],[-5+j(4),len*.75],[6+j(5),len]];ctx.save();ctx.globalCompositeOperation='screen';ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowColor='rgba(130,210,255,.98)';ctx.shadowBlur=boss?62:44;ctx.strokeStyle='rgba(118,198,255,.50)';ctx.lineWidth=boss?18:13;path();ctx.stroke();ctx.strokeStyle='rgba(207,240,255,.98)';ctx.lineWidth=boss?9:7;ctx.shadowBlur=boss?42:30;path();ctx.stroke();ctx.strokeStyle='#fff';ctx.lineWidth=boss?3.8:2.7;ctx.shadowBlur=17;path();ctx.stroke();[[1,-34,.28],[2,27,.43],[3,-38,.63],[4,30,.85]].forEach((b,i)=>{const a=p[b[0]],ex=a[0]+b[1]+j(20+i),ey=len*b[2];ctx.strokeStyle='rgba(180,228,255,.84)';ctx.lineWidth=boss?3.5:2.5;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(ex,ey);ctx.stroke()});const z=p[p.length-1],g=ctx.createRadialGradient(z[0],z[1],2,z[0],z[1],boss?68:50);g.addColorStop(0,'rgba(255,255,255,.98)');g.addColorStop(.25,'rgba(145,220,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(z[0],z[1],boss?68:50,0,Math.PI*2);ctx.fill();ctx.restore();function path(){ctx.beginPath();ctx.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)ctx.lineTo(p[i][0],p[i][1])}};

const oldSpawnBoss=spawnBoss;
spawnBoss=function(){if(state.obstacles&&state.obstacles.some(o=>o&&o.type==='boss'))return;state.hfBossHp=4;state.hfBossDefeated=false;state.hfBossStart=performance.now();state.hfBossLastCycle=-1;state.obstacles.push({type:'boss',x:W*.79,y:H*.32,vx:0,r:62,phase:0,warn:0,bolt:0,flashCd:1.35,boltLen:Math.min(340,H*.44),hp:4,passed:false,near:false,canBolt:true,hfBoss:true,hfOpen:false,hfHitCycle:false});state.flash=.75;try{showToast('LE ROI DES TEMPETES')}catch(e){}};
function finalBoss(){return state.obstacles&&state.obstacles.find(o=>o&&o.type==='boss'&&o.hfBoss)}
function bossPhase(b){return b.hp>=3?1:b.hp===2?2:3}
function drawFinalBoss(b){
  if(!ready(bossAtlas)){
    drawStormCloudLocal(0,0,1.8,1,true);
    return;
  }
  const phase=bossPhase(b);
  let frame=0;
  if(state.hfBossDefeated||b.hp<=0)frame=4;
  else if(b.hfOpen)frame=3;
  else if(phase>=3)frame=2;
  else if(b.warn>0||b.bolt>0)frame=1;
  const sx=(frame%3)*256, sy=Math.floor(frame/3)*256;
  const target=phase===3?250:236;
  const pulse=1+Math.sin(state.time*3.2)*.024;
  ctx.save();
  ctx.scale(pulse,pulse);
  ctx.shadowColor=phase===3?'rgba(255,70,230,.70)':'rgba(120,80,255,.56)';
  ctx.shadowBlur=34;
  ctx.drawImage(bossAtlas,sx,sy,256,256,-target*.5,-target*.5,target,target);
  if(b.hfOpen){
    const rr=45+Math.sin(state.time*8)*7;
    const g=ctx.createRadialGradient(0,50,4,0,50,rr);
    g.addColorStop(0,'#fff');g.addColorStop(.25,'rgba(255,128,255,.94)');
    g.addColorStop(.58,'rgba(150,57,255,.65)');g.addColorStop(1,'rgba(100,30,255,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,50,rr,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
  const bw=155,bh=12,bx=-bw/2,by=-132;
  ctx.fillStyle='rgba(18,19,42,.68)';ctx.beginPath();ctx.roundRect(bx,by,bw,bh,7);ctx.fill();
  const w=Math.max(0,bw*(b.hp/4));ctx.fillStyle=phase===3?'#ff54dc':'#a06cff';
  ctx.beginPath();ctx.roundRect(bx,by,w,bh,7);ctx.fill();
  if(b.warn>0){ctx.fillStyle='rgba(210,235,255,'+(.16+.1*Math.sin(state.time*30))+')';ctx.beginPath();ctx.arc(0,8,98,0,Math.PI*2);ctx.fill();}
  if(b.bolt>0)drawLightningStrikeFancy(b.boltLen,true,true);
}
const oldCompleteLevel=completeLevel;
const oldFlap=flap;
flap=function(){oldFlap();if(lv()!==10||!state.running)return;const b=finalBoss();if(!b||!b.hfOpen||b.hfHitCycle||state.hfBossDefeated)return;b.hfHitCycle=true;b.hfOpen=false;b.hp=Math.max(0,b.hp-1);state.hfBossHp=b.hp;state.bonusScore=(state.bonusScore||0)+125;state.flash=.88;for(let i=0;i<24;i++)state.sparks.push({x:b.x+rand(-45,45),y:b.y+rand(-35,75),r:rand(2,6),life:rand(.18,.55)});try{showToast(b.hp>0?'Impact ! '+b.hp+'/4':'ROI DES TEMPETES VAINCU !')}catch(e){}if(b.hp<=0){state.hfBossDefeated=true;b.canBolt=false;b.warn=0;b.bolt=0;b.hfDefeatAt=performance.now();state.progress=Math.min(state.progress,LEVELS[9].duration-.25);setTimeout(()=>{if(state.running&&lv()===10)oldCompleteLevel()},1900)}};
completeLevel=function(){if(lv()===10&&state.bossSpawned&&!state.hfBossDefeated){state.progress=Math.min(state.progress,LEVELS[9].duration-.28);return}return oldCompleteLevel()};
const oldResetLevel=resetLevel;
resetLevel=function(index,mode='adventure'){state.hfBossDefeated=false;state.hfBossHp=4;state.hfBossStart=0;state.hfBossLastCycle=-1;return oldResetLevel(index,mode)};

let last=performance.now(),extraStormAt=0;
function tune(now){const dt=Math.min(.05,(now-last)/1000||.016);last=now;try{if(state.running&&!state.paused&&state.mode==='endless')syncEndlessStage();if(state.running&&!state.paused&&state.mode!=='endless'){const n=lv(),p=state.player;if(n>=8&&n<=10){for(const o of state.obstacles){if(o.type==='bird'||o.type==='birdfast'||o.type==='owl'){if(o.hfDive===undefined)o.hfDive=Math.random()<(n===8?.25:n===9?.47:.57);if(o.hfDive){if(!o.hfDiveStart&&o.x<W*.78){o.hfDiveStart=true;o.hfDiveTarget=clamp((p?p.y:o.y)+rand(-40,72),160,H-185)}if(o.hfDiveStart&&o.x>W*.30)o.y+=(o.hfDiveTarget-o.y)*Math.min(1,dt*(n===10?2.25:1.72))}}if(o.type==='storm'&&o.canBolt!==false){const cap=n===8?1.55:n===9?1.18:1.05;if(o.warn<=0&&o.bolt<=0&&o.flashCd>cap)o.flashCd=cap+Math.random()*.20}}}if(n===10&&state.bossSpawned&&!state.hfBossDefeated){const b=finalBoss();if(b){b.x+=(W*.79-b.x)*Math.min(1,dt*4.8);b.y+=(H*.31+Math.sin(state.time*1.45)*48-b.y)*Math.min(1,dt*2.2);b.vx=0;const ph=bossPhase(b),elapsed=(now-(state.hfBossStart||now))/1000,span=ph===1?5.4:ph===2?4.7:4.15,cy=Math.floor(elapsed/span),local=elapsed-cy*span;if(cy!==state.hfBossLastCycle){state.hfBossLastCycle=cy;b.hfHitCycle=false}const openStart=ph===1?3.35:ph===2?2.85:2.45;b.hfOpen=!b.hfHitCycle&&local>openStart&&local<openStart+(ph===1?1.42:ph===2?1.20:1.02);const boltCap=ph===1?1.35:ph===2?1.02:.78;if(b.warn<=0&&b.bolt<=0&&b.flashCd>boltCap)b.flashCd=boltCap+Math.random()*.16;if(now>extraStormAt){extraStormAt=now+(ph===3?2200:2900)}let c=0,s=0,b=0;for(const o of state.obstacles){if((o.type==='bird'||o.type==='birdfast'||o.type==='owl')&&o.x>-80){c++;if(c>5)o.x=-120}else if(o.type==='storm'&&o.x>-100){s++;if(s>3)o.x=-140}else if(o.type==='boss'){b++;if(b>1)o.x=-999}}}}}}catch(e){console.error('[NN hotfix]',e)}requestAnimationFrame(tune)}
requestAnimationFrame(tune);
try{renderLevelGrid();refreshHomeScore()}catch(e){}
console.info('[Nuage Nomade] HOTFIX LIVE',V);
})();