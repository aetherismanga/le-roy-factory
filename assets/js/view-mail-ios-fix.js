(()=>{
  'use strict';
  const install=()=>{
    const frame=document.querySelector('.viewlots26-frame');
    if(!frame)return false;
    const patch=()=>{
      try{
        const doc=frame.contentDocument;if(!doc)return;
        const btn=doc.getElementById('request-btn');if(!btn||btn.dataset.iosMailFixed==='2')return;
        btn.dataset.iosMailFixed='2';
        btn.addEventListener('click',e=>{
          const checks=[...doc.querySelectorAll('.lot-check:checked')];if(!checks.length)return;
          e.preventDefault();e.stopImmediatePropagation();

          const lines=checks.map((c,i)=>{
            const lot=c.closest('.lot, tr');
            const lotRef=(lot?.dataset?.id||'').trim().toUpperCase();
            const product=(lot?.querySelector('h3')||lot?.querySelector('.product strong'))?.textContent?.trim()||'Lot VIEW';

            let format='',qty='',price='';
            const cells=[...lot?.querySelectorAll?.('.grid > div')||[]];
            for(const cell of cells){
              const txt=cell.textContent.replace(/\s+/g,' ').trim();
              const strong=cell.querySelector('strong')?.textContent?.trim()||'';
              if(/^Format\b/i.test(txt)) format=strong;
              else if(/^Quantit[eé]\b/i.test(txt)) qty=strong;
              else if(/^Tarif\b/i.test(txt)) price=strong;
            }
            if(!format)format=lot?.querySelector('.format')?.textContent?.trim()||'';
            if(!qty)qty=lot?.querySelector('.qty')?.textContent?.trim()||'';
            if(!price)price=lot?.querySelector('.price')?.textContent?.trim()||'';

            return [
              `${i+1}. ${product}`,
              lotRef?`Référence lot : ${lotRef}`:'',
              format?`Format : ${format}`:'',
              qty?`Quantité : ${qty}`:'',
              price?`Tarif : ${price}`:''
            ].filter(Boolean).join('\n');
          }).join('\n\n');

          const account=doc.getElementById('login-msg')?.textContent?.trim()||'Client depuis la page VIEW';
          const subject=encodeURIComponent(`Demande disponibilité VIEW — ${checks.length} lot${checks.length>1?'s':''}`);
          const body=encodeURIComponent(`Bonjour Coryne, bonjour Jérôme,\n\nJe souhaite connaître la disponibilité des lots VIEW suivants :\n\n${lines}\n\nCompte : ${account}\n\nMerci.\nCordialement`);
          const href=`mailto:coryne@leroyfactory.fr,jerome@leroyfactory.fr?subject=${subject}&body=${body}`;
          const a=document.createElement('a');a.href=href;a.target='_self';a.style.display='none';document.body.appendChild(a);a.click();a.remove();
        },true);
      }catch(_){ }
    };
    frame.addEventListener('load',patch);patch();return true;
  };
  if(!install()){
    const observer=new MutationObserver(()=>{if(install())observer.disconnect()});
    observer.observe(document.documentElement,{childList:true,subtree:true});
  }
})();