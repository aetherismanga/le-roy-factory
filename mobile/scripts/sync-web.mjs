import { cp, mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { dirname, join, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const mobileRoot=resolve(here,'..');
const repoRoot=resolve(mobileRoot,'..');
const www=join(mobileRoot,'www');

await rm(www,{recursive:true,force:true});
await mkdir(www,{recursive:true});

const files=[
  'agent.html','dashboard.html','clients.html','agenda.html','comptes-rendus.html',
  'catalogues.html','partenaires.html','mails-groupes.html','carte.html','statistiques.html',
  'demandes-clients.html','ouverture-compte.html','assets','data'
];

for(const name of files){
  try{await cp(join(repoRoot,name),join(www,name),{recursive:true});}
  catch(e){if(e?.code!=='ENOENT')throw e;}
}

await cp(join(mobileRoot,'app-bridge.js'),join(www,'app-bridge.js'));

for(const name of files.filter(x=>extname(x)==='.html')){
  const dest=join(www,name);
  try{
    let html=await readFile(dest,'utf8');
    if(!html.includes('app-bridge.js'))html=html.replace(/<\/body>/i,'<script type="module" src="app-bridge.js"></script></body>');
    await writeFile(dest,html,'utf8');
  }catch(e){if(e?.code!=='ENOENT')throw e;}
}

const shell=`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#111111"><title>Le Roy Factory</title><style>html,body{height:100%;margin:0;background:#111;color:#fff;font-family:Inter,Arial,sans-serif;display:grid;place-items:center}.boot{text-align:center}.logo{width:96px;height:96px;border-radius:50%;object-fit:cover;border:2px solid #D4AF37}.txt{margin-top:14px;font-weight:700;letter-spacing:.03em}</style></head><body><div class="boot"><img class="logo" src="assets/img/logo03lrf.png" alt="Le Roy Factory"><div class="txt">LE ROY FACTORY</div></div><script>setTimeout(()=>{location.replace(localStorage.getItem('agentLoggedIn')?'dashboard.html':'agent.html')},350)</script><script type="module" src="app-bridge.js"></script></body></html>`;
await writeFile(join(www,'index.html'),shell,'utf8');
console.log('Web CRM synchronisé dans mobile/www');
