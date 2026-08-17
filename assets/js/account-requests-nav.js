function addNav(){
  const menu=document.querySelector('.sidebar-menu');
  if(menu&&!menu.querySelector('a[href="demandes-clients.html"]')){
    const prospects=[...menu.querySelectorAll('a')].find(a=>a.getAttribute('href')?.includes('filter=prospect'))?.closest('li');
    const li=document.createElement('li');li.innerHTML='<a href="demandes-clients.html"><span class="icon">🧾</span><span class="menu-text">Demandes clients</span></a>';
    if(prospects)prospects.insertAdjacentElement('afterend',li);else menu.appendChild(li);
  }
  if(location.pathname.toLowerCase().endsWith('dashboard.html')){
    const quick=[...document.querySelectorAll('h2')].find(h=>h.textContent.includes('Actions rapides'))?.nextElementSibling;
    if(quick&&!quick.querySelector('a[href="demandes-clients.html"]')){
      const a=document.createElement('a');a.href='demandes-clients.html';a.className='btn-primary-gold';a.style.cssText='text-decoration:none;display:inline-flex;align-items:center;gap:.5rem;padding:.75rem 1.25rem';a.textContent='🧾 Demandes clients';quick.appendChild(a);
    }
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addNav,{once:true});else addNav();