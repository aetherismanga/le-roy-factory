import { cp, mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { dirname, join, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const here=dirname(fileURLToPath(import.meta.url));
const mobileRoot=resolve(here,'..');
const repoRoot=resolve(mobileRoot,'..');
const www=join(mobileRoot,'www');

await rm(www,{recursive:true,force:true});
await mkdir(www,{recursive:true});

const files=[
  'agent.html','dashboard.html','clients.html','agenda.html','comptes-rendus.html',
  'catalogues.html','partenaires.html','tarifs-pro.html','mails-groupes.html','carte.html','statistiques.html',
  'demandes-clients.html','ouverture-compte.html','assets','data'
];

for(const name of files){
  try{await cp(join(repoRoot,name),join(www,name),{recursive:true});}
  catch(e){if(e?.code!=='ENOENT')throw e;}
}

await build({entryPoints:[join(mobileRoot,'app-bridge.js')],bundle:true,platform:'browser',format:'esm',target:['es2022'],outfile:join(www,'app-bridge.js'),logLevel:'silent'});
await build({entryPoints:[join(mobileRoot,'agenda-mobile-pro.js')],bundle:true,platform:'browser',format:'esm',target:['es2022'],outfile:join(www,'agenda-mobile-pro.js'),logLevel:'silent'});
await build({entryPoints:[join(mobileRoot,'voice-mobile.js')],bundle:true,platform:'browser',format:'esm',target:['es2022'],outfile:join(www,'voice-mobile.js'),logLevel:'silent'});
await build({entryPoints:[join(mobileRoot,'jarvis-mobile.js')],bundle:true,platform:'browser',format:'esm',target:['es2022'],outfile:join(www,'jarvis-mobile.js'),logLevel:'silent'});
await build({entryPoints:[join(mobileRoot,'jarvis-runtime-fix.js')],bundle:true,platform:'browser',format:'esm',target:['es2022'],outfile:join(www,'jarvis-runtime-fix.js'),logLevel:'silent'});
await build({entryPoints:[join(mobileRoot,'jarvis-ai-client.js')],bundle:true,platform:'browser',format:'esm',target:['es2022'],outfile:join(www,'jarvis-ai-client.js'),logLevel:'silent'});
await build({entryPoints:[join(mobileRoot,'jarvis-pro-upgrade.js')],bundle:true,platform:'browser',format:'esm',target:['es2022'],outfile:join(www,'jarvis-pro-upgrade.js'),logLevel:'silent'});
await build({entryPoints:[join(mobileRoot,'jarvis-ui-v2.js')],bundle:true,platform:'browser',format:'esm',target:['es2022'],outfile:join(www,'jarvis-ui-v2.js'),logLevel:'silent'});
await cp(join(mobileRoot,'client-mobile-fix.js'),join(www,'client-mobile-fix.js'));
await cp(join(mobileRoot,'navigation-pro.js'),join(www,'navigation-pro.js'));

for(const name of files.filter(x=>extname(x)==='.html')){
  const dest=join(www,name);
  try{
    let html=await readFile(dest,'utf8');

    if(name==='agenda.html'){
      html=html.replace("initialView: 'timeGridWeek'","initialView: window.innerWidth <= 900 ? 'listWeek' : 'timeGridWeek'");
      html=html.replace("right: 'dayGridMonth,timeGridWeek,timeGridDay'","right: window.innerWidth <= 900 ? 'listWeek,timeGridDay,dayGridMonth' : 'dayGridMonth,timeGridWeek,timeGridDay'");
      html=html.replace("day: 'Jour'","day: 'Jour',\n          list: 'Liste'");
      html=html.replace('calendar.render();','window.__lrfCalendar = calendar;\n      calendar.render();');
    }

    if(!html.includes('app-bridge.js'))html=html.replace(/<\/body>/i,'<script type="module" src="app-bridge.js"></script></body>');
    if(!html.includes('voice-mobile.js'))html=html.replace(/<\/body>/i,'<script type="module" src="voice-mobile.js"></script></body>');
    if(!html.includes('jarvis-mobile.js'))html=html.replace(/<\/body>/i,'<script type="module" src="jarvis-mobile.js"></script></body>');
    if(!html.includes('jarvis-runtime-fix.js'))html=html.replace(/<\/body>/i,'<script type="module" src="jarvis-runtime-fix.js"></script></body>');
    if(!html.includes('jarvis-ai-client.js'))html=html.replace(/<\/body>/i,'<script type="module" src="jarvis-ai-client.js"></script></body>');
    if(!html.includes('jarvis-pro-upgrade.js'))html=html.replace(/<\/body>/i,'<script type="module" src="jarvis-pro-upgrade.js"></script></body>');
    if(!html.includes('jarvis-ui-v2.js'))html=html.replace(/<\/body>/i,'<script type="module" src="jarvis-ui-v2.js"></script></body>');
    if(!html.includes('navigation-pro.js'))html=html.replace(/<\/body>/i,'<script src="navigation-pro.js"></script></body>');
    if(name==='clients.html'&&!html.includes('client-mobile-fix.js'))html=html.replace(/<\/body>/i,'<script src="client-mobile-fix.js"></script></body>');
    if(name==='agenda.html'&&!html.includes('agenda-mobile-pro.js'))html=html.replace(/<\/body>/i,'<script type="module" src="agenda-mobile-pro.js"></script></body>');
    await writeFile(dest,html,'utf8');
  }catch(e){if(e?.code!=='ENOENT')throw e;}
}

const shell=`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#111111"><title>Le Roy Factory</title><style>html,body{height:100%;margin:0;background:#111;color:#fff;font-family:Inter,Arial,sans-serif;display:grid;place-items:center}.boot{text-align:center}.logo{width:96px;height:96px;border-radius:50%;object-fit:cover;border:2px solid #D4AF37}.txt{margin-top:14px;font-weight:700;letter-spacing:.03em}</style></head><body><div class="boot"><img class="logo" src="assets/img/logo03lrf.png" alt="Le Roy Factory"><div class="txt">LE ROY FACTORY</div></div><script>setTimeout(()=>{location.replace(localStorage.getItem('agentLoggedIn')?'dashboard.html':'agent.html')},350)</script><script type="module" src="app-bridge.js"></script><script type="module" src="voice-mobile.js"></script><script type="module" src="jarvis-mobile.js"></script><script type="module" src="jarvis-runtime-fix.js"></script><script type="module" src="jarvis-ai-client.js"></script><script type="module" src="jarvis-pro-upgrade.js"></script><script type="module" src="jarvis-ui-v2.js"></script></body></html>`;
await writeFile(join(www,'index.html'),shell,'utf8');
console.log('Web CRM synchronisé dans mobile/www avec Jarvis IA Expert + voix premium');
