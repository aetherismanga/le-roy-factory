(() => {
  'use strict';
  const ENDPOINT = 'https://us-central1-le-roy-factory.cloudfunctions.net/feniceRequest';
  const VERSION = '20261101-fenice-request3';
  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const unique = values => [...new Set((values || []).map(value => typeof value === 'string' ? value : value?.name).filter(Boolean))];
  const number = value => Number(String(value ?? '').trim().replace(',', '.'));
  const fr = value => Number(value).toLocaleString('fr-FR', {maximumFractionDigits:4});
  const form = $('#fenice-request-form'), container = $('#fenice-request-lines');
  if (!form || !container) return;
  const params = new URLSearchParams(location.search), autoFilled = new Map(), touched = new Set();
  let products = [], packaging = {entries:[]}, packs, lines = [], sequence = 0, prepared, sending = false, wasConnected = false;
  const session = () => { try { return window.LRF_PRO_SESSION?.read?.() || window.LRF_PRO_CONTEXT || JSON.parse(sessionStorage.getItem('lrfProSession') || 'null'); } catch { return null; } };
  const connected = s => !!s && (/^LRF-\d{5}$/.test(String(s.codeClient || '').trim().toUpperCase()) || s.isAdmin === true || s.admin === true);
  const profile = () => connected(session()) ? 'professional' : $('input[name="profile"]:checked',form)?.value || 'private';
  const productOf = line => products.find(product => product.slug === line.slug);
  const pieceOnly = product => ['piece','pieces'].includes(norm(product?.unit));
  const pieceLine = line => pieceOnly(productOf(line));
  const lineKind = line => pieceLine(line) ? 'piece' : line.kind;
  const sessionStamp = () => JSON.stringify(session());
  const requestId = () => typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : 'fenice-' + Array.from(crypto.getRandomValues(new Uint8Array(20)),n=>n.toString(16).padStart(2,'0')).join('');
  function options(values, selected, placeholder) {
    return `<option value="">${esc(placeholder)}</option>${unique(values).map(value => `<option value="${esc(value)}"${value === selected ? ' selected' : ''}>${esc(value)}</option>`).join('')}`;
  }
  function invalidatePreview() {
    prepared = null;
    $('#request-preview').hidden = true;
    $('#request-feedback').textContent = '';
    $('#send-request').disabled = false; $('#send-request').textContent = 'Envoyer à Jérôme';
    $('#request-error').hidden = true;
  }
  function hydrate(s) {
    const values = {company:s?.societe || '',contact:s?.contact || s?.nomContact || '',lastname:s?.nom || '',firstname:s?.prenom || '',email:s?.email || '',phone:s?.telephone || s?.tel || '',postcode:s?.codePostal || s?.cp || '',city:s?.ville || ''};
    for (const [id,value] of Object.entries(values)) {
      const field = $('#'+id), previous = autoFilled.get(id);
      if (!field || touched.has(id) && field.value !== previous) continue;
      if (!field.value || field.value === previous) { field.value = String(value); autoFilled.set(id,String(value)); }
    }
  }
  function updateMode({sessionChanged = false} = {}) {
    const s = session(), locked = connected(s);
    if (locked) {
      $('input[name="profile"][value="professional"]',form).checked = true;
      $('input[name="profile"][value="private"]',form).checked = false;
    } else if (wasConnected) {
      $('input[name="profile"][value="private"]',form).checked = true;
      $('input[name="profile"][value="professional"]',form).checked = false;
    }
    wasConnected = locked;
    $('#profile-choice').hidden = locked;
    form.querySelectorAll('input[name="profile"]').forEach(input => { input.disabled = locked; });
    $('#connected-professional').hidden = !locked;
    $('#connected-professional').textContent = locked ? 'Compte professionnel connecté' + (/^LRF-\d{5}$/i.test(s?.codeClient || '') ? ' · '+String(s.codeClient).toUpperCase() : ' · Administration') : '';
    const professional = profile() === 'professional';
    $('#company-label').hidden = !professional; $('#company').required = professional;
    $('#private-name-fields').hidden = professional;
    $('#lastname').required = !professional; $('#firstname').required = !professional;
    $('#professional-contact').hidden = !professional; $('#contact').required = professional;
    $('#city').required = !professional;
    $('#city-required').hidden = professional;
    $('#mode-note').textContent = professional ? 'Préparez votre demande de commande. Jérôme confirmera les références, conditionnements et conditions avant validation.' : 'Indiquez le secteur de votre projet. Jérôme vous recontactera pour vous orienter vers un magasin revendeur à proximité.';
    $('#prepare-email').textContent = professional ? 'Vérifier ma demande de commande' : 'Vérifier ma demande de revendeur';
    hydrate(s);
    if (sessionChanged) invalidatePreview();
    if (products.length) render();
  }
  function formatsFor(line) {
    const product = productOf(line);
    if (!product) return [];
    if (pieceOnly(product)) return unique(product.formats);
    const known = packs?.formatsForKind(packaging,line.slug,line.kind) || [];
    if (line.kind === 'plinth') return unique(known);
    const plinths = new Set((packs?.formatsForKind(packaging,line.slug,'plinth') || []).map(norm));
    return unique([...known,...(product.formats || []).filter(format => !plinths.has(norm(format)))]);
  }
  function packState(line) {
    if (!packs || pieceLine(line)) return {status:'piece'};
    const query = {collectionSlug:line.slug,kind:line.kind,format:line.format,color:line.color,reference:line.reference};
    const choices = packs.packagingLookup(packaging,query);
    const result = line.packagingId ? packs.packagingLookup(packaging,{...query,packagingId:line.packagingId}) : choices;
    return {...result,choices:choices.status === 'ambiguous' ? choices.options || [] : [],conversion:result.status === 'known' && String(line.qty).trim() ? packs.convertQuantity(result.packaging,line.qty,line.unit) : null};
  }
  function packagingText(line) {
    if (pieceLine(line)) return line.qty ? `${fr(number(line.qty))} pièce${number(line.qty)>1?'s':''}` : 'Quantité à préciser.';
    const result = packState(line);
    if (!line.slug || !line.format) return 'Choisissez une collection et un format pour calculer les boîtes.';
    if (result.status === 'ambiguous') return 'Choisissez le conditionnement ou l’épaisseur pour calculer les boîtes.';
    if (result.status !== 'known') return 'Boîtage à confirmer avec le fabricant. Votre quantité sera transmise sans conversion estimée.';
    const p = result.packaging, perBox = line.kind === 'plinth' ? p.linearMetresPerBox : p.areaPerBox, unit = line.kind === 'plinth' ? 'ml' : 'm²';
    const basis = `1 boîte = ${fr(perBox)} ${unit} · ${p.piecesPerBox} pièces`;
    const c = result.conversion;
    if (!c) return basis;
    if (c.status !== 'known') return c.message || 'Vérifiez la quantité et son unité.';
    return `${c.boxes} boîte${c.boxes>1?'s':''} · ${fr(c.quantity)} ${c.unit} · ${c.pieces} pièces\n${basis}`;
  }
  function refreshPackaging(line) {
    const article = container.querySelector(`[data-line="${line.key}"]`);
    if (!article) return;
    const result = packState(line), choices = article.querySelector('[data-pack-choice]');
    choices.hidden = !result.choices?.length;
    choices.innerHTML = result.choices?.length ? `<label for="pack-${line.key}">Conditionnement / épaisseur<select id="pack-${line.key}" data-field="packagingId">${options(result.choices.map(row=>row.id),line.packagingId,'Choisir le conditionnement').replace(/>([^<>]+)<\/option>/g,(whole,text)=>{ const row=result.choices.find(item=>item.id===text); return row ? '>'+esc(row.label || [row.thicknessMm ? row.thicknessMm+' mm' : '',row.finish,fr(row.areaPerBox || row.linearMetresPerBox)+(line.kind==='plinth'?' ml':' m²')+' / boîte'].filter(Boolean).join(' · '))+'</option>' : whole; })}</select></label>` : '';
    const output = article.querySelector('[data-pack-result]');
    output.textContent = packagingText(line);
    output.classList.toggle('is-confirmed',result.conversion?.status === 'known');
    output.classList.toggle('is-pending',result.status === 'unknown' || result.status === 'ambiguous');
  }
  function render() {
    const professional = profile() === 'professional';
    container.innerHTML = lines.map((line,index) => {
      const product = productOf(line), onlyPieces = pieceOnly(product), formats = formatsFor(line), colors = unique(product?.colors);
      if (onlyPieces) { line.kind = 'piece'; line.unit = 'pièces'; }
      else if (line.kind === 'piece') { line.kind = 'tile'; line.unit = 'm²'; }
      const integral = line.unit === 'pièces' || line.unit === 'boîtes';
      const units = onlyPieces ? ['pièces'] : line.kind === 'plinth' ? ['ml','pièces','boîtes'] : ['m²','pièces','boîtes'];
      const formatControl = !formats.length && product && !onlyPieces ? `<input id="format-${line.key}" data-field="format" value="${esc(line.format)}" maxlength="50" placeholder="Ex. 7,5x60"${professional?' required':''}>` : `<select id="format-${line.key}" data-field="format"${!product || !formats.length?' disabled':''}${professional && formats.length && !onlyPieces?' required':''}>${options(formats,line.format,formats.length?'Choisir le format':'À confirmer avec l’agence')}</select>`;
      return `<article class="product-line" data-line="${line.key}"><div class="line-head"><h3>Produit ${index+1}</h3>${lines.length>1?'<button type="button" class="remove-line" data-remove>Retirer ce produit</button>':''}</div><div class="line-grid"><label class="wide" for="collection-${line.key}">Collection <span aria-hidden="true">*</span><select id="collection-${line.key}" data-field="slug" required><option value="">Choisir une collection</option>${products.map(p=>`<option value="${esc(p.slug)}"${line.slug===p.slug?' selected':''}>${esc(p.name)}</option>`).join('')}</select></label>${onlyPieces?'<p class="line-type wide">Mobilier / vasque · quantité en pièces</p>':`<label class="wide" for="kind-${line.key}">Produit souhaité<select id="kind-${line.key}" data-field="kind"><option value="tile"${line.kind==='tile'?' selected':''}>Carrelage</option><option value="plinth"${line.kind==='plinth'?' selected':''}>Plinthes</option></select></label>`}<label for="format-${line.key}">Format${professional&&!onlyPieces?' *':''}${formatControl}</label><label for="color-${line.key}">Coloris<select id="color-${line.key}" data-field="color"${!product||!colors.length?' disabled':''}>${options(colors,line.color,'À préciser / à confirmer')}</select></label><label class="wide" for="quantity-${line.key}">Quantité souhaitée${professional?' *':''}<span class="quantity-field"><input id="quantity-${line.key}" data-field="qty" type="text" inputmode="${integral?'numeric':'decimal'}" pattern="${integral?'[0-9]+':'[0-9]+([,.][0-9]+)?'}" maxlength="14" value="${esc(line.qty)}"${professional?' required':''} aria-describedby="pack-result-${line.key}"><select data-field="unit" aria-label="Unité de la quantité du produit ${index+1}">${units.map(unit=>`<option value="${esc(unit)}"${line.unit===unit?' selected':''}>${esc(unit)}</option>`).join('')}</select></span></label><div class="packaging-choice wide" data-pack-choice hidden></div><output id="pack-result-${line.key}" class="packaging-result wide" data-pack-result aria-live="polite" aria-atomic="true"></output><label class="wide" for="finish-${line.key}">Finition / référence, si connue<input id="finish-${line.key}" data-field="reference" value="${esc(line.reference)}" maxlength="220" placeholder="À confirmer si vous ne la connaissez pas"></label></div></article>`;
    }).join('');
    lines.forEach(refreshPackaging);
  }
  function addLine(initial = {}) {
    if (lines.length >= 30) { $('#catalogue-status').textContent = 'Vous pouvez préparer jusqu’à 30 produits dans une demande.'; return; }
    lines.push({key:++sequence,slug:'',kind:'tile',format:'',color:'',qty:'',unit:'m²',reference:'',packagingId:'',...initial});
    render(); invalidatePreview();
  }
  const eventLine = event => lines.find(line=>line.key === Number(event.target.closest('[data-line]')?.dataset.line));
  container.addEventListener('input',event=>{
    const field = event.target.dataset.field, line = eventLine(event);
    if (!line || !['qty','reference','format'].includes(field) || event.target.tagName === 'SELECT') return;
    line[field] = event.target.value;
    if (field !== 'qty') line.packagingId = '';
    invalidatePreview(); refreshPackaging(line);
  });
  container.addEventListener('change',event=>{
    const field = event.target.dataset.field, line = eventLine(event);
    if (!line || !field || event.target.tagName !== 'SELECT') return;
    line[field] = event.target.value; invalidatePreview();
    if (field === 'slug') {
      line.format = ''; line.color = ''; line.reference = ''; line.packagingId = '';
      line.kind = pieceOnly(productOf(line)) ? 'piece' : 'tile'; line.unit = line.kind === 'piece' ? 'pièces' : 'm²';
      render(); $(`#format-${line.key}`,container)?.focus();
    } else if (field === 'kind') {
      line.format = ''; line.packagingId = ''; line.unit = line.kind === 'plinth' ? 'ml' : 'm²';
      render(); $(`#format-${line.key}`,container)?.focus();
    } else if (field === 'unit') { render(); $(`#quantity-${line.key}`,container)?.focus(); }
    else { if (field !== 'packagingId') line.packagingId = ''; refreshPackaging(line); }
  });
  container.addEventListener('click',event=>{
    if (!event.target.closest('[data-remove]')) return;
    const key = Number(event.target.closest('[data-line]')?.dataset.line);
    lines = lines.filter(line=>line.key!==key); render(); invalidatePreview(); $('#add-line').focus();
  });
  $('#add-line').addEventListener('click',()=>{ addLine(); $(`#collection-${sequence}`)?.focus(); });
  form.addEventListener('input',event=>{
    if (event.target.id) touched.add(event.target.id);
    if (!event.target.closest('#fenice-request-lines')) invalidatePreview();
  });
  form.querySelectorAll('input[name="profile"]').forEach(input=>input.addEventListener('change',()=>{ invalidatePreview(); updateMode(); }));
  window.addEventListener('lrf-pro-session-changed',()=>updateMode({sessionChanged:true}));
  window.addEventListener('storage',event=>{ if (['lrfProSession','lrfProSessionToken','lrfProRememberToken'].includes(event.key)) updateMode({sessionChanged:true}); });
  function itemPayload(line) {
    const product = productOf(line), result = packState(line), conversion = result.conversion;
    return {collectionSlug:line.slug,name:product.name,kind:lineKind(line),format:line.format,color:line.color,reference:line.reference,packagingId:line.packagingId || result.packaging?.id || '',requestedQuantity:String(line.qty).trim()?number(line.qty):null,requestedUnit:line.unit,packaging:conversion?.status === 'known'?{status:'known',boxes:conversion.boxes,pieces:conversion.pieces,quantity:conversion.quantity,unit:conversion.unit}:{status:pieceLine(line)?'piece':result.status}};
  }
  function makePayload() {
    const professional = profile() === 'professional', contact = professional ? $('#contact').value.trim() : [$('#firstname').value.trim(),$('#lastname').value.trim()].filter(Boolean).join(' ');
    return {requestId:requestId(),profile:professional?'professional':'private',nom:$('#lastname').value.trim(),prenom:$('#firstname').value.trim(),contact,email:$('#email').value.trim(),telephone:$('#phone').value.trim(),codePostal:$('#postcode').value.trim(),ville:$('#city').value.trim(),secteur:$('#city').value.trim(),company:professional?$('#company').value.trim():'',message:$('#message').value.trim(),societe_web:$('#societe-web').value,items:lines.map(itemPayload)};
  }
  function requestText(payload) {
    const blocks = payload.items.map((item,index)=>{
      const conversion = item.packaging.status === 'known' ? `Conditionnement : ${item.packaging.boxes} boîte${item.packaging.boxes>1?'s':''} = ${fr(item.packaging.quantity)} ${item.packaging.unit} · ${item.packaging.pieces} pièces` : item.kind === 'piece' ? '' : 'Conditionnement : à confirmer avec le fabricant';
      return [`PRODUIT ${index+1} — ${item.name} · ${item.kind==='plinth'?'Plinthes':item.kind==='piece'?'Mobilier / vasque':'Carrelage'}`,`Format : ${item.format || 'à confirmer'}`,`Coloris : ${item.color || 'à confirmer'}`,`Besoin : ${item.requestedQuantity===null?'à préciser':fr(item.requestedQuantity)+' '+item.requestedUnit}`,conversion,`Finition / référence : ${item.reference || 'à confirmer'}`].filter(Boolean).join('\n');
    });
    return [payload.profile==='professional'?'DEMANDE DE COMMANDE LA FENICE':'RECHERCHE DE MAGASIN REVENDEUR LA FENICE','',...blocks.flatMap(block=>[block,'']),'COORDONNÉES',`Contact : ${payload.contact}`,payload.company?`Société : ${payload.company}`:'',`E-mail : ${payload.email}`,`Téléphone : ${payload.telephone}`,`Projet : ${payload.codePostal} ${payload.ville}`.trim(),'',payload.message || '', '', 'Demande à confirmer par LE ROY FACTORY avant validation.'].filter(value=>value!==undefined).join('\n');
  }
  form.addEventListener('submit',event=>{
    event.preventDefault(); if (sending) return;
    const error = $('#request-error'); error.hidden = true;
    if (!form.reportValidity()) return;
    if (!lines.length || lines.some(line=>!productOf(line))) { error.textContent = 'Choisissez une collection pour chaque produit.'; error.hidden = false; return; }
    if (lines.some(line=>String(line.qty).trim() && (!/^\d+(?:[.,]\d+)?$/.test(String(line.qty).trim()) || !Number.isFinite(number(line.qty)) || number(line.qty)<=0 || number(line.qty)>100000 || ['pièces','boîtes'].includes(line.unit)&&!Number.isSafeInteger(number(line.qty))))) { error.textContent = 'Vérifiez les quantités. Le nombre de pièces ou de boîtes doit être entier.'; error.hidden = false; return; }
    const payload = prepared?.stamp === sessionStamp() ? prepared.payload : makePayload();
    const alreadySent = prepared?.payload.requestId === payload.requestId && prepared.sent === true;
    prepared = {payload,text:requestText(payload),stamp:sessionStamp(),sent:alreadySent};
    $('#request-text').value = prepared.text;
    $('#send-request').disabled = alreadySent; $('#send-request').textContent = alreadySent ? 'Demande envoyée' : 'Envoyer à Jérôme';
    $('#request-feedback').textContent = alreadySent ? 'Votre demande a déjà été transmise à Jérôme. Modifiez votre projet pour préparer une nouvelle demande.' : 'Relisez votre demande, puis appuyez sur « Envoyer à Jérôme ».';
    $('#request-preview').hidden = false; $('#request-preview').focus({preventScroll:true}); $('#request-preview').scrollIntoView({behavior:'smooth',block:'start'});
  });
  async function authorization() {
    const s = session(); if (!connected(s)) return {};
    if (!s.isAdmin && !s.admin) {
      let token; try { token = s.sessionToken || sessionStorage.getItem('lrfProSessionToken') || localStorage.getItem('lrfProRememberToken') || ''; } catch { token = ''; }
      if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw Error('Reconnectez-vous à l’espace PRO pour transmettre votre demande avec votre compte LRF.');
      return {sessionToken:token};
    }
    const [apps,auths] = await Promise.all([import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js')]);
    const existing = apps.getApps(), config = {apiKey:'AIzaSyA3iuK5Ua8kFccURSqLihLshHnhA4rm2is',authDomain:'le-roy-factory.firebaseapp.com',projectId:'le-roy-factory'};
    const auth = auths.getAuth(existing.find(app=>app.options.projectId===config.projectId) || apps.initializeApp(config,existing.length?'fenice-request':undefined));
    await auth.authStateReady();
    if (!auth.currentUser) throw Error('Reconnectez-vous à l’espace Agent avant de transmettre la demande.');
    return {authorization:'Bearer '+await auth.currentUser.getIdToken(true)};
  }
  $('#send-request').addEventListener('click',async()=>{
    if (!prepared || prepared.sent || sending) return;
    if (prepared.stamp !== sessionStamp()) { updateMode({sessionChanged:true}); return; }
    const snapshot = prepared, button = $('#send-request'), feedback = $('#request-feedback');
    sending = true; button.disabled = true; button.textContent = 'Envoi en cours…'; form.inert = true; form.setAttribute('aria-busy','true');
    feedback.textContent = 'Transmission de votre demande à Jérôme…';
    const controller = new AbortController(), timeout = setTimeout(()=>controller.abort(),65000);
    try {
      const auth = await authorization();
      if (snapshot.stamp !== sessionStamp()) throw Error('Votre session a changé. Vérifiez de nouveau votre demande.');
      const headers = {'Content-Type':'application/json'}, payload = {...snapshot.payload};
      if (auth.authorization) headers.Authorization = auth.authorization;
      if (auth.sessionToken) payload.sessionToken = auth.sessionToken;
      const response = await fetch(ENDPOINT,{method:'POST',headers,body:JSON.stringify(payload),cache:'no-store',credentials:'omit',signal:controller.signal});
      const data = await response.json().catch(()=>({}));
      if (!response.ok || data.success !== true || data.delivered !== true || data.requestId !== payload.requestId) throw Error(data.error || 'L’envoi n’a pas pu être confirmé. Réessayez avec ce même récapitulatif.');
      if (prepared === snapshot) {
        prepared.sent = true;
        button.textContent = 'Demande envoyée';
        feedback.textContent = payload.profile==='private' ? 'Votre demande a bien été transmise à Jérôme. Nous vous recontacterons pour vous indiquer un magasin revendeur dans votre secteur.' : 'Votre demande a bien été transmise à Jérôme. Il vous recontactera pour confirmer les références et les conditions.';
      }
    } catch (error) {
      button.disabled = false; button.textContent = 'Réessayer l’envoi';
      feedback.textContent = error.name==='AbortError' ? 'L’envoi n’a pas pu être confirmé. Votre récapitulatif est conservé : réessayez sans le modifier pour éviter un doublon.' : error.message || 'L’envoi n’a pas pu être confirmé. Votre récapitulatif est conservé.';
    } finally { clearTimeout(timeout); sending = false; form.inert = false; form.removeAttribute('aria-busy'); }
  });
  $('#copy-request').addEventListener('click',async()=>{
    if (!prepared) return;
    const text = 'À : jerome@leroyfactory.fr\n\n'+prepared.text;
    try { await navigator.clipboard.writeText(text); $('#request-feedback').textContent = 'Récapitulatif copié.'; }
    catch { $('#request-text').focus(); $('#request-text').select(); $('#request-feedback').textContent = 'Copiez le texte sélectionné pour conserver votre récapitulatif.'; }
  });
  $('#download-request').addEventListener('click',()=>{
    if (!prepared) return;
    const url = URL.createObjectURL(new Blob(['À : jerome@leroyfactory.fr\n\n'+prepared.text],{type:'text/plain;charset=utf-8'}));
    const anchor = document.createElement('a'); anchor.href=url; anchor.download='demande-la-fenice.txt'; anchor.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  async function init() {
    updateMode();
    try {
      const [catalogue,packData,module] = await Promise.all([
        fetch('assets/data/fenice-catalogue.json?v=20261101-fenice-request3').then(r=>{if(!r.ok)throw Error();return r.json();}),
        fetch('assets/data/fenice-packaging.json?v='+VERSION).then(r=>{if(!r.ok)throw Error();return r.json();}).catch(()=>({entries:[]})),
        import('./fenice-packaging.mjs?v=20261101-fenice-request3')
      ]);
      packs = module; packaging = packData;
      products = (catalogue.collections || []).map(product=>({...product,slug:product.slug || String(product.id || '').replace(/^fenice-/, '')})).filter(product=>product.slug&&product.name).sort((a,b)=>a.name.localeCompare(b.name,'fr',{sensitivity:'base'}));
      if (!products.length) throw Error();
      const wanted = params.get('collection') || '', product = products.find(p=>p.slug===wanted||p.id===wanted||norm(p.name)===norm(wanted));
      const kind = params.get('kind')==='plinth'?'plinth':'tile', initial={slug:product?.slug || '',kind,unit:pieceOnly(product)?'pièces':kind==='plinth'?'ml':'m²'};
      const allowedFormats = formatsFor(initial), format = params.get('format') || '';
      if (allowedFormats.includes(format)) initial.format = format;
      addLine(initial);
      $('#catalogue-status').textContent = `${products.length} collections La Fenice · choisissez vos carreaux ou vos plinthes`;
      $('#add-line').disabled = false; $('#prepare-email').disabled = false; updateMode();
    } catch {
      $('#catalogue-status').textContent = 'Les collections ne peuvent pas être chargées. Contactez Jérôme à jerome@leroyfactory.fr ou rechargez cette page.';
    }
  }
  init();
})();
