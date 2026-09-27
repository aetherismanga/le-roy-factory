(()=>{
'use strict';
const V='20260927-final-live-3-stage8-10';
window.NuageNomadeHotfixVersion=V;
const lv=()=>state.mode==='endless'?0:(state.levelIndex+1);
const ready=i=>!!(i&&i.complete&&i.naturalWidth>0);
const mkimg=s=>{const i=new Image();i.decoding='async';i.src=s;return i};
const bg={8:mkimg(LEVEL_CARD_ART[8]),9:mkimg(LEVEL_CARD_ART[9]),10:mkimg(LEVEL_CARD_ART[10])};
try{LEVELS[9].name='Le Roi des Tempetes';LEVELS[9].desc='Le combat final au coeur de la tempete.';}catch(e){}
const css=document.createElement('style');
css.textContent='.score-banner::before{display:none!important;content:none!important}.score-banner #bestEndless{z-index:3!important;background:transparent!important}';
document.head.appendChild(css);

const oldDrawBg=drawBg;
drawBg=function(theme){
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
  const p=o.phase||0, flap=Math.sin(p*1.55), fast=o.type==='birdfast', dive=!!o.hfDive;
  const scale=n===8?1:n===9?1.07:1.12;
  const bodyW=30*scale, bodyH=17*scale;
  ctx.save();ctx.translate(o.x,o.y);
  ctx.rotate((dive?Math.sin(p*.62)*.18:Math.sin(p*.85)*.055)+(fast?-.03:0));
  ctx.shadowColor=n===8?'rgba(20,35,65,.38)':n===9?'rgba(100,35,190,.50)':'rgba(160,45,230,.62)';
  ctx.shadowBlur=n===8?10:n===9?16:20;ctx.shadowOffsetY=5;

  // speed streaks
  if(fast||n>=9){
    ctx.save();ctx.globalCompositeOperation='screen';
    const rgb=n===10?'220,100,255':n===9?'165,105,255':'100,190,255';
    for(let i=0;i<3;i++){
      ctx.strokeStyle='rgba('+rgb+','+(.22-i*.05)+')';
      ctx.lineWidth=5-i*1.2;ctx.beginPath();
      ctx.moveTo(30+i*8,-7+i*6);ctx.lineTo(88+i*17,-12+i*8);ctx.stroke();
    }
    ctx.restore();
  }

  // tail
  ctx.fillStyle='#070b14';ctx.beginPath();
  ctx.moveTo(18,1);ctx.lineTo(43,-10);ctx.lineTo(34,4);ctx.lineTo(46,15);ctx.lineTo(18,9);ctx.closePath();ctx.fill();

  // body
  const g=ctx.createLinearGradient(-20,-12,24,16);
  g.addColorStop(0,n===8?'#26324b':'#111525');g.addColorStop(.55,'#090d17');g.addColorStop(1,'#02040a');
  ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,2,bodyW,bodyH,-.03,0,Math.PI*2);ctx.fill();

  // wings: true animated up/down flap
  ctx.fillStyle=n===8?'#111a2c':'#050711';
  ctx.beginPath();ctx.moveTo(2,-5);
  ctx.quadraticCurveTo(18,-42-flap*14,52,-39-flap*12);
  ctx.quadraticCurveTo(35,-14,13,4);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(5,7);
  ctx.quadraticCurveTo(20,39+flap*14,50,35+flap*11);
  ctx.quadraticCurveTo(31,15,13,5);ctx.closePath();ctx.fill();

  // wing feather lines
  ctx.strokeStyle='rgba(190,215,255,.20)';ctx.lineWidth=1.3;
  for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(14+i*6,-12);ctx.lineTo(38+i*4,-28-flap*8);ctx.stroke();}

  // head + white cheek patch
  ctx.fillStyle='#050812';ctx.beginPath();ctx.arc(-19,-3,13,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#eef4ff';ctx.beginPath();ctx.ellipse(-15,3,12,8,-.12,0,Math.PI*2);ctx.fill();

  // aggressive eye
  ctx.fillStyle=n>=9?'#ff365a':'#ffd84e';ctx.beginPath();ctx.arc(-22,-6,3.5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-23,-7,1.1,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#050812';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-29,-12);ctx.lineTo(-18,-9);ctx.stroke();

  // red beak
  ctx.fillStyle=n>=9?'#ff304f':'#ef445f';ctx.beginPath();ctx.moveTo(-31,-4);ctx.lineTo(-51,2);ctx.lineTo(-31,8);ctx.closePath();ctx.fill();

  ctx.restore();
}
const oldDrawBird=drawBird;
drawBird=function(o){const n=lv();if(n>=8&&n<=10&&(o.type==='bird'||o.type==='birdfast'||o.type==='owl')){crowSprite(o,n);return}return oldDrawBird(o)};
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
  const rects=(typeof HD_L4_RECTS!=='undefined'&&HD_L4_RECTS.storms)||null;
  const wobble=Math.sin(state.time*1.7+(o.phase||0))*.035;
  ctx.save();ctx.rotate(wobble);
  if(rects&&typeof HD_L4!=='undefined'&&ready(HD_L4.pack)){
    const r=rects[(o.variant||0)%rects.length];
    ctx.save();
    ctx.filter=n===7?'hue-rotate(170deg) saturate(.78) brightness(1.15) contrast(1.10)':
               n===8?'hue-rotate(145deg) saturate(1.12) brightness(.96) contrast(1.16)':
               n===9?'hue-rotate(218deg) saturate(1.42) brightness(.72) contrast(1.36)':
                      'hue-rotate(262deg) saturate(1.55) brightness(.66) contrast(1.45)';
    const sc=n===7?(o.big?.52:.46):n===8?(o.big?.50:.44):n===9?(o.big?.54:.47):(o.big?.56:.49);
    ctx.shadowColor=n>=9?'rgba(115,55,205,.52)':'rgba(70,130,190,.38)';ctx.shadowBlur=n>=9?22:16;
    drawSpriteCenter(HD_L4.pack,r,0,0,sc,0,o.warn>0?.94+Math.sin(state.time*30)*.06:1,false,.5,.5);
    ctx.restore();
  }else drawStormCloudLocal(0,0,o.big?1.62:1.36,1,false);

  // pulsing aura and changing expression
  const aura=ctx.createRadialGradient(0,8,18,0,12,n>=9?90:78);
  aura.addColorStop(0,n>=9?'rgba(165,80,255,.16)':'rgba(105,205,255,.14)');
  aura.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=aura;ctx.beginPath();ctx.arc(0,12,n>=9?90:78,0,Math.PI*2);ctx.fill();
  stormFace(n,o);

  if(o.warn>0){
    const p=.17+.12*Math.sin(state.time*30);
    ctx.fillStyle='rgba(255,226,150,'+p+')';ctx.beginPath();ctx.arc(0,14,n>=9?78:71,0,Math.PI*2);ctx.fill();
  }
  if(o.bolt>0)drawLightningStrikeFancy(o.boltLen,true,false);
  ctx.restore();
}
const oldDrawStorm=drawStorm;
drawStorm=function(o){const n=lv();if(n>=7&&n<=10&&o.type==='storm'){ctx.save();ctx.translate(o.x,o.y);drawStormHD(o,n);ctx.restore();return}if(n===10&&o.type==='boss'){ctx.save();ctx.translate(o.x,o.y);drawFinalBoss(o);ctx.restore();return}return oldDrawStorm(o)};
const oldSpawnStorm=spawnStorm;
spawnStorm=function(theme){
  const n=(theme&&theme.id)||lv();
  if(state.mode==='endless'||n<7)return oldSpawnStorm(theme);
  const big=Math.random()<(n===7?.45:n===8?.50:n===9?.58:.62);
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
stormChanceForLevel=function(level){if(state.mode!=='endless'){if(level.id===7)return .27;if(level.id===8)return .33;if(level.id===9)return .43;if(level.id===10)return .39}return oldStormChance(level)};

drawLightningStrikeFancy=function(len,blue=false,boss=false){const t=state.time||0,j=n=>Math.sin(t*49+n*11)*(boss?7:5),p=[[0,0],[11+j(1),len*.14],[-9+j(2),len*.31],[13+j(3),len*.51],[-5+j(4),len*.75],[6+j(5),len]];ctx.save();ctx.globalCompositeOperation='screen';ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowColor='rgba(130,210,255,.98)';ctx.shadowBlur=boss?62:44;ctx.strokeStyle='rgba(118,198,255,.50)';ctx.lineWidth=boss?18:13;path();ctx.stroke();ctx.strokeStyle='rgba(207,240,255,.98)';ctx.lineWidth=boss?9:7;ctx.shadowBlur=boss?42:30;path();ctx.stroke();ctx.strokeStyle='#fff';ctx.lineWidth=boss?3.8:2.7;ctx.shadowBlur=17;path();ctx.stroke();[[1,-34,.28],[2,27,.43],[3,-38,.63],[4,30,.85]].forEach((b,i)=>{const a=p[b[0]],ex=a[0]+b[1]+j(20+i),ey=len*b[2];ctx.strokeStyle='rgba(180,228,255,.84)';ctx.lineWidth=boss?3.5:2.5;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(ex,ey);ctx.stroke()});const z=p[p.length-1],g=ctx.createRadialGradient(z[0],z[1],2,z[0],z[1],boss?68:50);g.addColorStop(0,'rgba(255,255,255,.98)');g.addColorStop(.25,'rgba(145,220,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(z[0],z[1],boss?68:50,0,Math.PI*2);ctx.fill();ctx.restore();function path(){ctx.beginPath();ctx.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)ctx.lineTo(p[i][0],p[i][1])}};

const oldSpawnBoss=spawnBoss;
spawnBoss=function(){state.hfBossHp=4;state.hfBossDefeated=false;state.hfBossStart=performance.now();state.hfBossLastCycle=-1;state.obstacles.push({type:'boss',x:W*.79,y:H*.32,vx:0,r:62,phase:0,warn:0,bolt:0,flashCd:1.35,boltLen:Math.min(340,H*.44),hp:4,passed:false,near:false,canBolt:true,hfBoss:true,hfOpen:false,hfHitCycle:false});state.flash=.75;try{showToast('LE ROI DES TEMPETES')}catch(e){}};
function finalBoss(){return state.obstacles&&state.obstacles.find(o=>o&&o.type==='boss'&&o.hfBoss)}
function bossPhase(b){return b.hp>=3?1:b.hp===2?2:3}
function drawFinalBoss(b){const phase=bossPhase(b),pulse=1+Math.sin(state.time*3.2)*.025;ctx.save();ctx.scale(pulse,pulse);const r=(HD_L4_RECTS&&HD_L4_RECTS.storms)?HD_L4_RECTS.storms[(phase-1)%HD_L4_RECTS.storms.length]:null;if(r&&ready(HD_L4.pack)){ctx.filter=phase===1?'hue-rotate(235deg) saturate(1.45) brightness(.68) contrast(1.40)':phase===2?'hue-rotate(265deg) saturate(1.60) brightness(.62) contrast(1.48)':'hue-rotate(300deg) saturate(1.78) brightness(.58) contrast(1.58)';drawSpriteCenter(HD_L4.pack,r,0,0,.58,0,1,false,.5,.5);ctx.filter='none'}else drawStormCloudLocal(0,0,1.8,1,true);const eye=phase===3?'#ff4de1':'#ffb13b';ctx.shadowColor=eye;ctx.shadowBlur=24;ctx.fillStyle=eye;ctx.beginPath();ctx.ellipse(-24,-1,8,6,-.15,0,Math.PI*2);ctx.ellipse(24,-1,8,6,.15,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(20,6,25,.88)';ctx.lineWidth=6;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-39,-15);ctx.lineTo(-18,-7);ctx.moveTo(39,-15);ctx.lineTo(18,-7);ctx.stroke();ctx.strokeStyle=phase===3?'#ff4de1':'#ff9c49';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-25,30);ctx.quadraticCurveTo(0,47,25,30);ctx.stroke();ctx.shadowColor='rgba(255,213,75,.7)';ctx.shadowBlur=16;ctx.fillStyle='#ffd84b';ctx.beginPath();ctx.moveTo(-42,-57);ctx.lineTo(-31,-90);ctx.lineTo(-10,-65);ctx.lineTo(0,-99);ctx.lineTo(12,-65);ctx.lineTo(36,-90);ctx.lineTo(43,-56);ctx.closePath();ctx.fill();if(b.hfOpen){const rr=42+Math.sin(state.time*8)*7,g=ctx.createRadialGradient(0,54,4,0,54,rr);g.addColorStop(0,'#fff');g.addColorStop(.25,'rgba(255,128,255,.94)');g.addColorStop(.58,'rgba(150,57,255,.65)');g.addColorStop(1,'rgba(100,30,255,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,54,rr,0,Math.PI*2);ctx.fill()}ctx.restore();const bw=155,bh=12,bx=-bw/2,by=-124;ctx.fillStyle='rgba(18,19,42,.68)';ctx.beginPath();ctx.roundRect(bx,by,bw,bh,7);ctx.fill();const w=Math.max(0,bw*(b.hp/4));ctx.fillStyle=phase===3?'#ff54dc':'#a06cff';ctx.beginPath();ctx.roundRect(bx,by,w,bh,7);ctx.fill();if(b.warn>0){ctx.fillStyle='rgba(210,235,255,'+(.16+.1*Math.sin(state.time*30))+')';ctx.beginPath();ctx.arc(0,8,95,0,Math.PI*2);ctx.fill()}if(b.bolt>0)drawLightningStrikeFancy(b.boltLen,true,true)}
const oldCompleteLevel=completeLevel;
const oldFlap=flap;
flap=function(){oldFlap();if(lv()!==10||!state.running)return;const b=finalBoss();if(!b||!b.hfOpen||b.hfHitCycle||state.hfBossDefeated)return;b.hfHitCycle=true;b.hfOpen=false;b.hp=Math.max(0,b.hp-1);state.hfBossHp=b.hp;state.bonusScore=(state.bonusScore||0)+125;state.flash=.88;for(let i=0;i<24;i++)state.sparks.push({x:b.x+rand(-45,45),y:b.y+rand(-35,75),r:rand(2,6),life:rand(.18,.55)});try{showToast(b.hp>0?'Impact ! '+b.hp+'/4':'ROI DES TEMPETES VAINCU !')}catch(e){}if(b.hp<=0){state.hfBossDefeated=true;b.canBolt=false;b.warn=0;b.bolt=0;b.hfDefeatAt=performance.now();state.progress=Math.min(state.progress,LEVELS[9].duration-.25);setTimeout(()=>{if(state.running&&lv()===10)oldCompleteLevel()},1900)}};
completeLevel=function(){if(lv()===10&&state.bossSpawned&&!state.hfBossDefeated){state.progress=Math.min(state.progress,LEVELS[9].duration-.28);return}return oldCompleteLevel()};
const oldResetLevel=resetLevel;
resetLevel=function(index,mode='adventure'){state.hfBossDefeated=false;state.hfBossHp=4;state.hfBossStart=0;state.hfBossLastCycle=-1;return oldResetLevel(index,mode)};

let last=performance.now(),extraStormAt=0;
function tune(now){const dt=Math.min(.05,(now-last)/1000||.016);last=now;try{if(state.running&&!state.paused&&state.mode!=='endless'){const n=lv(),p=state.player;if(n>=8&&n<=10){for(const o of state.obstacles){if(o.type==='bird'||o.type==='birdfast'||o.type==='owl'){if(o.hfDive===undefined)o.hfDive=Math.random()<(n===8?.25:n===9?.47:.57);if(o.hfDive){if(!o.hfDiveStart&&o.x<W*.78){o.hfDiveStart=true;o.hfDiveTarget=clamp((p?p.y:o.y)+rand(-40,72),160,H-185)}if(o.hfDiveStart&&o.x>W*.30)o.y+=(o.hfDiveTarget-o.y)*Math.min(1,dt*(n===10?2.25:1.72))}}if(o.type==='storm'&&o.canBolt!==false){const cap=n===8?1.55:n===9?1.18:1.05;if(o.warn<=0&&o.bolt<=0&&o.flashCd>cap)o.flashCd=cap+Math.random()*.20}}}if(n===7){for(const o of state.obstacles)if(o.type==='storm'&&o.flashCd>1.8)o.flashCd=1.5+Math.random()*.25}if(n===10&&state.bossSpawned&&!state.hfBossDefeated){const b=finalBoss();if(b){b.x+=(W*.79-b.x)*Math.min(1,dt*4.8);b.y+=(H*.31+Math.sin(state.time*1.45)*48-b.y)*Math.min(1,dt*2.2);b.vx=0;const ph=bossPhase(b),elapsed=(now-(state.hfBossStart||now))/1000,span=ph===1?5.4:ph===2?4.7:4.15,cy=Math.floor(elapsed/span),local=elapsed-cy*span;if(cy!==state.hfBossLastCycle){state.hfBossLastCycle=cy;b.hfHitCycle=false}const openStart=ph===1?3.35:ph===2?2.85:2.45;b.hfOpen=!b.hfHitCycle&&local>openStart&&local<openStart+(ph===1?1.42:ph===2?1.20:1.02);const boltCap=ph===1?1.35:ph===2?1.02:.78;if(b.warn<=0&&b.bolt<=0&&b.flashCd>boltCap)b.flashCd=boltCap+Math.random()*.16;if(now>extraStormAt){const storms=state.obstacles.filter(x=>x.type==='storm'&&x.x>-80);if(storms.length<2)spawnStorm(levelTheme(state.levelIndex));extraStormAt=now+(ph===3?1900:2500)}let c=0;for(const o of state.obstacles){if((o.type==='bird'||o.type==='birdfast'||o.type==='owl')&&o.x>-80){c++;if(c>5)o.x=-120}}}}}}catch(e){console.error('[NN hotfix]',e)}requestAnimationFrame(tune)}
requestAnimationFrame(tune);
try{renderLevelGrid();refreshHomeScore()}catch(e){}
console.info('[Nuage Nomade] HOTFIX LIVE',V);
})();