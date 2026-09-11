(() => {
  'use strict';
  if (window.__LRF_VIEW_PALLET_INFO_20260912__) return;
  window.__LRF_VIEW_PALLET_INFO_20260912__ = true;

  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const fr = (v,d=2) => Number(v||0).toLocaleString('fr-FR',{minimumFractionDigits:d,maximumFractionDigits:d});

  function productById(id){
    return (Array.isArray(window.VIEW_CATALOGUE)?window.VIEW_CATALOGUE:[]).find(p=>String(p?.id)===String(id));
  }

  function palletValues(pack){
    if(!pack) return {m2:null,kg:null,boxes:null};
    const boxes = Number(pack.boxesPallet||0) || null;
    const m2 = Number(pack.m2Pallet||0) || (boxes && Number(pack.m2Box||0) ? boxes*Number(pack.m2Box) : null);
    const kg = Number(pack.kgPallet||0) || (boxes && Number(pack.kgBox||0) ? boxes*Number(pack.kgBox) : null);
    return {m2,kg,boxes};
  }

  function enhanceLine(line){
    const calc=$('.view-order-calc',line);
    const productSelect=$('select[data-field="product"]',line);
    const variantSelect=$('select[data-field="variant"]',line);
    if(!calc||!productSelect||!variantSelect)return;

    const product=productById(productSelect.value);
    const variant=product?.variants?.[Number(variantSelect.value)||0];
    const p=palletValues(variant?.pack);

    let m2Box=$('[data-view-pallet-m2]',calc);
    if(!m2Box){
      m2Box=document.createElement('div');m2Box.className='view-order-stat';m2Box.dataset.viewPalletM2='1';
      calc.appendChild(m2Box);
    }
    m2Box.innerHTML=`<span>M² / palette</span><strong>${p.m2?fr(p.m2)+' m²':'—'}</strong>`;

    let kgBox=$('[data-view-pallet-kg]',calc);
    if(!kgBox){
      kgBox=document.createElement('div');kgBox.className='view-order-stat';kgBox.dataset.viewPalletKg='1';
      calc.appendChild(kgBox);
    }
    kgBox.innerHTML=`<span>Poids / palette</span><strong>${p.kg?fr(p.kg,0)+' kg':'—'}</strong>`;
  }

  function enhance(){
    $$('#view-order-lines .view-order-line').forEach(enhanceLine);
  }

  function attach(){
    const host=$('#view-order-lines');
    if(!host)return false;
    if(host.dataset.viewPalletObserver==='1'){enhance();return true;}
    host.dataset.viewPalletObserver='1';
    const obs=new MutationObserver(()=>enhance());
    obs.observe(host,{childList:true,subtree:true});
    host.addEventListener('change',()=>setTimeout(enhance,0));
    enhance();
    return true;
  }

  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(attach()||tries>120)clearInterval(timer);
  },250);

  document.addEventListener('click',()=>setTimeout(attach,0),true);
})();