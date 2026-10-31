(() => {
  'use strict';
  if (window.__LRF_IOS_ELIOS_PARITY__) return;
  window.__LRF_IOS_ELIOS_PARITY__ = true;

  const norm = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

  function hasEliosAccess() {
    try {
      const s = window.LRF_PRO_SESSION?.read?.() || JSON.parse(sessionStorage.getItem('lrfProSession') || 'null');
      if (!s) return false;
      if (s.isAdmin || s.admin) return true;
      return Array.isArray(s.partenaires) && s.partenaires.some(p => {
        const n = norm(p);
        return n === 'elios' || n === 'elios-ceramica' || n === 'eliosceramica';
      });
    } catch (_) { return false; }
  }

  function slugFromId(id) {
    const raw = String(id || '').replace(/^elios-/,'');
    const aliases = {
      'loveanddecors':'love-decors',
      'love-and-decors':'love-decors',
      'millenniumquartz':'millennium-quartz',
      'grandplace':'grand-place',
      'bavariastone':'bavaria-stone',
      'terreetrusche':'terre-etrusche',
      'goldenhour':'golden-hour',
      'design-evo':'d-esign-evo'
    };
    return aliases[raw] || raw;
  }

  function ensureStyle() {
    if (document.getElementById('lrf-ios-elios-parity-style')) return;
    const style = document.createElement('style');
    style.id = 'lrf-ios-elios-parity-style';
    style.textContent = `
      .lrf-ios-elios-stock{margin:14px 0 2px;padding:14px;border:1px solid #add2bb;border-radius:14px;background:#eef8f1;color:#24543a}
      .lrf-ios-elios-stock h3{margin:0 0 5px;font-size:1rem;color:#24543a}
      .lrf-ios-elios-stock p{margin:0 0 11px;font-size:.8rem;line-height:1.45;color:#5e6d63}
      .lrf-ios-elios-stock a{display:flex;align-items:center;justify-content:center;min-height:48px;border-radius:10px;background:#2d6745;color:#fff!important;text-decoration:none;font-weight:850;font-size:.9rem}
    `;
    document.head.appendChild(style);
  }

  function addStockPanel() {
    const modal = document.getElementById('product-modal-v2-card');
    if (!modal) return;
    const partner=norm(document.getElementById('workspace-title')?.textContent||'');
    const isElios=['elios','elios-ceramica'].includes(partner)
      && modal.closest('#product-modal-v2')?.classList.contains('open')
      && !modal.matches('.view-safe-modal,.view-modal-card')
      && !modal.querySelector('.view-safe-info,[data-view-safe-gallery],[data-view-gallery]');
    if(!isElios || !hasEliosAccess()) {modal.querySelector('.lrf-ios-elios-stock')?.remove();return;}
    const existing=modal.querySelector('.lrf-ios-elios-stock');
    const title = modal.querySelector('.modal-v2-info h2')?.textContent?.trim() || '';
    const product=(window.ELIOS_CATALOGUE||[]).find(p=>[p.name,p.catalogueLabel,p.collection].some(name=>name&&norm(name)===norm(title)));
    if (!title || !product) {existing?.remove();return;}
    const slug = slugFromId(product.slug||product.id);
    if (!slug) {existing?.remove();return;}
    if(existing?.dataset.collection===slug)return;
    existing?.remove();

    ensureStyle();
    const info = modal.querySelector('.modal-v2-info');
    if (!info) return;
    const section = document.createElement('section');
    section.className = 'lrf-ios-elios-stock';
    section.dataset.collection=slug;
    section.innerHTML = '<h3>Disponibilités & commande ELIOS</h3><p>Voir toutes les références, conditionnements, stocks usine et pièces spéciales de '+
      title.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))+
      '.</p><a href="disponibilites-elios-lot1.html?collection='+encodeURIComponent(slug)+'">● Voir les stocks & commander</a>';
    info.appendChild(section);
  }

  let pending=false;
  function schedule(){if(pending)return;pending=true;setTimeout(()=>{pending=false;addStockPanel();},0);}

  document.addEventListener('click', e => {
    const card = e.target.closest?.('#partner-products .product-card-v2[data-id]');
    if (card) {
      schedule();
      setTimeout(schedule, 80);
    }
  }, true);

  window.addEventListener('lrf-pro-session-changed', () => setTimeout(schedule, 50));
  window.addEventListener('lrf-view-product-opened', schedule);
  function observe(){
    const card=document.getElementById('product-modal-v2-card');
    if(card)new MutationObserver(schedule).observe(card,{childList:true,subtree:true,characterData:true});
    const modal=document.getElementById('product-modal-v2');
    if(modal)new MutationObserver(schedule).observe(modal,{attributes:true,attributeFilter:['class']});
    const workspace=document.getElementById('workspace-title');
    if(workspace)new MutationObserver(schedule).observe(workspace,{childList:true,subtree:true,characterData:true});
    schedule();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observe,{once:true});else observe();
})();
