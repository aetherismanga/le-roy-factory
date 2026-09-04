(()=>{
  'use strict';
  if(window.__LRF_ELIOS_RENTREE_DIRECT_V2__)return;
  window.__LRF_ELIOS_RENTREE_DIRECT_V2__=true;

  const PALETTE_M2=61.92;
  const formatM2=n=>Number(n||0).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2});

  function addStyles(){
    if(document.getElementById('elios-rentree-direct-v2-style'))return;
    const s=document.createElement('style');
    s.id='elios-rentree-direct-v2-style';
    s.textContent=`
      .elios-page-close{position:fixed;right:max(10px,env(safe-area-inset-right));top:max(10px,env(safe-area-inset-top));z-index:2147483647;width:48px;height:48px;border-radius:50%;border:2px solid #e0b94f;background:#111;color:#fff;font-size:1.9rem;line-height:1;display:grid;place-items:center;padding:0;box-shadow:0 7px 22px rgba(0,0,0,.38);cursor:pointer}
      .palette-choice{margin-top:10px;padding:11px;border:1px solid #d5b96b;border-radius:12px;background:#fffaf0;white-space:normal}.palette-choice[hidden]{display:none!important}.palette-choice-title{font-size:.72rem;text-transform:uppercase;letter-spacing:.07em;font-weight:900;color:#71521b;margin-bottom:7px}.palette-stepper{display:grid;grid-template-columns:44px minmax(72px,1fr) 44px;gap:7px;max-width:210px}.palette-stepper button{height:42px;border:1px solid #b88f3b;border-radius:10px;background:#fff;color:#5b4218;font-size:1.25rem;font-weight:900}.palette-stepper button:disabled{opacity:.35}.palette-count{height:42px;border:1px solid #d0b56f;border-radius:10px;text-align:center;font-weight:900;font-size:1rem;width:100%;background:#fff}.palette-selected-qty{margin-top:8px;color:#433b31;font-size:.78rem}.palette-selected-qty strong{color:#7b5615;font-size:.92rem}.palette-max{margin-top:3px;color:#8b8174;font-size:.67rem}
      @media(max-width:680px){.palette-choice{margin-top:10px;padding:12px}.palette-stepper{max-width:none;grid-template-columns:52px 1fr 52px}.palette-stepper button,.palette-count{height:46px}.palette-selected-qty{font-size:.82rem}.palette-selected-qty strong{font-size:1rem}}
    `;
    document.head.appendChild(s);
  }

  function addClose(){
    if(document.getElementById('elios-page-close'))return;
    const btn=document.createElement('button');
    btn.id='elios-page-close';btn.className='elios-page-close';btn.type='button';btn.setAttribute('aria-label','Fermer');btn.textContent='×';
    btn.addEventListener('click',()=>{
      if(window.parent&&window.parent!==window){window.parent.postMessage({type:'lrf-elios-rentree-close'},location.origin);return}
      if(history.length>1){history.back();return}
      location.href='index.html';
    });
    document.body.appendChild(btn);
  }

  function parseStock(text){
    const raw=String(text||'').replace(/\s/g,'').replace(',','.').replace(/[^0-9.]/g,'');
    return parseFloat(raw)||0;
  }

  function refreshRow(row){
    const check=row.querySelector('.lot-check');
    const chooser=row.querySelector('.palette-choice');
    if(!check||!chooser)return;
    chooser.hidden=!check.checked;
    if(!check.checked)return;
    const input=chooser.querySelector('.palette-count');
    const max=Number(chooser.dataset.max||1);
    let n=Math.round(Number(input?.value)||1);n=Math.min(max,Math.max(1,n));
    if(input)input.value=String(n);
    row.dataset.selectedPalettes=String(n);row.dataset.selectedM2=(n*PALETTE_M2).toFixed(2);
    const out=chooser.querySelector('.palette-selected-qty');if(out)out.innerHTML=`Quantité choisie : <strong>${formatM2(n*PALETTE_M2)} m²</strong> · ${n} palette${n>1?'s':''}`;
    const minus=chooser.querySelector('.palette-minus');const plus=chooser.querySelector('.palette-plus');if(minus)minus.disabled=n<=1;if(plus)plus.disabled=n>=max;
  }

  function syncVisibility(){document.querySelectorAll('#lots-body tr').forEach(refreshRow)}

  function installRows(){
    document.querySelectorAll('#lots-body tr').forEach(row=>{
      if(row.dataset.paletteEnhanced==='1'){refreshRow(row);return}
      const check=row.querySelector('.lot-check');const qtyCell=row.querySelector('.qty');const paletteCell=row.querySelector('.palette');
      if(!check||!qtyCell||!paletteCell)return;
      row.dataset.paletteEnhanced='1';
      const stock=parseStock(qtyCell.textContent);const max=Math.max(1,Math.floor((stock+.0001)/PALETTE_M2));
      const chooser=document.createElement('div');chooser.className='palette-choice';chooser.dataset.max=String(max);chooser.hidden=!check.checked;
      chooser.innerHTML=`<div class="palette-choice-title">Nombre de palettes</div><div class="palette-stepper"><button type="button" class="palette-minus" aria-label="Retirer une palette">−</button><input class="palette-count" type="number" min="1" max="${max}" step="1" value="1" inputmode="numeric" aria-label="Nombre de palettes"><button type="button" class="palette-plus" aria-label="Ajouter une palette">+</button></div><div class="palette-selected-qty">Quantité choisie : <strong>61,92 m²</strong> · 1 palette</div><div class="palette-max">Maximum disponible : ${max} palette${max>1?'s':''}</div>`;
      paletteCell.appendChild(chooser);
      const input=chooser.querySelector('.palette-count');
      chooser.querySelector('.palette-minus').addEventListener('click',()=>{input.value=String((Number(input.value)||1)-1);refreshRow(row)});
      chooser.querySelector('.palette-plus').addEventListener('click',()=>{input.value=String((Number(input.value)||1)+1);refreshRow(row)});
      input.addEventListener('input',()=>refreshRow(row));input.addEventListener('change',()=>refreshRow(row));check.addEventListener('change',()=>refreshRow(row));
      refreshRow(row);
    });
  }

  function openMailClient(href){
    try{
      const topDoc=window.top.document;
      const a=topDoc.createElement('a');a.href=href;a.target='_self';a.style.display='none';topDoc.body.appendChild(a);a.click();a.remove();
    }catch(_){window.location.href=href}
  }

  function interceptMail(){
    const request=document.getElementById('request-btn');if(!request||request.dataset.paletteMail==='1')return;
    request.dataset.paletteMail='1';
    request.addEventListener('click',e=>{
      const selected=[...document.querySelectorAll('#lots-body tr')].filter(r=>r.querySelector('.lot-check')?.checked);
      if(!selected.length)return;
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      const lines=selected.map((row,i)=>{
        const strong=row.querySelector('.product strong');
        const product=(strong?.childNodes?.[0]?.textContent||strong?.textContent||'Lot ELIOS').trim();
        const ref=(row.querySelector('.product span')?.textContent||'').replace(/^Réf\. Elios\s*:\s*/i,'').trim();
        const format=(row.querySelector('.format')?.textContent||'').trim();
        const stock=(row.querySelector('.qty')?.textContent||'').trim();
        const n=Number(row.dataset.selectedPalettes||1);const m2=formatM2(Number(row.dataset.selectedM2||PALETTE_M2));
        return `${i+1}. ${ref} — ${product} — ${format} — ${n} palette${n>1?'s':''} — quantité demandée : ${m2} m² — stock annoncé : ${stock}`;
      }).join('\n');
      const totalPalettes=selected.reduce((s,r)=>s+Number(r.dataset.selectedPalettes||1),0);
      const totalM2=formatM2(selected.reduce((s,r)=>s+Number(r.dataset.selectedM2||PALETTE_M2),0));
      const loginMsg=(document.getElementById('login-msg')?.textContent||'').trim();const code=(document.getElementById('client-code')?.value||'').trim();const dep=(document.getElementById('client-dep')?.value||'').trim();
      const clientInfo=loginMsg||[code,dep&&`département ${dep}`].filter(Boolean).join(' — ')||'Client non identifié sur la page';
      const subject=encodeURIComponent(`Demande disponibilité ELIOS — ${totalPalettes} palette${totalPalettes>1?'s':''}`);
      const body=encodeURIComponent(`Bonjour Coryne, bonjour Jérôme,\n\nJe souhaite connaître la disponibilité des lots ELIOS suivants :\n\n${lines}\n\nTOTAL : ${totalPalettes} palette${totalPalettes>1?'s':''} — ${totalM2} m².\nCondition : palettes complètes uniquement.\n\nClient : ${clientInfo}\n\nMerci.\nCordialement`);
      openMailClient(`mailto:coryne@leroyfactory.fr,jerome@leroyfactory.fr?subject=${subject}&body=${body}`);
    },true);
  }

  function init(){
    addStyles();addClose();installRows();interceptMail();
    const tbody=document.getElementById('lots-body');if(tbody&&!tbody.dataset.directPaletteObserver){tbody.dataset.directPaletteObserver='1';new MutationObserver(()=>{installRows();interceptMail()}).observe(tbody,{childList:true,subtree:false})}
    ['select-all','clear-all','clear-bottom'].forEach(id=>{const el=document.getElementById(id);if(el&&!el.dataset.directPaletteSync){el.dataset.directPaletteSync='1';el.addEventListener('click',()=>setTimeout(syncVisibility,0))}});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0),{once:true});else setTimeout(init,0);
})();