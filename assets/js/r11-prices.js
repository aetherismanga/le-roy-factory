/* R11 catalogue: only live server-authorized purchase rates, held in memory.
 * Requires pro-session-bridge.js before this script.
 * API: await R11Prices.login(code, department[, {remember:false}]);
 * await R11Prices.restore(); R11Prices.getSession(); await R11Prices.logout();
 * await R11Prices.getPrice(product, collection) -> {amount,label,unit},
 * {locked:true,message}, or {unavailable:true,label:'Sur demande'}.
 * VIEW: collection.productId/id + product.variantKey (or product.priceKey).
 * ELIOS: product.sku/reference, or collection.slug + format/thickness with
 * explicit R11 metadata in the authorized quote. No interior-rate fallback.
 * FENICE: exact collection + format + explicit R11/Grip authorized tariff row.
 * Event: window 'r11-prices-changed'; clear every visible price on this event.
 */
(() => {
  'use strict';
  if (window.R11Prices) return;
  const AUTH_BASE = 'https://us-central1-le-roy-factory.cloudfunctions.net/';
  const ENDPOINT = 'https://randal-catalogue-general-3d.vercel.app/api/agent-tariffs';
  const ADMINS = new Set(['jerome@leroyfactory.fr', 'coryne@leroyfactory.fr']);
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const brand = value => ({elios:'elios-ceramica',eliosceramica:'elios-ceramica',view:'view-ceramica',viewceramica:'view-ceramica',viu:'view-ceramica',lafenice:'la-fenice',fenice:'la-fenice'})[norm(value)] || '';
  const isR11 = value => /\bR\s*11\b|\bgrip\b/i.test(String(value || ''));
  const formatKey = value => {
    const m = String(value || '').replaceAll(',', '.').replace(/[×*]/g, 'x').match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
    return m ? [Number(m[1]),Number(m[2])].sort((a,b) => a-b).join('x') : '';
  };
  const validAmount = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 1000000;
  const money = value => new Intl.NumberFormat('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value);
  const unavailable = () => ({unavailable:true,label:'Sur demande'});
  let currentSession = null, auth = null, authPromise = null, epoch = 0, explicitlyLoggedOut = false;
  const caches = new Map(), pending = new Map(), controllers = new Set();
  const emit = () => window.dispatchEvent(new CustomEvent('r11-prices-changed'));
  const storedSession = () => { try { return window.LRF_PRO_SESSION?.read?.() || null; } catch { return null; } };
  const tokenFor = s => {
    if (!s || s.isAdmin || s.admin) return '';
    try {
      const token = String(s.sessionToken || sessionStorage.getItem('lrfProSessionToken') || localStorage.getItem('lrfProRememberToken') || '');
      return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : '';
    } catch { return ''; }
  };
  function invalidate() {
    ++epoch;
    for (const entry of caches.values()) clearTimeout(entry.timer);
    caches.clear(); pending.clear();
    for (const controller of controllers) controller.abort();
    controllers.clear(); emit();
  }
  async function request(url, body, headers = {}) {
    const controller = new AbortController(); controllers.add(controller);
    const timeout = setTimeout(() => controller.abort(),20000);
    try {
      const response = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...headers},credentials:'omit',cache:'no-store',body:JSON.stringify(body),signal:controller.signal});
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(response.status === 401 || response.status === 403 ? 'Votre compte n’a pas accès à ce tarif. Reconnectez-vous à l’espace PRO.' : 'Le service est momentanément indisponible. Réessayez.');
        error.status = response.status; throw error;
      }
      return data;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('La vérification a pris trop de temps. Réessayez.');
      throw error;
    } finally { clearTimeout(timeout); controllers.delete(controller); }
  }
  async function ensureAuth() {
    if (!authPromise) authPromise = (async () => {
      const [apps,auths] = await Promise.all([import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js')]);
      const config = {apiKey:'AIzaSyA3iuK5Ua8kFccURSqLihLshHnhA4rm2is',authDomain:'le-roy-factory.firebaseapp.com',projectId:'le-roy-factory'};
      const list = apps.getApps(), app = list.find(a => a.options.projectId === config.projectId) || apps.initializeApp(config,list.length ? 'r11-tariff' : undefined);
      auth = auths.getAuth(app); await auth.authStateReady?.();
      auths.onIdTokenChanged(auth,() => { invalidate(); });
      return auth;
    })().catch(error => { authPromise = null; throw error; });
    return authPromise;
  }
  function identity() {
    if (explicitlyLoggedOut) return {key:''};
    const user = auth?.currentUser;
    if (user && ADMINS.has(String(user.email || '').trim().toLowerCase())) return {key:'agent:' + user.uid,user};
    const token = tokenFor(currentSession || storedSession());
    return token ? {key:'client:' + token,token} : {key:''};
  }
  async function identityReady() {
    // A session's local admin flag never authorizes a request.
    if (!tokenFor(currentSession || storedSession())) await ensureAuth().catch(() => null);
    return identity();
  }
  function saveClient(client,token) {
    const session = {...client,clientId:client.id,sessionToken:token,verifiedAt:Date.now(),isAdmin:false,admin:false};
    currentSession = window.LRF_PRO_SESSION?.write?.(session) || session;
    return currentSession;
  }
  async function login(code,department,{remember = false} = {}) {
    let codeClient = String(code || '').trim().toUpperCase().replace(/\s/g,'');
    if (/^\d{1,5}$/.test(codeClient)) codeClient = 'LRF-' + codeClient.padStart(5,'0');
    const departement = String(department || '').trim().toUpperCase();
    if (!/^LRF-\d{5}$/.test(codeClient) || !/^(?:\d{2,3}|2A|2B)$/.test(departement)) throw new Error('Vérifiez votre code LRF et votre département.');
    invalidate(); const stamp = epoch;
    const data = await request(AUTH_BASE + 'createProSession',{codeClient,departement});
    if (stamp !== epoch) throw new Error('Votre session a changé. Recommencez la connexion.');
    if (data.success !== true || !data.client || !Array.isArray(data.client.partenaires) || !/^[A-Za-z0-9_-]{43}$/.test(data.sessionToken || '') || !Number.isFinite(data.expiresAt) || data.expiresAt <= Date.now()) throw new Error('La session professionnelle n’a pas pu être vérifiée.');
    explicitlyLoggedOut = false;
    try {
      sessionStorage.removeItem('lrfProSessionToken'); localStorage.removeItem('lrfProRememberToken');
      (remember ? localStorage : sessionStorage).setItem(remember ? 'lrfProRememberToken' : 'lrfProSessionToken',data.sessionToken);
    } catch { /* The verified tab session can still work without device storage. */ }
    const session = saveClient(data.client,data.sessionToken); emit(); return session;
  }
  async function restore() {
    if (explicitlyLoggedOut) return null;
    const initial = currentSession || storedSession(), token = tokenFor(initial), stamp = epoch;
    if (token) {
      try {
        const data = await request(AUTH_BASE + 'validateProSession',{sessionToken:token});
        if (stamp !== epoch || explicitlyLoggedOut) return null;
        if (data.success !== true || !data.client || !Number.isFinite(data.expiresAt) || data.expiresAt <= Date.now()) throw new Error('Session expirée.');
        return saveClient(data.client,token);
      } catch (error) {
        if (error.status === 401 || error.status === 403 || error.status === 404) { currentSession = null; window.LRF_PRO_SESSION?.clear?.({forgetDevice:true}); }
        throw error;
      }
    }
    await ensureAuth().catch(() => null);
    const who = identity();
    if (who.user) { currentSession = {isAdmin:true,email:who.user.email,societe:who.user.displayName || who.user.email}; emit(); }
    return currentSession;
  }
  async function logout() {
    const token = tokenFor(currentSession || storedSession());
    explicitlyLoggedOut = true; currentSession = null; invalidate();
    window.LRF_PRO_SESSION?.clear?.({forgetDevice:true});
    if (token) await request(AUTH_BASE + 'revokeProSession',{sessionToken:token}).catch(() => null);
  }
  async function load(action) {
    const who = await identityReady();
    if (!who.key) return null;
    const old = caches.get(action);
    if (old && old.principal === who.key && old.expiresAt > Date.now()) return old.data;
    const key = action + '|' + who.key;
    if (pending.has(key)) return pending.get(key);
    const stamp = epoch;
    const job = (async () => {
      const body = {action},headers = {};
      if (who.user) headers.Authorization = 'Bearer ' + await who.user.getIdToken(true);
      else body.sessionToken = who.token;
      const data = await request(ENDPOINT,body,headers);
      if (stamp !== epoch || identity().key !== who.key) throw new Error('Votre session a changé. Cliquez à nouveau sur l’œil.');
      if (data.success !== true || data.version !== 1 || !Array.isArray(data.allowedPartners) || !Number.isFinite(data.expiresAt) || data.expiresAt <= Date.now()) throw new Error('Les tarifs n’ont pas pu être vérifiés.');
      if (action === 'bootstrap' && (!Array.isArray(data.view) || !data.elios || typeof data.elios !== 'object' || Array.isArray(data.elios))) throw new Error('Réponse tarifaire invalide.');
      if (action === 'fenice' && !Array.isArray(data.fenice)) throw new Error('Réponse tarifaire invalide.');
      const expiresAt = Math.min(data.expiresAt,Date.now()+60000);
      clearTimeout(caches.get(action)?.timer);
      const timer = setTimeout(() => { caches.delete(action); emit(); },Math.max(1,expiresAt-Date.now()));
      caches.set(action,{data,expiresAt,principal:who.key,timer});
      return data;
    })();
    pending.set(key,job);
    try { return await job; } finally { if (pending.get(key) === job) pending.delete(key); }
  }
  function viewQuote(data,product,collection) {
    const productId = collection.productId || collection.id, variantKey = product.variantKey || product.priceKey;
    if (!productId || !variantKey) return unavailable();
    const matches = data.view.filter(row => row.productId === productId && row.variantKey === variantKey);
    if (matches.length !== 1) return unavailable();
    const row = matches[0], amounts = [];
    if (validAmount(row.proPrice)) return {amount:row.proPrice,unit:'m²',label:money(row.proPrice)+' € net HT/m²'};
    if (validAmount(row.proDetail)) amounts.push({amount:row.proDetail,label:'Détail : '+money(row.proDetail)+' € net HT/m²'});
    if (validAmount(row.proPalette)) amounts.push({amount:row.proPalette,label:'Palette : '+money(row.proPalette)+' € net HT/m²'});
    return amounts.length ? {amount:amounts[0].amount,unit:'m²',label:amounts.map(x => x.label).join(' · ')} : unavailable();
  }
  function eliosQuote(data,product,collection) {
    const sku = String(product.sku || product.reference || product.ref || '');
    if (sku && Object.hasOwn(data.eliosExact || {},sku) && validAmount(data.eliosExact[sku])) {
      const amount = data.eliosExact[sku]; return {amount,unit:'m²',label:money(amount)+' € net HT/m²'};
    }
    const dim = formatKey(product.format), slug = collection.slug || String(collection.id || '').replace(/^elios-/, '');
    const thickness = /20\s*mm/i.test(product.thickness || '') ? '20' : 'standard';
    const value = data.elios[product.priceKey || norm(slug)+'|'+dim+'|'+thickness];
    if (!value || typeof value !== 'object') return unavailable();
    // A generic standard quote is never reused for a Grip/R11 product.
    const options = Array.isArray(value.variants) ? value.variants : [];
    const rows = options.filter(row => isR11([row.finish,row.finition,row.label,row.note,row.detail].filter(Boolean).join(' ')) && validAmount(row.amount));
    if (!rows.length && isR11([value.finish,value.finition,value.label,value.note,value.detail].filter(Boolean).join(' ')) && validAmount(value.amount)) rows.push(value);
    const amounts = [...new Set(rows.map(row => row.amount))];
    if (amounts.length !== 1) return unavailable();
    return {amount:amounts[0],unit:'m²',label:money(amounts[0])+' € net HT/m²'};
  }
  function feniceQuote(data,product,collection) {
    const dim = formatKey(product.format), aliases = [collection.name,collection.slug,String(collection.id || '').replace(/^la-fenice-/, '').replace(/^fenice-/, '')].map(norm).filter(Boolean);
    if (!dim || !aliases.length) return unavailable();
    const requested20 = /20\s*mm/i.test(product.thickness || '');
    const rows = data.fenice.filter(row => {
      if (!validAmount(row.amount) || formatKey(row.format) !== dim) return false;
      const text = [row.description,row.detail].filter(Boolean).join(' ');
      if (!isR11(text)) return false;
      if (requested20 && !/20\s*mm|2\s*cm/i.test(text)) return false;
      if (!requested20 && /20\s*mm|2\s*cm/i.test(text)) return false;
      if (row.collection) return aliases.includes(norm(row.collection));
      // Without an explicit collection field a multi-collection description is
      // ambiguous: retain only a description beginning with the exact name.
      const description = norm(String(row.description || '').split(/[-;:]/)[0]);
      return aliases.includes(description);
    });
    const general = rows.filter(row => !row.condition || /toutes\s+quantit/i.test(row.condition));
    if (!general.length) return unavailable();
    const amounts = [...new Set(general.map(row => row.amount))], units = [...new Set(general.map(row => row.unit))];
    if (amounts.length !== 1 || units.length !== 1) return unavailable();
    return {amount:amounts[0],unit:units[0],label:money(amounts[0])+' € net HT/'+units[0]};
  }
  async function getPrice(product = {},collection = {}) {
    const partner = brand(collection.brand || collection.manufacturer || product.brand);
    if (!partner || !isR11(product.finish)) return unavailable();
    let data;
    try { data = await load(partner === 'la-fenice' ? 'fenice' : 'bootstrap'); }
    catch (error) {
      if (error.status === 401 || error.status === 403) return {locked:true,message:error.message};
      throw error;
    }
    if (!data) return {locked:true,message:'Connectez-vous avec votre code LRF pour consulter vos tarifs.'};
    if (!data.allowedPartners.includes(partner)) return {locked:true,message:'Ce partenaire n’est pas autorisé pour votre compte.'};
    return partner === 'view-ceramica' ? viewQuote(data,product,collection) : partner === 'elios-ceramica' ? eliosQuote(data,product,collection) : feniceQuote(data,product,collection);
  }
  window.R11Prices = Object.freeze({login,restore,logout,getPrice,getSession:() => currentSession});
  window.addEventListener('lrf-pro-session-changed',() => { currentSession = null; invalidate(); });
  window.addEventListener('storage',event => { if (['lrfProSession','lrfProSessionToken','lrfProRememberToken'].includes(event.key)) { currentSession = null; invalidate(); } });
  window.addEventListener('pageshow',() => {
    for (const [key,entry] of caches) if (entry.expiresAt <= Date.now() || entry.principal !== identity().key) { clearTimeout(entry.timer); caches.delete(key); emit(); }
  });
})();
