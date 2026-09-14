(() => {
  'use strict';
  const PDF_URL='assets/pdf/aquahome2026.pdf';
  const DATA_URL='assets/data/aquahome-products.json?v=20260913-2';
  const API='https://us-central1-le-roy-factory.cloudfunctions.net/aquahomeCatalog';
  const CART_KEY='lrfAquahomeCartV1';
  const FIREBASE_CONFIG={apiKey:'AIzaSyA3iuK5Ua8kFccURSqLihLshHnhA4rm2is',authDomain:'le-roy-factory.firebaseapp.com',projectId:'le-roy-factory',storageBucket:'le-roy-factory.firebasestorage.app',messagingSenderId:'249878619253',appId:'1:249878619253:web:05f051710b6251dbfa843c'};
  const ADMINS=new Set(['jerome@leroyfactory.fr','coryne@leroyfactory.fr']);
  const $=id=>document.getElementById(id);
  const mobileQuery=window.matchMedia('(max-width: 760px)');
  const state={data:null,pdf:null,zoom:1,currentPage:1,currentPdfPage:1,views:[],rendered:new Set(),observer:null,currentObserver:null,pro:false,prices:{},selected:null,location:null,mobile:mobileQuery.matches,renderGeneration:0};
  pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

  const money=value=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(Number(value));
  const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  function session(){try{return window.LRF_PRO_SESSION?.read?.()||null}catch(_){return null}}
  function isAdmin(s){return !!s&&(s.isAdmin===true||s.admin===true)&&ADMINS.has(String(s.email||'').toLowerCase())}
  async function adminToken(){const [a,u]=await Promise.all([import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js')]);const app=a.getApps().length?a.getApp():a.initializeApp(FIREBASE_CONFIG),auth=u.getAuth(app);const user=auth.currentUser||await new Promise(resolve=>{const stop=u.onAuthStateChanged(auth,v=>{stop();resolve(v)});setTimeout(()=>{stop();resolve(null)},4000)});if(!user||!ADMINS.has(String(user.email||'').toLowerCase()))throw new Error('Session administrateur expirée.');return user.getIdToken(true)}
  async function api(body,auth=false){const headers={'Content-Type':'application/json'},s=session();if(auth){if(!s)throw new Error('Connectez-vous avec votre code LRF.');if(isAdmin(s))headers.Authorization=`Bearer ${await adminToken()}`;else body.sessionToken=s.sessionToken}const response=await fetch(API,{method:'POST',headers,body:JSON.stringify(body)});let data={};try{data=await response.json()}catch(_){}if(!response.ok)throw new Error(data.error||'Service momentanément indisponible.');return data}
  function readCart(){try{const v=JSON.parse(localStorage.getItem(CART_KEY)||'[]');return Array.isArray(v)?v:[]}catch(_){return []}}
  function cartCount(){const n=readCart().reduce((sum,item)=>sum+(Number(item.quantity)||0),0);document.querySelectorAll('[data-cart-count]').forEach(el=>el.textContent=n)}
  function valueFor(row){if(row.priceAmbiguous)return null;if(state.pro){const v=state.prices[row.reference];return v==null?null:v}return row.publicTTC}
  function labelFor(row){const value=valueFor(row);return value==null?'Prix sur demande':money(value)}
  function groupFor(row){return state.data.products.filter(item=>item.page===row.page&&item.sourceName===row.sourceName)}

  async function refreshAccess(){const s=await window.LRF_PRO_SESSION?.restore?.()||session();state.pro=false;state.prices={};if(s){try{const result=await api({action:'context'},true);state.pro=true;state.prices=result.prices||{}}catch(error){console.warn(error)}}$('price-mode').textContent=state.pro?'Tarif PRO HT':'Prix publics TTC';$('price-mode').classList.toggle('pro',state.pro);document.querySelectorAll('.aq-price-overlay').forEach(updateOverlay);document.querySelectorAll('.aq-cover-mode').forEach(el=>el.textContent=state.pro?'TARIF PRO HT':'PRIX PUBLICS TTC');if(state.selected&&$('product-dialog').open)selectVariant(state.selected.reference)}
  function updateOverlay(el){const row=el.dataset.unmatched==null?state.data.products[Number(el.dataset.index)]:state.data.unmatchedPrices[Number(el.dataset.unmatched)];el.textContent=el.dataset.unmatched!=null&&state.pro?'Prix sur demande':labelFor(row);el.classList.toggle('pro',state.pro)}

  function boxForView(box,side){
    if(!side)return box;
    const [x,y,w,h]=box,center=x+w/2;
    if((side==='left'&&center>=.5)||(side==='right'&&center<.5))return null;
    return [Math.max(0,(x-(side==='right' ? .5 : 0))*2),y,Math.min(1,w*2),h];
  }
  function overlayStyle(holder,box,minWidth){
    const [x,y,w,h]=box;
    const fontSize=Math.max(5,Math.min(13,holder.clientWidth*(holder.dataset.side?0.014:0.007)));
    return `left:${x*100}%;top:${y*100}%;width:${Math.max(w,minWidth)*100}%;height:${h*100}%;font-size:${fontSize}px`;
  }
  function addLayers(holder,view){
    const page=view.pdfPage,side=view.side;
    if(page===1){const mode=document.createElement('strong');mode.className='aq-cover-mode';mode.textContent=state.pro?'TARIF PRO HT':'PRIX PUBLICS TTC';holder.appendChild(mode)}
    state.data.products.forEach((row,index)=>{
      if(row.page!==page)return;
      const hotspot=boxForView(row.hotspot,side),priceBox=boxForView(row.priceBox,side);
      if(!hotspot||!priceBox)return;
      const [x,y,w,h]=hotspot,button=document.createElement('button');button.type='button';button.className='aq-hotspot';button.style.cssText=`left:${x*100}%;top:${y*100}%;width:${w*100}%;height:${h*100}%`;button.setAttribute('aria-label',`${row.name}, référence ${row.reference}`);button.onclick=()=>openProduct(row);holder.appendChild(button);
      const price=document.createElement('span');price.className='aq-price-overlay';price.dataset.index=index;price.style.cssText=overlayStyle(holder,priceBox,side ? .07 : .035);updateOverlay(price);holder.appendChild(price)
    })
  }
  function addUnmatchedPrices(holder,view){(state.data.unmatchedPrices||[]).forEach((row,index)=>{if(row.page!==view.pdfPage)return;const priceBox=boxForView(row.priceBox,view.side);if(!priceBox)return;const price=document.createElement('span');price.className='aq-price-overlay';price.dataset.unmatched=index;price.style.cssText=overlayStyle(holder,priceBox,view.side ? .1 : .06);updateOverlay(price);holder.appendChild(price)})}
  function unloadPage(holder){
    holder.dataset.renderToken=String((Number(holder.dataset.renderToken)||0)+1);
    delete holder.dataset.rendering;
    state.rendered.delete(Number(holder.dataset.view));
    holder.querySelectorAll('canvas,.aq-hotspot,.aq-price-overlay,.aq-cover-mode').forEach(el=>el.remove());
  }
  async function renderPage(holder){
    const viewIndex=Number(holder.dataset.view),view=state.views[viewIndex-1];
    if(!view||state.rendered.has(viewIndex)||holder.dataset.rendering)return;
    holder.dataset.rendering='1';
    const token=String((Number(holder.dataset.renderToken)||0)+1);holder.dataset.renderToken=token;
    let canvas;
    try{
      const page=await state.pdf.getPage(view.pdfPage),base=page.getViewport({scale:1}),sourceWidth=view.side?base.width/2:base.width;
      const dpr=Math.min(devicePixelRatio||1,state.mobile?3:2.25),scale=Math.max(.1,holder.clientWidth/sourceWidth)*dpr,viewport=page.getViewport({scale});
      canvas=document.createElement('canvas');canvas.width=Math.ceil(view.side?viewport.width/2:viewport.width);canvas.height=Math.ceil(viewport.height);canvas.style.aspectRatio=`${sourceWidth}/${base.height}`;holder.prepend(canvas);
      const renderOptions={canvasContext:canvas.getContext('2d',{alpha:false}),viewport};
      if(view.side==='right')renderOptions.transform=[1,0,0,1,-viewport.width/2,0];
      await page.render(renderOptions).promise;
      if(holder.dataset.renderToken!==token){canvas.remove();return}
      addLayers(holder,view);addUnmatchedPrices(holder,view);state.rendered.add(viewIndex)
    }catch(error){if(holder.dataset.renderToken===token){holder.insertAdjacentHTML('beforeend',`<p>Page ${view?.label||viewIndex} indisponible.</p>`);console.error(error)}}finally{if(holder.dataset.renderToken===token)delete holder.dataset.rendering}
  }
  function buildViews(){
    const views=[];
    state.data.pages.forEach(meta=>{
      const spread=state.mobile&&meta.width/meta.height>1.15;
      if(spread){views.push({pdfPage:meta.page,side:'left',width:meta.width/2,height:meta.height});views.push({pdfPage:meta.page,side:'right',width:meta.width/2,height:meta.height})}
      else views.push({pdfPage:meta.page,side:null,width:meta.width,height:meta.height})
    });
    return views.map((view,index)=>({...view,index:index+1,label:index+1}))
  }
  function createPages(){
    const root=$('catalogue-pages');state.views=buildViews();
    state.views.forEach(view=>{const page=document.createElement('article');page.className='aq-page';page.dataset.view=view.index;page.dataset.page=view.pdfPage;if(view.side)page.dataset.side=view.side;page.style.aspectRatio=`${view.width}/${view.height}`;page.innerHTML=`<span class="aq-page-number">${view.label}</span>`;root.appendChild(page)});
    $('page-total').textContent=`/ ${state.views.length}`;$('page-input').max=String(state.views.length);
    state.observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)renderPage(e.target);else if(state.mobile)unloadPage(e.target)}),{rootMargin:state.mobile?'650px 0px':'1200px 0px'});root.querySelectorAll('.aq-page').forEach(p=>state.observer.observe(p));
    state.currentObserver=new IntersectionObserver(entries=>{const v=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(v){state.currentPage=Number(v.target.dataset.view);state.currentPdfPage=Number(v.target.dataset.page);$('page-input').value=state.currentPage}},{rootMargin:'-24% 0px -60% 0px',threshold:[0,.2,.5]});root.querySelectorAll('.aq-page').forEach(p=>state.currentObserver.observe(p))
  }
  function goPage(value,behavior='smooth'){const page=Math.max(1,Math.min(state.views.length,Number(value)||1));document.querySelector(`.aq-page[data-view="${page}"]`)?.scrollIntoView({behavior,block:'start'})}
  function viewForProduct(row){if(!state.mobile)return row.page;const side=(row.hotspot[0]+row.hotspot[2]/2)<.5?'left':'right';return state.views.find(v=>v.pdfPage===row.page&&(!v.side||v.side===side))?.index||1}
  function findProduct(q){q=norm(q);return state.data.products.find(p=>norm(p.reference)===q)||state.data.products.find(p=>norm(`${p.name} ${p.collection} ${p.reference}`).includes(q))}
  function search(){const product=findProduct($('product-search').value);if(!product){$('product-search').setCustomValidity('Aucune référence trouvée');$('product-search').reportValidity();return}$('product-search').setCustomValidity('');goPage(viewForProduct(product));setTimeout(()=>openProduct(product),500)}
  function setZoom(value){state.zoom=Math.max(state.mobile?1:.7,Math.min(2.5,value));$('catalogue-pages').style.setProperty('--zoom',state.zoom);$('zoom-value').textContent=`${Math.round(state.zoom*100)} %`;const current=state.currentPage;state.renderGeneration++;document.querySelectorAll('.aq-page').forEach(unloadPage);requestAnimationFrame(()=>requestAnimationFrame(()=>{document.querySelectorAll('.aq-page').forEach(el=>{state.observer.unobserve(el);state.observer.observe(el)});goPage(current,'auto')}))}

  function selectVariant(ref){const row=groupFor(state.selected).find(item=>item.reference===ref)||state.selected;state.selected=row;$('dialog-ref').textContent=row.reference;$('dialog-price-label').textContent=state.pro?'Tarif PRO HT':'Prix public TTC';$('dialog-price').textContent=labelFor(row);$('dialog-message').hidden=valueFor(row)!=null;$('dialog-message').textContent=row.priceAmbiguous?'Cette référence est utilisée avec deux produits et deux prix différents dans le catalogue fournisseur. Prix sur demande.':'Tarif non disponible pour cette référence : nous consulter.';$('dealer-open').hidden=state.pro;$('add-to-cart').hidden=!state.pro||valueFor(row)==null}
  function openProduct(row){state.selected=row;const variants=groupFor(row);$('dialog-name').textContent=row.name;$('dialog-collection').textContent=row.collection;$('variant-wrap').hidden=variants.length<2;$('variant-select').innerHTML=variants.map(v=>`<option value="${v.reference}">${v.finish} — ${v.reference}</option>`).join('');$('variant-select').value=row.reference;selectVariant(row.reference);$('product-dialog').showModal()}
  function addToCart(){const row=state.selected;if(!state.pro||valueFor(row)==null)return;const cart=readCart(),item=cart.find(v=>v.reference===row.reference);if(item)item.quantity+=1;else cart.push({reference:row.reference,name:row.name,collection:row.collection,finish:row.finish,page:row.page,hotspot:row.hotspot,quantity:1});localStorage.setItem(CART_KEY,JSON.stringify(cart));cartCount();$('add-to-cart').textContent='Ajouté ✓';setTimeout(()=>$('add-to-cart').textContent='Ajouter au panier',1000)}
  function openDealer(){const row=state.selected;$('dealer-product').textContent=`${row.name} · ${row.reference} · ${money(row.publicTTC)} TTC`;$('product-dialog').close();$('dealer-dialog').showModal()}

  let geoTimer;
  async function geoSearch(value){clearTimeout(geoTimer);state.location=null;$('dealer-form').elements.ville.value='';$('dealer-form').elements.codePostal.value='';if(value.trim().length<2){$('location-results').hidden=true;return}geoTimer=setTimeout(async()=>{try{const q=value.trim(),url=/^\d{2,5}$/.test(q)?`https://geo.api.gouv.fr/communes?codePostal=${encodeURIComponent(q)}&fields=nom,codesPostaux,code,departement&format=json`:`https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(q)}&fields=nom,codesPostaux,code,departement&boost=population&limit=8`;const list=await fetch(url).then(r=>r.ok?r.json():[]),choices=[];list.slice(0,8).forEach(city=>(city.codesPostaux||['']).forEach(cp=>choices.push({city:city.nom,postalCode:cp})));$('location-results').innerHTML=choices.slice(0,10).map((item,i)=>`<button type="button" data-i="${i}">${item.city} — ${item.postalCode}</button>`).join('');$('location-results').hidden=!choices.length;$('location-results')._choices=choices}catch(_){$('location-results').hidden=true}},280)}
  async function submitDealer(event){event.preventDefault();const form=event.currentTarget,status=$('dealer-status');if(!state.location){status.textContent='Sélectionnez une ville dans la liste proposée.';status.hidden=false;return}const fields=Object.fromEntries(new FormData(form));status.textContent='Envoi en cours…';status.hidden=false;try{await api({action:'dealer',...fields,ville:state.location.city,codePostal:state.location.postalCode,product:state.selected});form.reset();state.location=null;status.textContent='Merci. Votre demande a bien été transmise à Jérôme et Coryne. Ils vous recontacteront rapidement.';setTimeout(()=>$('dealer-dialog').close(),2600)}catch(error){status.textContent=error.message}}

  function bind(){document.querySelectorAll('[data-close]').forEach(btn=>btn.onclick=()=>$(btn.dataset.close).close());$('previous-page').onclick=()=>goPage(state.currentPage-1);$('next-page').onclick=()=>goPage(state.currentPage+1);$('page-input').onchange=e=>goPage(e.target.value);$('search-button').onclick=search;$('product-search').onkeydown=e=>{if(e.key==='Enter')search()};$('zoom-in').onclick=()=>setZoom(state.zoom+.15);$('zoom-out').onclick=()=>setZoom(state.zoom-.15);$('variant-select').onchange=e=>selectVariant(e.target.value);$('add-to-cart').onclick=addToCart;$('dealer-open').onclick=openDealer;$('location-input').oninput=e=>geoSearch(e.target.value);$('location-results').onclick=e=>{const btn=e.target.closest('button');if(!btn)return;const choice=e.currentTarget._choices[Number(btn.dataset.i)];state.location=choice;$('location-input').value=`${choice.city} — ${choice.postalCode}`;$('dealer-form').elements.ville.value=choice.city;$('dealer-form').elements.codePostal.value=choice.postalCode;e.currentTarget.hidden=true};$('dealer-form').onsubmit=submitDealer;window.addEventListener('lrf-pro-session-changed',refreshAccess)}
  async function init(){try{bind();cartCount();const [data,pdf]=await Promise.all([fetch(DATA_URL,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Index produits indisponible.');return r.json()}),pdfjsLib.getDocument({url:PDF_URL}).promise]);state.data=data;state.pdf=pdf;createPages();await refreshAccess();$('loading').hidden=true;const ref=new URLSearchParams(location.search).get('ref');if(ref){const row=findProduct(ref);if(row){$('product-search').value=row.reference;setTimeout(()=>{goPage(viewForProduct(row));openProduct(row)},300)}}}catch(error){$('loading').innerHTML=`<strong>Le catalogue interactif est momentanément indisponible.</strong><span>${error.message}</span>`;console.error(error)}}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init,{once:true}):init();
})();
