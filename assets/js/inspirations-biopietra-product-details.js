(() => {
  'use strict';
  if(window.__LRF_BIOPIETRA_DETAILS__) return;
  window.__LRF_BIOPIETRA_DETAILS__=true;
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const esc=v=>String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const DATA={
    'acropoli':{
      desc:'Parement en pierre naturelle régénérée, adapté aux façades comme aux intérieurs. Acropoli est ignifuge, certifié et pensé pour valoriser les volumes avec un relief minéral marqué.',
      colors:['B81','B82','Beige Credaro','D0','G85','G87','M92','M94','M95','M96','Mix ACR 01','Terra','Zolfo'],
      flat:{label:'Plaques / Fondo',package:'1,00 m²',weight:'30,00 kg/m²',boxWeight:'30,00 kg',format:'Mélange / formats mixtes',thickness:'Non indiquée sur la fiche officielle',pallet:'24 cartons · 24 m² · 720 kg'}
    },
    'brick design':{
      desc:'Parement long et contemporain en pierre régénérée. Brick Design crée une lecture horizontale très graphique, avec un format fin qui convient particulièrement aux façades et aux intérieurs modernes.',
      colors:['Agata','Bianco','Bianco · pose verticale','G86','G88','Mattone','Rosso Vintage'],
      flat:{label:'Plaques / Fondo',package:'0,80 m²',weight:'39,00 kg/m²',boxWeight:'≈ 31,00 kg',format:'≈ 4,5 × 46 cm',thickness:'Non indiquée dans le tableau technique officiel',pallet:'28 cartons · 22,40 m² · 868 kg'}
    }
  };
  function installStyle(){if($('#bio-tech-style'))return;const s=document.createElement('style');s.id='bio-tech-style';s.textContent=`
    .bio-tech{margin:0 0 14px;border:1px solid #ddd5c7;border-radius:16px;background:#fff;padding:15px}.bio-tech h3{margin:0 0 10px;color:#17623a;font-size:1rem}.bio-tech-desc{margin:0 0 12px;color:#4d473f;line-height:1.5;font-size:.88rem}.bio-color-list{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 12px}.bio-color-chip{border:1px solid #d8ccb0;border-radius:999px;padding:6px 9px;background:#faf7ef;font-size:.72rem;font-weight:800;color:#564716}.bio-tech-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.bio-tech-card{border:1px solid #ece5d9;border-radius:12px;padding:11px;background:#fbfaf7}.bio-tech-card strong{display:block;margin-bottom:6px}.bio-tech-card dl{display:grid;grid-template-columns:1fr auto;gap:5px 8px;margin:0;font-size:.76rem}.bio-tech-card dt{color:#746d62}.bio-tech-card dd{margin:0;font-weight:800;text-align:right}@media(max-width:650px){.bio-tech-grid{grid-template-columns:1fr}.bio-tech{padding:12px}.bio-tech-card dl{font-size:.74rem}}
  `;document.head.appendChild(s)}
  function productName(modal){return $('.bio-head h2',modal)?.textContent?.trim()||''}
  function cardHtml(x){return `<div class="bio-tech-card"><strong>${esc(x.label)}</strong><dl><dt>Conditionnement</dt><dd>${esc(x.package)}</dd><dt>Poids</dt><dd>${esc(x.weight)}</dd><dt>Poids / carton</dt><dd>${esc(x.boxWeight)}</dd><dt>Format</dt><dd>${esc(x.format)}</dd><dt>Épaisseur</dt><dd>${esc(x.thickness)}</dd><dt>Palette</dt><dd>${esc(x.pallet)}</dd></dl></div>`}
  function enhance(modal){if(!modal?.classList.contains('open'))return;const data=DATA[norm(productName(modal))];if(!data)return;const body=$('.bio-body',modal);if(!body)return;let tech=$('.bio-tech',body);if(!tech){tech=document.createElement('section');tech.className='bio-tech';const desc=$('.bio-product-desc',body);(desc||body.firstChild)?.insertAdjacentElement?.('afterend',tech);if(!tech.parentNode)body.insertBefore(tech,body.firstChild)}tech.innerHTML=`<h3>Caractéristiques produit</h3><p class="bio-tech-desc">${esc(data.desc)}</p><div class="bio-color-list">${data.colors.map(c=>`<span class="bio-color-chip">${esc(c)}</span>`).join('')}</div><div class="bio-tech-grid">${[data.flat,data.corner].filter(Boolean).map(cardHtml).join('')}</div>`;rewriteGallery(modal,data)}
  function rewriteGallery(modal,data){const name=productName(modal);$$('.bio-gallery-label,.bio-safe-label',modal).forEach(label=>{const main=label.closest('.bio-gallery-main,.bio-safe-main');const img=$('img',main);const src=(img?.src||'')+' '+(img?.alt||'')+' '+(label.textContent||'');const hit=data.colors.find(c=>norm(src).includes(norm(c.replace(' · pose verticale',''))));label.textContent=hit?`${name} · couleur ${hit}`:`${name} · visuel d’ambiance`});$$('.bio-gallery-thumb img,.bio-safe-thumb img',modal).forEach(img=>{const src=(img.src||'')+' '+(img.alt||'');const hit=data.colors.find(c=>norm(src).includes(norm(c.replace(' · pose verticale',''))));img.alt=hit?`${name} · couleur ${hit}`:`${name} · visuel d’ambiance`})}
  let t=0;const scan=()=>{clearTimeout(t);t=setTimeout(()=>$$('.bio-modal.open').forEach(enhance),35)};
  document.addEventListener('click',scan,true);window.addEventListener('lrf-biopietra-rerendered',scan);new MutationObserver(scan).observe(document.documentElement,{subtree:true,childList:true});installStyle();setTimeout(scan,400);
})();