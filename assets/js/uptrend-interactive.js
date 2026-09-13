(() => {
  'use strict';
  const CATALOGUE_URL = 'assets/pdf/UPTREND_Catalogue_2026.pdf';
  const DATA_URL = 'assets/data/uptrend-products.json?v=20260913-1';
  const TARIFF_ENDPOINT = 'https://gettariffpdf-5m3lsyu7bq-uc.a.run.app';
  const FIREBASE_CONFIG = {apiKey:'AIzaSyA3iuK5Ua8kFccURSqLihLshHnhA4rm2is',authDomain:'le-roy-factory.firebaseapp.com',projectId:'le-roy-factory',storageBucket:'le-roy-factory.firebasestorage.app',messagingSenderId:'249878619253',appId:'1:249878619253:web:05f051710b6251dbfa843c'};
  const ADMIN_EMAILS = new Set(['jerome@leroyfactory.fr','coryne@leroyfactory.fr']);
  const $ = id => document.getElementById(id);
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const state = {data:null,catalogue:null,tariff:null,tariffBlobUrl:null,zoom:1,currentPage:1,selected:null,catalogueScroll:0,rendered:new Set(),observer:null};
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

  function readSession(){
    try{
      const bridged=window.LRF_PRO_SESSION?.read?.();
      const value=bridged||JSON.parse(sessionStorage.getItem('lrfProSession')||'null');
      if(!value)return null;
      const email=String(value.email||value.adminEmail||'').trim().toLowerCase();
      if((value.isAdmin===true||value.admin===true)&&ADMIN_EMAILS.has(email))return value;
      if(!/^LRF-\d{5}$/.test(String(value.codeClient||'').toUpperCase())||!value.departement)return null;
      return value;
    }catch(_){return null}
  }
  function isAdmin(session){const email=String(session?.email||session?.adminEmail||'').trim().toLowerCase();return !!session&&(session.isAdmin===true||session.admin===true)&&ADMIN_EMAILS.has(email)}
  async function adminToken(){
    const [appModule,authModule]=await Promise.all([import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js')]);
    const app=appModule.getApps().length?appModule.getApp():appModule.initializeApp(FIREBASE_CONFIG);
    const user=authModule.getAuth(app).currentUser;
    const email=String(user?.email||'').trim().toLowerCase();
    if(!user||!ADMIN_EMAILS.has(email))throw new Error('Session administrateur expirée. Reconnectez-vous à l’Espace Agent.');
    return user.getIdToken(true);
  }
  async function fetchTariff(){
    if(state.tariff)return state.tariff;
    const session=readSession();
    if(!session){const error=new Error('Accès PRO requis');error.code='NO_SESSION';throw error}
    const headers={'Content-Type':'application/json'};const body={tariffId:'uptrend-2026'};
    if(isAdmin(session))headers.Authorization=`Bearer ${await adminToken()}`;else{body.codeClient=session.codeClient;body.departement=session.departement}
    const response=await fetch(TARIFF_ENDPOINT,{method:'POST',headers,body:JSON.stringify(body)});
    if(!response.ok){let message='Impossible d’ouvrir le tarif sécurisé.';try{const j=await response.json();if(j?.error)message=j.error}catch(_){}const error=new Error(message);error.code=response.status===403?'FORBIDDEN':'FETCH_FAILED';throw error}
    const buffer=await response.arrayBuffer();
    state.tariffBlobUrl=URL.createObjectURL(new Blob([buffer],{type:'application/pdf'}));
    state.tariff=await pdfjsLib.getDocument({data:buffer}).promise;
    return state.tariff;
  }
  function extractInfo(product){
    const d=product.designation||'';
    const dimensions=(d.match(/\b\d+(?:[,.]\d+)?\s*[x×]\s*\d+(?:[,.]\d+)?(?:\s*[x×]\s*\d+(?:[,.]\d+)?)?/i)||[])[0]||'';
    const colour=(d.match(/\b(?:blanc(?:he)?|noir|doré(?:e)?|or|beige|gris|vert|bleu|rose|macchiato)(?:\s+(?:et\s+)?(?:blanc(?:he)?|noir|doré(?:e)?|or|beige|gris|vert|bleu|rose|mat|brillant|macchiato)){0,3}/i)||[])[0]||'';
    return {dimensions,colour};
  }
  function linesFromText(items){
    const lines=[];
    items.filter(i=>i.str?.trim()).sort((a,b)=>b.transform[5]-a.transform[5]||a.transform[4]-b.transform[4]).forEach(item=>{
      const y=item.transform[5];let line=lines.find(l=>Math.abs(l.y-y)<1.7);
      if(!line){line={y,items:[]};lines.push(line)}line.items.push(item);
    });
    lines.forEach(l=>l.items.sort((a,b)=>a.transform[4]-b.transform[4]));return lines;
  }
  async function tariffRow(product){
    const tariff=await fetchTariff();
    const page=await tariff.getPage(product.pageTarif);
    const text=await page.getTextContent();
    const target=norm(product.reference);
    for(const line of linesFromText(text.items)){
      const code=norm(line.items.filter(i=>i.transform[4]>=82&&i.transform[4]<165).map(i=>i.str).join(''));
      if(code!==target)continue;
      const priceItem=line.items.find(i=>i.transform[4]>500&&/^\d+[,.]\d{2}$/.test(i.str.trim()));
      if(priceItem)return {price:`${priceItem.str.replace('.',',')} €`,y:line.y,page};
    }
    return {price:null,y:null,page};
  }
  function detailsHtml(product){
    const info=extractInfo(product);const rows=[];
    if(product.designation)rows.push(`<dt>Désignation</dt><dd>${escapeHtml(product.designation)}</dd>`);
    if(info.dimensions)rows.push(`<dt>Dimensions</dt><dd>${escapeHtml(info.dimensions)}</dd>`);
    if(info.colour)rows.push(`<dt>Couleur</dt><dd>${escapeHtml(info.colour)}</dd>`);
    return rows.join('');
  }
  function escapeHtml(value){const node=document.createElement('span');node.textContent=String(value||'');return node.innerHTML}
  async function openProduct(product){
    state.selected=product;$('dialog-name').textContent=product.nom||'Produit UPTREND';$('dialog-ref').textContent=product.reference;$('dialog-details').innerHTML=detailsHtml(product);
    $('dialog-price').textContent=product.dansTarif?'Chargement…':'Nous consulter';$('dialog-message').hidden=true;$('view-in-tariff').hidden=true;$('pro-login').hidden=true;
    const dialog=$('product-dialog');if(!dialog.open)dialog.showModal();
    if(!product.dansTarif||!product.pageTarif){$('dialog-message').textContent='Cette référence apparaît dans le catalogue mais ne possède pas de correspondance exacte dans le tarif fourni.';$('dialog-message').hidden=false;return}
    try{const row=await tariffRow(product);if(!row.price)throw new Error('Prix introuvable pour cette référence exacte.');product._tariffRow=row;$('dialog-price').textContent=row.price;$('view-in-tariff').hidden=false}
    catch(error){$('dialog-price').textContent=error.code==='NO_SESSION'?'Accès PRO requis':'Indisponible';$('dialog-message').textContent=error.message;$('dialog-message').hidden=false;if(error.code==='NO_SESSION'||error.code==='FORBIDDEN')$('pro-login').hidden=false}
  }
  function pageProducts(pageNumber){return Object.values(state.data.products).filter(p=>p.dansCatalogue&&p.hotspot?.page===pageNumber)}
  function addHotspots(holder,pageNumber){
    const [pw,ph]=state.data.pageSizes[String(pageNumber)]||[595.276,841.89];
    pageProducts(pageNumber).forEach(product=>{const [x0,y0,x1,y1]=product.hotspot.bbox;const btn=document.createElement('button');btn.type='button';btn.className='up-hotspot';btn.setAttribute('aria-label',`${product.nom||'Produit'} ${product.reference} — afficher le tarif PRO`);btn.style.cssText=`left:${x0/pw*100}%;top:${y0/ph*100}%;width:${(x1-x0)/pw*100}%;height:${(y1-y0)/ph*100}%`;btn.addEventListener('click',()=>openProduct(product));holder.appendChild(btn)})
  }
  async function renderCataloguePage(holder,pageNumber){
    if(state.rendered.has(pageNumber)||holder.dataset.rendering)return;holder.dataset.rendering='1';
    try{const page=await state.catalogue.getPage(pageNumber);const base=page.getViewport({scale:1});const cssWidth=holder.getBoundingClientRect().width;const scale=cssWidth/base.width;const dpr=Math.min(window.devicePixelRatio||1,2);const viewport=page.getViewport({scale:scale*dpr});const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);canvas.setAttribute('aria-label',`Page ${pageNumber} du catalogue`);holder.prepend(canvas);await page.render({canvasContext:canvas.getContext('2d',{alpha:false}),viewport}).promise;addHotspots(holder,pageNumber);state.rendered.add(pageNumber)}catch(error){holder.innerHTML=`<p style="padding:20px">Page ${pageNumber} indisponible.</p>`;console.error(error)}finally{delete holder.dataset.rendering}
  }
  function createPages(){
    const root=$('catalogue-pages');root.innerHTML='';for(let page=1;page<=state.catalogue.numPages;page++){const holder=document.createElement('article');holder.className='up-page';holder.dataset.page=page;holder.innerHTML=`<span class="up-page-number">${page}</span>`;root.appendChild(holder)}
    state.observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting)renderCataloguePage(entry.target,Number(entry.target.dataset.page))}),{rootMargin:'1400px 0px'});root.querySelectorAll('.up-page').forEach(p=>state.observer.observe(p));
    const pageObserver=new IntersectionObserver(entries=>{const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(visible){state.currentPage=Number(visible.target.dataset.page);$('page-input').value=state.currentPage}},{rootMargin:'-36% 0px -52% 0px',threshold:[0,.25,.5,1]});root.querySelectorAll('.up-page').forEach(p=>pageObserver.observe(p));
  }
  function goPage(page,behavior='smooth'){page=Math.max(1,Math.min(state.catalogue.numPages,Number(page)||1));document.querySelector(`.up-page[data-page="${page}"]`)?.scrollIntoView({behavior,block:'start'})}
  function findProduct(query){const q=norm(query);if(!q)return null;return Object.values(state.data.products).find(p=>p.dansCatalogue&&(norm(p.reference)===q||norm(p.nom).includes(q)))||Object.values(state.data.products).find(p=>p.dansCatalogue&&(norm(p.reference).includes(q)||norm(p.nom).includes(q)))}
  function runSearch(){const product=findProduct($('product-search').value);if(!product){$('product-search').setCustomValidity('Aucun produit trouvé');$('product-search').reportValidity();return}$('product-search').setCustomValidity('');goPage(product.pageCatalogue);setTimeout(()=>openProduct(product),650)}
  async function showTariff(){
    const product=state.selected;if(!product)return;state.catalogueScroll=scrollY;$('product-dialog').close();$('catalogue-view').hidden=true;$('catalogue-toolbar').hidden=true;$('tariff-view').hidden=false;scrollTo(0,0);
    const row=product._tariffRow||await tariffRow(product);const page=row.page||await state.tariff.getPage(product.pageTarif);const base=page.getViewport({scale:1});const container=$('tariff-page');container.innerHTML='';const cssWidth=Math.min(820,innerWidth-20);const dpr=Math.min(devicePixelRatio||1,2);const viewport=page.getViewport({scale:cssWidth/base.width*dpr});const canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;container.appendChild(canvas);await page.render({canvasContext:canvas.getContext('2d',{alpha:false}),viewport}).promise;
    if(row.y){const marker=document.createElement('div');marker.className='up-row-highlight';marker.style.top=`${(base.height-row.y-10)/base.height*100}%`;marker.style.height=`${22/base.height*100}%`;container.appendChild(marker)}
    $('tariff-title').textContent=`${product.nom||'UPTREND'} — ${product.reference}`;$('tariff-page-label').textContent=`Page ${product.pageTarif} du tarif PRO`;
  }
  function backToCatalogue(){$('tariff-view').hidden=true;$('catalogue-view').hidden=false;$('catalogue-toolbar').hidden=false;requestAnimationFrame(()=>scrollTo({top:state.catalogueScroll,behavior:'auto'}))}
  function bind(){
    $('previous-page').onclick=()=>goPage(state.currentPage-1);$('next-page').onclick=()=>goPage(state.currentPage+1);$('page-input').onchange=e=>goPage(e.target.value);$('search-button').onclick=runSearch;$('product-search').onkeydown=e=>{if(e.key==='Enter')runSearch()};
    $('zoom-in').onclick=()=>setZoom(state.zoom+.15);$('zoom-out').onclick=()=>setZoom(state.zoom-.15);$('dialog-close').onclick=$('dialog-cancel').onclick=()=>$('product-dialog').close();$('view-in-tariff').onclick=showTariff;$('back-to-catalogue').onclick=backToCatalogue;
    $('product-dialog').addEventListener('click',e=>{if(e.target===$('product-dialog'))$('product-dialog').close()});
  }
  function updatePageBase(){$('catalogue-pages')?.style.setProperty('--page-base',`${Math.min(innerWidth-(innerWidth<=760?16:32),780)}px`)}
  function setZoom(value){state.zoom=Math.max(.7,Math.min(2.2,Math.round(value*100)/100));$('catalogue-pages').style.setProperty('--zoom',state.zoom);$('zoom-value').textContent=`${Math.round(state.zoom*100)} %`;const keep=state.currentPage;state.rendered.clear();document.querySelectorAll('.up-page canvas,.up-hotspot').forEach(e=>e.remove());goPage(keep,'auto');document.querySelectorAll('.up-page').forEach(p=>state.observer.unobserve(p));document.querySelectorAll('.up-page').forEach(p=>state.observer.observe(p))}
  async function init(){
    try{bind();updatePageBase();addEventListener('resize',updatePageBase,{passive:true});const [data,catalogue]=await Promise.all([fetch(DATA_URL,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Index UPTREND indisponible');return r.json()}),pdfjsLib.getDocument({url:CATALOGUE_URL,disableRange:true,disableStream:true}).promise]);state.data=data;state.catalogue=catalogue;createPages();$('loading').hidden=true;const params=new URLSearchParams(location.search);const ref=params.get('ref');if(ref){const product=findProduct(ref);if(product){$('product-search').value=product.reference;setTimeout(()=>{goPage(product.pageCatalogue,'auto');openProduct(product)},200)}}}
    catch(error){$('loading').innerHTML=`<strong>Le catalogue interactif n’est pas encore disponible.</strong><span style="animation:none;border:0;width:auto;height:auto">${escapeHtml(error.message)}</span><a href="catalogues.html" style="color:#651f2a">Retour aux catalogues</a>`;console.error(error)}
  }
  addEventListener('beforeunload',()=>{if(state.tariffBlobUrl)URL.revokeObjectURL(state.tariffBlobUrl)});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
