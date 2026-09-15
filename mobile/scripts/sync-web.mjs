import { cp, mkdir, rm, readFile, writeFile, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const here=dirname(fileURLToPath(import.meta.url));
const mobileRoot=resolve(here,'..');
const repoRoot=resolve(mobileRoot,'..');
const www=join(mobileRoot,'www');

await rm(www,{recursive:true,force:true});
await mkdir(www,{recursive:true});

// L'application Android embarque le site LE ROY FACTORY actuel dans son intégralité,
// puis le CRM accessible depuis l'Espace Agent.
const rootEntries=await readdir(repoRoot,{withFileTypes:true});
const htmlFiles=rootEntries
  .filter(entry=>entry.isFile()&&entry.name.toLowerCase().endsWith('.html'))
  .map(entry=>entry.name);

// Le service worker du site public n'est volontairement PAS embarqué dans l'APK :
// le contenu est déjà local et un SW peut garder une ancienne version et bloquer le démarrage.
const supportCandidates=[
  'assets','data','manifest.webmanifest','site.webmanifest','manifest.json','favicon.ico','apple-touch-icon.png'
];

for(const name of [...htmlFiles,...supportCandidates]){
  try{
    await cp(join(repoRoot,name),join(www,name),{recursive:true});
  }catch(e){
    if(e?.code!=='ENOENT')throw e;
  }
}

// Sécurité supplémentaire : aucun SW historique dans le paquet Android.
await rm(join(www,'sw.js'),{force:true}).catch(()=>{});

// Aucun ancien module Jarvis n'est conservé dans l'application Android.
await rm(join(www,'assets','js','jarvis-web.js'),{force:true}).catch(()=>{});

await build({
  entryPoints:[join(mobileRoot,'app-bridge.js')],
  bundle:true,
  platform:'browser',
  format:'esm',
  target:['es2022'],
  outfile:join(www,'app-bridge.js'),
  logLevel:'silent'
});
await build({
  entryPoints:[join(mobileRoot,'native-alarm-bridge.js')],
  bundle:true,
  platform:'browser',
  format:'esm',
  target:['es2022'],
  outfile:join(www,'native-alarm-bridge.js'),
  logLevel:'silent'
});

const nativeBootstrap=`<script id="lrf-native-bootstrap">
window.__LRF_NATIVE_APP__=true;
window.__LRF_PWA_INSTALL__=true;
(function(){
  try{
    if('serviceWorker' in navigator){
      navigator.serviceWorker.getRegistrations().then(function(regs){
        return Promise.all(regs.map(function(r){return r.unregister().catch(function(){return false;});}));
      }).catch(function(){});
    }
    if('caches' in window){
      caches.keys().then(function(keys){
        return Promise.all(keys.map(function(k){return caches.delete(k);}));
      }).catch(function(){});
    }
  }catch(e){}
})();
</script>`;

for(const name of htmlFiles){
  const dest=join(www,name);
  try{
    let html=await readFile(dest,'utf8');

    // Le drapeau natif est placé dans le HEAD avant app.js pour empêcher tout
    // ré-enregistrement du service worker/PWA dans l'application Android.
    if(!html.includes('id="lrf-native-bootstrap"')){
      html=html.replace(/<head([^>]*)>/i,`<head$1>${nativeBootstrap}`);
    }

    // Retire d'éventuelles références Jarvis héritées du site historique uniquement dans l'APK.
    html=html.replace(/\s*<script[^>]+src=["'][^"']*jarvis[^"']*["'][^>]*><\/script>/gi,'');

    if(!html.includes('app-bridge.js')){
      html=html.replace(/<\/body>/i,'<script type="module" src="app-bridge.js"></script></body>');
    }
    if(!html.includes('native-alarm-bridge.js')){
      html=html.replace(/<\/body>/i,'<script type="module" src="native-alarm-bridge.js"></script></body>');
    }
    await writeFile(dest,html,'utf8');
  }catch(e){
    if(e?.code!=='ENOENT')throw e;
  }
}

// IMPORTANT : index.html reste l'accueil réel du site.
// Aucune redirection automatique vers le CRM, aucun ancien shell mobile et aucun Jarvis.
console.log(`Application Android synchronisée : site complet LE ROY FACTORY + CRM actuel (${htmlFiles.length} pages), sans Jarvis ni service worker PWA.`);
