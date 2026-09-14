(()=>{
  const NAME='Carles Bofarull';
  const ROLE='Export Manager';
  const MAIL=['carlesb','biltbs.com'].join('@');
  const PHONE=['+34','650','068','495'].join(' ');
  const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');

  function contactHtml(){
    return `<div class="lrf-bilt-contact" style="padding:12px 0"><strong style="display:block;font-size:1.05rem">${NAME}</strong><span style="display:block;color:#72777f;margin:3px 0 10px">${ROLE}</span><div style="display:flex;flex-wrap:wrap;gap:8px"><a href="mailto:${MAIL}" style="text-decoration:none">✉ ${MAIL}</a><a href="tel:${PHONE.replace(/\s/g,'')}" style="text-decoration:none">☎ ${PHONE}</a></div></div>`;
  }

  function patchContactsPage(){
    if(!location.pathname.toLowerCase().includes('contacts-partenaires'))return;
    document.querySelectorAll('section,article,.partner-card,.factory-card,.contact-card').forEach(card=>{
      if(!norm(card.textContent).includes('bilt')||card.querySelector('.lrf-bilt-contact'))return;
      const empty=[...card.querySelectorAll('*')].find(el=>/aucune coordonnee|0 contact/.test(norm(el.textContent)));
      if(empty&&/aucune coordonnee/.test(norm(empty.textContent)))empty.remove();
      const count=[...card.querySelectorAll('*')].find(el=>/^\s*0\s+contact/.test(norm(el.textContent)));
      if(count)count.textContent='1 contact';
      const host=card.querySelector('.contacts,.partner-contacts,.factory-contacts,.contact-list')||card;
      host.insertAdjacentHTML('beforeend',contactHtml());
    });
  }

  function patchProPage(){
    if(!location.pathname.toLowerCase().includes('tarifs-pro'))return;
    document.querySelectorAll('section,article,.partner-card,.factory-card,.tarif-card').forEach(card=>{
      if(!norm(card.textContent).includes('bilt')||card.querySelector('.lrf-bilt-contact'))return;
      const row=[...card.querySelectorAll('*')].find(el=>norm(el.textContent).trim()==='contacts usine');
      if(row){
        const parent=row.closest('.contact-row,.detail-row,.accordion-row,div')||row.parentElement;
        if(parent&&!parent.querySelector('.lrf-bilt-contact'))parent.insertAdjacentHTML('beforeend',contactHtml());
      }
    });
  }

  function patchOrderPage(){
    if(!location.pathname.toLowerCase().includes('commande-bilt'))return;
    if(document.querySelector('.lrf-bilt-order-contact'))return;
    const main=document.querySelector('main,.wrap,.container');if(!main)return;
    const box=document.createElement('div');box.className='lrf-bilt-order-contact';box.style.cssText='margin:14px 0;padding:14px 16px;border:1px solid #d9e7dd;border-radius:14px;background:#f8fcf9;color:#183025';
    box.innerHTML=`<strong>Contact commande BILT</strong><div style="margin-top:5px">${NAME} — ${ROLE}</div><div style="margin-top:4px"><a href="mailto:${MAIL}">${MAIL}</a> · <a href="tel:${PHONE.replace(/\s/g,'')}">${PHONE}</a></div>`;
    main.prepend(box);
  }

  function run(){patchContactsPage();patchProPage();patchOrderPage()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
  new MutationObserver(run).observe(document.documentElement,{subtree:true,childList:true});
  setTimeout(run,400);setTimeout(run,1200);
})();
