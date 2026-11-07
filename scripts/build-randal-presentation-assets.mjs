import {copyFileSync,readFileSync,writeFileSync} from 'node:fs';
import {build} from 'esbuild';

// DenoiseMaterial embeds the glslSmartDeNoise shader with its original
// 2018-2019 attribution. Preserve that notice alongside the full license from
// https://github.com/BrutPitt/glslSmartDeNoise/blob/master/license.txt.
const denoiseNotice=`glslSmartDeNoise (three-gpu-pathtracer DenoiseMaterial)
Pinned shader: Copyright (c) 2018-2019 Michele Morrone. All rights reserved.

BSD 2-Clause License

Copyright (c) 2019-2020 Michele Morrone
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.`;

export async function buildPresentationAssets(){
 // Reuse the unchanged HDR original already tracked in the repository.
 copyFileSync('../review-studio/assets/studio.hdr','dist/assets/randal-presentation/studio.hdr');
 await build({entryPoints:['../shared/lrf-3d/randal-presentation-bvh.worker.js'],bundle:true,format:'esm',target:['es2020'],minify:true,outfile:'dist/randal-presentation-bvh.worker.js',legalComments:'eof'});
 const packages=['three','three-gpu-pathtracer','three-mesh-bvh','xatlas-web'];
 const notices=packages.map(name=>{
  const directory=new URL('../node_modules/'+name+'/',import.meta.url),metadata=JSON.parse(readFileSync(new URL('package.json',directory),'utf8'));
  return name+' '+metadata.version+'\n'+readFileSync(new URL('LICENSE',directory),'utf8');
 });
 writeFileSync('dist/randal-presentation-LICENSES.txt',[...notices,denoiseNotice].join('\n\n'));
}
