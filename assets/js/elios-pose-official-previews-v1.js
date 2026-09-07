(()=>{
  'use strict';
  if(window.__LRF_ELIOS_OFFICIAL_PREVIEWS__) return;
  window.__LRF_ELIOS_OFFICIAL_PREVIEWS__=true;

  // Source officielle : Catalogue Général ELIOS 2026, pages imprimées 442 à 451
  // (pages PDF 223 à 227). Ce module ne touche jamais au calculateur.
  const PDF_URL='assets/pdf/ELIOS_CATALOGUE-GENERALE-2026-1.pdf';
  const PDFJS_URL='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';
  const PDFJS_WORKER='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
  const REF_W=2709, REF_H=1764, RENDER_W=1800;

  // Coordonnées relevées directement sur les planches officielles du catalogue.
  const C={
    '1':[223,95,343,412,412],'2':[223,740,342,412,412],'5':[223,1450,343,412,412],'6':[223,2093,343,413,412],
    '3':[223,95,1031,412,412],'4':[223,741,1031,412,412],'7':[223,1450,1031,412,412],'8':[223,2093,1031,413,412],
    '9':[224,95,343,412,412],'10':[224,741,343,412,412],'13':[224,1450,343,412,412],'15':[224,2096,343,412,412],
    '11':[224,95,1029,412,412],'12':[224,741,1027,412,412],'14':[224,1450,1029,412,412],'16':[224,2096,1029,412,412],
    '17':[225,94,343,412,412],'18':[225,741,343,412,412],'21':[225,1449,346,412,412],'22':[225,2095,346,412,412],
    '19':[225,94,1029,412,412],'20':[225,741,1029,412,412],'23':[225,1449,1035,412,412],'24':[225,2095,1029,412,412],
    '25':[226,93,346,412,412],'26':[226,742,344,412,412],'29':[226,1449,344,412,412],'30':[226,2094,343,405,414],
    '27':[226,93,1033,412,412],'28':[226,742,1031,412,412],'31':[226,1449,1034,415,412],'32':[226,2093,1034,414,412],
    'S01':[227,97,471,349,349],'S02':[227,505,471,348,349],'S03':[227,910,471,349,349],
    'S07':[227,1453,471,349,349],'S08':[227,1859,471,349,349],'S09':[227,2266,471,349,349],
    'S04':[227,97,1061,349,349],'S05':[227,505,1061,348,349],'S06':[227,910,1061,349,349],
    'S10':[227,1453,1061,349,349],'S11':[227,1859,1061,349,349],'S12':[227,2266,1061,349,349]
  };

  function installResponsiveStyle(){
    if(document.getElementById('elios-pose-official-mobile-style')) return;
    const style=document.createElement('style');
    style.id='elios-pose-official-mobile-style';
    style.textContent=`
      .ep-main,.ep-main *{box-sizing:border-box}
      .ep-main{min-width:0;max-width:100%;overflow-x:hidden}
      .ep-intro{min-width:0;flex-wrap:wrap;align-items:flex-start}
      .ep-intro p{flex:1 1 560px;min-width:0;max-width:100%;overflow-wrap:break-word}
      .ep-source{max-width:100%;white-space:normal;text-align:center}
      .ep-toolbar{grid-template-columns:repeat(4,minmax(0,1fr));min-width:0}
      .ep-tab{width:100%;min-width:0;overflow:hidden}
      .ep-tab b,.ep-tab span{overflow-wrap:anywhere}
      .ep-shell{grid-template-columns:minmax(0,1.06fr) minmax(0,.94fr);min-width:0}
      .ep-left,.ep-right,.ep-preview-card,.ep-config-card,.ep-results{min-width:0;max-width:100%}
      .ep-pattern-grid{grid-template-columns:repeat(3,minmax(0,1fr));min-width:0;width:100%}
      .ep-pattern{display:block;width:100%;min-width:0;max-width:100%;overflow:hidden}
      .ep-pattern>div{position:relative;width:100%;min-width:0;max-width:100%;isolation:isolate}
      .ep-pattern>div>svg,#ep-preview>svg{visibility:hidden!important;opacity:0!important}
      .ep-pattern>div:not(.ep-official-ready)::after,#ep-preview:not(.ep-official-ready)::after{content:'Chargement du schéma officiel…';position:absolute;inset:0;display:grid;place-items:center;padding:12px;text-align:center;font-size:.62rem;font-weight:800;line-height:1.25;color:#8b806c;background:linear-gradient(110deg,#f7f4ed 25%,#fff 45%,#f7f4ed 65%);background-size:220% 100%;animation:epOfficialLoading 1.1s linear infinite;z-index:1}
      @keyframes epOfficialLoading{to{background-position:-220% 0}}
      .ep-official-preview{position:absolute!important;inset:0!important;z-index:2!important;display:block!important;width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;object-fit:contain!important;background:#fff!important}
      #ep-preview{position:relative;width:100%;max-width:350px;aspect-ratio:1/1;min-width:0;overflow:hidden}
      #ep-preview .ep-official-preview{border-radius:8px}
      @media(max-width:980px){
        .ep-shell{display:block;width:100%}
        .ep-right{width:100%;margin-top:16px}
        .ep-pattern-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
        .ep-toolbar{grid-template-columns:repeat(2,minmax(0,1fr))}
      }
      @media(max-width:640px){
        .ep-main{width:100%;padding:16px 10px 44px!important}
        .ep-back-link{margin-bottom:14px;font-size:.95rem;white-space:normal}
        .ep-intro{display:grid!important;grid-template-columns:minmax(0,1fr);gap:12px;margin-bottom:16px}
        .ep-intro p{width:100%;font-size:.92rem;line-height:1.48;overflow-wrap:anywhere}
        .ep-source{justify-self:start;font-size:.66rem;padding:7px 10px}
        .ep-toolbar{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px;width:100%;margin-bottom:14px}
        .ep-tab{min-height:62px;padding:10px 11px!important;border-radius:12px}
        .ep-tab b{font-size:.82rem;line-height:1.15}
        .ep-tab span{font-size:.64rem;line-height:1.2;margin-top:4px}
        .ep-shell{display:block!important;width:100%;min-width:0}
        .ep-left,.ep-preview-card,.ep-config-card,.ep-results{width:100%;min-width:0;max-width:100%;padding:13px!important;border-radius:16px!important}
        .ep-right{width:100%;min-width:0;margin-top:14px;gap:14px}
        .ep-step{gap:10px;margin-bottom:13px}
        .ep-step>span{width:32px;height:32px}
        .ep-step b{font-size:.96rem;line-height:1.2}
        .ep-step small{font-size:.7rem;line-height:1.3}
        .ep-pattern-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px;width:100%;max-height:none!important;overflow:visible!important;padding:0}
        .ep-pattern{width:100%;min-width:0;padding:7px!important;border-radius:12px}
        .ep-pattern.active{padding:6px!important}
        .ep-pattern>div{width:100%;aspect-ratio:1/1;border-radius:7px}
        .ep-pattern b{font-size:.72rem;line-height:1.2;margin-top:6px;white-space:normal!important;overflow-wrap:anywhere;min-height:1.7em}
        .ep-pattern small{font-size:.56rem;line-height:1.25;min-height:0!important;overflow-wrap:anywhere}
        .ep-pattern>div:not(.ep-official-ready)::after{font-size:.55rem;padding:7px}
        .ep-preview-top{align-items:flex-start;gap:8px}
        .ep-preview-top h3{font-size:1.3rem;line-height:1.1}
        .ep-badge{flex:0 0 auto;font-size:.56rem;padding:6px 8px;white-space:nowrap}
        #ep-preview{width:min(100%,310px);max-width:310px;margin:12px auto}
        .ep-ratios{gap:5px}
        .ep-ratios span{font-size:.61rem;padding:5px 7px}
        .ep-controls,.ep-surface-grid,.ep-total-cards{grid-template-columns:minmax(0,1fr)!important;width:100%}
        .ep-controls select,.ep-surface-grid input,.ep-surface-grid select{max-width:100%;min-width:0}
        .ep-results{margin-top:14px}
        .ep-table-wrap{width:100%;max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}
      }
      @media(max-width:370px){
        .ep-main{padding-left:8px!important;padding-right:8px!important}
        .ep-toolbar{gap:6px}
        .ep-tab{padding:9px!important}
        .ep-pattern-grid{gap:6px}
      }
      @media(prefers-reduced-motion:reduce){.ep-pattern>div:not(.ep-official-ready)::after,#ep-preview:not(.ep-official-ready)::after{animation:none}}
    `;
    document.head.appendChild(style);
  }

  installResponsiveStyle();

  const crops=new Map();
  const pageJobs=new Map();
  let pdfJob=null;
  let renderQueue=Promise.resolve();

  const getPdf=()=>{
    if(!pdfJob){
      pdfJob=import(PDFJS_URL).then(pdfjs=>{
        pdfjs.GlobalWorkerOptions.workerSrc=PDFJS_WORKER;
        return pdfjs.getDocument({url:PDF_URL}).promise;
      });
    }
    return pdfJob;
  };

  async function renderAndCachePage(pageNo){
    const pdf=await getPdf();
    const page=await pdf.getPage(pageNo);
    const base=page.getViewport({scale:1});
    const viewport=page.getViewport({scale:RENDER_W/base.width});
    const canvas=document.createElement('canvas');
    canvas.width=Math.round(viewport.width);
    canvas.height=Math.round(viewport.height);
    const ctx=canvas.getContext('2d',{alpha:false});
    await page.render({canvasContext:ctx,viewport,background:'#ffffff'}).promise;

    const sx=canvas.width/REF_W, sy=canvas.height/REF_H;
    Object.entries(C).forEach(([id,v])=>{
      if(v[0]!==pageNo) return;
      const [,x,y,w,h]=v;
      const out=document.createElement('canvas');
      out.width=Math.max(220,Math.round(w*sx));
      out.height=Math.max(220,Math.round(h*sy));
      const o=out.getContext('2d',{alpha:false});
      o.fillStyle='#fff';o.fillRect(0,0,out.width,out.height);
      o.drawImage(canvas,x*sx,y*sy,w*sx,h*sy,0,0,out.width,out.height);
      crops.set(id,out.toDataURL('image/png'));
      out.width=1;out.height=1;
    });
    page.cleanup();
    canvas.width=1;canvas.height=1;
  }

  function ensurePage(pageNo){
    if(!pageJobs.has(pageNo)){
      const job=renderQueue.then(()=>renderAndCachePage(pageNo));
      renderQueue=job.catch(()=>{});
      pageJobs.set(pageNo,job);
    }
    return pageJobs.get(pageNo);
  }

  async function srcFor(id){
    if(crops.has(id)) return crops.get(id);
    const v=C[id];
    if(!v) return null;
    await ensurePage(v[0]);
    return crops.get(id)||null;
  }

  function officialImg(src,label){
    const img=document.createElement('img');
    img.className='ep-official-preview';
    img.src=src;
    img.alt=`${label} — schéma officiel Elios 2026`;
    img.decoding='async';
    return img;
  }

  async function paintCard(btn){
    const id=btn?.dataset?.pattern;
    const box=btn?.querySelector(':scope > div');
    if(!id||!box||!C[id]) return;
    box.classList.remove('ep-official-ready');
    try{
      const src=await srcFor(id);
      if(!src||!btn.isConnected||btn.dataset.pattern!==id) return;
      const current=box.querySelector('.ep-official-preview');
      if(current?.src===src){box.classList.add('ep-official-ready');return;}
      box.replaceChildren(officialImg(src,btn.querySelector('b')?.textContent||`Schéma ${id}`));
      box.classList.add('ep-official-ready');
    }catch(err){
      console.warn('Aperçu officiel Elios indisponible pour',id,err);
    }
  }

  async function paintLarge(){
    const active=document.querySelector('#ep-pattern-grid .ep-pattern.active');
    const id=active?.dataset?.pattern;
    const box=document.getElementById('ep-preview');
    if(!id||!box||!C[id]) return;
    box.classList.remove('ep-official-ready');
    try{
      const src=await srcFor(id);
      const stillActive=document.querySelector('#ep-pattern-grid .ep-pattern.active')?.dataset?.pattern;
      if(!src||stillActive!==id) return;
      box.replaceChildren(officialImg(src,document.getElementById('ep-preview-title')?.textContent||`Schéma ${id}`));
      box.classList.add('ep-official-ready');
      const badge=document.getElementById('ep-preview-badge');
      if(badge) badge.textContent='ELIOS 2026 · OFFICIEL';
    }catch(err){
      console.warn('Grand aperçu officiel Elios indisponible',err);
    }
  }

  function refresh(){
    document.querySelectorAll('#ep-pattern-grid .ep-pattern').forEach(paintCard);
    paintLarge();
  }

  function init(){
    const root=document.getElementById('elios-pose-app');
    if(!root) return;
    refresh();
    // Le configurateur recrée ses boutons après un changement de schéma/famille.
    // On repeint uniquement après les clics : pas de MutationObserver, donc aucun risque de boucle/freeze.
    root.addEventListener('click',e=>{
      if(e.target.closest('.ep-pattern,.ep-tab')) setTimeout(refresh,0);
    });
    window.addEventListener('beforeprint',refresh);
  }

  // Le conteneur existe déjà à cet endroit de la page : on applique les styles et on masque
  // les anciens SVG immédiatement, sans attendre DOMContentLoaded.
  if(document.getElementById('elios-pose-app')) init();
  else if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();