(()=>{
  const VERSION='20260927-final-hd1';
  const q=p=>`${p}?v=${VERSION}`;
  const txt=p=>fetch(q(p),{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`${p} ${r.status}`);return r.text();});
  const imgFromB64=b64=>{const im=new Image();im.decoding='async';im.src=`data:image/webp;base64,${b64.trim()}`;return im;};
  const imgReady=im=>!!(im&&im.complete&&im.naturalWidth>0);
  const waitImg=im=>new Promise(resolve=>{if(imgReady(im))return resolve(true);const done=()=>resolve(imgReady(im));im.addEventListener('load',done,{once:true});im.addEventListener('error',()=>resolve(false),{once:true});if(im.decode)im.decode().then(done).catch(()=>{});});

  const HF={version:VERSION,ready:false,images:{},installed:false};
  window.NuageNomadeFinalHotfix=HF;

  const style=document.createElement('style');
  style.textContent=`
    .score-banner::before{display:none!important;content:none!important}
    .score-banner #bestEndless{background:transparent!important;z-index:2!important}
  `;
  document.head.appendChild(style);

  HF.readyPromise=Promise.all([
    txt('./hotfix-assets/bg8.txt'),txt('./hotfix-assets/bg9.txt'),txt('./hotfix-assets/bg10.txt'),
    txt('./hotfix-assets/crows.json'),txt('./hotfix-assets/storms.json'),txt('./hotfix-assets/boss.json')
  ]).then(([b8,b9,b10,cj,sj,bj])=>{
    HF.images.bg8=imgFromB64(b8);HF.images.bg9=imgFromB64(b9);HF.images.bg10=imgFromB64(b10);
    HF.images.crows=JSON.parse(cj).map(imgFromB64);
    HF.images.storms=JSON.parse(sj).map(imgFromB64);
    const bo=JSON.parse(bj);HF.images.boss={};for(const [k,v] of Object.entries(bo))HF.images.boss[k]=imgFromB64(v);
    return Promise.all([
      waitImg(HF.images.bg8),waitImg(HF.images.bg9),waitImg(HF.images.bg10),
      ...HF.images.crows.map(waitImg),...HF.images.storms.map(waitImg),...Object.values(HF.images.boss).map(waitImg)
    ]);
  }).then(results=>{HF.ready=results.every(Boolean);install();return HF.ready;}).catch(err=>{console.error('[Nuage Nomade hotfix]',err);install();return false;});

  function install(){
    if(HF.installed)return;HF.installed=true;
    try{
      if(typeof LEVEL_CARD_ART!=='undefined'){
        LEVEL_CARD_ART[8]=HF.images.bg8?.src||LEVEL_CARD_ART[8];
        LEVEL_CARD_ART[9]=HF.images.bg9?.src||LEVEL_CARD_ART[9];
        LEVEL_CARD_ART[10]=HF.images.bg10?.src||LEVEL_CARD_ART[10];
      }

      const originalStartLevel=typeof startLevel==='function'?startLevel:null;
      if(originalStartLevel){
        startLevel=function(idx){
          if(idx>=6&&!HF.ready){
            try{showToast('Chargement des assets HD…');}catch(e){}
            HF.readyPromise.then(()=>originalStartLevel(idx));
            return;
          }
          return originalStartLevel(idx);
        };
      }

      if(typeof level8AssetsReady==='function') level8AssetsReady=()=>imgReady(HF.images.bg8);
      if(typeof level9AssetsReady==='function') level9AssetsReady=()=>imgReady(HF.images.bg9);
      if(typeof level10AssetsReady==='function') level10AssetsReady=()=>imgReady(HF.images.bg10)&&Object.values(HF.images.boss||{}).every(imgReady);
      if(typeof preloadLevel8HD==='function') preloadLevel8HD=()=>HF.readyPromise;
      if(typeof preloadLevel9HD==='function') preloadLevel9HD=()=>HF.readyPromise;
      if(typeof preloadLevel10HD==='function') preloadLevel10HD=()=>HF.readyPromise;

      if(typeof drawLevel8BackdropHD==='function') drawLevel8BackdropHD=()=>drawHFBackdrop(HF.images.bg8,'aurora',8);
      if(typeof drawLevel9BackdropHD==='function') drawLevel9BackdropHD=()=>drawHFBackdrop(HF.images.bg9,'vortex',9);
      if(typeof drawLevel10BackdropHD==='function') drawLevel10BackdropHD=()=>drawHFBackdrop(HF.images.bg10,'boss',10);

      if(typeof drawLightningStrikeFancy==='function') drawLightningStrikeFancy=drawHFLightning;

      const oldSpawnBird=typeof spawnBird==='function'?spawnBird:null;
      if(oldSpawnBird) spawnBird=function(theme){
        const lv=typeof levelTheme==='function'?levelTheme(state.levelIndex).id:(state.levelIndex+1);
        if(state.mode==='endless'||lv<8)return oldSpawnBird(theme);
        const aggressive=lv>=9;
        const type=Math.random()<(aggressive?.72:.55)?'birdfast':'bird';
        const y=rand(170,H-220);
        const base=levelTheme(state.levelIndex).speed;
        const speed=base+rand(aggressive?56:34,aggressive?108:72);
        const dive=Math.random()<(lv===8?.28:lv===9?.48:.58);
        state.obstacles.push({
          type,x:W+100,y,vx:speed,r:aggressive?26:24,phase:rand(0,6.2),
          amp:dive?rand(260,520):rand(70,165),warned:false,passed:false,near:false,
          variant:Math.floor(Math.random()*HF.images.crows.length),hfCrow:true,
          hfAggressive:aggressive,hfDive:dive,hfScale:rand(.92,1.08)
        });
      };

      const oldDrawBird=typeof drawBird==='function'?drawBird:null;
      if(oldDrawBird) drawBird=function(o){
        const lv=state.mode!=='endless'?(state.levelIndex+1):0;
        if(lv>=8&&lv<=10&&o.hfCrow!==false&&drawHFCrow(o,lv))return;
        return oldDrawBird(o);
      };

      const oldSpawnStorm=typeof spawnStorm==='function'?spawnStorm:null;
      if(oldSpawnStorm) spawnStorm=function(theme){
        const lv=typeof levelTheme==='function'?levelTheme(state.levelIndex).id:(state.levelIndex+1);
        if(state.mode==='endless'||lv<7)return oldSpawnStorm(theme);
        const y=rand(195,H-300);
        const big=Math.random()<(lv===7?.48:lv===8?.52:lv===9?.58:.62);
        const speed=levelTheme(state.levelIndex).speed+rand(8,lv>=9?27:18);
        state.obstacles.push({
          type:'storm',x:W+130,y,vx:speed,
          r:lv===7?(big?58:50):lv===8?(big?60:52):(big?64:54),
          phase:rand(0,6.2),warn:0,bolt:0,
          flashCd:lv===7?rand(1.15,2.05):lv===8?rand(.95,1.72):lv===9?rand(.68,1.35):rand(.62,1.25),
          boltLen:lv===7?rand(180,255):lv===8?rand(195,280):rand(215,320),
          passed:false,near:false,big,canBolt:true,
          variant:Math.floor(Math.random()*HF.images.storms.length),hfStorm:true
        });
      };

      const oldDrawStorm=typeof drawStorm==='function'?drawStorm:null;
      if(oldDrawStorm) drawStorm=function(o){
        const lv=state.mode!=='endless'?(state.levelIndex+1):0;
        if(lv>=7&&lv<=10&&o.type==='storm'&&drawHFStorm(o,lv))return;
        return oldDrawStorm(o);
      };

      if(typeof stormChanceForLevel==='function'){
        const oldStormChance=stormChanceForLevel;
        stormChanceForLevel=function(level){
          if(state.mode!=='endless'){
            if(level.id===7)return .26;
            if(level.id===8)return .31;
            if(level.id===9)return .40;
            if(level.id===10)return .36;
          }
          return oldStormChance(level);
        };
      }

      if(typeof drawBossFinal==='function') drawBossFinal=drawHFBoss;

      const tune=()=>{
        try{
          if(state&&state.running&&state.mode!=='endless'){
            const lv=state.levelIndex+1;
            if(lv>=7&&lv<=10&&Array.isArray(state.obstacles)){
              let stormCount=0,crowCount=0;
              for(const o of state.obstacles){
                if(o.type==='storm'){
                  stormCount++;
                  const cap=lv===7?1.8:lv===8?1.45:lv===9?1.18:1.1;
                  if(o.canBolt!==false&&o.warn<=0&&o.bolt<=0&&Number.isFinite(o.flashCd)&&o.flashCd>cap)o.flashCd=cap+Math.random()*.22;
                }
                if(o.type==='bird'||o.type==='birdfast'||o.type==='owl')crowCount++;
              }
              if(lv===10&&state.bossSpawned){
                if(stormCount>3){let keep=3;for(const o of state.obstacles){if(o.type==='storm'&&--keep<0)o.x=-999;}}
                if(crowCount>5){let keep=5;for(const o of state.obstacles){if((o.type==='bird'||o.type==='birdfast'||o.type==='owl')&&--keep<0)o.x=-999;}}
              }
            }
          }
        }catch(e){}
        requestAnimationFrame(tune);
      };
      requestAnimationFrame(tune);

      try{renderLevelGrid();}catch(e){}
      console.info('[Nuage Nomade] final HD hotfix installed',VERSION);
    }catch(err){console.error('[Nuage Nomade hotfix install]',err);}
  }

  function drawHFBackdrop(img,theme,lv){
    if(typeof ctx==='undefined'||typeof W==='undefined'||typeof H==='undefined')return;
    ctx.clearRect(0,0,W,H);
    if(imgReady(img)&&typeof drawImageCover==='function')drawImageCover(img,Math.sin(state.time*.06)*5,Math.cos(state.time*.045)*4,1.02);
    else{ctx.fillStyle=typeof skyGradient==='function'?skyGradient(theme):'#203c70';ctx.fillRect(0,0,W,H);}
    if(typeof drawCloudLayer==='function'&&state){
      try{drawCloudLayer(state.farClouds,theme,.08);drawCloudLayer(state.midClouds,theme,.10);}catch(e){}
    }
    if(typeof drawWind==='function')try{drawWind();}catch(e){}
    if(typeof drawCloudLayer==='function'&&state)try{drawCloudLayer(state.nearClouds,theme,.13);}catch(e){}
    if(lv===10&&state.bossSpawned){
      const phase=Math.max(1,state.bossPhase||1);ctx.save();
      const g=ctx.createRadialGradient(W*.76,H*.28,20,W*.76,H*.28,240);
      g.addColorStop(0,`rgba(201,125,255,${.07+phase*.018})`);g.addColorStop(.48,'rgba(69,34,140,.055)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.restore();
    }
    if(typeof drawBottomFog==='function')try{drawBottomFog();}catch(e){}
    if(state.flash>0){ctx.fillStyle=`rgba(228,238,255,${state.flash*.18})`;ctx.fillRect(0,0,W,H);}
  }

  function drawHFCrow(o,lv){
    const imgs=HF.images.crows;if(!imgs||!imgs.length||!imgs.every(imgReady))return false;
    const frame=(Math.floor((o.phase||0)*.72)+(o.variant||0))%imgs.length;
    const img=imgs[(frame+imgs.length)%imgs.length];
    const aggressive=lv>=9;
    const baseW=aggressive?(o.type==='birdfast'?126:138):(o.type==='birdfast'?116:126);
    const targetW=baseW*(o.hfScale||1);const sc=targetW/img.naturalWidth,dw=targetW,dh=img.naturalHeight*sc;
    const diveTilt=o.hfDive?Math.sin((o.phase||0)*.72)*.20:0;
    ctx.save();ctx.translate(o.x,o.y);ctx.rotate(Math.sin((o.phase||0))*.06+diveTilt);ctx.scale(-1,1);
    if(aggressive||o.type==='birdfast'){
      ctx.save();ctx.globalCompositeOperation='screen';for(let i=0;i<3;i++){ctx.strokeStyle=`rgba(166,88,255,${.23-i*.05})`;ctx.lineWidth=5-i;ctx.beginPath();ctx.moveTo(26+i*8,-8+i*5);ctx.lineTo(90+i*18,-13+i*7);ctx.stroke();}ctx.restore();
    }
    ctx.shadowColor=aggressive?'rgba(133,51,255,.55)':'rgba(82,111,185,.40)';ctx.shadowBlur=aggressive?20:14;ctx.shadowOffsetY=5;
    const flap=1+Math.sin((o.phase||0)*2.3)*.035;ctx.drawImage(img,-dw*.5,-dh*.5,dw*flap,dh*flap);ctx.restore();return true;
  }

  function drawHFStorm(o,lv){
    const imgs=HF.images.storms;if(!imgs||!imgs.length||!imgs.every(imgReady))return false;
    let idx=o.variant||0;if(o.bolt>0)idx=1;else if(o.warn>0)idx=2+((o.variant||0)%2);else idx=(idx+Math.floor(state.time*.55))%imgs.length;
    const img=imgs[idx%imgs.length];
    const targetW=(lv===7?(o.big?196:174):lv===8?(o.big?190:166):lv===9?(o.big?202:176):(o.big?210:180));
    const sc=targetW/img.naturalWidth,dw=targetW,dh=img.naturalHeight*sc;
    ctx.save();ctx.translate(o.x,o.y);ctx.rotate(Math.sin((o.phase||0)*.75)*.025);ctx.globalAlpha=o.warn>0?.92+Math.sin(state.time*28)*.08:1;
    ctx.shadowColor=o.bolt>0?'rgba(255,150,68,.7)':'rgba(75,56,160,.38)';ctx.shadowBlur=o.bolt>0?26:17;ctx.drawImage(img,-dw*.52,-dh*.50,dw,dh);
    if(o.warn>0){const p=.20+Math.sin(state.time*28)*.12;ctx.fillStyle=`rgba(255,220,150,${p})`;ctx.beginPath();ctx.arc(0,12,70,0,Math.PI*2);ctx.fill();}
    if(o.bolt>0)drawHFLightning(o.boltLen,true,false);
    ctx.restore();return true;
  }

  function drawHFLightning(len,level4=false,boss=false){
    const t=state.time||0,j=n=>Math.sin(t*49+n*11)*(boss?7:5),pts=[[0,0],[10+j(1),len*.14],[-9+j(2),len*.31],[13+j(3),len*.51],[-5+j(4),len*.75],[6+j(5),len]];
    ctx.save();ctx.globalCompositeOperation='screen';ctx.lineCap='round';ctx.lineJoin='round';
    ctx.shadowColor='rgba(130,210,255,.98)';ctx.shadowBlur=boss?62:44;ctx.strokeStyle='rgba(130,205,255,.48)';ctx.lineWidth=boss?18:13;path(pts);ctx.stroke();
    ctx.strokeStyle='rgba(205,239,255,.98)';ctx.lineWidth=boss?9:7;ctx.shadowBlur=boss?42:30;path(pts);ctx.stroke();ctx.strokeStyle='#fff';ctx.lineWidth=boss?3.6:2.6;ctx.shadowBlur=17;path(pts);ctx.stroke();
    [[1,-34,.28],[2,27,.43],[3,-38,.63],[4,30,.85]].forEach((b,i)=>{const a=pts[b[0]],ex=a[0]+b[1]+j(20+i),ey=len*b[2];ctx.strokeStyle='rgba(180,228,255,.82)';ctx.lineWidth=boss?3.5:2.5;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(ex,ey);ctx.stroke();});
    const last=pts[pts.length-1],g=ctx.createRadialGradient(last[0],last[1],2,last[0],last[1],boss?68:48);g.addColorStop(0,'rgba(255,255,255,.98)');g.addColorStop(.25,'rgba(145,220,255,.52)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(last[0],last[1],boss?68:48,0,Math.PI*2);ctx.fill();ctx.restore();
    function path(a){ctx.beginPath();ctx.moveTo(a[0][0],a[0][1]);for(let i=1;i<a.length;i++)ctx.lineTo(a[i][0],a[i][1]);}
  }

  function drawHFBoss(boss){
    const B=HF.images.boss;if(!B||!Object.values(B).every(imgReady))return false;
    let img=B.idle,scale=.56;if(boss.state==='open'){img=B.core;scale=.61;}else if(boss.state==='hurt'){img=B.charge;scale=.60;}else if(boss.state==='defeat'){img=B.victory;scale=.68;}else if((state.bossPhase||1)>=3){img=B.enraged;scale=.57;}else if((state.bossPhase||1)===2&&Math.sin(state.time*2.4)>.2){img=B.charge;scale=.57;}
    ctx.save();ctx.globalAlpha=boss.state==='defeat'?Math.max(0,Math.min(1,boss.stateTimer/2.2)):1;ctx.translate(boss.x,boss.y);ctx.rotate(Math.sin(state.time*1.7)*.02);const pulse=1+Math.sin(state.time*4.2)*.02,dw=img.naturalWidth*scale*pulse,dh=img.naturalHeight*scale*pulse;ctx.shadowColor=(state.bossPhase||1)>=3?'rgba(255,70,230,.75)':'rgba(120,80,255,.58)';ctx.shadowBlur=34;ctx.drawImage(img,-dw*.52,-dh*.43,dw,dh);
    if(boss.state==='open'){const rr=52+Math.sin(state.time*8)*8,g=ctx.createRadialGradient(-5,60,5,-5,60,rr);g.addColorStop(0,'#fff');g.addColorStop(.28,'rgba(255,130,255,.75)');g.addColorStop(1,'rgba(150,40,255,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(-5,60,rr,0,Math.PI*2);ctx.fill();}ctx.restore();
    if(boss.warn>0){const bx=Number.isFinite(boss.boltX)?boss.boltX:(state.player?state.player.x:150);ctx.save();ctx.globalAlpha=.18+.1*Math.sin(state.time*30);ctx.fillStyle='#dff8ff';ctx.fillRect(bx-17,105,34,H-210);ctx.restore();}
    if(boss.bolt>0){const bx=Number.isFinite(boss.boltX)?boss.boltX:boss.x;ctx.save();ctx.translate(bx,108);drawHFLightning(H-215,true,true);ctx.restore();}
    return true;
  }
})();