(() => {
  'use strict';
  if (window.__LRF_REVIGLASS_FLOW_FIX_20260911__) return;
  window.__LRF_REVIGLASS_FLOW_FIX_20260911__ = true;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const isRev=()=>norm($('#workspace-title')?.textContent)==='reviglass';
  let selectedRef='';
  let selectedSeries='';

  function style(){
    if($('#rev-flow-fix-style')) return;
    const s=document.createElement('style');s.id='rev-flow-fix-style';s.textContent=`
      .rev-filter-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
      .reviglass-ref-list span{cursor:pointer;transition:.15s ease}
      .reviglass-ref-list span.rev-selected-ref{background:#fff4cf!important;color:#6b5010!important;border-color:#d4af37!important;box-shadow:0 0 0 2px rgba(212,175,55,.18)!important}
      .rev-ref-choice{margin:14px 0 0;padding:12px;border:1px solid #d7c470;border-radius:12px;background:#fffaf0}
      .rev-ref-choice strong{display:block;margin-bottom:9px;color:#2b271f}
      .rev-ref-choice-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .rev-ref-choice-actions button{min-height:46px;border-radius:10px;font-weight:900;padding:10px 12px;cursor:pointer}
      .rev-ref-choice-actions .avail{border:1px solid #17653d;background:#fff;color:#17653d}
      .rev-ref-choice-actions .order{border:1px solid #17653d;background:#17653d;color:#fff}
      .rev-preview textarea{min-height:420px!important;line-height:1.48!important;font-family:Arial,sans-serif!important;font-size:15px!important;white-space:pre-wrap!important}
      @media(max-width:700px){.rev-filter-grid{grid-template-columns:1fr!important}.rev-ref-choice-actions{grid-template-columns:1fr}.rev-preview textarea{min-height:460px!important;font-size:16px!important}}
    `;document.head.appendChild(s);
  }

  function removeColorFilter(){
    if(!isRev()) return;
    const color=$('#rev-filter-color');
    const box=color?.closest('div');
    if(box) box.remove();
  }

  function patchModal(){
    if(!isRev()) return;
    const modal=$('#reviglass-pool-modal');
    if(!modal || !modal.classList.contains('open')) return;

    const sid=modal.dataset.revSeries||'';
    if(sid!==selectedSeries){
      selectedSeries=sid;
      selectedRef='';
      $('.rev-ref-choice',modal)?.remove();
      $$('.reviglass-ref-list span',modal).forEach(x=>x.classList.remove('rev-selected-ref'));
    }

    $$('.reviglass-ref-list span',modal).forEach(sp=>{
      if(sp.dataset.revRefReady) return;
      sp.dataset.revRefReady='1';
      sp.setAttribute('role','button');sp.setAttribute('tabindex','0');
      const choose=()=>selectRef(sp.textContent.trim(),sp,modal);
      sp.addEventListener('click',choose);
      sp.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}});
    });
    const footer=$('.reviglass-modal-footer',modal);
    if(footer) $$('[data-rev-modal-action]',footer).forEach(b=>b.style.display='none');
    if(selectedRef) showRefActions(modal);
  }

  function selectRef(ref,sp,modal){
    selectedRef=ref;
    $$('.reviglass-ref-list span',modal).forEach(x=>x.classList.toggle('rev-selected-ref',x===sp));
    showRefActions(modal);
  }

  function showRefActions(modal){
    let box=$('.rev-ref-choice',modal);
    if(!box){
      box=document.createElement('div');
      box.className='rev-ref-choice';
      $('#reviglass-modal-body',modal)?.appendChild(box);
    }
    if(box.dataset.selectedRef===selectedRef) return;
    box.dataset.selectedRef=selectedRef;
    box.innerHTML=`<strong>Référence sélectionnée : ${selectedRef}</strong><div class="rev-ref-choice-actions"><button type="button" class="avail" data-rev-ref-jump="availability">Demande de disponibilité</button><button type="button" class="order" data-rev-ref-jump="order">Commander cette référence</button></div>`;
  }

  function jumpTo(kind){
    const modal=$('#reviglass-pool-modal');
    const hidden=$(`[data-rev-modal-action="${kind}"]`,modal);
    if(!hidden) return;
    hidden.click();
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      const order=$('#rev-order');
      const row=$('.rev-line',order);
      if(row){
        const ref=$('select[data-field="ref"]',row);
        if(ref && [...ref.options].some(o=>o.value===selectedRef||o.textContent.trim()===selectedRef)){
          ref.value=[...ref.options].find(o=>o.value===selectedRef||o.textContent.trim()===selectedRef)?.value||selectedRef;
          ref.dispatchEvent(new Event('change',{bubbles:true}));
        }
        clearInterval(timer);
        order?.scrollTo?.({top:0,behavior:'smooth'});
      }
      if(tries>30) clearInterval(timer);
    },50);
  }

  function formatPreview(){
    const p=$('#rev-preview-text');if(!p) return;
    const title=$('#rev-order-title')?.textContent||'';
    const isOrder=/commande/i.test(title);
    const lines=$$('.rev-line').map((row,i)=>{
      const get=f=>row.querySelector(`[data-field="${f}"]`)?.value||'—';
      const stats=$$('.rev-stat strong',row).map(x=>x.textContent.trim());
      const qty=get('qty');
      return [
        `PRODUIT ${i+1}`,
        `Série : ${get('series') && row.querySelector('select[data-field="series"] option:checked')?.textContent.trim() || '—'}`,
        `Format : ${get('format')}`,
        `Référence : ${get('ref')}`,
        `Support : ${get('support')}`,
        `Besoin : ${qty || '0'} ${/nez de marche/i.test(get('format'))?'ml':'m²'}`,
        `Conditionnement : ${stats[1]||'À confirmer'}`,
        `${isOrder?'Commande calculée':'Quantité à vérifier'} : ${stats[2]||'À confirmer'}`
      ].join('\n');
    });
    const company=$('#rev-company')?.value.trim()||'—',contact=$('#rev-contact')?.value.trim()||'—',email=$('#rev-email')?.value.trim()||'—',phone=$('#rev-phone')?.value.trim()||'—',note=$('#rev-note')?.value.trim();
    const need=$('#rev-total-need')?.textContent||'—',boxes=$('#rev-total-boxes')?.textContent||'—',real=$('#rev-total-real')?.textContent||'—';
    p.value=[
      'Bonjour,','',
      isOrder?'Merci de nous préparer la commande suivante :':'Merci de nous confirmer la disponibilité des produits suivants :','',
      'REVIGLASS','========================================','',
      ...lines.flatMap((x,i)=>[x,i<lines.length-1?'\n----------------------------------------\n':'']),
      '','RÉCAPITULATIF','----------------------------------------',
      `Besoin total : ${need}`,
      `Total cartons : ${boxes}`,
      `Quantité réelle : ${real}`,
      '','CLIENT / CONTACT','----------------------------------------',
      `Société : ${company}`,
      `Contact : ${contact}`,
      `E-mail : ${email}`,
      `Téléphone : ${phone}`,
      note?`Observation : ${note}`:'',
      '','Merci de nous confirmer la disponibilité, le conditionnement et le délai.','',
      'Cordialement,',contact,company
    ].filter(v=>v!=='' || true).join('\n');
  }

  function observe(){
    style();
    const root=document.body;
    new MutationObserver(()=>{removeColorFilter();patchModal();}).observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    removeColorFilter();patchModal();
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-rev-ref-jump]');
    if(b){e.preventDefault();e.stopPropagation();jumpTo(b.dataset.revRefJump);}
  },true);
  document.addEventListener('submit',e=>{if(e.target?.id==='rev-form')setTimeout(formatPreview,0)},false);
  document.addEventListener('click',e=>{if(e.target.closest('#rev-prepare'))setTimeout(formatPreview,40)},false);

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observe,{once:true});else observe();
})();