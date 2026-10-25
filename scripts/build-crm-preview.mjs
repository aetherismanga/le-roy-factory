/** Build ONLY the CRM test surface. Never publish the repository root as this preview. */
import {readFile,writeFile,mkdir,rm,readdir,copyFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const sourceRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const previewPages=['dashboard.html','clients.html','agenda.html','tournees.html','comptes-rendus.html','mails-groupes.html','carte.html','statistiques.html','demandes-clients.html','nouveau-compte-rendu.html','contacts-partenaires.html','analyse-clients-lrf.html','analyse-ventes-clients.html','documents-clients.html','parametres.html','contrats-usine-jerome.html','merchandising-usines.html','expo-clients.html','document-usines.html','controle-site.html'];
export const previewMediaOrigins=Object.freeze(['https://audio.bfmtv.com','https://europe1.lmn.fm','https://streaming.nrjaudio.fm','https://icecast.funradio.fr','https://streaming-ice.audiomeans.fr']);
export const previewCsp="default-src 'self'; base-uri 'self'; script-src 'self' 'unsafe-inline' blob: https://cdn.jsdelivr.net https://unpkg.com; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com; img-src 'self' data: blob: https://*.tile.openstreetmap.org; font-src 'self' data:; media-src https://audio.bfmtv.com https://europe1.lmn.fm https://streaming.nrjaudio.fm https://icecast.funradio.fr https://streaming-ice.audiomeans.fr; connect-src 'self'; object-src 'none'; form-action 'none'; worker-src 'none'";
const sdk='/assets/js/crm-preview-sdk.mjs';
const exists=async f=>stat(f).then(()=>true,()=>false);
const fakeRows=[{name:'DÉMO · Céramique Méditerranée',factory:'DEMO-101',elios:'DEMO-101',ca2024:8000,ca2025:10000,ca2026:12500,m22025:500,m22026:625,pm2025:20,pm2026:20,evolution:.25},{name:'DÉMO · Maison des Matières',factory:'DEMO-102',elios:'DEMO-102',ca2024:5000,ca2025:6000,ca2026:7200,m22025:300,m22026:360,pm2025:20,pm2026:20,evolution:.2}];
function fictionalStats(source){
  const names=[...source.matchAll(/export\s+const\s+(\w+)\s*=/g)].map(x=>x[1]);
  if(names.includes('VIEW_STATS_CLIENTS_2026_08')&&!names.includes('VIEW_STATS_CLIENTS_2026_07'))names.push('VIEW_STATS_CLIENTS_2026_07');
  return '// Données entièrement fictives de prévisualisation.\n'+names.map(name=>{const type=/CLIENTS|SALES/.test(name)?'[':'{';
    let value=type==='['?fakeRows:{'elios-ceramica':fakeRows,'view-ceramica':fakeRows,'randal-pro':fakeRows};
    if(name.includes('META'))value={period:'DÉMONSTRATION',ca2026:19700,ca2025:16000,evolution:.23125,m22026:985,m22025:800,pm2026:20,pm2025:20,budget2026:20000};
    if(name.includes('SALES'))value=fakeRows.map(x=>({...x,total:x.ca2026+500,products:[['DEMO','Article de démonstration',500]]}));
    return `export const ${name}=${JSON.stringify(value)};`;
  }).join('\n');
}
export function transformSource(source,file){
  if(/assets\/js\/statistiques-.*(?:data|archive|details)\.js$/.test(file))return fictionalStats(source);
  if(file==='assets/js/statistiques-periods.js'){const periods={'2025-12':{y:2025,m:12,label:'DÉMO · année 2025',ca:16000,prev:13000},'2026-07':{y:2026,m:7,label:'DÉMO · juillet 2026',ca:18000,prev:15000},'2026-08':{y:2026,m:8,label:'DÉMO · août 2026',ca:19700,prev:16000},'2026-09':{y:2026,m:9,label:'DÉMO · septembre 2026',ca:20700,prev:17000}};return 'export const STATS_PERIODS='+JSON.stringify(Object.fromEntries(['view-ceramica','elios-ceramica','randal-pro'].map(id=>[id,{name:id.toUpperCase()+' · DÉMO',numberLabel:'Code fictif',periods}])));}
  if(file==='assets/js/partner-contacts.js')return `export const PARTNER_CONTACTS=Object.fromEntries(['Elios Ceramica','View Ceramica','La Fenice','Randal Pro','Neobath'].map(name=>[name,{logo:'',contacts:[{name:'Service démonstration',role:'Contact fictif',email:'contact@example.test',phone:'0400000000'}]}]));export const partnerContacts=name=>PARTNER_CONTACTS[name]?.contacts||[];export const primaryPartnerEmail=name=>partnerContacts(name)[0]?.email||'';`;
  let result=source.replace(/https:\/\/www\.gstatic\.com\/firebasejs\/[^/'"\s]+\/firebase-[^'"\s]+\.js/g,sdk);
  result=result.replace(/https:\/\/storage\.googleapis\.com\/le-roy-factory\.firebasestorage\.app\/public-site-assets\/le-roy-factory\/[^/]+\/(assets\/[^'"\s<>)]+)/g,'/$1');
  if(file==='assets/js/firebase.js')result=result.replace(/const firebaseConfig\s*=\s*\{[\s\S]*?\};/,'const firebaseConfig={projectId:"fictional-only-no-network"};');
  if(file==='assets/js/lrf-analysis-live-fixes.js')result=result.replace(/const VERIFIED_ORDERS\s*=\s*\[[\s\S]*?\n  \];/,'const VERIFIED_ORDERS=[];').replace("'4 Rue Berlioz'","'Archive de démonstration'");
  if(file==='assets/js/statistiques-lrf-multi.js')result=result.replace(/async function cleanupMistakenCode\(\)[\s\S]*?\n}/g,'async function cleanupMistakenCode(){}');
  if(file==='assets/js/mails-groupes-reliability.js')result=result.replace(/const RECOVERED_GMAIL=\[[\s\S]*?\n\];/,'const RECOVERED_GMAIL=[];');
  if(file==='assets/js/tournees-v6.js')result=result.replace(/const days=\[[\s\S]*?\n    \];/,`const days=[['2026-10-25','Montpellier',[['09:00','DÉMO · Céramique Méditerranée','Montpellier'],['11:00','DÉMO · Espace Habitat','Béziers']]]];`).replace(/Tournée VIEW(?: avec Alessio)?[^'\"<]*/g,'Tournée de démonstration');
  result=result.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,email=>['jerome@leroyfactory.fr','coryne@leroyfactory.fr'].includes(email.toLowerCase())?email:'contact@example.test');
  result=result.replace(/https:\/\/(?:drive\.google\.com|firebasestorage\.googleapis\.com)\/[^\s\"'<>`]+/g,'#crm-preview-unavailable');
  result=result.replace(/AIza[A-Za-z0-9_-]{30,}/g,'fictional-api-key-disabled');
  if(file==='assets/js/firebase.js')result=result.replace(/import\(\"\.\/dashboard-(?:clock-tools|weather-geofix|weather-daily|commercial)\.js[^\"]*\"\)/g,'Promise.resolve()');
  // Preview cannot initialize the public site, a service worker or external account APIs.
  result=result.replace(/<script\b[^>]*\bsrc=["']https:\/\/(?:accounts\.google\.com|apis\.google\.com)[^"']*["'][^>]*>\s*<\/script>/gi,'');
  result=result.replace(/<link\b[^>]*href=["']https:\/\/fonts\.googleapis\.com[^"']*["'][^>]*>/gi,'');
  if(file.endsWith('.html')){
    result=result.replace(/<meta\s+name=["']viewport["'][^>]*>/i,'<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">');
    const head=`<meta name="robots" content="noindex,nofollow"><meta http-equiv="Content-Security-Policy" content="${previewCsp}"><script src="/assets/js/crm-preview-guard.js"></script><link rel="stylesheet" href="/assets/css/crm-preview.css">`;
    result=result.replace(/<head([^>]*)>/i,`<head$1>${head}`);
    result=result.replace(/<title>([\s\S]*?)<\/title>/i,'<title>TEST · $1</title>');
  }
  return result;
}
export async function buildPreview(output=path.join(sourceRoot,'crm-preview')){
  const targetRoot=path.resolve(output);
  if(targetRoot===sourceRoot||sourceRoot.startsWith(targetRoot+path.sep)||path.parse(targetRoot).root===targetRoot)throw Error('Refus de remplacer les sources ou un dossier parent.');
  const relativeOutput=path.relative(sourceRoot,targetRoot);
  if(!relativeOutput.startsWith('..')&&relativeOutput!=='crm-preview')throw Error('Dans les sources, seule la sortie crm-preview est autorisée.');
  await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
  const copied=new Set(),missing=[];
  async function copy(relative){
    relative=relative.replace(/^\//,'').split(/[?#]/)[0];
    if(copied.has(relative)||!relative||relative.includes('..')||/^(?:studio-one|randal-general|shared|functions)\//.test(relative))return;
    if(!/\.(?:html|js|mjs|css|json|svg|png|jpg|jpeg|webp|ico|woff2?|ttf)$/i.test(relative))return;
    if(relative.endsWith('.html')&&!previewPages.includes(relative))return;
    const portraitActor=relative.match(/^assets\/(?:img\/|compat\/)?(jerome|coryne)logo(?:-\d+)?\.png$/)?.[1];
    if(portraitActor){const canonical=path.join(sourceRoot,'assets/img/'+portraitActor+'logo.png');if(await exists(canonical)){copied.add(relative);const local=path.join(output,relative);await mkdir(path.dirname(local),{recursive:true});await copyFile(canonical,local);return;}}
    const input=path.join(sourceRoot,relative);if(!await exists(input)){if(/^assets\/brand-v2\/(?:lrf-logo-officiel-2026|assetlogorond|logoLRF)\.png$/.test(relative)&&await exists(path.join(sourceRoot,'assets/img/logo03lrf.png'))){copied.add(relative);const fallback=path.join(output,relative);await mkdir(path.dirname(fallback),{recursive:true});await copyFile(path.join(sourceRoot,'assets/img/logo03lrf.png'),fallback);return;}const portraitOrigin={'assets/img/jeromelogo.png':'assets/jeromelogo.png','assets/img/corynelogo.png':'assets/compat/corynelogo-20260903.png'}[relative];if(portraitOrigin&&await exists(path.join(sourceRoot,portraitOrigin))){copied.add(relative);const local=path.join(output,relative);await mkdir(path.dirname(local),{recursive:true});await copyFile(path.join(sourceRoot,portraitOrigin),local);return;}const portrait=relative.match(/^assets\/(?:compat\/)?(coryne|jerome)logo(?:-\d+)?\.png$/);if(portrait){const canonical=path.join(sourceRoot,'assets/img/'+portrait[1]+'logo.png');if(await exists(canonical)){copied.add(relative);const local=path.join(output,relative);await mkdir(path.dirname(local),{recursive:true});await copyFile(canonical,local);return;}}missing.push(relative);return;}
    copied.add(relative);const target=path.join(output,relative);await mkdir(path.dirname(target),{recursive:true});
    if(/\.(?:png|jpg|jpeg|webp|ico|woff2?|ttf)$/i.test(relative)){await copyFile(input,target);return;}
    const raw=await readFile(input,'utf8'),text=transformSource(raw,relative);await writeFile(target,text);
    const base=path.dirname(relative);
    const refs=[...raw.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/g),...raw.matchAll(/["'`](\.?\.?\/[A-Za-z0-9_./-]+\.(?:js|mjs|css|json)(?:\?[^"'`\s]*)?)["'`]/g),...raw.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)];
    for(const match of refs){let value=match[1];if(value.startsWith('https://storage.googleapis.com/')){const index=value.indexOf('/assets/');if(index>=0)value=value.slice(index+1);else continue;}else if(/^(?:[a-z]+:|#)/i.test(value))continue;let resolved=value.startsWith('/')?value.slice(1):value.startsWith('assets/')?value:path.normalize(path.join(base,value));await copy(resolved);}
  }
  for(const page of previewPages)await copy(page);
  for(const name of await readdir(path.join(sourceRoot,'assets/js')))if(/^(?:crm-v2|crm-daily-welcome|crm-preview|crm-client-mobile-v2)/.test(name))await copy('assets/js/'+name);
  for(const name of await readdir(path.join(sourceRoot,'assets/css')))if(/^(?:crm-v2|crm-preview|crm-client-mobile-v2)/.test(name))await copy('assets/css/'+name);
  await copy('assets/img/jeromelogo.png');await copy('assets/img/corynelogo.png');
  await copy('assets/js/crm-preview-sdk.mjs');await copy('assets/js/crm-preview-guard.js');await copy('assets/css/crm-preview.css');
  await writeFile(path.join(output,'index.html'),transformSource(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=dashboard.html"><title>CRM V2 · TEST</title></head><body><a href="dashboard.html">Ouvrir la version test du CRM</a></body></html>`,'index.html'));
  await writeFile(path.join(output,'agent.html'),transformSource(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CRM V2 · Comptes fictifs</title><style>body{font:16px system-ui;background:#f5f7f1;color:#2e4c3d;padding:7vh 20px}main{max-width:460px;margin:auto;background:white;border:1px solid #dbe4d5;border-radius:20px;padding:32px}button{font:inherit;background:#eff4e9;border:1px solid #bdd0b2;border-radius:9px;padding:14px;margin:8px;cursor:pointer}</style></head><body><main><p>LE ROY FACTORY · VERSION TEST</p><h1>Bienvenue dans votre CRM V2</h1><p>Données entièrement fictives, conservées sur cet appareil. Aucun accès à la base réelle.</p><button data-actor="jerome">Démo Jérôme</button><button data-actor="coryne">Démo Coryne</button></main><script type="module">import {selectPreviewActor} from '${sdk}';document.querySelectorAll('button').forEach(b=>b.onclick=()=>{selectPreviewActor(b.dataset.actor);location.href='dashboard.html'});</script></body></html>`,'agent.html'));
  await writeFile(path.join(output,'review.html'),transformSource(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Simulation responsive CRM V2</title><style>body{margin:0;background:#e7ece3;font:14px system-ui;color:#294435}header{padding:12px 20px;background:#fff;border-bottom:1px solid #ced8c8;display:flex;gap:12px;align-items:center;flex-wrap:wrap}select{font:inherit;padding:6px;border:1px solid #bccbb4;border-radius:6px}main{padding:20px;overflow:auto}iframe{display:block;background:#f5f6f0;border:1px solid #b8c9ad;border-radius:12px;margin:auto;box-shadow:0 12px 36px #29443515;max-width:100%}</style></head><body><header><strong>Simulation Chrome — pas test appareil réel</strong><label>Largeur <select id="width"><option>320</option><option>375</option><option selected>390</option><option>430</option><option>844</option><option>1366</option></select></label><label>Écran <select id="page">${previewPages.map(p=>`<option value="${p}">${p.replace('.html','')}</option>`).join('')}</select></label></header><main><iframe id="device" title="Version test responsive du CRM" width="390" height="844" src="dashboard.html"></iframe></main><script>const widths=[320,375,390,430,844,1366],pages=${JSON.stringify(previewPages)},params=new URLSearchParams(location.search),width=document.getElementById('width'),page=document.getElementById('page'),frame=document.getElementById('device');width.value=widths.includes(Number(params.get('width')))?params.get('width'):'390';page.value=pages.includes(params.get('page'))?params.get('page'):'dashboard.html';function update(){frame.width=width.value;frame.height=Number(width.value)>=844?'900':'844';frame.src=page.value;history.replaceState(null,'','?width='+width.value+'&page='+encodeURIComponent(page.value));}width.onchange=update;page.onchange=update;update();</script></body></html>`,'review.html'));
  const manifest={testOnly:true,productionServices:false,builtAt:new Date().toISOString(),pages:previewPages.filter(x=>copied.has(x)),files:[...copied].sort(),missing:[...new Set(missing)].sort()};
  await writeFile(path.join(output,'preview-manifest.json'),JSON.stringify(manifest,null,2));
  await writeFile(path.join(output,'vercel.json'),JSON.stringify({version:2,buildCommand:null,outputDirectory:'.',git:{deploymentEnabled:false},headers:[{source:'/(.*)',headers:[{key:'X-Robots-Tag',value:'noindex,nofollow'},{key:'Content-Security-Policy',value:previewCsp},{key:'Referrer-Policy',value:'same-origin'},{key:'X-Content-Type-Options',value:'nosniff'}]}]},null,2));
  return manifest;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const result=await buildPreview(process.argv[2]);console.log(JSON.stringify({pages:result.pages.length,files:result.files.length,missing:result.missing},null,2));}
