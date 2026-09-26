(()=>{
'use strict';
const V='20260927-final-live-2';
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
    const iw=im.naturalWidth,ih=im.naturalHeight,s=Math.max(W/iw,H/ih)*1.018,dw=iw*s,dh=ih*s;
    const drift=Math.sin(state.time*.055)*6;
    ctx.drawImage(im,(W-dw)/2+drift,(H-dh)/2,dw,dh);
    const shade=ctx.createLinearGradient(0,0,0,H);
    shade.addColorStop(0,n===10?'rgba(20,8,55,.11)':'rgba(8,30,70,.04)');
    shade.addColorStop(.62,'rgba(0,0,0,0)');shade.addColorStop(1,'rgba(10,22,55,.10)');
    ctx.fillStyle=shade;ctx.fillRect(0,0,W,H);
    if(n===9||n===10){ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=.10;
      for(let i=0;i<4;i++){const y=145+i*190+Math.sin(state.time*(.32+i*.03)+i)*28;const g=ctx.createLinearGradient(0,y,W,y+35);g.addColorStop(0,'rgba(120,225,255,0)');g.addColorStop(.5,n===10?'rgba(216,122,255,.55)':'rgba(117,210,255,.55)');g.addColorStop(1,'rgba(120,225,255,0)');ctx.fillStyle=g;ctx.fillRect(0,y,W,32)}
      ctx.restore();}
    if(state.flash>0){ctx.fillStyle='rgba(230,245,255,'+(state.flash*.18)+')';ctx.fillRect(0,0,W,H)}
    return;
  }
  return oldDrawBg(theme);
};

