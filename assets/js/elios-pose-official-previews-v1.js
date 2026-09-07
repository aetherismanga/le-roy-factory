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
    img.style.cssText='display:block;width:100%;height:100%;object-fit:contain;background:#fff';
    return img;
  }

  async function paintCard(btn){
    const id=btn?.dataset?.pattern;
    const box=btn?.querySelector(':scope > div');
    if(!id||!box||!C[id]) return;
    try{
      const src=await srcFor(id);
      if(!src||!btn.isConnected||btn.dataset.pattern!==id) return;
      const current=box.querySelector('.ep-official-preview');
      if(current?.src===src) return;
      box.replaceChildren(officialImg(src,btn.querySelector('b')?.textContent||`Schéma ${id}`));
    }catch(err){
      console.warn('Aperçu officiel Elios indisponible pour',id,err);
    }
  }

  async function paintLarge(){
    const active=document.querySelector('#ep-pattern-grid .ep-pattern.active');
    const id=active?.dataset?.pattern;
    const box=document.getElementById('ep-preview');
    if(!id||!box||!C[id]) return;
    try{
      const src=await srcFor(id);
      const stillActive=document.querySelector('#ep-pattern-grid .ep-pattern.active')?.dataset?.pattern;
      if(!src||stillActive!==id) return;
      box.replaceChildren(officialImg(src,document.getElementById('ep-preview-title')?.textContent||`Schéma ${id}`));
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

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
