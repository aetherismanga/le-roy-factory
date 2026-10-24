// Shared CRM presentation only: no client data access or writes.
const paths = {
  'Accueil':'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
  'Clients':'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  'Prospects':'M21 12a9 9 0 1 1-9-9 M21 3l-9 9 M16 3h5v5 M16 12a4 4 0 1 1-4-4',
  'Agenda':'M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2',
  'Comptes-rendus':'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z M14 2v6h6 M8 13h8 M8 17h5',
  'Catalogues':'M4 3h6l2 3h8a1 1 0 0 1 1 1v13H3V4a1 1 0 0 1 1-1',
  'Fabricants':'M3 21V10l6 3V7l6 3V3h6v18Z M7 17h1 M12 17h1 M17 17h1',
  'Mails groupés':'M3 5h18v14H3Z M3 5l9 8 9-8',
  'Carte':'m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z M9 3v15 M15 6v15',
  'Statistiques':'M3 3v18h18 M7 16v-4 M12 16V8 M17 16V5',
  'Paramètres':'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2',
  'Tournées':'M5 5a2 2 0 1 0 0 .1 M19 19a2 2 0 1 0 0 .1 M7 5h9a4 4 0 0 1 0 8H8a3 3 0 0 0 0 6h9'
};

function icon(path) {
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');
  svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.6');
  svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');
  svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
  const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',path);svg.append(p);return svg;
}

function navigation() {
  const page=location.pathname.split('/').pop();
  document.querySelectorAll('.sidebar-menu a').forEach(link=>{
    const label=(link.querySelector('.menu-text')?.textContent||link.textContent).trim();
    if(label==='Statistiques')link.setAttribute('href','statistiques.html');
    if(label==='Paramètres')link.setAttribute('href','parametres.html');
    const slot=link.querySelector('.icon');
    const key=({'Demandes clients':'Comptes-rendus','Contacts partenaire':'Clients','Analyse Ventes Clients':'Statistiques'})[label]||label;
    if(slot&&paths[key]&&!slot.querySelector('svg'))slot.replaceChildren(icon(paths[key]));
    const url=new URL(link.getAttribute('href')||'',location.href);
    const active=url.pathname.split('/').pop()===page &&
      (page!=='clients.html'||url.searchParams.get('filter')===new URLSearchParams(location.search).get('filter'));
    if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
  });
}

function arrangeClientTools() {
  const toolbar=document.querySelector('.crm-toolbar');
  if(!toolbar||!document.getElementById('client-form'))return;
  let details=toolbar.querySelector('.lrf-advanced-filters');
  if(!details){
    details=document.createElement('details');details.className='lrf-advanced-filters';
    const summary=document.createElement('summary');summary.textContent='Filtres avancés · partenaires, activité et relances';
    details.append(summary);toolbar.append(details);
  }
  for(const id of ['partner-filter-box','client-ops-bar']){
    const control=document.getElementById(id);
    if(control&&control.parentElement!==details)details.append(control);
  }
  const hasFilter=!!document.getElementById('ops-activity')?.value||!!document.getElementById('ops-followup')?.value||
    !!document.querySelector('#partner-filter-box input:checked');
  if(hasFilter)details.open=true;
}

function init() {
  if(!document.body.classList.contains('crm-body'))return;
  if(!document.getElementById('crm-workspace-css')){
    const css=document.createElement('link');css.id='crm-workspace-css';css.rel='stylesheet';
    css.href='assets/css/crm-workspace.css?v=20261023-audit1';document.head.append(css);
  }
  document.body.classList.add('lrf-workspace');
  const main=document.querySelector('main');
  if(main&&!document.querySelector('.lrf-skip-link')){
    if(!main.id)main.id='crm-main';main.tabIndex=-1;
    const skip=document.createElement('a');skip.href=`#${main.id}`;skip.className='lrf-skip-link';
    skip.textContent='Aller au contenu';document.body.prepend(skip);
  }
  navigation();
  arrangeClientTools();
  const toolbar=document.querySelector('.crm-toolbar');
  if(toolbar&&document.getElementById('client-form'))new MutationObserver(records=>{
    if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1)))arrangeClientTools();
  }).observe(toolbar,{childList:true,subtree:true});
  // Navigation extensions are loaded asynchronously, so only observe added links.
  const menu=document.querySelector('.sidebar-menu');
  if(menu)new MutationObserver(records=>{
    if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches('a,li')||n.querySelector?.('a')))))navigation();
  }).observe(menu,{childList:true,subtree:true});
  const offline=document.createElement('p');offline.className='lrf-network-status';offline.setAttribute('role','status');
  offline.textContent='Connexion interrompue. Vérifiez la confirmation de sauvegarde avant de fermer une fiche.';
  const setNetwork=()=>{offline.hidden=navigator.onLine;};setNetwork();
  window.addEventListener('online',setNetwork);window.addEventListener('offline',setNetwork);
  document.querySelector('main')?.prepend(offline);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
