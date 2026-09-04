(()=>{
  'use strict';
  const install=()=>{
    const frame=document.querySelector('.viewlots26-frame');
    if(!frame)return false;
    const patch=()=>{
      try{
        const doc=frame.contentDocument;if(!doc)return;
        const btn=doc.getElementById('request-btn');if(!btn||btn.dataset.iosMailFixed==='1')return;
        btn.dataset.iosMailFixed='1';
        btn.addEventListener('click',e=>{
          const checks=[...doc.querySelectorAll('.lot-check:checked')];if(!checks.length)return;
          e.preventDefault();e.stopImmediatePropagation();
          const lines=checks.map((c,i)=>{
            const tr=c.closest('tr');
            const product=tr?.querySelector('.product strong')?.textContent?.trim()||'Lot VIEW';
            const format=tr?.querySelector('.format')?.textContent?.trim()||'';
            const qty=tr?.querySelector('.qty')?.textContent?.trim()||'';
            return `${i+1}. ${product}${format?' — '+format:''}${qty?' — quantité annoncée : '+qty:''}`;
          }).join('\n');
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