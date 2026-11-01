(() => {
  'use strict';
  const RECIPIENT='jerome@leroyfactory.fr';
  const VERSION='20261101-pecchioli1';
  const norm=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[×✕]/g,'x').toLowerCase().replace(/[^a-z0-9]/g,'');
  const clean=(value,max=180)=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);
  const valueOf=item=>typeof item==='string'||typeof item==='number'?String(item):String(item?.value??item?.id??item?.name??item?.label??'');
  const labelOf=item=>typeof item==='string'||typeof item==='number'?String(item):String(item?.label??item?.name??item?.value??item?.id??'');
  const choices=list=>Array.isArray(list)?list.map(item=>({value:valueOf(item),label:labelOf(item),original:item})).filter(item=>item.value&&item.label):[];
  function exactChoice(list,input){
    const value=clean(input);if(!value)return '';
    const options=choices(list),exact=options.find(item=>item.value===value||item.label===value);
    if(exact)return exact.value;
    const equivalents=options.filter(item=>norm(item.value)===norm(value)||norm(item.label)===norm(value));
    return equivalents.length===1?equivalents[0].value:'';
  }
  const variants=product=>Array.isArray(product?.variants)?product.variants.filter(item=>item&&typeof item.id==='string'&&item.id&&typeof item.label==='string'&&item.label):[];
  function unitOf(product){
    const explicit=clean(product?.unit,30);
    if(explicit)return /^(m2|m²)$/i.test(explicit)?'m²':explicit;
    return '';
  }
  const wholeUnits=unit=>/^(piece|pieces|unite|unites|boite|boites|carton|cartons|sac|sacs)$/.test(norm(typeof unit==='string'?unit:unitOf(unit)));
  function unitOptions(product){
    const options=['m²','pièces','ml'],explicit=unitOf(product);
    return explicit&&!options.includes(explicit)?[explicit,...options]:options;
  }
  function quantityValue(input,whole=false){
    const raw=clean(input,20);if(!raw)return {value:'',error:''};
    if(!/^\d+(?:[,.]\d+)?$/.test(raw))return {value:'',error:'Indiquez une quantité positive en chiffres.'};
    const number=Number(raw.replace(',','.'));
    if(!Number.isFinite(number)||number<=0||number>100000)return {value:'',error:'La quantité doit être supérieure à 0 et ne pas dépasser 100 000.'};
    if(whole&&!Number.isInteger(number))return {value:'',error:'Pour cette unité, indiquez un nombre entier.'};
    return {value:String(number),error:''};
  }
  function variantOptions(product,variantId){
    const all=variants(product),variant=all.find(item=>item.id===variantId);
    if(!all.length)return {variant:null,formats:product?.formats||[],colors:product?.colors||[],finishes:product?.finishes||[],linked:false};
    if(!variant)return {variant:null,formats:[],colors:[],finishes:[],linked:true};
    const filterLinked=(kind,ids,singular)=>{
      const source=choices(product?.[kind]);
      if(singular){const exact=exactChoice(product?.[kind],singular);return source.filter(item=>item.value===exact).map(item=>item.original);}
      if(!Array.isArray(ids)||!ids.length)return [];
      const allowed=new Set(ids.map(norm));
      const swatchLabels=(kind==='colors'&&Array.isArray(product?.swatches)?product.swatches:[])
        .filter(swatch=>[swatch.id,swatch.code].some(value=>value&&allowed.has(norm(value))))
        .flatMap(swatch=>[swatch.name,swatch.label,swatch.code].filter(Boolean).map(norm));
      swatchLabels.forEach(value=>allowed.add(value));
      return source.filter(item=>[item.value,item.label,item.original?.id,item.original?.code].some(value=>value&&allowed.has(norm(value)))).map(item=>item.original);
    };
    return {variant,linked:true,
      formats:typeof variant.format==='string'&&variant.format?[variant.format]:Array.isArray(variant.formats)?variant.formats:[],
      colors:filterLinked('colors',variant.colorIds,variant.color),
      finishes:filterLinked('finishes',variant.finishIds,variant.finish)
    };
  }
  const safeImage=input=>{const value=typeof input==='string'?input:input?.url||input?.src||input?.image||input?.original||'';return /^(?:https:\/\/|assets\/|\/(?!\/))/.test(value)?value:'';};
  const isConnected=s=>!!s&&((/^LRF-\d{5}$/.test(String(s.codeClient||'').trim().toUpperCase())&&String(s.codeClient).trim().toUpperCase()!=='LRF-00001')||((s.isAdmin===true||s.admin===true)&&['jerome@leroyfactory.fr','coryne@leroyfactory.fr'].includes(String(s.email||s.adminEmail||'').trim().toLowerCase())));
  const productLink=slug=>'https://leroyfactory.fr/univers.html?partner=pecchioli-firenze'+(slug?'&collection='+encodeURIComponent(slug):'');
  window.LRF_PECCHIOLI_PROJECT_UTILS=Object.freeze({norm,exactChoice,quantityValue,unitOf,unitOptions,wholeUnits,variantOptions,safeImage,isConnected,productLink});
  const $=id=>document.getElementById(id),form=$('pecchioli-project-form');
  if(!form)return;
  const params=new URLSearchParams(location.search),touched=new Set(),hydrated=new Map();
  let products=[],selected=null,prepared=null,previousConnected=false,currentOptions;
  const session=()=>{try{return window.LRF_PRO_SESSION?.read?.()||window.LRF_PRO_CONTEXT||null;}catch{return null;}};
  const professional=()=>isConnected(session())||form.elements.profile.value==='professional';
  function invalidate(){prepared=null;$('request-preview').hidden=true;$('open-email').removeAttribute('href');$('request-feedback').textContent='';$('form-error').hidden=true;}
  function fillOptions(id,list,wanted='',deriveUnique=false){
    const select=$(id),values=choices(list);select.replaceChildren(new Option('À définir avec Jérôme',''));
    values.forEach(item=>select.add(new Option(item.label,item.value)));
    select.value=wanted?exactChoice(list,wanted):deriveUnique&&values.length===1?values[0].value:'';
    select.disabled=!values.length;return !wanted||!!select.value;
  }
  function updateReturnLinks(){const href='univers.html?partner=pecchioli-firenze'+(selected?'&collection='+encodeURIComponent(selected.slug):'');document.querySelectorAll('[data-product-return]').forEach(link=>{link.href=href;});}
  function updatePhoto(){
    const color=$('color').value,variant=variants(selected).find(item=>item.id===$('variant').value);
    const swatch=(Array.isArray(selected?.swatches)?selected.swatches:[]).find(item=>[item.id,item.name,item.label,item.code].filter(Boolean).some(value=>norm(value)===norm(color)));
    const swatchUrl=safeImage(swatch),variantUrl=safeImage(variant?.image||variant?.imageUrl);
    const cover=safeImage(selected?.coverImage)||safeImage(selected?.images?.[0]);
    const coverSource=(selected?.images||[]).find(item=>safeImage(item)===cover);
    const photo=variantUrl||swatchUrl||cover;
    const original=variantUrl?safeImage(variant?.originalUrl)||variantUrl:swatchUrl?safeImage(swatch?.originalUrl)||swatchUrl:safeImage(coverSource?.originalUrl)||cover;
    const link=$('product-image-link'),image=$('product-image');link.hidden=!photo;
    if(photo){image.src=photo;image.alt='Pecchioli Firenze '+selected.name+(swatchUrl&&color?' · '+$('color').selectedOptions[0].textContent:'');link.href=original;link.setAttribute('aria-label','Agrandir le visuel '+selected.name);}
    else{image.removeAttribute('src');link.removeAttribute('href');}
  }
  function renderVariant(wanted={}){
    currentOptions=variantOptions(selected,$('variant').value);
    for(const [key,list]of [['color',currentOptions.colors],['format',currentOptions.formats],['finish',currentOptions.finishes]]){
      fillOptions(key,list,wanted[key],!!currentOptions.variant);$(key+'-field').hidden=!choices(list).length;
    }
    $('selection-note').textContent=currentOptions.linked
      ? currentOptions.variant?'Cette variante reprend les associations documentées par le fabricant. Les éléments non précisés seront définis avec l’agence.':'Choisissez une variante documentée, ou laissez le choix ouvert pour demander conseil à l’agence.'
      :'Ces options indiquent vos choix souhaités. Les associations entre format, coloris et finition seront confirmées avec l’agence pour votre projet.';
    updatePhoto();
  }
  function renderProduct(wanted={}){
    selected=products.find(product=>product.slug===$('collection').value)||null;
    const all=variants(selected);fillOptions('variant',all,wanted.variant);$('variant-field').hidden=!all.length;
    const units=unitOptions(selected),requested=wanted.unit;
    $('unit').replaceChildren(new Option('À préciser',''));units.forEach(unit=>$('unit').add(new Option(unit,unit)));
    $('unit').value=requested===undefined?unitOf(selected):units.includes(requested)?requested:'';updateQuantityUnit();
    $('summary-kind').textContent='PECCHIOLI FIRENZE · '+(selected?.family||'CÉRAMIQUE ARTISANALE');
    $('summary-name').textContent=selected?.name||'Choisissez votre collection';
    $('summary-description').textContent=selected?clean(selected.description,500):'Les références, dimensions et finitions seront définies pour votre projet.';
    renderVariant(wanted);updateReturnLinks();
  }
  function updateQuantityUnit(){
    const unit=$('unit').value;
    $('quantity').inputMode=wholeUnits(unit)?'numeric':'decimal';
    $('quantity-note').textContent=unit?'Quantité indicative en '+unit+', à confirmer pour le projet.':'Choisissez l’unité souhaitée ou laissez-la à préciser avec l’agence.';
  }
  function hydrate(s){
    const values={company:s?.societe||'','contact-name':s?.name||s?.contact||'',email:s?.email||'',phone:s?.telephone||s?.tel||'',postcode:s?.codePostal||s?.cp||'',city:s?.ville||''};
    Object.entries(values).forEach(([id,value])=>{const field=$(id),previous=hydrated.get(id);if(touched.has(id)&&field.value!==previous)return;if(!field.value||field.value===previous){field.value=clean(value);hydrated.set(id,field.value);}});
  }
  function updateProfile(){
    const s=session(),connected=isConnected(s);
    if(connected||previousConnected)form.elements.profile.value=connected?'professional':'private';previousConnected=connected;
    $('profile-choice').hidden=connected;form.querySelectorAll('[name="profile"]').forEach(input=>{input.disabled=connected;});
    $('connected-profile').hidden=!connected;$('connected-profile').textContent=connected?'Compte professionnel connecté · '+(s.codeClient?clean(s.codeClient):'Administration'):'';
    const pro=professional();$('company-field').hidden=!pro;$('postcode').required=!pro;$('city').required=!pro;
    $('postcode-label').textContent='Code postal du projet'+(!pro?' *':'');$('city-label').textContent='Ville / secteur du projet'+(!pro?' *':'');
    $('profile-note').textContent=pro?'L’agence vous accompagne dans la définition des références et du chiffrage.':'Précisez le secteur de votre projet pour être orienté vers un magasin revendeur.';hydrate(s);
  }
  const fieldText=id=>clean($(id).value,id==='message'?2500:id==='details'?1200:180);
  const chosenLabel=id=>$(id).value?$(id).selectedOptions[0].textContent:'À définir avec Jérôme';
  function messageText(){
    const s=session(),pro=professional(),unit=$('unit').value,qty=quantityValue(fieldText('quantity'),wholeUnits(unit));
    return ['Bonjour Jérôme,','',pro?'Je souhaite préparer le chiffrage de mon projet Pecchioli Firenze.':'Je souhaite être conseillé sur mon projet Pecchioli Firenze et être orienté vers un magasin revendeur.','',
      'MA SÉLECTION PECCHIOLI FIRENZE','Collection / création : '+selected.name,
      variants(selected).length?'Variante documentée : '+chosenLabel('variant'):'',
      ...[['color','Coloris'],['format','Format'],['finish','Finition']].filter(([key])=>!$(key+'-field').hidden).map(([key,label])=>label+' : '+chosenLabel(key)),
      'Quantité souhaitée : '+(qty.value?qty.value.replace('.',',')+(unit?' '+unit:' (unité à préciser)'):'À préciser'),
      'Dimensions / précisions sur la création : '+(fieldText('details')||'À définir avec Jérôme'),
      'Associations et références finales à confirmer avec l’agence.','Lien de la sélection : '+productLink(selected.slug),'',
      'MON PROJET','Profil : '+(pro?'Professionnel':'Particulier'),pro&&s?.codeClient&&isConnected(s)?'Code client : '+clean(s.codeClient):'',
      pro&&fieldText('company')?'Société : '+fieldText('company'):'','Nom / contact : '+(fieldText('contact-name')||'Non renseigné'),
      'E-mail : '+(fieldText('email')||'Non renseigné'),'Téléphone : '+(fieldText('phone')||'Non renseigné'),
      'Secteur : '+([fieldText('postcode'),fieldText('city')].filter(Boolean).join(' ')||'À préciser'),'Projet / questions : '+(fieldText('message')||'À préciser'),'',
      'Merci de confirmer les références, dimensions, nuances, finitions, prix, disponibilités et conditions avant toute commande.'
    ].filter((line,index,array)=>line!==''||array[index-1]!=='').join('\n');
  }
  form.addEventListener('input',event=>{if(event.target.id)touched.add(event.target.id);invalidate();});
  $('collection').addEventListener('change',()=>{invalidate();$('query-note').hidden=true;renderProduct();});
  $('variant').addEventListener('change',()=>{invalidate();renderVariant();});$('color').addEventListener('change',updatePhoto);
  $('unit').addEventListener('change',()=>{invalidate();updateQuantityUnit();});
  form.querySelectorAll('[name="profile"]').forEach(input=>input.addEventListener('change',()=>{invalidate();updateProfile();}));
  form.addEventListener('submit',event=>{
    event.preventDefault();invalidate();if(!form.reportValidity()||!selected)return;
    const qty=quantityValue(fieldText('quantity'),wholeUnits($('unit').value));if(qty.error){$('form-error').textContent=qty.error;$('form-error').hidden=false;$('quantity').focus();return;}
    const text=messageText();prepared={text,identity:JSON.stringify(session())};$('request-text').value=text;
    $('open-email').href='mailto:'+RECIPIENT+'?subject='+encodeURIComponent('Projet Pecchioli Firenze — '+selected.name)+'&body='+encodeURIComponent(text);
    $('request-preview').hidden=false;$('request-preview').focus();$('request-preview').scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  });
  $('open-email').addEventListener('click',event=>{if(!prepared||prepared.identity!==JSON.stringify(session())){event.preventDefault();invalidate();updateProfile();return;}$('request-feedback').textContent='Le message est préparé pour votre messagerie. Son envoi reste à valider dans votre application e-mail.';});
  $('copy-request').addEventListener('click',async()=>{
    if(!prepared||prepared.identity!==JSON.stringify(session())){invalidate();updateProfile();return;}
    try{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(prepared.text);$('request-feedback').textContent='Demande copiée. Collez-la dans votre e-mail à '+RECIPIENT+'.';}
    catch{const field=$('request-text');field.focus();field.select();let copied=false;try{copied=document.execCommand('copy');}catch{}$('request-feedback').textContent=copied?'Demande copiée. Collez-la dans votre e-mail à '+RECIPIENT+'.':'Le récapitulatif est sélectionné. Utilisez « Copier », puis collez-le dans votre messagerie.';}
  });
  $('edit-request').addEventListener('click',()=>{invalidate();$('collection').focus();});
  window.addEventListener('lrf-pro-session-changed',()=>{invalidate();updateProfile();});
  window.addEventListener('storage',event=>{if(['lrfProSession','lrfProSessionToken','lrfProRememberToken'].includes(event.key)){invalidate();updateProfile();}});
  window.addEventListener('pageshow',()=>{if(prepared&&prepared.identity!==JSON.stringify(session()))invalidate();updateProfile();});
  $('product-image').addEventListener('error',()=>{$('product-image-link').hidden=true;});
  async function init(){
    updateProfile();
    try{
      const response=await fetch('assets/data/pecchioli-catalogue.json?v='+VERSION,{cache:'no-cache'});if(!response.ok)throw Error('Catalogue indisponible');
      const data=await response.json();products=(Array.isArray(data.collections)?data.collections:[]).filter(product=>product&&typeof product.slug==='string'&&typeof product.name==='string'&&['surface','sanitary','furniture'].includes(product.productType));
      if(!products.length)throw Error('Catalogue vide');
      const collection=$('collection'),groups=new Map();
      products.slice().sort((a,b)=>a.name.localeCompare(b.name,'fr')).forEach(product=>{const family=product.family||'Créations Pecchioli';if(!groups.has(family)){const group=document.createElement('optgroup');group.label=family;groups.set(family,group);collection.append(group);}groups.get(family).append(new Option(product.name,product.slug));});
      const wantedSlug=clean(params.get('collection')),product=products.find(item=>item.slug===wantedSlug||item.id===wantedSlug);collection.value=product?.slug||'';
      const wanted={variant:clean(params.get('variant')),color:clean(params.get('color')),format:clean(params.get('format')),finish:clean(params.get('finish'))};if(params.has('unit'))wanted.unit=clean(params.get('unit'),30);renderProduct(wanted);
      const qty=quantityValue(clean(params.get('quantity'),20),wholeUnits($('unit').value));if(!qty.error)$('quantity').value=qty.value;$('details').value=clean(params.get('details'),1200);
      const rejected=(wantedSlug&&!product)||Object.entries(wanted).some(([key,value])=>value&&!$(key).value)||qty.error;
      if(rejected){$('query-note').textContent='Certains choix du lien ne correspondent pas aux options documentées. Vérifiez la collection et précisez les détails avec Jérôme.';$('query-note').hidden=false;}
      $('catalogue-status').hidden=true;form.hidden=false;
    }catch{$('catalogue-status').replaceChildren(document.createTextNode('La sélection Pecchioli est momentanément indisponible. '));const link=document.createElement('a');link.href='mailto:'+RECIPIENT;link.textContent='Contacter Jérôme pour votre projet';$('catalogue-status').append(link);}
  }
  init();
})();
