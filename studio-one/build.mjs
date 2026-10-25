import {cpSync} from 'node:fs';
import {build} from 'esbuild';
import {readFileSync,writeFileSync,copyFileSync,rmSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
await build({entryPoints:['src/app.js'],bundle:true,format:'esm',target:['es2020'],minify:true,outfile:'dist/app.js',legalComments:'eof'});
// Give updated assets a distinct URL so mobile caches cannot retain old
// controls after the user opens the new publication.
writeFileSync('dist/app.js',readFileSync('dist/app.js','utf8').replace(/^[ \t]+/gm,indent=>indent.replace(/\t/g,'  ')).replace(/[ \t]+$/gm,''));
let html=readFileSync('src/atelier.html','utf8');
copyFileSync('src/commerce/atelier.css','dist/commerce.css');
copyFileSync('src/mobile.css','dist/mobile.css');
for(const file of ['app.js','style.css','commerce.css','mobile.css']){const hash=createHash('sha256').update(readFileSync('dist/'+file)).digest('hex').slice(0,12);const escaped=file.replace('.','\\.');html=html.replace(new RegExp('(["\'])'+escaped+'(?:\\?v=[a-f0-9]+)?(["\'])','g'),(_,a,b)=>a+file+'?v='+hash+b);}
writeFileSync('dist/atelier.html',html);
console.log('Static standalone build ready.');

// Only current chunks are published; obsolete bundles can contain historical private prices.
const homeBuild=await build({entryPoints:{accueil:'src/commerce/home.js'},bundle:true,format:'esm',splitting:true,target:['es2020'],minify:true,outdir:'dist',chunkNames:'chunks/[name]-[hash]',metafile:true});
for(const file of Object.keys(homeBuild.metafile.outputs).filter(file=>file.endsWith('.js')))writeFileSync(file,readFileSync(file,'utf8').replace(/[ \t]+$/gm,''));
for(const file of readdirSync('dist/chunks'))if(file.endsWith('.js')&&!homeBuild.metafile.outputs['dist/chunks/'+file])rmSync('dist/chunks/'+file);
copyFileSync('src/commerce/home.css','dist/accueil.css');

let home=readFileSync('src/commerce/home.html','utf8');
for(const file of ['accueil.js','accueil.css']){const hash=createHash('sha256').update(readFileSync('dist/'+file)).digest('hex').slice(0,12);home=home.replaceAll('"'+file+'"','"'+file+'?v='+hash+'"');}
writeFileSync('dist/accueil.html',home);
writeFileSync('dist/index.html',home);

await build({entryPoints:['src/commerce/house-workspace.js'],bundle:true,format:'esm',target:['es2020'],minify:true,outfile:'dist/maison.js',legalComments:'eof'});
let house=readFileSync('src/commerce/house-workspace.html','utf8');house=house.replace('"maison.js"','"maison.js?v='+createHash('sha256').update(readFileSync('dist/maison.js')).digest('hex').slice(0,12)+'"');writeFileSync('dist/maison.html',house);

cpSync('../shared/lrf-3d/media/aquahome-2026','dist/assets/aquahome-2026',{recursive:true});

cpSync('../shared/lrf-3d/media/public-compositions','dist/assets/public-compositions',{recursive:true});

// One shared presentation page; preview origins are supplied by its reviewed URL.
writeFileSync('dist/demo.html',readFileSync('../shared/lrf-3d/demo/demo.html','utf8').replaceAll('__LRF_DEMO_VARIANT__','studio-one'));
