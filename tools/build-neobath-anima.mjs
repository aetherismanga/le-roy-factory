import {build} from 'esbuild';
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root = fileURLToPath(new URL('../', import.meta.url));
const files = ['functions/neobath-anima/app-source.mjs','functions/neobath-anima/model.js'];
const sourceHash = createHash('sha256');
for (const file of files) sourceHash.update(readFileSync(root + file));
await build({absWorkingDir:root,entryPoints:[files[0]],bundle:true,format:'esm',target:['es2020'],minify:true,
  outfile:'functions/neobath-anima/app.js',banner:{js:'// Anima source SHA256: '+sourceHash.digest('hex')},legalComments:'eof'});
const assets = {};
for (const file of ['app.js','application.html','style.css','catalogue.json']) assets[file] = createHash('sha256').update(readFileSync(root + 'functions/neobath-anima/' + file)).digest('hex');
writeFileSync(root + 'functions/neobath-anima/release.json', JSON.stringify({id:'20261102-neobath-anima-private-1',assets},null,2)+'\n');
console.log('Neobath Anima: private browser bundle ready.');
