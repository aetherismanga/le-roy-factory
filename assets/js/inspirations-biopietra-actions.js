(() => {
  'use strict';
  if (window.__LRF_BIOPIETRA_ACTIONS_V1__) return;
  window.__LRF_BIOPIETRA_ACTIONS_V1__ = true;
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const esc=v=>String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const DESCRIPTIONS={
    'acropoli':'Un parement en pierre naturelle régénérée pensé pour les façades comme pour les intérieurs. Son relief affirmé valorise les murs et les volumes tout en s’intégrant facilement aux ambiances classiques ou contemporaines.',
    'bergamo mix ber':'Une pierre sobre et rustique inspirée du patrimoine local. Sa surface structurée et ses nuances naturelles créent un rendu authentique qui relie avec élégance tradition et architecture actuelle.',
    'brick design':'Un format long et contemporain qui revisite l’esprit de la brique. Ses lignes graphiques permettent des compositions très actuelles, tout en conservant l’aspect matière propre aux parements Biopietra.',
    'ciottolo river mix cio':'Un parement de galets qui apporte du relief et une vraie présence minérale au mur. Son caractère traditionnel est réinterprété dans une matière écologique, idéale pour créer des espaces chaleureux et singuliers.',
    'credaro mix cre':'Inspiré de la pierre naturelle de Credaro, ce parement aux formes plutôt carrées offre une grande liberté de pose, avec joint ou à sec. Un choix équilibré pour obtenir un mur authentique, structuré et élégant.',
    'listello liguria':'Un listello fin et rythmé qui apporte de la texture sans alourdir l’espace. Il convient particulièrement aux murs décoratifs où l’on recherche une lecture horizontale élégante et chaleureuse.',
    'listello mattone antico':'La chaleur du vieux parement brique rencontre un dessin plus contemporain. Ses teintes et son relief créent une atmosphère accueillante, avec un bel équilibre entre esprit rustique et design actuel.',
    'listello toscana 1 5 cm':'Un parement très polyvalent inspiré des briques de la tradition toscane. Il fonctionne aussi bien dans des intérieurs résidentiels élégants que sur de grandes surfaces architecturales.',
    'listello toscana 3 cm':'La version plus épaisse du Listello Toscana accentue le relief et le caractère du mur. Elle conserve l’esprit chaleureux des matériaux toscans avec une présence visuelle plus marquée.',
    'composizioni':'Une composition de plusieurs références Biopietra conçue pour obtenir un mur plus riche, vivant et personnalisé. Les mélanges de formats et de textures permettent de créer une esthétique sur mesure.',
    'ortisei mix ort':'Le charme du mur en pierre sèche avec une approche contemporaine et écologique. Ses éléments irréguliers et mélangeables donnent du rythme à la pose et permettent des compositions très naturelles.',
    'roccia mix roc':'Un équilibre réussi entre tradition méditerranéenne et exigences contemporaines. Les nuances et le dessin de la pierre donnent aux espaces une atmosphère accueillante, authentique et raffinée.',
    'roma':'Un parement à grandes plaques au dessin plus régulier, adapté aux projets recherchant une pierre épurée et facile à intégrer. Son esthétique minérale fonctionne aussi bien dans les décors modernes que plus classiques.',
    'scaglia carsica':'Une pierre écologique lumineuse et expressive qui personnalise immédiatement les espaces intérieurs comme extérieurs. Son jeu de nuances apporte de la profondeur tout en conservant une ligne élégante.',
    'scaglia marmolada':'Un parement élégant qui associe esthétique minérale et faible épaisseur. Sa finesse permet de préserver l’espace tout en créant une surface décorative forte et contemporaine.',
    'scaglia montebello':'Une pierre à l’aspect fendu plus net et graphique, avec des surfaces très expressives et des teintes modernes. Elle apporte un caractère architectural fort sans perdre l’authenticité de la matière.',
    'sierra nevada mix sie':'Une pierre aux tonalités chaleureuses, pensée pour donner immédiatement du caractère à l’espace. Sa palette variée permet des ambiances naturelles tout en restant dans une démarche de construction durable.',
    'spaccatello mix spc':'Un parement à profils horizontaux de hauteurs variées qui crée un mur rythmé et très contemporain. Les différents formats permettent de jouer avec les lignes et les contrastes de la pierre.',
    'stelvio mix ste':'Le contraste entre rustique et moderne fait toute l’identité de Stelvio. Relief, couleur et esprit rocheux se combinent dans un parement contemporain à forte personnalité.',
    'travertino':'Une interprétation sobre du travertin en pierre régénérée, idéale pour les projets recherchant une surface minérale plus régulière. Ses grands éléments créent un rendu calme, élégant et intemporel.',
    'inserti pour ort ste roc mix':'Des inserts décoratifs conçus pour enrichir les poses Ortisei, Stelvio, Roccia et leurs mélanges. Ils permettent d’ajouter ponctuellement du contraste et du rythme à la composition.',
    'cornici di finitura':'Des pièces de finition destinées à soigner les bords et les détails du parement. Elles permettent une finition plus nette et cohérente sur les zones visibles ou les changements de plan.',
    'ecokoll 25 kg':'Mortier-colle respirant Biopietra conçu pour la pose des parements. Il accompagne le système de mise en œuvre en conservant les qualités de respiration du support.',
    'multikoll 25 kg':'Adhésif respirant de pose disponible en plusieurs coloris. Il est conçu pour assurer une mise en œuvre fiable et cohérente avec les solutions de parement Biopietra.',
    'biostucco 25 kg':'Mortier de jointoiement respirant disponible dans une large gamme de teintes. Il permet d’adapter le joint à la pierre et de donner une véritable signature esthétique à la pose.',
    'biofin':'Traitement de finition Biopietra destiné à compléter la mise en œuvre et la protection du parement, disponible en plusieurs conditionnements selon la surface à traiter.'
  };

  function style(){
    if($('#bio-actions-style'))return;
    const s=document.createElement('style'); s.id='bio-actions-style'; s.textContent=`
      .bio-product-desc{margin:0 0 14px;padding:14px 15px;border:1px solid #dfd8c9;border-radius:14px;background:#fff;color:#403b34;line-height:1.55;font-size:.9rem}
      .bio-product-desc strong{display:block;color:#17623a;margin-bottom:4px;font-size:.95rem}
      .bio-price-row{cursor:pointer;transition:.15s ease}.bio-price-row.bio-selected{border-color:#D4AF37!important;box-shadow:0 0 0 2px rgba(212,175,55,.15)}
      .bio-choice{margin-top:16px;padding:14px;border:1px solid #D4AF37;border-radius:16px;background:#fffaf0}.bio-choice>strong{display:block;font-size:1rem;margin-bottom:10px}.bio-choice-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .bio-choice-actions button{min-height:52px;border-radius:12px;font-weight:900;font-size:.9rem;cursor:pointer}.bio-choice-actions .avail{background:#fff;border:1.5px solid #176b43;color:#176b43}.bio-choice-actions .order{background:#176b43;border:1.5px solid #176b43;color:#fff}
      .bio-close{display:flex!important;align-items:center!important;justify-content:center!important;position:absolute!important;top:14px!important;right:14px!important;width:54px!important;height:54px!important;z-index:20!important;border:1.5px solid #D4AF37!important;border-radius:50%!important;background:#111!important;color:#fff!important;font-size:1.8rem!important}
      @media(max-width:640px){.bio-choice-actions{grid-template-columns:1fr}.bio-body{padding:16px!important}.bio-head{padding-right:82px!important}}
    `; document.head.appendChild(s);
  }

  function productName(modal){ return $('.bio-head h2',modal)?.textContent?.trim()||''; }
  function selectedRow(modal){ return $('.bio-price-row.bio-selected',modal)||$('.bio-price-row',modal); }
  function rowData(row){
    const txt=row?.textContent||''; const ref=(txt.match(/\bC\d{1,3}\b/i)||[''])[0].toUpperCase();
    const unit=/\bml\b/i.test(txt)?'ml':/m²|m2/i.test(txt)?'m²':/bo[iî]te/i.test(txt)?'boîte':/sac/i.test(txt)?'sac':'pièce';
    const price=(txt.match(/\d+[\s\d]*[,.]\d{2}\s*€/i)||[''])[0].trim();
    const label=$('strong',row)?.textContent?.trim()||row?.children?.[0]?.textContent?.trim()||'Produit';
    return {ref,unit,price,label};
  }
  function stripDiscountText(modal){
    $$('*',modal).forEach(el=>{ if(el.children.length===0 && /\(-\s*40\s*%\)/i.test(el.textContent||'')) el.textContent=(el.textContent||'').replace(/\s*\(-\s*40\s*%\)/gi,''); });
  }
  function ensureDescription(modal){
    const body=$('.bio-body',modal); if(!body)return;
    $('.bio-discount',body)?.remove();
    let d=$('.bio-product-desc',body); if(!d){ d=document.createElement('div'); d.className='bio-product-desc'; body.insertBefore(d,body.firstChild); }
    const name=productName(modal), key=norm(name);
    d.innerHTML=`<strong>${esc(name)} · l’esprit Biopietra</strong>${esc(DESCRIPTIONS[key]||'Un produit Biopietra pensé pour donner aux surfaces une présence minérale authentique, avec une approche durable et une fabrication italienne soignée.')}`;
  }
  function ensureClose(modal){
    const head=$('.bio-head',modal); if(!head)return;
    let b=$('.bio-close',modal); if(!b){ b=document.createElement('button'); b.type='button'; b.className='bio-close'; b.textContent='×'; b.setAttribute('aria-label','Fermer'); head.appendChild(b); }
    b.onclick=()=>{ modal.classList.remove('open'); modal.style.display='none'; document.body.style.overflow=''; };
  }
  function ensureActions(modal){
    const body=$('.bio-body',modal), list=$('.bio-price-list',modal); if(!body||!list)return;
    const rows=$$('.bio-price-row',modal); if(!rows.length)return;
    if(!rows.some(r=>r.classList.contains('bio-selected')))rows[0].classList.add('bio-selected');
    rows.forEach(row=>{ row.onclick=e=>{ if(e.target.closest('button,a'))return; rows.forEach(x=>x.classList.remove('bio-selected')); row.classList.add('bio-selected'); updateChoice(modal); }; });
    let box=$('.bio-choice',modal); if(!box){ box=document.createElement('div'); box.className='bio-choice'; list.insertAdjacentElement('afterend',box); }
    updateChoice(modal);
  }
  function updateChoice(modal){
    const box=$('.bio-choice',modal); if(!box)return;
    const p=productName(modal), d=rowData(selectedRow(modal));
    box.innerHTML=`<strong>Référence sélectionnée : ${esc(d.ref||d.label)}</strong><div class="bio-choice-actions"><button type="button" class="avail">Demande de disponibilité</button><button type="button" class="order">Commander cette référence</button></div>`;
    const qs=new URLSearchParams({product:p,ref:d.ref,label:d.label,unit:d.unit,price:d.price}).toString();
    $('.avail',box).onclick=()=>location.href='biopietra-disponibilite.html?'+qs;
    $('.order',box).onclick=()=>location.href='biopietra-commande.html?'+qs;
  }
  function enhance(modal){ if(!modal||!modal.classList.contains('open'))return; style(); stripDiscountText(modal); ensureDescription(modal); ensureClose(modal); ensureActions(modal); }
  function scan(){ $$('.bio-modal.open').forEach(enhance); }
  document.addEventListener('click',()=>setTimeout(scan,30),true);
  new MutationObserver(ms=>{ if(ms.some(m=>[...m.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('.bio-modal,.bio-price-row')||n.querySelector?.('.bio-modal,.bio-price-row')))))setTimeout(scan,20); }).observe(document.documentElement,{subtree:true,childList:true});
  style(); setTimeout(scan,300);
})();