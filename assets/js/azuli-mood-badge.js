(() => {
  const BADGE_TEXT = 'Nouveauté';
  const STYLE_ID = 'lrf-azuli-mood-badge-style';
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  function ensureStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      .product-card-v2{position:relative;overflow:hidden}
      .product-visual{position:relative;overflow:hidden}
      .lrf-azuli-mood-badge{position:absolute;top:12px;left:12px;z-index:4;display:inline-flex;align-items:center;justify-content:center;padding:8px 14px;border-radius:999px;font-weight:900;font-size:.82rem;letter-spacing:.05em;text-transform:uppercase;color:#111;background:linear-gradient(135deg,#ff4fcf 0%,#ffd84f 35%,#5fffd2 68%,#8fff57 100%);background-size:300% 300%;box-shadow:0 10px 24px rgba(0,0,0,.28);border:2px solid rgba(255,255,255,.82);animation:lrfAzuliBadgeFloat 1.2s ease-in-out infinite,lrfAzuliBadgeGlow 2.4s ease-in-out infinite,lrfAzuliBadgeShift 4s linear infinite;pointer-events:none}
      @keyframes lrfAzuliBadgeFloat{0%,100%{transform:translateY(0) scale(1) rotate(-2deg)}50%{transform:translateY(-5px) scale(1.06) rotate(2deg)}}
      @keyframes lrfAzuliBadgeGlow{0%,100%{box-shadow:0 10px 24px rgba(0,0,0,.28),0 0 0 rgba(255,79,207,0)}50%{box-shadow:0 14px 28px rgba(0,0,0,.34),0 0 22px rgba(255,216,79,.55)}}
      @keyframes lrfAzuliBadgeShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
      @media(max-width:600px){.lrf-azuli-mood-badge{top:10px;left:10px;padding:7px 12px;font-size:.74rem}}
    `;
    document.head.appendChild(style);
  }
  function applyBadge(card){
    if(!card || card.dataset.lrfAzuliBadgeApplied==='1' || !norm(card.textContent).includes('azuli mood')) return;
    const host=card.querySelector('.product-visual') || card;
    if(!host || host.querySelector('.lrf-azuli-mood-badge')) return;
    if(getComputedStyle(host).position==='static') host.style.position='relative';
    const badge=document.createElement('span');
    badge.className='lrf-azuli-mood-badge';
    badge.textContent=BADGE_TEXT;
    host.appendChild(badge);
    card.dataset.lrfAzuliBadgeApplied='1';
  }
  function scan(root=document){
    ensureStyle();
    if(root.matches?.('.product-card-v2, .product-card')) applyBadge(root);
    root.querySelectorAll?.('.product-card-v2, .product-card').forEach(applyBadge);
  }
  function init(){
    scan(document);
    if(window.__LRF_AZULI_MOOD_BADGE_OBSERVER__) return;
    window.__LRF_AZULI_MOOD_BADGE_OBSERVER__=true;
    new MutationObserver(muts=>{muts.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1) scan(n)}));scan(document)}).observe(document.documentElement,{childList:true,subtree:true});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
