import {build} from 'esbuild';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
await build({entryPoints:['src/app.js'],bundle:true,format:'esm',target:['es2020'],minify:true,outfile:'dist/app.js',legalComments:'eof'});
// Give updated assets a distinct URL so mobile caches cannot retain old
// controls after the user opens the new publication.
writeFileSync('dist/app.js',readFileSync('dist/app.js','utf8').replace(/^[ \t]+/gm,indent=>indent.replace(/\t/g,'  ')).replace(/[ \t]+$/gm,''));
let html=readFileSync('dist/index.html','utf8');
for(const file of ['app.js','style.css']){const hash=createHash('sha256').update(readFileSync('dist/'+file)).digest('hex').slice(0,12);const escaped=file.replace('.','\\.');html=html.replace(new RegExp('(["\'])'+escaped+'(?:\\?v=[a-f0-9]+)?(["\'])','g'),(_,a,b)=>a+file+'?v='+hash+b);}
writeFileSync('dist/index.html',html);
console.log('Static standalone build ready.');
