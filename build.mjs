import {build} from 'esbuild';
import {readFileSync,writeFileSync,copyFileSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
await build({entryPoints:['src/app.js'],bundle:true,format:'esm',target:['es2020'],minify:true,outfile:'dist/app.js',legalComments:'eof'});
// Give updated assets a distinct URL so mobile caches cannot retain old
// controls after the user opens the new publication.
writeFileSync('dist/app.js',readFileSync('dist/app.js','utf8').replace(/^[ \t]+/gm,indent=>indent.replace(/\t/g,'  ')).replace(/[ \t]+$/gm,''));
let html=readFileSync('src/atelier.html','utf8');
copyFileSync('src/commerce/atelier.css','dist/commerce.css');
for(const file of ['app.js','style.css','commerce.css']){const hash=createHash('sha256').update(readFileSync('dist/'+file)).digest('hex').slice(0,12);const escaped=file.replace('.','\\.');html=html.replace(new RegExp('(["\'])'+escaped+'(?:\\?v=[a-f0-9]+)?(["\'])','g'),(_,a,b)=>a+file+'?v='+hash+b);}
writeFileSync('dist/atelier.html',html);
console.log('Static standalone build ready.');

rmSync('dist/chunks',{recursive:true,force:true});
await build({entryPoints:{accueil:'src/commerce/home.js'},bundle:true,format:'esm',splitting:true,target:['es2020'],minify:true,outdir:'dist',chunkNames:'chunks/[name]-[hash]'});
copyFileSync('src/commerce/home.css','dist/accueil.css');

let home=readFileSync('src/commerce/home.html','utf8');
for(const file of ['accueil.js','accueil.css']){const hash=createHash('sha256').update(readFileSync('dist/'+file)).digest('hex').slice(0,12);home=home.replaceAll('"'+file+'"','"'+file+'?v='+hash+'"');}
writeFileSync('dist/accueil.html',home);
writeFileSync('dist/index.html',home);
