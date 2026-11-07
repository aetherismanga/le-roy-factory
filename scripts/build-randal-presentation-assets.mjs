import {copyFileSync,readFileSync,writeFileSync} from 'node:fs';
import {build} from 'esbuild';

export async function buildPresentationAssets(){
 // Reuse the unchanged HDR original already tracked in the repository.
 copyFileSync('../review-studio/assets/studio.hdr','dist/assets/randal-presentation/studio.hdr');
 await build({entryPoints:['../shared/lrf-3d/randal-presentation-bvh.worker.js'],bundle:true,format:'esm',target:['es2020'],minify:true,outfile:'dist/randal-presentation-bvh.worker.js',legalComments:'eof'});
 const packages=['three','three-gpu-pathtracer','three-mesh-bvh','xatlas-web'];
 const notices=packages.map(name=>{
  const directory=new URL('../node_modules/'+name+'/',import.meta.url),metadata=JSON.parse(readFileSync(new URL('package.json',directory),'utf8'));
  return name+' '+metadata.version+'\n'+readFileSync(new URL('LICENSE',directory),'utf8');
 });
 writeFileSync('dist/randal-presentation-LICENSES.txt',notices.join('\n\n'));
}
