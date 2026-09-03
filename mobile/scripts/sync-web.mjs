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

// L'application Android doit embarquer le site LE ROY FACTORY actuel dans son intégralité,
// et non un ancien shell CRM. On prend toutes les pages HTML du dépôt + les ressources du site.
const rootEntries=await readdir(repoRoot,{withFileTypes:true});
const htmlFiles=rootEntries
  .filter(entry=>entry.isFile()&&entry.name.toLowerCase().endsWith('.html'))
  .map(entry=>entry.name);

const supportCandidates=[
  'assets','data','sw.js','manifest.webmanifest','site.webmanifest','manifest.json','favicon.ico'
];

const files=[...htmlFiles,...supportCandidates];
for(const name of files){
  try{
    await cp(join(repoRoot,name),join(www,name),{recursive:true});
  }catch(e){
    if(e?.code!=='ENOENT')throw e;
  }
}

// Capacités natives Android. Aucun ancien module Jarvis/voix n'est injecté.
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

// Ajout du pont natif à toutes les pages pour le bouton Retour/GPS/réseau.
// Le pont d'alarme est léger et reste disponible uniquement quand le CRM en a besoin.
for(const name of htmlFiles){
  const dest=join(www,name);
  try{
    let html=await readFile(dest,'utf8');
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
// Aucune redirection automatique vers le CRM et aucun ancien shell mobile.
console.log(`Site complet LE ROY FACTORY synchronisé dans mobile/www : ${htmlFiles.length} pages HTML + ressources + capacités Android natives.`);
