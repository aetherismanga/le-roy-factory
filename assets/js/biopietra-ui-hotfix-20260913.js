(() => {
  'use strict';
  if (window.__LRF_BIOPIETRA_UI_HOTFIX_20260913__) return;
  window.__LRF_BIOPIETRA_UI_HOTFIX_20260913__ = true;

  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const norm = v => String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const isBio = () => norm($('#workspace-title')?.textContent) === 'biopietra';
  let timer = 0;

  function ensureIntro(){
    if(!isBio()) return;
    const workspace = $('#partner-workspace');
    if(!workspace || $('#bio-about')) return;
    const box = document.createElement('section');
    box.id = 'bio-about';
    box.className = 'bio-about';
    box.innerHTML = `
      <div class="bio-about-media"><img id="bio-about-img" src="https://biopietra.com/wp-content/uploads/2016/08/Acropoli-M96-Torre-870x870.jpg" alt="Réalisation officielle Biopietra" loading="lazy"></div>
      <div class="bio-about-copy">
        <div class="bio-about-kicker">Biopietra, c’est quoi ?</div>
        <h3>La pierre naturelle régénérée italienne pour construire durablement.</h3>
        <p>Fabriquée en Italie, Biopietra est une pierre naturelle régénérée conçue pour la construction écologique et l’architecture durable. Adaptée à l’intérieur comme à l’extérieur, elle associe l’esthétique de la pierre naturelle à une solution légère, résistante et facile à poser. Certifiée CE et conforme aux normes UNI EN ISO, elle répond aux exigences des projets résidentiels, de rénovation et d’aménagement qui recherchent à la fois design, performance, qualité et respect de l’environnement.</p>
        <div class="bio-about-points"><span>Intérieur & extérieur</span><span>Respirant</span><span>Faible épaisseur</span><span>100 % Made in Italy</span><span>Recyclable</span><span>Marquage CE</span></div>
        <a class="bio-about-link" href="https://biopietra.com/fr/biopietra-pierre-regeneree-bioarchitecture/" target="_blank" rel="noopener">Découvrir la technologie Biopietra ↗</a>
      </div>`;
    const filters = $('#v2-filters');
    const products = $('#partner-products');
    if(filters?.parentNode) filters.parentNode.insertBefore(box, filters);
    else if(products?.parentNode) products.parentNode.insertBefore(box, products);
    else workspace.appendChild(box);
  }

  function scrubPrices(){
    if(!isBio()) return;
    $$('.bio-card-price,.bio-price-row,[data-bio-price],.price-ok,.price-lock').forEach(el=>el.remove());
    $$('.bio-modal *, #partner-workspace *').forEach(el=>{
      if(el.children.length) return;
      const t=String(el.textContent||'').trim();
      if(/\b(prix|tarif)s?\b/i.test(t) || /\d[\d\s]*[,.]\d{2}\s*€/.test(t)) el.remove();
    });
    $$('a[href*="tarifs-pro"],a[href*="biopietra2026"],a[href*="biopietracodeprix"]').forEach(a=>{
      if(a.closest('#partner-workspace') || a.closest('.bio-modal')) a.remove();
    });
    $$('[href],[src]').forEach(el=>{
      for(const attr of ['href','src']){
        const v=el.getAttribute?.(attr)||'';
        if(/biopietra(?:2026|codeprix).*\.pdf/i.test(v)) el.remove();
      }
    });
  }

  function sync(){
    if(isBio()) ensureIntro();
    else $('#bio-about')?.remove();
    scrubPrices();
  }
  function schedule(delay=50){ clearTimeout(timer); timer=setTimeout(sync,delay); }
  document.addEventListener('click',()=>schedule(30),true);
  new MutationObserver(()=>schedule(20)).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>schedule(100),{once:true});else schedule(100);
})();