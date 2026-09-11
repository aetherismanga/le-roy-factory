(() => {
  'use strict';
  if (window.__LRF_BIOPIETRA_OVERVIEW_CONSUMABLES_V1__) return;
  window.__LRF_BIOPIETRA_OVERVIEW_CONSUMABLES_V1__ = true;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const esc=v=>String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isBio=()=>norm($('#workspace-title')?.textContent)==='biopietra';

  const CONSUMABLES={
    'ecokoll 25 kg':{
      q:'Ecokoll',
      title:'Ecokoll',
      text:'Colle respirante recommandée pour la pose des parements Biopietra. Elle participe au système de pose complet de la marque et favorise une adhérence durable sur supports correctement préparés.'
    },
    'multikoll 25 kg':{
      q:'Multikoll',
      title:'Multikoll',
      text:'Adhésif respirant Biopietra destiné à la pose par double encollage. Il est prévu pour assurer une prise régulière des éléments de parement et existe en variantes adaptées à certaines teintes.'
    },
    'biostucco 25 kg':{
      q:'Biostucco',
      title:'Biostucco',
      text:'Mortier-joint respirant conçu pour la finition des parements Biopietra. Disponible en plusieurs coloris, il permet d’accorder le joint à la pierre et de renforcer le rendu naturel du mur.'
    },
    'biofin':{
      q:'Biofin',
      title:'Biofin',
      text:'Traitement de protection oléo-hydrofuge pour les parements Biopietra. Il aide à protéger les surfaces de l’humidité, des salissures et des agents extérieurs sans modifier l’aspect de la pierre.'
    }
  };

  let busy=false, timer=0;
  const mediaCache=new Map();

  function style(){
    if ($('#bio-overview-consumables-style')) return;
    const s=document.createElement('style');
    s.id='bio-overview-consumables-style';
    s.textContent=`
      .bio-about{margin:18px 0 16px;border:1px solid #d8cfbf;border-radius:22px;overflow:hidden;background:#fff;box-shadow:0 10px 28px rgba(38,31,20,.08);display:grid;grid-template-columns:minmax(250px,.9fr) 1.1fr}
      .bio-about-media{min-height:275px;background:#e9e3d7;position:relative;overflow:hidden}.bio-about-media img{width:100%;height:100%;min-height:275px;object-fit:cover;display:block}.bio-about-media:after{content:'Photo officielle Biopietra';position:absolute;left:14px;bottom:14px;background:rgba(15,15,15,.78);color:#fff;border:1px solid rgba(212,175,55,.8);border-radius:999px;padding:7px 11px;font-size:.7rem;font-weight:900}
      .bio-about-copy{padding:24px 26px;display:flex;flex-direction:column;justify-content:center}.bio-about-kicker{color:#91711a;font-size:.73rem;font-weight:950;letter-spacing:.11em;text-transform:uppercase;margin-bottom:7px}.bio-about h3{margin:0 0 11px;font-size:clamp(1.55rem,3vw,2.2rem);line-height:1.05;color:#191714}.bio-about p{margin:0;color:#514b42;line-height:1.58;font-size:.94rem}.bio-about-points{display:flex;flex-wrap:wrap;gap:7px;margin-top:15px}.bio-about-points span{background:#f2f8f2;border:1px solid #c9dfce;color:#1c6340;border-radius:999px;padding:7px 10px;font-size:.72rem;font-weight:850}.bio-about-link{margin-top:16px;display:inline-flex;align-self:flex-start;color:#6f5711;font-weight:900;text-decoration:none;border-bottom:1px solid #c5a33a;padding-bottom:2px}
      .bio-section{grid-column:1/-1}.bio-section-head{margin:8px 0 12px;padding:13px 15px;border-radius:15px;background:#f4efe5;border:1px solid #dfd5c5;display:flex;align-items:end;justify-content:space-between;gap:12px}.bio-section-head h3{margin:0;font-size:1.2rem;color:#211d17}.bio-section-head p{margin:0;color:#756c5e;font-size:.76rem}.bio-section-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(245px,1fr));gap:14px}
      .bio-section-consumables{margin-top:14px}.bio-section-consumables .bio-section-head{background:#eef6ef;border-color:#c6dccb}.bio-section-consumables .bio-card-top small{color:#17653d}.bio-consumable-desc{margin-top:8px!important;color:#544d42!important;font-size:.74rem!important;line-height:1.45!important}.bio-consumable-official{display:inline-flex;margin-top:8px;color:#765d12;font-weight:850;font-size:.7rem;text-decoration:none}
      @media(max-width:760px){.bio-about{grid-template-columns:1fr;margin:12px 0}.bio-about-media,.bio-about-media img{min-height:210px;max-height:250px}.bio-about-copy{padding:18px}.bio-about p{font-size:.87rem}.bio-section-head{align-items:flex-start;flex-direction:column;gap:3px}.bio-section-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  async function officialImage(search){
    const key=norm(search); if(mediaCache.has(key)) return mediaCache.get(key);
    const promise=(async()=>{
      try{
        const url='https://biopietra.com/wp-json/wp/v2/media?media_type=image&per_page=20&search='+encodeURIComponent(search);
        const r=await fetch(url,{mode:'cors',credentials:'omit'});
        if(!r.ok) return '';
        const data=await r.json();
        const pick=(data||[]).find(m=>m?.media_details?.width>=700)||data?.[0];
        return pick?.media_details?.sizes?.large?.source_url||pick?.media_details?.sizes?.full?.source_url||pick?.source_url||'';
      }catch{return ''}
    })();
    mediaCache.set(key,promise); return promise;
  }

  function ensureIntro(){
    if(!isBio()) return;
    const workspace=$('#partner-workspace'), filters=$('#v2-filters'); if(!workspace||!filters) return;
    let box=$('#bio-about');
    if(!box){
      box=document.createElement('section'); box.id='bio-about'; box.className='bio-about';
      box.innerHTML=`
        <div class="bio-about-media"><img id="bio-about-img" src="https://biopietra.com/wp-content/uploads/2016/08/Acropoli-M96-Torre-870x870.jpg" alt="Réalisation officielle Biopietra" loading="lazy"></div>
        <div class="bio-about-copy">
          <div class="bio-about-kicker">Biopietra, c’est quoi ?</div>
          <h3>La pierre régénérée italienne pensée pour construire durablement.</h3>
          <p>Biopietra conçoit des parements écologiques en pierre naturelle régénérée pour l’intérieur comme l’extérieur. La marque associe l’esthétique minérale de la pierre à une solution plus légère, respirante et facile à mettre en œuvre, avec une fabrication 100 % Made in Italy, un marquage CE et une démarche orientée bioarchitecture. Les produits sont conçus pour durer, résister aux variations climatiques et limiter l’impact environnemental, sans COV, résines ni formaldéhyde.</p>
          <div class="bio-about-points"><span>Intérieur & extérieur</span><span>Respirant</span><span>Faible épaisseur</span><span>100 % Made in Italy</span><span>Recyclable</span><span>Marquage CE</span></div>
          <a class="bio-about-link" href="https://biopietra.com/fr/biopietra-pierre-regeneree-bioarchitecture/" target="_blank" rel="noopener">Découvrir la technologie Biopietra ↗</a>
        </div>`;
      filters.parentNode.insertBefore(box,filters);
      officialImage('Ortisei').then(src=>{if(src&&$('#bio-about-img'))$('#bio-about-img').src=src});
    }
  }

  function decorateConsumable(card,cfg){
    if(card.dataset.bioConsumableDecorated==='1')return;
    card.dataset.bioConsumableDecorated='1';
    const topSmall=$('.bio-card-top small',card); if(topSmall) topSmall.textContent='CONSOMMABLE';
    const body=$('.bio-card-body',card); if(body&&!$('.bio-consumable-desc',body)){
      const p=document.createElement('p');p.className='bio-consumable-desc';p.textContent=cfg.text;body.appendChild(p);
      const a=document.createElement('a');a.className='bio-consumable-official';a.href='https://biopietra.com/fr/espace-technique/information-pour-la-pose/';a.target='_blank';a.rel='noopener';a.textContent='Conseils de pose officiels ↗';body.appendChild(a);
    }
    const img=$('.bio-card-top img',card);
    officialImage(cfg.q).then(src=>{if(src&&img)img.src=src});
  }

  function ensureSections(){
    if(!isBio()||busy)return;
    const host=$('#partner-products'); if(!host)return;
    const cards=$$('.bio-card',host); if(!cards.length)return;
    busy=true;
    try{
      let normal=$('#bio-products-section',host), cons=$('#bio-consumables-section',host);
      if(!normal){
        normal=document.createElement('section');normal.id='bio-products-section';normal.className='bio-section bio-section-products';
        normal.innerHTML='<div class="bio-section-head"><div><h3>Parements & produits Biopietra</h3><p>Sélectionnez une gamme pour voir ses couleurs, caractéristiques et tarifs PRO.</p></div></div><div class="bio-section-grid"></div>';
        host.appendChild(normal);
      }
      if(!cons){
        cons=document.createElement('section');cons.id='bio-consumables-section';cons.className='bio-section bio-section-consumables';
        cons.innerHTML='<div class="bio-section-head"><div><h3>Consommables Biopietra</h3><p>Colles, joints et protection recommandés pour le système de pose Biopietra.</p></div></div><div class="bio-section-grid"></div>';
        host.appendChild(cons);
      }
      const ngrid=$('.bio-section-grid',normal), cgrid=$('.bio-section-grid',cons);
      cards.forEach(card=>{
        const name=norm($('.bio-card-top strong',card)?.textContent||'');
        const cfg=CONSUMABLES[name];
        if(cfg){decorateConsumable(card,cfg);if(card.parentNode!==cgrid)cgrid.appendChild(card)}
        else if(card.parentNode!==ngrid)ngrid.appendChild(card);
      });
      const opt=$('#bio-filter-type option[value="accessoire pose"]'); if(opt)opt.textContent='Consommables';
    }finally{busy=false}
  }

  function sync(){
    if(!isBio())return;
    style();ensureIntro();ensureSections();
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(sync,90)}
  document.addEventListener('click',schedule,true);
  document.addEventListener('input',e=>{if(e.target?.id==='bio-search')schedule()},true);
  new MutationObserver(muts=>{
    if(busy)return;
    if(muts.some(m=>[...m.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('.bio-card,#partner-products')||n.querySelector?.('.bio-card')))))schedule();
  }).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(sync,350),{once:true});else setTimeout(sync,350);
})();