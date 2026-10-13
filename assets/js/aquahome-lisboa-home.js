(()=>{'use strict';
const products=[
['Mitigeur lavabo chromé','10140112701','20,95'],
['Mitigeur bidet chromé','10141112701','18,95'],
['Mitigeur bain-douche chromé','10142112701','25,50'],
['Mitigeur douche chromé','10143112701','20,50'],
['Mitigeur évier chromé','10159112501','22,95']
];
const CART_KEY='lrfLisboaCartV1';
const getCart=()=>{try{return JSON.parse(localStorage.getItem(CART_KEY)||'{}')}catch(_){return {}}};
const setCart=cart=>{localStorage.setItem(CART_KEY,JSON.stringify(cart));updateCartCount()};
const euro=n=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(n);
const unit=p=>Number(p[2].replace(',','.'));
const isPro=()=>{const session=window.LRF_PRO_SESSION?.read?.();return !!(session&&(session.isAdmin||session.partenaires?.includes('aquahome')))};
const restorePro=async()=>{try{await window.LRF_PRO_SESSION?.restore?.()}catch(_){ }return isPro()};
const style=document.createElement('style');style.textContent=`
@keyframes aqLisboaSway{0%,100%{translate:-7px 0}50%{translate:7px 0}}@keyframes aqLisboaSweep{0%,24%{transform:translateX(-35%);opacity:0}48%{opacity:.65}72%,100%{transform:translateX(35%);opacity:0}}
.aq-lisboa-desktop,.aq-lisboa-mobile{overflow:hidden;isolation:isolate;animation:aqLisboaSway 4.8s ease-in-out infinite;box-shadow:0 0 18px #e27ca044,0 12px 30px #0004}
.aq-lisboa-desktop:before,.aq-lisboa-mobile:before{content:"";position:absolute;inset:-80% -40%;background:linear-gradient(112deg,transparent 43%,#ffe6f255 49%,transparent 56%);animation:aqLisboaSweep 8s ease-in-out infinite;pointer-events:none}
.aq-lisboa-desktop{position:relative;display:grid;grid-template-columns:1fr 75px;align-items:center;gap:12px;padding:18px 22px;border-radius:24px;border:1px solid #d8a0b4;background:linear-gradient(135deg,#78133c,#aa245c);color:#fff;text-decoration:none;box-shadow:0 12px 28px #0003;cursor:pointer;min-width:0}
.aq-lisboa-desktop strong{display:block;font-size:1.45rem;line-height:1.1}.aq-lisboa-desktop small{display:block;font-size:.72rem;margin:5px 0}.aq-lisboa-desktop em{font-size:.72rem;font-weight:800;font-style:normal;color:#ffe1eb}.aq-lisboa-desktop img{width:100%;max-height:70px;object-fit:contain;background:#fff;border-radius:12px;padding:6px}
.aq-lisboa-mobile{position:relative;display:none;flex-direction:column;align-items:center;justify-content:center;min-width:82px;height:64px;padding:5px;border:1px solid #e5b2c5;border-radius:14px;background:#8c1647;color:#fff;text-decoration:none;text-align:center;font-size:.7rem;font-weight:900;line-height:1.15}
.aq-lisboa-mobile small{font-size:.56rem;margin-top:4px}
.aq-lisboa-overlay{position:fixed;inset:0;z-index:10075;display:none;align-items:center;justify-content:center;padding:12px;background:#000c;backdrop-filter:blur(6px)}.aq-lisboa-overlay.open{display:flex}
 .aq-lisboa-overlay{z-index:2147483647!important}.aq-lisboa-panel{position:relative;width:min(1050px,100%);max-height:95dvh;overflow:auto;border-radius:20px;background:#faf8f7;color:#262126;padding:24px;box-shadow:0 24px 70px #0008}
.aq-lisboa-close{position:sticky;top:0;float:right;z-index:2;border:0;background:#54122f;color:white;border-radius:50%;width:40px;height:40px;font-size:25px;cursor:pointer}
.aq-lisboa-head{display:flex;align-items:center;gap:18px;flex-wrap:wrap}.aq-lisboa-head img{width:160px;max-height:70px;object-fit:contain}.aq-lisboa-head h2{margin:4px 0;color:#94194c;font-size:clamp(1.5rem,3vw,2.5rem)}.aq-lisboa-head p{margin:3px 0}
.aq-lisboa-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:13px;margin:20px 0}.aq-lisboa-item{background:white;border:1px solid #e7dbe0;border-radius:15px;padding:15px}.aq-lisboa-item h3{font-size:1rem;margin:0 0 8px}.aq-lisboa-product-image{display:block;width:100%;height:150px;object-fit:contain;margin:0 auto 12px;background:#fff;border-radius:10px}.aq-lisboa-item p{font-size:.8rem;color:#666}.aq-lisboa-price{display:block;color:#a01951;font-weight:900;font-size:1.45rem;margin:12px 0}.aq-lisboa-item label{font-size:.82rem}.aq-lisboa-item input{width:85px;max-width:100%;padding:8px;border:1px solid #bca9b2;border-radius:8px}.aq-lisboa-action{background:#a01951;color:#fff;border:0;border-radius:10px;padding:11px 15px;font-weight:800;cursor:pointer}.aq-lisboa-form{display:block;text-align:center;margin:16px 0}.aq-lisboa-form .wide{grid-column:1/-1}.aq-lisboa-note{font-size:.78rem;color:#655c60}.aq-lisboa-art{display:block;width:min(100%,650px);height:auto;object-fit:contain;margin:14px auto 20px;border-radius:12px}.aq-lisboa-panel{max-height:calc(100dvh - 24px);scrollbar-gutter:stable}.aq-lisboa-overlay{padding:12px}.aq-lisboa-item{padding:12px}.aq-lisboa-grid{grid-template-columns:repeat(auto-fit,minmax(190px,1fr))}.aq-lisboa-item input{background:#fff!important;color:#211821!important;border:1px solid #bfa5b0!important;appearance:auto!important}.aq-lisboa-item label{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.aq-lisboa-price{background:transparent!important;border:0!important;padding:0!important;text-align:left}.aq-lisboa-private[hidden],.aq-lisboa-locked[hidden]{display:none!important}.aq-lisboa-locked{padding:22px;border:1px solid #e3c9d4;border-radius:12px;background:#fff7fa;text-align:center;color:#6f1940}.aq-lisboa-locked a{color:#8e1748;font-weight:800}.aq-lisboa-price{cursor:pointer}.aq-lisboa-price:focus{outline:2px solid #8e1748;outline-offset:3px}
@media(min-width:901px){.lrf-desktop-promo-stack>.aq-lisboa-desktop{width:100%!important;height:clamp(108px,17.5vh,150px)!important;min-height:108px;flex:0 0 clamp(108px,17.5vh,150px)!important} .aq-lisboa-desktop:not(.lrf-desktop-promo-stack>.aq-lisboa-desktop){position:absolute;right:3vw;bottom:10px;width:330px;z-index:22}}
@media(max-width:900px){
.aq-lisboa-desktop{display:none}
.aq-lisboa-mobile{display:flex;width:92px!important;min-width:92px!important;max-width:92px!important;height:64px!important;min-height:64px!important;padding:6px 7px!important;margin-left:0!important;border-radius:16px!important;font-size:.7rem!important;box-sizing:border-box!important}
.aq-lisboa-panel{padding:16px}.aq-lisboa-head img{width:110px}.aq-lisboa-art{width:100%}
}
@media(max-width:410px){.aq-lisboa-mobile{width:82px!important;min-width:82px!important;max-width:82px!important;height:58px!important;min-height:58px!important;font-size:.64rem!important}.aq-lisboa-mobile small{font-size:.49rem}}
@media(max-width:365px){.aq-lisboa-mobile{width:74px!important;min-width:74px!important;max-width:74px!important;font-size:.59rem!important}.aq-lisboa-mobile small{font-size:.44rem}}
.aq-lisboa-item input[type=number],.aq-lisboa-panel input[data-product]{
background:#fff9fb!important;background-color:#fff9fb!important;color:#62213e!important;
-webkit-text-fill-color:#62213e!important;border:1px solid #d9b7c5!important;
border-radius:12px!important;box-shadow:0 2px 7px #7a294114!important;
font-size:1.05rem!important;font-weight:700!important;padding:10px 12px!important;
outline-color:#a01951!important;color-scheme:light!important;opacity:1!important;
-webkit-appearance:textfield!important;appearance:textfield!important
}
.aq-lisboa-item input[type=number]:focus{border-color:#a01951!important;box-shadow:0 0 0 3px #eac4d4!important}
.aq-lisboa-add{display:block;margin-top:12px;width:100%;border:0;border-radius:10px;background:#8d1647;color:#fff;font-weight:800;padding:12px;cursor:pointer}.aq-lisboa-cartbar{position:sticky;bottom:-16px;z-index:3;background:#fff;border-top:1px solid #ead9df;padding:12px;display:flex;justify-content:center}.aq-lisboa-cartbar button{width:100%;max-width:420px}.aq-lisboa-recap[hidden],.aq-lisboa-products[hidden]{display:none!important}.aq-lisboa-recap{padding:12px}.aq-lisboa-table{width:100%;border-collapse:collapse;font-size:.85rem}.aq-lisboa-table th,.aq-lisboa-table td{padding:10px 5px;border-bottom:1px solid #ead9df;text-align:left}.aq-lisboa-table input{width:60px!important}.aq-lisboa-total{text-align:right;font-size:1.3rem;color:#94194c;font-weight:900}.aq-lisboa-recap-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}.aq-lisboa-recap-actions button{flex:1}.aq-lisboa-muted{font-size:.8rem;color:#6a6065}
@media(prefers-reduced-motion:reduce){.aq-lisboa-desktop,.aq-lisboa-mobile,.aq-lisboa-desktop:before,.aq-lisboa-mobile:before{animation:none!important}}

`;document.head.appendChild(style);
const overlay=document.createElement('div');overlay.className='aq-lisboa-overlay';overlay.setAttribute('aria-hidden','true');
overlay.innerHTML=`<section class="aq-lisboa-panel" role="dialog" aria-modal="true" aria-label="Offres AQUAHOME LISBOA"><button class="aq-lisboa-close" aria-label="Fermer">×</button><div class="aq-lisboa-head"><img src="assets/img/aquahome.png" alt="AQUAHOME"><div><strong>OFFRE PROFESSIONNELLE · DÉSTOCKAGE</strong><h2>Gamme LISBOA</h2><p>Jusqu'à épuisement des stocks · Prix nets HT</p></div></div><div class="aq-lisboa-locked" hidden>Tarifs réservés aux professionnels connectés et autorisés. <a href="tarifs-pro.html">Accéder à mon compte PRO</a></div><div class="aq-lisboa-private" hidden><img class="aq-lisboa-art" alt="Offre de déstockage AQUAHOME LISBOA" data-src="Destockaquahome.png"><div class="aq-lisboa-products"><div class="aq-lisboa-grid">${products.map((p,i)=>`<article class="aq-lisboa-item"><img class="aq-lisboa-product-image" src="assets/img/${p[1]}.png" alt="Photo ${p[0]}" loading="lazy"><h3>${p[0]}</h3><p>Réf. ${p[1]}</p><button type="button" class="aq-lisboa-price" data-select="${i}" aria-label="Sélectionner ${p[0]}">${p[2]} € HT</button><label>Quantité souhaitée (pièces) <input type="number" min="0" step="1" value="0" data-product="${i}"></label><button type="button" class="aq-lisboa-add" data-add="${i}">Ajouter au panier</button></article>`).join('')}</div><div class="aq-lisboa-cartbar"><button type="button" class="aq-lisboa-action" data-view-cart>Voir le panier (<span data-cart-count>0</span>)</button></div></div><section class="aq-lisboa-recap" hidden><h3>Récapitulatif du panier LISBOA</h3><div data-cart-lines></div><p class="aq-lisboa-total" data-cart-total></p><p class="aq-lisboa-muted">Prix HT · Disponibilité et réservation soumises à confirmation AQUAHOME. Le bouton d’envoi ouvre votre messagerie pour valider l’envoi.</p><div class="aq-lisboa-recap-actions"><button type="button" class="aq-lisboa-action" data-back-products>← Continuer mes achats</button><button type="button" class="aq-lisboa-action" data-send-cart>Envoyer la demande de disponibilité</button></div></section></div></section>`;
document.body.appendChild(overlay);
async function refreshAccess(){const allowed=await restorePro();overlay.querySelector('.aq-lisboa-private').hidden=!allowed;overlay.querySelector('.aq-lisboa-locked').hidden=allowed;if(allowed){const img=overlay.querySelector('.aq-lisboa-art');if(!img.src)img.src=img.dataset.src}}
function open(e){e?.preventDefault();overlay.classList.add('open');overlay.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';refreshAccess()}
window.addEventListener('lrf-pro-session-changed',()=>{if(overlay.classList.contains('open'))refreshAccess()});
overlay.addEventListener('click',e=>{const btn=e.target.closest('[data-select]');if(!btn||!isPro())return;const input=overlay.querySelector('[data-product="'+btn.dataset.select+'"]');input.value=Math.max(1,Number(input.value)||0);input.focus()});
function close(){overlay.classList.remove('open');overlay.setAttribute('aria-hidden','true');document.body.style.overflow=''}
overlay.querySelector('.aq-lisboa-close').onclick=close;overlay.addEventListener('click',e=>{if(e.target===overlay)close()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay.classList.contains('open'))close()});
const desktop=document.createElement('a');desktop.className='aq-lisboa-desktop';desktop.href='#aquahome-lisboa';desktop.innerHTML='<div><small>OFFRE PRO · STOCK LIMITÉ</small><strong>AQUAHOME<br>LISBOA</strong><em>Déstockage · Voir les offres →</em></div><img src="assets/img/aquahome.png" alt="AQUAHOME">';desktop.addEventListener('click',open);
const hero=document.querySelector('.hero-video-section');if(hero)hero.appendChild(desktop);
const nav=document.querySelector('header .nav-container'),view=document.querySelector('.viewlots26-header');if(nav){const mobile=document.createElement('a');mobile.className='aq-lisboa-mobile';mobile.href='#aquahome-lisboa';mobile.innerHTML='AQUAHOME<small>OFFRES LISBOA</small>';mobile.addEventListener('click',open);if(view)view.insertAdjacentElement('afterend',mobile);else nav.insertBefore(mobile,nav.querySelector('.burger-btn'))}

const productsPanel=overlay.querySelector('.aq-lisboa-products'),recap=overlay.querySelector('.aq-lisboa-recap');
function updateCartCount(){const cart=getCart();overlay.querySelector('[data-cart-count]').textContent=Object.values(cart).reduce((sum,n)=>sum+(Number(n)||0),0)}
function renderCart(){
 const cart=getCart(),entries=products.map((p,i)=>({p,i,qty:Number(cart[p[1]])||0})).filter(x=>x.qty>0);
 const lines=overlay.querySelector('[data-cart-lines]'),total=overlay.querySelector('[data-cart-total]');
 if(!entries.length){lines.innerHTML='<p>Votre panier est vide.</p>';total.textContent='';overlay.querySelector('[data-send-cart]').disabled=true;return}
 overlay.querySelector('[data-send-cart]').disabled=false;
 lines.innerHTML='<div style="overflow-x:auto"><table class="aq-lisboa-table"><thead><tr><th>Produit / Référence</th><th>Qté</th><th>Prix HT</th><th>Total HT</th><th></th></tr></thead><tbody>'+entries.map(x=>'<tr><td>'+x.p[0]+'<br><small>Réf. '+x.p[1]+'</small></td><td><input type="number" min="0" max="9999" step="1" value="'+x.qty+'" data-cart-qty="'+x.p[1]+'" aria-label="Quantité '+x.p[1]+'"></td><td>'+euro(unit(x.p))+'</td><td>'+euro(unit(x.p)*x.qty)+'</td><td><button type="button" data-remove-cart="'+x.p[1]+'" aria-label="Supprimer '+x.p[1]+'">×</button></td></tr>').join('')+'</tbody></table></div>';
 total.textContent='Total HT : '+euro(entries.reduce((s,x)=>s+unit(x.p)*x.qty,0));
}
function showCart(){if(!isPro())return;productsPanel.hidden=true;recap.hidden=false;renderCart();overlay.querySelector('.aq-lisboa-panel').scrollTo({top:0,behavior:'smooth'})}
function showProducts(){recap.hidden=true;productsPanel.hidden=false}
updateCartCount();
overlay.addEventListener('click',e=>{
 const add=e.target.closest('[data-add]');
 if(add){const i=Number(add.dataset.add),p=products[i],input=overlay.querySelector('[data-product="'+i+'"]'),qty=Number(input.value);if(!Number.isInteger(qty)||qty<1){alert('Indiquez une quantité supérieure à zéro.');input.focus();return}const cart=getCart();cart[p[1]]=(Number(cart[p[1]])||0)+qty;setCart(cart);input.value='0';add.textContent='✓ Ajouté au panier';setTimeout(()=>{add.textContent='Ajouter au panier'},1400);return}
 if(e.target.closest('[data-view-cart]'))showCart();
 if(e.target.closest('[data-back-products]'))showProducts();
 const remove=e.target.closest('[data-remove-cart]');if(remove){const cart=getCart();delete cart[remove.dataset.removeCart];setCart(cart);renderCart()}
 if(e.target.closest('[data-send-cart]')){
  if(!isPro()){alert('Connectez-vous avec un compte professionnel autorisé.');return}
  const cart=getCart(),entries=products.map(p=>({p,qty:Number(cart[p[1]])||0})).filter(x=>x.qty>0);
  if(!entries.length)return;
  const session=window.LRF_PRO_SESSION?.read?.()||{},societe=session.societe||'Client professionnel',identifiant=session.codeClient||session.email||'Compte PRO';
  const lines=entries.map(x=>[
    '• '+x.p[0],
    '  Référence : '+x.p[1],
    '  Quantité : '+x.qty+' pièce(s)',
    '  Prix unitaire HT : '+euro(unit(x.p)),
    '  Total HT : '+euro(unit(x.p)*x.qty)
  ].join('\n')).join('\n\n');
  const total=entries.reduce((s,x)=>s+unit(x.p)*x.qty,0);
  const body=[
    'Bonjour,',
    '',
    'Merci de bien vouloir confirmer la disponibilité des références suivantes :',
    '',
    'AQUAHOME — Gamme LISBOA',
    '',
    lines,
    '',
    'TOTAL HT : '+euro(total),
    '',
    'Client : '+societe,
    'Identifiant : '+identifiant,
    '',
    'Merci de confirmer les stocks, les conditions commerciales et la prise en compte de cette demande.',
    'Aucune commande ne sera considérée comme validée avant votre confirmation.',
    '',
    'Cordialement,',
    societe,
    'Agence Le Roy Factory'
  ].join('\n');
  location.href='mailto:comercialventas@aquahomebs.com?cc='+encodeURIComponent('jerome@leroyfactory.fr')+'&subject='+encodeURIComponent('AQUAHOME LISBOA — Demande de disponibilité — '+societe)+'&body='+encodeURIComponent(body);
 }
});
overlay.addEventListener('change',e=>{const el=e.target.closest('[data-cart-qty]');if(!el)return;const qty=Number(el.value);if(!Number.isInteger(qty)||qty<0||qty>9999){renderCart();return}const cart=getCart();if(qty===0)delete cart[el.dataset.cartQty];else cart[el.dataset.cartQty]=qty;setCart(cart);renderCart()});
})();