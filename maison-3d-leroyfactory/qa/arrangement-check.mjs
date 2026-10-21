import {build} from 'esbuild';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
mkdirSync('qa-results',{recursive:true});
await build({entryPoints:['qa/arrangement-cases.mjs'],outfile:'qa-results/arrangement-check.mjs',bundle:true,platform:'node',format:'esm',alias:{three:path.resolve('node_modules/three/build/three.module.js')}});
await import('../qa-results/arrangement-check.mjs');