function crowSprite(o,n){
  if(typeof HD_L1!=='undefined'&&typeof HD_L1_RECTS!=='undefined'&&ready(HD_L1.birds)&&HD_L1_RECTS.birds){
    const frames=HD_L1_RECTS.birds,fi=Math.abs(Math.floor((o.phase||0)*.76))%frames.length,scale=n===8?.155:n===9?.166:.176;
    ctx.save();ctx.filter=n===8?'brightness(.34) saturate(1.0) contrast(1.45) hue-rotate(185deg)':'brightness(.20) saturate(1.45) contrast(1.75) hue-rotate(245deg)';
    ctx.shadowColor=n===8?'rgba(69,159,220,.45)':'rgba(151,64,255,.62)';ctx.shadowBlur=n===8?13:20;ctx.shadowOffsetY=5;
    drawSpriteCenter(HD_L1.birds,frames[fi],o.x,o.y,scale,(o.hfDive?Math.sin((o.phase||0)*.52)*.16:Math.sin((o.phase||0))*.055),1,true,.5,.5);ctx.restore();
  }else{
    ctx.save();ctx.translate(o.x,o.y);const wing=Math.sin((o.phase||0)*1.8);ctx.rotate(o.hfDive?wing*.14:wing*.04);ctx.shadowColor=n>=9?'rgba(150,55,255,.55)':'rgba(48,100,160,.35)';ctx.shadowBlur=n>=9?18:12;ctx.fillStyle=n>=9?'#090b16':'#172137';ctx.beginPath();ctx.ellipse(0,2,25,14,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(4,-5);ctx.quadraticCurveTo(20,-35-wing*10,43,-31-wing*7);ctx.quadraticCurveTo(28,-9,13,4);ctx.fill();ctx.beginPath();ctx.moveTo(6,5);ctx.quadraticCurveTo(22,34+wing*10,44,29+wing*7);ctx.quadraticCurveTo(27,11,13,4);ctx.fill();ctx.fillStyle='#f3f7ff';ctx.beginPath();ctx.arc(-13,-4,6,0,Math.PI*2);ctx.fill();ctx.fillStyle=n>=9?'#ff435f':'#ffe36e';ctx.beginPath();ctx.arc(-15,-4,2.5,0,Math.PI*2);ctx.fill();ctx.fillStyle=n>=9?'#ff3157':'#ff6b70';ctx.beginPath();ctx.moveTo(-23,-2);ctx.lineTo(-43,3);ctx.lineTo(-23,8);ctx.closePath();ctx.fill();ctx.restore();
  }
  if(n>=9||o.type==='birdfast'){ctx.save();ctx.globalCompositeOperation='screen';for(let i=0;i<3;i++){ctx.strokeStyle='rgba('+(n===10?'220,95,255':'116,174,255')+','+(.22-i*.05)+')';ctx.lineWidth=5-i*1.2;ctx.beginPath();ctx.moveTo(o.x+32+i*7,o.y-8+i*6);ctx.lineTo(o.x+95+i*17,o.y-13+i*8);ctx.stroke()}ctx.restore()}
}
const oldDrawBird=drawBird;
drawBird=function(o){const n=lv();if(n>=8&&n<=10&&(o.type==='bird'||o.type==='birdfast'||o.type==='owl')){crowSprite(o,n);return}return oldDrawBird(o)};
const oldSpawnBird=spawnBird;
spawnBird=function(theme){const n=(theme&&theme.id)||lv();if(state.mode==='endless'||n<8)return oldSpawnBird(theme);const fast=Math.random()<(n===8?.44:n===9?.64:.72),y=rand(170,H-220),speed=levelTheme(state.levelIndex).speed+rand(fast?46:28,n===10?112:n===9?96:72);state.obstacles.push({type:fast?'birdfast':'bird',x:W+105,y:y,baseY:y,vx:speed,r:n===8?23:25,phase:rand(0,6.2),amp:rand(12,28),warned:false,passed:false,near:false,variant:Math.floor(Math.random()*4),hfDive:Math.random()<(n===8?.28:n===9?.48:.58),hfDiveStart:false,hfDiveTarget:y})};

function stormFace(n,o){const mood=Math.sin((o.phase||0)*.7+state.time*1.3+(o.variant||0)),eye=n>=9?'rgba(255,86,62,.98)':'rgba(255,190,68,.98)';ctx.save();ctx.shadowColor=eye;ctx.shadowBlur=n>=9?18:13;ctx.fillStyle=eye;ctx.beginPath();ctx.ellipse(-17,3,6.5,5,-.15,0,Math.PI*2);ctx.ellipse(17,3,6.5,5,.15,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(28,12,24,.85)';ctx.lineWidth=4.5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-29,-8);ctx.lineTo(-12,-3);ctx.moveTo(29,-8);ctx.lineTo(12,-3);ctx.stroke();ctx.strokeStyle=n>=9?'rgba(255,92,71,.98)':'rgba(255,198,70,.98)';ctx.lineWidth=4.5;ctx.beginPath();if(mood>0){ctx.moveTo(-18,25);ctx.quadraticCurveTo(0,14,18,25)}else{ctx.moveTo(-18,21);ctx.quadraticCurveTo(0,37,18,21)}ctx.stroke();ctx.restore()}
function drawStormHD(o,n){const rects=(typeof HD_L4_RECTS!=='undefined'&&HD_L4_RECTS.storms)||null;if(rects&&typeof HD_L4!=='undefined'&&ready(HD_L4.pack)){const r=rects[(o.variant||0)%rects.length];ctx.save();ctx.filter=n===7?'hue-rotate(170deg) saturate(.72) brightness(1.12) contrast(1.10)':n===8?'hue-rotate(148deg) saturate(1.02) brightness(.97) contrast(1.12)':n===9?'hue-rotate(214deg) saturate(1.34) brightness(.75) contrast(1.32)':'hue-rotate(255deg) saturate(1.45) brightness(.68) contrast(1.42)';const sc=n===7?(o.big?.44:.39):n===8?(o.big?.43:.38):n===9?(o.big?.46:.40):(o.big?.48:.42);drawSpriteCenter(HD_L4.pack,r,0,0,sc,Math.sin(state.time*1.6+(o.phase||0))*.025,o.warn>0?.94+Math.sin(state.time*30)*.06:1,false,.5,.5);ctx.restore()}else{drawStormCloudLocal(0,0,o.big?1.45:1.22,1,false)}stormFace(n,o);if(o.warn>0){const p=.16+.11*Math.sin(state.time*30);ctx.fillStyle='rgba(255,220,150,'+p+')';ctx.beginPath();ctx.arc(0,13,n>=9?73:68,0,Math.PI*2);ctx.fill()}if(o.bolt>0)drawLightningStrikeFancy(o.boltLen,true,false)}
const oldDrawStorm=drawStorm;
drawStorm=function(o){const n=lv();if(n>=7&&n<=10&&o.type==='storm'){ctx.save();ctx.translate(o.x,o.y);drawStormHD(o,n);ctx.restore();return}if(n===10&&o.type==='boss'){ctx.save();ctx.translate(o.x,o.y);drawFinalBoss(o);ctx.restore();return}return oldDrawStorm(o)};
const oldSpawnStorm=spawnStorm;
spawnStorm=function(theme){const n=(theme&&theme.id)||lv();if(state.mode==='endless'||n<7)return oldSpawnStorm(theme);const big=Math.random()<(n===7?.36:n===8?.44:n===9?.54:.60);state.obstacles.push({type:'storm',x:W+125,y:rand(195,H-300),vx:levelTheme(state.levelIndex).speed+rand(8,n>=9?28:18),r:n===7?(big?54:48):n===8?(big?57:49):n===9?(big?60:51):(big?62:53),phase:rand(0,6.2),warn:0,bolt:0,flashCd:n===7?rand(1.15,2.0):n===8?rand(.95,1.7):n===9?rand(.72,1.35):rand(.68,1.28),boltLen:n===7?rand(180,250):n===8?rand(195,275):rand(215,310),passed:false,near:false,big:big,canBolt:true,variant:Math.floor(Math.random()*4)})};
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