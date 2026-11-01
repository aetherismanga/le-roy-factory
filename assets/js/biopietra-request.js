(() => {
  'use strict';
  const VERSION = '20261101-biopietra1';
  const RECIPIENT = 'jerome@leroyfactory.fr';
  const ENDPOINT = 'https://us-central1-le-roy-factory.cloudfunctions.net/biopietraRequest';
  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const fr = value => Number(value).toLocaleString('fr-FR',{maximumFractionDigits:6});
  const safeImage = value => /^(https:\/\/|assets\/|\/(?!\/))/.test(String(value || '')) ? String(value) : '';
  const componentLabel = value => ({fondo:'Plaques / fond',angle:'Angles',piece:'Pièce spéciale',accessory:'Accessoire de pose'}[value] || value || 'Élément');
  const packLabel = (variant, count=1) => {
    const label=variant?.packLabel || 'boîte';
    return label + (count>1 && !label.endsWith('s') ? 's' : '');
  };
  const connected = s => !!s && (/^LRF-\d{5}(?:-|$)/i.test(String(s.codeClient || '').trim()) || s.isAdmin === true || s.admin === true);
  const variantsFor = (product, colorId = '', component = '') => (product?.variants || []).filter(variant =>
    (!component || variant.component === component) && (!colorId || !Array.isArray(variant.colorIds) || variant.colorIds.includes(colorId)));
  function calculateBoxes(variant, input, requestedUnit) {
    const text = String(input ?? '').trim();
    if (!/^\d+(?:[,.]\d+)?$/.test(text)) return {status:'invalid',message:'Indiquez une quantité positive.'};
    const quantity = Number(text.replace(',','.'));
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100000) return {status:'invalid',message:'Indiquez une quantité positive, au maximum 100 000.'};
    const unit = variant?.unit;
    if (!unit || ![unit,'boîtes'].includes(requestedUnit)) return {status:'invalid',message:'Choisissez une variante et une unité compatibles.'};
    if ((requestedUnit === 'boîtes' || ['piece','pieces','sac','sacs'].includes(norm(unit))) && !Number.isInteger(quantity)) return {status:'invalid',message:'Indiquez un nombre entier de pièces, de sacs ou de boîtes.'};
    const perBox = variant?.packQuantity;
    if (typeof perBox !== 'number' || !Number.isFinite(perBox) || perBox <= 0) return {status:'unknown',quantity,unit:requestedUnit};
    const boxes = requestedUnit === 'boîtes' ? quantity : Math.ceil(quantity / perBox - 1e-10);
    return {status:'known',boxes,quantity:Number((boxes * perBox).toFixed(6)),unit,requestedQuantity:quantity,requestedUnit,perBox};
  }
  // Shared by the form and its acceptance checks; no tariff data is loaded here.
  window.LRF_BIOPIETRA_REQUEST_UTILS = {calculateBoxes,variantsFor,connected};
  const form = $('#biopietra-request-form'), container = $('#biopietra-request-lines');
  if (!form || !container) return;
  const params = new URLSearchParams(location.search), hydrated = new Map(), touched = new Set();
  let products = [], lines = [], sequence = 0, wasConnected = false, prepared=null, sending=false;
  const session = () => { try { return window.LRF_PRO_SESSION?.read?.() || window.LRF_PRO_CONTEXT || JSON.parse(sessionStorage.getItem('lrfProSession') || 'null'); } catch { return null; } };
  const sessionStamp = () => JSON.stringify(session());
  const requestId = () => typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : 'biopietra-' + Array.from(crypto.getRandomValues(new Uint8Array(20)),n=>n.toString(16).padStart(2,'0')).join('');
  const profile = () => connected(session()) ? 'professional' : $('input[name="profile"]:checked',form)?.value || 'private';
  const productOf = line => products.find(product => product.slug === line.slug);
  const colorOf = line => productOf(line)?.swatches?.find(color => color.id === line.colorId);
  const variantOf = line => variantsFor(productOf(line),line.colorId,line.component).find(variant => variant.id === line.variantId);
  function redirectLinkedAngles(line) {
    if (line.component!=='angle') return false;
    const product=productOf(line),angles=variantsFor(product,line.colorId,'angle');
    const targets=[...new Set(angles.map(variant=>variant.relatedCollectionSlug).filter(Boolean))];
    if (!angles.length || targets.length!==1 || angles.some(variant=>!variant.relatedCollectionSlug)) return false;
    const target=products.find(product=>product.slug===targets[0]);
    if (!target || !variantsFor(target,'','angle').length) return false;
    line.slug=target.slug;line.colorId='';line.variantId='';line.quantityUnit='';line.originSeries=product.name;
    line.reference=[line.reference,'Angles pour '+product.name+'. Coloris et compatibilité à confirmer.'].filter(Boolean).join(' ').slice(0,220);
    return true;
  }
  const options = (values, selected, placeholder) => `<option value="">${esc(placeholder)}</option>` + values.map(value => `<option value="${esc(value.id)}"${selected===value.id?' selected':''}>${esc(value.label || value.name || value.id)}</option>`).join('');
  const lineElement = line => container.querySelector(`[data-line="${line.key}"]`);
  function invalidatePreview() {
    prepared=null;
    $('#request-preview').hidden = true;
    $('#request-feedback').textContent = '';
    $('#open-request-email').href = 'mailto:'+RECIPIENT;
    $('#send-request').disabled=false;$('#send-request').textContent='Envoyer à Jérôme';
    $('#request-error').hidden = true;
  }
  function hydrate(s) {
    const values = {company:s?.societe || '',contact:s?.contact || s?.nomContact || '',lastname:s?.nom || '',firstname:s?.prenom || '',email:s?.email || '',phone:s?.telephone || s?.tel || '',postcode:s?.codePostal || s?.cp || '',city:s?.ville || ''};
    for (const [id,value] of Object.entries(values)) {
      const field = $('#'+id), previous = hydrated.get(id);
      if (touched.has(id) && field.value !== previous) continue;
      if (!field.value || field.value === previous) { field.value = String(value); hydrated.set(id,String(value)); }
    }
  }
  function updateMode({sessionChanged=false}={}) {
    const s = session(), locked = connected(s);
    if (locked || wasConnected) {
      $('input[name="profile"][value="professional"]',form).checked = locked;
      $('input[name="profile"][value="private"]',form).checked = !locked;
    }
    wasConnected = locked;
    $('#profile-choice').hidden = locked;
    form.querySelectorAll('input[name="profile"]').forEach(input => { input.disabled = locked; });
    $('#connected-professional').hidden = !locked;
    $('#connected-professional').textContent = locked ? 'Compte professionnel connecté' + (s?.codeClient ? ' · '+String(s.codeClient).toUpperCase() : ' · Administration') : '';
    const professional = profile() === 'professional';
    $('#company-label').hidden = !professional; $('#company').required = professional;
    $('#private-name-fields').hidden = professional; $('#lastname').required = !professional; $('#firstname').required = !professional;
    $('#professional-contact').hidden = !professional; $('#contact').required = professional;
    $('#mode-note').textContent = professional ? 'Préparez votre demande de commande. Les références et les conditions seront confirmées par Jérôme avant validation.' : 'Indiquez le secteur de votre projet. Jérôme vous recontactera pour vous orienter vers un magasin revendeur à proximité.';
    $('#prepare-request').textContent = professional ? 'Vérifier ma demande de commande' : 'Vérifier ma demande de revendeur';
    hydrate(s);
    if (sessionChanged) invalidatePreview();
    if (products.length) render();
  }
  function packagingText(line) {
    const variant = variantOf(line);
    if (!variant) return 'Choisissez l’élément et sa variante pour connaître son boîtage.';
    const known = typeof variant.packQuantity === 'number' && variant.packQuantity > 0;
    const basis = known ? `1 ${packLabel(variant)} = ${fr(variant.packQuantity)} ${variant.unit}` : 'Boîtage à confirmer avec le fabricant. Votre quantité sera transmise sans conversion estimée.';
    if (!String(line.qty).trim()) return basis;
    const result = calculateBoxes(variant,line.qty,line.quantityUnit);
    if (result.status === 'invalid') return result.message;
    if (result.status !== 'known') return basis;
    return `${result.boxes} ${packLabel(variant,result.boxes)} · ${fr(result.quantity)} ${result.unit}\n${basis}`;
  }
  function refreshPackaging(line) {
    const article = lineElement(line), output = article?.querySelector('[data-pack-result]');
    if (!output) return;
    output.textContent = packagingText(line);
    const variant = variantOf(line);
    output.classList.toggle('is-pending',!variant || !(typeof variant.packQuantity === 'number' && variant.packQuantity > 0));
  }
  function render() {
    const professional = profile() === 'professional';
    container.innerHTML = lines.map((line,index) => {
      const product = productOf(line), colors = product?.swatches || [], color = colorOf(line);
      const available = variantsFor(product,line.colorId), components = [...new Set(available.map(variant=>variant.component))];
      const variants = variantsFor(product,line.colorId,line.component), selected = variantOf(line);
      const hasBox = typeof selected?.packQuantity === 'number' && selected.packQuantity > 0;
      const units = selected?.unit ? [selected.unit,...(hasBox?['boîtes']:[])] : [];
      if (!units.includes(line.quantityUnit)) line.quantityUnit = selected?.unit || '';
      const photo = safeImage(color?.image || color?.original || (!colors.length && product?.coverImage));
      const details = selected ? [selected.dimensions && 'Format : '+(Array.isArray(selected.dimensions)?selected.dimensions.join(' · '):selected.dimensions),selected.thickness && 'Épaisseur : '+selected.thickness,selected.relatedCollectionSlug && 'Élément associé à la collection '+(products.find(p=>p.slug===selected.relatedCollectionSlug)?.name || selected.relatedCollectionSlug)].filter(Boolean).join('\n') : '';
      const notes = (Array.isArray(product?.technicalNotes)?product.technicalNotes:[product?.technicalNotes]).filter(Boolean).join(' · ');
      const angleVariants = available.filter(variant=>variant.component==='angle');
      return `<article class="product-line" data-line="${line.key}"><div class="line-head"><h3>Produit ${index+1}${product?' · '+esc(product.name):''}</h3>${lines.length>1?'<button class="remove-line" type="button" data-remove>Retirer</button>':''}</div><div class="line-grid">${line.originSeries?`<p class="variant-details wide">Angles prévus pour ${esc(line.originSeries)} : choisissez le coloris dans la collection ${esc(product.name)}.</p>`:''}<label class="wide" for="collection-${line.key}">Collection *<select id="collection-${line.key}" data-field="slug" required>${options(products.map(p=>({id:p.slug,label:p.name})),line.slug,'Choisir une collection')}</select></label><div class="color-selection wide"><label for="color-${line.key}">Coloris${professional&&colors.length?' *':''}<select id="color-${line.key}" data-field="colorId"${!product||!colors.length?' disabled':''}${professional&&colors.length?' required':''}>${options(colors,line.colorId,colors.length?'Choisir le coloris':product?.composition?'Composition définie ci-dessous':'À préciser avec Jérôme')}</select></label>${photo?`<a href="${esc(safeImage(color?.original) || photo)}" target="_blank" rel="noopener" aria-label="Agrandir ${esc(color?.name || product.name)}"><img class="color-photo" src="${esc(photo)}" alt="${esc(product.name+(color?' · '+color.name:''))}" loading="lazy"></a>`:''}</div><label for="component-${line.key}">Élément${professional?' *':''}<select id="component-${line.key}" data-field="component"${!product||!components.length?' disabled':''}${professional&&components.length?' required':''}>${options(components.map(id=>({id,label:componentLabel(id)})),line.component,'Choisir l’élément')}</select></label><label for="variant-${line.key}">Variante / épaisseur${professional?' *':''}<select id="variant-${line.key}" data-field="variantId"${!line.component||!variants.length?' disabled':''}${professional&&variants.length?' required':''}>${options(variants,line.variantId,'Choisir la variante')}</select></label>${details?`<p class="variant-details wide">${esc(details)}</p>`:''}<label class="wide" for="quantity-${line.key}">Quantité souhaitée${professional?' *':''}<span class="quantity-field"><input id="quantity-${line.key}" data-field="qty" type="text" inputmode="decimal" pattern="[0-9]+([,.][0-9]+)?" maxlength="14" value="${esc(line.qty)}"${professional?' required':''} aria-describedby="pack-result-${line.key}" placeholder="Ex. 24"><select data-field="quantityUnit" aria-label="Unité de la quantité du produit ${index+1}"${!units.length?' disabled':''}>${units.length?units.map(unit=>`<option value="${esc(unit)}"${unit===line.quantityUnit?' selected':''}>${esc(unit==='boîtes'?packLabel(selected,2):unit)}</option>`).join(''):'<option value="">À préciser</option>'}</select></span></label><output id="pack-result-${line.key}" class="packaging-result wide" data-pack-result aria-live="polite" aria-atomic="true"></output>${angleVariants.length && line.component!=='angle'?`<button class="angle-helper wide" type="button" data-add-angle>＋ Ajouter les angles de ce parement</button>`:''}${product?.composition?`<p class="composition-summary wide"><strong>Composition fabricant</strong><br>${esc(product.composition)}</p>`:''}${notes?`<details class="product-notes wide"><summary>Conseils de pose et compatibilités</summary><p>${esc(notes)}</p></details>`:''}<label class="wide" for="reference-${line.key}">Référence / précision, si connue<input id="reference-${line.key}" data-field="reference" maxlength="220" value="${esc(line.reference)}" placeholder="Détail de pose ou référence à confirmer"></label></div></article>`;
    }).join('');
    lines.forEach(refreshPackaging);
  }
  function addLine(initial={}) {
    if (lines.length >= 30) { $('#catalogue-status').textContent = 'Vous pouvez préparer jusqu’à 30 produits dans une demande.'; return; }
    lines.push({key:++sequence,slug:'',colorId:'',component:'',variantId:'',qty:'',quantityUnit:'',reference:'',...initial});
    render(); invalidatePreview();
  }
  const eventLine = event => lines.find(line=>line.key === Number(event.target.closest('[data-line]')?.dataset.line));
  container.addEventListener('input',event=>{
    const line = eventLine(event), field = event.target.dataset.field;
    if (!line || !['qty','reference'].includes(field)) return;
    line[field] = event.target.value; invalidatePreview(); refreshPackaging(line);
  });
  container.addEventListener('change',event=>{
    const line = eventLine(event), field = event.target.dataset.field;
    if (!line || event.target.tagName!=='SELECT' || !['slug','colorId','component','variantId','quantityUnit'].includes(field)) return;
    line[field] = event.target.value;
    if (field === 'slug') { line.colorId='';line.component='';line.variantId='';line.quantityUnit='';line.reference='';line.originSeries=''; }
    if (field === 'colorId' && !variantsFor(productOf(line),line.colorId,line.component).some(v=>v.id===line.variantId)) { line.variantId='';line.quantityUnit=''; }
    if (field === 'component') { line.variantId='';line.quantityUnit=''; }
    if (field === 'variantId') line.quantityUnit = variantOf(line)?.unit || '';
    const redirected=redirectLinkedAngles(line);
    invalidatePreview(); render();
    const next = redirected?'color':{slug:'color',colorId:'component',component:'variant',variantId:'quantity',quantityUnit:'quantity'}[field];
    $(`#${next}-${line.key}`,container)?.focus();
  });
  container.addEventListener('click',event=>{
    const line = eventLine(event);
    if (event.target.closest('[data-remove]') && line) {
      lines=lines.filter(item=>item.key!==line.key);render();invalidatePreview();$('#add-line').focus();
    } else if (event.target.closest('[data-add-angle]') && line) {
      const angles=variantsFor(productOf(line),line.colorId,'angle');
      if (!angles.length) return;
      const related=[...new Set(angles.map(variant=>variant.relatedCollectionSlug).filter(Boolean))];
      const target=related.length===1 ? products.find(product=>product.slug===related[0]) : null;
      // A compatible series does not prove that its colour matches the parent series.
      addLine({slug:target?.slug || line.slug,colorId:target?'':line.colorId,component:'angle',originSeries:target?productOf(line).name:'',reference:target?'Angles pour '+productOf(line).name+'. Coloris et compatibilité à confirmer.':''});
      $(`#${target?'color':'variant'}-${sequence}`,container)?.focus();
    }
  });
  $('#add-line').addEventListener('click',()=>{addLine();$(`#collection-${sequence}`,container)?.focus();});
  form.addEventListener('input',event=>{if(event.target.id)touched.add(event.target.id);if(!event.target.closest('#biopietra-request-lines'))invalidatePreview();});
  form.querySelectorAll('input[name="profile"]').forEach(input=>input.addEventListener('change',()=>{invalidatePreview();updateMode();}));
  window.addEventListener('lrf-pro-session-changed',()=>updateMode({sessionChanged:true}));
  window.addEventListener('storage',event=>{if(['lrfProSession','lrfProSessionToken','lrfProRememberToken'].includes(event.key))updateMode({sessionChanged:true});});
  function validateLines() {
    const professional = profile() === 'professional';
    for (const [i,line] of lines.entries()) {
      const p=productOf(line),v=variantOf(line);
      if (!p) return `Produit ${i+1} : choisissez une collection.`;
      if (professional && p.swatches?.length && !colorOf(line)) return `Produit ${i+1} : choisissez un coloris.`;
      if (professional && !v) return `Produit ${i+1} : choisissez l’élément et sa variante.`;
      if (professional && !String(line.qty).trim()) return `Produit ${i+1} : indiquez la quantité.`;
      if (String(line.qty).trim()) {
        if (!v) return `Produit ${i+1} : choisissez une variante pour préciser l’unité de la quantité.`;
        const conversion=calculateBoxes(v,line.qty,line.quantityUnit);
        if (conversion.status==='invalid') return `Produit ${i+1} : ${conversion.message}`;
      }
    }
    return '';
  }
  function messageText() {
    const professional=profile()==='professional',s=session();
    const rows=lines.map((line,index)=>{
      const p=productOf(line),v=variantOf(line),color=colorOf(line),conversion=v&&String(line.qty).trim()?calculateBoxes(v,line.qty,line.quantityUnit):null;
      return [`${index+1}. ${p.name}`,`Coloris : ${color?.name || (p.composition?'Composition fabricant':'À préciser avec Jérôme')}`,p.composition?'Composition : '+p.composition:'',`Élément : ${v?componentLabel(v.component):'À préciser'}`,`Variante : ${v?.label || 'À confirmer'}`,v?.dimensions?'Format : '+(Array.isArray(v.dimensions)?v.dimensions.join(' · '):v.dimensions):'',v?.thickness?'Épaisseur : '+v.thickness:'',`Quantité demandée : ${line.qty?line.qty+' '+line.quantityUnit:'À préciser'}`,conversion?.status==='known'?`Boîtage : ${conversion.boxes} ${packLabel(v,conversion.boxes)} = ${fr(conversion.quantity)} ${conversion.unit} (1 ${packLabel(v)} = ${fr(conversion.perBox)} ${conversion.unit})`:'Boîtage : à confirmer',line.reference?'Précision : '+line.reference:'',v?.relatedCollectionSlug?'Élément associé : '+(products.find(x=>x.slug===v.relatedCollectionSlug)?.name||v.relatedCollectionSlug):'',p.sourceUrl?'Fiche fabricant : '+p.sourceUrl:''].filter(Boolean).join('\n');
    }).join('\n\n');
    return ['Bonjour Jérôme,','',professional?'Je souhaite préparer la demande de commande Biopietra suivante.':'Je souhaite être conseillé sur mon projet Biopietra et être orienté vers un magasin revendeur.','',rows,'','COORDONNÉES',professional?'Société : '+$('#company').value.trim():'Nom : '+$('#lastname').value.trim(),professional?'Contact : '+$('#contact').value.trim():'Prénom : '+$('#firstname').value.trim(),`E-mail : ${$('#email').value.trim()}`,`Téléphone : ${$('#phone').value.trim()}`,`Secteur du projet : ${$('#postcode').value.trim()} ${$('#city').value.trim()}`,professional&&s?.codeClient?'Code client : '+String(s.codeClient):'',`Projet / questions : ${$('#message').value.trim() || '—'}`,'','Merci de confirmer les références, les compatibilités, les conditionnements, les tarifs, les délais et les conditions avant validation de commande.'].filter((row,index,array)=>row!=='' || array[index-1]!=='').join('\n');
  }
  function makePayload() {
    const professional=profile()==='professional';
    return {requestId:requestId(),profile:professional?'professional':'private',nom:professional?'':$('#lastname').value.trim(),prenom:professional?'':$('#firstname').value.trim(),contact:professional?$('#contact').value.trim():[$('#firstname').value.trim(),$('#lastname').value.trim()].filter(Boolean).join(' '),company:professional?$('#company').value.trim():'',email:$('#email').value.trim(),telephone:$('#phone').value.trim(),codePostal:$('#postcode').value.trim(),ville:$('#city').value.trim(),secteur:$('#city').value.trim(),message:$('#message').value.trim(),societe_web:$('#societe-web').value,items:lines.map(line=>({collectionSlug:line.slug,colorId:line.colorId,variantId:line.variantId,requestedQuantity:String(line.qty).trim()?Number(String(line.qty).trim().replace(',','.')):null,requestedUnit:line.quantityUnit,reference:line.reference}))};
  }
  form.addEventListener('submit',event=>{
    event.preventDefault();if(sending)return;$('#request-error').hidden=true;
    if (!form.reportValidity()) return;
    const error=validateLines();
    if(error){$('#request-error').textContent=error;$('#request-error').hidden=false;return;}
    const payload=prepared?.stamp===sessionStamp()?prepared.payload:makePayload();
    const sent=prepared?.payload.requestId===payload.requestId&&prepared.sent===true;
    prepared={payload,text:messageText(),stamp:sessionStamp(),sent};
    const subject=profile()==='professional'?'Demande de commande Biopietra':'Projet Biopietra — recherche de revendeur';
    $('#request-text').value=prepared.text;
    $('#open-request-email').href='mailto:'+RECIPIENT+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(prepared.text);
    $('#send-request').disabled=sent;$('#send-request').textContent=sent?'Demande envoyée':'Envoyer à Jérôme';
    $('#request-feedback').textContent=sent?'Votre demande a déjà été transmise à Jérôme. Modifiez votre projet pour préparer une nouvelle demande.':'Relisez votre demande, puis appuyez sur « Envoyer à Jérôme ».';
    $('#request-preview').hidden=false;$('#request-preview').focus();$('#request-preview').scrollIntoView({behavior:'smooth',block:'start'});
  });
  async function authorization() {
    const s=session();if(!connected(s))return {};
    if(!s.isAdmin&&!s.admin){
      let token;try{token=s.sessionToken||sessionStorage.getItem('lrfProSessionToken')||localStorage.getItem('lrfProRememberToken')||'';}catch{token='';}
      if(!/^[A-Za-z0-9_-]{43}$/.test(token))throw Error('Reconnectez-vous à l’espace PRO pour transmettre votre demande avec votre compte LRF.');
      return {sessionToken:token};
    }
    const [apps,auths]=await Promise.all([import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js')]);
    const existing=apps.getApps(),config={apiKey:'AIzaSyA3iuK5Ua8kFccURSqLihLshHnhA4rm2is',authDomain:'le-roy-factory.firebaseapp.com',projectId:'le-roy-factory'};
    const auth=auths.getAuth(existing.find(app=>app.options.projectId===config.projectId)||apps.initializeApp(config,existing.length?'biopietra-request':undefined));
    await auth.authStateReady();if(!auth.currentUser)throw Error('Reconnectez-vous à l’espace Agent avant de transmettre la demande.');
    return {authorization:'Bearer '+await auth.currentUser.getIdToken(true)};
  }
  $('#send-request').addEventListener('click',async()=>{
    if(!prepared||prepared.sent||sending)return;
    if(prepared.stamp!==sessionStamp()){updateMode({sessionChanged:true});return;}
    const snapshot=prepared,button=$('#send-request'),feedback=$('#request-feedback');
    sending=true;button.disabled=true;button.textContent='Envoi en cours…';$('#edit-request').disabled=true;form.inert=true;form.setAttribute('aria-busy','true');feedback.textContent='Transmission de votre demande à Jérôme…';
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),65000);
    try{
      const auth=await authorization();if(snapshot.stamp!==sessionStamp())throw Error('Votre session a changé. Vérifiez de nouveau votre demande.');
      const headers={'Content-Type':'application/json'},payload={...snapshot.payload};
      if(auth.authorization)headers.Authorization=auth.authorization;
      if(auth.sessionToken)payload.sessionToken=auth.sessionToken;
      const response=await fetch(ENDPOINT,{method:'POST',headers,body:JSON.stringify(payload),cache:'no-store',credentials:'omit',signal:controller.signal});
      const data=await response.json().catch(()=>({}));
      if(!response.ok||data.success!==true||data.delivered!==true||data.requestId!==payload.requestId)throw Error(data.error||'L’envoi n’a pas pu être confirmé. Réessayez avec ce même récapitulatif.');
      if(prepared===snapshot){prepared.sent=true;button.textContent='Demande envoyée';feedback.textContent=payload.profile==='private'?'Votre demande a bien été transmise à Jérôme. Nous vous recontacterons pour vous indiquer un magasin revendeur dans votre secteur.':'Votre demande a bien été transmise à Jérôme. Il vous recontactera pour confirmer les références et les conditions.';}
    }catch(error){button.disabled=false;button.textContent='Réessayer l’envoi';feedback.textContent=error.name==='AbortError'?'L’envoi n’a pas pu être confirmé. Votre récapitulatif est conservé : réessayez sans le modifier pour éviter un doublon.':error.message||'L’envoi n’a pas pu être confirmé. Votre récapitulatif est conservé.';}
    finally{clearTimeout(timeout);sending=false;$('#edit-request').disabled=false;form.inert=false;form.removeAttribute('aria-busy');}
  });
  $('#copy-request').addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText($('#request-text').value);$('#request-feedback').textContent='Récapitulatif copié. Vous pouvez le coller dans votre e-mail à Jérôme.';}
    catch{$('#request-text').focus();$('#request-text').select();$('#request-feedback').textContent='Sélectionnez et copiez le récapitulatif ci-dessus.';}
  });
  $('#edit-request').addEventListener('click',()=>{invalidatePreview();$('#prepare-request').focus();});
  async function load() {
    try {
      const response=await fetch('assets/data/biopietra-catalogue.json?v='+VERSION);
      if(!response.ok)throw Error('Catalogue indisponible');
      const data=await response.json();
      products=(Array.isArray(data)?data:data.collections||[]).slice().sort((a,b)=>a.name.localeCompare(b.name,'fr',{sensitivity:'base'}));
      if(!products.length)throw Error('Catalogue vide');
      $('#catalogue-status').textContent=products.length+' collections Biopietra · choix par ordre alphabétique';
      const slug=params.get('collection')||params.get('slug'),legacyName=params.get('product');
      const initialProduct=products.find(p=>p.slug===slug)||products.find(p=>legacyName&&norm(p.name)===norm(legacyName));
      const initial={slug:initialProduct?.slug||''};
      const initialColor=initialProduct?.swatches?.find(c=>c.id===params.get('color')||c.name===params.get('color'));
      if(initialColor)initial.colorId=initialColor.id;
      const initialVariant=variantsFor(initialProduct,initial.colorId).find(v=>v.id===params.get('variant'));
      if(initialVariant){initial.variantId=initialVariant.id;initial.component=initialVariant.component;initial.quantityUnit=initialVariant.unit;}
      const initialQuantity=params.get('quantity') || params.get('qty');
      if(initialVariant && initialQuantity){
        const requestedUnit=params.get('unit') || initialVariant.unit;
        if(calculateBoxes(initialVariant,initialQuantity,requestedUnit).status!=='invalid'){
          initial.qty=initialQuantity;initial.quantityUnit=requestedUnit;
        }
      }
      const reference=params.get('ref');if(reference)initial.reference=reference.slice(0,220);
      addLine(initial);if(redirectLinkedAngles(lines[0]))render();$('#add-line').disabled=false;$('#prepare-request').disabled=false;updateMode();
    } catch {
      $('#catalogue-status').textContent='Le catalogue n’a pas pu être chargé. ';const retry=document.createElement('button');retry.type='button';retry.className='button secondary';retry.textContent='Réessayer';retry.addEventListener('click',()=>{retry.disabled=true;load();});$('#catalogue-status').appendChild(retry);
    }
  }
  updateMode();load();
})();
