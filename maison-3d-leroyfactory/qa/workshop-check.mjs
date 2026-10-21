import {build} from 'esbuild';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
mkdirSync('qa-results',{recursive:true});
await build({entryPoints:['qa/workshop-cases.mjs'],outfile:'qa-results/workshop-check.mjs',bundle:true,platform:'node',format:'esm',alias:{'three/addons':path.resolve('node_modules/three/examples/jsm'),three:path.resolve('node_modules/three/build/three.module.js')}});
await import('../qa-results/workshop-check.mjs');
